import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  AppState,
  BackHandler,
  Easing,
  FlatList,
  Image,
  Keyboard,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { MultiMonthGrid, MiniGrid, OffsetMonthGrid } from './src/HabitGrid';
import { maskOnChange } from './src/hoursInput';
import Onboarding from './src/Onboarding';
import {
  consumeOpenedHabitId,
  getMessageSeen,
  getOnboardingSeen,
  getTimerState,
  loadHabits,
  saveHabits,
  setMessageSeen,
  setOnboardingSeen,
  startTimer,
  stopTimer,
  type Habit,
} from './src/nativeModule';
import { ThemeProvider, useTheme } from './src/ThemeContext';
import { computeStreaks, type StreakStatus } from './src/streaks';
import { toISO } from './src/dates';
import { DEFAULT_GOAL_HOURS, MAX_GOAL_HOURS, MIN_GOAL_HOURS, formatDateShort, levelForHours } from './src/levels';
import {
  darkTheme,
  lightTheme,
  pinkTheme,
  orangeTheme,
  fontFamilyMedium,
  type Theme,
  type ThemeMode,
} from './src/theme';

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const iconTheme = require('./assets/palette.png');
const iconLeft = require('./assets/left.png');
const iconRight = require('./assets/right.png');
const iconAdd = require('./assets/add.png');
const iconPin = require('./assets/icon_pin.png');
const iconEdit = require('./assets/icon_edit.png');
const iconDelete = require('./assets/icon_delete.png');
const iconMessage = require('./assets/icon_message.png');
const iconClose = require('./assets/icon_close.png');

const WELCOME_MESSAGE = "Sorry for yesterday's joke";
const WELCOME_EXPIRES_AT = '2026-08-16';

function todayISO() {
  return toISO(new Date());
}

function withAlpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function effectiveGoal(h: Habit): number {
  const g = h.goal;
  if (g == null || g < MIN_GOAL_HOURS) return DEFAULT_GOAL_HOURS;
  return Math.min(g, MAX_GOAL_HOURS);
}

// Display hours as hh:mm ("2.5" -> "2:30", "8" -> "8:00", totals >24h ok).
function formatHoursLabel(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  const totalMinutes = h * 60 + m;
  const hh = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;
  return `${hh}:${String(mm).padStart(2, '0')}`;
}

// Accept both "2:30" and "2.5"; returns NaN when the input is invalid.
function parseHoursText(text: string): number {
  const t = text.trim();
  if (t === '') return NaN;
  const colon = t.indexOf(':');
  if (colon >= 0) {
    const hh = Number(t.slice(0, colon));
    const mm = Number(t.slice(colon + 1));
    if (isNaN(hh) || isNaN(mm) || !/^\d+$/.test(t.slice(colon + 1))) return NaN;
    if (mm < 0 || mm > 59) return NaN;
    return hh + mm / 60;
  }
  return parseFloat(t);
}

const THEME_CHOICES: { mode: ThemeMode; name: string; theme: Theme }[] = [
  { mode: 'dark', name: 'Dark', theme: darkTheme },
  { mode: 'light', name: 'Light', theme: lightTheme },
  { mode: 'pink', name: 'Pink', theme: pinkTheme },
  { mode: 'orange', name: 'Orange', theme: orangeTheme },
];

type Screen =
  | { name: 'home' }
  | { name: 'detail'; id: string }
  | { name: 'streaks'; focusId?: string };

export default function App() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <AppShell />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

function KeyboardPad({ children }: { children: React.ReactNode }) {
  const pad = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (toValue: number) => {
      Animated.timing(pad, {
        toValue,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    };
    const subs = [
      Keyboard.addListener('keyboardWillShow', e => animate(e.endCoordinates.height)),
      Keyboard.addListener('keyboardDidShow', e => animate(e.endCoordinates.height)),
      Keyboard.addListener('keyboardWillHide', () => animate(0)),
      Keyboard.addListener('keyboardDidHide', () => animate(0)),
    ];
    return () => subs.forEach(s => s.remove());
  }, [pad]);

  return <Animated.View style={{ flex: 1, paddingBottom: pad }}>{children}</Animated.View>;
}

