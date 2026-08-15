# Cell

Cell is a habit tracker built around a month grid. Every day is one square. Log hours and the square fills in, darker with more time. It looks like a GitHub contribution graph, one square per day, and it lives on your home screen.

The grid does the talking. A checklist tells you whether you did a thing. A wall of cells shows how much, and how consistent, across weeks and months.

## Log hours

Type `2:30` or `2.5`. The input auto-formats as you type, so `1200` becomes `12:00`, and pasting `2:30` stays `2:30`. Tap any past day to backdate or correct it.

Each habit has a daily goal in hours, 8 by default. Shading runs on a seven-step scale against that goal, so a light square and a dark square mean different things on different habits.

## Streaks

Cell reports a current streak and a longest streak, with the dates of the longest run. Skip today and the streak turns at risk. Skip two days and it breaks. No silent reset.

## Timer

Timing is built in. The count-up timer runs as a foreground service, so it keeps counting when you leave the app. Stop it and the elapsed time is logged.

## Home screen widget

The widget is plain Android, rendering the grid natively. Add as many as you like, one per habit. It shows the month grid, the current streak, and a row of controls: previous and next month, a timer start, and a jump to today. Tapping the grid opens the app.

When you add a widget, a config screen asks which habit it should show and how it should look. Black background and tile opacity are per widget, so two widgets can look different.

## Themes

Dark and light, plus a few accent palettes. Set once, applied across the app.

## Data

There is no account and no server. All data lives on the device, written to SharedPreferences.

## Project layout

```
App.tsx                       app UI
src/hoursInput.ts             hh:mm input mask
src/streaks.ts                streak math
src/levels.ts                 cell shading levels
src/Onboarding.tsx            first-run screens
src/HabitGrid.tsx             month grid components
android/app/src/main/java/com/com.habittrackerwidget/
                              native widget, timer service, config
```

## Getting started

```
npm install
npm start
npm run android
```

Run it on a device or emulator. The app itself also builds for iOS, though the widget is Android-only.

## Tests

```
npm test
npm run lint
npx tsc --noEmit
```

Jest covers the streak math, the level shading, the hour input mask, and onboarding.

## Building a release APK

```
cd android
./gradlew assembleRelease
```

Set `JAVA_HOME` to the Android Studio JBR if Gradle cannot find Java. The APK lands in `android/app/build/outputs/apk/release/app-release.apk`.

## Stack

React Native 0.86 and React 19 on the app side, TypeScript throughout. The widget is Kotlin: GridRenderer, HabitStore, Streaks, ThemePalette, and a timer service, reading the same SharedPreferences the app writes.
