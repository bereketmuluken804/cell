export function toISO(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function parseUTC(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function isoToDayIndex(iso: string): number {
  return Math.floor(parseUTC(iso) / 86400000);
}

export function prevMonth(iso: string, count = 1): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return toISO(new Date(Date.UTC(
    dt.getUTCFullYear(), dt.getUTCMonth() - count, dt.getUTCDate()
  )));
}

export function monthKeyOf(iso: string): string {
  return iso.slice(0, 7);
}

export function monthLabelOf(iso: string): string {
  const [y, m] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-US', { month: 'short' });
}

export function currentMonthKey(): string {
  return monthKeyOf(toISO(new Date()));
}

export type WeekColumn = {
  key: string; // ISO of the first non-null day
  label: string | null; // e.g. "Sep" if this column is the first of a month
  month: string; // YYYY-MM of this column's first non-null day
  days: (string | null)[]; // length 7, ISO dates (null = outside requested range)
};

export function buildGridWeeks(
  startISO: string,
  endISO: string,
  todayISO: string,
): WeekColumn[] {
  const start = new Date(startISO + 'T00:00:00');
  const end = new Date(endISO + 'T00:00:00');

  // Back up to Sunday
  const day = new Date(start);
  while (day.getDay() !== 0) day.setDate(day.getDate() - 1);

  const weeks: WeekColumn[] = [];
  const firstOfMonth = (date: Date) => date.getDate() === 1;

  while (day <= end) {
    const days: (string | null)[] = [];
    let label: string | null = null;
    for (let i = 0; i < 7; i++) {
      if (day >= start && day <= end) {
        const iso = toISO(day);
        days.push(iso);
        if (firstOfMonth(day)) label = monthKeyOf(iso);
      } else {
        days.push(null);
      }
      day.setDate(day.getDate() + 1);
    }
    if (days.every(d => d === null)) break;
    const firstNonNull = days.find(d => d !== null) ?? todayISO;
    weeks.push({
      key: firstNonNull,
      label,
      month: monthKeyOf(firstNonNull),
      days,
    });
  }
  return weeks;
}