function AppShell() {
  const insets = useSafeAreaInsets();
  const { theme, setTheme } = useTheme();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [addOpen, setAddOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editGoal, setEditGoal] = useState('');
  const [messageSeen, setMessageSeenState] = useState(true);
  const [messageOpen, setMessageOpen] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  const themeFade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    themeFade.setValue(0.35);
    Animated.timing(themeFade, {
      toValue: 1,
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [theme.mode, themeFade]);

  const goalOf = (h: Habit) => effectiveGoal(h);

  const parseGoal = (text: string): number => {
    const n = parseHoursText(text);
    if (isNaN(n)) return DEFAULT_GOAL_HOURS;
    return Math.max(MIN_GOAL_HOURS, Math.min(MAX_GOAL_HOURS, n));
  };

  useEffect(() => {
    loadHabits().then(setHabits);
    getMessageSeen().then(seen => setMessageSeenState(seen));
    getOnboardingSeen().then(done => setOnboardingDone(done));
    const openFrom = (url: string) => {
      const m = /habittracker:\/\/habit\/(.+)$/.exec(url);
      if (m) setScreen({ name: 'detail', id: decodeURIComponent(m[1]) });
    };
    // Cold start: the widget's launch intent carries a deep link.
    Linking.getInitialURL().then(url => {
      if (url) openFrom(url);
      else consumeOpenedHabitId().then(id => {
        if (id) setScreen({ name: 'detail', id });
      });
    });
    // Warm start: widget tapped while the app is already running.
    const sub = Linking.addEventListener('url', e => openFrom(e.url));
    return () => sub.remove();
  }, []);

  // Timer/days can change on the widget side (widget timer start/stop, day
  // logging) while the app is backgrounded. Reload whenever it comes back.
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') loadHabits().then(setHabits);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen.name === 'detail' || screen.name === 'streaks') {
        setScreen({ name: 'home' });
        return true;
      }
      // Let the system handle back on the home screen (exit app).
      if (menuFor) {
        setMenuFor(null);
        return true;
      }
      if (addOpen) {
        setAddOpen(false);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [screen.name, addOpen, menuFor]);

  const persist = (next: Habit[]) => {
    setHabits(next);
    saveHabits(next);
  };

  const finishOnboarding = () => {
    setOnboardingSeen();
    setOnboardingDone(true);
  };

  const addHabit = () => {
    const name = newName.trim();
    if (!name) return;
    persist([...habits, { id: uid(), name, days: {}, createdAt: Date.now(), goal: parseGoal(newGoal) }]);
    setNewName('');
    setNewGoal('');
    setAddOpen(false);
  };

  const saveEdit = () => {
    if (!editId) return;
    const name = editName.trim();
    if (!name) return;
    persist(
      habits.map(h =>
        h.id === editId ? { ...h, name, goal: parseGoal(editGoal) } : h,
      ),
    );
    setEditId(null);
  };

  const openEdit = (id: string) => {
    const h = habits.find(x => x.id === id);
    if (!h) return;
    setEditId(id);
    setEditName(h.name);
    setEditGoal(goalOf(h) === DEFAULT_GOAL_HOURS ? '' : formatHoursLabel(goalOf(h)));
    setMenuFor(null);
  };

  const setPinned = (id: string, pinnedAt: number | null) => {
    persist(habits.map(h => (h.id === id ? { ...h, pinnedAt } : h)));
  };

  const deleteHabit = (id: string) => {
    Alert.alert('Delete habit', 'Remove this habit and its history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => persist(habits.filter(h => h.id !== id)),
      },
    ]);
  };

  const logHours = (id: string, dateKey: string, hours: number) => {
    persist(
      habits.map(h => {
        if (h.id !== id) return h;
        const days = { ...h.days };
        if (hours <= 0) delete days[dateKey];
        else days[dateKey] = Math.min(hours, 24);
        return { ...h, days };
      }),
    );
  };

  const openDetail = (id: string) => setScreen({ name: 'detail', id });

  const habitMenu = (h: Habit) => setMenuFor(h.id);

  const modal = (
    <Modal visible={addOpen} transparent animationType="fade">
      <KeyboardPad>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>New habit</Text>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            placeholder="e.g. Meditation"
            placeholderTextColor={theme.textMuted}
            value={newName}
            onChangeText={setNewName}
            autoFocus
          />
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            placeholder={`Daily goal hours (default ${formatHoursLabel(DEFAULT_GOAL_HOURS)})`}
            placeholderTextColor={theme.textMuted}
            value={newGoal}
            onChangeText={maskOnChange(setNewGoal)}
            keyboardType="decimal-pad"
          />
          <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: -6, marginBottom: 12 }}>
            Full color at your goal; {formatHoursLabel(MIN_GOAL_HOURS)} to {formatHoursLabel(MAX_GOAL_HOURS)}
          </Text>
          <View style={styles.modalButtons}>
            <Pressable
              onPress={() => setAddOpen(false)}
              style={[styles.btnGhost, { borderColor: theme.border }]}
            >
              <Text style={{ color: theme.textSecondary }}>Cancel</Text>
            </Pressable>
            <Pressable onPress={addHabit} style={[styles.btnSolid, { backgroundColor: theme.accent }]}>
              <Text style={{ color: '#fff', fontFamily: fontFamilyMedium }}>Add</Text>
            </Pressable>
          </View>
        </View>
      </View>
      </KeyboardPad>
    </Modal>
  );

  const menuHabit = menuFor ? habits.find(h => h.id === menuFor) ?? null : null;
  const menuModal = (
    <Modal visible={!!menuFor} transparent animationType="slide">
      <Pressable style={styles.sheetBackdrop} onPress={() => setMenuFor(null)}>
        <Pressable
          style={[
            styles.sheetCard,
            { backgroundColor: theme.surface, paddingBottom: insets.bottom + 16 },
          ]}
          onPress={e => e.stopPropagation()}
        >
          <View style={styles.sheetHandle} />
          {menuHabit ? (
            <Text style={[styles.sheetTitle, { color: theme.text }]} numberOfLines={1}>
              {menuHabit.name}
            </Text>
          ) : null}
          <Pressable
            style={({ pressed }) => [
              styles.sheetRow,
              pressed && { backgroundColor: theme.border },
            ]}
            onPress={() => {
              if (menuHabit) setPinned(menuHabit.id, menuHabit.pinnedAt ? null : Date.now());
              setMenuFor(null);
            }}
          >
            <Image source={iconPin} style={{ width: 20, height: 20, tintColor: theme.text, marginRight: 12 }} />
            <Text style={{ color: theme.text, fontSize: 16 }}>
              {menuHabit?.pinnedAt ? 'Unpin habit' : 'Pin to top'}
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.sheetRow,
              pressed && { backgroundColor: theme.border },
            ]}
            onPress={() => {
              if (menuHabit) openEdit(menuHabit.id);
            }}
          >
            <Image source={iconEdit} style={{ width: 20, height: 20, tintColor: theme.text, marginRight: 12 }} />
            <Text style={{ color: theme.text, fontSize: 16 }}>Edit habit</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.sheetRow,
              pressed && { backgroundColor: theme.border },
            ]}
            onPress={() => {
              if (menuHabit) deleteHabit(menuHabit.id);
              setMenuFor(null);
            }}
          >
            <Image source={iconDelete} style={{ width: 20, height: 20, tintColor: '#E5484D', marginRight: 12 }} />
            <Text style={{ color: '#E5484D', fontSize: 16 }}>Delete habit</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.sheetCancel, pressed && { backgroundColor: theme.border }]}
            onPress={() => setMenuFor(null)}
          >
            <Text style={{ color: theme.textSecondary, fontSize: 16, fontFamily: fontFamilyMedium }}>
              Cancel
            </Text>
          </Pressable>
          <View style={styles.sheetHandle} />
        </Pressable>
      </Pressable>
    </Modal>
  );

  const editModal = (
    <Modal visible={!!editId} transparent animationType="fade">
      <KeyboardPad>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Edit habit</Text>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            placeholder="Name"
            placeholderTextColor={theme.textMuted}
            value={editName}
            onChangeText={setEditName}
          />
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            placeholder={`Daily goal hours (default ${formatHoursLabel(DEFAULT_GOAL_HOURS)})`}
            placeholderTextColor={theme.textMuted}
            value={editGoal}
            onChangeText={maskOnChange(setEditGoal)}
            keyboardType="decimal-pad"
          />
          <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: -6, marginBottom: 12 }}>
            Full color at your goal; {formatHoursLabel(MIN_GOAL_HOURS)} to {formatHoursLabel(MAX_GOAL_HOURS)}
          </Text>
          <View style={styles.modalButtons}>
            <Pressable
              onPress={() => setEditId(null)}
              style={[styles.btnGhost, { borderColor: theme.border }]}
            >
              <Text style={{ color: theme.textSecondary }}>Cancel</Text>
            </Pressable>
            <Pressable onPress={saveEdit} style={[styles.btnSolid, { backgroundColor: theme.accent }]}>
              <Text style={{ color: '#fff', fontFamily: fontFamilyMedium }}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
      </KeyboardPad>
    </Modal>
  );

  const themePicker = (
    <Modal visible={themeOpen} transparent animationType="slide">
      <Pressable style={styles.sheetBackdrop} onPress={() => setThemeOpen(false)}>
        <Pressable
          style={[
            styles.sheetCard,
            { backgroundColor: theme.surface, paddingBottom: insets.bottom + 16 },
          ]}
          onPress={e => e.stopPropagation()}
        >
          <View style={styles.sheetHandle} />
          <Text style={[styles.sheetTitle, { color: theme.text }]}>Theme</Text>
          {THEME_CHOICES.map(t => {
            const selected = theme.mode === t.mode;
            return (
              <Pressable
                key={t.mode}
                style={({ pressed }) => [
                  styles.sheetRow,
                  (pressed || selected) && { backgroundColor: theme.border },
                ]}
                onPress={() => {
                  setTheme(t.mode);
                  setThemeOpen(false);
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: t.theme.bg,
                    borderWidth: 1,
                    borderColor: t.theme.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 7,
                      backgroundColor: t.theme.accent,
                    }}
                  />
                </View>
                <Text style={{ color: theme.text, fontSize: 16, marginLeft: 12, flex: 1 }}>
                  {t.name}
                </Text>
                {selected ? <Text style={{ color: theme.accent, fontSize: 16 }}>✓</Text> : null}
              </Pressable>
            );
          })}
          <View style={styles.sheetHandle} />
        </Pressable>
      </Pressable>
    </Modal>
  );

  if (screen.name === 'detail') {
    const habit = habits.find(h => h.id === screen.id) ?? null;
    if (habit) {
      return (
        <>
          <DetailScreen
            habit={habit}
            insets={insets}
            onBack={() => setScreen({ name: 'home' })}
            onMenu={() => habitMenu(habit)}
            onLog={logHours}
            onReload={() => loadHabits().then(setHabits)}
            onOpenStreaks={() => setScreen({ name: 'streaks', focusId: habit.id })}
          />
          {modal}
          {menuModal}
          {themePicker}{editModal}
        </>
      );
    }
  }

  if (screen.name === 'streaks') {
    return (
      <>
        <StreakScreen
          habits={habits}
          insets={insets}
          focusId={screen.focusId}
          onBack={() => setScreen({ name: 'home' })}
        />
        {modal}
        {menuModal}
        {themePicker}{editModal}
      </>
    );
  }

  if (onboardingDone === false) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <Onboarding onFinish={finishOnboarding} />
      </View>
    );
  }

  if (onboardingDone === null) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.bg,
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 8,
          opacity: themeFade,
        },
      ]}
    >
      <StatusBar
        barStyle={theme.mode === 'light' || theme.mode === 'pink' ? 'dark-content' : 'light-content'}
        backgroundColor={theme.bg}
      />
      <HomeHeader
        goStreaks={() => setScreen({ name: 'streaks' })}
        onPickTheme={() => setThemeOpen(true)}
        theme={theme}
      />
      <HomeList
        habits={habits}
        theme={theme}
        onOpen={openDetail}
        onMenu={habitMenu}
      />
      <Pressable
        onPress={() => setAddOpen(true)}
        style={({ pressed }) => [
          styles.addBtn,
          {
            backgroundColor: theme.accent,
            borderColor: 'rgba(255,255,255,0.25)',
            bottom: insets.bottom + 16,
            shadowColor: theme.accent,
          },
          pressed && styles.addBtnPressed,
        ]}
      >
        <Image source={iconAdd} style={{ width: 18, height: 18, tintColor: '#FFFFFF', marginRight: 8 }} />
        <Text style={styles.addLabel}>Add habit</Text>
      </Pressable>
      {!messageSeen && todayISO() < WELCOME_EXPIRES_AT ? (
        <Pressable
          onPress={() => setMessageOpen(true)}
          style={({ pressed }) => [
            styles.messageBtn,
            {
              backgroundColor: theme.accent,
              borderColor: 'rgba(255,255,255,0.25)',
              bottom: insets.bottom + 16,
              shadowColor: theme.accent,
            },
            pressed && styles.messageBtnPressed,
          ]}
        >
          <Image source={iconMessage} style={{ width: 20, height: 20, tintColor: '#FFFFFF' }} />
        </Pressable>
      ) : null}
      <Modal visible={messageOpen} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => {}}>
          <View style={[styles.messageCard, { backgroundColor: theme.card }]}>
            <Pressable
              onPress={() => {
                setMessageSeen();
                setMessageSeenState(true);
                setMessageOpen(false);
              }}
              style={styles.messageClose}
            >
              <Image source={iconClose} style={{ width: 18, height: 18, tintColor: theme.textMuted }} />
            </Pressable>
            <Text style={{ fontSize: 56, textAlign: 'center', marginBottom: 16 }}>🙃</Text>
            <Text style={[styles.messageText, { color: theme.text }]}>{WELCOME_MESSAGE}</Text>
          </View>
        </Pressable>
      </Modal>
      {modal}
      {menuModal}
      {themePicker}{editModal}
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------

