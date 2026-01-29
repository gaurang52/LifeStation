import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import {
  checkNotificationPermission,
  requestNotificationPermission,
} from '@core/utils/notificationPermissions';

/**
 * Register device for remote messages (iOS only)
 * This must be called before getToken() on iOS
 * Can be called multiple times safely - Firebase handles duplicate registrations
 */
export const registerDeviceForRemoteMessages = async (): Promise<void> => {
  if (Platform.OS === 'ios') {
    try {
      await messaging().registerDeviceForRemoteMessages();
      console.log('Device registered for remote messages');
    } catch (error: unknown) {
      // If already registered, Firebase may throw an error, but that's okay
      // We'll still try to get the token
      const firebaseError = error as { code?: string; message?: string };
      if (firebaseError?.code !== 'messaging/already-registered') {
        console.error('Error registering device for remote messages:', error);
        // Don't throw - we'll still try to get token
      }
    }
  }
};

/**
 * Get the Firebase Cloud Messaging (FCM) token for the current device
 * This function ensures notification permissions are granted before retrieving the token.
 * @returns Promise<string> - The FCM token
 * @throws Error if token retrieval fails or permissions are denied
 */
export const getFCMToken = async (): Promise<string> => {
  try {
    // Check if notification permission is granted
    const hasPermission = await checkNotificationPermission();

    // If permission is not granted, request it
    if (!hasPermission) {
      const permissionGranted = await requestNotificationPermission();
      if (!permissionGranted) {
        throw new Error('Notification permission is required to receive push notifications');
      }
    }

    // Register device for remote messages on iOS (required before getToken)
    await registerDeviceForRemoteMessages();

    // Get the FCM token
    const token = await messaging().getToken();
    if (!token) {
      throw new Error('FCM token is null or undefined');
    }

    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    throw error;
  }
};

/**
 * Delete the FCM token (useful for logout)
 * @returns Promise<void>
 */
export const deleteFCMToken = async (): Promise<void> => {
  try {
    await messaging().deleteToken();
  } catch (error) {
    console.error('Error deleting FCM token:', error);
    throw error;
  }
};
