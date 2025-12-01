import { INSTRUMENTS, PITCHES } from '../constants';
import type { Note } from '../types';

// 記号から楽器IDへのマッピング
const symbolToInstrument: Record<string, string> = {};
INSTRUMENTS.forEach((inst) => {
  symbolToInstrument[inst.symbol] = inst.id;
});

// 楽器IDから記号へのマッピング
const instrumentToSymbol: Record<string, string> = {};
INSTRUMENTS.forEach((inst) => {
  instrumentToSymbol[inst.id] = inst.symbol;
});

/**
 * スコア文字列をNote配列に変換
 * フォーマット: "楽器記号 + 音程(A-Y) + 待機tick数..."
 * 例: "*M10\O5!K" = プリング音M → 10tick待機 → ハープ音O → 5tick待機 → ハット音K
 */
export function parseScore(score: string): Note[] {
  const notes: Note[] = [];
  const symbols = '!/\\?_,^@*()~';
  const numbers = '1234567890';

  let currentTick = 0;
  let lastSymbol = '*'; // デフォルトはプリング
  let tickBuffer = '';

  for (const char of score) {
    if (numbers.includes(char)) {
      tickBuffer += char;
      continue;
    }

    // 数字が終わったらtickを加算
    if (tickBuffer) {
      currentTick += parseInt(tickBuffer, 10);
      tickBuffer = '';
    }

    if (symbols.includes(char)) {
      lastSymbol = char;
    } else if (PITCHES.includes(char)) {
      const instrumentId = symbolToInstrument[lastSymbol] || 'pling';
      const pitch = PITCHES.indexOf(char);

      notes.push({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        tick: currentTick,
        pitch,
        instrument: instrumentId,
        layerId: '', // インポート時は空で、ストア側で現在のレイヤーIDを付与
      });

      lastSymbol = '*'; // リセット
    }
  }

  return notes;
}

/**
 * Note配列をスコア文字列に変換
 */
export function generateScore(notes: Note[]): string {
  if (notes.length === 0) return '';

  // tick順にソート
  const sortedNotes = [...notes].sort((a, b) => a.tick - b.tick);

  let result = '';
  let lastTick = 0;

  for (const note of sortedNotes) {
    // 待機時間を追加
    const waitTime = note.tick - lastTick;
    if (waitTime > 0) {
      result += waitTime.toString();
    }
    lastTick = note.tick;

    // 楽器記号を追加（plingは省略可能だが明示的に追加）
    const symbol = instrumentToSymbol[note.instrument] || '*';
    if (symbol !== '*') {
      result += symbol;
    }

    // 音程を追加
    result += PITCHES[note.pitch];
  }

  return result;
}

/**
 * ユニークなIDを生成
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
