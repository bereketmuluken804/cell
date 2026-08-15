package com.habittrackerwidget

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import org.json.JSONObject
import java.util.Calendar

object GridRenderer {

    private val DARK_LEVELS = intArrayOf(
        Color.parseColor("#161B22"),
        Color.parseColor("#173426"),
        Color.parseColor("#1B452C"),
        Color.parseColor("#1F5733"),
        Color.parseColor("#236A3A"),
        Color.parseColor("#287E42"),
        Color.parseColor("#2C934B")
    )

    private val LIGHT_LEVELS = intArrayOf(
        Color.parseColor("#DBDBD6"),
        Color.parseColor("#E2EAE1"),
        Color.parseColor("#C5E0C9"),
        Color.parseColor("#A3D2AE"),
        Color.parseColor("#7DBE8D"),
        Color.parseColor("#53A76C"),
        Color.parseColor("#2E8E4F")
    )

private const val CELL = 34f
    private const val GAP = 4f

    fun levelsFor(isDark: Boolean): IntArray = if (isDark) DARK_LEVELS else LIGHT_LEVELS

    fun levelForHours(hours: Double, goal: Double = 8.0): Int {
        if (hours <= 0) return 0
        val g = maxOf(goal, 0.5)
        val step = g / 7.0
        return Math.ceil(hours / step).toInt().coerceIn(1, 6)
    }

    fun render(habit: JSONObject, monthOffset: Int, widgetStyle: WidgetStyle, today: Calendar, palette: ThemePalette.Palette): Bitmap {
        return renderMulti(habit, monthOffset, 1, widgetStyle, today, palette, scale = 1f)
    }

    /** Width (px) of the bitmap at scale=1 for a given span. */
    fun baseWidth(span: Int): Int {
        val cols = 7
        val labelCol = 12f
        var total = 0
        for (i in 0 until span) {
            total += (GAP + labelCol + GAP + cols * (CELL + GAP)).toInt()
            if (i < span - 1) total += (GAP * 2).toInt()
        }
        return total
    }

    fun renderMulti(
        habit: JSONObject,
        centerOffset: Int,
        span: Int,
        widgetStyle: WidgetStyle,
        today: Calendar,
        palette: ThemePalette.Palette,
        scale: Float = 1f
    ): Bitmap {
        val cell = CELL * scale
        val gap = GAP * scale
        val labelRowH = 14f * scale
        val labelColW = 12f * scale
        val corner = 4f * scale

        val bgColor = palette.bg
        val levels = palette.levels
        val opacityAlpha = (widgetStyle.opacity.coerceIn(0, 100) * 255 / 100)

        val cols = 7
        val days = habit.optJSONObject("days")
        val goal = habit.optDouble("goal", 8.0).coerceIn(0.5, 20.0)
        val todayKey = String.format("%04d-%02d-%02d",
            today.get(Calendar.YEAR), today.get(Calendar.MONTH) + 1, today.get(Calendar.DAY_OF_MONTH))

        // Calculate widths for each month
        data class MonthInfo(val width: Int, val numWeeks: Int, val year: Int, val month: Int, val daysInMonth: Int, val firstDow: Int)
        val months = mutableListOf<MonthInfo>()
        var totalWidth = 0
        val offsets = span - 1
        for (i in 0 until span) {
            val cal = Calendar.getInstance()
            cal.set(Calendar.YEAR, today.get(Calendar.YEAR))
            cal.set(Calendar.MONTH, today.get(Calendar.MONTH) + centerOffset - offsets / 2 + i)
            cal.set(Calendar.DAY_OF_MONTH, 1)
            cal.set(Calendar.HOUR_OF_DAY, 0)
            cal.set(Calendar.MINUTE, 0)
            cal.set(Calendar.SECOND, 0)
            cal.set(Calendar.MILLISECOND, 0)
            val year = cal.get(Calendar.YEAR)
            val month = cal.get(Calendar.MONTH)
            val daysInMonth = cal.getActualMaximum(Calendar.DAY_OF_MONTH)
            val firstDow = firstDayOfWeek(cal)
            val numWeeks = ((firstDow + daysInMonth - 1) / 7) + 1
            val w = (gap + labelColW + gap + cols * (cell + gap)).toInt()
            months.add(MonthInfo(w, numWeeks, year, month, daysInMonth, firstDow))
            totalWidth += w
            if (i < span - 1) totalWidth += (gap * 2).toInt()
        }
        val maxWeeks = months.maxOf { it.numWeeks }
        val height = (labelRowH + gap + maxWeeks * (cell + gap) + gap).toInt()

        val bitmap = Bitmap.createBitmap(totalWidth, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(bgColor)

        val labelColor = palette.label
        val labelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = labelColor
            textSize = 10f * scale
            textAlign = Paint.Align.CENTER
        }
        val cellPaint = Paint(Paint.ANTI_ALIAS_FLAG)
        val todayBorderColor = palette.text
        val borderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeWidth = 2f * scale
            color = todayBorderColor
        }
        val emptyBorderColor = withAlpha(palette.muted, 30)
        val emptyBorderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeWidth = 0.5f * scale
            color = emptyBorderColor
        }
        val labels = listOf("S", "M", "T", "W", "T", "F", "S")
        val dayLabelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = labelColor
            textSize = 8f * scale
            textAlign = Paint.Align.RIGHT
        }

        var xOffset = 0
        for (mi in months) {
            // Weekday labels across the top
            for (c in 0 until 7) {
                val x = xOffset + gap + labelColW + gap + c * (cell + gap) + cell / 2f
                canvas.drawText(labels[c], x, labelRowH - 2f * scale, labelPaint)
            }
            // Week-start day labels on the y-axis
            for (week in 0 until mi.numWeeks) {
                val startDay = week * 7 - mi.firstDow + 1
                if (startDay < 1 || startDay > mi.daysInMonth) continue
                val top = labelRowH + gap + week * (cell + gap)
                canvas.drawText(
                    startDay.toString(),
                    xOffset + gap + labelColW - 2f * scale,
                    top + cell / 2f + 3f * scale,
                    dayLabelPaint
                )
            }
            // Cells
            for (d in 1..mi.daysInMonth) {
                val dow = (mi.firstDow + d - 1) % 7
                val week = (mi.firstDow + d - 1) / 7
                val dateKey = String.format("%04d-%02d-%02d", mi.year, mi.month + 1, d)
                val hours = days?.optDouble(dateKey, 0.0) ?: 0.0
                val level = levelForHours(hours, goal)
                val base = levels[level]
                val alpha = if (level == 0 && palette.dark) (0.55 * opacityAlpha).toInt() else opacityAlpha
                cellPaint.color = withAlpha(base, alpha)

                val left = xOffset + gap + labelColW + gap + dow * (cell + gap)
                val top = labelRowH + gap + week * (cell + gap)
                val rect = RectF(left, top, left + cell, top + cell)
                canvas.drawRoundRect(rect, corner, corner, cellPaint)

                if (dateKey == todayKey) {
                    canvas.drawRoundRect(rect, corner, corner, borderPaint)
                } else if (level == 0) {
                    canvas.drawRoundRect(rect, corner, corner, emptyBorderPaint)
                }
            }
            xOffset += mi.width + (gap * 2).toInt()
        }

