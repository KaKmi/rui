import { create } from 'zustand';

export type ToastTone = 'default' | 'ok' | 'warn' | 'bad' | 'info';

export type Toast = {
  id: string;
  text: string;
  tone: ToastTone;
  /** 自动关闭时长 ms；0 表示常驻 */
  ttl: number;
};

export type ToastInput = Omit<Toast, 'id' | 'tone' | 'ttl'> & {
  tone?: ToastTone;
  ttl?: number;
};

type State = {
  items: Toast[];
  push: (t: ToastInput) => string;
  dismiss: (id: string) => void;
  clear: () => void;
};

/** spec §6.6.6：bottom-right · 4s · 堆叠 3 */
const STACK_LIMIT = 3;
const DEFAULT_TTL = 4000;

export const useToast = create<State>((set, get) => ({
  items: [],
  push: (t) => {
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const next: Toast = { id, text: t.text, tone: t.tone ?? 'default', ttl: t.ttl ?? DEFAULT_TTL };
    set((s) => {
      const items = [...s.items, next].slice(-STACK_LIMIT);
      return { items };
    });
    if (next.ttl > 0 && typeof window !== 'undefined') {
      window.setTimeout(() => get().dismiss(id), next.ttl);
    }
    return id;
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
  clear: () => set({ items: [] }),
}));
