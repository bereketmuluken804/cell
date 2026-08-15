package com.habittrackerwidget

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object TimerDate {
    /** Local date key (YYYY-MM-DD) for the day containing the start of a timer run. */
    fun keyFor(epochMs: Long): String {
        val fmt = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        return fmt.format(Date(epochMs))
    }
}