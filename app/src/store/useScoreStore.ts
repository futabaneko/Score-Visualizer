import { create } from 'zustand';
import type { Note, EditorSettings, PlaybackState, Layer, Selection } from '../types';
import { DEFAULT_BPM, DEFAULT_ZOOM, DEFAULT_GRID_SIZE, INSTRUMENTS, PITCHES } from '../constants';
import { generateId } from '../utils/scoreParser';

// ローカルストレージのキー
const AUTOSAVE_KEY = 'score-visualizer-autosave';
const AUTOSAVE_INTERVAL = 5000; // 5秒ごとに自動保存

// デフォルトレイヤーの色
const LAYER_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
];

interface ScoreState {
  // 音符データ
  notes: Note[];
  
  // レイヤー
  layers: Layer[];
  activeLayerId: string;
  
  // エディタ設定
  settings: EditorSettings;
  
  // 再生状態
  playback: PlaybackState;
  
  // プロジェクト情報
  projectName: string;
  bpm: number;
  totalTicks: number;
  
  // 選択状態
  selectedNotes: Set<string>;
  selection: Selection | null; // 範囲選択
  
  // クリップボード
  clipboard: Note[];
  
  // 操作履歴（Undo/Redo用）
  history: { notes: Note[]; layers: Layer[] }[];
  historyIndex: number;
  
  // チェックポイント（一つだけ）
  checkpoint: number | null;
  
  // 音符アクション
  addNote: (tick: number, pitch: number, instrument: string) => { success: boolean; error?: string };
  removeNote: (noteId: string) => void;
  removeNotesAt: (tick: number, pitch: number) => void;
  clearNotes: () => void;
  setNotes: (notes: Note[]) => void;
  
  // 選択操作
  selectNote: (noteId: string, multi?: boolean) => void;
  selectNotesInRange: (selection: Selection) => void;
  setSelection: (selection: Selection | null) => void;
  deselectAll: () => void;
  deleteSelected: () => void;
  
  // コピー・ペースト
  copySelected: () => void;
  paste: (tick: number, pitch: number) => void;
  cut: () => void;
  
  // レイヤー操作
  addLayer: () => void;
  removeLayer: (layerId: string) => void;
  setActiveLayer: (layerId: string) => void;
  toggleLayerVisibility: (layerId: string) => void;
  toggleLayerLock: (layerId: string) => void;
  renameLayer: (layerId: string, name: string) => void;
  reorderLayers: (fromIndex: number, toIndex: number) => void;
  
  // 設定変更
  setSelectedInstrument: (instrumentId: string) => void;
  setZoom: (zoom: number) => void;
  setGridSize: (size: number) => void;
  setSnapToGrid: (snap: boolean) => void;
  
  // 再生制御
  setPlaying: (playing: boolean) => void;
  setCurrentTick: (tick: number) => void;
  
  // プロジェクト
  setProjectName: (name: string) => void;
  setBpm: (bpm: number) => void;
  setTotalTicks: (ticks: number) => void;
  
  // 履歴操作
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
  
  // チェックポイント
  setCheckpoint: (tick: number | null) => void;
  toggleCheckpoint: (tick: number) => void;
  
  // プロジェクト管理
  resetProject: () => void;
}

// デフォルトレイヤーを作成
const createDefaultLayer = (): Layer => ({
  id: generateId(),
  name: 'レイヤー 1',
  color: LAYER_COLORS[0],
  visible: true,
  locked: false,
  order: 1,
});

// 全体レイヤー（固定・編集不可）
const GLOBAL_LAYER_ID = 'global-layer';
const createGlobalLayer = (): Layer => ({
  id: GLOBAL_LAYER_ID,
  name: '全体',
  color: '#94A3B8',
  visible: true,
  locked: true,
  order: 0,
  isGlobal: true,
});

