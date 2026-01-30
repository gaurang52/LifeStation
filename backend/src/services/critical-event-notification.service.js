const db = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const fcmService = require('./fcm.service');
const smsService = require('./sms.service');

/**
 * Critical event types that trigger caregiver notifications
 */
const CRITICAL_EVENT_TYPES = {
  B: 'Burglary Alarm',
  F: 'Fire',
  HU: 'HoldUp / Panic / Duress',
  M: 'Personal Emergency',
  RN: 'Runaway Notification',
};

/**
 * Check if an event is a critical event
 * @param {object} event - Event object
 * @returns {boolean} - True if event is critical
 */
const isCriticalEvent = event => {
  const eventrptId = event.eventrpt_id || event.signal_type || event.eventtype;
  if (!eventrptId) return false;

  return Object.keys(CRITICAL_EVENT_TYPES).includes(eventrptId.toUpperCase());
};

/**
 * Get event description for a critical event
 * @param {string} eventrptId - Event report ID
 * @returns {string} - Event description
 */
const getEventDescription = eventrptId => {
  if (!eventrptId) return 'Emergency Event';
  return CRITICAL_EVENT_TYPES[eventrptId.toUpperCase()] || 'Emergency Event';
};

/**
 * Get active caregivers for a senior user
 * @param {number} seniorId - Senior user ID
 * @returns {Promise<Array>} - Array of active caregiver objects
 */
const getActiveCaregivers = async seniorId => {
  try {
    const mappings = await db.SeniorCaregiverMapping.findAll({
      where: { senior_id: seniorId },
      include: [
        {
          model: db.Users,
          as: 'caregiver',
          where: {
            status: 'ACTIVATED', // Only active caregivers
          },
          attributes: ['id', 'name', 'email', 'mobile', 'fcm_token', 'notification_enabled'],
        },
      ],
    });

    return mappings
      .map(mapping => mapping.caregiver)
      .filter(caregiver => caregiver !== null && caregiver.notification_enabled !== false);
  } catch (error) {
    logger.error('Error fetching active caregivers:', error);
    return [];
  }
};

/**
 * Get senior user associated with a device
 * @param {string} deviceId - Device ID (IMEI, serial, or UUID)
 * @param {string} idType - Device ID type (imei, serial, uuid, iccid)
 * @returns {Promise<object|null>} - Senior user object or null
 */
const getSeniorForDevice = async (deviceId, idType = null) => {
  try {
    // Find device record
    let device = await db.Devices.findOne({
      where: idType
        ? {
            device_id: deviceId,
            id_type: idType,
          }
        : {
            [Op.or]: [
              { device_id: deviceId },
              { device_imei: deviceId },
              { device_serial: deviceId },
              { device_uuid: deviceId },
            ],
          },
    });

    if (!device) {
      logger.warn(`Device not found: ${deviceId}`);
      return null;
    }

    // Find user-device mapping
    const mapping = await db.UserDeviceMapping.findOne({
      where: { device_id: device.id },
      include: [
        {
          model: db.Users,
          as: 'user',
          where: {
            user_type: 'senior', // Only seniors own devices
          },
          attributes: ['id', 'name', 'email', 'mobile'],
        },
      ],
    });

    return mapping?.user || null;
  } catch (error) {
    logger.error('Error fetching senior for device:', error);
    return null;
  }
};

/**
 * Check if notification was already sent for this event (prevent duplicates)
 * @param {object} event - Event object
 * @param {number} caregiverId - Caregiver user ID
 * @returns {Promise<boolean>} - True if notification already sent
 */
const isNotificationAlreadySent = async (event, caregiverId) => {
  try {
    const eventrptId = event.eventrpt_id || event.signal_type || event.eventtype;
    const eventTime = event.eventtime || event.event_time || event.timestamp;
    const deviceId = event.device_id || event.imei;

    if (!eventrptId || !eventTime || !deviceId) {
      return false; // Can't check without required fields
    }

    // Check if we've sent a notification for this event in the last hour
    // This prevents duplicate notifications for the same event
    const oneHourAgo = new Date(new Date(eventTime).getTime() - 60 * 60 * 1000);
    const oneHourLater = new Date(new Date(eventTime).getTime() + 60 * 60 * 1000);

    const existingNotification = await db.EventNotificationLogs.findOne({
      where: {
        caregiver_id: caregiverId,
        eventrpt_id: eventrptId.toUpperCase(),
        device_id: deviceId,
        event_time: {
          [Op.between]: [oneHourAgo, oneHourLater],
        },
        status: 'success',
      },
    });

    return !!existingNotification;
  } catch (error) {
    logger.error('Error checking if notification already sent:', error);
    return false; // On error, allow notification (fail open)
  }
};

