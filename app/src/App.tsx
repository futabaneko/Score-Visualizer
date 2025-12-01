import { useEffect, useState, useRef } from 'react';
import { Toolbar, PianoRoll, LayerPanel } from './components';
import { useScoreStore } from './store/useScoreStore';

function App() {
  const [showRestoreNotice, setShowRestoreNotice] = useState(false);
  const notes = useScoreStore((state) => state.notes);
  const initialNotesCountRef = useRef(notes.length);
  
  // 初回マウント時に復元されたデータがあれば通知
  useEffect(() => {
    if (initialNotesCountRef.current > 0) {
      setShowRestoreNotice(true);
      const timer = setTimeout(() => setShowRestoreNotice(false), 4000);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="h-screen flex flex-col bg-slate-900 text-slate-100 overflow-hidden">
      {/* 復元通知 */}
      {showRestoreNotice && (
        <div className="fixed bottom-4 right-4 z-[100] bg-emerald-600/90 text-white text-sm px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm border border-emerald-500/50 animate-fade-in flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>前回のセッションを復元しました</span>
          <button
            onClick={() => setShowRestoreNotice(false)}
            className="ml-2 text-white/70 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}
      
      {/* 上部：ツールバー + 楽器パレット */}
      <header className="flex-shrink-0 border-b border-slate-700/50 bg-slate-800/80 backdrop-blur-sm z-50 relative">
        <Toolbar />
      </header>

      {/* メインエリア */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左サイドバー：レイヤーパネル */}
        <aside className="w-60 flex-shrink-0 border-r border-slate-700/50 bg-slate-800/50 overflow-y-auto">
          <LayerPanel />
        </aside>

        {/* 中央：ピアノロール */}
        <main className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
          <PianoRoll />
        </main>
      </div>
    </div>
  );
}

export default App;
