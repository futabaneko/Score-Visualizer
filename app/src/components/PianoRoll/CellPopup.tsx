import React from 'react';
import type { Layer } from '../../types';

interface CellPopupNote {
  id: string;
  instrument: string;
  layerId: string;
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

/**
 * セルをクリックしたときに表示されるポップアップ
 * セル内の音符一覧と追加・削除操作を提供
 */
export const CellPopup: React.FC<CellPopupProps> = ({
  tick,
  pitch,
  screenX,
  screenY,
  notes,
  layers,
  activeLayerId,
  selectedInstrument,
  isGlobalLayerActive,
  onClose,
  onRemoveNote,
  onAddNote,
  onUpdateNotes,
}) => {
  const activeLayer = layers.find(l => l.id === activeLayerId);
  const alreadyExists = notes.some(
    n => n.layerId === activeLayerId && n.instrument === selectedInstrument
  );
  const isLocked = activeLayer?.locked;

  const handleRemoveNote = (noteId: string) => {
    onRemoveNote(noteId);
    // ポップアップを更新
    const newNotes = notes.filter(n => n.id !== noteId);
    onUpdateNotes(newNotes.length === 0 ? null : newNotes);
  };

  return (
    <div
      className="fixed z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl min-w-[200px] max-w-[280px] cell-popup"
      style={{
        left: screenX,
        top: screenY,
        transform: 'translate(-50%, 8px)',
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
        <span className="text-xs text-slate-400">
          Tick {tick}, Pitch {pitch}
        </span>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 音符リスト */}
      <div className="max-h-[200px] overflow-y-auto">
        {notes.length > 0 ? (
          <div className="py-1">
            {notes.map((note) => {
              const layer = layers.find(l => l.id === note.layerId);
              const layerColor = layer?.color || '#888';
              return (
                <div
                  key={note.id}
                  className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-700/50"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: layerColor }}
                    />
                    <span className="text-sm text-slate-300">
                      {layer?.name || '不明'}
                    </span>
                    <span className="text-xs text-slate-500">
                      {note.instrument}
                    </span>
                  </div>
                  {!isGlobalLayerActive && (
                    <button
                      onClick={() => handleRemoveNote(note.id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                      title="削除"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-3 py-3 text-sm text-slate-500 text-center">
            音符がありません
          </div>
        )}
      </div>

      {/* 新規追加ボタン */}
      {!isGlobalLayerActive && (
        <div className="border-t border-slate-700 px-3 py-2">
          <div className="text-xs text-slate-500 mb-2">
            追加先: {activeLayer?.name || '不明'} / {selectedInstrument}
          </div>
          {isLocked ? (
            <div className="text-xs text-amber-400 text-center py-1">
              🔒 レイヤーがロックされています
            </div>
          ) : alreadyExists ? (
            <div className="text-xs text-slate-400 text-center py-1">
              同じ楽器の音符が既にあります
            </div>
          ) : (
            <button
              onClick={() => {
                onClose();
                onAddNote(tick, pitch);
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              追加
            </button>
          )}
        </div>
      )}
    </div>
  );
};
