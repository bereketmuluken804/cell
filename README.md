# Cell — Habit Tracker

A friendly habit tracker that puts your monthly progress grid right on the home screen. Log your time each day and watch the cells fill in as your consistency builds.

Cell is named after those squares: each day is one cell. The more hours you log, the darker it becomes. Over a month, you get a clear visual picture of your consistency—something a simple checklist cannot capture as effectively.

## Screenshots

A quick tour of what you'll see when you first launch Cell.

| **Welcome** | **Log Hours** | **Home Screen Widget** | **Streaks** |
| ----------- | ------------- | ---------------------- | ----------- |
| ![Welcome screen](assets/onboarding_home.jpg) | ![Logging hours](assets/onboarding_log.jpg) | ![The widget on your home screen](assets/onboarding_widget.jpg) | ![Streak progress](assets/onboarding_streaks.jpg) |

## Features

* **Native Android widget** — Display your monthly habit grid directly on your home screen. Add a widget for each habit and browse different months without opening the app.
* **Time-based tracking** — Log the number of hours spent on a habit each day.
* **Daily goals** — Set a daily goal for each habit, with cell shading scaled relative to that goal.
* **Streak tracking** — Track consecutive days and see when your current streak is at risk or has been broken.
* **Built-in timer** — Start a count-up timer that continues running as a foreground service when you leave the app.
* **Themes and accents** — Choose between light and dark themes with several accent palettes.
* **Onboarding** — A simple first-run experience that introduces the core features of the app.

## Getting Started

Cell is a React Native application. From the project directory:

```bash
npm install
npm start
npm run android
```

This runs the application on a connected Android device or emulator. The widget is Android-specific, while the React Native application can also be built for iOS.

## Usage

Tap any day on the grid to log hours. You can also backdate entries to correct or complete previous days.

Each habit has its own daily goal, with **8 hours as the default**. Cell shading is calculated relative to that goal, making your progress comparable across habits with different targets.

Streaks are displayed with both a count and a status, so you can quickly see where your current streak stands.

## Project Layout

```text
App.tsx
  Main application UI

src/streaks.ts
  Streak calculation logic

src/levels.ts
  Cell shading levels

src/Onboarding.tsx
  First-run onboarding screens

src/HabitGrid.tsx
  Monthly habit grid components

android/app/src/main/java/com/com.habittrackerwidget/
  Native Android widget, timer service, and configuration
```

## Tests

```bash
npm test
npm run lint
npx tsc --noEmit
```

Jest covers the streak calculations, shading levels, and onboarding screens.

## Building a Release APK

```bash
cd android
./gradlew assembleRelease
```

If Gradle cannot find Java, set `JAVA_HOME` to the Android Studio JBR.

The generated APK is located at:

```text
android/app/build/outputs/apk/release/app-release.apk
```

## Data

No account, server, or signup is required. All data is stored locally on your device.

## Stack

Cell is built with **React Native 0.86**, **React 19**, and **TypeScript**.

The native Android functionality is written in **Kotlin**, including the home screen widget, grid rendering, habit storage, streak calculations, theme handling, and timer service. The native components and React Native application share data through `SharedPreferences`.
