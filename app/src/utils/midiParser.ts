import { Midi } from '@tonejs/midi';
import type { Note } from '../types';
import { generateId } from './scoreParser';

/**
 * MIDIノート番号からオクターブと楽器を決定
 * 
 * Minecraftの各楽器は2オクターブ（25音: F#からF#）をカバー
 * 基準: MIDIノート60 = 中央C = オクターブ0のC（pitch index 6に相当）
 * 
 * 楽器のオクターブ範囲:
 * - bass:    -2 ~ 0  (MIDI 30-54)
 * - guitar:  -1 ~ 1  (MIDI 42-66)
 * - pling:    0 ~ 2  (MIDI 54-78) ← デフォルト
 * - flute:    1 ~ 3  (MIDI 66-90)
 * - bell:     2 ~ 4  (MIDI 78-102)
 */

// 各楽器がカバーするMIDIノート範囲（F#起点で25音）
interface InstrumentRange {
  instrument: string;
  minMidi: number; // 最小MIDIノート
  maxMidi: number; // 最大MIDIノート
  octaveOffset: number; // 楽器のオクターブオフセット
}

// MIDIノート 54 = F#3 がオクターブ0のピッチ0（F#）に相当
// 各楽器の範囲を定義
const INSTRUMENT_RANGES: InstrumentRange[] = [
  { instrument: 'bass',   minMidi: 30, maxMidi: 54, octaveOffset: -2 },
  { instrument: 'guitar', minMidi: 42, maxMidi: 66, octaveOffset: -1 },
  { instrument: 'pling',  minMidi: 54, maxMidi: 78, octaveOffset: 0 },
  { instrument: 'flute',  minMidi: 66, maxMidi: 90, octaveOffset: 1 },
  { instrument: 'bell',   minMidi: 78, maxMidi: 102, octaveOffset: 2 },
];

// オクターブ0のF#のMIDIノート番号
const MIDI_F_SHARP_BASE = 54; // F#3

/**
 * MIDIノート番号から最適な楽器とpitch（0-24）を決定
 * @param midiNote MIDIノート番号 (0-127)
 * @returns { instrument, pitch } または null（範囲外の場合）
 */
export function midiNoteToInstrumentAndPitch(midiNote: number): { instrument: string; pitch: number } | null {
  // 最適な楽器を選択（MIDIノート範囲に基づく）
  let selectedInstrument: InstrumentRange | null = null;
  
  for (const range of INSTRUMENT_RANGES) {
    if (midiNote >= range.minMidi && midiNote <= range.maxMidi) {
      selectedInstrument = range;
      break;
    }
  }
  
  // 範囲外の場合はnullを返す
  if (!selectedInstrument) {
    return null;
  }
  
  // 楽器の基準MIDIノート（その楽器のpitch 0）
  const instrumentBaseMidi = MIDI_F_SHARP_BASE + (selectedInstrument.octaveOffset * 12);
  
  // pitch（0-24）を計算
  const pitch = midiNote - instrumentBaseMidi;
  
  // pitch範囲チェック（0-24）
  if (pitch < 0 || pitch > 24) {
    return null;
  }
  
  return {
    instrument: selectedInstrument.instrument,
    pitch,
  };
}

/**
 * MIDIファイルの解析結果（BPM選択前）
 */
export interface MidiAnalysisResult {
  originalBpm: number;
  duration: number; // 秒数
  trackInfo: {
    name: string;
    noteCount: number;
  }[];
  totalNotes: number;
}

/**
 * MIDIファイルのインポート結果
 */
export interface MidiImportResult {
  notes: Note[];
  originalBpm: number;
  targetBpm: number;
  totalTicks: number;
  skippedNotes: number; // 範囲外で切り捨てられた音符数
  trackInfo: {
    name: string;
    noteCount: number;
  }[];
}

/**
 * Minecraft対応BPMリスト
 * 1200 / BPM が整数になるBPM（四分音符がtickで割り切れる）
 */
export const MINECRAFT_COMPATIBLE_BPMS: readonly number[] = [60, 80, 100, 120, 150, 200];

/**
 * 原曲BPMに最も近いMinecraft対応BPMを取得
 */
