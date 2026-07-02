export interface ParsedDateRange {
  start: Date;
  end: Date;
}

export function getDateRangeFromFilter(
  filter: string | undefined,
  customStart?: string,
  customEnd?: string
): ParsedDateRange {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  if (!filter) {
    // Default to last 30 days
    const dStart = new Date(start);
    dStart.setDate(dStart.getDate() - 29);
    return { start: dStart, end };
  }

  switch (filter) {
    case 'today':
      return { start, end };
    case 'yesterday': {
      const yStart = new Date(start);
      yStart.setDate(yStart.getDate() - 1);
      const yEnd = new Date(end);
      yEnd.setDate(yEnd.getDate() - 1);
      return { start: yStart, end: yEnd };
    }
    case 'last7': {
      const l7Start = new Date(start);
      l7Start.setDate(l7Start.getDate() - 6);
      return { start: l7Start, end };
    }
    case 'last30': {
      const l30Start = new Date(start);
      l30Start.setDate(l30Start.getDate() - 29);
      return { start: l30Start, end };
    }
    case 'thisMonth': {
      const tmStart = new Date(start.getFullYear(), start.getMonth(), 1);
      return { start: tmStart, end };
    }
    case 'lastMonth': {
      const lmStart = new Date(start.getFullYear(), start.getMonth() - 1, 1);
      const lmEnd = new Date(start.getFullYear(), start.getMonth(), 0, 23, 59, 59, 999);
      return { start: lmStart, end: lmEnd };
    }
    case 'thisYear': {
      const tyStart = new Date(start.getFullYear(), 0, 1);
      return { start: tyStart, end };
    }
    case 'custom':
      if (customStart && customEnd) {
        return { start: new Date(customStart), end: new Date(customEnd) };
      }
      const defaultStart = new Date(start);
      defaultStart.setDate(defaultStart.getDate() - 29);
      return { start: defaultStart, end };
    default: {
      const dStart = new Date(start);
      dStart.setDate(dStart.getDate() - 29);
      return { start: dStart, end };
    }
  }
}
export default getDateRangeFromFilter;
