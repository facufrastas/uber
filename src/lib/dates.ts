import { eachDayOfInterval, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek, subDays } from 'date-fns';

export type Preset = 'day' | 'week' | 'month' | 'custom';

export interface DateRange {
  from: string; // 'YYYY-MM-DD' inclusive
  to: string; // inclusive
}

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

// Range each preset maps to, relative to today.
// Argentinian week: Monday to Sunday (weekStartsOn: 1).
export function rangeForPreset(preset: Exclude<Preset, 'custom'>, today = new Date()): DateRange {
  switch (preset) {
    case 'day':
      return { from: iso(today), to: iso(today) };
    case 'week':
      return {
        from: iso(startOfWeek(today, { weekStartsOn: 1 })),
        to: iso(endOfWeek(today, { weekStartsOn: 1 })),
      };
    case 'month':
      return { from: iso(startOfMonth(today)), to: iso(endOfMonth(today)) };
  }
}

// Previous range of equal length, for the KPI deltas
// (e.g. "vs. previous month").
export function previousRange({ from, to }: DateRange): DateRange {
  const fromDate = new Date(`${from}T00:00:00`);
  const toDate = new Date(`${to}T00:00:00`);
  const days = Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000) + 1;

  return { from: iso(subDays(fromDate, days)), to: iso(subDays(toDate, days)) };
}

// Every day in the range, for gap-free chart series.
export function daysInRange({ from, to }: DateRange): string[] {
  return eachDayOfInterval({
    start: new Date(`${from}T00:00:00`),
    end: new Date(`${to}T00:00:00`),
  }).map(iso);
}
