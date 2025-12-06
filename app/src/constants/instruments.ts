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