return bitmap
    }

    private fun withAlpha(color: Int, alpha: Int): Int =
        Color.argb(alpha.coerceIn(0, 255), Color.red(color), Color.green(color), Color.blue(color))

    private fun firstDayOfWeek(cal: Calendar): Int {
        val clone = cal.clone() as Calendar
        clone.set(Calendar.DAY_OF_MONTH, 1)
        val dow = clone.get(Calendar.DAY_OF_WEEK)
        return dow - Calendar.SUNDAY
    }

    fun monthTitle(monthOffset: Int, today: Calendar): String {
        val cal = Calendar.getInstance()
        cal.set(Calendar.YEAR, today.get(Calendar.YEAR))
        cal.set(Calendar.MONTH, today.get(Calendar.MONTH) + monthOffset)
        cal.set(Calendar.DAY_OF_MONTH, 1)
        val fmt = java.text.SimpleDateFormat("MMMM yyyy", java.util.Locale.getDefault())
        return fmt.format(cal.time)
    }

    fun monthTitleMulti(centerOffset: Int, span: Int, today: Calendar): String {
        if (span <= 1) return monthTitle(centerOffset, today)
        val fmt = java.text.SimpleDateFormat("MMM", java.util.Locale.getDefault())
        val yFmt = java.text.SimpleDateFormat("yyyy", java.util.Locale.getDefault())
        val offsets = span - 1
        val cal1 = Calendar.getInstance()
        cal1.set(Calendar.YEAR, today.get(Calendar.YEAR))
        cal1.set(Calendar.MONTH, today.get(Calendar.MONTH) + centerOffset - offsets / 2)
        val cal3 = Calendar.getInstance()
        cal3.set(Calendar.YEAR, today.get(Calendar.YEAR))
        cal3.set(Calendar.MONTH, today.get(Calendar.MONTH) + centerOffset - offsets / 2 + (span - 1))
        val sameYear = cal1.get(Calendar.YEAR) == cal3.get(Calendar.YEAR)
        return if (sameYear) {
            "${fmt.format(cal1.time)} – ${fmt.format(cal3.time)} ${yFmt.format(cal1.time)}"
        } else {
            "${fmt.format(cal1.time)} ${yFmt.format(cal1.time)} – ${fmt.format(cal3.time)} ${yFmt.format(cal3.time)}"
        }
    }

    fun summary(habit: JSONObject, monthOffset: Int, today: Calendar, span: Int): String {
        var total = 0.0
        var activeDays = 0
        val days = habit.optJSONObject("days")
        val offsets = span - 1
        for (i in 0 until span) {
            val cal = Calendar.getInstance()
            cal.set(Calendar.YEAR, today.get(Calendar.YEAR))
            cal.set(Calendar.MONTH, today.get(Calendar.MONTH) + monthOffset - offsets / 2 + i)
            cal.set(Calendar.DAY_OF_MONTH, 1)
            val year = cal.get(Calendar.YEAR)
            val month = cal.get(Calendar.MONTH)
            val daysInMonth = cal.getActualMaximum(Calendar.DAY_OF_MONTH)
            for (d in 1..daysInMonth) {
                val key = String.format("%04d-%02d-%02d", year, month + 1, d)
                val hours = days?.optDouble(key, 0.0) ?: 0.0
                if (hours > 0) { total += hours; activeDays++ }
            }
        }
        val totalStr = formatHoursLabel(total)
        val label = if (span > 1) "total" else "this month"
        return "$totalStr $label  |  $activeDays active days"
    }

    /** Formats hours as hh:mm ("2.5" -> "2:30", "8" -> "8:00"). */
    fun formatHoursLabel(hours: Double): String {
        val h = Math.floor(hours)
        val m = Math.round((hours - h) * 60)
        val totalMinutes = h.toInt() * 60 + m.toInt()
        val hh = totalMinutes / 60
        val mm = totalMinutes % 60
        return String.format("%d:%02d", hh, mm)
    }
}