/**
 * Log event notification attempt
 * @param {object} params - Notification log parameters
 * @returns {Promise<object>} - Created log entry
 */
const logEventNotification = async ({
  caregiverId,
  seniorId,
  deviceId,
  eventrptId,
  eventTime,
  notificationType,
  status,
  errorMessage = null,
}) => {
  try {
    return await db.EventNotificationLogs.create({
      caregiver_id: caregiverId,
      senior_id: seniorId,
      device_id: deviceId,
      eventrpt_id: eventrptId.toUpperCase(),
      event_time: eventTime ? new Date(eventTime) : new Date(),
      notification_type: notificationType, // 'push', 'sms', or 'both'
      status: status, // 'success' or 'failed'
      error_message: errorMessage,
    });
  } catch (error) {
    logger.error('Error logging event notification:', error);
    // Don't throw - logging failure shouldn't break notification flow
    return null;
  }
};

/**
 * Send critical event notifications to caregivers
 * @param {object} event - Critical event object
 * @param {object} senior - Senior user object
 * @param {string} deviceName - Device name (optional)
 * @returns {Promise<object>} - Notification results
 */
const notifyCaregiversOfCriticalEvent = async (event, senior, deviceName = null) => {
  const results = {
    pushNotifications: { sent: 0, failed: 0 },
    smsAlerts: { sent: 0, failed: 0 },
    errors: [],
  };

  if (!senior || !senior.id) {
    logger.warn('No senior user provided for critical event notification');
    return results;
  }

  // Get active caregivers
  const caregivers = await getActiveCaregivers(senior.id);
  if (caregivers.length === 0) {
    logger.info(`No active caregivers found for senior ${senior.id}`);
    return results;
  }

  const eventrptId = (
    event.eventrpt_id ||
    event.signal_type ||
    event.eventtype ||
    ''
  ).toUpperCase();
  const eventDescription = getEventDescription(eventrptId);
  const eventTime =
    event.eventtime || event.event_time || event.timestamp || new Date().toISOString();
  const deviceId = event.device_id || event.imei || 'Unknown Device';

  // Format timestamp for display
  const formattedTime = new Date(eventTime).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  // Prepare notification messages
  const pushTitle = `🚨 ${eventDescription} Alert`;
  const pushMessage = `${
    senior.name || 'Senior'
  } has triggered a ${eventDescription.toLowerCase()} alert${
    deviceName ? ` from ${deviceName}` : ''
  } at ${formattedTime}.`;

  const smsMessage = `🚨 EMERGENCY ALERT: ${eventDescription} - ${senior.name || 'Senior'}${
    deviceName ? ` (${deviceName})` : ''
  } - ${formattedTime}. Please check the LifeStation app immediately.`;

  // Send notifications to each caregiver
  for (const caregiver of caregivers) {
    try {
      // Check if notification already sent (prevent duplicates)
      const alreadySent = await isNotificationAlreadySent(event, caregiver.id);
      if (alreadySent) {
        logger.debug(
          `Skipping duplicate notification for caregiver ${caregiver.id} and event ${eventrptId}`,
        );
        continue;
      }

      // Send push notification
      if (caregiver.fcm_token) {
        try {
          await fcmService.sendNotification(
            caregiver.fcm_token,
            pushTitle,
            pushMessage,
            {
              event_type: eventrptId,
              event_description: eventDescription,
              senior_id: senior.id.toString(),
              senior_name: senior.name || '',
              device_id: deviceId,
              device_name: deviceName || '',
              event_time: eventTime,
              emergency: 'true',
              priority: 'critical',
            },
            true, // isEmergency = true
          );

          await logEventNotification({
            caregiverId: caregiver.id,
            seniorId: senior.id,
            deviceId: deviceId,
            eventrptId: eventrptId,
            eventTime: eventTime,
            notificationType: 'push',
            status: 'success',
          });

          results.pushNotifications.sent++;
        } catch (pushError) {
          logger.error(`Failed to send push notification to caregiver ${caregiver.id}:`, pushError);
          results.pushNotifications.failed++;

          await logEventNotification({
            caregiverId: caregiver.id,
            seniorId: senior.id,
            deviceId: deviceId,
            eventrptId: eventrptId,
            eventTime: eventTime,
            notificationType: 'push',
            status: 'failed',
            errorMessage: pushError.message,
          });
        }
      } else {
        logger.debug(`Caregiver ${caregiver.id} has no FCM token, skipping push notification`);
      }

      // Send SMS alert
      if (caregiver.mobile) {
        try {
          await smsService.sendSMS(caregiver.mobile, smsMessage);

          await logEventNotification({
            caregiverId: caregiver.id,
            seniorId: senior.id,
            deviceId: deviceId,
            eventrptId: eventrptId,
            eventTime: eventTime,
            notificationType: 'sms',
            status: 'success',
          });

          results.smsAlerts.sent++;
        } catch (smsError) {
          logger.error(`Failed to send SMS to caregiver ${caregiver.id}:`, smsError);
          results.smsAlerts.failed++;

          await logEventNotification({
            caregiverId: caregiver.id,
            seniorId: senior.id,
            deviceId: deviceId,
            eventrptId: eventrptId,
            eventTime: eventTime,
            notificationType: 'sms',
            status: 'failed',
            errorMessage: smsError.message,
          });
        }
      } else {
        logger.debug(`Caregiver ${caregiver.id} has no mobile number, skipping SMS`);
      }
    } catch (error) {
      logger.error(`Error processing notification for caregiver ${caregiver.id}:`, error);
      results.errors.push({
        caregiverId: caregiver.id,
        error: error.message,
      });
    }
  }

  logger.info(`Critical event notifications processed:`, {
    eventrptId,
    seniorId: senior.id,
    caregiversNotified: caregivers.length,
    pushSent: results.pushNotifications.sent,
    pushFailed: results.pushNotifications.failed,
    smsSent: results.smsAlerts.sent,
    smsFailed: results.smsAlerts.failed,
  });

  return results;
};

