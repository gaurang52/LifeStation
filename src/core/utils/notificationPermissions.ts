import { Platform, PermissionsAndroid } from 'react-native';
import messaging from '@react-native-firebase/messaging';

/**
 * Request notification permission for Android (API 33+)
 * For Android 12 and below, notifications are enabled by default
 */
const requestAndroidNotificationPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    const androidVersion = Platform.Version as number;

    // Android 13+ (API 33+) requires runtime permission
    if (androidVersion >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: 'Notification Permission',
          message:
            'LifeStation needs notification permission to send you important alerts and help requests from caregivers.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'Allow',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    // Android 12 and below: notifications are enabled by default
    return true;
  } catch (err) {
    console.warn('Android notification permission request error:', err);
    return false;
  }
};

/**
 * Request notification permission for iOS
 */
const requestIOSNotificationPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios') {
    return true;
  }

  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    return enabled;
  } catch (err) {
    console.warn('iOS notification permission request error:', err);
    return false;
  }
};

/**
 * Request notification permission for the current platform
 * This will show the native permission popup
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'android') {
      return await requestAndroidNotificationPermission();
    } else if (Platform.OS === 'ios') {
      return await requestIOSNotificationPermission();
    }
    return false;
  } catch (err) {
    console.error('Notification permission request error:', err);
    return false;
  }
};

/**
 * Check if notification permission is already granted
 */
export const checkNotificationPermission = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'android') {
      const androidVersion = Platform.Version as number;
      // Android 13+ (API 33+) requires runtime permission check
      if (androidVersion >= 33) {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        return granted;
      }
      // Android 12 and below: notifications are enabled by default
      return true;
    } else if (Platform.OS === 'ios') {
      const authStatus = await messaging().hasPermission();
      return (
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL
      );
    }
    return false;
  } catch (err) {
    console.error('Notification permission check error:', err);
    return false;
  }
};
