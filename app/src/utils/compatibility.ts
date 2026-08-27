import { INSTRUMENTS, isInstrumentAvailable } from '../constants';
import type { GameVersion } from '../constants';
import type { Note } from '../types';

export function getUnsupportedNotes(
  notes: readonly Note[],
  version: GameVersion,
): Note[] {
  return notes.filter((note) => !isInstrumentAvailable(note.instrument, version));
}

export function describeUnsupportedNotes(notes: readonly Note[]): string {
  const instrumentNames = new Map(INSTRUMENTS.map((instrument) => [instrument.id, instrument.nameJa]));
  const counts = new Map<string, number>();

  for (const note of notes) {
    counts.set(note.instrument, (counts.get(note.instrument) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([instrumentId, count]) => `${instrumentNames.get(instrumentId) ?? instrumentId} ${count}音`)
    .join('、');
}
