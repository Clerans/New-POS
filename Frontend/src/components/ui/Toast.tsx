import React, { useEffect } from 'react';
import { useNotificationStore, type ToastAlert } from '../../store/notificationStore.js';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils.js';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useNotificationStore();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  );
};

interface ToastItemProps {
  toast: ToastAlert;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const { id, message, type, title, duration = 4000 } = toast;

  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(id);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onRemove]);

  const icons = {
    info: <Info className="h-5 w-5 text-blue-500" />,
    success: <CheckCircle className="h-5 w-5 text-success" />,
    warning: <AlertTriangle className="h-5 w-5 text-warning" />,
    error: <AlertCircle className="h-5 w-5 text-destructive" />,
  };

  const borders = {
    info: 'border-l-blue-500',
    success: 'border-l-success',
    warning: 'border-l-warning',
    error: 'border-l-destructive',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-lg border-l-4 pointer-events-auto",
        borders[type]
      )}
    >
      <span className="shrink-0 mt-0.5">{icons[type]}</span>
      <div className="flex-1 flex flex-col gap-1">
        {title && <span className="font-semibold text-sm leading-none">{title}</span>}
        <span className="text-sm text-muted-foreground">{message}</span>
      </div>
      <button
        onClick={() => onRemove(id)}
        className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
};
export default ToastContainer;