function HomeHeader({
  goStreaks,
  onPickTheme,
  theme,
}: {
  goStreaks: () => void;
  onPickTheme: () => void;
  theme: Theme;
}) {
  return (
    <View style={styles.headerRow}>
      <View style={{ flexShrink: 1 }}>
        <Text style={[styles.title, { color: theme.text }]}>Habits</Text>
        <Text style={[styles.headerSub, { color: theme.textMuted }]}>Your progress at a glance</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable
          onPress={goStreaks}
          style={({ pressed }) => [
            styles.iconBtn,
            { backgroundColor: theme.accent, borderColor: 'rgba(255,255,255,0.3)' },
            pressed && styles.iconBtnPressed,
          ]}
        >
          <Text style={{ fontSize: 16 }}>🔥</Text>
        </Pressable>
        <Pressable
          onPress={onPickTheme}
          style={({ pressed }) => [
            styles.iconBtn,
            { backgroundColor: theme.surface, borderColor: theme.border },
            pressed && styles.iconBtnPressed,
          ]}
        >
          <Image source={iconTheme} style={{ width: 18, height: 18, tintColor: theme.textSecondary }} />
        </Pressable>
      </View>
    </View>
  );
}

function SectionHeader({ label, theme, accent }: { label: string; theme: Theme; accent?: boolean }) {
  return (
    <View style={styles.sectionHeader}>
      {accent ? <View style={[styles.sectionDot, { backgroundColor: theme.accent }]} /> : null}
      <Text style={[styles.sectionLabel, { color: accent ? theme.textSecondary : theme.textMuted }]}>
        {label}
      </Text>
      <View style={[styles.sectionLine, { backgroundColor: theme.border }]} />
    </View>
  );
}

