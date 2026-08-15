package com.habittrackerwidget

import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone

/**
 * Kotlin port of the app's src/streaks.ts computeStreaks so the widget can show
 * the same streak status as the habit page. Day math is anchored to UTC to
 * match the JS Date.UTC behavior.
 */
object Streaks {

    enum class Status { ACTIVE, AT_RISK, BROKEN }

    data class Info(
        val current: Int,
        val status: Status,
        val longest: Int,
        val longestStart: String?,
        val longestEnd: String?
    )

    private const val DAY_MS = 86400000L

    private fun toIndex(iso: String): Long {
        val parts = iso.split("-")
        val utc = Calendar.getInstance(TimeZone.getTimeZone("UTC")).apply {
            clear()
            set(parts[0].toInt(), parts[1].toInt() - 1, parts[2].toInt())
        }.timeInMillis
        return Math.floorDiv(utc, DAY_MS)
    }

    private val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    private fun toISO(index: Long): String = dateFormat.format(java.util.Date(index * DAY_MS))

    fun compute(days: JSONObject?, todayISO: String): Info {
        val active = days?.keys()?.asSequence()
            ?.filter { days.optDouble(it, 0.0) > 0 }
            ?.toList()?.sorted() ?: emptyList()
        val activeSet = active.toHashSet()

        val todayIdx = toIndex(todayISO)

        // Current streak: anchor at today if logged, else yesterday ("at risk").
        var status = Status.BROKEN
        var anchorIdx: Long? = null
        if (activeSet.contains(todayISO)) {
            status = Status.ACTIVE
            anchorIdx = todayIdx
        } else if (activeSet.contains(toISO(todayIdx - 1))) {
            status = Status.AT_RISK
            anchorIdx = todayIdx - 1
        }

        var current = 0
        if (anchorIdx != null) {
            var cursor = anchorIdx
            while (activeSet.contains(toISO(cursor))) {
                current++
                cursor--
            }
        }

        // Longest streak (runs of consecutive active days).
        var longest = 0
        var longestStart: String? = null
        var longestEnd: String? = null
        var run = 0
        var runStart = ""
        var prevIdx: Long? = null
        for (date in active) {
            val idx = toIndex(date)
            if (prevIdx != null && idx == prevIdx + 1) {
                run++
            } else {
                run = 1
                runStart = date
            }
            if (run > longest) {
                longest = run
                longestStart = runStart
                longestEnd = date
            }
            prevIdx = idx
        }

        return Info(current, status, longest, longestStart, longestEnd)
    }
}