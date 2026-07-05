import { useEffect } from 'react';

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

/**
 * Generic modal.
 * <Modal isOpen title="…" onClose={…} size="md">…content…</Modal>
 */
function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`relative bg-portal-card border border-gold rounded-xl w-full
                    ${SIZES[size] ?? SIZES.md}
                    max-h-[90vh] flex flex-col shadow-2xl`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-subtle flex-shrink-0">
          <h3 className="text-base font-semibold text-portal-text">{title}</h3>
          <button
            onClick={onClose}
            className="text-portal-muted hover:text-portal-text transition-colors p-1 -mr-1"
          >
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;