function HomeList(props: {
  habits: Habit[];
  theme: Theme;
  onOpen: (id: string) => void;
  onMenu: (h: Habit) => void;
}) {
  const { habits, theme, onOpen, onMenu } = props;
  const pinned = habits.filter(h => h.pinnedAt).sort((a, b) => (a.pinnedAt ?? 0) - (b.pinnedAt ?? 0));
  const all = habits.filter(h => !h.pinnedAt).sort((a, b) => a.createdAt - b.createdAt);

  const rows: (string | Habit)[] = [];
  if (pinned.length) {
    rows.push('Pinned');
    rows.push(...pinned);
    rows.push('All habits');
    rows.push(...all);
  } else {
    rows.push(...all);
  }

  return (
    <FlatList
      data={rows}
      renderItem={({ item }) =>
        typeof item === 'string' ? (
          <SectionHeader label={item} theme={theme} accent={item === 'Pinned'} />
        ) : (
          <HabitCard habit={item} theme={theme} onOpen={onOpen} onMenu={onMenu} />
        )
      }
      keyExtractor={(item) => (typeof item === 'string' ? `s-${item}` : item.id)}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 110 }}
      ListEmptyComponent={
        <Text style={[styles.empty, { color: theme.textSecondary }]}>
          No habits yet. Add one to start tracking — then add its widget to your home screen.
        </Text>
      }
    />
  );
}

function HabitCard(props: {
  habit: Habit;
  theme: Theme;
  onOpen: (id: string) => void;
  onMenu: (h: Habit) => void;
}) {
  const { habit, theme, onOpen, onMenu } = props;
  const streak = useMemo(() => computeStreaks(habit.days, todayISO()), [habit.days]);
  const goal = effectiveGoal(habit);
  const pinned = !!habit.pinnedAt;
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pinned ? styles.cardPinned : null,
        {
          backgroundColor: theme.card,
          borderColor: pinned ? withAlpha(theme.accent, 0.55) : theme.border,
          shadowColor: pinned ? withAlpha(theme.accent, 0.55) : '#000',
        },
        pressed && styles.cardPressed,
      ]}
      onPress={() => onOpen(habit.id)}
    >
      <View style={styles.cardTopRow}>
        <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
          {habit.name}
        </Text>
        <Pressable
          onPress={() => onMenu(habit)}
          hitSlop={10}
          style={({ pressed }) => [
            styles.cardMenuBtn,
            { backgroundColor: pressed ? theme.border : theme.surface, borderColor: theme.border },
          ]}
        >
          <Text style={{ color: theme.textMuted, fontSize: 15, lineHeight: 17 }}>⋮</Text>
        </Pressable>
      </View>
      <Text style={{ fontSize: 13, marginTop: 10 }}>
        <Text style={{ color: theme.accent, fontFamily: fontFamilyMedium }}>{streak.current}d streak</Text>
        <Text style={{ color: theme.textMuted }}>  ·  goal {formatHoursLabel(goal)}</Text>
      </Text>
      <View style={styles.cardGridWrap}>
        <MiniGrid days={habit.days} cellSize={18} gap={4} showLabel goal={goal} />
      </View>
      <Text style={[styles.cardTapHint, { color: theme.textMuted }]}>tap to log</Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Detail (widget-style: single month, arrows, grid, summary)
