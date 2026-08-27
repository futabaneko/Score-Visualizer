import React, { useRef, useCallback, useState, useEffect } from 'react';
import { useScoreStore } from '../../store/useScoreStore';
import { playScore, stopAll, playNote } from '../../utils/audioEngine';
import { getInstrumentsForVersion, GAME_VERSIONS, INSTRUMENT_TEXTURES } from '../../constants';
import type { GameVersion } from '../../constants';
import { getMinimumTotalTicks, MAX_TOTAL_TICKS } from '../../utils/timeline';
import { describeUnsupportedNotes, getUnsupportedNotes } from '../../utils/compatibility';
import { confirmAction, notify } from '../../store/useUiFeedbackStore';
import {
  NewIcon,
  PlayIcon,
  StopIcon,
  ClearIcon,
  UndoIcon,
  RedoIcon,
  RewindIcon,
  MoonIcon,
  SunIcon,
  WarningIcon,
} from '../icons';

export const Toolbar: React.FC = () => {
  const stopFnRef = useRef<(() => void) | null>(null);
  const playbackRequestIdRef = useRef(0);
  const logoUrl = `${import.meta.env.BASE_URL || '/'}score-editor-logo.png`;
  
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
    gameVersion,
    theme,
    setPlaying,
    setCurrentTick,
    clearNotes,
    setZoom,
    setTotalTicks,
    setGridSize,
    setSnapToGrid,
    setSelectedInstrument,
    setGameVersion,
    setTheme,
    undo,
    redo,
    resetProject,
  } = useScoreStore();

  const [totalTicksInput, setTotalTicksInput] = useState(String(totalTicks));
  const minimumTotalTicks = getMinimumTotalTicks(notes);

  // 現在のバージョンで利用可能な楽器
  const availableInstruments = getInstrumentsForVersion(gameVersion);
  const unsupportedNotes = getUnsupportedNotes(notes, gameVersion);
  const compatibilityDetails = describeUnsupportedNotes(unsupportedNotes);

  useEffect(() => {
    setTotalTicksInput(String(totalTicks));
  }, [totalTicks]);

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

  // バージョン変更時に、選択中の楽器がそのバージョンで使えない場合はplingにフォールバック
  const handleVersionChange = async (version: GameVersion) => {
    const newlyUnsupportedNotes = getUnsupportedNotes(notes, version);
    if (newlyUnsupportedNotes.length > 0) {
      const versionLabel = GAME_VERSIONS.find((item) => item.value === version)?.label ?? version;
      const shouldChange = await confirmAction({
        title: 'バージョン互換性の警告',
        message: `${versionLabel}では利用できない音符があります。\n`
          + `${describeUnsupportedNotes(newlyUnsupportedNotes)}\n\n`
          + '音符は保持されますが、このバージョンでは再生と楽譜出力ができません。',
        confirmLabel: '切り替える',
        tone: 'warning',
      });
      if (!shouldChange) return;
      stopPlayback();
    }

    setGameVersion(version);
  };

  const stopPlayback = useCallback((rewind = false) => {
    playbackRequestIdRef.current += 1;
    stopFnRef.current?.();
    stopFnRef.current = null;
    stopAll();
    setPlaying(false);
    if (rewind) setCurrentTick(0);
  }, [setCurrentTick, setPlaying]);

  // 再生/停止（表示されているレイヤーのみ再生）
  // 停止時は現在位置を保持し、次回再生時はその位置から開始
  // fromCheckpoint: trueの場合はチェックポイントから再生
  const handlePlayStop = useCallback(async (fromCheckpoint = false) => {
    if (isPlaying) {
      stopPlayback();
      // 停止時はcurrentTickをリセットしない（途中から再生できるように）
    } else {
      // 表示されているレイヤーの音符のみ再生
      const visibleLayerIds = new Set(layers.filter(l => l.visible && !l.isGlobal).map(l => l.id));
      const visibleNotes = notes.filter(n => visibleLayerIds.has(n.layerId));
      
      if (visibleNotes.length === 0) {
        notify({ title: '再生できません', message: '再生する音符がありません。', tone: 'info' });
        return;
      }

      const unsupportedVisibleNotes = getUnsupportedNotes(visibleNotes, gameVersion);
      if (unsupportedVisibleNotes.length > 0) {
        notify({
          title: '非対応の音符があります',
          message: describeUnsupportedNotes(unsupportedVisibleNotes),
          tone: 'warning',
        });
        return;
      }
      
      // チェックポイントから再生する場合はチェックポイント位置から、それ以外は現在位置から
      const startTick = fromCheckpoint && checkpoint !== null ? checkpoint : Math.floor(currentTick);
      const requestId = ++playbackRequestIdRef.current;
      setPlaying(true);

      const stopPlaybackFn = await playScore(
        visibleNotes,
        (tick) => setCurrentTick(tick),
        () => {
          if (requestId !== playbackRequestIdRef.current) return;
          stopFnRef.current = null;
          setPlaying(false);
          setCurrentTick(0); // 再生完了時は先頭に戻る
        },
        startTick
      );

      if (requestId !== playbackRequestIdRef.current) {
        stopPlaybackFn();
        return;
      }
      stopFnRef.current = stopPlaybackFn;
    }
  }, [isPlaying, notes, layers, currentTick, checkpoint, gameVersion, setPlaying, setCurrentTick, stopPlayback]);

  // 先頭に戻る
  const handleRewind = useCallback(() => {
    stopPlayback(true);
  }, [stopPlayback]);

  // 新規作成
  const handleNewProject = useCallback(async () => {
    const shouldReset = notes.length === 0 || await confirmAction({
      title: '新しいプロジェクトを作成しますか？',
      message: '現在のプロジェクトは破棄されます。この操作は元に戻せません。',
      confirmLabel: '新規作成',
      tone: 'danger',
    });

    if (shouldReset) {
      stopPlayback(true);
      resetProject();
    }
  }, [notes.length, resetProject, stopPlayback]);

  // クリア
  const handleClear = useCallback(async () => {
    if (notes.length === 0) return;
    const shouldClear = await confirmAction({
      title: 'すべての音符を削除しますか？',
      message: 'すべてのレイヤーから音符が削除されます。',
      confirmLabel: '削除する',
      tone: 'danger',
    });
    if (shouldClear) {
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

  const commitTotalTicks = () => {
    const parsedTicks = Number.parseInt(totalTicksInput, 10);
    if (!Number.isFinite(parsedTicks)) {
      setTotalTicksInput(String(totalTicks));
      return;
    }

    const normalizedTicks = setTotalTicks(parsedTicks);
    setTotalTicksInput(String(normalizedTicks));
  };

  return (
    <div className="toolbar px-5 py-2.5 border-b">
      <div className="flex items-center gap-4 flex-wrap">
        {/* ロゴ + バージョン */}
        <div className="flex items-center gap-3 pr-6 border-r border-slate-600/40 flex-shrink-0">
          <div className="w-8 h-8 flex items-center justify-center">
            <img
              src={logoUrl}
              alt="Score Editor"
              className="h-8 w-8 object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-slate-200 tracking-tight text-sm">Score Editor</span>
            <span className="text-[10px] text-slate-500">Minecraft 音ブロック</span>
          </div>
          {/* バージョンセレクター */}
          <select
            value={gameVersion}
            onChange={(e) => void handleVersionChange(e.target.value as GameVersion)}
            className="version-select ml-2 px-2 py-1 bg-slate-900/60 border border-slate-600/80 rounded-md text-xs text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
            title="Minecraft バージョン"
            aria-label="Minecraft バージョン"
          >
            {GAME_VERSIONS.map((v) => (
              <option key={v.value} value={v.value}>{v.label}</option>
            ))}
          </select>
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
                ? 'bg-rose-600 text-white hover:bg-rose-700'
                : (isShiftPressed && checkpoint !== null
                    ? 'bg-amber-600 text-white hover:bg-amber-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700')
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
        <div className="instrument-section flex items-center gap-4 border flex-shrink-0" role="group" aria-label="楽器パレット">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <span className="toolbar-label text-xs font-medium">楽器</span>
          </div>
          <div className="instrument-palette flex gap-1.5 bg-slate-900/40 p-2 rounded-lg border border-slate-700/40" role="radiogroup" aria-label="楽器選択">
            {availableInstruments.map((instrument) => {
              const textureUrl = INSTRUMENT_TEXTURES[instrument.id];
              return (
                <button
                  key={instrument.id}
                  onClick={() => handleInstrumentClick(instrument.id)}
                  role="radio"
                  aria-checked={selectedInstrument === instrument.id}
                  aria-label={instrument.nameJa}
                  className={`
                    instrument-button w-8 h-8 rounded-md flex items-center justify-center
                    transition-all duration-150 relative group
                    ${selectedInstrument === instrument.id
                      ? 'scale-110 shadow-lg z-10 ring-2'
                      : 'opacity-90 hover:opacity-100 hover:bg-slate-700/50 hover:scale-105'
                    }
                  `}
                  style={{
                    borderColor: instrument.color,
                    boxShadow: selectedInstrument === instrument.id
                      ? `0 4px 12px -2px ${instrument.color}50, 0 0 0 2px ${instrument.color}`
                      : undefined,
                  }}
                  title={`${instrument.nameJa} (${instrument.symbol})${instrument.octaveOffset !== 0 ? ` [${instrument.octaveOffset > 0 ? '+' : ''}${instrument.octaveOffset}oct]` : ''}`}
                >
                  {textureUrl ? (
                    <img
                      src={textureUrl}
                      alt={instrument.nameJa}
                      className="w-6 h-6 rounded-sm"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  ) : (
                    <span className="text-sm font-bold" style={{ color: instrument.color }}>
                      {instrument.symbol}
                    </span>
                  )}
                  {/* Tooltip */}
                  <span className="instrument-tooltip absolute -bottom-10 left-1/2 transform -translate-x-1/2 px-2 py-1 text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border shadow-md z-[100]" aria-hidden="true">
                    {instrument.nameJa}{instrument.octaveOffset !== 0 && <span className="ml-1 text-yellow-400">{instrument.octaveOffset > 0 ? '+' : ''}{instrument.octaveOffset}oct</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 設定 */}
        <div className="flex items-center gap-6 pl-4 border-l border-slate-600/40 flex-shrink-0">
          {/* ズーム */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center gap-4">
              <span className="toolbar-label text-[10px] font-medium">ズーム</span>
              <span className="text-[10px] font-mono text-slate-300 bg-slate-700/50 px-2 py-0.5 rounded">{Math.round(zoom * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              aria-label="ズーム倍率"
              className="w-28 h-1.5 rounded-full appearance-none cursor-pointer bg-slate-600
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:shadow-md
                [&::-webkit-slider-thumb]:shadow-blue-500/40 [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-400"
            />
          </div>

          {/* グリッドサイズ */}
          <div className="flex flex-col gap-2">
            <span className="toolbar-label text-[10px] font-medium">グリッド</span>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="100"
                value={gridSize}
                onChange={handleGridSizeChange}
                aria-label="グリッド間隔"
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
                <span className="text-xs text-slate-400 group-hover:text-slate-300">スナップ</span>
              </label>
            </div>
          </div>

          {/* 長さ */}
          <div className="flex flex-col gap-2">
            <span className="toolbar-label text-[10px] font-medium">長さ</span>
            <input
              type="number"
              value={totalTicksInput}
              onChange={(e) => setTotalTicksInput(e.target.value)}
              onBlur={commitTotalTicks}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
                if (e.key === 'Escape') {
                  setTotalTicksInput(String(totalTicks));
                  e.currentTarget.blur();
                }
              }}
              className="w-20 px-3 py-1.5 bg-slate-900/60 border border-slate-600/80 rounded-md text-xs text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              min={minimumTotalTicks}
              max={MAX_TOTAL_TICKS}
              aria-label="楽譜の長さ"
              title={`入力範囲: ${minimumTotalTicks}～${MAX_TOTAL_TICKS} tick`}
            />
          </div>
        </div>

        {/* 新規・クリア */}
        <div className="ml-auto flex items-center gap-2 pl-4 border-l border-slate-600/40 flex-shrink-0">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="icon-button flex items-center justify-center p-2 rounded-lg border transition-colors"
            title={theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
            aria-label={theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
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
            <span>全削除</span>
          </button>
        </div>
      </div>
      {unsupportedNotes.length > 0 && (
        <div className="compatibility-notice mt-2 flex items-start gap-3 rounded-lg border py-2.5 pl-4 pr-3 text-xs" role="status">
          <WarningIcon />
          <div>
            <div className="font-semibold">バージョン互換性の確認が必要です</div>
            <div className="mt-0.5 opacity-90">
              利用できない音符が{unsupportedNotes.length}個あります：{compatibilityDetails}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
