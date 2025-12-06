import React, { useState, useRef } from 'react';
import { 
  analyzeMidiFile,
  parseMidiFile, 
  readFileAsArrayBuffer, 
  getClosestCompatibleBpm,
  MINECRAFT_COMPATIBLE_BPMS,
  type MidiAnalysisResult,
  type MidiImportResult 
} from '../../utils/midiParser';
import { 
  MidiIcon, 
  CloseIcon, 
  SpinnerIcon, 
  MusicNoteIcon,
  WarningIcon,
  InfoIcon 
} from '../icons';

interface MidiImportModalProps {
  layerId: string;
  layerName: string;
  totalTicks: number;
  onImport: (notes: MidiImportResult['notes']) => void;
  onClose: () => void;
}

export const MidiImportModal: React.FC<MidiImportModalProps> = ({
  layerId,
  layerName,
  totalTicks,
  onImport,
  onClose,
}) => {
  const [midiAnalysis, setMidiAnalysis] = useState<MidiAnalysisResult | null>(null);
  const [midiImportResult, setMidiImportResult] = useState<MidiImportResult | null>(null);
  const [midiImportLoading, setMidiImportLoading] = useState(false);
  const [midiArrayBuffer, setMidiArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [originalBpmInput, setOriginalBpmInput] = useState<string>('');
  const [selectedTargetBpm, setSelectedTargetBpm] = useState<number>(120);
  const [customBpm, setCustomBpm] = useState<string>('');
  const [useCustomBpm, setUseCustomBpm] = useState(false);
  const midiFileInputRef = useRef<HTMLInputElement>(null);

  // 現在の原曲BPMを取得（入力値またはデフォルト）
  const getCurrentOriginalBpm = (): number => {
    const parsed = parseInt(originalBpmInput, 10);
    return isNaN(parsed) || parsed < 20 || parsed > 400 ? 120 : parsed;
  };

  // MIDIファイルを選択（Step 1: 解析）
  const handleMidiFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setMidiImportLoading(true);
    try {
      const arrayBuffer = await readFileAsArrayBuffer(file);
      const analysis = await analyzeMidiFile(arrayBuffer);
      
      setMidiAnalysis(analysis);
      setMidiArrayBuffer(arrayBuffer);
      setOriginalBpmInput(String(analysis.originalBpm));
      
      const closestBpm = getClosestCompatibleBpm(analysis.originalBpm);
      setSelectedTargetBpm(closestBpm);
      
      const result = await parseMidiFile(arrayBuffer, layerId, analysis.originalBpm, closestBpm, totalTicks);
      setMidiImportResult(result);
    } catch (error) {
      console.error('MIDI parse error:', error);
      alert('MIDIファイルの読み込みに失敗しました。\nファイル形式を確認してください。');
    } finally {
      setMidiImportLoading(false);
      event.target.value = '';
    }
  };

  // BPM変更時にプレビューを更新（ターゲットBPM変更）
  const handleTargetBpmChange = async (targetBpm: number) => {
    if (!midiArrayBuffer) return;
    
    setSelectedTargetBpm(targetBpm);
    setMidiImportLoading(true);
    
    try {
      const originalBpm = getCurrentOriginalBpm();
      const result = await parseMidiFile(midiArrayBuffer, layerId, originalBpm, targetBpm, totalTicks);
      setMidiImportResult(result);
    } catch (error) {
      console.error('MIDI parse error:', error);
    } finally {
      setMidiImportLoading(false);
    }
  };

  // 原曲BPM変更時にプレビューを更新
  const handleOriginalBpmChange = async (newOriginalBpm: number) => {
    if (!midiArrayBuffer) return;
    
    setMidiImportLoading(true);
    
    try {
      const result = await parseMidiFile(midiArrayBuffer, layerId, newOriginalBpm, selectedTargetBpm, totalTicks);
      setMidiImportResult(result);
    } catch (error) {
      console.error('MIDI parse error:', error);
    } finally {
      setMidiImportLoading(false);
    }
  };

  // カスタムターゲットBPM適用
  const handleApplyCustomBpm = async () => {
    const bpm = parseInt(customBpm, 10);
    if (isNaN(bpm) || bpm < 20 || bpm > 300) {
      alert('BPMは20〜300の範囲で入力してください。');
      return;
    }
    await handleTargetBpmChange(bpm);
  };

  // MIDIインポートを確定
  const handleMidiImportConfirm = () => {
    if (!midiImportResult) return;
    onImport(midiImportResult.notes);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all scale-100">
        {/* ヘッダー */}
        <div className="p-6 border-b border-slate-700/50 bg-slate-800/50">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <MidiIcon />
              <span>Import MIDI File</span>
            </h2>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              <CloseIcon />
            </button>
          </div>
          <p className="text-sm text-slate-400">
            Target Layer: <span className="text-purple-400 font-medium">{layerName}</span>
          </p>
        </div>
        
        {/* コンテンツ */}
        <div className="p-6 space-y-4">
          {/* ファイル選択 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">MIDI File</label>
            <div 
              className="border-2 border-dashed border-slate-600 hover:border-purple-500/50 rounded-xl p-8 text-center cursor-pointer transition-colors"
              onClick={() => midiFileInputRef.current?.click()}
            >
              {midiImportLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <SpinnerIcon />
                  <span className="text-sm text-slate-400">読み込み中...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <MusicNoteIcon />
                  <span className="text-sm text-slate-400">クリックしてMIDIファイルを選択</span>
                  <span className="text-xs text-slate-500">.mid, .midi</span>
                </div>
              )}
            </div>
            <input
              ref={midiFileInputRef}
              type="file"
              accept=".mid,.midi"
              onChange={handleMidiFileSelect}
              className="hidden"
            />
          </div>

          {/* 読み込み結果 */}
          {midiAnalysis && (
            <div className="space-y-3">
              {/* 原曲BPM入力 */}
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-300">原曲BPM</span>
                  <span className="text-xs text-slate-500">
                    検出値: {midiAnalysis.originalBpm} BPM（正しくない場合があります）
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={originalBpmInput}
                    onChange={(e) => setOriginalBpmInput(e.target.value)}
                    onBlur={() => {
                      const bpm = parseInt(originalBpmInput, 10);
                      if (!isNaN(bpm) && bpm >= 20 && bpm <= 400) {
                        handleOriginalBpmChange(bpm);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const bpm = parseInt(originalBpmInput, 10);
                        if (!isNaN(bpm) && bpm >= 20 && bpm <= 400) {
                          handleOriginalBpmChange(bpm);
                        }
                      }
                    }}
                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                    min={20}
                    max={400}
                    placeholder="原曲のBPMを入力"
                  />
                  <button
                    onClick={() => {
                      const bpm = parseInt(originalBpmInput, 10);
                      if (!isNaN(bpm) && bpm >= 20 && bpm <= 400) {
                        handleOriginalBpmChange(bpm);
                      }
                    }}
                    disabled={midiImportLoading}
                    className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    適用
                  </button>
                </div>
                
                <div className="text-xs text-slate-500">
                  曲の長さ: {Math.floor(midiAnalysis.duration / 60)}:{String(Math.floor(midiAnalysis.duration % 60)).padStart(2, '0')} 
                  &nbsp;|&nbsp; 総音符数: {midiAnalysis.totalNotes}
                </div>
              </div>

              {/* ターゲットBPM選択 */}
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-300">ターゲットBPM（Minecraft対応）</span>
                  {selectedTargetBpm !== getCurrentOriginalBpm() && (
                    <span className="text-xs text-amber-400">
                      {((getCurrentOriginalBpm() / selectedTargetBpm - 1) * 100).toFixed(1)}% {getCurrentOriginalBpm() > selectedTargetBpm ? '遅く' : '速く'}なります
                    </span>
                  )}
                </div>
                
                {/* プリセットBPMボタン */}
                <div className="flex flex-wrap gap-2">
                  {MINECRAFT_COMPATIBLE_BPMS.map((bpm) => {
                    const isClosest = bpm === getClosestCompatibleBpm(getCurrentOriginalBpm());
                    return (
                      <button
                        key={bpm}
                        onClick={() => {
                          setUseCustomBpm(false);
                          handleTargetBpmChange(bpm);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          selectedTargetBpm === bpm && !useCustomBpm
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        } ${isClosest ? 'ring-2 ring-cyan-500/50' : ''}`}
                      >
                        {bpm}
                        {isClosest && <span className="ml-1 text-xs opacity-75">★</span>}
                      </button>
                    );
                  })}
                </div>

                {/* カスタムBPM入力 */}
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={customBpm}
                    onChange={(e) => {
                      setCustomBpm(e.target.value);
                      setUseCustomBpm(true);
                    }}
                    placeholder="カスタムBPM (20-300)"
                    className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                    min={20}
                    max={300}
                  />
                  <button
                    onClick={handleApplyCustomBpm}
                    disabled={!customBpm || midiImportLoading}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    適用
                  </button>
                </div>
              </div>

              {/* インポート結果プレビュー */}
              {midiImportResult && (
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-300">インポートプレビュー</span>
                    <span className="text-xs text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded">
                      {midiImportResult.originalBpm} → {midiImportResult.targetBpm} BPM
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-slate-800 rounded-lg p-3">
                      <div className="text-2xl font-bold text-emerald-400">{midiImportResult.notes.length}</div>
                      <div className="text-xs text-slate-500">インポート可能な音符</div>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-3">
                      <div className="text-2xl font-bold text-amber-400">{midiImportResult.skippedNotes}</div>
                      <div className="text-xs text-slate-500">範囲外でスキップ</div>
                    </div>
                  </div>

                  {midiImportResult.trackInfo.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-xs text-slate-500">トラック情報:</span>
                      <div className="flex flex-wrap gap-1">
                        {midiImportResult.trackInfo.map((track, i) => (
                          <span key={i} className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
                            {track.name}: {track.noteCount}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {midiImportResult && midiImportResult.skippedNotes > 0 && (
                <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <WarningIcon />
                  <p className="text-xs text-amber-200 leading-relaxed">
                    一部の音符は音域範囲外（MIDI 30-102）またはtick範囲外（0-{totalTicks}）のためスキップされました。
                  </p>
                </div>
              )}

              <div className="flex items-start gap-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <InfoIcon />
                <p className="text-xs text-purple-200 leading-relaxed">
                  音域に応じて自動的に楽器が割り当てられます：Bass(低音) → Guitar → Pling(中音) → Flute → Bell(高音)
                </p>
              </div>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="p-4 bg-slate-800/50 border-t border-slate-700/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-xl transition-all text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleMidiImportConfirm}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all shadow-lg shadow-purple-500/20 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={!midiImportResult || midiImportResult.notes.length === 0 || midiImportLoading}
          >
            <MidiIcon />
            Import {midiImportResult?.notes.length || 0} Notes
          </button>
        </div>
      </div>
    </div>
  );
};
