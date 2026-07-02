import React from 'react';
import { cn } from '../../lib/utils.js';

export interface SectionHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  description,
  actions,
  className,
}) => {
  return (
    <div className={cn("flex flex-col gap-2 md:flex-row md:items-center md:justify-between py-4 border-b border-border/50 mb-4", className)}>
      <div className="flex flex-col gap-0.5">
        <h2 className="text-lg md:text-xl font-bold tracking-tight text-foreground">{title}</h2>
        {description && <p className="text-xs md:text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
};
export default SectionHeader;
