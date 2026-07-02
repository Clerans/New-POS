import React from 'react';
import { FileQuestion } from 'lucide-react';
import { cn } from '../../lib/utils.js';

export interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Data Found',
  message = 'There is currently no data available to show.',
  icon = <FileQuestion className="h-12 w-12 text-muted-foreground" />,
  action,
  className,
}) => {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 border border-dashed border-border rounded-xl text-center max-w-md mx-auto my-6 bg-card/30", className)}>
      <div className="mb-4 p-3 rounded-full bg-muted/50 flex items-center justify-center">{icon}</div>
      <h3 className="text-lg font-semibold mb-1 text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">{message}</p>
      {action && <div className="w-full flex justify-center">{action}</div>}
    </div>
  );
};
export default EmptyState;
