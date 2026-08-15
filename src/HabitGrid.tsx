import React, { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { buildGridWeeks, toISO } from './dates';
import { DEFAULT_GOAL_HOURS, levelForHours } from './levels';
import { useTheme } from './ThemeContext';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function Cell({ date, days, size, margin, today, goal, onPress }: {
  date: string | null;
  days: Record<string, number>;
  size: number;
  margin: number;
  today: string;
  goal: number;
  onPress?: (date: string) => void;
}) {
  const { theme } = useTheme();
  if (!date) return <View style={{ width: size, height: size, margin }} />;
  const level = levelForHours(days[date] ?? 0, goal);
  const isToday = date === today;
  return (
    <View
      onTouchEnd={onPress ? () => onPress(date) : undefined}
      style={{
        width: size,
        height: size,
        margin,
        borderRadius: 4,
        backgroundColor: theme.levels[level],
        borderWidth: isToday ? 2 : 0.5,
        borderColor: isToday ? theme.accent : theme.border,
      }}
    />
  );
}

// Grid builder — weekdays on X-axis, weeks on Y-axis
function Grid({ weeks, days, cellSize, gap, today, goal, onPressDay }: {
  weeks: ReturnType<typeof buildGridWeeks>;
  days: Record<string, number>;
  cellSize: number;
  gap: number;
  today: string;
  goal: number;
  onPressDay?: (date: string) => void;
}) {
  const { theme } = useTheme();
  const labelWidth = 17;
  return (
    <View>
      {/* Weekday labels across the top (X-axis) */}
      <View style={{ flexDirection: 'row', marginBottom: gap }}>
        <View style={{ width: labelWidth }} />
        {WEEKDAY_LABELS.map((l, i) => (
          <View key={i} style={{ width: cellSize, margin: gap, alignItems: 'center' }}>
            <Text style={{ fontSize: cellSize * 0.5, color: theme.text }}>{l}</Text>
          </View>
        ))}
      </View>
      {/* Weeks going down (Y-axis) */}
      {weeks.map((w, wi) => {
        const firstDay = w.days.find(d => d !== null);
        const startDate = firstDay ? Number(firstDay.split('-')[2]) : null;
        return (
          <View key={wi} style={{ flexDirection: 'row' }}>
            <View style={{ width: labelWidth, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 2 }}>
              <Text
                numberOfLines={1}
                style={{ fontSize: Math.min(cellSize * 0.4, 11), color: theme.textMuted }}
              >
                {startDate ?? ''}
              </Text>
            </View>
            {Array.from({ length: 7 }, (_, ri) => (
              <Cell
                key={ri}
                date={w.days[ri]}
                days={days}
                size={cellSize}
                margin={gap}
                today={today}
                goal={goal}
                onPress={onPressDay}
              />
            ))}
          </View>
        );
      })}
    </View>
  );
}

// Single-month grid for cards
export function MonthGrid({ days, cellSize = 14, gap = 3, goal = DEFAULT_GOAL_HOURS, onPressDay }: {
  days: Record<string, number>;
  cellSize?: number;
  gap?: number;
  goal?: number;
  onPressDay?: (date: string) => void;
}) {
  const today = toISO(new Date());
  const now = new Date();
  const startISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const endISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${lastDay}`;
  const weeks = useMemo(() => buildGridWeeks(startISO, endISO, today), [startISO, endISO, today]);

  return <Grid weeks={weeks} days={days} cellSize={cellSize} gap={gap} today={today} goal={goal} onPressDay={onPressDay} />;
}

// Single-month grid for any month offset (detail screen)
export function OffsetMonthGrid({ days, monthOffset, cellSize = 30, gap = 4, goal = DEFAULT_GOAL_HOURS, onPressDay }: {
  days: Record<string, number>;
  monthOffset: number;
  cellSize?: number;
  gap?: number;
  goal?: number;
  onPressDay?: (date: string) => void;
}) {
  const today = toISO(new Date());
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const y = target.getFullYear();
  const m = target.getMonth();
  const startISO = `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m + 1, 0).getDate();
  const endISO = `${y}-${String(m + 1).padStart(2, '0')}-${lastDay}`;
  const weeks = useMemo(() => buildGridWeeks(startISO, endISO, today), [startISO, endISO, today]);

  return <Grid weeks={weeks} days={days} cellSize={cellSize} gap={gap} today={today} goal={goal} onPressDay={onPressDay} />;
}

// 3-month grid — renders center-1, center, center+1 side by side (scrollable)
export function MultiMonthGrid({ days, monthOffset, cellSize = 20, gap = 3, goal = DEFAULT_GOAL_HOURS, onPressDay }: {
  days: Record<string, number>;
  monthOffset: number;
  cellSize?: number;
  gap?: number;
  goal?: number;
  onPressDay?: (date: string) => void;
}) {
  const today = toISO(new Date());
  const { theme } = useTheme();

  const monthData = useMemo(() => {
    const now = new Date();
    return [-1, 0, 1].map(off => {
      const target = new Date(now.getFullYear(), now.getMonth() + monthOffset + off, 1);
      const y = target.getFullYear();
      const m = target.getMonth();
      const startISO = `${y}-${String(m + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(y, m + 1, 0).getDate();
      const endISO = `${y}-${String(m + 1).padStart(2, '0')}-${lastDay}`;
      const weeks = buildGridWeeks(startISO, endISO, today);
      const monthLabel = target.toLocaleString('en-US', { month: 'short' });
      const yearLabel = target.getFullYear();
      return { weeks, monthLabel, yearLabel };
    });
  }, [monthOffset, today]);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'flex-start' }}>
      {monthData.map((m, idx) => (
        <View key={idx} style={{ alignItems: 'center', marginHorizontal: 10 }}>
          <Text style={{ color: theme.textSecondary, fontSize: 10, letterSpacing: 0.4, marginBottom: 4, textTransform: 'uppercase' }}>
            {m.monthLabel} {m.yearLabel}
          </Text>
          <Grid weeks={m.weeks} days={days} cellSize={cellSize} gap={gap} today={today} goal={goal} onPressDay={onPressDay} />
        </View>
      ))}
    </ScrollView>
  );
}

// Card mini-grid (centered, no weekday labels needed — Grid shows them)
export function MiniGrid({ days, cellSize = 14, gap = 3, showLabel = false, goal = DEFAULT_GOAL_HOURS }: {
  days: Record<string, number>;
  cellSize?: number;
  gap?: number;
  showLabel?: boolean;
  goal?: number;
}) {
  const { theme } = useTheme();
  const now = new Date();
  const label = now.toLocaleString('en-US', { month: 'short' });

  return (
    <View style={{ alignItems: 'center' }}>
      {showLabel ? (
        <Text style={{ color: theme.textMuted, fontSize: 10, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 4 }}>
          {label}
        </Text>
      ) : null}
      <MonthGrid days={days} cellSize={cellSize} gap={gap} goal={goal} />
    </View>
  );
}

export type MonthScrollerHandle = {
  scrollToToday: () => void;
  jumpToMonth: (month: string) => void;
};
