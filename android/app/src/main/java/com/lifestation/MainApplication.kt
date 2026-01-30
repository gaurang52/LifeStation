package com.lifestation

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
    createNotificationChannels()
  }

  private fun createNotificationChannels() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val notificationManager = getSystemService(NotificationManager::class.java)

      // Default notification channel
      val defaultChannel = NotificationChannel(
        "default",
        "Default Notifications",
        NotificationManager.IMPORTANCE_DEFAULT
      ).apply {
        description = "Default notifications for LifeStation"
        enableVibration(true)
        enableLights(true)
      }

      // Emergency alerts channel (high priority)
      val emergencyChannel = NotificationChannel(
        "emergency_alerts",
        "Emergency Alerts",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "Critical emergency alerts and help requests"
        enableVibration(true)
        enableLights(true)
        setShowBadge(true)
      }

      notificationManager.createNotificationChannel(defaultChannel)
      notificationManager.createNotificationChannel(emergencyChannel)
    }
  }
}