export function getClosestCompatibleBpm(originalBpm: number): number {
  let closest = MINECRAFT_COMPATIBLE_BPMS[0];
  let minDiff = Math.abs(originalBpm - closest);
  
  for (const bpm of MINECRAFT_COMPATIBLE_BPMS) {
    const diff = Math.abs(originalBpm - bpm);
    if (diff < minDiff) {
      minDiff = diff;
      closest = bpm;
    }
  }
  
  return closest;
}

/**
 * MIDIファイルを解析（BPM選択前の情報取得）
 */
export async function analyzeMidiFile(arrayBuffer: ArrayBuffer): Promise<MidiAnalysisResult> {
  const midi = new Midi(arrayBuffer);
  
  // BPMを取得（最初のテンポイベントから）
  let originalBpm = 120; // デフォルト
  if (midi.header.tempos.length > 0) {
    originalBpm = Math.round(midi.header.tempos[0].bpm);
  }
  
  // 曲の長さを取得
  const duration = midi.duration;
  
  // トラック情報を収集
  const trackInfo: { name: string; noteCount: number }[] = [];
  let totalNotes = 0;
  
  for (const track of midi.tracks) {
    // チャンネル10（ドラム）はスキップ
    if (track.channel === 9) {
      continue;
    }
    
    if (track.notes.length > 0) {
      trackInfo.push({
        name: track.name || 'Track',
        noteCount: track.notes.length,
      });
      totalNotes += track.notes.length;
    }
  }
  
  return {
    originalBpm,
    duration,
    trackInfo,
    totalNotes,
  };
}

/**
 * MIDIファイルをパースしてNote配列に変換
 * @param arrayBuffer MIDIファイルのArrayBuffer
 * @param layerId インポート先のレイヤーID
 * @param originalBpm 原曲BPM（ユーザー入力）
 * @param targetBpm ターゲットBPM（Minecraft対応BPM）
 * @param maxTicks 最大tick数（これを超える音符は切り捨て）
 */
export async function parseMidiFile(
  arrayBuffer: ArrayBuffer,
  layerId: string,
  originalBpm: number,
  targetBpm: number,
  maxTicks: number = 200
): Promise<MidiImportResult> {
  const midi = new Midi(arrayBuffer);
  
  const notes: Note[] = [];
  let skippedNotes = 0;
  const trackInfo: { name: string; noteCount: number }[] = [];
  
  // BPMリマッピング係数
  // 原曲BPM → ターゲットBPM に変換
  // 時間スケール = 原曲BPM / ターゲットBPM
  // 例: 128 BPM → 120 BPM: scale = 128/120 = 1.067 (曲が少し遅くなる)
  const timeScale = originalBpm / targetBpm;
  
  // 1 tick = 0.05秒 なので、秒数からtickへの変換は 秒数 × 20
  const SECONDS_PER_TICK = 0.05;
  
  // 全トラックを処理
  for (const track of midi.tracks) {
    // チャンネル10（ドラム）はスキップ
    if (track.channel === 9) {
      continue;
    }
    
    const trackNoteCount = { name: track.name || `Track`, noteCount: 0 };
    
    for (const note of track.notes) {
      // MIDIの秒数をスケーリングしてエディタのtickに変換
      // adjustedTime = originalTime * timeScale
      const adjustedTime = note.time * timeScale;
      const editorTick = Math.round(adjustedTime / SECONDS_PER_TICK);
      
      // 範囲外チェック（tick）
      if (editorTick < 0 || editorTick >= maxTicks) {
        skippedNotes++;
        continue;
      }
      
      // MIDIノートを楽器とpitchに変換
      const result = midiNoteToInstrumentAndPitch(note.midi);
      
      if (!result) {
        // 範囲外の音符はスキップ
        skippedNotes++;
        continue;
      }
      
      notes.push({
        id: generateId(),
        tick: editorTick,
        pitch: result.pitch,
        instrument: result.instrument,
        layerId,
      });
      
      trackNoteCount.noteCount++;
    }
    
    if (trackNoteCount.noteCount > 0) {
      trackInfo.push(trackNoteCount);
    }
  }
  
  // 必要なtotalTicksを計算（音符の最大tick + 余白）
  const maxNoteTick = notes.reduce((max, note) => Math.max(max, note.tick), 0);
  const suggestedTotalTicks = Math.max(maxTicks, maxNoteTick + 8);
  
  return {
    notes,
    originalBpm,
    targetBpm,
    totalTicks: suggestedTotalTicks,
    skippedNotes,
    trackInfo,
  };
}

/**
 * ファイル読み込みのヘルパー
 */
export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}
