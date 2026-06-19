import { useCallback, useRef, useState } from 'react';

export interface ToastItem {
  id: number;
  message: string;
  undo?: () => void | Promise<void>;
  duration: number;
}

/**
 * 简易 toast：用于"删除已生效，但 N 秒内可撤销"的提示。
 *
 * show(...) 返回的 id 可以提前 dismiss 掉（例如撤销按钮点击后立刻收起）。
 * undo 仅在用户主动点击撤销时调用，不会随超时自动触发。
 */
export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const timersRef = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const show = useCallback((message: string, options: { undo?: () => void | Promise<void>; duration?: number } = {}) => {
    const id = ++idRef.current;
    const duration = options.duration ?? 5000;
    setToasts((list) => [...list, { id, message, undo: options.undo, duration }]);
    const timer = window.setTimeout(() => dismiss(id), duration);
    timersRef.current.set(id, timer);
    return id;
  }, [dismiss]);

  return { toasts, show, dismiss };
}
