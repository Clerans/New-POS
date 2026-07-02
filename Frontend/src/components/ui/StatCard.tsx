import React from 'react';
import { Card, CardContent } from './Card.js';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '../../lib/utils.js';

export interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    type: 'up' | 'down';
  };
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  description,
  icon,
  trend,
  className,
}) => {
  return (
    <Card className={cn("overflow-hidden border border-border/60 bg-card", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {icon && <div className="p-2 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">{icon}</div>}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <h4 className="text-2xl font-bold tracking-tight text-foreground">{value}</h4>
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-xs font-semibold rounded px-1.5 py-0.5",
                trend.type === 'up' ? "text-success bg-success/10" : "text-destructive bg-destructive/10"
              )}
            >
              {trend.type === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {trend.value}%
            </span>
          )}
        </div>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
};
export default StatCard;
