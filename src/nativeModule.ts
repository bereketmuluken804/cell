import { NativeModules } from 'react-native';

export type Habit = {
  id: string;
  name: string;
  days: Record<string, number>;
  createdAt: number;
  pinnedAt?: number | null;
  goal?: number | null;
};

interface HabitWidgetNative {
  saveHabits(habitsJson: string): void;
  refreshWidgets(): void;
  getHabits(): Promise<string>;
  consumeOpenedHabitId(): Promise<string | null>;
  saveGridSpan(span: number): void;
  getGridSpan(): Promise<number>;
  setMessageSeen(): void;
  getMessageSeen(): Promise<boolean>;
  setOnboardingSeen(): void;
  getOnboardingSeen(): Promise<boolean>;
  startTimer(habitId: string): void;
  stopTimer(habitId: string): Promise<{ elapsedMs: number; dateKey: string } | null>;
  getTimerState(habitId: string): Promise<{ running: boolean; startAt: number; dateKey: string }>;
}

const native = NativeModules.HabitWidget as HabitWidgetNative | undefined;

export function saveHabits(habits: Habit[]): void {
  if (!native) return;
  native.saveHabits(JSON.stringify(habits));
}

export function refreshWidgets(): void {
  if (!native) return;
  native.refreshWidgets();
}

export async function loadHabits(): Promise<Habit[]> {
  if (!native) return [];
  try {
    const raw = await native.getHabits();
    return JSON.parse(raw) as Habit[];
  } catch {
    return [];
  }
}

export async function getGridSpan(): Promise<number> {
  if (!native) return 1;
  try {
    return await native.getGridSpan();
  } catch {
    return 1;
  }
}

export function saveGridSpan(span: number): void {
  if (!native) return;
  native.saveGridSpan(span);
}

export function setMessageSeen(): void {
  if (!native) return;
  native.setMessageSeen();
}

export async function getMessageSeen(): Promise<boolean> {
  if (!native) return false;
  try {
    return await native.getMessageSeen();
  } catch {
    return false;
  }
}

export function setOnboardingSeen(): void {
  if (!native) return;
  native.setOnboardingSeen();
}

export async function getOnboardingSeen(): Promise<boolean> {
  if (!native) return false;
  try {
    return await native.getOnboardingSeen();
  } catch {
    return false;
  }
}

export async function consumeOpenedHabitId(): Promise<string | null> {
  if (!native) return null;
  try {
    return await native.consumeOpenedHabitId();
  } catch {
    return null;
  }
}

export function startTimer(habitId: string): void {
  if (!native) return;
  native.startTimer(habitId);
}

export async function stopTimer(
  habitId: string,
): Promise<{ elapsedMs: number; dateKey: string } | null> {
  if (!native) return null;
  try {
    return await native.stopTimer(habitId);
  } catch {
    return null;
  }
}

export async function getTimerState(
  habitId: string,
): Promise<{ running: boolean; startAt: number; dateKey: string }> {
  if (!native) return { running: false, startAt: 0, dateKey: '' };
  try {
    return await native.getTimerState(habitId);
  } catch {
    return { running: false, startAt: 0, dateKey: '' };
  }
}
