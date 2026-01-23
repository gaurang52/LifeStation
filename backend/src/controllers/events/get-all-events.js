const reportsApiService = require('../../services/reports-api.service');
const deviceApiService = require('../../services/device-api.service');
const accessControlService = require('../../services/access-control.service');
const db = require('../../models');
const auditLogService = require('../../services/audit-log.service');
const cacheService = require('../../services/cache.service');
const logger = require('../../utils/logger');

/**
 * Calculate date range based on frequency
 * @param {string} frequency - Frequency string
 * @returns {object} - { before, after } dates formatted for Reports API
 */
const getDateRange = frequency => {
  const now = new Date();
  let afterDate;

  switch (frequency) {
    case 'last_24_hours':
      afterDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'last_7_days':
      afterDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'last_30_days':
      afterDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'all':
      afterDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year
      break;
    default:
      afterDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  return {
    before: formatDateForApi(now),
    after: formatDateForApi(afterDate),
  };
};

/**
 * Format date for Reports API (YYYY-MM-DD HH:mm:ss)
 * @param {Date} date - Date to format
 * @returns {string} - Formatted date
 */
const formatDateForApi = date => {
  const pad = n => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

/**
 * Normalize events data from external API response
 * @param {object|Array} externalData - Data from Reports API
 * @returns {Array} - Normalized events array
 */
const normalizeEvents = externalData => {
  if (!externalData) {
    return [];
  }

  let events = [];

  // Handle different possible response formats from Reports API
  if (Array.isArray(externalData)) {
    events = externalData;
  } else if (externalData.data && Array.isArray(externalData.data)) {
    events = externalData.data;
  } else if (externalData.events && Array.isArray(externalData.events)) {
    events = externalData.events;
  } else if (externalData.signals && Array.isArray(externalData.signals)) {
    events = externalData.signals;
  } else if (externalData.recent && Array.isArray(externalData.recent)) {
    events = externalData.recent;
  } else if (externalData.report && Array.isArray(externalData.report)) {
    events = externalData.report;
  } else if (typeof externalData === 'object') {
    // Try to extract events from any array property
    for (const key of Object.keys(externalData)) {
      if (Array.isArray(externalData[key])) {
        events = externalData[key];
        break;
      }
    }
  }

  // Normalize each event to expected format
  return events.map(event => {
    // Map signal_type codes to readable names
    const eventType = mapSignalTypeToEventType(
      event.eventtype || event.event_type || event.type || event.signal_type || event.eventrpt_id,
    );

    return {
      eventtype: eventType,
      eventtime:
        event.eventtime ||
        event.event_time ||
        event.timestamp ||
        event.signal_time ||
        new Date().toISOString(),
      rawevent: {
        location: extractLocation(event),
        originalEvent: event.data || event.original_event || event.raw || event,
        battery: event.battery || event.batt || event.battery_level,
        signal_strength: event.signal_strength || event.signal,
      },
      // Preserve original fields for debugging
      signal_type: event.signal_type || event.eventrpt_id,
      cs_no: event.cs_no,
      device_id: event.device_id || event.imei,
    };
  });
};

/**
 * Extract location from event data
 * @param {object} event - Event object
 * @returns {object|null} - Location object or null
 */
const extractLocation = event => {
  if (event.location) {
    return event.location;
  }
  if (event.gps_location) {
    return event.gps_location;
  }
  if (event.latitude && event.longitude) {
    return {
      latitude: parseFloat(event.latitude),
      longitude: parseFloat(event.longitude),
    };
  }
  if (event.lat && event.lng) {
    return {
      latitude: parseFloat(event.lat),
      longitude: parseFloat(event.lng),
    };
  }
  return null;
};

/**
 * Map signal type codes to readable event types
 * @param {string} signalType - Signal type code
 * @returns {string} - Readable event type
 */
const mapSignalTypeToEventType = signalType => {
  if (!signalType) return 'Unknown Event';

  const signalTypeMap = {
    TT: 'Test Timer',
    TF: 'Test Failed',
    HR: 'Heart Rate',
    FD: 'Fall Detection',
    SOS: 'SOS Alert',
    IN: 'Inactivity Alert',
    LOC: 'Location Update',
    PLOC: 'Periodic Location',
    BAT: 'Battery Alert',
    PANIC: 'Panic Alert',
    EMERGENCY: 'Emergency Alert',
    TEL: 'Telemetry',
    CHK: 'Check-in',
    GEO: 'Geofence Alert',
    PWR: 'Power Event',
    MED: 'Medication Reminder',
  };

  const upperType = signalType.toUpperCase();
  return signalTypeMap[upperType] || signalType;
};

const getAllEvents = async (req, res) => {
  try {
    const { device_id, frequency = 'last_7_days' } = req.body;
    const userId = req.user_id;

    // Validate input
    if (!device_id) {
      return res.status(400).json({
        error: 'device_id is required',
        message: 'Please provide a device_id in the request body',
      });
    }

    // Validate frequency
    const validFrequencies = ['last_24_hours', 'last_7_days', 'last_30_days', 'all'];
    if (!validFrequencies.includes(frequency)) {
      return res.status(400).json({
        error: 'Invalid frequency',
        message: `frequency must be one of: ${validFrequencies.join(', ')}`,
      });
    }

    // Find the device in our database
    let targetDevice = await db.Devices.findOne({
      where: { device_id: device_id },
    });

    if (!targetDevice) {
      // Try to find by IMEI
      targetDevice = await db.Devices.findOne({
        where: { device_imei: device_id },
      });
    }

    if (!targetDevice) {
      return res.status(404).json({
        error: 'Device not found',
        message: 'The specified device was not found in the system',
      });
    }

    // Check access control
    const canAccess = await accessControlService.canUserAccessDevice(
      userId,
      targetDevice.device_id,
      targetDevice.id_type,
    );

    if (!canAccess) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to access events for this device',
      });
    }

    // Get cs_no from device mapping
    const deviceMapping = await db.UserDeviceMapping.findOne({
      where: { device_id: targetDevice.id },
    });

    const csNo = deviceMapping?.cs_no || targetDevice.cs_no;

    if (!csNo) {
      logger.warn(`No cs_no found for device ${device_id} - trying device API instead`);

      // Try to get events from Device API's recent endpoint as fallback
      try {
        const deviceRecent = await deviceApiService.getDeviceRecent(
          targetDevice.id_type,
          targetDevice.device_id,
        );

        // Extract any event-like data from device recent response
        const normalizedEvents = normalizeEvents(deviceRecent);

        return res.status(200).json({
          data: normalizedEvents,
          message: 'Events retrieved from device',
          source: 'device_api',
        });
      } catch (deviceError) {
        logger.warn('Failed to get events from Device API:', deviceError.message);
        return res.status(200).json({
          data: [],
          message: 'No events available. Device may not be configured for event reporting.',
        });
      }
    }

    // Try to get from cache first
    const cacheKey = `events:${csNo}:${frequency}:all`;
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      logger.debug(`Returning cached events for cs_no: ${csNo}`);
      return res.status(200).json({
        data: cached,
        message: 'Events retrieved successfully',
        cached: true,
      });
    }

    // Fetch events from Reports API
    let eventsData = [];
    const dateRange = getDateRange(frequency);

    try {
      // First try the Recent endpoint for recent events
      if (frequency === 'last_24_hours' || frequency === 'last_7_days') {
        const recentData = await reportsApiService.getRecentReports(csNo);
        eventsData = normalizeEvents(recentData);
        logger.debug(`Fetched ${eventsData.length} events from Recent API for cs_no: ${csNo}`);
      }

      // If no events from Recent, or for longer time ranges, use History API
      if (eventsData.length === 0 || frequency === 'last_30_days' || frequency === 'all') {
        try {
          const historyData = await reportsApiService.getEventHistory({
            csNo: csNo,
            before: dateRange.before,
            after: dateRange.after,
          });
          const historyEvents = normalizeEvents(historyData);

          // Merge and deduplicate events
          const eventMap = new Map();
          [...eventsData, ...historyEvents].forEach(event => {
            const key = `${event.eventtime}_${event.eventtype}_${event.cs_no || csNo}`;
            if (!eventMap.has(key)) {
              eventMap.set(key, event);
            }
          });
          eventsData = Array.from(eventMap.values());

          logger.debug(
            `Fetched ${historyEvents.length} events from History API for cs_no: ${csNo}`,
          );
        } catch (historyError) {
          // History API might not be available or might timeout
          logger.warn(
            'History API fetch failed, using Recent API data only:',
            historyError.message,
          );
        }
      }
    } catch (error) {
      logger.error('Error fetching events from Reports API:', {
        error: error.message,
        cs_no: csNo,
        device_id: device_id,
      });

      // Return cached data if available
      if (cached) {
        return res.status(200).json({
          data: cached,
          message: 'Events retrieved from cache (external service temporarily unavailable)',
          cached: true,
          warning: 'Using cached data due to external service unavailability',
        });
      }

      return res.status(500).json({
        error: 'Unable to fetch events',
        message: 'The events service is currently unavailable. Please try again later.',
      });
    }

    // Sort by event time (most recent first)
    eventsData.sort((a, b) => {
      const timeA = new Date(a.eventtime).getTime();
      const timeB = new Date(b.eventtime).getTime();
      return timeB - timeA;
    });

    // Cache for 5 minutes
    await cacheService.set(cacheKey, eventsData, 300);

    // Log audit entry
    await auditLogService.log({
      user_id: userId,
      action: 'events_access',
      resource_type: 'events',
      resource_id: device_id,
      external_api: 'reports',
      request_method: 'POST',
      request_path: '/events/get-all-events',
      response_status: 200,
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    });

    res.status(200).json({
      data: eventsData,
      message: 'Events retrieved successfully',
    });
  } catch (error) {
    logger.error('Error in get-all-events:', {
      error: error.message,
      stack: error.stack,
      device_id: req.body?.device_id,
      user_id: req.user_id,
    });

    if (error.response) {
      return res.status(500).json({
        error: 'Unable to fetch events',
        message: 'The events service encountered an error. Please try again later.',
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message:
        process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred. Please try again later.'
          : error.message,
    });
  }
};

module.exports = getAllEvents;
