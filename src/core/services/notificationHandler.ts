import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { Alert } from 'react-native';
import { logger } from '@core/utils/logger';

/**
 * Handle foreground notifications (when app is open)
 * This must be called before the app renders
 */
export const setupForegroundNotificationHandler = () => {
  messaging().onMessage(async remoteMessage => {
    logger.info('Foreground notification received:', {
      title: remoteMessage.notification?.title,
      body: remoteMessage.notification?.body,
      data: remoteMessage.data,
    });

    // Show an alert for foreground notifications
    if (remoteMessage.notification) {
      Alert.alert(
        remoteMessage.notification.title || 'Notification',
        remoteMessage.notification.body || '',
        [{ text: 'OK' }],
      );
    }
  });
};

/**
 * Handle background notifications
 * This must be called at the top level of index.js (outside React components)
 */
export const setupBackgroundNotificationHandler = () => {
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    logger.info('Background notification received:', {
      title: remoteMessage.notification?.title,
      body: remoteMessage.notification?.body,
      data: remoteMessage.data,
    });
  });
};

/**
 * Handle notification when app is opened from a notification tap
 */
export const setupNotificationOpenedHandler = (
  onNotificationOpened?: (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => void,
) => {
  // Check if app was opened from a notification
  messaging()
    .getInitialNotification()
    .then(remoteMessage => {
      if (remoteMessage) {
        logger.info('App opened from notification:', {
          title: remoteMessage.notification?.title,
          body: remoteMessage.notification?.body,
          data: remoteMessage.data,
        });
        if (onNotificationOpened) {
          onNotificationOpened(remoteMessage);
        }
      }
    });

  // Handle notification opened when app is in background
  messaging().onNotificationOpenedApp(remoteMessage => {
    logger.info('Notification opened app:', {
      title: remoteMessage.notification?.title,
      body: remoteMessage.notification?.body,
      data: remoteMessage.data,
    });
    if (onNotificationOpened) {
      onNotificationOpened(remoteMessage);
    }
  });
};

/**
 * Setup all notification handlers
 */
export const setupNotificationHandlers = (
  onNotificationOpened?: (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => void,
) => {
  setupForegroundNotificationHandler();
  setupNotificationOpenedHandler(onNotificationOpened);
};
