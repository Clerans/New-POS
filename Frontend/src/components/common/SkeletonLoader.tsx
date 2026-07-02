import React from 'react';
import { cn } from '../../lib/utils.js';

export interface SkeletonLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'line' | 'circle' | 'card';
  count?: number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ className, variant = 'line', count = 1, ...props }) => {
  const baseClass = "animate-pulse bg-muted rounded";

  const renderSkeleton = () => {
    if (variant === 'circle') {
      return <div className={cn(baseClass, "h-12 w-12 rounded-full", className)} {...props} />;
    }
    if (variant === 'card') {
      return (
        <div className={cn("border border-border p-4 rounded-xl flex flex-col gap-3", className)} {...props}>
          <div className={cn(baseClass, "h-32 w-full rounded-lg")} />
          <div className={cn(baseClass, "h-4 w-3/4")} />
          <div className={cn(baseClass, "h-3 w-1/2")} />
        </div>
      );
    }
    return <div className={cn(baseClass, "h-4 w-full", className)} {...props} />;
  };

  return (
    <div className="w-full flex flex-col gap-2.5">
      {Array.from({ length: count }).map((_, idx) => (
        <React.Fragment key={idx}>{renderSkeleton()}</React.Fragment>
      ))}
    </div>
  );
};
export default SkeletonLoader;
