// Simple event-emitter based toast bus. Toasts are short messages that float
// at the bottom of the screen for a few seconds.

const listeners = new Set();
let nextId = 1;

export function showToast(message, opts = {}) {
  const id = nextId++;
  const toast = {
    id,
    message,
    variant: opts.variant || 'default',
    duration: opts.duration ?? 2400
  };
  for (const l of listeners) l({ type: 'add', toast });
  if (toast.duration > 0) {
    setTimeout(() => {
      for (const l of listeners) l({ type: 'remove', id });
    }, toast.duration);
  }
  return id;
}

export function subscribeToasts(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
