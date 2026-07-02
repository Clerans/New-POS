import React from 'react';
import { cn } from '../../lib/utils.js';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <input
            ref={ref}
            type="checkbox"
            id={id}
            className={cn(
              "h-4 w-4 rounded border-input text-primary bg-background focus:ring-primary focus:ring-offset-background focus:outline-none transition-all cursor-pointer accent-primary",
              error && "border-destructive",
              className
            )}
            {...props}
          />
          {label && (
            <label htmlFor={id} className="text-sm font-medium text-foreground cursor-pointer select-none">
              {label}
            </label>
          )}
        </div>
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
