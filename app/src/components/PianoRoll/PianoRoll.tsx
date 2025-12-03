import React, { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { useScoreStore } from '../../store/useScoreStore';
import {
  PITCHES,
  NOTE_NAMES,
  INSTRUMENTS,
  CELL_WIDTH,
  CELL_HEIGHT,
  PIANO_KEY_WIDTH,
} from '../../constants';
import { playNote } from '../../utils/audioEngine';
import type { Note } from '../../types';

type DragMode = 'none' | 'erase' | 'select';

// セル番号ヘッダーの高さ
const HEADER_HEIGHT = 24;

// 再生開始時の左側バッファ（ピクセル）
const PLAYBACK_LEFT_BUFFER = 120;

// 仮想化用のバッファ（画面外にも少し余裕を持たせる）
const VIRTUALIZATION_BUFFER = 5; // tick数

// 楽器IDからインデックスへのマップ（高速化用）
const INSTRUMENT_MAP = new Map(INSTRUMENTS.map((inst) => [inst.id, inst]));

// 全体レイヤー用の拡張ピッチ（5オクターブ分: -2オクターブ ~ +2オクターブ）
// 通常の25音(F#~+F#)を中心に、上下2オクターブ(各24音)ずつ追加
const EXTENDED_PITCHES_COUNT = 25 + 24 + 24; // 73音

// 拡張ピッチの音符名を生成（--F#から++++F#まで）
// オクターブの区切りはF#
// --F# → -F# → F# → +F# → ++F# → +++F# → ++++F#
const generateExtendedNoteNames = (): string[] => {
  const baseNotes = ['F#', 'G', 'G#', 'A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F'];
  const result: string[] = [];
  
  // 73音を下から順に生成
  // displayPitch 0 = 最下位の --F#
  // displayPitch 72 = 最上位の ++++F#
  
  // --オクターブ (12音: --F#から--F)
  for (let i = 0; i < 12; i++) {
    result.push('--' + baseNotes[i]);
  }
  
  // -オクターブ (12音: -F#から-F)
  for (let i = 0; i < 12; i++) {
    result.push('-' + baseNotes[i]);
  }
  
  // 通常オクターブ (12音: F#からF)
  for (let i = 0; i < 12; i++) {
    result.push(baseNotes[i]);
  }
  
  // +オクターブ (12音: +F#から+F)
  for (let i = 0; i < 12; i++) {
    result.push('+' + baseNotes[i]);
  }
  
  // ++オクターブ (12音: ++F#から++F)
  for (let i = 0; i < 12; i++) {
    result.push('++' + baseNotes[i]);
  }
  
  // +++オクターブ (12音: +++F#から+++F)
  for (let i = 0; i < 12; i++) {
    result.push('+++' + baseNotes[i]);
  }
  
  // ++++F#（最上位の1音）
  result.push('++++F#');
  
  return result;
};

const EXTENDED_NOTE_NAMES = generateExtendedNoteNames();

// 通常ピッチ範囲でのオフセット（全体表示時、通常のピッチ0が拡張ピッチの何番目か）
const NORMAL_PITCH_OFFSET = 24; // 下に24音分ある

// 音符描画用のサブコンポーネント（メモ化して再レンダリングを抑制）
const NoteLayer = React.memo(({ 
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
}: {
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
}) => {
  // ビューポート内のノートのみをフィルタリング
  const visibleNotes = useMemo(() => {
    const result: [string, { note: any; displayPitch: number }[]][] = [];
    
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

// React DevTools でのデバッグ用に displayName を設定
NoteLayer.displayName = 'NoteLayer';

export const PianoRoll: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragMode, setDragMode] = useState<DragMode>('none');
  const [dragStart, setDragStart] = useState<{ tick: number; pitch: number; displayPitch: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ tick: number; pitch: number; displayPitch: number } | null>(null);
  
  // マウス位置の追跡（ペースト位置用）
  const [mousePosition, setMousePosition] = useState<{ tick: number; displayPitch: number } | null>(null);
  
  // 自動スクロール用の状態（将来的にユーザー設定から変更できるようにする予定）
  const autoScrollEnabled = true;
  
  // ビューポート範囲の状態（仮想化用）
  const [viewportState, setViewportState] = useState({
    scrollLeft: 0,
    scrollTop: 0,
    clientWidth: 0,
    clientHeight: 0,
  });
  
  // セルポップアップの状態
  const [cellPopup, setCellPopup] = useState<{
    tick: number;
    pitch: number;
    screenX: number;
    screenY: number;
    notes: Array<{ id: string; instrument: string; layerId: string }>;
  } | null>(null);

  const closeCellPopup = useCallback(() => {
    setCellPopup(null);
  }, []);

  const {
    notes,
    layers,
    activeLayerId,
    settings,
    playback,
    totalTicks,
    selection,
    clipboard,
    checkpoint,
    addNote,
    removeNotesAt,
    removeNote,
    selectNotesInRange,
    selectedNotes,
    deselectAll,
    copySelected,
    paste,
    cut,
    setCurrentTick,
    toggleCheckpoint,
  } = useScoreStore();

  // エラーメッセージの状態
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { zoom, selectedInstrument, snapToGrid, gridSize } = settings;
  const { isPlaying, currentTick } = playback;

  // アクティブレイヤーが全体レイヤーかどうか
  const isGlobalLayerActive = activeLayerId === 'global-layer';

  // 常に拡張ピッチを使用（全レイヤーでオクターブオフセット対応）
  const currentPitchCount = EXTENDED_PITCHES_COUNT;
  const currentNoteNames = EXTENDED_NOTE_NAMES;

  // 選択中の楽器のオクターブオフセットを取得
  const selectedInstrumentData = INSTRUMENTS.find(i => i.id === selectedInstrument);
  const selectedOctaveOffset = selectedInstrumentData?.octaveOffset || 0;

  const cellWidth = CELL_WIDTH * zoom;
  const cellHeight = CELL_HEIGHT;
  const gridWidth = totalTicks * cellWidth + PLAYBACK_LEFT_BUFFER; // 左側バッファを追加
  const gridHeight = currentPitchCount * cellHeight;

  // レイヤーの表示状態マップ
  const visibleLayerIds = useMemo(() => 
    new Set(layers.filter(l => l.visible).map(l => l.id)), 
    [layers]
  );
  
  // レイヤー色とレイヤー名のマップ（高速化用）
  const layerColorMap = useMemo(() => 
    new Map(layers.map(l => [l.id, l.color])),
    [layers]
  );
  const layerNameMap = useMemo(() => 
    new Map(layers.map(l => [l.id, l.name])),
    [layers]
  );

  // ビューポート範囲の計算（仮想化用）
  const visibleTickRange = useMemo(() => {
    const scrollLeft = viewportState.scrollLeft;
    const clientWidth = viewportState.clientWidth || 1000;
    
    // PIANO_KEY_WIDTHとPLAYBACK_LEFT_BUFFERを考慮
    const minTick = Math.max(0, Math.floor((scrollLeft - PIANO_KEY_WIDTH - PLAYBACK_LEFT_BUFFER) / cellWidth) - VIRTUALIZATION_BUFFER);
    const maxTick = Math.min(totalTicks, Math.ceil((scrollLeft + clientWidth - PIANO_KEY_WIDTH) / cellWidth) + VIRTUALIZATION_BUFFER);
    
    return { min: minTick, max: maxTick };
  }, [viewportState.scrollLeft, viewportState.clientWidth, cellWidth, totalTicks]);

  const visiblePitchRange = useMemo(() => {
    const scrollTop = viewportState.scrollTop;
    const clientHeight = viewportState.clientHeight || 500;
    
    // HEADER_HEIGHTを考慮
    const minDisplayPitch = Math.max(0, currentPitchCount - 1 - Math.ceil((scrollTop + clientHeight - HEADER_HEIGHT) / cellHeight) - VIRTUALIZATION_BUFFER);
    const maxDisplayPitch = Math.min(currentPitchCount - 1, currentPitchCount - 1 - Math.floor((scrollTop - HEADER_HEIGHT) / cellHeight) + VIRTUALIZATION_BUFFER);
    
    return { min: minDisplayPitch, max: maxDisplayPitch };
  }, [viewportState.scrollTop, viewportState.clientHeight, cellHeight, currentPitchCount]);

  // 同じ位置のノートをグループ化（常に拡張ピッチ座標系、オクターブオフセット考慮）
  const groupedNotes = useMemo(() => {
    const visibleNotes = notes.filter(note => visibleLayerIds.has(note.layerId));
    const groups = new Map<string, { note: typeof notes[0]; displayPitch: number }[]>();
    
    for (const note of visibleNotes) {
      const instrument = INSTRUMENT_MAP.get(note.instrument);
      const octaveOffset = instrument?.octaveOffset || 0;
      
      // 常に拡張ピッチ座標系に変換
      const displayPitch = note.pitch + NORMAL_PITCH_OFFSET + (octaveOffset * 12);
      
      // 範囲外チェック
      if (displayPitch < 0 || displayPitch >= EXTENDED_PITCHES_COUNT) {
        continue; // 表示範囲外はスキップ
      }
      
      const key = `${note.tick}-${displayPitch}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push({ note, displayPitch });
    }
    
    return groups;
  }, [notes, visibleLayerIds]);

  // グリッドへのスナップ（useCallbackでメモ化）
  const snapToGridValue = useCallback((tick: number): number => {
    if (!snapToGrid) return tick;
    return Math.round(tick / gridSize) * gridSize;
  }, [snapToGrid, gridSize]);

  // マウス位置から座標を計算
  const getPositionFromEvent = useCallback(
    (e: React.MouseEvent): { tick: number; pitch: number; displayPitch: number } | null => {
      if (!containerRef.current) return null;

      const rect = containerRef.current.getBoundingClientRect();
      const scrollLeft = containerRef.current.scrollLeft;
      const scrollTop = containerRef.current.scrollTop;

      // バッファを考慮した座標計算
      const x = e.clientX - rect.left + scrollLeft - PIANO_KEY_WIDTH - PLAYBACK_LEFT_BUFFER;
      const y = e.clientY - rect.top + scrollTop - HEADER_HEIGHT;

      if (x < 0 || y < 0) return null;

      const rawTick = Math.floor(x / cellWidth);
      const tick = snapToGridValue(rawTick);
      
      // 常に拡張ピッチを使用
      const displayPitch = EXTENDED_PITCHES_COUNT - 1 - Math.floor(y / cellHeight);
      
      // 拡張ピッチから通常ピッチに変換（オクターブオフセットを考慮）
      // displayPitch = pitch + NORMAL_PITCH_OFFSET + (octaveOffset * 12)
      // よって: pitch = displayPitch - NORMAL_PITCH_OFFSET - (octaveOffset * 12)
      const pitch = displayPitch - NORMAL_PITCH_OFFSET - (selectedOctaveOffset * 12);

      if (displayPitch < 0 || displayPitch >= EXTENDED_PITCHES_COUNT) return null;
      if (tick < 0 || tick >= totalTicks) return null;

      return { tick, pitch, displayPitch };
    },
    [cellWidth, snapToGridValue, totalTicks, selectedOctaveOffset]
  );

  // マウスダウン処理
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // ポップアップを閉じる（ポップアップ内のクリックは除く）
      if (cellPopup && !(e.target as HTMLElement).closest('.cell-popup')) {
        setCellPopup(null);
        return;
      }
      
      const pos = getPositionFromEvent(e);
      if (!pos) return;

      // Shift+クリックで範囲選択開始
      if (e.shiftKey) {
        setCellPopup(null);
        setDragMode('select');
        setDragStart(pos);
        setDragEnd(pos);
        return;
      }

      // 右クリックは消去モード（全体レイヤーでは無効）
      if (e.button === 2) {
        setCellPopup(null);
        if (!isGlobalLayerActive) {
          setDragMode('erase');
          setDragStart(pos);
          // pitchが有効範囲内の場合のみ削除
          if (pos.pitch >= 0 && pos.pitch < PITCHES.length) {
            removeNotesAt(pos.tick, pos.pitch);
          }
        }
        return;
      }

      // 左クリック
      if (e.button === 0) {
        // このセルにある音符を取得（displayPitchベースで検索）
        const notesAtCell = notes.filter((n) => {
          if (!visibleLayerIds.has(n.layerId)) return false;
          const inst = INSTRUMENT_MAP.get(n.instrument);
          const offset = inst?.octaveOffset || 0;
          const noteDisplayPitch = n.pitch + NORMAL_PITCH_OFFSET + (offset * 12);
          return n.tick === pos.tick && noteDisplayPitch === pos.displayPitch;
        });
        
        if (notesAtCell.length > 0) {
          // 音符がある場合はポップアップを表示
          setCellPopup({
            tick: pos.tick,
            pitch: pos.pitch,
            screenX: e.clientX,
            screenY: e.clientY,
            notes: notesAtCell.map(n => ({
              id: n.id,
              instrument: n.instrument,
              layerId: n.layerId,
            })),
          });
        } else if (!isGlobalLayerActive) {
          // 音符がなければ新規追加（pitchが有効範囲内の場合のみ）
          setCellPopup(null);
          deselectAll();
          
          // pitchが有効範囲（0〜24）外ならエラー
          if (pos.pitch < 0 || pos.pitch >= PITCHES.length) {
            setErrorMessage(`${selectedInstrumentData?.nameJa || selectedInstrument}はこの位置に置けません（ピッチ範囲外）`);
            setTimeout(() => setErrorMessage(null), 3000);
            return;
          }
          
          const result = addNote(pos.tick, pos.pitch, selectedInstrument);
          if (result.success) {
            playNote(selectedInstrument, pos.pitch);
          } else if (result.error) {
            setErrorMessage(result.error);
            setTimeout(() => setErrorMessage(null), 3000);
          }
        }
      }
    },
    [getPositionFromEvent, notes, selectedInstrument, selectedInstrumentData, addNote, removeNotesAt, deselectAll, visibleLayerIds, isGlobalLayerActive, cellPopup]
  );

  // マウス移動処理
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const pos = getPositionFromEvent(e);
      if (!pos) {
        setMousePosition(null);
        return;
      }
      
      // マウス位置を更新（ペースト位置用）
      setMousePosition({ tick: pos.tick, displayPitch: pos.displayPitch });

      if (dragMode === 'select' && dragStart) {
        setDragEnd(pos);
      } else if (dragMode === 'erase') {
        removeNotesAt(pos.tick, pos.pitch);
      }
      // ドラッグ描画は無効化
    },
    [dragMode, dragStart, getPositionFromEvent, removeNotesAt]
  );

  // マウスアップ処理
  const handleMouseUp = useCallback(() => {
    if (dragMode === 'select' && dragStart && dragEnd) {
      // displayPitchベースで選択範囲を渡す（オクターブオフセット対応）
      selectNotesInRange({
        startTick: dragStart.tick,
        endTick: dragEnd.tick,
        startPitch: dragStart.displayPitch,
        endPitch: dragEnd.displayPitch,
      });
    }
    
    setDragMode('none');
    setDragStart(null);
    setDragEnd(null);
  }, [dragMode, dragStart, dragEnd, selectNotesInRange]);

  // コンテキストメニューを無効化
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  // Ctrl+ホイールで横スクロール、通常ホイールで縦スクロール
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!containerRef.current) return;
    
    if (e.ctrlKey) {
      e.preventDefault();
      containerRef.current.scrollLeft += e.deltaY;
    }
    // 通常のホイール操作は縦スクロール（再生中も許可）
    // ブラウザのデフォルト動作に任せる
  }, []);

  // スクロールイベントでビューポートを更新（仮想化用）
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollLeft, scrollTop, clientWidth, clientHeight } = containerRef.current;
    setViewportState({ scrollLeft, scrollTop, clientWidth, clientHeight });
  }, []);

  // 初期ビューポートサイズを設定
  useEffect(() => {
    if (containerRef.current) {
      const { scrollLeft, scrollTop, clientWidth, clientHeight } = containerRef.current;
      setViewportState({ scrollLeft, scrollTop, clientWidth, clientHeight });
    }
  }, []);

  // ResizeObserverでコンテナサイズの変更を監視
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) {
        const { scrollLeft, scrollTop, clientWidth, clientHeight } = containerRef.current;
        setViewportState({ scrollLeft, scrollTop, clientWidth, clientHeight });
      }
    });
    
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // テキスト入力中はショートカットを無効化
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Delete/Backspaceで削除
      if (e.key === 'Delete' || e.key === 'Backspace') {
        useScoreStore.getState().deleteSelected();
      }
      
      // Ctrl+Z / Ctrl+Shift+Z でUndo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          useScoreStore.getState().redo();
        } else {
          useScoreStore.getState().undo();
        }
      }
      
      // Ctrl+C でコピー
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        copySelected();
      }
      
      // Ctrl+V でペースト（マウス位置 → 選択範囲 → 現在の再生位置）
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        const { currentTick } = useScoreStore.getState().playback;
        
        // 優先順位: マウス位置 > 選択範囲 > 現在の再生位置
        if (mousePosition) {
          // マウスがPianoRoll上にある場合、マウス位置にペースト
          paste(mousePosition.tick, mousePosition.displayPitch);
        } else {
          // PianoRoll外の場合は現在の再生位置（tick）、ピッチは中央（displayPitch=36）
          paste(Math.floor(currentTick), 36);
        }
      }
      
      // Ctrl+X でカット
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        e.preventDefault();
        cut();
      }
      
      // Ctrl+A で全選択
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        const { notes, layers } = useScoreStore.getState();
        const visibleNotes = notes.filter(n => {
          const layer = layers.find(l => l.id === n.layerId);
          return layer?.visible;
        });
        const selectedIds = new Set(visibleNotes.map(n => n.id));
        useScoreStore.setState({ selectedNotes: selectedIds });
      }
      
      // Escで選択解除
      if (e.key === 'Escape') {
        deselectAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [copySelected, paste, cut, deselectAll, mousePosition]);

  // マウスがPianoRollから離れたときにmousePositionをクリア
  const handleMouseLeave = useCallback(() => {
    setMousePosition(null);
  }, []);

  // 選択範囲の描画用座標を計算（常に拡張ピッチ座標系）
  const getSelectionRect = () => {
    const start = dragStart;
    const end = dragEnd;
    
    if (!start || !end) return null;

    const minTick = Math.min(start.tick, end.tick);
    const maxTick = Math.max(start.tick, end.tick);
    // displayPitchを直接使用（オクターブオフセット適用済み）
    const minDisplayPitch = Math.min(start.displayPitch, end.displayPitch);
    const maxDisplayPitch = Math.max(start.displayPitch, end.displayPitch);

    return {
      left: PLAYBACK_LEFT_BUFFER + minTick * cellWidth,
      top: (EXTENDED_PITCHES_COUNT - 1 - maxDisplayPitch) * cellHeight,
      width: (maxTick - minTick + 1) * cellWidth,
      height: (maxDisplayPitch - minDisplayPitch + 1) * cellHeight,
    };
  };

  // 確定した選択範囲の描画
  const getConfirmedSelectionRect = () => {
    if (!selection) return null;

    const minTick = Math.min(selection.startTick, selection.endTick);
    const maxTick = Math.max(selection.startTick, selection.endTick);
    // selection.startPitch/endPitchはdisplayPitch（オクターブオフセット適用済み）
    const minDisplayPitch = Math.min(selection.startPitch, selection.endPitch);
    const maxDisplayPitch = Math.max(selection.startPitch, selection.endPitch);

    return {
      left: PLAYBACK_LEFT_BUFFER + minTick * cellWidth,
      top: (currentPitchCount - 1 - maxDisplayPitch) * cellHeight,
      width: (maxTick - minTick + 1) * cellWidth,
      height: (maxDisplayPitch - minDisplayPitch + 1) * cellHeight,
    };
  };

  const selectionRect = dragMode === 'select' ? getSelectionRect() : null;
  const confirmedSelectionRect = getConfirmedSelectionRect();

  // セル番号ヘッダーの表示間隔を計算
  const headerTickInterval = gridSize >= 4 ? gridSize : 4;

  // 初期表示時と全体レイヤー切替時に通常範囲が見える位置にスクロール
  useEffect(() => {
    if (containerRef.current) {
      // 通常範囲の中央付近にスクロール（上に24音分 + ヘッダー分）
      // 画面の中央に通常範囲の中央が来るように調整
      const containerHeight = containerRef.current.clientHeight;
      const normalRangeStart = (EXTENDED_PITCHES_COUNT - NORMAL_PITCH_OFFSET - PITCHES.length) * cellHeight;
      const normalRangeEnd = (EXTENDED_PITCHES_COUNT - NORMAL_PITCH_OFFSET) * cellHeight;
      const normalRangeCenter = (normalRangeStart + normalRangeEnd) / 2;
      const targetScroll = normalRangeCenter - containerHeight / 2 + HEADER_HEIGHT;
      
      // 少し遅延を入れてDOMが更新されてからスクロール
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = Math.max(0, targetScroll);
        }
      });
    }
  }, [cellHeight]); // 初期マウント時のみ実行（cellHeightが変わることはほぼない）

  // 再生中の自動横スクロール（再生位置を常に画面左寄りに固定）
  useEffect(() => {
    if (!isPlaying || !containerRef.current || !autoScrollEnabled) return;

    const container = containerRef.current;
    // 再生位置（バッファ分を加算）
    const playheadX = PLAYBACK_LEFT_BUFFER + currentTick * cellWidth;
    
    // 再生位置を画面の左から約120px（ピアノキー幅 + 少し余白）の位置に固定
    const targetOffset = PIANO_KEY_WIDTH + 40; // ピアノキーの右側からの距離
    const targetScroll = playheadX - targetOffset;
    
    // 即座にスクロール（滑らかではなく追従優先）
    container.scrollLeft = Math.max(0, targetScroll);
  }, [currentTick, cellWidth, isPlaying, autoScrollEnabled]);

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-0 overflow-auto bg-slate-900 select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => { handleMouseUp(); handleMouseLeave(); }}
      onContextMenu={handleContextMenu}
      onWheel={handleWheel}
      onScroll={handleScroll}
    >
      <div className="relative" style={{ width: gridWidth + PIANO_KEY_WIDTH, height: gridHeight + HEADER_HEIGHT }}>
        
        {/* クリップボード状態表示（スティッキー） */}
        {clipboard.length > 0 && (
          <div className="fixed top-[60px] left-[250px] z-50 bg-blue-900/90 text-blue-300 text-xs px-3 py-1.5 rounded-lg border border-blue-700/50 backdrop-blur-sm shadow-lg">
            📋 クリップボード: {clipboard.length}個の音符 (Ctrl+V でペースト)
          </div>
        )}

        {/* 全体レイヤー表示中の注意書き（スティッキー） */}
        {isGlobalLayerActive && (
          <div className="fixed top-[60px] right-4 z-50 bg-amber-900/90 text-amber-300 text-xs px-3 py-1.5 rounded-lg border border-amber-700/50 backdrop-blur-sm shadow-lg">
            🌐 全体表示モード（編集不可）
          </div>
        )}
        
        {/* エラーメッセージ表示 */}
        {errorMessage && (
          <div className="fixed top-[60px] left-1/2 transform -translate-x-1/2 z-50 bg-red-900/90 text-red-300 text-sm px-4 py-2 rounded-lg border border-red-700/50 backdrop-blur-sm shadow-lg animate-pulse">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* セル番号ヘッダー（スティッキー） */}
        <div 
          className="sticky top-0 z-40 flex bg-slate-800 border-b border-slate-700"
          style={{ height: HEADER_HEIGHT }}
        >
          {/* ピアノキー部分のスペーサー */}
          <div 
            className="sticky left-0 z-40 bg-slate-800 border-r border-slate-700 flex items-center justify-center"
            style={{ width: PIANO_KEY_WIDTH, minWidth: PIANO_KEY_WIDTH }}
          >
            <span className="text-[10px] text-slate-500">Tick</span>
          </div>
          
          {/* セル番号（クリックで再生位置を移動、Shiftクリックでチェックポイント） */}
          <div 
            className={`relative ${!isPlaying ? 'cursor-pointer hover:bg-slate-700/30' : ''}`}
            style={{ width: gridWidth }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const clickedTick = Math.floor((x - PLAYBACK_LEFT_BUFFER) / cellWidth);
              if (clickedTick >= 0 && clickedTick < totalTicks) {
                if (e.shiftKey) {
                  // Shiftクリックでチェックポイントを設定/解除
                  toggleCheckpoint(clickedTick);
                } else if (!isPlaying) {
                  // 通常クリックで再生位置を移動（停止中のみ）
                  setCurrentTick(clickedTick);
                }
              }
            }}
          >
            {Array.from({ length: Math.ceil(totalTicks / headerTickInterval) + 1 }).map((_, index) => {
              const tick = index * headerTickInterval;
              if (tick >= totalTicks) return null;
              
              return (
                <div
                  key={tick}
                  className="absolute top-0 h-full flex items-center text-[10px] text-slate-400 font-mono pointer-events-none"
                  style={{ 
                    left: PLAYBACK_LEFT_BUFFER + tick * cellWidth,
                    width: headerTickInterval * cellWidth,
                  }}
                >
                  <span className="pl-1">{tick}</span>
                </div>
              );
            })}
            {/* チェックポイントマーカー（ヘッダー内） */}
            {checkpoint !== null && (
              <div
                className="absolute top-0 bottom-0 w-1 bg-amber-500 cursor-pointer z-10 hover:bg-amber-400"
                style={{ left: PLAYBACK_LEFT_BUFFER + checkpoint * cellWidth - 2 }}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCheckpoint(checkpoint);
                }}
                title="チェックポイント（クリックで削除）"
              >
                <div className="absolute -top-0.5 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-amber-500" />
              </div>
            )}
            {/* 停止中の再生位置インジケータ（ヘッダー内） */}
            {!isPlaying && currentTick > 0 && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-rose-500/70 pointer-events-none"
                style={{ left: PLAYBACK_LEFT_BUFFER + currentTick * cellWidth }}
              />
            )}
          </div>
        </div>

        <div className="relative flex" style={{ height: gridHeight }}>
          {/* ピアノキー */}
          <div
            className="sticky left-0 z-40 bg-slate-800 shadow-xl shadow-black/50 border-r border-slate-700/50"
            style={{ width: PIANO_KEY_WIDTH, height: gridHeight }}
          >
            {Array.from({ length: currentPitchCount }).map((_, index) => {
              const noteIndex = currentPitchCount - 1 - index;
              const noteName = currentNoteNames[noteIndex];
              const isBlackKey = noteName.includes('#');
              
              // 通常範囲（オフセット0の楽器で配置できる範囲）かどうかを判定
              const isNormalRange = noteIndex >= NORMAL_PITCH_OFFSET && noteIndex < NORMAL_PITCH_OFFSET + PITCHES.length;
              
              // 実際のピッチ値（通常レイヤー用）を計算
              const actualPitch = noteIndex - NORMAL_PITCH_OFFSET;
              
              // 選択中の楽器のオフセットを考慮した有効範囲かどうか
              const isInSelectedInstrumentRange = 
                (actualPitch - selectedOctaveOffset * 12) >= 0 && 
                (actualPitch - selectedOctaveOffset * 12) < PITCHES.length;
              
              // オクターブ範囲の背景色を変更
              let bgClass = isBlackKey ? 'bg-slate-900 text-slate-500' : 'bg-slate-800 text-slate-300';
              if (!isNormalRange) {
                bgClass = isBlackKey ? 'bg-slate-950/80 text-slate-600' : 'bg-slate-900/50 text-slate-500';
              }

              return (
                <div
                  key={`key-${index}`}
                  className={`
                    flex items-center justify-end pr-2 border-b border-slate-700/30
                    cursor-pointer select-none transition-all duration-100
                    ${bgClass}
                    ${!isNormalRange ? 'opacity-60' : ''}
                    hover:brightness-125 hover:pl-1
                  `}
                  style={{ 
                    height: cellHeight,
                    // 選択中の楽器の有効範囲内は左側に黄色いバーを表示
                    borderLeft: !isGlobalLayerActive && isInSelectedInstrumentRange ? '3px solid #eab308' : 'none',
                  }}
                  onClick={() => {
                    // 通常範囲内のみ音を鳴らす
                    if (actualPitch >= 0 && actualPitch < PITCHES.length) {
                      playNote(selectedInstrument, actualPitch);
                    }
                  }}
                >
                  <span className="text-[10px] font-mono tracking-tighter">
                    {noteName}
                  </span>
                </div>
              );
            })}
          </div>

        {/* グリッド領域 */}
        <div className="relative bg-slate-900/50 overflow-hidden" style={{ width: gridWidth, height: gridHeight }}>
          {/* 黒鍵/白鍵の行背景色 */}
          {Array.from({ length: currentPitchCount }).map((_, index) => {
            const noteIndex = currentPitchCount - 1 - index;
            const noteName = currentNoteNames[noteIndex];
            const isBlackKey = noteName.includes('#');
            
            return (
              <div
                key={`row-bg-${index}`}
                className="absolute pointer-events-none"
                style={{
                  left: 0,
                  top: index * cellHeight,
                  width: gridWidth,
                  height: cellHeight,
                  backgroundColor: isBlackKey ? 'rgba(15, 23, 42, 0.6)' : 'rgba(51, 65, 85, 0.25)',
                }}
              />
            );
          })}
          
          {/* グリッド線 */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={gridWidth}
            height={gridHeight}
          >
            {/* 水平線 */}
            {Array.from({ length: currentPitchCount }).map((_, index) => {
              // 通常範囲の境界線（青）: pitch 0〜24 が offset=0 で配置できる範囲
              // 上境界: noteIndex = NORMAL_PITCH_OFFSET + 24 の上 → index = 73-1-48 = 24
              // 下境界: noteIndex = NORMAL_PITCH_OFFSET - 1 の下 → index = 73-1-23 = 49
              const normalTopBoundaryIndex = EXTENDED_PITCHES_COUNT - 1 - (NORMAL_PITCH_OFFSET + PITCHES.length - 1);
              const normalBottomBoundaryIndex = EXTENDED_PITCHES_COUNT - NORMAL_PITCH_OFFSET;
              const isNormalBoundary = 
                index === normalTopBoundaryIndex || index === normalBottomBoundaryIndex;
              
              // 選択中の楽器の有効範囲境界線（黄色）
              // displayPitch範囲: (NORMAL_PITCH_OFFSET + offset*12) 〜 (NORMAL_PITCH_OFFSET + offset*12 + 24)
              // 上境界: displayPitch = NORMAL_PITCH_OFFSET + offset*12 + 24 の上
              // 下境界: displayPitch = NORMAL_PITCH_OFFSET + offset*12 - 1 の下
              const instrumentTopDisplayPitch = NORMAL_PITCH_OFFSET + (selectedOctaveOffset * 12) + PITCHES.length - 1;
              const instrumentBottomDisplayPitch = NORMAL_PITCH_OFFSET + (selectedOctaveOffset * 12);
              const instrumentTopBoundaryIndex = EXTENDED_PITCHES_COUNT - 1 - instrumentTopDisplayPitch;
              const instrumentBottomBoundaryIndex = EXTENDED_PITCHES_COUNT - instrumentBottomDisplayPitch;
              
              const isInstrumentBoundary = !isGlobalLayerActive && 
                (index === instrumentTopBoundaryIndex || index === instrumentBottomBoundaryIndex);
              
              // 色の決定: 楽器境界 > 通常境界 > 通常線
              let strokeColor = '#1e293b';
              let strokeWidth = 1;
              let strokeOpacity = 0.5;
              
              if (isInstrumentBoundary) {
                strokeColor = '#eab308'; // 黄色
                strokeWidth = 2;
                strokeOpacity = 0.8;
              } else if (isNormalBoundary) {
                strokeColor = '#3b82f6'; // 青
                strokeWidth = 2;
                strokeOpacity = 0.5;
              }
              
              return (
                <line
                  key={`h-${index}`}
                  x1={0}
                  y1={index * cellHeight}
                  x2={gridWidth}
                  y2={index * cellHeight}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeOpacity={strokeOpacity}
                />
              );
            })}
            {/* 垂直線（グリッドサイズごと） */}
            {Array.from({ length: Math.ceil(totalTicks / gridSize) + 1 }).map((_, index) => {
              const x = PLAYBACK_LEFT_BUFFER + index * gridSize * cellWidth;
              const isMeasure = index % 4 === 0;
              return (
                <line
                  key={`v-${index}`}
                  x1={x}
                  y1={0}
                  x2={x}
                  y2={gridHeight}
                  stroke={isMeasure ? '#475569' : '#1e293b'}
                  strokeWidth={isMeasure ? 1 : 1}
                  strokeOpacity={isMeasure ? 0.5 : 0.3}
                />
              );
            })}
          </svg>

          {/* チェックポイントライン（グリッド内） */}
          {checkpoint !== null && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-amber-500/60 z-20 pointer-events-none"
              style={{ 
                transform: `translateX(${PLAYBACK_LEFT_BUFFER + checkpoint * cellWidth}px)`,
              }}
            />
          )}

          {/* 再生位置インジケータ（GPU高速化 + 120fps対応） */}
          <div
            className={`absolute top-0 bottom-0 w-0.5 z-30 pointer-events-none ${isPlaying ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]' : 'bg-rose-500/50'}`}
            style={{ 
              transform: `translateX(${PLAYBACK_LEFT_BUFFER + currentTick * cellWidth}px)`,
              willChange: 'transform',
            }}
          >
            <div className={`absolute -top-1 -left-1.5 w-3.5 h-3.5 rounded-full shadow-sm ${isPlaying ? 'bg-rose-500' : 'bg-rose-500/50'}`} />
          </div>

          {/* 確定した選択範囲 */}
          {confirmedSelectionRect && (
            <div
              className="absolute border-2 border-cyan-400 bg-cyan-500/20 pointer-events-none z-5"
              style={{
                left: confirmedSelectionRect.left,
                top: confirmedSelectionRect.top,
                width: confirmedSelectionRect.width,
                height: confirmedSelectionRect.height,
              }}
            />
          )}

          {/* ドラッグ中の選択範囲 */}
          {selectionRect && (
            <div
              className="absolute border-2 border-dashed border-cyan-400 bg-cyan-500/10 pointer-events-none z-15"
              style={{
                left: selectionRect.left,
                top: selectionRect.top,
                width: selectionRect.width,
                height: selectionRect.height,
              }}
            />
          )}

          {/* ノート（メモ化コンポーネント・仮想化対応） */}
          <NoteLayer
            groupedNotes={groupedNotes}
            cellWidth={cellWidth}
            cellHeight={cellHeight}
            currentPitchCount={currentPitchCount}
            isGlobalLayerActive={isGlobalLayerActive}
            selectedNotes={selectedNotes}
            layerColorMap={layerColorMap}
            layerNameMap={layerNameMap}
            leftBuffer={PLAYBACK_LEFT_BUFFER}
            visibleTickRange={visibleTickRange}
            visiblePitchRange={visiblePitchRange}
          />
        </div>
        </div>

        {/* セルポップアップ */}
        {cellPopup && (
          <div
            className="fixed z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl min-w-[200px] max-w-[280px] cell-popup"
            style={{
              left: cellPopup.screenX,
              top: cellPopup.screenY,
              transform: 'translate(-50%, 8px)',
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
              <span className="text-xs text-slate-400">
                Tick {cellPopup.tick}, Pitch {cellPopup.pitch}
              </span>
              <button
                onClick={closeCellPopup}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 音符リスト */}
            <div className="max-h-[200px] overflow-y-auto">
              {cellPopup.notes.length > 0 ? (
                <div className="py-1">
                  {cellPopup.notes.map((note) => {
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
                            onClick={() => {
                              removeNote(note.id);
                              // ポップアップを更新
                              setCellPopup(prev => {
                                if (!prev) return null;
                                const newNotes = prev.notes.filter((n: { id: string }) => n.id !== note.id);
                                if (newNotes.length === 0) return null;
                                return { ...prev, notes: newNotes };
                              });
                            }}
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
            {!isGlobalLayerActive && (() => {
              const activeLayer = layers.find(l => l.id === activeLayerId);
              const alreadyExists = cellPopup.notes.some(
                n => n.layerId === activeLayerId && n.instrument === selectedInstrument
              );
              const isLocked = activeLayer?.locked;
              
              return (
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
                        const tick = cellPopup.tick;
                        const pitch = cellPopup.pitch;
                        // ポップアップを先に閉じる
                        closeCellPopup();
                        // 音符を追加して音を鳴らす
                        const result = addNote(tick, pitch, selectedInstrument);
                        if (result.success) {
                          playNote(selectedInstrument, pitch);
                        } else if (result.error) {
                          setErrorMessage(result.error);
                          setTimeout(() => setErrorMessage(null), 3000);
                        }
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
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};
