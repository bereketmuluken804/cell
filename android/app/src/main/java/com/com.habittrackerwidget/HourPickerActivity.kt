package com.habittrackerwidget

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Dialog-style picker launched when a day cell on the habit widget is tapped.
 * Mirrors the in-app "Log hours" dialog (quick amounts + custom + reset).
 */
class HourPickerActivity : Activity() {

    companion object {
        private const val EXTRA_HABIT_ID = "habitId"
        private const val EXTRA_DATE_KEY = "dateKey"

        fun intentFor(context: Context, appWidgetId: Int, habitId: String, dateKey: String): Intent =
            Intent(context, HourPickerActivity::class.java).apply {
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                putExtra(EXTRA_HABIT_ID, habitId)
                putExtra(EXTRA_DATE_KEY, dateKey)
            }
    }

    private var appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID
    private var habitId: String = ""
    private var dateKey: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.hour_picker)

        appWidgetId = intent?.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
            ?: AppWidgetManager.INVALID_APPWIDGET_ID
        habitId = intent?.getStringExtra(EXTRA_HABIT_ID) ?: ""
        dateKey = intent?.getStringExtra(EXTRA_DATE_KEY) ?: ""

        val habit = HabitStore.findHabit(this, habitId)
        if (habit == null || dateKey.isEmpty()) {
            // No day was tapped (open space / header / future cell): send the user
            // into the app on this habit's view instead of showing the picker.
            if (habit != null) openHabitInApp()
            finish()
            return
        }

        val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
        if (dateKey > today) {
            Toast.makeText(this, "Wait till you reach this day", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        findViewById<TextView>(R.id.picker_title).text = habit.optString("name", "Habit")
        findViewById<TextView>(R.id.picker_subtitle).text = dateKey

        val current = habit.optJSONObject("days")?.optDouble(dateKey, 0.0) ?: 0.0
        val pickerHours = findViewById<EditText>(R.id.picker_hours)
        pickerHours.setText(if (current > 0) GridRenderer.formatHoursLabel(current) else "")

        // Mirror the in-app hh:mm auto-format: "230" -> "2:30" as the user types.
        // Text already carrying a decimal point passes through; anything else
        // (including the colon the mask itself inserted) is re-masked from its
        // digits so "1:200" -> "12:00" as the 4th digit lands.
        pickerHours.addTextChangedListener(object : TextWatcher {
            private var editing = false
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                if (editing || s == null) return
                val text = s.toString()
                if (text.contains('.')) return
                val masked = maskHours(text)
                if (masked != text) {
                    editing = true
                    s.replace(0, s.length, masked)
                    pickerHours.setSelection(s.length)
                    editing = false
                }
            }
        })

        val quick = doubleArrayOf(0.5, 1.0, 1.5, 2.0, 3.0, 4.0, 6.0, 8.0)
        for (i in quick.indices) {
            val btn = findViewById<Button>(getIdentifier("btn_quick_$i"))
            btn.setOnClickListener { logHours(quick[i]); }
        }

        findViewById<Button>(R.id.btn_log).setOnClickListener {
            val text = findViewById<EditText>(R.id.picker_hours).text.toString()
            val h = parseHoursText(text)
            if (h == null || h < 0) {
                Toast.makeText(this, "Enter a valid number", Toast.LENGTH_SHORT).show()
            } else {
                logHours(h)
            }
        }
        findViewById<Button>(R.id.btn_reset).setOnClickListener { logHours(0.0) }
        findViewById<Button>(R.id.btn_cancel).setOnClickListener { finish() }
    }

    private fun getIdentifier(name: String): Int {
        val id = resources.getIdentifier(name, "id", packageName)
        return if (id != 0) id else R.id.btn_quick_0
    }

    /**
     * Launches the app on this habit's view via the same deep link the app
     * already listens for (habittracker://habit/<id>), both cold and warm start.
     */
    private fun openHabitInApp() {
        try {
            val intent = Intent(this, MainActivity::class.java).apply {
                action = Intent.ACTION_VIEW
                data = Uri.parse("habittracker://habit/$habitId")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            }
            startActivity(intent)
        } catch (e: Exception) {
            // ignore
        }
    }

    /** Accepts "2:30" or "2.5"; returns null when the input is invalid. */
    private fun parseHoursText(text: String): Double? {
        val t = text.trim()
        if (t.isEmpty()) return null
        val colon = t.indexOf(':')
        if (colon >= 0) {
            val hh = t.substring(0, colon).toIntOrNull() ?: return null
            if (!t.substring(colon + 1).matches(Regex("\\d+"))) return null
            val mm = t.substring(colon + 1).toIntOrNull() ?: return null
            if (mm > 59) return null
            return hh + mm / 60.0
        }
        return t.toDoubleOrNull()
    }

    /** Auto-formats typed digits into hh:mm, mirroring the app's maskHours(). */
    private fun maskHours(raw: String): String {
        val digits = raw.replace(Regex("[^0-9]"), "").take(4)
        if (digits.isEmpty()) return ""
        if (digits.length <= 2) return digits.toInt().toString()
        val hours = minOf(digits.dropLast(2).toInt(), 24)
        val minutes = minOf(digits.takeLast(2).toInt(), 59)
        return "$hours:${minutes.toString().padStart(2, '0')}"
    }

    private fun logHours(hours: Double) {
        val habits = HabitStore.getHabits(this)
        var found = false
        for (i in 0 until habits.length()) {
            val h = habits.getJSONObject(i)
            if (h.optString("id") == habitId) {
                val days = h.optJSONObject("days") ?: JSONObject()
                if (hours <= 0) days.remove(dateKey)
                else days.put(dateKey, Math.min(hours, 24.0))
                h.put("days", days)
                found = true
                break
            }
        }
        if (!found) {
            finish()
            return
        }
        HabitStore.saveHabits(this, habits)

        val manager = AppWidgetManager.getInstance(this)
        HabitWidgetProvider.updateWidget(this, manager, appWidgetId)
        finish()
    }
}
