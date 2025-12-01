import React, { useState, useRef } from 'react';
import { useScoreStore } from '../../store/useScoreStore';
import { generateScore, parseScore } from '../../utils/scoreParser';

// アイコンコンポーネント
const EyeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeOffIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

const LockIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const UnlockIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const ExportIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);

const ImportIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const CopyIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const GlobalIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const SaveIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
  </svg>
);

const FolderOpenIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
  </svg>
);

export const LayerPanel: React.FC = () => {
  const {
    layers,
    activeLayerId,
    notes,
    totalTicks,
    projectName,
    bpm,
    addLayer,
    removeLayer,
    setActiveLayer,
    toggleLayerVisibility,
    toggleLayerLock,
    renameLayer,
    setNotes,
    setTotalTicks,
  } = useScoreStore();

  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showImportModal, setShowImportModal] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [exportText, setExportText] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  
  // プロジェクト保存・読み込み用
  const fileInputRef = useRef<HTMLInputElement>(null);

  // プロジェクトをJSONで保存
  const handleSaveProject = () => {
    const projectData = {
      version: 1,
      projectName,
      bpm,
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

        if (!data.version || !data.layers || !data.notes) {
          throw new Error('Invalid project file format');
        }

        // ストアを更新
        useScoreStore.setState({
          projectName: data.projectName || '読み込みプロジェクト',
          bpm: data.bpm || 120,
          totalTicks: data.totalTicks || 200,
          layers: data.layers,
          notes: data.notes,
          activeLayerId: data.layers.find((l: any) => !l.isGlobal)?.id || data.layers[0]?.id,
          selectedNotes: new Set(),
          selection: null,
          history: [{ notes: data.notes, layers: data.layers }],
          historyIndex: 0,
        });

        alert('プロジェクトを読み込みました！');
      } catch (error) {
        console.error('Failed to load project:', error);
        alert('プロジェクトの読み込みに失敗しました。\nファイル形式を確認してください。');
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
      // インポート先のレイヤーIDを設定
      const notesWithLayer = parsedNotes.map(n => ({
        ...n,
        layerId: showImportModal,
      }));
      // 既存の音符に追加
      const newNotes = [...notes, ...notesWithLayer];
      setNotes(newNotes);
      setShowImportModal(null);
      
      // 最大tickに合わせてtotalTicksを調整
      if (parsedNotes.length > 0) {
        const maxTick = Math.max(...parsedNotes.map(n => n.tick));
        if (maxTick > totalTicks - 20) {
          setTotalTicks(maxTick + 50);
        }
      }
    } catch (error) {
      alert('楽譜の読み込みに失敗しました。フォーマットを確認してください。');
    }
  };

  // クリップボードにコピー
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      alert('コピーに失敗しました');
    }
  };

  // 全体レイヤーと通常レイヤーを分離
  const globalLayer = layers.find(l => l.isGlobal);
  const normalLayers = layers.filter(l => !l.isGlobal);

  return (
    <div className="p-5 pt-6 h-full flex flex-col bg-gradient-to-b from-slate-800/50 to-slate-900/30">
      {/* プロジェクト保存・読み込み */}
      <div className="mb-3 pb-3 border-b border-slate-700/50">
        <div className="flex items-center gap-2.5 mb-3">
          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <h3 className="text-sm font-medium text-slate-300">Project</h3>
        </div>
        
        {/* プロジェクト名入力 */}
        <div className="mb-3">
          <input
            type="text"
            value={projectName}
            onChange={(e) => useScoreStore.getState().setProjectName(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
            placeholder="プロジェクト名を入力..."
          />
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleSaveProject}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 hover:text-emerald-300 rounded-lg transition-all text-xs font-medium"
            title="プロジェクトを保存"
          >
            <SaveIcon />
            <span>保存</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 hover:text-blue-300 rounded-lg transition-all text-xs font-medium"
            title="プロジェクトを読み込み"
          >
            <FolderOpenIcon />
            <span>読込</span>
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
          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="text-sm font-medium text-slate-300">Layers</h3>
        </div>
        <button
          onClick={addLayer}
          className="p-2 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 hover:text-blue-300 rounded-lg transition-all duration-200"
          title="レイヤーを追加"
        >
          <PlusIcon />
        </button>
      </div>

      {/* 全体レイヤー（固定表示） */}
      {globalLayer && (
        <div className="mb-2 pb-4 border-b border-slate-700/50">
          <div
            className={`
              group flex flex-col gap-2 p-3 rounded-xl cursor-pointer
              transition-all duration-200 border
              ${activeLayerId === globalLayer.id 
                ? 'bg-slate-700/50 border-slate-600 shadow-sm' 
                : 'bg-transparent border-transparent hover:bg-slate-700/30'
              }
            `}
            onClick={() => setActiveLayer(globalLayer.id)}
          >
            {/* 上段: アイコンと名前 */}
            <div className="flex items-center gap-2">
              <div className={`p-1 rounded-lg transition-colors ${activeLayerId === globalLayer.id ? 'bg-slate-600 text-slate-200' : 'bg-slate-700/50 text-slate-400 group-hover:text-slate-300'}`}>
                <GlobalIcon />
              </div>
              <span className="text-sm text-slate-200 font-semibold">
                {globalLayer.name}
              </span>
            </div>
            
            {/* 下段: ノート数とエクスポートボタン */}
            <div className="flex items-center justify-between pl-1">
              <span className="text-[10px] text-slate-500">
                {notes.length} notes
              </span>
              
              {/* エクスポートのみ */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleExport(globalLayer.id);
                }}
                className="p-1 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/20 rounded transition-colors opacity-0 group-hover:opacity-100"
                title="全体をエクスポート"
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
              group flex flex-col gap-2 p-3 rounded-xl cursor-pointer
              transition-all duration-200 border relative
              ${activeLayerId === layer.id 
                ? 'bg-blue-500/10 border-blue-500/30 shadow-sm' 
                : 'bg-slate-800/30 border-transparent hover:bg-slate-700/30 hover:border-slate-700/50'
              }
            `}
            onClick={() => setActiveLayer(layer.id)}
          >
            {/* アクティブインジケータ */}
            {activeLayerId === layer.id && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-xl" />
            )}

            {/* 上段: レイヤー名 */}
            <div className="flex items-center gap-2 pl-1 min-h-[24px]">
              {/* 色インジケータ */}
              <div
                className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-slate-800 shadow-sm"
                style={{ backgroundColor: layer.color }}
              />
              
              {editingLayerId === layer.id ? (
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={handleFinishRename}
                  onKeyDown={handleKeyDown}
                  className="flex-1 px-2 py-0.5 text-sm bg-slate-900 border border-blue-500 rounded focus:outline-none text-slate-200 min-w-0"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  className={`flex-1 text-sm font-medium truncate ${activeLayerId === layer.id ? 'text-blue-100' : 'text-slate-300'}`}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleStartRename(layer.id, layer.name);
                  }}
                  title={`${layer.name} (ダブルクリックで名前変更)`}
                >
                  {layer.name}
                </span>
              )}
            </div>

            {/* 下段: ノート数とコントロールボタン */}
            <div className="flex items-center justify-between pl-1">
              <span className="text-[10px] text-slate-500">
                {noteCountByLayer[layer.id] || 0} notes
              </span>
              
              {/* コントロールボタン */}
              <div className={`flex items-center gap-0.5 ${activeLayerId === layer.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
              {/* インポート */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleImport(layer.id);
                }}
                className="p-1 text-slate-500 hover:text-blue-400 hover:bg-blue-500/20 rounded transition-colors"
                title="インポート"
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
              >
                <ExportIcon />
              </button>

              {/* 表示/非表示 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLayerVisibility(layer.id);
                }}
                className={`p-1 rounded transition-colors ${
                  layer.visible 
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-600' 
                    : 'text-slate-600 hover:bg-slate-700'
                }`}
                title={layer.visible ? '非表示にする' : '表示する'}
              >
                {layer.visible ? <EyeIcon /> : <EyeOffIcon />}
              </button>

              {/* ロック/アンロック */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLayerLock(layer.id);
                }}
                className={`p-1 rounded transition-colors ${
                  layer.locked 
                    ? 'text-amber-500 hover:bg-amber-500/20' 
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-600'
                }`}
                title={layer.locked ? 'ロック解除' : 'ロック'}
              >
                {layer.locked ? <LockIcon /> : <UnlockIcon />}
              </button>

              {/* 削除 */}
              {normalLayers.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`「${layer.name}」を削除しますか？\nこのレイヤーの音符も全て削除されます。`)) {
                      removeLayer(layer.id);
                    }
                  }}
                  className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/20 rounded transition-colors"
                  title="削除"
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
      <div className="mt-4 pt-4 border-t border-slate-700/50 text-xs text-slate-500 space-y-1">
        <p>• ダブルクリックで名前変更</p>
        <p>• Shift+ドラッグで範囲選択</p>
        <p>• Ctrl+C/V/X でコピペ</p>
      </div>

      {/* インポートモーダル */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all scale-100">
            <div className="p-6 border-b border-slate-700/50 bg-slate-800/50">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  <ImportIcon />
                  <span>Import Score</span>
                </h2>
                <button 
                  onClick={() => setShowImportModal(null)}
                  className="text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <p className="text-sm text-slate-400">
                Target Layer: <span className="text-blue-400 font-medium">{layers.find(l => l.id === showImportModal)?.name}</span>
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
                <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wider">Format Example</p>
                <code className="text-xs font-mono text-emerald-400 block bg-slate-950 p-2 rounded border border-slate-800">
                  *M10\O5!K...
                </code>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Score Data</label>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="w-full h-48 p-4 bg-slate-950 border border-slate-700 rounded-xl font-mono text-sm text-slate-200 resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-600"
                  placeholder="Paste your score data here..."
                  autoFocus
                />
              </div>
            </div>

            <div className="p-4 bg-slate-800/50 border-t border-slate-700/50 flex justify-end gap-3">
              <button
                onClick={() => setShowImportModal(null)}
                className="px-5 py-2.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-xl transition-all text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleImportConfirm}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all shadow-lg shadow-blue-500/20 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={!importText.trim()}
              >
                <ImportIcon />
                Import Score
              </button>
            </div>
          </div>
        </div>
      )}

      {/* エクスポートモーダル */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all scale-100">
            <div className="p-6 border-b border-slate-700/50 bg-slate-800/50">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  <ExportIcon />
                  <span>Export Score</span>
                </h2>
                <button 
                  onClick={() => setShowExportModal(null)}
                  className="text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <p className="text-sm text-slate-400">
                Source Layer: <span className="text-emerald-400 font-medium">{layers.find(l => l.id === showExportModal)?.name}</span>
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="relative group">
                <label className="text-sm font-medium text-slate-300 mb-2 block">Score Data</label>
                <textarea
                  value={exportText}
                  readOnly
                  className="w-full h-48 p-4 bg-slate-950 border border-slate-700 rounded-xl font-mono text-sm text-slate-200 resize-none focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  onClick={(e) => e.currentTarget.select()}
                />
                <div className="absolute top-9 right-3">
                  <button
                    onClick={handleCopy}
                    className={`
                      flex items-center gap-2 px-4 py-2 
                      rounded-lg text-xs font-bold transition-all shadow-lg
                      ${copySuccess 
                        ? 'bg-emerald-500 text-white translate-y-0' 
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-600'
                      }
                    `}
                  >
                    {copySuccess ? (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <CopyIcon />
                        Copy to Clipboard
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-xs text-blue-200 leading-relaxed">
                  This text can be used in Minecraft or other compatible tools. Click the "Copy" button to save it to your clipboard.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-800/50 border-t border-slate-700/50 flex justify-end">
              <button
                onClick={() => setShowExportModal(null)}
                className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl transition-all shadow-sm text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
