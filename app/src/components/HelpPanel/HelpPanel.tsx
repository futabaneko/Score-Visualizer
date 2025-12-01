import React from 'react';

export const HelpPanel: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-sm font-semibold text-gray-600 mb-3">使い方</h3>
      <ul className="text-xs text-gray-600 space-y-1.5">
        <li className="flex items-start gap-2">
          <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono text-[10px]">左クリック</span>
          <span>音符を配置</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-mono text-[10px]">右クリック</span>
          <span>音符を削除</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-mono text-[10px]">Shift+ドラッグ</span>
          <span>範囲選択</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-mono text-[10px]">Ctrl+C</span>
          <span>コピー</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-mono text-[10px]">Ctrl+V</span>
          <span>ペースト</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-mono text-[10px]">Ctrl+X</span>
          <span>カット</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-mono text-[10px]">Ctrl+A</span>
          <span>全選択</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-mono text-[10px]">Ctrl+Z</span>
          <span>元に戻す</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-mono text-[10px]">Delete</span>
          <span>選択を削除</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-mono text-[10px]">Esc</span>
          <span>選択解除</span>
        </li>
      </ul>

      <div className="mt-3 pt-3 border-t border-gray-200">
        <h4 className="text-xs font-semibold text-gray-500 mb-2">楽譜フォーマット</h4>
        <p className="text-xs text-gray-600">
          楽器記号 + 音程(A-Y) + 待機tick数
        </p>
        <p className="text-xs text-gray-500 mt-1">
          例: <code className="bg-gray-100 px-1 rounded">*M10\O5!K</code>
        </p>
      </div>
    </div>
  );
};
