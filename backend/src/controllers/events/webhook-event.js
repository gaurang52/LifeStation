const db = require('../../models');
const logger = require('../../utils/logger');
const criticalEventNotificationService = require('../../services/critical-event-notification.service');
const geofenceService = require('../../services/geofence.service');
const { sequelize } = db;
const crypto = require('crypto');

/**
 * Detect Affiliated/Brighton emergency webhook payload (Gil's format).
 * Body: cs_no, eventid, resolutionCode, signaltype, time, location
 */
function isAffiliatedEmergencyPayload(body) {
  return (
    body &&
    typeof body === 'object' &&
    body.eventid != null &&
    body.signaltype != null &&
    body.cs_no != null
  );
}

/**
 * Detect Affiliated/Brighton status webhook payload (Gil's format).
 * Body: imei, cs_no, signal { battery, location, signal_strength, timestamp }
 */
function isAffiliatedStatusPayload(body) {
  return (
    body &&
    typeof body === 'object' &&
    body.imei != null &&
    body.signal != null &&
    typeof body.signal === 'object'
  );
}

/**
 * Map Affiliated signaltype to our critical event codes (B, F, FD, HU, M, RN).
 * Affiliated may send SOS, PANIC, EMERGENCY, Fall Detection, etc.; we map to CRITICAL_EVENT_TYPES.
 * Umbrella sends alerts for both Panic and Fall Detection; we do the same.
 */
function mapAffiliatedSignalTypeToCritical(signaltype) {
  if (!signaltype || typeof signaltype !== 'string') return 'M';
  const upper = signaltype.toUpperCase().replace(/\s+/g, '');
  if (['B', 'F', 'FD', 'HU', 'M', 'RN'].includes(upper)) return upper;
  if (['FALL', 'FALLDETECTION', 'FALL_DETECTION'].includes(upper)) return 'FD';
  if (['SOS', 'PANIC', 'EMERGENCY', 'EM', 'PERSONAL'].includes(upper)) return 'M';
  if (['HOLDUP', 'DURESS'].includes(upper)) return 'HU';
  return 'M'; // default Personal Emergency
}

/**
 * POST /events/webhook
 * Webhook endpoint for receiving real-time events from external APIs.
 * Supports:
 * 1) Affiliated/Brighton emergency format (cs_no, eventid, resolutionCode, signaltype, time, location)
 * 2) Affiliated/Brighton status format (imei, cs_no, signal { battery, location, signal_strength })
 * 3) Generic format (device_id/imei, event_type, location) for backward compatibility
 */
