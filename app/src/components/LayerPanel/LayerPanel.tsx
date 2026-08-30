import React, { useState, useRef } from 'react';
import { useScoreStore } from '../../store/useScoreStore';
import { generateScore, parseScore } from '../../utils/scoreParser';
import { MidiImportModal } from '../MidiImportModal';
import type { Note } from '../../types';
import { DEFAULT_BPM, DEFAULT_PROJECT_NAME, normalizeGameVersion } from '../../constants';
import {
  clampTotalTicks,
  DEFAULT_TOTAL_TICKS,
  hasUnsupportedTick,
  MAX_TOTAL_TICKS,
} from '../../utils/timeline';
import { describeUnsupportedNotes, getUnsupportedNotes } from '../../utils/compatibility';
import { confirmAction, notify } from '../../store/useUiFeedbackStore';
import {
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  UnlockIcon,
  PlusIcon,
  TrashIcon,
  ExportIcon,
  ImportIcon,
  CopyIcon,
  GlobalIcon,
  SaveIcon,
  MidiIcon,
  FolderOpenIcon,
} from '../icons';

const IS_MIDI_IMPORT_DISABLED = import.meta.env.VITE_DISABLE_MIDI_IMPORT === 'true';

export const LayerPanel: React.FC = () => {
  const {
    layers,
    activeLayerId,
    notes,
    totalTicks,
    projectName,
    bpm,
    gameVersion,
    addLayer,
    removeLayer,
    setActiveLayer,
    toggleLayerVisibility,
    toggleLayerLock,
    renameLayer,
    setNotes,
    setTotalTicks,
    setProjectName,
    setGameVersion,
  } = useScoreStore();

  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showImportModal, setShowImportModal] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [exportText, setExportText] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  
  // MIDIインポート用
  const [showMidiImportModal, setShowMidiImportModal] = useState<string | null>(null);
  
  // プロジェクト保存・読み込み用
  const fileInputRef = useRef<HTMLInputElement>(null);

  // プロジェクトをJSONで保存
  const handleSaveProject = () => {
    const projectData = {
      version: 1,
      projectName,
      bpm,
      gameVersion,
      totalTicks,
      layers: layers.map(l => ({
        id: l.id,
        name: l.name,
        color: l.color,
        visible: l.visible,
        locked: l.locked,
        order: l.order,
        isGlobal: l.isGlobal || false,
      })),
      notes: notes.map(n => ({
        id: n.id,
        tick: n.tick,
        pitch: n.pitch,
        instrument: n.instrument,
        layerId: n.layerId,
      })),
      savedAt: new Date().toISOString(),
    };

    const json = JSON.stringify(projectData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/[^a-zA-Z0-9぀-ゟ゠-ヿ一-龯]/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // プロジェクトをJSONから読み込み
  const handleLoadProject = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const data = JSON.parse(json);

        if (!data.version || !Array.isArray(data.layers) || !Array.isArray(data.notes)) {
          throw new Error('Invalid project file format');
        }

        const loadedNotes = data.notes as Note[];
        if (hasUnsupportedTick(loadedNotes)) {
          throw new Error(`Notes must be placed before tick ${MAX_TOTAL_TICKS}`);
        }

        const loadedTotalTicks = clampTotalTicks(
          Number(data.totalTicks ?? DEFAULT_TOTAL_TICKS),
          loadedNotes,
        );

        const loadedGameVersion = normalizeGameVersion(data.gameVersion);

        // ストアを更新
        useScoreStore.setState({
          projectName: data.projectName || DEFAULT_PROJECT_NAME,
          bpm: data.bpm || DEFAULT_BPM,
          totalTicks: loadedTotalTicks,
          layers: data.layers,
          notes: loadedNotes,
          activeLayerId: data.layers.find((l: { isGlobal?: boolean }) => !l.isGlobal)?.id || data.layers[0]?.id,
          selectedNotes: new Set(),
          selection: null,
          history: [{ notes: loadedNotes, layers: data.layers }],
          historyIndex: 0,
        });
        setGameVersion(loadedGameVersion);

        notify({ title: 'プロジェクトを読み込みました', tone: 'success' });
      } catch (error) {
        console.error('Failed to load project:', error);
        notify({
          title: 'プロジェクトを読み込めませんでした',
          message: 'ファイル形式を確認してください。',
          tone: 'danger',
        });
      }
    };
    reader.readAsText(file);
    
    // ファイル入力をリセット（同じファイルを再選択できるように）
    event.target.value = '';
  };

  const handleStartRename = (layerId: string, currentName: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (layer?.isGlobal) return; // 全体レイヤーは名前変更不可
    setEditingLayerId(layerId);
    setEditingName(currentName);
  };

  const handleFinishRename = () => {
    if (editingLayerId && editingName.trim()) {
      renameLayer(editingLayerId, editingName.trim());
    }
    setEditingLayerId(null);
    setEditingName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFinishRename();
    } else if (e.key === 'Escape') {
      setEditingLayerId(null);
      setEditingName('');
    }
  };

  // レイヤーごとの音符数をカウント
  const noteCountByLayer: Record<string, number> = {};
  notes.forEach((note) => {
    noteCountByLayer[note.layerId] = (noteCountByLayer[note.layerId] || 0) + 1;
  });

  const extendTimelineForNotes = (addedNotes: readonly Note[]) => {
    if (addedNotes.length === 0) return;

    const lastNoteTick = Math.max(...addedNotes.map((note) => note.tick));
    if (lastNoteTick > totalTicks - 20) {
      setTotalTicks(lastNoteTick + 50);
    }
  };

  // エクスポート（特定レイヤーまたは全体）
  const handleExport = (layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    let targetNotes;
    
    if (layer?.isGlobal) {
      // 全体レイヤー：全ての音符をエクスポート
      targetNotes = notes;
    } else {
      // 通常レイヤー：そのレイヤーの音符のみ
      targetNotes = notes.filter(n => n.layerId === layerId);
    }
    
    const unsupportedNotes = getUnsupportedNotes(targetNotes, gameVersion);
    if (unsupportedNotes.length > 0) {
      notify({
        title: '楽譜を出力できません',
        message: `選択中のMinecraftバージョンでは利用できません。\n${describeUnsupportedNotes(unsupportedNotes)}`,
        tone: 'warning',
      });
      return;
    }

    const score = generateScore(targetNotes);
    setExportText(score);
    setShowExportModal(layerId);
    setCopySuccess(false);
  };

  // インポート（特定レイヤーに）
  const handleImport = (layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (layer?.isGlobal) return; // 全体レイヤーにはインポート不可
    setImportText('');
    setShowImportModal(layerId);
  };

  const handleImportConfirm = () => {
    if (!showImportModal) return;
    try {
      const parsedNotes = parseScore(importText);
      if (hasUnsupportedTick(parsedNotes)) {
        notify({
          title: '楽譜が長すぎます',
          message: `Lengthは${MAX_TOTAL_TICKS}以下にしてください。`,
          tone: 'warning',
        });
        return;
      }
      const unsupportedNotes = getUnsupportedNotes(parsedNotes, gameVersion);
      if (unsupportedNotes.length > 0) {
        notify({
          title: '非対応の音符があります',
          message: describeUnsupportedNotes(unsupportedNotes),
          tone: 'warning',
        });
        return;
      }
      // インポート先のレイヤーIDを設定
      const notesWithLayer = parsedNotes.map(n => ({
        ...n,
        layerId: showImportModal,
      }));
      // 既存の音符に追加
      const newNotes = [...notes, ...notesWithLayer];
      setNotes(newNotes);
      setShowImportModal(null);
      
      extendTimelineForNotes(parsedNotes);
    } catch {
      notify({
        title: '楽譜を読み込めませんでした',
        message: 'フォーマットを確認してください。',
        tone: 'danger',
      });
    }
  };

  // クリップボードにコピー
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      notify({ title: 'コピーできませんでした', tone: 'danger' });
    }
  };

  // MIDIインポートモーダルを開く
  const handleMidiImport = (layerId: string) => {
    if (IS_MIDI_IMPORT_DISABLED) return;
    const layer = layers.find(l => l.id === layerId);
    if (layer?.isGlobal) return; // 全体レイヤーにはインポート不可
    setShowMidiImportModal(layerId);
  };

  // MIDIインポート完了時のハンドラー
  const handleMidiImportComplete = (importedNotes: Note[]) => {
    // 既存の音符に追加
    const newNotes = [...notes, ...importedNotes];
    setNotes(newNotes);
    
    extendTimelineForNotes(importedNotes);
  };

  // 全体レイヤーと通常レイヤーを分離
  const globalLayer = layers.find(l => l.isGlobal);
  const normalLayers = layers.filter(l => !l.isGlobal);

  return (
    <div className="sidebar-panel h-full flex flex-col p-4">
      {/* プロジェクト保存・読み込み */}
      <div className="mb-3 border-b border-slate-700/50 pb-3">
        <div className="flex items-center gap-2.5 mb-3">
          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <h3 className="text-sm font-semibold text-slate-300">Project</h3>
        </div>
        
        {/* プロジェクト名入力 */}
        <div className="mb-3">
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
            placeholder="プロジェクト名を入力..."
          />
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleSaveProject}
            className="project-action project-action-save flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all text-xs font-medium"
            title="プロジェクトを保存"
            aria-label="プロジェクトを保存"
          >
            <SaveIcon />
            <span>保存</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="project-action project-action-open flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all text-xs font-medium"
            title="プロジェクトを開く"
            aria-label="プロジェクトを開く"
          >
            <FolderOpenIcon />
            <span>開く</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleLoadProject}
            className="hidden"
          />
        </div>
      </div>

      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2.5">
          <h3 className="text-xs font-semibold tracking-wide text-slate-400">Layer</h3>
        </div>
        <button
          onClick={addLayer}
          className="p-2 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 hover:text-blue-300 rounded-lg transition-all duration-200"
          title="レイヤーを追加"
          aria-label="レイヤーを追加"
        >
          <PlusIcon />
        </button>
      </div>

      {/* 全体レイヤー（固定表示） */}
      {globalLayer && (
        <div className="mb-2 pb-4 border-b border-slate-700/50">
          <div
            className={`
              layer-card group flex flex-col gap-2 p-3 rounded-xl cursor-pointer
              transition-all duration-200 border
              ${activeLayerId === globalLayer.id 
                ? 'layer-card-active shadow-sm'
                : 'layer-card-idle'
              }
            `}
            onClick={() => setActiveLayer(globalLayer.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GlobalIcon />
                <span className="text-sm font-medium text-slate-200">
                  {globalLayer.name}
                </span>
              </div>
              
              {/* 音符数 */}
              <span className="text-xs text-slate-500 tabular-nums">
                {notes.length} notes
              </span>
            </div>
            
            {/* 全体レイヤーのコントロール */}
            <div className="flex items-center gap-1">
              {/* エクスポートのみ（全体レイヤー） */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleExport(globalLayer.id);
                }}
                className="p-1 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/20 rounded transition-colors"
                title="全体をエクスポート"
                aria-label="全体をエクスポート"
              >
                <ExportIcon />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 通常レイヤーリスト */}
      <div className="flex-1 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
        {normalLayers.map((layer) => (
          <div
            key={layer.id}
            className={`
              layer-card group flex flex-col gap-2 p-3 rounded-xl cursor-pointer
              transition-all duration-200 border
              ${activeLayerId === layer.id 
                ? 'layer-card-active shadow-sm'
                : 'layer-card-idle'
              }
              ${layer.locked ? 'opacity-75' : ''}
            `}
            onClick={() => setActiveLayer(layer.id)}
          >
            {/* 上段: レイヤー情報 */}
            <div className="flex items-center gap-3">
              {/* カラーインジケーター */}
              <div
                className="w-3 h-3 rounded-full ring-2 ring-white/10 flex-shrink-0"
                style={{ backgroundColor: layer.color }}
              />
              
              {/* レイヤー名 */}
              <div className="flex-1 min-w-0">
                {editingLayerId === layer.id ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={handleFinishRename}
                    onKeyDown={handleKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-0.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                ) : (
                  <span
                    className="text-sm font-medium text-slate-200 truncate block"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleStartRename(layer.id, layer.name);
                    }}
                  >
                    {layer.name}
                  </span>
                )}
              </div>
              
              {/* 音符数 */}
              <span className="text-xs text-slate-500 tabular-nums flex-shrink-0">
                {noteCountByLayer[layer.id] || 0} notes
              </span>
            </div>
            
            {/* 下段: コントロールボタン */}
            <div className="flex items-center justify-between">
              {/* 左側のコントロール */}
              <div className="flex items-center gap-0.5">
                {/* 表示切替 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLayerVisibility(layer.id);
                  }}
                  className={`p-1 rounded transition-colors ${
                    layer.visible
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-600/50'
                      : 'text-slate-600 hover:text-slate-400 hover:bg-slate-700/50'
                  }`}
                  title={layer.visible ? '非表示' : '表示'}
                  aria-label={layer.visible ? `${layer.name}を非表示` : `${layer.name}を表示`}
                  aria-pressed={layer.visible}
                >
                  {layer.visible ? <EyeIcon /> : <EyeOffIcon />}
                </button>
                
                {/* ロック切替 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLayerLock(layer.id);
                  }}
                  className={`p-1 rounded transition-colors ${
                    layer.locked
                      ? 'text-amber-500 hover:text-amber-400 hover:bg-amber-500/20'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-600/50'
                  }`}
                  title={layer.locked ? 'ロック解除' : 'ロック'}
                  aria-label={layer.locked ? `${layer.name}のロックを解除` : `${layer.name}をロック`}
                  aria-pressed={layer.locked}
                >
                  {layer.locked ? <LockIcon /> : <UnlockIcon />}
                </button>
              </div>
              
              {/* コントロールボタン */}
              <div className={`flex items-center gap-0.5 ${activeLayerId === layer.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
              {/* MIDIインポート */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMidiImport(layer.id);
                }}
                disabled={IS_MIDI_IMPORT_DISABLED}
                className={`p-1 rounded transition-colors ${IS_MIDI_IMPORT_DISABLED
                  ? 'cursor-not-allowed text-slate-400/50 opacity-50'
                  : 'text-slate-500 hover:text-purple-400 hover:bg-purple-500/20'
                }`}
                title={IS_MIDI_IMPORT_DISABLED ? 'GitHub Pages版ではMIDIインポートを利用できません' : 'MIDIインポート'}
                aria-label={IS_MIDI_IMPORT_DISABLED
                  ? `${layer.name}へのMIDIインポート（GitHub Pages版では利用不可）`
                  : `${layer.name}へMIDIをインポート`
                }
              >
                <MidiIcon />
              </button>
              
              {/* テキストインポート */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleImport(layer.id);
                }}
                className="p-1 text-slate-500 hover:text-blue-400 hover:bg-blue-500/20 rounded transition-colors"
                title="テキストインポート"
                aria-label={`${layer.name}へテキストをインポート`}
              >
                <ImportIcon />
              </button>
              
              {/* エクスポート */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleExport(layer.id);
                }}
                className="p-1 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/20 rounded transition-colors"
                title="エクスポート"
                aria-label={`${layer.name}をエクスポート`}
              >
                <ExportIcon />
              </button>
              
              {/* 削除（最低1つのレイヤーは残す） */}
              {normalLayers.length > 1 && (
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    const shouldDelete = await confirmAction({
                      title: `「${layer.name}」を削除しますか？`,
                      message: 'このレイヤーに含まれる音符もすべて削除されます。',
                      confirmLabel: '削除する',
                      tone: 'danger',
                    });
                    if (shouldDelete) {
                      removeLayer(layer.id);
                    }
                  }}
                  className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/20 rounded transition-colors"
                  title="削除"
                  aria-label={`${layer.name}を削除`}
                >
                  <TrashIcon />
                </button>
              )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ヘルプ */}
      <details className="sidebar-help mt-3 pt-3 border-t border-slate-700/50 text-xs text-slate-500">
        <summary className="cursor-pointer select-none font-medium text-slate-400">操作のヒント</summary>
        <div className="mt-2 space-y-1 leading-relaxed">
          <p>• ダブルクリックで名前変更</p>
          <p>• Shift+ドラッグで範囲選択</p>
          <p>• 選択した音符をドラッグして一括移動</p>
          <p>• Ctrl+C/V/X でコピペ</p>
        </div>
      </details>

      {/* インポートモーダル */}
      {showImportModal && (
        <div className="modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto transform transition-all scale-100" role="dialog" aria-modal="true" aria-labelledby="score-import-title">
            <div className="p-6 border-b border-slate-700/50 bg-slate-800/50">
              <div className="flex items-center justify-between mb-1">
                <h2 id="score-import-title" className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  <ImportIcon />
                  <span>楽譜をインポート</span>
                </h2>
                <button 
                  onClick={() => setShowImportModal(null)}
                  className="text-slate-400 hover:text-slate-200 transition-colors"
                  aria-label="インポート画面を閉じる"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <p className="text-sm text-slate-400">
                対象レイヤー: <span className="text-blue-400 font-medium">{layers.find(l => l.id === showImportModal)?.name}</span>
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-300">
                楽譜データを貼り付けてください（例: <code className="bg-slate-700 px-1.5 py-0.5 rounded text-xs text-emerald-400">+0[a+c e]+1[a+c e]</code>）
              </p>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="w-full h-40 bg-slate-900/70 border border-slate-600 rounded-xl p-4 text-sm text-slate-100 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                placeholder="楽譜データを貼り付け..."
                autoFocus
              />
              
              <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-xs text-blue-200 leading-relaxed">
                  既存の音符は保持されます。インポートされた音符は追加されます。
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-800/50 border-t border-slate-700/50 flex justify-end gap-3">
              <button
                onClick={() => setShowImportModal(null)}
                className="px-5 py-2.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-xl transition-all text-sm font-medium"
              >
                キャンセル
              </button>
              <button
                onClick={handleImportConfirm}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all shadow-lg shadow-blue-500/20 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={!importText.trim()}
              >
                <ImportIcon />
                インポート
              </button>
            </div>
          </div>
        </div>
      )}

      {/* エクスポートモーダル */}
      {showExportModal && (
        <div className="modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto transform transition-all scale-100" role="dialog" aria-modal="true" aria-labelledby="score-export-title">
            <div className="p-6 border-b border-slate-700/50 bg-slate-800/50">
              <div className="flex items-center justify-between mb-1">
                <h2 id="score-export-title" className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  <ExportIcon />
                  <span>楽譜をエクスポート</span>
                </h2>
                <button 
                  onClick={() => setShowExportModal(null)}
                  className="text-slate-400 hover:text-slate-200 transition-colors"
                  aria-label="エクスポート画面を閉じる"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <p className="text-sm text-slate-400">
                対象: <span className="text-emerald-400 font-medium">
                  {layers.find(l => l.id === showExportModal)?.isGlobal 
                    ? '全体（All Layers）' 
                    : layers.find(l => l.id === showExportModal)?.name}
                </span>
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="relative">
                <textarea
                  value={exportText}
                  readOnly
                  className="w-full h-48 bg-slate-900/70 border border-slate-600 rounded-xl p-4 text-sm text-slate-100 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-transparent transition-all"
                />
                <button
                  onClick={handleCopy}
                  className={`absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    copySuccess 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  }`}
                >
                  {copySuccess ? (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      コピー済み
                    </>
                  ) : (
                    <>
                      <CopyIcon />
                      コピー
                    </>
                  )}
                </button>
              </div>
              
              <div className="export-info-panel flex items-start gap-3 rounded-lg border p-3">
                <svg className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-xs leading-relaxed">
                  この形式はSkriptの楽譜として直接使用できます。コピーしてSkriptファイルに貼り付けてください。
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-800/50 border-t border-slate-700/50 flex justify-end gap-3">
              <button
                onClick={() => setShowExportModal(null)}
                className="px-5 py-2.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-xl transition-all text-sm font-medium"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MIDIインポートモーダル */}
      {!IS_MIDI_IMPORT_DISABLED && showMidiImportModal && (
        <MidiImportModal
          layerId={showMidiImportModal}
          layerName={layers.find(l => l.id === showMidiImportModal)?.name || 'Layer'}
          totalTicks={totalTicks}
          onImport={handleMidiImportComplete}
          onClose={() => setShowMidiImportModal(null)}
        />
      )}
    </div>
  );
};
