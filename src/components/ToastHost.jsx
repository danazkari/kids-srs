import { useEffect, useState } from 'preact/hooks';
import { subscribeToasts } from './toast.js';

export function ToastHost() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    return subscribeToasts((evt) => {
      if (evt.type === 'add') {
        setToasts((prev) => [...prev, evt.toast]);
      } else if (evt.type === 'remove') {
        setToasts((prev) => prev.filter((t) => t.id !== evt.id));
      }
    });
  }, []);
  if (!toasts.length) return null;
  return (
    <div class="toast-host" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} class={`toast toast--${t.variant}`}>{t.message}</div>
      ))}
    </div>
  );
}
