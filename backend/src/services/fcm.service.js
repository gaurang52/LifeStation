const admin = require('../config/firebase-config');
const db = require('../models');
const logger = require('../utils/logger');

/**
 * Send a single notification
 * @param {string} deviceToken - FCM device token
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {object} data - Additional data payload
 * @param {boolean} isEmergency - Whether this is an emergency notification
 * @returns {Promise<object|null>} - FCM response or null
 */
const sendNotification = async (deviceToken, title, message, data = {}, isEmergency = false) => {
  if (!deviceToken) {
    logger.warn('No device token provided, skipping notification');
    return null;
  }

  const messagePayload = {
    token: deviceToken,
    notification: {
      title: title,
      body: message,
    },
    data: data || {},
  };

  // Configure platform-specific settings based on emergency status
  if (isEmergency) {
    // Emergency notification configuration for DND bypass
    messagePayload.android = {
      priority: 'high',
      notification: {
        sound: 'default',
        channelId: 'emergency_alerts',
        priority: 'high',
        visibility: 'public',
        defaultSound: true,
        defaultVibrateTimings: true,
      },
    };

    messagePayload.apns = {
      headers: {
        'apns-priority': '10',
        'apns-push-type': 'alert',
      },
      payload: {
        aps: {
          sound: 'default',
          contentAvailable: true,
          interruptionLevel: 'critical',
          relevanceScore: 1.0,
        },
      },
    };
  } else {
    // Standard notification configuration
    messagePayload.apns = {
      payload: {
        aps: {
          sound: 'default',
          contentAvailable: true,
        },
      },
    };

    messagePayload.android = {
      notification: {
        sound: 'default',
      },
    };
  }

  try {
    const response = await admin.messaging().send(messagePayload);
    logger.info('Notification sent successfully:', response);
    return response;
  } catch (error) {
    logger.error('Error sending notification:', error);

    // Handle invalid token
    if (error.errorInfo?.code === 'messaging/registration-token-not-registered') {
      try {
        await db.Users.update({ fcm_token: null }, { where: { fcm_token: deviceToken } });
        logger.info('Removed invalid FCM token from user record');
      } catch (updateError) {
        logger.error('Error removing invalid FCM token:', updateError);
      }
    }
    throw error;
  }
};

/**
 * Send multiple notifications
 * @param {Array} notifications - Array of notification objects
 * @returns {Promise<Array>} - Array of results
 */
const sendNotifications = async notifications => {
  logger.info('Sending notifications:', notifications.length);
  const results = [];

  for (const notification of notifications) {
    const isEmergency =
      notification.data?.emergency === 'true' ||
      notification.data?.priority === 'critical' ||
      notification.is_emergency === true;

    const message = {
      token: notification.token,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data || {},
    };

    // Configure platform-specific settings
    if (isEmergency) {
      message.android = {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'emergency_alerts',
          priority: 'high',
          visibility: 'public',
          defaultSound: true,
          defaultVibrateTimings: true,
        },
      };

      message.apns = {
        headers: {
          'apns-priority': '10',
          'apns-push-type': 'alert',
        },
        payload: {
          aps: {
            sound: 'default',
            contentAvailable: true,
            interruptionLevel: 'critical',
            relevanceScore: 1.0,
          },
        },
      };
    } else {
      message.apns = {
        payload: {
          aps: {
            sound: 'default',
            contentAvailable: true,
          },
        },
      };

      message.android = {
        notification: {
          sound: 'default',
        },
      };
    }

    try {
      const response = await admin.messaging().send(message);
      logger.info('Successfully sent message:', response);
      results.push(response);

      await db.NotificationLogs.create({
        recipient_id: notification.recipient_id || null,
        recipient_fcm_token: notification.token,
        title: notification.title,
        message: notification.body,
        status: 'success',
        error_message: null,
        is_emergency: isEmergency,
      });
    } catch (error) {
      logger.error('Error sending notification:', error);
      results.push({ error: error.message });

      // Handle invalid token
      if (error.errorInfo?.code === 'messaging/registration-token-not-registered') {
        try {
          await db.Users.update({ fcm_token: null }, { where: { fcm_token: notification.token } });
          logger.info('Removed invalid FCM token from user record');
        } catch (updateError) {
          logger.error('Error removing invalid FCM token:', updateError);
        }
      }

      await db.NotificationLogs.create({
        recipient_id: notification.recipient_id || null,
        recipient_fcm_token: notification.token,
        title: notification.title,
        message: notification.body,
        status: 'failed',
        error_message: error.message,
        is_emergency: isEmergency,
      });
    }
  }

  return results;
};

module.exports = {
  sendNotification,
  sendNotifications,
};
