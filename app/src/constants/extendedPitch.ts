import { INSTRUMENTS } from './instruments';
import type { Instrument } from '../types';

// 全体レイヤー用の拡張ピッチ（5オクターブ分: -2オクターブ ~ +2オクターブ）
// 通常の25音(F#~+F#)を中心に、上下2オクターブ(各24音)ずつ追加
export const EXTENDED_PITCHES_COUNT = 25 + 24 + 24; // 73音

// 通常ピッチ範囲でのオフセット（全体表示時、通常のピッチ0が拡張ピッチの何番目か）
export const NORMAL_PITCH_OFFSET = 24; // 下に24音分ある

// 拡張ピッチの音符名を生成（--F#から++++F#まで）
const generateExtendedNoteNames = (): string[] => {
  const baseNotes = ['F#', 'G', 'G#', 'A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F'];
  const result: string[] = [];
  
  // --オクターブ (12音: --F#から--F)
  for (let i = 0; i < 12; i++) {
    result.push('--' + baseNotes[i]);
  }
  
  // -オクターブ (12音: -F#から-F)
  for (let i = 0; i < 12; i++) {
    result.push('-' + baseNotes[i]);
  }
  
  // 通常オクターブ (12音: F#からF)
  for (let i = 0; i < 12; i++) {
    result.push(baseNotes[i]);
  }
  
  // +オクターブ (12音: +F#から+F)
  for (let i = 0; i < 12; i++) {
    result.push('+' + baseNotes[i]);
  }
  
  // ++オクターブ (12音: ++F#から++F)
  for (let i = 0; i < 12; i++) {
    result.push('++' + baseNotes[i]);
  }
  
  // +++オクターブ (12音: +++F#から+++F)
  for (let i = 0; i < 12; i++) {
    result.push('+++' + baseNotes[i]);
  }
  
  // ++++F#（最上位の1音）
  result.push('++++F#');
  
  return result;
};

export const EXTENDED_NOTE_NAMES = generateExtendedNoteNames();

// 楽器IDからインデックスへのマップ（高速化用）
export const INSTRUMENT_MAP = new Map<string, Instrument>(
  INSTRUMENTS.map((inst) => [inst.id, inst])
);

/**
 * 通常ピッチ + オクターブオフセットから拡張表示ピッチを計算
 */
export const calcDisplayPitch = (pitch: number, octaveOffset: number): number => {
  return pitch + NORMAL_PITCH_OFFSET + (octaveOffset * 12);
};

/**
 * 拡張表示ピッチからオクターブオフセットを考慮した通常ピッチを計算
 */
export const calcPitchFromDisplay = (displayPitch: number, octaveOffset: number): number => {
  return displayPitch - NORMAL_PITCH_OFFSET - (octaveOffset * 12);
};

// 楽器ごとのオクターブオフセットマップ（高速化用）
export const INSTRUMENT_OCTAVE_OFFSETS = new Map<string, number>(
  INSTRUMENTS.map((inst) => [inst.id, inst.octaveOffset || 0])
);
