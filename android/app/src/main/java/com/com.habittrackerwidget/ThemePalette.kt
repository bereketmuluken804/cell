package com.habittrackerwidget

import android.graphics.Color

/**
 * Per-theme widget colors. The theme is chosen globally in the app
 * (dark/light/pink/orange); the widget derives every color from here so all
 * four themes render consistently on the home screen.
 */
object ThemePalette {

    data class Palette(
        val bg: Int,
        val text: Int,
        val muted: Int,
        val label: Int,
        val levels: IntArray,
        val arrowLeft: Int,
        val arrowRight: Int,
        val todayDrawable: Int,
        val timerIdle: Int,
        val timerActive: Int,
        val dark: Boolean
    )

    val DARK = Palette(
        bg = Color.BLACK,
        text = Color.WHITE,
        muted = Color.parseColor("#B0FFFFFF"),
        label = Color.parseColor("#B0FFFFFF"),
        levels = intArrayOf(
            Color.parseColor("#161B22"), Color.parseColor("#173426"), Color.parseColor("#1B452C"),
            Color.parseColor("#1F5733"), Color.parseColor("#236A3A"), Color.parseColor("#287E42"),
            Color.parseColor("#2C934B")
        ),
        arrowLeft = R.drawable.ic_arrow_left,
        arrowRight = R.drawable.ic_arrow_right,
        todayDrawable = R.drawable.bg_cell_today,
        timerIdle = R.drawable.bg_btn_dark,
        timerActive = R.drawable.bg_btn_dark_active,
        dark = true
    )

    val LIGHT = Palette(
        bg = Color.parseColor("#F6F6F4"),
        text = Color.parseColor("#1A1A18"),
        muted = Color.parseColor("#9A968C"),
        label = Color.parseColor("#9A968C"),
        levels = intArrayOf(
            Color.parseColor("#DBDBD6"), Color.parseColor("#E2EAE1"), Color.parseColor("#C5E0C9"),
            Color.parseColor("#A3D2AE"), Color.parseColor("#7DBE8D"), Color.parseColor("#53A76C"),
            Color.parseColor("#2E8E4F")
        ),
        arrowLeft = R.drawable.ic_arrow_left_dark,
        arrowRight = R.drawable.ic_arrow_right_dark,
        todayDrawable = R.drawable.bg_cell_today_light,
        timerIdle = R.drawable.bg_btn_light,
        timerActive = R.drawable.bg_btn_light_active,
        dark = false
    )

    val PINK = Palette(
        bg = Color.parseColor("#FFF5F7"),
        text = Color.parseColor("#4A1F2B"),
        muted = Color.parseColor("#B98A96"),
        label = Color.parseColor("#A76A7B"),
        levels = intArrayOf(
            Color.parseColor("#FBEAF2"), Color.parseColor("#F9D5E9"), Color.parseColor("#F8C0E1"),
            Color.parseColor("#F6AAD8"), Color.parseColor("#F595CF"), Color.parseColor("#F380C6"),
            Color.parseColor("#F26BBE")
        ),
        arrowLeft = R.drawable.ic_arrow_left_dark,
        arrowRight = R.drawable.ic_arrow_right_dark,
        todayDrawable = R.drawable.bg_cell_today_pink,
        timerIdle = R.drawable.bg_btn_pink,
        timerActive = R.drawable.bg_btn_pink_active,
        dark = false
    )

    val ORANGE = Palette(
        bg = Color.parseColor("#1A140E"),
        text = Color.parseColor("#F0E2D2"),
        muted = Color.parseColor("#948170"),
        label = Color.parseColor("#C6B298"),
        levels = intArrayOf(
            Color.parseColor("#2A1F14"), Color.parseColor("#4D2F18"), Color.parseColor("#713F1C"),
            Color.parseColor("#944F21"), Color.parseColor("#B75F25"), Color.parseColor("#DB6F29"),
            Color.parseColor("#FE7F2D")
        ),
        arrowLeft = R.drawable.ic_arrow_left,
        arrowRight = R.drawable.ic_arrow_right,
        todayDrawable = R.drawable.bg_cell_today,
        timerIdle = R.drawable.bg_btn_orange,
        timerActive = R.drawable.bg_btn_orange_active,
        dark = true
    )

    fun forName(theme: String): Palette = when (theme) {
        "light" -> LIGHT
        "pink" -> PINK
        "orange" -> ORANGE
        else -> DARK
    }
}