// ローカルストレージから復元
const loadFromLocalStorage = (): {
  notes: Note[];
  layers: Layer[];
  projectName: string;
  bpm: number;
  totalTicks: number;
  activeLayerId: string;
  checkpoint: number | null;
} | null => {
  try {
    const saved = localStorage.getItem(AUTOSAVE_KEY);
    if (!saved) return null;
    
    const data = JSON.parse(saved);
    if (!data.notes || !data.layers) return null;
    
    // 全体レイヤーを確保（常に存在するように）
    const hasGlobalLayer = data.layers.some((l: Layer) => l.isGlobal);
    if (!hasGlobalLayer) {
      data.layers.unshift(createGlobalLayer());
    }
    
    return {
      notes: data.notes,
      layers: data.layers,
      projectName: data.projectName || '新規プロジェクト',
      bpm: data.bpm || DEFAULT_BPM,
      totalTicks: data.totalTicks || 200,
      activeLayerId: data.activeLayerId || data.layers.find((l: Layer) => !l.isGlobal)?.id,
      checkpoint: data.checkpoint ?? null,
    };
  } catch (error) {
    console.warn('Failed to load autosave:', error);
    return null;
  }
};

// ローカルストレージに保存
const saveToLocalStorage = (state: {
  notes: Note[];
  layers: Layer[];
  projectName: string;
  bpm: number;
  totalTicks: number;
  activeLayerId: string;
  checkpoint: number | null;
}) => {
  try {
    const data = {
      notes: state.notes,
      layers: state.layers,
      projectName: state.projectName,
      bpm: state.bpm,
      totalTicks: state.totalTicks,
      activeLayerId: state.activeLayerId,
      checkpoint: state.checkpoint,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to autosave:', error);
  }
};

// 初期状態をローカルストレージから復元、なければデフォルト
const savedState = loadFromLocalStorage();
const globalLayer = createGlobalLayer();
const defaultLayer = createDefaultLayer();

const initialNotes = savedState?.notes || [];
const initialLayers = savedState?.layers || [globalLayer, defaultLayer];
const initialActiveLayerId = savedState?.activeLayerId || defaultLayer.id;
const initialProjectName = savedState?.projectName || '新規プロジェクト';
const initialBpm = savedState?.bpm || DEFAULT_BPM;
const initialTotalTicks = savedState?.totalTicks || 200;
const initialCheckpoint = savedState?.checkpoint ?? null;

export const useScoreStore = create<ScoreState>((set, get) => ({
  notes: initialNotes,
  
  layers: initialLayers,
  activeLayerId: initialActiveLayerId,
  
  settings: {
    gridSize: DEFAULT_GRID_SIZE,
    zoom: DEFAULT_ZOOM,
    selectedInstrument: 'pling',
    snapToGrid: true,
  },
  
  playback: {
    isPlaying: false,
    currentTick: 0,
    startTime: null,
  },
  
  projectName: initialProjectName,
  bpm: initialBpm,
  totalTicks: initialTotalTicks,
  
  selectedNotes: new Set(),
  selection: null,
  
  clipboard: [],
  
  history: [{ notes: [], layers: [globalLayer, defaultLayer] }],
  historyIndex: 0,
  
  checkpoint: initialCheckpoint,
  
  addNote: (tick, pitch, instrument) => {
    const { notes, activeLayerId, layers, saveToHistory } = get();
    
    // 全体レイヤーには追加不可
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (activeLayer?.isGlobal || activeLayer?.locked) {
      return { success: false, error: 'このレイヤーには追加できません' };
    }
    
    // 通常ピッチ範囲（0〜24）のチェック
    if (pitch < 0 || pitch >= PITCHES.length) {
      const instrumentData = INSTRUMENTS.find(i => i.id === instrument);
      return { 
        success: false, 
        error: `${instrumentData?.nameJa || instrument}はこの位置に置けません（ピッチ範囲外）` 
      };
    }
    
    // 同じ位置・同じ楽器・同じレイヤーの音符がある場合のみ追加を防止
    // （異なる楽器なら同一tick・同一pitchに配置可能）
    const exists = notes.some(
      (n) => n.tick === tick && n.pitch === pitch && n.instrument === instrument && n.layerId === activeLayerId
    );
    
    if (!exists) {
      saveToHistory();
      const newNote: Note = {
        id: generateId(),
        tick,
        pitch,
        instrument,
        layerId: activeLayerId,
      };
      set({ notes: [...notes, newNote] });
      return { success: true };
    }
    
    return { success: false, error: '同じ音符が既に存在します' };
  },
  
  removeNote: (noteId) => {
    const { notes, layers, saveToHistory } = get();
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    // レイヤーがロックされているかチェック
    const layer = layers.find(l => l.id === note.layerId);
    if (layer?.locked) return;
    
    saveToHistory();
    set({ notes: notes.filter((n) => n.id !== noteId) });
  },
  
  removeNotesAt: (tick, pitch) => {
    const { notes, layers, activeLayerId, settings, saveToHistory } = get();
    
    // アクティブレイヤーがロックされているかチェック
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (activeLayer?.locked) return;
    
    // 選択中の楽器と一致するノートのみ削除（同じ位置に複数楽器がある場合のため）
    const selectedInstrument = settings.selectedInstrument;
    const filtered = notes.filter((n) => 
      !(n.tick === tick && n.pitch === pitch && n.layerId === activeLayerId && n.instrument === selectedInstrument)
    );
    if (filtered.length !== notes.length) {
      saveToHistory();
      set({ notes: filtered });
    }
  },
  
  clearNotes: () => {
    const { saveToHistory } = get();
    saveToHistory();
    set({ notes: [], selectedNotes: new Set(), selection: null });
  },
  
  setNotes: (notes) => {
    const { saveToHistory, activeLayerId } = get();
    saveToHistory();
    // インポートした音符にレイヤーIDを付与
    const notesWithLayer = notes.map(n => ({
      ...n,
      layerId: n.layerId || activeLayerId,
    }));
    set({ notes: notesWithLayer, selectedNotes: new Set(), selection: null });
  },
  
  selectNote: (noteId, multi = false) => {
    const { selectedNotes } = get();
    const newSelected = multi ? new Set(selectedNotes) : new Set<string>();
    
    if (newSelected.has(noteId)) {
      newSelected.delete(noteId);
    } else {
      newSelected.add(noteId);
    }
    
    set({ selectedNotes: newSelected });
  },
  
  selectNotesInRange: (selection) => {
    const { notes, activeLayerId, layers } = get();
    
    // 全体レイヤーでは選択不可
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (activeLayer?.isGlobal) {
      set({ selection });
      return;
    }
    
    const minTick = Math.min(selection.startTick, selection.endTick);
    const maxTick = Math.max(selection.startTick, selection.endTick);
    const minPitch = Math.min(selection.startPitch, selection.endPitch);
    const maxPitch = Math.max(selection.startPitch, selection.endPitch);
    
    const selectedIds = new Set<string>();
    notes.forEach((note) => {
      // アクティブレイヤーのみ選択対象
      if (note.layerId !== activeLayerId) return;
      
      if (
        note.tick >= minTick &&
        note.tick <= maxTick &&
        note.pitch >= minPitch &&
        note.pitch <= maxPitch
      ) {
        selectedIds.add(note.id);
      }
    });
    
    set({ selectedNotes: selectedIds, selection });
  },
  
  setSelection: (selection) => {
    set({ selection });
  },
  
  deselectAll: () => {
    set({ selectedNotes: new Set(), selection: null });
  },
  
  deleteSelected: () => {
    const { notes, selectedNotes, layers, saveToHistory } = get();
    if (selectedNotes.size > 0) {
      // ロックされたレイヤーの音符は削除しない
      const lockedLayerIds = new Set(layers.filter(l => l.locked).map(l => l.id));
      const notesToDelete = [...selectedNotes].filter(id => {
        const note = notes.find(n => n.id === id);
        return note && !lockedLayerIds.has(note.layerId);
      });
      
      if (notesToDelete.length > 0) {
        saveToHistory();
        const deleteSet = new Set(notesToDelete);
        set({
          notes: notes.filter((n) => !deleteSet.has(n.id)),
          selectedNotes: new Set(),
          selection: null,
        });
      }
    }
  },
  
  copySelected: () => {
    const { notes, selectedNotes, activeLayerId } = get();
    if (selectedNotes.size === 0) return;
    
    // アクティブレイヤーの音符のみコピー
    const selectedNotesList = notes.filter(n => selectedNotes.has(n.id) && n.layerId === activeLayerId);
    if (selectedNotesList.length === 0) return;
    
    // 最小tick・pitchを基準にオフセットを計算
    const minTick = Math.min(...selectedNotesList.map(n => n.tick));
    const minPitch = Math.min(...selectedNotesList.map(n => n.pitch));
    
    // 相対位置でクリップボードに保存
    const clipboard = selectedNotesList.map(n => ({
      ...n,
      tick: n.tick - minTick,
      pitch: n.pitch - minPitch,
    }));
    
    set({ clipboard });
  },
  
  paste: (tick, pitch) => {
    const { clipboard, notes, activeLayerId, layers, saveToHistory } = get();
    if (clipboard.length === 0) return;
    
    // 全体レイヤーまたはロックされたレイヤーにはペースト不可
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (activeLayer?.isGlobal || activeLayer?.locked) return;
    
    saveToHistory();
    
    // 新しい位置に音符を配置
    const newNotes = clipboard.map(n => ({
      ...n,
      id: generateId(),
      tick: n.tick + tick,
      pitch: n.pitch + pitch,
      layerId: activeLayerId,
    }));
    
    set({
      notes: [...notes, ...newNotes],
      selectedNotes: new Set(newNotes.map(n => n.id)),
    });
  },
  
  cut: () => {
    const { copySelected, deleteSelected } = get();
    copySelected();
    deleteSelected();
  },
  
  // レイヤー操作
  addLayer: () => {
    const { layers, saveToHistory } = get();
    saveToHistory();
    
    // 全体レイヤーを除いた通常レイヤーの数
    const normalLayers = layers.filter(l => !l.isGlobal);
    
    const newLayer: Layer = {
      id: generateId(),
      name: `レイヤー ${normalLayers.length + 1}`,
      color: LAYER_COLORS[normalLayers.length % LAYER_COLORS.length],
      visible: true,
      locked: false,
      order: layers.length,
    };
    
    set({
      layers: [...layers, newLayer],
      activeLayerId: newLayer.id,
    });
  },
  
  removeLayer: (layerId) => {
    const { layers, notes, activeLayerId, saveToHistory } = get();
    
    // 全体レイヤーは削除不可
    const targetLayer = layers.find(l => l.id === layerId);
    if (targetLayer?.isGlobal) return;
    
    // 通常レイヤーは最低1つ残す
    const normalLayers = layers.filter(l => !l.isGlobal);
    if (normalLayers.length <= 1) return;
    
    saveToHistory();
    
    const newLayers = layers.filter(l => l.id !== layerId);
    const newNotes = notes.filter(n => n.layerId !== layerId);
    
    // アクティブレイヤーが削除された場合、別の通常レイヤーをアクティブに
    let newActiveLayerId = activeLayerId;
    if (layerId === activeLayerId) {
      const remainingNormalLayers = newLayers.filter(l => !l.isGlobal);
      newActiveLayerId = remainingNormalLayers[0]?.id || newLayers[0].id;
    }
    
    set({
      layers: newLayers,
      notes: newNotes,
      activeLayerId: newActiveLayerId,
    });
  },
  
  setActiveLayer: (layerId) => {
    set({ activeLayerId: layerId });
  },
  
  toggleLayerVisibility: (layerId) => {
    const { layers } = get();
    set({
      layers: layers.map(l =>
        l.id === layerId ? { ...l, visible: !l.visible } : l
      ),
    });
  },
  
  toggleLayerLock: (layerId) => {
    const { layers } = get();
    set({
      layers: layers.map(l =>
        l.id === layerId ? { ...l, locked: !l.locked } : l
      ),
    });
  },
  
  renameLayer: (layerId, name) => {
    const { layers } = get();
    set({
      layers: layers.map(l =>
        l.id === layerId ? { ...l, name } : l
      ),
    });
  },
  
  reorderLayers: (fromIndex, toIndex) => {
    const { layers } = get();
    const newLayers = [...layers];
    const [removed] = newLayers.splice(fromIndex, 1);
    newLayers.splice(toIndex, 0, removed);
    
    // order を更新
    const reorderedLayers = newLayers.map((l, i) => ({ ...l, order: i }));
    set({ layers: reorderedLayers });
  },
  
  setSelectedInstrument: (instrumentId) => {
    set((state) => ({
      settings: { ...state.settings, selectedInstrument: instrumentId },
    }));
  },
  
  setZoom: (zoom) => {
    set((state) => ({
      settings: { ...state.settings, zoom: Math.max(0.5, Math.min(3, zoom)) },
    }));
  },
  
  setGridSize: (size) => {
    set((state) => ({
      settings: { ...state.settings, gridSize: size },
    }));
  },
  
  setSnapToGrid: (snap) => {
    set((state) => ({
      settings: { ...state.settings, snapToGrid: snap },
    }));
  },
  
  setPlaying: (playing) => {
    set((state) => ({
      playback: {
        ...state.playback,
        isPlaying: playing,
        startTime: playing ? Date.now() : null,
      },
    }));
  },
  
  setCurrentTick: (tick) => {
    set((state) => ({
      playback: { ...state.playback, currentTick: tick },
    }));
  },
  
  setProjectName: (name) => {
    set({ projectName: name });
  },
  
  setBpm: (bpm) => {
    set({ bpm: Math.max(20, Math.min(300, bpm)) });
  },
  
  setTotalTicks: (ticks) => {
    set({ totalTicks: Math.max(20, ticks) });
  },
  
  saveToHistory: () => {
    const { notes, layers, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ notes: [...notes], layers: [...layers] });
    set({
      history: newHistory.slice(-50), // 最大50件
      historyIndex: Math.min(newHistory.length - 1, 49),
    });
  },
  
  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const state = history[newIndex];
      set({
        notes: [...state.notes],
        layers: [...state.layers],
        historyIndex: newIndex,
        selectedNotes: new Set(),
        selection: null,
      });
    }
  },
  
  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const state = history[newIndex];
      set({
        notes: [...state.notes],
        layers: [...state.layers],
        historyIndex: newIndex,
        selectedNotes: new Set(),
        selection: null,
      });
    }
  },
  
  // チェックポイント
  setCheckpoint: (tick) => {
    set({ checkpoint: tick });
  },
  
  toggleCheckpoint: (tick) => {
    const { checkpoint } = get();
    if (checkpoint === tick) {
      // 同じ位置ならクリア
      set({ checkpoint: null });
    } else {
      // 新しい位置に設定（既存のチェックポイントは上書き）
      set({ checkpoint: tick });
    }
  },
  
  // プロジェクトをリセット（新規作成）
  resetProject: () => {
    const newGlobalLayer = createGlobalLayer();
    const newDefaultLayer = createDefaultLayer();
    
    set({
      notes: [],
      layers: [newGlobalLayer, newDefaultLayer],
      activeLayerId: newDefaultLayer.id,
      projectName: '新規プロジェクト',
      bpm: DEFAULT_BPM,
      totalTicks: 200,
      selectedNotes: new Set(),
      selection: null,
      clipboard: [],
      history: [{ notes: [], layers: [newGlobalLayer, newDefaultLayer] }],
      historyIndex: 0,
      checkpoint: null,
      playback: {
        isPlaying: false,
        currentTick: 0,
        startTime: null,
      },
    });
    
    // ローカルストレージもクリア
    localStorage.removeItem(AUTOSAVE_KEY);
  },
}));

// 自動保存：5秒ごとに変更をローカルストレージに保存
let autosaveTimeout: ReturnType<typeof setTimeout> | null = null;

useScoreStore.subscribe((state) => {
  // デバウンス：連続した変更は5秒後にまとめて保存
  if (autosaveTimeout) {
    clearTimeout(autosaveTimeout);
  }
  
  autosaveTimeout = setTimeout(() => {
    saveToLocalStorage({
      notes: state.notes,
      layers: state.layers,
      projectName: state.projectName,
      bpm: state.bpm,
      totalTicks: state.totalTicks,
      activeLayerId: state.activeLayerId,
      checkpoint: state.checkpoint,
    });
  }, AUTOSAVE_INTERVAL);
});

// ページ離脱時に即座に保存
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    const state = useScoreStore.getState();
    saveToLocalStorage({
      notes: state.notes,
      layers: state.layers,
      projectName: state.projectName,
      bpm: state.bpm,
      totalTicks: state.totalTicks,
      activeLayerId: state.activeLayerId,
      checkpoint: state.checkpoint,
    });
  });
}