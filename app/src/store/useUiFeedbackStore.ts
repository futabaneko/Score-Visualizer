import { create } from 'zustand';

export type FeedbackTone = 'info' | 'success' | 'warning' | 'danger';

interface NoticeOptions {
  title: string;
  message?: string;
  tone?: FeedbackTone;
  duration?: number;
}

interface ConfirmationOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'warning' | 'danger';
}

interface Notice extends NoticeOptions {
  id: number;
  tone: FeedbackTone;
}

interface Confirmation extends ConfirmationOptions {
  resolve: (confirmed: boolean) => void;
}

interface UiFeedbackState {
  notices: Notice[];
  confirmation: Confirmation | null;
  addNotice: (notice: Notice) => void;
  removeNotice: (id: number) => void;
  requestConfirmation: (options: ConfirmationOptions) => Promise<boolean>;
  resolveConfirmation: (confirmed: boolean) => void;
}

let noticeSequence = 0;

export const useUiFeedbackStore = create<UiFeedbackState>((set, get) => ({
  notices: [],
  confirmation: null,

  addNotice: (notice) => {
    set((state) => ({ notices: [...state.notices, notice].slice(-4) }));
  },

  removeNotice: (id) => {
    set((state) => ({ notices: state.notices.filter((notice) => notice.id !== id) }));
  },

  requestConfirmation: (options) => {
    get().confirmation?.resolve(false);
    return new Promise<boolean>((resolve) => {
      set({ confirmation: { ...options, resolve } });
    });
  },

  resolveConfirmation: (confirmed) => {
    const current = get().confirmation;
    if (!current) return;
    set({ confirmation: null });
    current.resolve(confirmed);
  },
}));

export function notify(options: NoticeOptions): void {
  const id = ++noticeSequence;
  const duration = options.duration ?? 4_500;
  useUiFeedbackStore.getState().addNotice({
    ...options,
    id,
    tone: options.tone ?? 'info',
  });
  window.setTimeout(() => useUiFeedbackStore.getState().removeNotice(id), duration);
}

export function confirmAction(options: ConfirmationOptions): Promise<boolean> {
  return useUiFeedbackStore.getState().requestConfirmation(options);
}
