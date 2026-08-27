import React from 'react';
import { INSTRUMENTS, PITCHES } from '../../constants';
import type { Layer } from '../../types';
import { CloseIcon, PlusIcon, TrashIcon } from '../icons';

interface CellPopupNote {
  id: string;
  instrument: string;
  layerId: string;
  pitch: number;
}

interface CellPopupProps {
  tick: number;
  pitch: number;
  screenX: number;
  screenY: number;
  notes: CellPopupNote[];
  layers: Layer[];
  activeLayerId: string;
  selectedInstrument: string;
  isGlobalLayerActive: boolean;
  onClose: () => void;
  onRemoveNote: (noteId: string) => void;
  onAddNote: (tick: number, pitch: number) => void;
  onUpdateNotes: (notes: CellPopupNote[] | null) => void;
}

/** セル内の音符を確認・編集するための詳細パネル。 */
export const CellPopup: React.FC<CellPopupProps> = ({
  tick, pitch, screenX, screenY, notes, layers, activeLayerId,
  selectedInstrument, isGlobalLayerActive, onClose, onRemoveNote,
  onAddNote, onUpdateNotes,
}) => {
  const activeLayer = layers.find(layer => layer.id === activeLayerId);
  const selectedInstrumentData = INSTRUMENTS.find(instrument => instrument.id === selectedInstrument);
  const alreadyExists = notes.some(
    note => note.layerId === activeLayerId && note.instrument === selectedInstrument,
  );
  const popupLeft = Math.max(16, Math.min(screenX - 140, window.innerWidth - 304));
  const popupTop = Math.max(16, Math.min(screenY + 10, window.innerHeight - 360));

  const handleRemoveNote = (noteId: string) => {
    onRemoveNote(noteId);
    const remainingNotes = notes.filter(note => note.id !== noteId);
    onUpdateNotes(remainingNotes.length > 0 ? remainingNotes : null);
  };

  return (
    <div
      className="cell-popup note-popover fixed z-50 w-[288px] overflow-hidden rounded-xl border shadow-2xl"
      style={{ left: popupLeft, top: popupTop }}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      role="dialog"
      aria-label="音符の詳細"
    >
      <div className="note-popover-header flex items-start justify-between gap-4 border-b px-4 py-3">
        <div>
          <p className="text-sm font-semibold">Note details</p>
          <p className="note-popover-muted mt-0.5 text-xs">Tick {tick} · {notes.length} {notes.length === 1 ? 'note' : 'notes'}</p>
        </div>
        <button className="note-popover-icon-button rounded-md p-1.5" onClick={onClose} aria-label="閉じる">
          <CloseIcon />
        </button>
      </div>

      <div className="max-h-[216px] space-y-1 overflow-y-auto p-2">
        {notes.map((note) => {
          const layer = layers.find(item => item.id === note.layerId);
          const instrument = INSTRUMENTS.find(item => item.id === note.instrument);
          return (
            <div key={note.id} className="note-popover-item flex items-center gap-3 rounded-lg border px-3 py-2.5">
              <span className="h-8 w-1 flex-shrink-0 rounded-full" style={{ backgroundColor: layer?.color || '#64748b' }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{instrument?.nameJa || note.instrument}</p>
                <p className="note-popover-muted truncate text-xs">
                  {layer?.name || '不明なレイヤー'} · {PITCHES[note.pitch] || `Pitch ${note.pitch}`}
                </p>
              </div>
              {!isGlobalLayerActive && (
                <button className="note-popover-delete rounded-md p-1.5" onClick={() => handleRemoveNote(note.id)} title="音符を削除" aria-label="音符を削除">
                  <TrashIcon />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {!isGlobalLayerActive && (
        <div className="note-popover-footer border-t px-4 py-3">
          <p className="note-popover-muted mb-2 text-xs">
            {activeLayer?.name || '不明なレイヤー'} に {selectedInstrumentData?.nameJa || selectedInstrument} を追加
          </p>
          {activeLayer?.locked ? (
            <p className="note-popover-status note-popover-status-warning rounded-md px-3 py-2 text-center text-xs">レイヤーがロックされています</p>
          ) : alreadyExists ? (
            <p className="note-popover-status rounded-md px-3 py-2 text-center text-xs">同じ楽器の音符が既にあります</p>
          ) : (
            <button className="note-popover-add flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium" onClick={() => { onClose(); onAddNote(tick, pitch); }}>
              <PlusIcon />
              追加する
            </button>
          )}
        </div>
      )}
    </div>
  );
};
