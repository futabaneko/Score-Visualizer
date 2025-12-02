import type { Instrument } from '../types';

// Minecraft音ブロックの楽器定義
// octaveOffset: 全体表示時のオクターブオフセット（12音 = 1オクターブ）
export const INSTRUMENTS: readonly Instrument[] = [
  {
    id: 'pling',
    symbol: '*',
    name: 'Pling',
    nameJa: 'プリング',
    color: '#FFD700',
    minecraftSound: 'minecraft:block.note.pling',
    octaveOffset: 0,
  },
  {
    id: 'harp',
    symbol: '\\',
    name: 'Harp',
    nameJa: 'ハープ',
    color: '#4CAF50',
    minecraftSound: 'minecraft:block.note.harp',
    octaveOffset: 0,
  },
  {
    id: 'bass',
    symbol: '(',
    name: 'Bass',
    nameJa: 'ベース',
    color: '#795548',
    minecraftSound: 'minecraft:block.note.bass',
    octaveOffset: -2, // 2オクターブ低い
  },
  {
    id: 'guitar',
    symbol: ')',
    name: 'Guitar',
    nameJa: 'ギター',
    color: '#FF9800',
    minecraftSound: 'minecraft:block.note.guitar',
    octaveOffset: -1, // 1オクターブ低い
  },
  {
    id: 'bell',
    symbol: '/',
    name: 'Bell',
    nameJa: 'ベル',
    color: '#E91E63',
    minecraftSound: 'minecraft:block.note.bell',
    octaveOffset: 2, // 2オクターブ高い
  },
  {
    id: 'chime',
    symbol: '_',
    name: 'Chime',
    nameJa: 'チャイム',
    color: '#9C27B0',
    minecraftSound: 'minecraft:block.note.chime',
    octaveOffset: 2, // 2オクターブ高い
  },
  {
    id: 'xylophone',
    symbol: ',',
    name: 'Xylophone',
    nameJa: 'シロフォン',
    color: '#00BCD4',
    minecraftSound: 'minecraft:block.note.xylophone',
    octaveOffset: 2, // 2オクターブ高い
  },
  {
    id: 'flute',
    symbol: '@',
    name: 'Flute',
    nameJa: 'フルート',
    color: '#8BC34A',
    minecraftSound: 'minecraft:block.note.flute',
    octaveOffset: 1, // 1オクターブ高い
  },
  {
    id: 'basedrum',
    symbol: '^',
    name: 'Bass Drum',
    nameJa: 'ベースドラム',
    color: '#607D8B',
    minecraftSound: 'minecraft:block.note.basedrum',
    octaveOffset: 0,
  },
  {
    id: 'snare',
    symbol: '?',
    name: 'Snare',
    nameJa: 'スネア',
    color: '#9E9E9E',
    minecraftSound: 'minecraft:block.note.snare',
    octaveOffset: 0,
  },
  {
    id: 'hat',
    symbol: '!',
    name: 'Hat',
    nameJa: 'ハット',
    color: '#FFEB3B',
    minecraftSound: 'minecraft:block.note.hat',
    octaveOffset: 0,
  }
];

// 音程の定義（A-Y = 25段階）
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
