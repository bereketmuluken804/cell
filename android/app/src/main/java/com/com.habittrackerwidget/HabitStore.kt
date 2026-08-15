package com.habittrackerwidget

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

object HabitStore {
    private const val PREFS = "habit_data"
    private const val KEY_HABITS = "habits"

    fun prefs(context: Context): SharedPreferences =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun getHabits(context: Context): JSONArray {
        val raw = prefs(context).getString(KEY_HABITS, "[]") ?: "[]"
        return try {
            JSONArray(raw)
        } catch (e: Exception) {
            JSONArray()
        }
    }

    fun saveHabits(context: Context, habits: JSONArray) {
        prefs(context).edit().putString(KEY_HABITS, habits.toString()).apply()
    }

    fun findHabit(context: Context, habitId: String?): JSONObject? {
        if (habitId.isNullOrEmpty()) return null
        val habits = getHabits(context)
        for (i in 0 until habits.length()) {
            val h = habits.getJSONObject(i)
            if (h.optString("id") == habitId) return h
        }
        return null
    }

    fun getWidgetHabitId(context: Context, appWidgetId: Int): String? =
        prefs(context).getString("widget_$appWidgetId", null)

    fun setWidgetHabitId(context: Context, appWidgetId: Int, habitId: String) {
        prefs(context).edit().putString("widget_$appWidgetId", habitId).apply()
    }

    fun getWidgetStyle(context: Context, appWidgetId: Int): WidgetStyle {
        val raw = prefs(context).getString("widget_${appWidgetId}_style", null)
        val (blackBg, opacity) = if (raw != null) {
            try {
                val j = JSONObject(raw)
                Pair(j.optBoolean("blackBg", true), j.optInt("opacity", 100))
            } catch (e: Exception) {
                Pair(true, 100)
            }
        } else Pair(true, 100)
        return WidgetStyle(blackBg, opacity)
    }

    fun setWidgetStyle(context: Context, appWidgetId: Int, style: WidgetStyle) {
        val j = JSONObject().put("blackBg", style.blackBg).put("opacity", style.opacity)
        prefs(context).edit().putString("widget_${appWidgetId}_style", j.toString()).apply()
    }

    fun getWidgetMonthOffset(context: Context, appWidgetId: Int): Int =
        prefs(context).getInt("widget_${appWidgetId}_monthOffset", 0)

    fun setWidgetMonthOffset(context: Context, appWidgetId: Int, offset: Int) {
        prefs(context).edit().putInt("widget_${appWidgetId}_monthOffset", offset).apply()
    }

    // --- Timer (per habit) ---

    fun getTimerStart(context: Context, habitId: String?): Long {
        if (habitId.isNullOrEmpty()) return 0L
        return prefs(context).getLong("timer_$habitId", 0L)
    }

    fun setTimerStart(context: Context, habitId: String, startAt: Long) {
        prefs(context).edit().putLong("timer_$habitId", startAt).apply()
    }

    fun clearTimer(context: Context, habitId: String) {
        prefs(context).edit().remove("timer_$habitId").apply()
    }

    fun isTimerRunning(context: Context, habitId: String?): Boolean =
        getTimerStart(context, habitId) > 0L
}

data class WidgetStyle(val blackBg: Boolean, val opacity: Int)
