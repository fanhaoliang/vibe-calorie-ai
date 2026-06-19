import type { ToastItem } from '../hooks/useToast';

interface ToastHostProps {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

export default function ToastHost({ toasts, onDismiss }: ToastHostProps) {
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex flex-col items-center gap-2 px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="record-modal pointer-events-auto flex w-full max-w-md items-center justify-between gap-3 rounded-2xl border border-[#3c4d40] bg-[#344338] px-4 py-3 text-sm text-white shadow-[0_18px_44px_rgba(52,67,56,0.32)]"
        >
          <span className="flex-1 leading-5">{toast.message}</span>
          {toast.undo && (
            <button
              type="button"
              className="rounded-full bg-white/14 px-3 py-1 text-xs font-medium text-white transition hover:bg-white/22 active:translate-y-px"
              onClick={async () => {
                await toast.undo?.();
                onDismiss(toast.id);
              }}
            >
              撤销
            </button>
          )}
          <button
            type="button"
            className="rounded-full p-1 text-white/60 transition hover:bg-white/12 hover:text-white"
            onClick={() => onDismiss(toast.id)}
            aria-label="关闭"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
