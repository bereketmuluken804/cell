package com.habittrackerwidget

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.SeekBar
import android.widget.Spinner
import android.widget.Switch
import android.widget.TextView
import android.widget.Toast
import org.json.JSONObject

class WidgetConfigActivity : Activity() {

    private lateinit var spinner: Spinner
    private lateinit var switchBlackBg: Switch
    private lateinit var seekOpacity: SeekBar
    private lateinit var txtOpacity: TextView
    private var habitIds: MutableList<String> = mutableListOf()
    private var appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setResult(RESULT_CANCELED)
        appWidgetId = intent?.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
            ?: AppWidgetManager.INVALID_APPWIDGET_ID
        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish()
            return
        }

        setContentView(R.layout.widget_config)
        spinner = findViewById(R.id.spinner_habit)
        switchBlackBg = findViewById(R.id.switch_black_bg)
        seekOpacity = findViewById(R.id.seek_opacity)
        txtOpacity = findViewById(R.id.txt_opacity_value)
        val save: Button = findViewById(R.id.btn_save)

        val habits = HabitStore.getHabits(this)
        val names = mutableListOf<String>()
        for (i in 0 until habits.length()) {
            val h = habits.getJSONObject(i)
            names.add(h.optString("name"))
            habitIds.add(h.optString("id"))
        }

        if (names.isEmpty()) {
            Toast.makeText(this, R.string.config_no_habits, Toast.LENGTH_LONG).show()
            finish()
            return
        }

        spinner.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, names)

        val style = HabitStore.getWidgetStyle(this, appWidgetId)
        switchBlackBg.isChecked = style.blackBg
        seekOpacity.progress = style.opacity
        txtOpacity.text = "${style.opacity}%"

        seekOpacity.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: SeekBar, progress: Int, fromUser: Boolean) {
                txtOpacity.text = "$progress%"
            }
            override fun onStartTrackingTouch(seekBar: SeekBar) {}
            override fun onStopTrackingTouch(seekBar: SeekBar) {}
        })

        save.setOnClickListener {
            val index = spinner.selectedItemPosition
            val habitId = habitIds.getOrNull(index) ?: return@setOnClickListener
            HabitStore.setWidgetHabitId(this, appWidgetId, habitId)
            HabitStore.setWidgetStyle(this, appWidgetId,
                WidgetStyle(switchBlackBg.isChecked, seekOpacity.progress))
            HabitStore.setWidgetMonthOffset(this, appWidgetId, 0)

            val manager = AppWidgetManager.getInstance(this)
            HabitWidgetProvider.updateWidget(this, manager, appWidgetId)

            val result = Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
            setResult(RESULT_OK, result)
            finish()
        }
    }
}
