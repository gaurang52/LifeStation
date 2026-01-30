package com.lifestation

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.util.Log
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
    logGoogleMapsApiKey()
    loadReactNative(this)
    createNotificationChannels()
  }

  private fun logGoogleMapsApiKey() {
    try {
      val pm = packageManager
      val appInfo = pm.getApplicationInfo(packageName, PackageManager.GET_META_DATA)
      val bundle: Bundle? = appInfo.metaData
      val apiKey: String? = bundle?.getString("com.google.android.geo.API_KEY")
      
      if (apiKey != null && apiKey.isNotEmpty()) {
        // Log first 10 and last 4 characters for debugging (masked for security)
        val maskedKey = if (apiKey.length > 14) {
          "${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}"
        } else {
          "***"
        }
        Log.d("MainApplication", "Google Maps API Key found: $maskedKey (length: ${apiKey.length})")
        Log.d("MainApplication", "Package name: $packageName")
        Log.d("MainApplication", "If map is blank, ensure API key restrictions allow package: $packageName")
        Log.d("MainApplication", "Debug SHA-1: 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25")
      } else {
        Log.e("MainApplication", "Google Maps API Key NOT FOUND in AndroidManifest.xml!")
        Log.e("MainApplication", "Please check AndroidManifest.xml meta-data tag")
      }
    } catch (e: Exception) {
      Log.e("MainApplication", "Error reading Google Maps API Key: ${e.message}", e)
    }
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
