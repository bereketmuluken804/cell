package com.habittrackerwidget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject
import java.util.Calendar

class HabitWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_PREV = "com.habittrackerwidget.action.PREV_MONTH"
        const val ACTION_NEXT = "com.habittrackerwidget.action.NEXT_MONTH"
        const val ACTION_START_TIMER = "com.habittrackerwidget.action.START_TIMER"
        const val ACTION_TODAY = "com.habittrackerwidget.action.TODAY"

        fun refreshAll(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, HabitWidgetProvider::class.java))
            updateWidgets(context, manager, ids)
            TimerService.sync(context)
        }

        private fun updateWidgets(context: Context, manager: AppWidgetManager, ids: IntArray) {
            for (id in ids) {
                val habitId = HabitStore.getWidgetHabitId(context, id)
                if (habitId != null && HabitStore.findHabit(context, habitId) == null) {
                    // The bound habit was deleted in the app. The OS no longer lets
                    // a provider remove its own widget, so render an inert
                    // "Habit deleted" placeholder and forget the binding.
                    showDeletedPlaceholder(context, manager, id)
                } else {
                    updateWidget(context, manager, id)
                }
            }
            TimerService.sync(context)
        }

        private fun showDeletedPlaceholder(context: Context, manager: AppWidgetManager, appWidgetId: Int) {
            val theme = HabitStore.prefs(context).getString("theme", "dark") ?: "dark"
            val palette = ThemePalette.forName(theme)
            val views = RemoteViews(context.packageName, R.layout.habit_widget)
            views.setInt(R.id.widget_root, "setBackgroundColor", palette.bg)
            views.setTextViewText(R.id.txt_habit_name, "Habit deleted")
            views.setTextColor(R.id.txt_habit_name, palette.text)
            views.setTextViewText(R.id.txt_month, "")
            views.setTextViewText(R.id.txt_summary, "")
            views.setViewVisibility(R.id.widget_grid_img, View.GONE)
            views.setViewVisibility(R.id.row_nav, View.GONE)
            views.setViewVisibility(R.id.row_timer, View.GONE)
            cleanupWidgetPrefs(context, appWidgetId)
            manager.updateAppWidget(appWidgetId, views)
        }

        private fun cleanupWidgetPrefs(context: Context, appWidgetId: Int) {
            val prefs = HabitStore.prefs(context).edit()
            prefs.remove("widget_$appWidgetId")
            prefs.remove("widget_${appWidgetId}_style")
            prefs.remove("widget_${appWidgetId}_monthOffset")
            prefs.apply()
        }

        fun updateWidget(context: Context, manager: AppWidgetManager, appWidgetId: Int) {
            val habitId = HabitStore.getWidgetHabitId(context, appWidgetId) ?: return
            val habit = HabitStore.findHabit(context, habitId) ?: return
            val monthOffset = HabitStore.getWidgetMonthOffset(context, appWidgetId)
            val today = Calendar.getInstance()

            val theme = HabitStore.prefs(context).getString("theme", "dark") ?: "dark"
            val palette = ThemePalette.forName(theme)
            val bgColor = palette.bg
            val textColor = palette.text
            val mutedColor = palette.muted
            val gridSpan = HabitStore.prefs(context).getInt("gridSpan", 1)

            val views = RemoteViews(context.packageName, R.layout.habit_widget)

            views.setInt(R.id.widget_root, "setBackgroundColor", bgColor)
            views.setTextColor(R.id.txt_habit_name, textColor)
            views.setTextColor(R.id.txt_month, textColor)
            views.setTextColor(R.id.txt_timer, textColor)
            views.setTextColor(R.id.txt_summary, mutedColor)

            views.setTextViewText(R.id.txt_habit_name, habit.optString("name", ""))
            views.setTextViewText(R.id.txt_month, GridRenderer.monthTitleMulti(monthOffset, gridSpan, today))
            views.setTextViewText(R.id.txt_summary, GridRenderer.summary(habit, monthOffset, today, gridSpan))

            val (timerText, running) = timerState(context, habit, habitId)
            views.setTextViewText(R.id.btn_timer, if (running) "Stop" else "Start")
            views.setInt(
                R.id.btn_timer,
                "setBackgroundResource",
                if (running) palette.timerIdle else palette.timerActive
            )
            views.setTextColor(R.id.btn_timer, if (running) palette.text else Color.WHITE)
            views.setTextViewText(R.id.txt_timer, timerText)

            // The Today button uses the accent color only when the widget is NOT
            // showing the current month, nudging the user back to today.
            val onToday = monthOffset == 0
            views.setInt(
                R.id.btn_today,
                "setBackgroundResource",
                if (!onToday) palette.timerActive else palette.timerIdle
            )
            views.setTextColor(R.id.btn_today, if (!onToday) Color.WHITE else palette.text)

            // Streak status, mirroring the app's habit page (fire icon + label).
            val todayISO = String.format(
                "%04d-%02d-%02d",
                today.get(Calendar.YEAR), today.get(Calendar.MONTH) + 1, today.get(Calendar.DAY_OF_MONTH)
            )
            val streak = Streaks.compute(habit.optJSONObject("days"), todayISO)
            val streakLabel = when (streak.status) {
                Streaks.Status.ACTIVE -> "🔥 ${streak.current}d streak"
                Streaks.Status.AT_RISK -> "🔥 ${streak.current}d streak log today!"
                Streaks.Status.BROKEN -> "🔥 no streak yet"
            }
            views.setTextViewText(R.id.txt_streak, streakLabel)
            views.setTextColor(
                R.id.txt_streak,
                if (streak.status == Streaks.Status.AT_RISK) Color.parseColor("#D29922") else mutedColor
            )

            views.setImageViewResource(R.id.btn_prev, palette.arrowLeft)
            views.setImageViewResource(R.id.btn_next, palette.arrowRight)

            val openHabit = openHabitPendingIntent(context, appWidgetId, habitId)

            // Anything around/above the grid (habit name, month label, the
            // container's outer padding) opens the app on this habit.
            views.setOnClickPendingIntent(R.id.txt_habit_name, openHabit)
            views.setOnClickPendingIntent(R.id.txt_month, openHabit)
            views.setOnClickPendingIntent(R.id.grid_container, openHabit)

            // Calendar grid rendered as a density-scaled bitmap, so it stays crisp
            // and keeps the cell aspect ratio when resized. Tapping the grid
            // (or any padding around it) opens the app on this habit. A RemoteViews
            // collection with per-day "log hours" taps was tried but broke the
            // host's add-widget flow, so per-tile taps were dropped.
            val gridBitmap = GridRenderer.renderMulti(
                habit, monthOffset, gridSpan,
                HabitStore.getWidgetStyle(context, appWidgetId),
                today, palette, scale = context.resources.displayMetrics.density.coerceAtLeast(1f)
            )
            views.setImageViewBitmap(R.id.widget_grid_img, gridBitmap)
            views.setOnClickPendingIntent(R.id.widget_grid_img, openHabit)

            views.setOnClickPendingIntent(R.id.btn_prev, intent(context, appWidgetId, ACTION_PREV))
            views.setOnClickPendingIntent(R.id.btn_next, intent(context, appWidgetId, ACTION_NEXT))
            views.setOnClickPendingIntent(R.id.btn_timer, intent(context, appWidgetId, ACTION_START_TIMER))
            views.setOnClickPendingIntent(R.id.btn_today, intent(context, appWidgetId, ACTION_TODAY))

            TimerService.sync(context)

            manager.updateAppWidget(appWidgetId, views)
        }

        /**
         * Elapsed display for a habit: the hours already logged for the timer's
         * day are the base, and any running time is added on top. Returns the
         * label and whether the timer is currently running.
         */
        fun timerState(context: Context, habit: JSONObject, habitId: String?): Pair<String, Boolean> {
            val start = HabitStore.getTimerStart(context, habitId)
            val running = start > 0L
            val dayKey = if (running) TimerDate.keyFor(start) else TimerDate.keyFor(System.currentTimeMillis())
            val baseMs = (habit.optJSONObject("days")?.optDouble(dayKey, 0.0) ?: 0.0) * 3600000.0
            val ms = baseMs + if (running) (System.currentTimeMillis() - start).toDouble() else 0.0
            return Pair(formatElapsed(ms.toLong()), running)
        }

        /** Cheap per-second refresh while a timer is running: counter + button only. */
        fun tickTimer(context: Context, manager: AppWidgetManager, appWidgetId: Int) {
            val habitId = HabitStore.getWidgetHabitId(context, appWidgetId)
            val habit = if (!habitId.isNullOrEmpty()) HabitStore.findHabit(context, habitId) else null
            if (habit == null) return
            val (timerText, running) = timerState(context, habit, habitId)
            val theme = HabitStore.prefs(context).getString("theme", "dark") ?: "dark"
            val palette = ThemePalette.forName(theme)
            val views = RemoteViews(context.packageName, R.layout.habit_widget)
            views.setTextViewText(R.id.txt_timer, timerText)
            views.setTextViewText(R.id.btn_timer, if (running) "Stop" else "Start")
            views.setInt(
                R.id.btn_timer,
                "setBackgroundResource",
                if (running) palette.timerIdle else palette.timerActive
            )
            views.setTextColor(R.id.btn_timer, if (running) palette.text else Color.WHITE)
            // Partial update only — a full updateAppWidget would replace the whole
            // widget view and wipe the grid adapter + all click intents.
            manager.partiallyUpdateAppWidget(appWidgetId, views)
        }

        fun formatElapsed(elapsedMs: Long): String {
            val secs = elapsedMs / 1000
            val h = secs / 3600
            val m = (secs % 3600) / 60
            val s = secs % 60
            return String.format("%02d:%02d:%02d", h, m, s)
        }

        /**
         * Stops the habit timer and commits the elapsed time to the day the
         * timer started on. Returns elapsed ms, or -1 if no timer was running.
         */
        fun stopTimer(context: Context, habitId: String): Long {
            val start = HabitStore.getTimerStart(context, habitId)
            if (start <= 0L) return -1L
            HabitStore.clearTimer(context, habitId)
            var elapsed = System.currentTimeMillis() - start
            if (elapsed < 0L) elapsed = 0L

            val hours = elapsed / 3600000.0
            val dateKey = TimerDate.keyFor(start)
            val habits = HabitStore.getHabits(context)
            for (i in 0 until habits.length()) {
                val h = habits.getJSONObject(i)
                if (h.optString("id") == habitId) {
                    val days = h.optJSONObject("days") ?: JSONObject()
                    val existing = days.optDouble(dateKey, 0.0)
                    val rounded = Math.round((existing + hours) * 100.0) / 100.0
                    days.put(dateKey, Math.min(rounded, 24.0))
                    h.put("days", days)
                    break
                }
            }
            HabitStore.saveHabits(context, habits)
            return elapsed
        }

        private fun intent(context: Context, appWidgetId: Int, action: String): PendingIntent {
            val i = Intent(context, HabitWidgetProvider::class.java).apply {
                setAction(action)
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
            }
            return PendingIntent.getBroadcast(
                context, appWidgetId, i,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }

        /** Opens the app on this habit's detail screen (where hours are logged). */
        private fun openHabitPendingIntent(context: Context, appWidgetId: Int, habitId: String): PendingIntent {
            val open = Intent(
                Intent.ACTION_VIEW,
                Uri.parse("habittracker://habit/$habitId"),
                context,
                MainActivity::class.java
            )
            return PendingIntent.getActivity(
                context,
                appWidgetId,
                open,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }

    }

    override fun onUpdate(context: Context, manager: AppWidgetManager, appWidgetIds: IntArray) {
        updateWidgets(context, manager, appWidgetIds)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        val appWidgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, -1)
        if (appWidgetId < 0) return
        val manager = AppWidgetManager.getInstance(context)
        when (intent.action) {
            ACTION_PREV -> {
                HabitStore.setWidgetMonthOffset(context, appWidgetId,
                    HabitStore.getWidgetMonthOffset(context, appWidgetId) - 1)
                updateWidget(context, manager, appWidgetId)
            }
            ACTION_NEXT -> {
                HabitStore.setWidgetMonthOffset(context, appWidgetId,
                    HabitStore.getWidgetMonthOffset(context, appWidgetId) + 1)
                updateWidget(context, manager, appWidgetId)
            }
            ACTION_START_TIMER -> {
                val habitId = HabitStore.getWidgetHabitId(context, appWidgetId)
                if (!habitId.isNullOrEmpty()) {
                    if (HabitStore.isTimerRunning(context, habitId)) {
                        stopTimer(context, habitId)
                    } else {
                        HabitStore.setTimerStart(context, habitId, System.currentTimeMillis())
                    }
                }
                // Re-render after the toggle so the button/counter reflect the new state.
                updateWidget(context, manager, appWidgetId)
            }
            ACTION_TODAY -> {
                HabitStore.setWidgetMonthOffset(context, appWidgetId, 0)
                updateWidget(context, manager, appWidgetId)
            }
        }
    }

    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        for (id in appWidgetIds) {
            cleanupWidgetPrefs(context, id)
        }
        TimerService.sync(context)
    }
}
