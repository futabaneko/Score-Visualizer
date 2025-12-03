import { PITCH_VALUES, PITCHES } from '../constants';
import type { PitchLetter } from '../constants';
import type { Note } from '../types';

// 楽器IDからサウンドファイル名へのマッピング
const INSTRUMENT_SOUND_FILES: Record<string, string> = {
  pling: 'pling.ogg',
  harp: 'harp.ogg',
  bass: 'bass.ogg',
  guitar: 'guitar.ogg',
  bell: 'bell.ogg',
  chime: 'icechime.ogg',
  xylophone: 'xylobone.ogg',
  flute: 'flute.ogg',
  basedrum: 'bd.ogg',
  snare: 'snare.ogg',
  hat: 'hat.ogg',
  exp: 'pling.ogg', // 経験値音はplingで代用
};

// オーディオバッファのキャッシュ
const audioBufferCache: Record<string, AudioBuffer> = {};
let audioContext: AudioContext | null = null;
let masterGainNode: GainNode | null = null;

/**
 * AudioContextを取得（遅延初期化）
 */
function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

/**
 * マスターゲインノードを取得（共有して効率化）
 */
function getMasterGainNode(): GainNode {
  const ctx = getAudioContext();
  if (!masterGainNode) {
    masterGainNode = ctx.createGain();
    masterGainNode.gain.value = 0.5; // マスター音量50%
    masterGainNode.connect(ctx.destination);
  }
  return masterGainNode;
}

/**
 * サウンドファイルをロードしてキャッシュ
 */
