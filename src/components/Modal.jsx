import { useEffect } from 'preact/hooks';

export function Modal({ open, onClose, title, children, dismissOnBackdrop = true }) {
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === 'Escape') onClose && onClose();
    }
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  function onBackdropClick(e) {
    if (dismissOnBackdrop && e.target === e.currentTarget) onClose && onClose();
  }
  return (
    <div class="modal-backdrop" onClick={onBackdropClick}>
      <div class="modal" role="dialog" aria-modal="true" aria-label={title || 'dialog'}>
        {title && (
          <div class="modal__header">
            <h2>{title}</h2>
            <button class="modal__close" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
