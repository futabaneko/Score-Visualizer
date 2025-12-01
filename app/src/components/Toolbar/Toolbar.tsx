import React, { useRef, useCallback } from 'react';
import { useScoreStore } from '../../store/useScoreStore';
import { playScore, stopAll, playNote } from '../../utils/audioEngine';
import { INSTRUMENTS } from '../../constants';

// アイコンコンポーネント
const PlayIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
  </svg>
);

const StopIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path d="M5.75 3A1.75 1.75 0 004 4.75v10.5c0 .966.784 1.75 1.75 1.75h8.5A1.75 1.75 0 0016 15.25V4.75A1.75 1.75 0 0014.25 3h-8.5z" />
  </svg>
);

const ClearIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const UndoIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
  </svg>
);

const RedoIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
  </svg>
);

// 先頭に戻るアイコン
const RewindIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z" />
  </svg>
);

export const Toolbar: React.FC = () => {
  const stopFnRef = useRef<(() => void) | null>(null);

  const {
    notes,
    layers,
    playback,
    bpm,
    totalTicks,
    settings,
    history,
    historyIndex,
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
  } = useScoreStore();

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
  const handlePlayStop = useCallback(async () => {
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
      
      // 現在のtick位置から再生開始
      const startTick = Math.floor(currentTick);
      
      setPlaying(true);
      
      stopFnRef.current = await playScore(
        visibleNotes,
        bpm,
        (tick) => setCurrentTick(tick),
        () => {
          setPlaying(false);
          setCurrentTick(0); // 再生完了時は先頭に戻る
        },
        startTick
      );
    }
  }, [isPlaying, notes, layers, bpm, currentTick, setPlaying, setCurrentTick]);

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
    <div className="px-6 py-5 bg-gradient-to-b from-slate-800 to-slate-800/95 backdrop-blur-md border-b border-slate-700/50 shadow-lg">
      <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide">
        {/* ロゴ */}
        <div className="flex items-center gap-4 pr-6 border-r border-slate-600/40 flex-shrink-0">
          <div className="w-9 h-9 flex items-center justify-center">
            {/* Minecraft風立方体ロゴ */}
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
              {/* 上面 */}
              <path d="M12 2L22 7L12 12L2 7L12 2Z" fill="#64748b" stroke="#94a3b8" strokeWidth="0.5"/>
              {/* 左側面 */}
              <path d="M2 7L12 12V22L2 17V7Z" fill="#475569" stroke="#64748b" strokeWidth="0.5"/>
              {/* 右側面 */}
              <path d="M22 7L12 12V22L22 17V7Z" fill="#334155" stroke="#475569" strokeWidth="0.5"/>
            </svg>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-slate-200 tracking-tight">Score Editor</span>
            <span className="text-[10px] text-slate-500">Minecraft 音ブロック</span>
          </div>
        </div>

        {/* 再生コントロール */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* 先頭に戻る */}
          <button
            onClick={handleRewind}
            className="flex items-center justify-center p-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-600/60 transition-all active:scale-95"
            title="先頭に戻る"
          >
            <RewindIcon />
          </button>
          
          {/* 再生/停止 */}
          <button
            onClick={handlePlayStop}
            className={`
              flex items-center justify-center gap-2.5 min-w-[100px] px-6 py-2.5 rounded-lg text-sm font-bold
              transition-all duration-200 shadow-md active:scale-[0.98]
              ${isPlaying 
                ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600 shadow-rose-500/25' 
                : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-emerald-500/25'
              }
            `}
          >
            {isPlaying ? <StopIcon /> : <PlayIcon />}
            <span>{isPlaying ? '停止' : '再生'}</span>
          </button>
        </div>

        {/* Undo/Redo */}
        <div className="flex items-center pl-2 border-l border-slate-600/40 flex-shrink-0">
          <div className="flex bg-slate-700/30 rounded-lg p-1 gap-1">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-600/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="元に戻す (Ctrl+Z)"
            >
              <UndoIcon />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-600/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="やり直す (Ctrl+Y)"
            >
              <RedoIcon />
            </button>
          </div>
        </div>

        {/* 楽器パレット */}
        <div className="flex items-center gap-4 pl-4 border-l border-slate-600/40 flex-shrink-0">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <span className="text-xs font-medium text-slate-400">Instruments</span>
          </div>
          <div className="flex gap-1.5 bg-slate-900/40 p-2 rounded-lg border border-slate-700/40">
            {INSTRUMENTS.map((instrument) => (
              <button
                key={instrument.id}
                onClick={() => handleInstrumentClick(instrument.id)}
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
                title={`${instrument.nameJa} (${instrument.symbol}) [${instrument.octaveOffset >= 0 ? '+' : ''}${instrument.octaveOffset}oct]`}
              >
                {instrument.symbol}
                {/* Tooltip */}
                <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-slate-700 shadow-xl z-20">
                  {instrument.nameJa}
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

        {/* クリア */}
        <div className="ml-auto flex items-center pl-4 border-l border-slate-600/40 flex-shrink-0">
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg text-xs font-medium transition-all border border-slate-600/50 hover:border-rose-500/30"
          >
            <ClearIcon />
            <span>Clear All</span>
          </button>
        </div>
      </div>
    </div>
  );
};
