import React from 'react';
import { Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils.js';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
}

export const Alert: React.FC<AlertProps> = ({ className, variant = 'info', title, children, ...props }) => {
  const icons = {
    info: <Info className="h-5 w-5" />,
    success: <CheckCircle className="h-5 w-5" />,
    warning: <AlertTriangle className="h-5 w-5" />,
    danger: <AlertCircle className="h-5 w-5" />,
  };

  const variants = {
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-500',
    success: 'bg-success/10 border-success/30 text-success',
    warning: 'bg-warning/10 border-warning/30 text-warning',
    danger: 'bg-destructive/10 border-destructive/30 text-destructive',
  };

  return (
    <div
      role="alert"
      className={cn(
        "flex w-full gap-3 p-4 rounded-lg border",
        variants[variant],
        className
      )}
      {...props}
    >
      <span className="shrink-0 mt-0.5">{icons[variant]}</span>
      <div className="flex-1 flex flex-col gap-1">
        {title && <span className="font-semibold text-sm leading-none text-foreground">{title}</span>}
        <div className="text-sm text-muted-foreground">{children}</div>
      </div>
    </div>
  );
};
export default Alert;
