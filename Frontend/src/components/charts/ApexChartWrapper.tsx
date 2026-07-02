import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils.js';

interface ChartProps {
  type: 'line' | 'bar' | 'area' | 'donut';
  height?: number;
  series: any[];
  categories: string[];
  title?: string;
  className?: string;
}

export const ApexChartWrapper: React.FC<ChartProps> = ({
  type,
  height = 300,
  series,
  categories,
  title,
  className,
}) => {
  const [Chart, setChart] = useState<any>(null);

  useEffect(() => {
    // Dynamic import to avoid SSR or bundle-time DOM issues
    import('react-apexcharts').then((module) => {
      setChart(() => module.default);
    });
  }, []);

  if (!Chart) {
    return (
      <div className={cn("h-[300px] flex items-center justify-center bg-muted/40 animate-pulse rounded-lg border border-border", className)}>
        <span className="text-xs text-muted-foreground font-medium">Loading Chart Engine...</span>
      </div>
    );
  }

  const options = {
    chart: {
      fontFamily: 'Inter, sans-serif',
      toolbar: { show: false },
      background: 'transparent',
    },
    theme: {
      mode: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
    },
    colors: ['#B09B8C', '#5C3D2E', '#10B981'],
    stroke: {
      curve: 'smooth',
      width: 3,
    },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    grid: {
      borderColor: 'rgba(120, 120, 120, 0.15)',
    },
    dataLabels: {
      enabled: false,
    },
  };

  return (
    <div className={cn("w-full border border-border rounded-xl p-4 bg-card", className)}>
      {title && <h3 className="text-base font-semibold mb-4 leading-none">{title}</h3>}
      <Chart options={options} series={series} type={type} height={height} />
    </div>
  );
};
export default ApexChartWrapper;
