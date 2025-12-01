import React from 'react';
import { useScoreStore } from '../../store/useScoreStore';

export const Header: React.FC = () => {
  const { projectName, notes } = useScoreStore();

  return (
    <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-3xl">🎵</span>
              <div>
                <h1 className="text-xl font-bold">Minecraft Score Editor</h1>
                <p className="text-sm text-indigo-200">音ブロック楽譜エディタ</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-sm text-indigo-200">プロジェクト</p>
              <p className="font-medium">{projectName}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-indigo-200">音符数</p>
              <p className="font-mono font-medium">{notes.length}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
