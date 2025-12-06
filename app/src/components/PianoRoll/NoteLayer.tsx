import React, { useMemo } from 'react';
import type { Note } from '../../types';
import { 
  PITCHES,
  NOTE_NAMES,
  INSTRUMENT_MAP, 
  EXTENDED_NOTE_NAMES,
} from '../../constants';

interface NoteLayerProps {
  groupedNotes: Map<string, { note: Note; displayPitch: number }[]>;
  cellWidth: number;
  cellHeight: number;
  currentPitchCount: number;
  isGlobalLayerActive: boolean;
  selectedNotes: Set<string>;
  layerColorMap: Map<string, string>;
  layerNameMap: Map<string, string>;
  leftBuffer: number;
  visibleTickRange: { min: number; max: number };
  visiblePitchRange: { min: number; max: number };
}

/**
 * 音符描画用のサブコンポーネント（メモ化して再レンダリングを抑制）
 */
export const NoteLayer = React.memo<NoteLayerProps>(({ 
  groupedNotes, 
  cellWidth, 
  cellHeight, 
  currentPitchCount, 
  isGlobalLayerActive, 
  selectedNotes, 
  layerColorMap,
  layerNameMap,
  leftBuffer,
  visibleTickRange,
  visiblePitchRange,
}) => {
  // ビューポート内のノートのみをフィルタリング
  const visibleNotes = useMemo(() => {
    const result: [string, { note: Note; displayPitch: number }[]][] = [];
    
    groupedNotes.forEach((groupNotes, key) => {
      const firstEntry = groupNotes[0];
      const tick = firstEntry.note.tick;
      const displayPitch = firstEntry.displayPitch;
      
      // ビューポート範囲内かチェック
      if (tick >= visibleTickRange.min && tick <= visibleTickRange.max &&
          displayPitch >= visiblePitchRange.min && displayPitch <= visiblePitchRange.max) {
        result.push([key, groupNotes]);
      }
    });
    
    return result;
  }, [groupedNotes, visibleTickRange.min, visibleTickRange.max, visiblePitchRange.min, visiblePitchRange.max]);

  return (
    <>
      {visibleNotes.map(([key, groupNotes]) => {
        const firstEntry = groupNotes[0];
        const x = leftBuffer + firstEntry.note.tick * cellWidth;
        const y = (currentPitchCount - 1 - firstEntry.displayPitch) * cellHeight;
        const hasMultiple = groupNotes.length > 1;

        return (
          <div
            key={key}
            className="absolute overflow-visible"
            style={{
              left: x + 1,
              top: y + 1,
              width: cellWidth - 2,
              height: cellHeight - 2,
            }}
          >
            {groupNotes.map(({ note, displayPitch }, index: number) => {
              const isSelected = selectedNotes.has(note.id);
              const instrument = INSTRUMENT_MAP.get(note.instrument);
              const hasOctaveOffset = instrument?.octaveOffset && instrument.octaveOffset !== 0;
              
              // 複数ノートの場合、少しずつオフセット
              const offsetX = hasMultiple ? index * 2 : 0;
              const offsetY = hasMultiple ? index * 2 : 0;
              const noteWidth = hasMultiple ? cellWidth - 4 - (groupNotes.length - 1) * 2 : cellWidth - 2;
              const noteHeight = hasMultiple ? cellHeight - 4 - (groupNotes.length - 1) * 2 : cellHeight - 2;

              // ツールチップ用の表示ピッチ名
              const displayPitchName = isGlobalLayerActive 
                ? EXTENDED_NOTE_NAMES[displayPitch] 
                : NOTE_NAMES[displayPitch];
              const originalPitchName = PITCHES[note.pitch];
              
              // レイヤー色を高速に取得
              const noteColor = layerColorMap.get(note.layerId) || instrument?.color || '#888888';

              return (
                <div
                  key={note.id}
                  className={`
                    absolute rounded cursor-pointer shadow-md
                    ${isSelected ? 'ring-2 ring-cyan-400 ring-offset-1 ring-offset-slate-900 z-20' : ''}
                    ${hasOctaveOffset ? 'border border-dashed border-white/40' : ''}
                  `}
                  style={{
                    left: offsetX,
                    top: offsetY,
                    width: noteWidth,
                    height: noteHeight,
                    backgroundColor: noteColor,
                    zIndex: isSelected ? 20 : 10 + index,
                  }}
                  title={`${instrument?.nameJa || '不明'} - ${originalPitchName}${hasOctaveOffset ? ` → ${displayPitchName} (${instrument!.octaveOffset! > 0 ? '+' : ''}${instrument!.octaveOffset}oct)` : ''} (${layerNameMap.get(note.layerId) || '不明'})`}
                >
                  {/* 楽器記号を表示（オクターブオフセットがある場合は色を変える） */}
                  {cellWidth > 18 && !hasMultiple && (
                    <span className={`text-[8px] font-bold absolute inset-0 flex items-center justify-center ${hasOctaveOffset ? 'text-yellow-300' : 'text-white/80'}`}>
                      {instrument?.symbol}
                    </span>
                  )}
                </div>
              );
            })}
            {/* 複数ノートのインジケーター（セル内に配置） */}
            {hasMultiple && cellWidth > 12 && (
              <div 
                className="absolute bg-yellow-400 text-[7px] text-black font-bold rounded-full w-3 h-3 flex items-center justify-center shadow-sm pointer-events-none"
                style={{
                  top: 0,
                  right: 0,
                  zIndex: 30,
                }}
              >
                {groupNotes.length}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
});

NoteLayer.displayName = 'NoteLayer';
