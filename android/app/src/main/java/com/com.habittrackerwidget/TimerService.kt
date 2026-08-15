package com.habittrackerwidget

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper

/**
 * Drives the 1-second timer counter on home-screen widgets.
 *
 * Alarm-based ticking is throttled by Android (doze/light-doze coalesces
 * background exact alarms into multi-second batches), so while any widget
 * habit's timer is running this foreground service posts a Handler tick every
 * second and pushes the elapsed label straight to each widget. It stops itself
 * as soon as no widget timer is running.
 */
class TimerService : Service() {

    private val handler = Handler(Looper.getMainLooper())
    private val tick = object : Runnable {
        override fun run() {
            if (tickWidgets()) handler.postDelayed(this, 1000L) else stopSelf()
        }
    }

    override fun onCreate() {
        super.onCreate()
        createChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIF_ID, buildNotification())
        handler.removeCallbacks(tick)
        handler.post(tick)
        return START_STICKY
    }

    override fun onDestroy() {
        handler.removeCallbacks(tick)
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    /** Refresh every widget whose habit has a running timer. True if any ran. */
    private fun tickWidgets(): Boolean {
        val manager = AppWidgetManager.getInstance(this)
        val ids = manager.getAppWidgetIds(ComponentName(this, HabitWidgetProvider::class.java))
        var any = false
        for (id in ids) {
            if (HabitStore.isTimerRunning(this, HabitStore.getWidgetHabitId(this, id))) {
                HabitWidgetProvider.tickTimer(this, manager, id)
                any = true
            }
        }
        return any
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val channel = NotificationChannel(
            CHANNEL_ID, "Habit timer", NotificationManager.IMPORTANCE_LOW
        ).apply { setShowBadge(false) }
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    private fun buildNotification(): Notification {
        val content = Intent(this, MainActivity::class.java)
        val pi = PendingIntent.getActivity(
            this, 0, content, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
        }
        return builder
            .setContentTitle("Habit timer running")
            .setContentText("Tracking time for your habit widget")
            .setSmallIcon(R.drawable.ic_stop)
            .setContentIntent(pi)
            .setOngoing(true)
            .build()
    }

    companion object {
        private const val NOTIF_ID = 1001
        private const val CHANNEL_ID = "habit_timer"

        /** Start the service while any widget habit timer runs, otherwise stop it. */
        fun sync(context: Context) {
            val app = context.applicationContext
            val manager = AppWidgetManager.getInstance(app)
            val ids = manager.getAppWidgetIds(ComponentName(app, HabitWidgetProvider::class.java))
            val running = ids.any {
                HabitStore.isTimerRunning(app, HabitStore.getWidgetHabitId(app, it))
            }
            val intent = Intent(app, TimerService::class.java)
            if (running) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) app.startForegroundService(intent)
                else app.startService(intent)
            } else {
                app.stopService(intent)
            }
        }
    }
}
