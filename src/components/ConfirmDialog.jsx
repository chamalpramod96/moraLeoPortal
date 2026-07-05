/**
 * Confirm dialog — shown before any destructive action.
 * Higher z-index than Modal (z-60).
 */
function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title       = 'Are you sure?',
  message,
  confirmText = 'Confirm',
  isDanger    = false,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onCancel} />

      <div
        className="relative bg-portal-card border border-gold rounded-xl p-6
                   max-w-sm w-full shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Icon */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4
                         ${isDanger ? 'bg-red-900/40' : 'bg-portal-gold/10'}`}>
          <i className={`fa-solid ${isDanger ? 'fa-trash text-red-400' : 'fa-question text-portal-gold'} text-xl`} />
        </div>

        <h3 className="text-base font-semibold text-portal-text text-center mb-2">{title}</h3>

        {message && (
          <p className="text-portal-muted text-sm text-center mb-6 leading-relaxed">{message}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-gold text-portal-muted hover:text-portal-text
                       py-2 rounded-lg text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors text-white
                        ${isDanger
                          ? 'bg-red-700 hover:bg-red-800'
                          : 'bg-portal-red hover:bg-portal-red-dark'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