// ---------------------------------------------------------------------------

function DetailScreen(props: {
  habit: Habit;
  insets: { top: number; bottom: number };
  onBack: () => void;
  onMenu: () => void;
  onLog: (id: string, dateKey: string, hours: number) => void;
  onReload: () => void;
  onOpenStreaks: () => void;
}) {
  const { habit, insets, onBack, onMenu, onLog, onReload, onOpenStreaks } = props;
  const { theme, gridSpan, setGridSpan } = useTheme();
  const [monthOffset, setMonthOffset] = useState(0);
  const [logDate, setLogDate] = useState<string | null>(null);
  const [hoursText, setHoursText] = useState('');
  const today = todayISO();
  const goal = effectiveGoal(habit);

  const target = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  }, [monthOffset]);

  const monthTitle = (() => {
    if (gridSpan === 3) {
      const off = monthOffset;
      const now = new Date();
      const fmt = new Intl.DateTimeFormat('en-US', { month: 'short' });
      const yFmt = new Intl.DateTimeFormat('en-US', { year: 'numeric' });
      const first = new Date(now.getFullYear(), now.getMonth() + off - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth() + off + 1, 1);
      return `${fmt.format(first)} – ${fmt.format(last)} ${yFmt.format(first)}`;
    }
    return target.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  })();
  const summary = useMemo(() => {
    let total = 0;
    let active = 0;
    const now = new Date();
    const offsets = gridSpan === 3 ? [-1, 0, 1] : [0];
    for (const off of offsets) {
      const t = new Date(now.getFullYear(), now.getMonth() + monthOffset + off, 1);
      const prefix = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`;
      for (const [k, v] of Object.entries(habit.days)) {
        if (k.startsWith(prefix) && v > 0) { total += v; active++; }
      }
    }
    return { total, active };
  }, [habit.days, monthOffset, gridSpan]);

  const streak = useMemo(() => computeStreaks(habit.days, today), [habit.days, today]);

  const [timerStart, setTimerStart] = useState(0);
  const [timerStartKey, setTimerStartKey] = useState<string | null>(null);
  const [, setNow] = useState(Date.now());

  useEffect(() => {
    const refreshTimer = () => {
      getTimerState(habit.id).then(st => {
        setTimerStart(st.running ? st.startAt : 0);
        // Base hours come from the day the timer started on, exactly like the
        // widget's counter, so both stay in sync even across midnight.
        setTimerStartKey(st.running ? st.dateKey : null);
      });
    };
    refreshTimer();
    // A timer can be started/stopped from the widget while this screen is in
    // the background; re-sync when the app returns to the foreground.
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        refreshTimer();
        onReload();
      }
    });
    return () => sub.remove();
  }, [habit.id, onReload]);

  useEffect(() => {
    if (timerStart <= 0) return;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [timerStart]);

  const elapsedMs = timerStart > 0 ? Date.now() - timerStart : 0;
  const baseHours = timerStartKey ? (habit.days[timerStartKey] ?? 0) : 0;
  const totalMs = baseHours * 3600000 + elapsedMs;
  const elapsedLabel = (() => {
    const secs = Math.floor(totalMs / 1000);
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  })();

  const toggleTimer = async () => {
    if (timerStart > 0) {
      await stopTimer(habit.id);
      setTimerStart(0);
      setTimerStartKey(null);
      onReload();
    } else {
      startTimer(habit.id);
      setTimerStart(Date.now());
      setTimerStartKey(today);
    }
  };

  const QUICK_HOURS = [0.5, 1, 1.5, 2, 3, 4, 6, 8];

  const handleHoursChange = maskOnChange(setHoursText);

  const submitHours = (dateKey: string, text: string) => {
    const h = parseHoursText(text);
    if (!isNaN(h) && h >= 0) {
      onLog(habit.id, dateKey, h);
      setLogDate(null);
      setHoursText('');
    }
  };

  const isFuture = (dateKey: string) => dateKey > today;

  const handleDayPress = (date: string) => {
    if (isFuture(date)) {
      ToastAndroid.show('Wait till you reach this day', ToastAndroid.SHORT);
      return;
    }
    setLogDate(date);
    const h = habit.days[date] ?? 0;
    setHoursText(h > 0 ? formatHoursLabel(h) : '');
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.bg, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 },
      ]}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable
          onPress={onBack}
          hitSlop={8}
          style={[styles.backBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <Text style={{ color: theme.text, fontSize: 20 }}>‹</Text>
        </Pressable>
        <Text
          style={[styles.title, { color: theme.text, flex: 1, textAlign: 'center', fontSize: 20 }]}
          numberOfLines={1}
        >
          {habit.name}
        </Text>
        <Pressable onPress={onMenu} hitSlop={12}>
          <Text style={{ color: theme.textMuted, fontSize: 20 }}>⋮</Text>
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Month nav arrows — widget style */}
        <View style={styles.monthNav}>
          <Pressable onPress={() => setMonthOffset(o => o - 1)} style={[styles.navArrow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Image source={iconLeft} style={{ width: 20, height: 20, tintColor: theme.text }} />
          </Pressable>
          <Text style={{ color: theme.text, fontSize: 15, fontWeight: '600', marginHorizontal: 12 }}>{monthTitle}</Text>
          <Pressable onPress={() => setMonthOffset(o => o + 1)} style={[styles.navArrow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Image source={iconRight} style={{ width: 20, height: 20, tintColor: theme.text }} />
          </Pressable>
        </View>

        {/* Grid span toggle + Today */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Pressable
            onPress={() => setGridSpan(1)}
            style={[styles.spanBtn, { backgroundColor: gridSpan === 1 ? theme.accent : theme.surface, borderColor: theme.border }]}
          >
            <Text style={{ color: gridSpan === 1 ? '#fff' : theme.textSecondary, fontSize: 12, fontFamily: fontFamilyMedium }}>1 Mo</Text>
          </Pressable>
          <Pressable
            onPress={() => setGridSpan(3)}
            style={[styles.spanBtn, { backgroundColor: gridSpan === 3 ? theme.accent : theme.surface, borderColor: theme.border }]}
          >
            <Text style={{ color: gridSpan === 3 ? '#fff' : theme.textSecondary, fontSize: 12, fontFamily: fontFamilyMedium }}>3 Mo</Text>
          </Pressable>
          <Pressable
            onPress={() => setMonthOffset(0)}
            style={[styles.spanBtn, { backgroundColor: monthOffset === 0 ? theme.surface : theme.accent, borderColor: theme.border }]}
          >
            <Text style={{ color: monthOffset === 0 ? theme.textSecondary : '#fff', fontSize: 12, fontFamily: fontFamilyMedium }}>Today</Text>
          </Pressable>
        </View>

        {/* Grid */}
        <View style={gridSpan === 3 ? { width: '100%', marginVertical: 12 } : { alignItems: 'center', marginVertical: 12 }}>
          {gridSpan === 3 ? (
            <MultiMonthGrid
              days={habit.days}
              monthOffset={monthOffset}
              cellSize={20}
              gap={3}
              goal={goal}
              onPressDay={handleDayPress}
            />
          ) : (
            <OffsetMonthGrid
              days={habit.days}
              monthOffset={monthOffset}
              cellSize={30}
              gap={4}
              goal={goal}
              onPressDay={handleDayPress}
            />
          )}
        </View>

        {/* Summary line — like the widget */}
        <Text style={{ color: theme.textSecondary, fontSize: 12, textAlign: 'center', marginBottom: 16 }}>
          {formatHoursLabel(summary.total)} / {formatHoursLabel(goal)} goal this month · {summary.active} active days
        </Text>

        {/* Streak info */}
        <Pressable
          style={[styles.streakBar, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={onOpenStreaks}
        >
          <Text style={{ fontSize: 16, marginRight: 8 }}>🔥</Text>
          <Text style={{ color: theme.text, fontSize: 15, fontFamily: fontFamilyMedium }}>
            {streak.current > 0 ? `${streak.current} day ${streak.current === 1 ? 'streak' : 'streak'}` : 'No streak yet'}
          </Text>
          {streak.status === 'at-risk' ? (
            <Text style={{ color: '#D29922', fontSize: 12, marginLeft: 8 }}>log today!</Text>
          ) : null}
        </Pressable>

        {/* Timer */}
        <Pressable
          onPress={toggleTimer}
          style={[
            styles.timerBtn,
            {
              backgroundColor: timerStart > 0 ? theme.card : theme.accent,
              borderColor: timerStart > 0 ? theme.border : theme.accent,
            },
          ]}
        >
          <Text
            style={{
              color: timerStart > 0 ? theme.text : '#fff',
              fontSize: 15,
              fontFamily: fontFamilyMedium,
            }}
          >
            {timerStart > 0 ? `Stop · ${elapsedLabel}` : 'Start timer'}
          </Text>
        </Pressable>

        {/* Legend */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4, marginTop: 12, marginBottom: 20 }}>
          {theme.levels.map((c, i) => (
            <View key={i} style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: c }} />
          ))}
        </View>
      </ScrollView>

      {/* Hours input modal */}
      <Modal visible={!!logDate} transparent animationType="fade">
        <KeyboardPad>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Log hours</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 13, marginBottom: 12 }}>
              {logDate}
            </Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              placeholder="Hours (e.g. 2:30)"
              placeholderTextColor={theme.textMuted}
              value={hoursText}
              onChangeText={handleHoursChange}
              keyboardType="decimal-pad"
              autoFocus
            />
            <View style={styles.quickHoursRow}>
              {QUICK_HOURS.map(h => (
                <Pressable
                  key={h}
                  onPress={() => { onLog(habit.id, logDate!, h); setLogDate(null); setHoursText(''); }}
                  style={[styles.quickHourBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
                >
                  <Text style={{ color: theme.text, fontSize: 13 }}>{formatHoursLabel(h)}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => { onLog(habit.id, logDate!, 0); setLogDate(null); setHoursText(''); }}
                style={[styles.btnGhost, { borderColor: '#F85149' }]}
              >
                <Text style={{ color: '#F85149' }}>Reset</Text>
              </Pressable>
              <View style={{ flex: 1 }} />
              <Pressable onPress={() => { setLogDate(null); setHoursText(''); }} style={[styles.btnGhost, { borderColor: theme.border }]}>
                <Text style={{ color: theme.textSecondary }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => submitHours(logDate!, hoursText)} style={[styles.btnSolid, { backgroundColor: theme.accent }]}>
                <Text style={{ color: '#fff', fontFamily: fontFamilyMedium }}>Log</Text>
              </Pressable>
            </View>
          </View>
        </View>
        </KeyboardPad>
      </Modal>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Streaks
// ---------------------------------------------------------------------------

function formatRange(start: string, end: string): string {
  if (start.slice(0, 4) === end.slice(0, 4)) {
    return `${formatDateShort(start)} – ${formatDateShort(end)}, ${end.slice(0, 4)}`;
  }
  return `${formatDateShort(start)} ${start.slice(0, 4)} – ${formatDateShort(end)} ${end.slice(0, 4)}`;
}

const STATUS_META: Record<StreakStatus, { label: string; fg: string; bg: string }> = {
  active: { label: 'Active', fg: '#2DA44E', bg: 'rgba(46,160,67,0.14)' },
  'at-risk': { label: 'At risk', fg: '#D29922', bg: 'rgba(210,153,34,0.14)' },
  broken: { label: 'Broken', fg: '#8B949E', bg: 'rgba(139,148,158,0.14)' },
};

function StreakScreen(props: {
  habits: Habit[];
  insets: { top: number; bottom: number };
  focusId?: string;
  onBack: () => void;
}) {
  const { habits, insets, focusId, onBack } = props;
  const { theme } = useTheme();
  const [pickedId, setPickedId] = useState<string | null>(focusId ?? habits[0]?.id ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [tappedDay, setTappedDay] = useState<string | null>(null);

  const habit = useMemo(() => {
    if (pickedId) {
      const found = habits.find(h => h.id === pickedId);
      if (found) return found;
    }
    if (focusId) {
      const found = habits.find(h => h.id === focusId);
      if (found) return found;
    }
    return habits[0] ?? null;
  }, [habits, pickedId, focusId]);

  if (!habit) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.bg, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 },
        ]}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={onBack}
            hitSlop={8}
            style={[styles.backBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <Text style={{ color: theme.text, fontSize: 20 }}>‹</Text>
          </Pressable>
          <Text style={[styles.title, { color: theme.text, flex: 1, textAlign: 'center', fontSize: 20 }]}>
            Streaks 🔥
          </Text>
          <View style={{ width: 38 }} />
        </View>
        <Text style={[styles.empty, { color: theme.textMuted }]}>Add a habit to see its streaks.</Text>
      </View>
    );
  }

  const goal = effectiveGoal(habit);
  const s = computeStreaks(habit.days, todayISO());
  const meta = STATUS_META[s.status];

  const days = (() => {
    const out: { iso: string; hours: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = toISO(d);
      out.push({ iso, hours: habit.days[iso] ?? 0 });
    }
    return out;
  })();

  const maxDaily = days.reduce((m, d) => Math.max(m, d.hours), 0);
  const rawMax = Math.max(goal, maxDaily) * 1.15;
  let yMax = 12;
  for (const st of [1, 2, 3, 4, 6, 8, 12, 16, 24]) {
    if (rawMax <= st * 3 + 0.001) {
      yMax = st * 3;
      break;
    }
  }
  const ticks = [0, yMax / 3, (2 * yMax) / 3, yMax];
  const plotH = 150;

  return (
    <>
      <View
        style={[
          styles.container,
          { backgroundColor: theme.bg, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 },
        ]}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={onBack}
            hitSlop={8}
            style={[styles.backBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <Text style={{ color: theme.text, fontSize: 20 }}>‹</Text>
          </Pressable>
          <Text style={[styles.title, { color: theme.text, flex: 1, textAlign: 'center', fontSize: 20 }]}>
            Streaks 🔥
          </Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
          {/* Habit selector */}
          <Pressable
            onPress={() => setPickerOpen(true)}
            style={[
              styles.streakSelector,
              { backgroundColor: theme.surface, borderColor: 'rgba(46,124,246,0.4)' },
            ]}
          >
            <Text
              style={{ color: theme.text, fontSize: 17, fontFamily: fontFamilyMedium, flex: 1 }}
              numberOfLines={1}
            >
              {habit.name}
            </Text>
            <Text style={{ color: theme.textMuted, fontSize: 16 }}>▾</Text>
          </Pressable>

          {/* Current streak */}
          <View style={[styles.streakCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.streakLabel, { color: theme.textMuted }]}>Current streak</Text>
            <View style={{ alignItems: 'center', paddingVertical: 16 }}>
              <View style={styles.flameWrap}>
                <Text style={styles.flame}>🔥</Text>
              </View>
              <Text style={[styles.streakNumber, { color: theme.text }]}>{s.current}</Text>
              <Text style={{ color: theme.textMuted, fontSize: 13, letterSpacing: 0.5 }}>days</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
                <View style={[styles.statusDot, { backgroundColor: meta.fg }]} />
                <Text style={{ color: meta.fg, fontSize: 12, fontFamily: fontFamilyMedium }}>{meta.label}</Text>
              </View>
            </View>
          </View>

          {/* Longest streak */}
          <View style={[styles.streakCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <Text style={[styles.streakLabel, { color: theme.textMuted, flex: 1 }]}>Longest streak</Text>
              <Text style={{ fontSize: 18 }}>🏆</Text>
            </View>
            {s.longest > 0 ? (
              <>
                <Text style={[styles.longestValue, { color: '#2DA44E' }]}>{s.longest} days</Text>
                {s.longestStart && s.longestEnd ? (
                  <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 4 }}>
                    {formatRange(s.longestStart, s.longestEnd)}
                  </Text>
                ) : null}
              </>
            ) : (
              <Text style={{ color: theme.textMuted, fontSize: 14, marginTop: 8 }}>No streak yet</Text>
            )}
          </View>

          {/* Hours chart */}
          <View style={[styles.streakCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 10 }}>
              <Text style={{ color: theme.text, fontSize: 15, fontFamily: fontFamilyMedium, flex: 1 }}>
                Last 14 days
              </Text>
              <Text style={{ color: theme.textMuted, fontSize: 11, marginRight: 10 }}>hours</Text>
              <Text style={{ color: theme.accent, fontSize: 12, fontFamily: fontFamilyMedium }}>
                Goal {formatHoursLabel(goal)}
              </Text>
            </View>

            {tappedDay ? (
              <Text
                style={{
                  color: theme.text,
                  fontSize: 12,
                  textAlign: 'center',
                  marginBottom: 8,
                  fontFamily: fontFamilyMedium,
                }}
              >
                {formatDateShort(tappedDay)} · {formatHoursLabel(habit.days[tappedDay] ?? 0)} hours
              </Text>
            ) : null}

            <View style={{ flexDirection: 'row' }}>
              <View style={{ width: 34, height: plotH }}>
                {ticks.map((t, i) => (
                  <Text
                    key={i}
                    style={{
                      position: 'absolute',
                      right: 6,
                      bottom: (t / yMax) * plotH,
                      transform: [{ translateY: 4 }],
                      color: theme.textMuted,
                      fontSize: 9,
                      textAlign: 'right',
                    }}
                  >
                    {formatHoursLabel(t)}
                  </Text>
                ))}
              </View>
              <View style={{ flex: 1, height: plotH }}>
                {ticks.map((t, i) =>
                  i === 0 ? null : (
                    <View
                      key={i}
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: (t / yMax) * plotH,
                        borderTopWidth: 1,
                        borderStyle: 'dashed',
                        borderColor: theme.border,
                      }}
                    />
                  ),
                )}
                <View
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: (goal / yMax) * plotH,
                    borderTopWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: 'rgba(46,124,246,0.55)',
                  }}
                />
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end' }}>
                  {days.map((d, i) => {
                    const isToday = i === days.length - 1;
                    const lvl = levelForHours(d.hours, goal);
                    const color = lvl === 0 ? theme.levels[0] : theme.levels[lvl];
                    return (
                      <Pressable
                        key={d.iso}
                        onPress={() => setTappedDay(tappedDay === d.iso ? null : d.iso)}
                        style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 1 }}
                      >
                        <View
                          style={{
                            width: '100%',
                            height: Math.max(d.hours > 0 ? (d.hours / yMax) * plotH : 0, 2),
                            borderTopLeftRadius: 3,
                            borderTopRightRadius: 3,
                            backgroundColor: color,
                            borderWidth: isToday ? 1 : 0,
                            borderColor: isToday ? theme.accent : undefined,
                          }}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <View style={{ width: 34 }} />
              <View style={{ flex: 1, flexDirection: 'row', marginTop: 4 }}>
                {days.map((d, i) => (
                  <Text
                    key={d.iso}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      fontSize: 9,
                      color: i === days.length - 1 ? theme.accent : theme.textMuted,
                      fontFamily: fontFamilyMedium,
                    }}
                  >
                    {Number(d.iso.slice(8, 10))}
                  </Text>
                ))}
              </View>
            </View>
            <View style={{ flexDirection: 'row', marginTop: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 18 }}>
                <View
                  style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: theme.levels[6], marginRight: 6 }}
                />
                <Text style={{ color: theme.textMuted, fontSize: 10 }}>Hours logged</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{ width: 9, height: 9, borderRadius: 2, borderWidth: 1, borderColor: theme.accent, marginRight: 6 }}
                />
                <Text style={{ color: theme.textMuted, fontSize: 10 }}>Today</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Habit selector sheet */}
      <Modal visible={pickerOpen} transparent animationType="slide">
        <Pressable style={styles.sheetBackdrop} onPress={() => setPickerOpen(false)}>
          <Pressable
            style={[
              styles.sheetCard,
              { backgroundColor: theme.surface, paddingBottom: insets.bottom + 16 },
            ]}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: theme.text }]}>Habits</Text>
            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {habits.map(h => {
                const selected = h.id === habit.id;
                return (
                  <Pressable
                    key={h.id}
                    style={({ pressed }) => [
                      styles.sheetRow,
                      (pressed || selected) && { backgroundColor: theme.border },
                    ]}
                    onPress={() => {
                      setPickedId(h.id);
                      setTappedDay(null);
                      setPickerOpen(false);
                    }}
                  >
                    <Text style={{ color: theme.text, fontSize: 16, flex: 1 }} numberOfLines={1}>
                      {h.name}
                    </Text>
                    {selected ? <Text style={{ color: theme.accent, fontSize: 15 }}>✓</Text> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={styles.sheetHandle} />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  title: { fontSize: 26, fontWeight: 'bold', letterSpacing: -0.5 },
  headerSub: { fontSize: 12, marginTop: 2 },
  empty: { textAlign: 'center', marginTop: 40, lineHeight: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  iconBtnPressed: { transform: [{ scale: 0.92 }], opacity: 0.85 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardPinned: { elevation: 4, shadowOpacity: 0.35, shadowRadius: 10 },
  cardPressed: { transform: [{ scale: 0.985 }], opacity: 0.92 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center' },
  cardMenuBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  cardTitle: { fontSize: 18, fontWeight: '600', flex: 1 },
  cardGridWrap: { alignItems: 'center', marginTop: 12 },
  cardTapHint: { fontSize: 11, textAlign: 'center', marginTop: 8 },
  sectionLabel: { fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 10, gap: 8 },
  sectionDot: { width: 6, height: 6, borderRadius: 3 },
  sectionLine: { flex: 1, height: 1, marginLeft: 4 },
  addBtn: {
    position: 'absolute',
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    elevation: 4,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  addBtnPressed: { transform: [{ scale: 0.96 }], opacity: 0.92 },
  addLabel: { color: '#fff', fontSize: 15, fontFamily: fontFamilyMedium },
  messageBtn: {
    position: 'absolute',
    left: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  messageBtnPressed: { transform: [{ scale: 0.92 }], opacity: 0.9 },
  messageCard: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    borderRadius: 20,
    padding: 24,
    paddingTop: 36,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  messageClose: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 8,
    borderRadius: 16,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  modalCard: {
    borderRadius: 20,
    padding: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheetCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(128,128,128,0.4)',
    marginTop: 14,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 15,
    borderRadius: 14,
  },
  sheetCancel: {
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 8,
    backgroundColor: 'rgba(128,128,128,0.12)',
  },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  btnGhost: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 9 },
  btnSolid: {
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 9,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 8 },
  navArrow: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  spanBtn: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 7 },
  quickHoursRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  quickHourBtn: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
  streakBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  timerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 12,
  },
  statLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  streakSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  streakCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  streakLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  streakNumber: { fontSize: 60, fontFamily: fontFamilyMedium, lineHeight: 66 },
  longestValue: { fontSize: 30, fontFamily: fontFamilyMedium, marginTop: 6 },
  flameWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,122,45,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    elevation: 3,
    shadowColor: '#FF7A2D',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  flame: { fontSize: 34 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
});
