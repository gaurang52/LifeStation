const db = require('../../models');
const logger = require('../../utils/logger');
const fcmService = require('../../services/fcm.service');
const { getActiveCaregivers } = require('../../services/critical-event-notification.service');

/**
 * POST /senior/help
 * Send a help/emergency notification to all mapped caregivers
 */
const sendHelpNotification = async (req, res) => {
  try {
    const userId = req.user_id;
    const userType = req.user_type;

    // Only seniors can send help notifications
    if (userType !== 'senior') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only seniors can send help notifications',
      });
    }

    // Get the senior user
    const senior = await db.Users.findByPk(userId, {
      attributes: ['id', 'name', 'email'],
    });

    if (!senior) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Senior user not found',
      });
    }

    // Get active caregivers
    const caregivers = await getActiveCaregivers(senior.id);
    if (caregivers.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'No active caregivers found for this senior',
      });
    }

    const timestamp = new Date();
    const pushTitle = '🚨 Help Requested';

    /** Format time in recipient's timezone (IANA e.g. Asia/Kolkata). Use UTC when timezone not set. */
    const formatTimeForTimezone = tz => {
      const options = {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      };
      if (tz) {
        try {
          Intl.DateTimeFormat(undefined, { timeZone: tz });
          options.timeZone = tz;
        } catch {
          options.timeZone = 'UTC';
        }
      } else {
        options.timeZone = 'UTC';
      }
      return timestamp.toLocaleString('en-US', options);
    };

    const results = {
      sent: 0,
      failed: 0,
      total: caregivers.length,
      errors: [],
    };

    // Send notifications to each caregiver (time formatted per caregiver timezone)
    for (const caregiver of caregivers) {
      try {
        const recipientTimezone = caregiver.extra_info?.timezone || null;
        const formattedTime = formatTimeForTimezone(recipientTimezone);
        const pushMessage = `${
          senior.name || 'Senior'
        } has requested help at ${formattedTime}. Please check the LifeStation app immediately.`;

        // Send push notification
        if (caregiver.fcm_token) {
          try {
            await fcmService.sendNotification(
              caregiver.fcm_token,
              pushTitle,
              pushMessage,
              {
                type: 'help_request',
                senior_id: senior.id.toString(),
                senior_name: senior.name || '',
                timestamp: timestamp.toISOString(),
                emergency: 'true',
                priority: 'critical',
              },
              true, // isEmergency = true
            );

            // Log successful notification
            await db.NotificationLogs.create({
              recipient_id: caregiver.id,
              recipient_fcm_token: caregiver.fcm_token,
              title: pushTitle,
              message: pushMessage,
              status: 'success',
              error_message: null,
              is_emergency: true,
            });

            results.sent++;
          } catch (pushError) {
            logger.error(
              `Failed to send help notification to caregiver ${caregiver.id}:`,
              pushError,
            );
            results.failed++;

            // Log failed notification
            await db.NotificationLogs.create({
              recipient_id: caregiver.id,
              recipient_fcm_token: caregiver.fcm_token,
              title: pushTitle,
              message: pushMessage,
              status: 'failed',
              error_message: pushError.message,
              is_emergency: true,
            });

            results.errors.push({
              caregiverId: caregiver.id,
              error: pushError.message,
            });
          }
        } else {
          logger.debug(`Caregiver ${caregiver.id} has no FCM token, skipping notification`);
          results.failed++;
          results.errors.push({
            caregiverId: caregiver.id,
            error: 'No FCM token available',
          });
        }
      } catch (error) {
        logger.error(`Error processing help notification for caregiver ${caregiver.id}:`, error);
        results.failed++;
        results.errors.push({
          caregiverId: caregiver.id,
          error: error.message,
        });
      }
    }

    logger.info(`Help notification processed:`, {
      seniorId: senior.id,
      caregiversNotified: caregivers.length,
      sent: results.sent,
      failed: results.failed,
    });

    // Return success even if some notifications failed (partial success)
    res.status(200).json({
      message: 'Help notification sent',
      data: {
        senior_id: senior.id,
        senior_name: senior.name,
        timestamp: timestamp.toISOString(),
        notifications: results,
      },
    });
  } catch (error) {
    logger.error('Error in send-help-notification:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to send help notification',
    });
  }
};

module.exports = sendHelpNotification;