/**
 * Process a critical event and notify caregivers
 * @param {object} event - Event object from external API
 * @param {string} deviceId - Device ID (IMEI, serial, or UUID)
 * @param {string} idType - Device ID type (optional)
 * @returns {Promise<object>} - Notification results
 */
const processCriticalEvent = async (event, deviceId, idType = null) => {
  try {
    // Check if this is a critical event
    if (!isCriticalEvent(event)) {
      return { processed: false, reason: 'Not a critical event' };
    }

    // Get senior user for this device
    const senior = await getSeniorForDevice(deviceId, idType);
    if (!senior) {
      logger.warn(`No senior user found for device ${deviceId}`);
      return { processed: false, reason: 'No senior user found for device' };
    }

    // Get device name if available
    let deviceName = null;
    try {
      const device = await db.Devices.findOne({
        where: idType
          ? { device_id: deviceId, id_type: idType }
          : {
              [Op.or]: [
                { device_id: deviceId },
                { device_imei: deviceId },
                { device_serial: deviceId },
                { device_uuid: deviceId },
              ],
            },
      });

      if (device) {
        const mapping = await db.UserDeviceMapping.findOne({
          where: { device_id: device.id },
        });
        deviceName = mapping?.device_name || device.name || null;
      }
    } catch (error) {
      logger.debug('Could not fetch device name:', error.message);
    }

    // Notify caregivers
    const notificationResults = await notifyCaregiversOfCriticalEvent(event, senior, deviceName);

    return {
      processed: true,
      eventrptId: (event.eventrpt_id || event.signal_type || event.eventtype || '').toUpperCase(),
      seniorId: senior.id,
      notificationResults,
    };
  } catch (error) {
    logger.error('Error processing critical event:', error);
    return {
      processed: false,
      reason: 'Error processing event',
      error: error.message,
    };
  }
};

module.exports = {
  isCriticalEvent,
  getEventDescription,
  getActiveCaregivers,
  getSeniorForDevice,
  processCriticalEvent,
  notifyCaregiversOfCriticalEvent,
  CRITICAL_EVENT_TYPES,
};