async function loadSound(instrumentId: string): Promise<AudioBuffer | null> {
  const soundFile = INSTRUMENT_SOUND_FILES[instrumentId] || 'pling.ogg';
  const cacheKey = soundFile;

  if (audioBufferCache[cacheKey]) {
    return audioBufferCache[cacheKey];
  }

  try {
    const ctx = getAudioContext();
    const baseUrl = import.meta.env.BASE_URL || '/';
    const response = await fetch(`${baseUrl}sound/${soundFile}`);
    
    if (!response.ok) {
      console.warn(`Failed to load sound: ${soundFile} (${response.status})`);
      return null;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    
    audioBufferCache[cacheKey] = audioBuffer;
    return audioBuffer;
  } catch (error) {
    console.warn(`Failed to load sound: ${soundFile}`, error);
    return null;
  }
}

/**
 * 事前にサウンドをプリロード
 */
export async function preloadSounds(): Promise<void> {
  const instruments = Object.keys(INSTRUMENT_SOUND_FILES);
  const results = await Promise.all(instruments.map(loadSound));
  const loadedCount = results.filter(Boolean).length;
  console.log(`Preloaded ${loadedCount}/${instruments.length} sounds`);
}

/**
 * Minecraftのピッチ値をplaybackRateに変換
 * ピッチA(0)が0.5、ピッチM(12)が1.0、ピッチY(24)が2.0
 */
function pitchToPlaybackRate(pitch: number): number {
  const pitchLetter = PITCHES[pitch] as PitchLetter;
  return PITCH_VALUES[pitchLetter];
}

/**
 * 単一の音符を再生（同期的・高速版）
 * プリロード済みのバッファを使用し、共有GainNodeで効率化
 */
export function playNote(instrumentId: string, pitch: number): void {
  try {
    const ctx = getAudioContext();
    const masterGain = getMasterGainNode();
    
    // キャッシュからバッファを取得（プリロード済み前提）
    const soundFile = INSTRUMENT_SOUND_FILES[instrumentId] || 'pling.ogg';
    const buffer = audioBufferCache[soundFile];
    
    if (!buffer) {
      // バッファがない場合は非同期でロード（初回のみ）
      loadSound(instrumentId).then((loaded) => {
        if (loaded) playNote(instrumentId, pitch);
      });
      return;
    }
    
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    
    // ピッチに応じてplaybackRateを調整
    source.playbackRate.value = pitchToPlaybackRate(pitch);
    
    // 共有のマスターゲインノードに直接接続（ノード生成を削減）
    source.connect(masterGain);
    
    source.start();
  } catch (error) {
    console.warn('Failed to play note:', error);
  }
}

/**
 * 複数の音符を同時に再生（バッチ処理で効率化）
 */
export function playNoteBatch(notes: Array<{ instrument: string; pitch: number }>): void {
  const ctx = getAudioContext();
  const masterGain = getMasterGainNode();
  const currentTime = ctx.currentTime;
  
  for (const { instrument, pitch } of notes) {
    try {
      const soundFile = INSTRUMENT_SOUND_FILES[instrument] || 'pling.ogg';
      const buffer = audioBufferCache[soundFile];
      
      if (!buffer) continue;
      
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = pitchToPlaybackRate(pitch);
      source.connect(masterGain);
      source.start(currentTime); // 同じタイミングで開始
    } catch (error) {
      // 個別のエラーは無視して続行
    }
  }
}

/**
 * スコア全体を再生（requestAnimationFrameベースで滑らかに再生）
 * 補間を使ってディスプレイのリフレッシュレートに同期（60/120/144fps等に自動対応）
 * @param notes 再生する音符の配列
 * @param onTick 現在のtick位置を通知するコールバック
 * @param onComplete 再生完了時のコールバック
 * @param startFromTick 再生開始位置（デフォルト: 0）
 */
export async function playScore(
  notes: Note[],
  onTick: (tick: number) => void,
  onComplete: () => void,
  startFromTick: number = 0
): Promise<() => void> {
  // サウンドをプリロード
  await preloadSounds();
  
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  const sortedNotes = [...notes].sort((a, b) => a.tick - b.tick);
  if (sortedNotes.length === 0) {
    onComplete();
    return () => {};
  }

  // 1 tick = 1/20秒（Minecraftのtick = 50ms）
  const tickDurationMs = 50; // 50ms

  const maxTick = Math.max(...sortedNotes.map((n) => n.tick));
  
  // 開始位置を整数に丸める
  const startTick = Math.floor(startFromTick);
  let lastPlayedTick = startTick - 1;  // 最後に音を鳴らしたtick
  let isPlaying = true;
  let startTime = performance.now();
  let animationFrameId: number | null = null;
  
  // 裏画面から戻ったときに時間をリセットするためのリスナー
  let wasHidden = false;
  const handleVisibilityChange = () => {
    if (document.hidden) {
      wasHidden = true;
    } else if (wasHidden) {
      // 裏画面から戻ってきたら、現在のtickを基準に時間をリセット
      // これにより溜まった音符が一気に再生されるのを防ぐ
      startTime = performance.now() - (lastPlayedTick - startTick) * tickDurationMs;
      wasHidden = false;
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // tick毎のノートをマップに整理（高速検索用）
  const notesByTick = new Map<number, Note[]>();
  for (const note of sortedNotes) {
    if (!notesByTick.has(note.tick)) {
      notesByTick.set(note.tick, []);
    }
    notesByTick.get(note.tick)!.push(note);
  }

  const update = (currentTime: number) => {
    if (!isPlaying) return;

    const elapsed = currentTime - startTime;
    
    // 現在の正確なtick位置（開始位置からのオフセット + 開始tick）
    const exactTick = startTick + elapsed / tickDurationMs;
    const currentIntTick = Math.floor(exactTick);
    
    // まだ再生していないtickの音を再生
    for (let tick = lastPlayedTick + 1; tick <= currentIntTick && tick <= maxTick; tick++) {
      const notesToPlay = notesByTick.get(tick);
      if (notesToPlay && notesToPlay.length > 0) {
        playNoteBatch(notesToPlay.map(n => ({ instrument: n.instrument, pitch: n.pitch })));
      }
      lastPlayedTick = tick;
    }
    
    // UI更新（補間された滑らかな位置を通知）
    // 小数点以下の精度でアニメーションが滑らかになる
    onTick(Math.min(exactTick, maxTick + 10));

    if (currentIntTick > maxTick + 10) {
      isPlaying = false;
      onComplete();
      return;
    }

    animationFrameId = requestAnimationFrame(update);
  };

  // 開始tickをすぐに実行
  onTick(startTick);
  const initialNotes = notesByTick.get(startTick);
  if (initialNotes && initialNotes.length > 0) {
    playNoteBatch(initialNotes.map(n => ({ instrument: n.instrument, pitch: n.pitch })));
  }
  lastPlayedTick = startTick;
  startTime = performance.now();
  
  animationFrameId = requestAnimationFrame(update);

  // 停止関数を返す
  return () => {
    isPlaying = false;
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
    }
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}

/**
 * 停止処理（現在は特に何もしないが、将来の拡張のために残す）
 */
export function stopAll(): void {
  // Web Audio APIは自動的に音が終了するため、特別な停止処理は不要
}
