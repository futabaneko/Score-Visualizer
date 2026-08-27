import type { Note } from '../types';

export const MIN_TOTAL_TICKS = 20;
export const MAX_TOTAL_TICKS = 59_999;
export const DEFAULT_TOTAL_TICKS = 1_200;

export function getMinimumTotalTicks(notes: readonly Pick<Note, 'tick'>[]): number {
  const lastNoteTick = notes.reduce((latest, note) => Math.max(latest, note.tick), -1);
  return Math.max(MIN_TOTAL_TICKS, lastNoteTick + 1);
}

export function clampTotalTicks(
  ticks: number,
  notes: readonly Pick<Note, 'tick'>[],
): number {
  const minimum = getMinimumTotalTicks(notes);
  const integerTicks = Number.isFinite(ticks) ? Math.trunc(ticks) : DEFAULT_TOTAL_TICKS;
  return Math.min(MAX_TOTAL_TICKS, Math.max(minimum, integerTicks));
}

export function hasUnsupportedTick(notes: readonly Pick<Note, 'tick'>[]): boolean {
  return notes.some((note) => !Number.isInteger(note.tick) || note.tick < 0 || note.tick >= MAX_TOTAL_TICKS);
}
