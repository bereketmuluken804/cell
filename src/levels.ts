export const DEFAULT_GOAL_HOURS = 8;
export const MIN_GOAL_HOURS = 0.5;
export const MAX_GOAL_HOURS = 20;

export function levelForHours(hours: number, goal: number = DEFAULT_GOAL_HOURS): number {
  if (hours <= 0) return 0;
  const g = Math.max(goal, MIN_GOAL_HOURS);
  const step = g / 7;
  return Math.min(6, Math.max(1, Math.ceil(hours / step)));
}

// Build a contiguous list of day cells from startISO (month start, inclusive)
// to endISO (inclusive), each with its owning month. Scrollable grid base data.
export type DayCell = {
  date: string; // YYYY-MM-DD
  month: string; // YYYY-MM
};

export function buildDayRange(startISO: string, endISO: string): DayCell[] {
  const cells: DayCell[] = [];
  const start = new Date(startISO + 'T00:00:00');
  const end = new Date(endISO + 'T00:00:00');
  const cur = new Date(start);
  while (cur <= end) {
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    const date = `${cur.getFullYear()}-${m}-${d}`;
    cells.push({ date, month: date.slice(0, 7) });
    cur.setDate(cur.getDate() + 1);
  }
  return cells;
}

export function formatDateShort(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}