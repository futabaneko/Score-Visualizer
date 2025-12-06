import React, { useRef, useCallback, useState, useEffect } from 'react';
import { useScoreStore } from '../../store/useScoreStore';
import { playScore, stopAll, playNote } from '../../utils/audioEngine';
import { INSTRUMENTS } from '../../constants';
import {
  NewIcon,
  PlayIcon,
  StopIcon,
  ClearIcon,
  UndoIcon,
  RedoIcon,
  RewindIcon,
} from '../icons';

export const Toolbar: React.FC = () => {
  const stopFnRef = useRef<(() => void) | null>(null);
  
  // Shiftキーの状態を追跡
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  const {
    notes,
    layers,
    playback,
    totalTicks,
    settings,
    history,
    historyIndex,
    checkpoint,
    setPlaying,
    setCurrentTick,
    clearNotes,
    setZoom,
    setTotalTicks,
    setGridSize,
    setSnapToGrid,
    setSelectedInstrument,
    undo,
    redo,
    resetProject,
  } = useScoreStore();

  // Shiftキーの監視
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const { isPlaying, currentTick } = playback;
  const { zoom, gridSize, snapToGrid, selectedInstrument } = settings;

  const handleInstrumentClick = (instrumentId: string) => {
    setSelectedInstrument(instrumentId);
    playNote(instrumentId, 12);
  };

  // 再生/停止（表示されているレイヤーのみ再生）
  // 停止時は現在位置を保持し、次回再生時はその位置から開始
  // fromCheckpoint: trueの場合はチェックポイントから再生
  const handlePlayStop = useCallback(async (fromCheckpoint = false) => {
    if (isPlaying) {
      if (stopFnRef.current) {
        stopFnRef.current();
        stopFnRef.current = null;
      }
      stopAll();
      setPlaying(false);
      // 停止時はcurrentTickをリセットしない（途中から再生できるように）
    } else {
      // 表示されているレイヤーの音符のみ再生
      const visibleLayerIds = new Set(layers.filter(l => l.visible && !l.isGlobal).map(l => l.id));
      const visibleNotes = notes.filter(n => visibleLayerIds.has(n.layerId));
      
      if (visibleNotes.length === 0) {
        alert('再生する音符がありません');
        return;
      }
      
      // チェックポイントから再生する場合はチェックポイント位置から、それ以外は現在位置から
      const startTick = fromCheckpoint && checkpoint !== null ? checkpoint : Math.floor(currentTick);
      
      setPlaying(true);
      
      stopFnRef.current = await playScore(
        visibleNotes,
        (tick) => setCurrentTick(tick),
        () => {
          setPlaying(false);
          setCurrentTick(0); // 再生完了時は先頭に戻る
        },
        startTick
      );
    }
  }, [isPlaying, notes, layers, currentTick, checkpoint, setPlaying, setCurrentTick]);

  // 先頭に戻る
  const handleRewind = useCallback(() => {
    if (isPlaying) {
      // 再生中なら停止
      if (stopFnRef.current) {
        stopFnRef.current();
        stopFnRef.current = null;
      }
      stopAll();
      setPlaying(false);
    }
    setCurrentTick(0);
  }, [isPlaying, setPlaying, setCurrentTick]);

  // 新規作成
  const handleNewProject = useCallback(() => {
    if (notes.length === 0) {
      resetProject();
      return;
    }
    if (window.confirm('現在のプロジェクトを破棄して新規作成しますか？\n（この操作は元に戻せません）')) {
      resetProject();
    }
  }, [notes.length, resetProject]);

  // クリア
  const handleClear = useCallback(() => {
    if (notes.length === 0) return;
    if (window.confirm('全ての音符を削除しますか？')) {
      clearNotes();
    }
  }, [notes.length, clearNotes]);

  // グリッドサイズ入力
  const handleGridSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (value > 0 && value <= 100) {
      setGridSize(value);
    }
  };

  return (
    <div className="px-6 py-2 bg-gradient-to-b from-slate-800 to-slate-800/95 backdrop-blur-md border-b border-slate-700/50 shadow-lg">
      <div className="flex items-center gap-4 flex-wrap">
        {/* ロゴ */}
        <div className="flex items-center gap-3 pr-6 border-r border-slate-600/40 flex-shrink-0">
          <div className="w-8 h-8 flex items-center justify-center">
            {/* シンプルな立方体アイコン */}
            <svg className="w-7 h-7" viewBox="0 0 32 32" fill="none">
              <path d="M16 4L28 10L16 16L4 10L16 4Z" fill="#64748b"/>
              <path d="M4 10L16 16V28L4 22V10Z" fill="#475569"/>
              <path d="M28 10L16 16V28L28 22V10Z" fill="#334155"/>
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-slate-200 tracking-tight text-sm">Score Editor</span>
            <span className="text-[10px] text-slate-500">Minecraft 音ブロック</span>
          </div>
        </div>

        {/* 再生コントロール */}
        <div className="flex items-center gap-2 flex-shrink-0" role="group" aria-label="再生コントロール">
          {/* 先頭に戻る */}
          <button
            onClick={handleRewind}
            className="flex items-center justify-center p-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-600/60 transition-all active:scale-95"
            title="先頭に戻る"
            aria-label="先頭に戻る"
          >
            <RewindIcon />
          </button>
          
          {/* 再生/停止 */}
          <button
            onClick={() => handlePlayStop(isShiftPressed && checkpoint !== null)}
            aria-label={isPlaying ? '停止' : (isShiftPressed && checkpoint !== null ? 'チェックポイントから再生' : '再生')}
            className={`
              flex items-center justify-center gap-2.5 min-w-[100px] px-6 py-2.5 rounded-lg text-sm font-bold
              transition-all duration-200 shadow-md active:scale-[0.98]
              ${isPlaying 
                ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600 shadow-rose-500/25' 
                : (isShiftPressed && checkpoint !== null
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-amber-500/25'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-emerald-500/25')
              }
            `}
          >
            {isPlaying ? <StopIcon /> : <PlayIcon />}
            <span>{isPlaying ? '停止' : (isShiftPressed && checkpoint !== null ? 'CP再生' : '再生')}</span>
          </button>
        </div>

        {/* Undo/Redo */}
        <div className="flex items-center pl-2 border-l border-slate-600/40 flex-shrink-0" role="group" aria-label="編集履歴">
          <div className="flex bg-slate-700/30 rounded-lg p-1 gap-1">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-600/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="元に戻す (Ctrl+Z)"
              aria-label="元に戻す"
            >
              <UndoIcon />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-600/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="やり直す (Ctrl+Y)"
              aria-label="やり直す"
            >
              <RedoIcon />
            </button>
          </div>
        </div>

        {/* 楽器パレット */}
        <div className="flex items-center gap-4 pl-4 border-l border-slate-600/40 flex-shrink-0" role="group" aria-label="楽器パレット">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <span className="text-xs font-medium text-slate-400">Instruments</span>
          </div>
          <div className="flex gap-1.5 bg-slate-900/40 p-2 rounded-lg border border-slate-700/40" role="radiogroup" aria-label="楽器選択">
            {INSTRUMENTS.map((instrument) => (
              <button
                key={instrument.id}
                onClick={() => handleInstrumentClick(instrument.id)}
                role="radio"
                aria-checked={selectedInstrument === instrument.id}
                aria-label={instrument.nameJa}
                className={`
                  w-8 h-8 rounded-md flex items-center justify-center
                  text-sm font-bold transition-all duration-150 relative group
                  ${selectedInstrument === instrument.id
                    ? 'scale-105 shadow-lg z-10'
                    : 'opacity-50 hover:opacity-100 hover:bg-slate-700/50'
                  }
                `}
                style={{ 
                  backgroundColor: selectedInstrument === instrument.id ? instrument.color : undefined,
                  color: selectedInstrument === instrument.id ? 'white' : instrument.color,
                  borderColor: instrument.color,
                  borderWidth: selectedInstrument === instrument.id ? 0 : 1,
                  boxShadow: selectedInstrument === instrument.id 
                    ? `0 4px 12px -2px ${instrument.color}50` 
                    : undefined,
                }}
                title={`${instrument.nameJa} (${instrument.symbol})${instrument.octaveOffset !== 0 ? ` [${instrument.octaveOffset > 0 ? '+' : ''}${instrument.octaveOffset}oct]` : ''}`}
              >
                {instrument.symbol}
                {/* Tooltip */}
                <span className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-slate-700 shadow-xl z-[100]" aria-hidden="true">
                  {instrument.nameJa}{instrument.octaveOffset !== 0 && <span className="ml-1 text-yellow-400">{instrument.octaveOffset > 0 ? '+' : ''}{instrument.octaveOffset}oct</span>}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 設定 */}
        <div className="flex items-center gap-6 pl-4 border-l border-slate-600/40 flex-shrink-0">
          {/* ズーム */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center gap-4">
              <span className="text-[10px] font-medium text-slate-500 uppercase">Zoom</span>
              <span className="text-[10px] font-mono text-slate-300 bg-slate-700/50 px-2 py-0.5 rounded">{Math.round(zoom * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-28 h-1.5 rounded-full appearance-none cursor-pointer bg-slate-600
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:shadow-md
                [&::-webkit-slider-thumb]:shadow-blue-500/40 [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-400"
            />
          </div>

          {/* グリッドサイズ */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-medium text-slate-500 uppercase">Grid</span>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="100"
                value={gridSize}
                onChange={handleGridSizeChange}
                className="w-14 px-2 py-1.5 bg-slate-900/60 border border-slate-600/80 rounded-md text-xs text-slate-200 text-center focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${snapToGrid ? 'bg-blue-500 border-blue-500' : 'border-slate-500 group-hover:border-slate-400'}`}>
                  {snapToGrid && <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <input
                  type="checkbox"
                  checked={snapToGrid}
                  onChange={(e) => setSnapToGrid(e.target.checked)}
                  className="hidden"
                />
                <span className="text-xs text-slate-400 group-hover:text-slate-300">Snap</span>
              </label>
            </div>
          </div>

          {/* 長さ */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-medium text-slate-500 uppercase">Length</span>
            <input
              type="number"
              value={totalTicks}
              onChange={(e) => setTotalTicks(parseInt(e.target.value) || 100)}
              className="w-20 px-3 py-1.5 bg-slate-900/60 border border-slate-600/80 rounded-md text-xs text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              min={20}
              max={2000}
            />
          </div>
        </div>

        {/* 新規・クリア */}
        <div className="ml-auto flex items-center gap-2 pl-4 border-l border-slate-600/40 flex-shrink-0">
          <button
            onClick={handleNewProject}
            className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg text-xs font-medium transition-all border border-slate-600/50 hover:border-emerald-500/30"
            title="新規プロジェクト"
          >
            <NewIcon />
            <span>New</span>
          </button>
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg text-xs font-medium transition-all border border-slate-600/50 hover:border-rose-500/30"
            title="全ての音符を削除"
          >
            <ClearIcon />
            <span>Clear All</span>
          </button>
        </div>
      </div>
    </div>
  );
};
