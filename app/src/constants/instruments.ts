import type { Instrument } from '../types';

// Minecraft音ブロックの楽器定義
// octaveOffset: 全体表示時のオクターブオフセット（12音 = 1オクターブ）
// minVersion: この楽器が利用可能な最小バージョン（未指定は全バージョン対応）
export const INSTRUMENTS: readonly Instrument[] = [
  {
    id: 'pling',
    symbol: '*',
    name: 'Pling',
    nameJa: 'プリング',
    color: '#FFD700',
    minecraftSound: 'minecraft:block.note_block.pling',
    octaveOffset: 0,
  },
  {
    id: 'harp',
    symbol: '\\',
    name: 'Harp',
    nameJa: 'ハープ',
    color: '#4CAF50',
    minecraftSound: 'minecraft:block.note_block.harp',
    octaveOffset: 0,
  },
  {
    id: 'bass',
    symbol: '(',
    name: 'Bass',
    nameJa: 'ベース',
    color: '#795548',
    minecraftSound: 'minecraft:block.note_block.bass',
    octaveOffset: -2, // 2オクターブ低い
  },
  {
    id: 'guitar',
    symbol: ')',
    name: 'Guitar',
    nameJa: 'ギター',
    color: '#FF9800',
    minecraftSound: 'minecraft:block.note_block.guitar',
    octaveOffset: -1, // 1オクターブ低い
  },
  {
    id: 'bell',
    symbol: '/',
    name: 'Bell',
    nameJa: 'ベル',
    color: '#E91E63',
    minecraftSound: 'minecraft:block.note_block.bell',
    octaveOffset: 2, // 2オクターブ高い
  },
  {
    id: 'chime',
    symbol: '_',
    name: 'Chime',
    nameJa: 'チャイム',
    color: '#9C27B0',
    minecraftSound: 'minecraft:block.note_block.chime',
    octaveOffset: 2, // 2オクターブ高い
  },
  {
    id: 'xylophone',
    symbol: ',',
    name: 'Xylophone',
    nameJa: 'シロフォン',
    color: '#00BCD4',
    minecraftSound: 'minecraft:block.note_block.xylophone',
    octaveOffset: 2, // 2オクターブ高い
  },
  {
    id: 'flute',
    symbol: '@',
    name: 'Flute',
    nameJa: 'フルート',
    color: '#8BC34A',
    minecraftSound: 'minecraft:block.note_block.flute',
    octaveOffset: 1, // 1オクターブ高い
  },
  {
    id: 'basedrum',
    symbol: '^',
    name: 'Bass Drum',
    nameJa: 'バスドラム',
    color: '#607D8B',
    minecraftSound: 'minecraft:block.note_block.basedrum',
    octaveOffset: 0,
  },
  {
    id: 'snare',
    symbol: '?',
    name: 'Snare',
    nameJa: 'スネア',
    color: '#9E9E9E',
    minecraftSound: 'minecraft:block.note_block.snare',
    octaveOffset: 0,
  },
  {
    id: 'hat',
    symbol: '!',
    name: 'Hat',
    nameJa: 'ハット',
    color: '#FFEB3B',
    minecraftSound: 'minecraft:block.note_block.hat',
    octaveOffset: 0,
  },
  // --- 1.14.x 以降 ---
  {
    id: 'iron_xylophone',
    symbol: '#',
    name: 'Iron Xylophone',
    nameJa: '鉄琴',
    color: '#B0BEC5',
    minecraftSound: 'minecraft:block.note_block.iron_xylophone',
    octaveOffset: 0,
    minVersion: '1.14',
  },
  {
    id: 'cow_bell',
    symbol: '$',
    name: 'Cow Bell',
    nameJa: 'カウベル',
    color: '#8D6E63',
    minecraftSound: 'minecraft:block.note_block.cow_bell',
    octaveOffset: 1, // 1オクターブ高い
    minVersion: '1.14',
  },
  {
    id: 'didgeridoo',
    symbol: ';',
    name: 'Didgeridoo',
    nameJa: 'ディジュリドゥ',
    color: '#FF7043',
    minecraftSound: 'minecraft:block.note_block.didgeridoo',
    octaveOffset: -2, // 2オクターブ低い
    minVersion: '1.14',
  },
  {
    id: 'bit',
    symbol: '&',
    name: 'Bit',
    nameJa: '電子音',
    color: '#26A69A',
    minecraftSound: 'minecraft:block.note_block.bit',
    octaveOffset: 0,
    minVersion: '1.14',
  },
  {
    id: 'banjo',
    symbol: '+',
    name: 'Banjo',
    nameJa: 'バンジョー',
    color: '#D4A574',
    minecraftSound: 'minecraft:block.note_block.banjo',
    octaveOffset: 0,
    minVersion: '1.14',
  },
];

// バージョン定義
export type GameVersion = '1.12' | '1.14';

export const GAME_VERSIONS: { value: GameVersion; label: string }[] = [
  { value: '1.12', label: '1.12.x ~ 1.13.x' },
  { value: '1.14', label: '1.14.x ~ 1.20.x' },
];

// バージョンの順序（比較用）
const VERSION_ORDER: Record<GameVersion, number> = {
  '1.12': 0,
  '1.14': 1,
};

export function normalizeGameVersion(value: unknown): GameVersion {
  return value === '1.12' ? '1.12' : '1.14';
}

// 指定バージョンで利用可能な楽器をフィルタリング
export function getInstrumentsForVersion(version: GameVersion): readonly Instrument[] {
  return INSTRUMENTS.filter((inst) => {
    if (!inst.minVersion) return true; // minVersionなしは全バージョン対応
    return VERSION_ORDER[version] >= VERSION_ORDER[inst.minVersion];
  });
}

export function isInstrumentAvailable(instrumentId: string, version: GameVersion): boolean {
  return getInstrumentsForVersion(version).some((instrument) => instrument.id === instrumentId);
}

// 楽器IDからテクスチャパスへのマッピング
const PUBLIC_BASE_URL = import.meta.env.BASE_URL || '/';

export const INSTRUMENT_TEXTURES: Record<string, string> = {
  pling: `${PUBLIC_BASE_URL}textures/pling.png`,
  harp: `${PUBLIC_BASE_URL}textures/harp.png`,
  bass: `${PUBLIC_BASE_URL}textures/bass.png`,
  guitar: `${PUBLIC_BASE_URL}textures/guitar.png`,
  bell: `${PUBLIC_BASE_URL}textures/bell.png`,
  chime: `${PUBLIC_BASE_URL}textures/chime.png`,
  xylophone: `${PUBLIC_BASE_URL}textures/xylophone.png`,
  flute: `${PUBLIC_BASE_URL}textures/flute.png`,
  basedrum: `${PUBLIC_BASE_URL}textures/basedrum.png`,
  snare: `${PUBLIC_BASE_URL}textures/snare.png`,
  hat: `${PUBLIC_BASE_URL}textures/hat.png`,
  iron_xylophone: `${PUBLIC_BASE_URL}textures/iron_xylophone.png`,
  cow_bell: `${PUBLIC_BASE_URL}textures/cow_bell.png`,
  didgeridoo: `${PUBLIC_BASE_URL}textures/didgeridoo.png`,
  bit: `${PUBLIC_BASE_URL}textures/bit.png`,
  banjo: `${PUBLIC_BASE_URL}textures/banjo.png`,
};