const webhookEvent = async (req, res) => {
  try {
    const eventData = req.body;

    if (!eventData || typeof eventData !== 'object') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Event data is required',
      });
    }

    // ---------- 1) Affiliated/Brighton EMERGENCY payload ----------
    if (isAffiliatedEmergencyPayload(eventData)) {
      const { cs_no, eventid, resolutionCode, signaltype, time, location } = eventData;

      logger.info('Affiliated emergency webhook received:', {
        cs_no,
        eventid,
        resolutionCode: resolutionCode != null ? 'set' : 'null',
        signaltype,
        timestamp: new Date().toISOString(),
      });

      const context = await criticalEventNotificationService.getSeniorForCsNo(cs_no);
      if (!context || !context.device || !context.senior) {
        logger.warn('No senior/device found for Affiliated emergency cs_no:', { cs_no });
        return res.status(200).json({
          success: true,
          message: 'Event received (no mapping for cs_no)',
          source: 'affiliated_emergency',
        });
      }

      const deviceId = context.device.device_id;
      const idType = context.device.id_type || 'imei';

      const normalizedEvent = {
        device_id: deviceId,
        id_type: idType,
        signal_type: mapAffiliatedSignalTypeToCritical(signaltype),
        eventrpt_id: mapAffiliatedSignalTypeToCritical(signaltype),
        event_time: time || new Date().toISOString(),
        eventtime: time || new Date().toISOString(),
        timestamp: time || new Date().toISOString(),
        location: location || null,
        eventid,
        resolutionCode: resolutionCode != null ? resolutionCode : null,
        cs_no,
      };

      if (resolutionCode == null || resolutionCode === '') {
        // New emergency: notify caregivers
        const result = await criticalEventNotificationService.processCriticalEvent(
          normalizedEvent,
          deviceId,
          idType,
        );

        try {
          await db.AllEvents.create({
            deviceid: deviceId,
            vendorcode: 'affiliated',
            eventtime: normalizedEvent.event_time
              ? new Date(normalizedEvent.event_time)
              : new Date(),
            eventtype: 'Emergency',
            eventid: String(eventid),
            rawevent: { ...eventData, source: 'affiliated_emergency' },
          });
        } catch (storeErr) {
          logger.warn(
            'Could not store emergency in AllEvents (duplicate eventid?):',
            storeErr.message,
          );
        }

        if (result.processed) {
          return res.status(200).json({
            success: true,
            message: 'Emergency processed and notifications sent',
            source: 'affiliated_emergency',
            eventrptId: result.eventrptId,
            notificationsSent: {
              push: result.notificationResults.pushNotifications.sent,
              sms: result.notificationResults.smsAlerts.sent,
            },
          });
        }

        return res.status(200).json({
          success: false,
          message: 'Event received but could not be processed',
          reason: result.reason,
          source: 'affiliated_emergency',
        });
      }

      // Emergency resolved (resolutionCode set)
      try {
        await db.AllEvents.create({
          deviceid: deviceId,
          vendorcode: 'affiliated',
          eventtime: new Date(),
          eventtype: 'Emergency Resolved',
          eventid: `${eventid}-resolved-${Date.now()}`,
          rawevent: { ...eventData, source: 'affiliated_emergency_resolved' },
        });
      } catch (storeErr) {
        logger.warn('Could not store resolved event in AllEvents:', storeErr.message);
      }

      return res.status(200).json({
        success: true,
        message: 'Emergency resolved event received',
        source: 'affiliated_emergency_resolved',
      });
    }

    // ---------- 2) Affiliated/Brighton STATUS payload ----------
    if (isAffiliatedStatusPayload(eventData)) {
      const { imei, cs_no, signal } = eventData;
      const deviceId = imei;

      logger.info('Affiliated status webhook received:', {
        imei,
        cs_no,
        hasLocation: !!(signal && signal.location),
        hasBattery: !!(signal && signal.battery),
        timestamp: new Date().toISOString(),
      });

      const location =
        signal.location && (signal.location.latitude != null || signal.location.longitude != null)
          ? {
              latitude: parseFloat(signal.location.latitude),
              longitude: parseFloat(signal.location.longitude),
            }
          : null;

      if (location && !isNaN(location.latitude) && !isNaN(location.longitude)) {
        let transaction;
        let geofenceResult = null;
        try {
          transaction = await sequelize.transaction();
          geofenceResult = await geofenceService.checkGeofenceStatus(deviceId, location, {
            vendor: 'affiliated',
            eventTime: signal.timestamp || new Date(),
            transaction,
          });
          await transaction.commit();
        } catch (geoErr) {
          if (transaction) await transaction.rollback();
          logger.error('Geofence error in Affiliated status webhook:', geoErr.message);
        }
        if (geofenceResult && geofenceResult.notifyCaregivers) {
          try {
            await criticalEventNotificationService.notifyCaregiversOfGeofenceEvent(
              geofenceResult,
              deviceId,
              'imei',
            );
          } catch (notifyErr) {
            logger.error('Geofence caregiver notification failed (Affiliated status):', notifyErr);
          }
        }
      }

      try {
        await db.AllEvents.create({
          deviceid: deviceId,
          vendorcode: 'affiliated',
          eventtime: signal.timestamp ? new Date(signal.timestamp) : new Date(),
          eventtype: 'Status Update',
          eventid: `status-${deviceId}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
          rawevent: { ...eventData, source: 'affiliated_status' },
        });
      } catch (storeErr) {
        logger.warn('Could not store status in AllEvents:', storeErr.message);
      }

      return res.status(200).json({
        success: true,
        message: 'Status update received',
        source: 'affiliated_status',
      });
    }

    // ---------- 3) Generic payload (backward compatibility) ----------
    const deviceId = eventData.device_id || eventData.imei || eventData.device_imei;
    const idType = eventData.id_type || 'imei';
    const eventrptId = eventData.eventrpt_id || eventData.signal_type || eventData.event_type;

    if (!deviceId) {
      return res.status(400).json({
        error: 'Invalid request',
        message:
          'device_id, imei, or (for Affiliated) cs_no/eventid/signaltype or imei/signal is required',
      });
    }

    logger.info('Webhook event received (generic):', {
      deviceId,
      idType,
      eventrptId,
      timestamp: new Date().toISOString(),
    });

    const location =
      eventData.location ||
      eventData.gps_location ||
      eventData.coordinates ||
      (eventData.latitude != null && eventData.longitude != null
        ? { latitude: eventData.latitude, longitude: eventData.longitude }
        : null);

    const eventType = eventData.event_type || eventData.eventName || eventrptId;

    if (['Periodic Location', 'Panic'].includes(eventType) && location) {
      let transaction;
      let geofenceResult = null;
      try {
        transaction = await sequelize.transaction();
        geofenceResult = await geofenceService.checkGeofenceStatus(deviceId, location, {
          vendor: eventData.vendor || eventData.vendor_code,
          eventTime:
            eventData.event_time || eventData.eventUtcTime || eventData.eventTime || new Date(),
          transaction,
        });
        await transaction.commit();
      } catch (error) {
        if (transaction) await transaction.rollback();
        logger.error('Error in Geo-fence logic, transaction rolled back:', {
          error: error.message,
          deviceId,
        });
      }
      if (geofenceResult && geofenceResult.notifyCaregivers) {
        try {
          await criticalEventNotificationService.notifyCaregiversOfGeofenceEvent(
            geofenceResult,
            deviceId,
            idType,
          );
        } catch (notifyErr) {
          logger.error('Geofence caregiver notification failed (generic webhook):', notifyErr);
        }
      }
    }

    const isCritical = criticalEventNotificationService.isCriticalEvent(eventData);

    if (isCritical) {
      const result = await criticalEventNotificationService.processCriticalEvent(
        eventData,
        deviceId,
        idType,
      );

      if (result.processed) {
        return res.status(200).json({
          success: true,
          message: 'Critical event processed and notifications sent',
          eventrptId: result.eventrptId,
          notificationsSent: {
            push: result.notificationResults.pushNotifications.sent,
            sms: result.notificationResults.smsAlerts.sent,
          },
        });
      }

      return res.status(200).json({
        success: false,
        message: 'Event received but could not be processed',
        reason: result.reason,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Event received',
      critical: false,
    });
  } catch (error) {
    logger.error('Error processing webhook event:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
    });

    return res.status(200).json({
      success: false,
      message: 'Error processing event',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

module.exports = webhookEvent;
