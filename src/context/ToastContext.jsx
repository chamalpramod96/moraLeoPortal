import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

const ICONS = {
  success: 'fa-circle-check',
  error:   'fa-circle-exclamation',
  info:    'fa-circle-info',
  warning: 'fa-triangle-exclamation',
};

const COLORS = {
  success: 'border-green-500 bg-green-900/40 text-green-300',
  error:   'border-red-500   bg-red-900/40   text-red-300',
  info:    'border-blue-500  bg-blue-900/40  text-blue-300',
  warning: 'border-yellow-500 bg-yellow-900/40 text-yellow-300',
};

function ToastItem({ toast, onRemove }) {
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-lg border shadow-2xl max-w-sm w-full
                  ${COLORS[toast.type] ?? COLORS.info} animate-in slide-in-from-right-8`}
    >
      <i className={`fa-solid ${ICONS[toast.type] ?? ICONS.info} mt-0.5 flex-shrink-0`} />
      <span className="text-sm flex-1 leading-snug">{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        className="opacity-60 hover:opacity-100 transition-opacity ml-1"
      >
        <i className="fa-solid fa-xmark text-xs" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-[70] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
