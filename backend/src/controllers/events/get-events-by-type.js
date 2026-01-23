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
      afterDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
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
 * Map user-friendly event type to signal type codes for Reports API
 * @param {string} eventType - User-friendly event type
 * @returns {Array<string>} - Signal type codes for Reports API
 */
const mapEventTypeToSignalTypes = eventType => {
  if (!eventType || eventType.toLowerCase() === 'all') {
    return null; // No filter - get all types
  }

  const normalizedType = eventType.toLowerCase();

  // Map user-friendly event types to signal type codes
  const eventTypeMap = {
    'periodic location': ['LOC', 'PLOC', 'GEO'],
    location: ['LOC', 'PLOC', 'GEO'],
    telemetry: ['TEL', 'BAT', 'PWR', 'CHK'],
    fall: ['FD'],
    'fall detection': ['FD'],
    alert: ['SOS', 'PANIC', 'EMERGENCY', 'IN'],
    emergency: ['SOS', 'PANIC', 'EMERGENCY'],
    sos: ['SOS'],
    panic: ['PANIC'],
    test: ['TT', 'TF'],
    'heart rate': ['HR'],
    battery: ['BAT'],
    inactivity: ['IN'],
    medication: ['MED'],
    geofence: ['GEO'],
  };

  return eventTypeMap[normalizedType] || null;
};

/**
 * Filter events by type
 * @param {Array} events - Events array
 * @param {string} eventType - Event type to filter by
 * @returns {Array} - Filtered events
 */
const filterEventsByType = (events, eventType) => {
  if (!eventType || eventType.toLowerCase() === 'all' || !Array.isArray(events)) {
    return events || [];
  }

  const normalizedType = eventType.toLowerCase();

  return events.filter(event => {
    const type = (event.eventtype || event.event_type || event.type || '').toLowerCase();
    const signalType = (event.signal_type || '').toLowerCase();

    // Handle common event type mappings
    if (normalizedType === 'periodic location' || normalizedType === 'location') {
      return (
        type.includes('location') ||
        type.includes('gps') ||
        type.includes('loc') ||
        type.includes('geo') ||
        signalType === 'loc' ||
        signalType === 'ploc'
      );
    }
    if (normalizedType === 'telemetry') {
      return (
        type.includes('telemetry') ||
        type.includes('status') ||
        type.includes('battery') ||
        type.includes('power') ||
        type.includes('check') ||
        signalType === 'tel'
      );
    }
    if (normalizedType === 'fall' || normalizedType === 'fall detection') {
      return type.includes('fall') || signalType === 'fd';
    }
    if (normalizedType === 'alert' || normalizedType === 'emergency') {
      return (
        type.includes('alert') ||
        type.includes('emergency') ||
        type.includes('sos') ||
        type.includes('panic') ||
        type.includes('inactivity')
      );
    }

    // Default: exact or partial match
    return type.includes(normalizedType) || signalType.includes(normalizedType);
  });
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
    for (const key of Object.keys(externalData)) {
      if (Array.isArray(externalData[key])) {
        events = externalData[key];
        break;
      }
    }
  }

  return events.map(event => {
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
  if (event.location) return event.location;
  if (event.gps_location) return event.gps_location;
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

const getEventsByType = async (req, res) => {
  try {
    const { device_id, frequency = 'last_7_days', event_type = 'All' } = req.body;
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
      logger.warn(`No cs_no found for device ${device_id}`);
      return res.status(200).json({
        data: [],
        message: 'No events available. Device may not be configured for event reporting.',
        event_type: event_type,
      });
    }

    // Try to get base events from cache first
    const baseCacheKey = `events:${csNo}:${frequency}:all`;
    let eventsData = await cacheService.get(baseCacheKey);

    if (!eventsData) {
      // Fetch events from Reports API
      const dateRange = getDateRange(frequency);
      const signalTypes = mapEventTypeToSignalTypes(event_type);

      try {
        // For specific event types, try History API with signal_type filter
        if (signalTypes && signalTypes.length > 0) {
          try {
            const historyData = await reportsApiService.getEventHistory({
              csNo: csNo,
              before: dateRange.before,
              after: dateRange.after,
              signalTypes: signalTypes,
            });
            eventsData = normalizeEvents(historyData);
            logger.debug(
              `Fetched ${eventsData.length} events from History API with types: ${signalTypes.join(
                ', ',
              )}`,
            );
          } catch (historyError) {
            logger.warn('History API failed, falling back to Recent API:', historyError.message);
          }
        }

        // If no events yet, try Recent API
        if (!eventsData || eventsData.length === 0) {
          const recentData = await reportsApiService.getRecentReports(csNo);
          eventsData = normalizeEvents(recentData);
          logger.debug(`Fetched ${eventsData.length} events from Recent API for cs_no: ${csNo}`);
        }

        // Cache base events
        await cacheService.set(baseCacheKey, eventsData, 300);
      } catch (error) {
        logger.error('Error fetching events from Reports API:', {
          error: error.message,
          cs_no: csNo,
          device_id: device_id,
          event_type: event_type,
        });

        return res.status(500).json({
          error: 'Unable to fetch events',
          message: 'The events service is currently unavailable. Please try again later.',
        });
      }
    }

    // Filter by event type (if not already filtered by History API)
    const filteredEvents = filterEventsByType(eventsData, event_type);

    // Sort by event time (most recent first)
    filteredEvents.sort((a, b) => {
      const timeA = new Date(a.eventtime).getTime();
      const timeB = new Date(b.eventtime).getTime();
      return timeB - timeA;
    });

    // Log audit entry
    await auditLogService.log({
      user_id: userId,
      action: 'events_access_by_type',
      resource_type: 'events',
      resource_id: device_id,
      external_api: 'reports',
      request_method: 'POST',
      request_path: '/events/get-events-by-type',
      response_status: 200,
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
      metadata: { event_type, frequency },
    });

    res.status(200).json({
      data: filteredEvents,
      message: 'Events retrieved successfully',
      event_type: event_type,
    });
  } catch (error) {
    logger.error('Error in get-events-by-type:', {
      error: error.message,
      stack: error.stack,
      device_id: req.body?.device_id,
      event_type: req.body?.event_type,
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

module.exports = getEventsByType;
