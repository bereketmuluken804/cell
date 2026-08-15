package com.habittrackerwidget

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import org.json.JSONArray
import java.util.Calendar

class HabitWidgetModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "HabitWidget"

    @ReactMethod
    fun saveHabits(habitsJson: String) {
        try {
            HabitStore.saveHabits(reactApplicationContext, JSONArray(habitsJson))
            HabitWidgetProvider.refreshAll(reactApplicationContext)
        } catch (e: Exception) {
            // ignore malformed payload
        }
    }

    @ReactMethod
    fun refreshWidgets() {
        HabitWidgetProvider.refreshAll(reactApplicationContext)
    }

    @ReactMethod
    fun getHabits(promise: Promise) {
        promise.resolve(HabitStore.getHabits(reactApplicationContext).toString())
    }

    @ReactMethod
    fun consumeOpenedHabitId(promise: Promise) {
        val id = MainActivity.pendingHabitId
        MainActivity.pendingHabitId = null
        promise.resolve(id)
    }

    @ReactMethod
    fun saveTheme(theme: String) {
        try {
            HabitStore.prefs(reactApplicationContext)
                .edit().putString("theme", theme).apply()
            HabitWidgetProvider.refreshAll(reactApplicationContext)
        } catch (e: Exception) {
            // ignore
        }
    }

    @ReactMethod
    fun getTheme(promise: Promise) {
        promise.resolve(
            HabitStore.prefs(reactApplicationContext).getString("theme", "dark")
        )
    }

    @ReactMethod
    fun setMessageSeen() {
        HabitStore.prefs(reactApplicationContext)
            .edit().putBoolean("messageSeen", true).apply()
    }

    @ReactMethod
    fun getMessageSeen(promise: Promise) {
        promise.resolve(
            HabitStore.prefs(reactApplicationContext).getBoolean("messageSeen", false)
        )
    }

    @ReactMethod
    fun setOnboardingSeen() {
        HabitStore.prefs(reactApplicationContext)
            .edit().putBoolean("onboardingSeen", true).apply()
    }

    @ReactMethod
    fun getOnboardingSeen(promise: Promise) {
        promise.resolve(
            HabitStore.prefs(reactApplicationContext).getBoolean("onboardingSeen", false)
        )
    }

    @ReactMethod
    fun saveGridSpan(span: Int) {
        try {
            HabitStore.prefs(reactApplicationContext)
                .edit().putInt("gridSpan", span.coerceIn(1, 3)).apply()
            HabitWidgetProvider.refreshAll(reactApplicationContext)
        } catch (e: Exception) {
            // ignore
        }
    }

    @ReactMethod
    fun getGridSpan(promise: Promise) {
        promise.resolve(
            HabitStore.prefs(reactApplicationContext).getInt("gridSpan", 1)
        )
    }

    @ReactMethod
    fun startTimer(habitId: String) {
        try {
            if (!HabitStore.isTimerRunning(reactApplicationContext, habitId)) {
                HabitStore.setTimerStart(reactApplicationContext, habitId, System.currentTimeMillis())
            }
            HabitWidgetProvider.refreshAll(reactApplicationContext)
        } catch (e: Exception) {
            // ignore
        }
    }

    @ReactMethod
    fun stopTimer(habitId: String, promise: Promise) {
        try {
            val start = HabitStore.getTimerStart(reactApplicationContext, habitId)
            if (start <= 0L) {
                promise.resolve(null)
                return
            }
            val dateKey = TimerDate.keyFor(start)
            val elapsed = HabitWidgetProvider.stopTimer(reactApplicationContext, habitId)
            HabitWidgetProvider.refreshAll(reactApplicationContext)

            val result: WritableMap = Arguments.createMap()
            result.putDouble("elapsedMs", elapsed.toDouble())
            result.putString("dateKey", dateKey)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERR", e.message ?: "stopTimer failed")
        }
    }

    @ReactMethod
    fun getTimerState(habitId: String, promise: Promise) {
        try {
            val start = HabitStore.getTimerStart(reactApplicationContext, habitId)
            val result: WritableMap = Arguments.createMap()
            result.putBoolean("running", start > 0L)
            result.putDouble("startAt", start.toDouble())
            result.putString("dateKey", if (start > 0L) TimerDate.keyFor(start) else "")
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERR", e.message ?: "getTimerState failed")
        }
    }
}
