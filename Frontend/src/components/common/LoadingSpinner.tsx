import React from 'react';
import { cn } from '../../lib/utils.js';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', className }) => {
  const sizes = {
    sm: 'h-6 w-6 border-2',
    md: 'h-10 w-10 border-4',
    lg: 'h-16 w-16 border-4',
  };

  return (
    <div className="flex items-center justify-center p-4">
      <div
        className={cn(
          "animate-spin rounded-full border-t-primary border-r-transparent border-b-transparent border-l-transparent border-solid",
          sizes[size],
          className
        )}
      />
    </div>
  );
};
export default LoadingSpinner;
