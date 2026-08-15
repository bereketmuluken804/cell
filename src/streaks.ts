export type StreakStatus = 'active' | 'at-risk' | 'broken';

export type StreakInfo = {
  current: number;
  status: StreakStatus;
  longest: number;
  longestStart: string | null;
  longestEnd: string | null;
};

function toIndex(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

function toISOFromIndex(idx: number): string {
  return new Date(idx * 86400000).toISOString().slice(0, 10);
}

export function computeStreaks(
  days: Record<string, number>,
  todayISO: string,
): StreakInfo {
  const activeDates = Object.keys(days)
    .filter(k => days[k] > 0)
    .sort();
  const activeSet = new Set(activeDates);

  const todayIdx = toIndex(todayISO);

  // Current streak: anchor at today if logged, else yesterday ("at risk").
  let anchorIdx: number | null = null;
  let status: StreakStatus = 'broken';
  if (activeSet.has(todayISO)) {
    anchorIdx = todayIdx;
    status = 'active';
  } else if (activeSet.has(toISOFromIndex(todayIdx - 1))) {
    anchorIdx = todayIdx - 1;
    status = 'at-risk';
  }

  let current = 0;
  if (anchorIdx !== null) {
    let cursor = toISOFromIndex(anchorIdx);
    while (activeSet.has(cursor)) {
      current++;
      anchorIdx!--;
      cursor = toISOFromIndex(anchorIdx);
    }
  }

  // Longest streak (runs of consecutive active days).
  let longest = 0;
  let longestStart: string | null = null;
  let longestEnd: string | null = null;
  let run = 0;
  let runStart = '';
  let prevIdx: number | null = null;
  for (const date of activeDates) {
    const idx = toIndex(date);
    if (prevIdx !== null && idx === prevIdx + 1) {
      run++;
    } else {
      run = 1;
      runStart = date;
    }
    if (run > longest) {
      longest = run;
      longestStart = runStart;
      longestEnd = date;
    }
    prevIdx = idx;
  }

  return { current, status, longest, longestStart, longestEnd };
}