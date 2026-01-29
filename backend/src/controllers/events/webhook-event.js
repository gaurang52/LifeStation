const db = require('../../models');
const logger = require('../../utils/logger');
const criticalEventNotificationService = require('../../services/critical-event-notification.service');

/**
 * POST /events/webhook
 * Webhook endpoint for receiving real-time events from external APIs
 * This endpoint can be called by external systems when events occur
 */
const webhookEvent = async (req, res) => {
  try {
    const eventData = req.body;

    // Validate request body
    if (!eventData) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Event data is required',
      });
    }

    // Extract event information
    const deviceId = eventData.device_id || eventData.imei || eventData.device_imei;
    const idType = eventData.id_type || 'imei';
    const eventrptId = eventData.eventrpt_id || eventData.signal_type || eventData.event_type;

    if (!deviceId) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'device_id is required',
      });
    }

    logger.info('Webhook event received:', {
      deviceId,
      idType,
      eventrptId,
      timestamp: new Date().toISOString(),
    });

    // Check if this is a critical event
    const isCritical = criticalEventNotificationService.isCriticalEvent(eventData);

    if (isCritical) {
      logger.info('Critical event detected via webhook:', {
        eventrptId,
        deviceId,
      });

      // Process critical event notification
      const result = await criticalEventNotificationService.processCriticalEvent(
        eventData,
        deviceId,
        idType,
      );

      if (result.processed) {
        logger.info('Critical event notification processed successfully:', {
          eventrptId: result.eventrptId,
          seniorId: result.seniorId,
          notificationResults: result.notificationResults,
        });

        return res.status(200).json({
          success: true,
          message: 'Critical event processed and notifications sent',
          eventrptId: result.eventrptId,
          notificationsSent: {
            push: result.notificationResults.pushNotifications.sent,
            sms: result.notificationResults.smsAlerts.sent,
          },
        });
      } else {
        logger.warn('Critical event could not be processed:', {
          reason: result.reason,
          error: result.error,
        });

        return res.status(200).json({
          success: false,
          message: 'Event received but could not be processed',
          reason: result.reason,
        });
      }
    } else {
      // Non-critical event - just acknowledge receipt
      logger.debug('Non-critical event received via webhook:', {
        eventrptId,
        deviceId,
      });

      return res.status(200).json({
        success: true,
        message: 'Event received',
        critical: false,
      });
    }
  } catch (error) {
    logger.error('Error processing webhook event:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
    });

    // Return 200 to prevent webhook retries for processing errors
    // External systems should handle retries based on response content
    return res.status(200).json({
      success: false,
      message: 'Error processing event',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

module.exports = webhookEvent;
