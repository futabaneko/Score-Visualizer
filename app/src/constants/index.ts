// 楽器定義のエクスポート
export { INSTRUMENTS } from './instruments';

// 拡張ピッチ関連のエクスポート
export {
  EXTENDED_PITCHES_COUNT,
  EXTENDED_NOTE_NAMES,
  NORMAL_PITCH_OFFSET,
  INSTRUMENT_MAP,
  INSTRUMENT_OCTAVE_OFFSETS,
  calcDisplayPitch,
  calcPitchFromDisplay,
} from './extendedPitch';

// 音程の定義（A-Y = 25段階）
export const PITCHES = 'ABCDEFGHIJKLMNOPQRSTUVWXY'.split('') as readonly string[];

// ピッチ文字の型
export type PitchLetter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T' | 'U' | 'V' | 'W' | 'X' | 'Y';

// ピッチ値（Minecraft音ブロックのピッチ）
export const PITCH_VALUES: Readonly<Record<PitchLetter, number>> = {
  A: 0.5,
  B: 0.5297,
  C: 0.5612,
  D: 0.5946,
  E: 0.6299,
  F: 0.6674,
  G: 0.7071,
  H: 0.7491,
  I: 0.7937,
  J: 0.8408,
  K: 0.8908,
  L: 0.9438,
  M: 1.0,
  N: 1.0594,
  O: 1.1224,
  P: 1.1892,
  Q: 1.2599,
  R: 1.3348,
  S: 1.4142,
  T: 1.4983,
  U: 1.5874,
  V: 1.6817,
  W: 1.7817,
  X: 1.8877,
  Y: 2.0,
} as const;

// 音符名（表示用）- F# から +F# までの25音（通常範囲）
export const NOTE_NAMES = [
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  '+F#',
  '+G',
  '+G#',
  '+A',
  '+A#',
  '+B',
  '+C',
  '+C#',
  '+D',
  '+D#',
  '+E',
  '+F',
  '+F#',
];

// デフォルトのグリッドサイズ
export const DEFAULT_GRID_SIZE = 4;

// デフォルトのBPM
export const DEFAULT_BPM = 120;

// 1小節あたりのtick数
export const TICKS_PER_BEAT = 4;

// デフォルトのズームレベル
export const DEFAULT_ZOOM = 1;

// セルサイズ（ピクセル）
export const CELL_WIDTH = 24;
export const CELL_HEIGHT = 20;

// ピアノキーの幅
export const PIANO_KEY_WIDTH = 80;
