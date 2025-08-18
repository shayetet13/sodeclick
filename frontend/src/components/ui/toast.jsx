import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, message, duration = 5000) => {
    const id = Date.now() + Math.random();
    const newToast = { id, type, message, duration };
    
    setToasts(prev => [...prev, newToast]);

    // Auto remove toast
    setTimeout(() => {
      removeToast(id);
    }, duration);

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const success = useCallback((message, duration) => {
    return addToast('success', message, duration);
  }, [addToast]);

  const error = useCallback((message, duration) => {
    return addToast('error', message, duration);
  }, [addToast]);

  const warning = useCallback((message, duration) => {
    return addToast('warning', message, duration);
  }, [addToast]);

  const info = useCallback((message, duration) => {
    return addToast('info', message, duration);
  }, [addToast]);

  const ToastContainer = () => (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );

  return (
    <ToastContext.Provider value={{ success, error, warning, info, ToastContainer }}>
      {children}
    </ToastContext.Provider>
  );
};

const Toast = ({ toast, onRemove }) => {
  const { type, message, id } = toast;

  const getToastStyles = () => {
    const baseStyles = "flex items-center p-4 rounded-lg shadow-lg border-l-4 transform transition-all duration-300 ease-in-out animate-slide-in";
    
    switch (type) {
      case 'success':
        return `${baseStyles} bg-gradient-to-r from-green-50 to-green-100 border-green-500 text-green-800`;
      case 'error':
        return `${baseStyles} bg-gradient-to-r from-red-50 to-red-100 border-red-500 text-red-800`;
      case 'warning':
        return `${baseStyles} bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-500 text-yellow-800`;
      case 'info':
        return `${baseStyles} bg-gradient-to-r from-blue-50 to-blue-100 border-blue-500 text-blue-800`;
      default:
        return `${baseStyles} bg-gradient-to-r from-gray-50 to-gray-100 border-gray-500 text-gray-800`;
    }
  };

  const getIcon = () => {
    const iconClass = "w-5 h-5 mr-3 flex-shrink-0";
    
    switch (type) {
      case 'success':
        return <CheckCircle className={`${iconClass} text-green-600`} />;
      case 'error':
        return <AlertCircle className={`${iconClass} text-red-600`} />;
      case 'warning':
        return <AlertTriangle className={`${iconClass} text-yellow-600`} />;
      case 'info':
        return <Info className={`${iconClass} text-blue-600`} />;
      default:
        return <Info className={`${iconClass} text-gray-600`} />;
    }
  };

  return (
    <div className={getToastStyles()}>
      {getIcon()}
      <div className="flex-1 text-sm font-medium">
        {message}
      </div>
      <button
        onClick={() => onRemove(id)}
        className="ml-3 p-1 rounded-full hover:bg-black/10 transition-colors duration-200"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// Add custom CSS for animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slide-in {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  .animate-slide-in {
    animation: slide-in 0.3s ease-out;
  }
`;
document.head.appendChild(style);
