// 楽器の定義
export interface Instrument {
  id: string;
  symbol: string;
  name: string;
  nameJa: string;
  color: string;
  minecraftSound: string;
  octaveOffset: number; // オクターブオフセット（-2〜+2）
}

// 音符の定義
export interface Note {
  id: string;
  tick: number;
  pitch: number; // 0-24 (A-Y)
  instrument: string; // 楽器ID
  layerId: string; // レイヤーID
}

// レイヤーの定義（isGlobal追加）
export interface Layer {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  locked: boolean;
  order: number;
  isGlobal?: boolean; // 全体レイヤーフラグ
}

// 選択範囲の定義
export interface Selection {
  startTick: number;
  endTick: number;
  startPitch: number;
  endPitch: number;
}

// プロジェクトの定義
export interface Project {
  id: string;
  name: string;
  notes: Note[];
  layers: Layer[];
  bpm: number;
  createdAt: Date;
  updatedAt: Date;
}

// 再生状態
export interface PlaybackState {
  isPlaying: boolean;
  currentTick: number;
  startTime: number | null;
}

// エディタ設定
export interface EditorSettings {
  gridSize: number; // グリッドのサイズ（tick単位）
  zoom: number; // ズームレベル
  selectedInstrument: string;
  snapToGrid: boolean;
}

