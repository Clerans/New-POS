import React from 'react';
import { Dialog } from './Dialog.js';
import { Button } from './Button.js';
import { AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils.js';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}) => {
  const iconColors = {
    danger: 'text-destructive bg-destructive/10',
    warning: 'text-warning bg-warning/10',
    primary: 'text-primary bg-primary/10',
  };

  const buttonVariants = {
    danger: 'danger' as const,
    warning: 'warning' as const,
    primary: 'primary' as const,
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="sm">
      <div className="flex flex-col items-center text-center p-2">
        <div className={cn("p-3 rounded-full mb-4", iconColors[variant])}>
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6">{message}</p>
        <div className="flex gap-3 w-full">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button variant={buttonVariants[variant]} className="flex-1" onClick={onConfirm} isLoading={isLoading}>
            {confirmText}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
export default ConfirmationDialog;
