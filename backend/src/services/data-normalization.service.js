/**
 * Service for normalizing external API responses to mobile-friendly formats
 */
class DataNormalizationService {
  /**
   * Normalize vitals data from Reports API
   * @param {object} externalData - Data from Reports API
   * @param {object} context - Additional context (senior_id, etc.)
   * @returns {object} - Normalized vitals data
   */
  normalizeVitals(externalData, context = {}) {
    const normalized = {
      timestamp: externalData.timestamp || new Date().toISOString(),
      vitals: [],
      alerts: [],
      device_status: {},
    };

    // Normalize signal types to vitals/alerts
    if (externalData.signals && Array.isArray(externalData.signals)) {
      externalData.signals.forEach(signal => {
        const normalizedSignal = {
          type: this.mapSignalType(signal.signal_type),
          timestamp: signal.eventtime || signal.timestamp,
          value: signal.value || signal.data,
          unit: this.getUnit(signal.signal_type),
          severity: this.getSeverity(signal.signal_type),
          signal_type: signal.signal_type, // Keep original for reference
        };

        if (this.isAlert(signal.signal_type)) {
          normalized.alerts.push(normalizedSignal);
        } else {
          normalized.vitals.push(normalizedSignal);
        }
      });
    }

    // Normalize device status
    if (externalData.device) {
      normalized.device_status = {
        battery_level: externalData.device.battery_level,
        signal_strength: externalData.device.signal_strength,
        last_seen: externalData.device.last_seen,
        fall_detection_enabled: externalData.device.fall_detection_enabled || false,
      };
    }

    return normalized;
  }

  /**
   * Normalize device data from Device API
   * @param {object} externalDevice - Device data from Device API
   * @param {object} options - Additional options (accountName, cs_no)
   * @returns {object} - Normalized device data
   */
  normalizeDevice(externalDevice, options = {}) {
    // Handle both old format and new Device Read API format
    // Device Read API returns: Caller_ID, Device_Status, Fall_Detection_Status, Firmware_Version, ICCID, IMEI, SIM_Status, Service_Company, cs_no, device_id
    // Also handle nested "signal" object structure from Device Recent API:
    // { signal: { battery: { level, timestamp }, location: { latitude, longitude, timestamp }, signal_strength: { signal_strength, timestamp }, timestamp } }

    // Extract data from nested signal object if present (for /recent endpoint)
    const signalData = externalDevice.signal || {};
    const batteryData = signalData.battery || {};
    const locationData = signalData.location || {};
    const signalStrengthData = signalData.signal_strength || {};

    // Extract battery level from nested structure or flat structure
    const batteryLevel =
      externalDevice.battery_level ||
      batteryData.level ||
      (typeof batteryData === 'number' ? batteryData : null);

    // Extract signal strength from nested structure or flat structure
    const signalStrength =
      externalDevice.signal_strength ||
      signalStrengthData.signal_strength ||
      (typeof signalStrengthData === 'number' ? signalStrengthData : null);

    // Extract location from nested structure or flat structure
    let location = null;
    if (externalDevice.location) {
      // Already normalized location object - preserve all fields (latitude, longitude, timestamp, accuracy, type)
      // Ensure latitude and longitude are numbers
      location = {
        latitude:
          parseFloat(externalDevice.location.latitude) ||
          parseFloat(String(externalDevice.location.latitude)),
        longitude:
          parseFloat(externalDevice.location.longitude) ||
          parseFloat(String(externalDevice.location.longitude)),
        timestamp: externalDevice.location.timestamp || null,
        accuracy: externalDevice.location.accuracy
          ? parseFloat(externalDevice.location.accuracy)
          : undefined,
        type: externalDevice.location.type || undefined,
      };
    } else if (externalDevice.gps_location) {
      location = externalDevice.gps_location;
    } else if (externalDevice.coordinates) {
      location = externalDevice.coordinates;
    } else if (locationData.latitude && locationData.longitude) {
      // Extract from nested signal.location
      location = {
        latitude: parseFloat(locationData.latitude) || parseFloat(String(locationData.latitude)),
        longitude: parseFloat(locationData.longitude) || parseFloat(String(locationData.longitude)),
        timestamp: locationData.timestamp || signalData.timestamp || null,
        accuracy: locationData.accuracy ? parseFloat(locationData.accuracy) : undefined,
        type: locationData.type || undefined,
      };
    } else if (externalDevice.latitude && externalDevice.longitude) {
      // Flat structure with latitude/longitude
      location = {
        latitude:
          parseFloat(externalDevice.latitude) || parseFloat(String(externalDevice.latitude)),
        longitude:
          parseFloat(externalDevice.longitude) || parseFloat(String(externalDevice.longitude)),
        timestamp:
          externalDevice.location_timestamp ||
          externalDevice.gps_timestamp ||
          externalDevice.last_seen,
      };
    }

    // Extract timestamp - prefer signal.timestamp, then battery/location/signal_strength timestamps, then last_seen
    const lastSeen =
      signalData.timestamp ||
      batteryData.timestamp ||
      locationData.timestamp ||
      signalStrengthData.timestamp ||
      externalDevice.last_seen ||
      externalDevice.updated_at;

    const normalized = {
      // Primary identifiers - use provided id_type and device_id from options (request params) if available,
      // otherwise use from response data, or infer from response data
      device_id:
        options.device_id ||
        externalDevice.device_id ||
        externalDevice.device_imei ||
        externalDevice.IMEI ||
        externalDevice.serial ||
        externalDevice.uuid,
      id_type:
        options.id_type ||
        externalDevice.id_type ||
        (externalDevice.IMEI || externalDevice.device_imei
          ? 'imei'
          : externalDevice.serial
          ? 'serial'
          : externalDevice.ICCID
          ? 'iccid'
          : 'uuid'),
      // Store IMEI separately if available
      imei: externalDevice.IMEI || externalDevice.device_imei || externalDevice.imei || null,

      // Device name: prefer user-set name (UserDeviceMapping.device_name), then API/account
      name:
        options.customDeviceName || externalDevice.name || options.accountName || 'Unnamed Device',

      // Status - map Device_Status from Device Read API
      status: externalDevice.Device_Status || externalDevice.status || 'unknown',

      // Battery and signal - extracted from nested signal object or flat structure
      battery_level: batteryLevel,
      signal_strength: signalStrength,

      // GPS location - extracted from nested signal object or flat structure
      location: location,

      // Fall detection - map Fall_Detection_Status from Device Read API
      fall_detection_enabled:
        externalDevice.Fall_Detection_Status === 'enabled' ||
        externalDevice.Fall_Detection_Status === 'active' ||
        externalDevice.fall_detection_enabled ||
        false,
      fall_detection_status:
        externalDevice.Fall_Detection_Status || externalDevice.fall_detection_status,

      // Timestamps - extracted from nested signal object or flat structure
      last_seen: lastSeen,

      // SIM information - map ICCID from Device Read API
      sim_iccid: externalDevice.ICCID || externalDevice.sim_iccid,
      sim_status: externalDevice.SIM_Status || externalDevice.sim_status,

      // Device type and firmware
      device_type: externalDevice.device_type,
      firmware_version: externalDevice.Firmware_Version || externalDevice.firmware_version,

      // Device Read API specific fields
      caller_id: externalDevice.Caller_ID || externalDevice.caller_id,
      service_company: externalDevice.Service_Company || externalDevice.service_company,
      custom_reference_field:
        externalDevice.Custom_Reference_Field || externalDevice.custom_reference_field,

      // Metadata
      metadata: externalDevice.metadata || {},
    };

    // Include account name if provided (from Account API via cs_no)
    if (options.accountName) {
      normalized.account_name = options.accountName;
      // Use account name as device name if device name is not set
      if (!externalDevice.name || externalDevice.name === 'Unnamed Device') {
        normalized.name = options.accountName;
      }
    }

    // Include cs_no if provided (from Device Read API or options)
    if (options.cs_no || externalDevice.cs_no || externalDevice.csNo) {
      normalized.cs_no = options.cs_no || externalDevice.cs_no || externalDevice.csNo;
    }

    return normalized;
  }

  /**
   * Normalize account data from Account API
   * @param {object} externalAccount - Account data from Account API
   * @returns {object} - Normalized account data
   */
  normalizeAccount(externalAccount) {
    return {
      cs_no: externalAccount.cs_no,
      name: externalAccount.name,
      address: {
        street: externalAccount.addr1,
        city: externalAccount.city,
        state: externalAccount.state,
        zip: externalAccount.zip,
      },
      phone: externalAccount.phone1,
      status: externalAccount.status,
      location_type: externalAccount.location_type,
      servco_no: externalAccount.servco_no,
    };
  }

  /**
   * Map external signal type to internal type
   * @param {string} signalType - External signal type
   * @returns {string} - Internal signal type
   */
  mapSignalType(signalType) {
    const mapping = {
      TT: 'test',
      TF: 'test_fail',
      HR: 'heart_rate',
      FD: 'fall_detection',
      SOS: 'sos',
      IN: 'inactivity',
      LOC: 'location',
      BAT: 'battery',
      PANIC: 'panic',
      EMERGENCY: 'emergency',
    };
    return mapping[signalType] || signalType.toLowerCase();
  }

  /**
   * Get unit for signal type
   * @param {string} signalType - Signal type
   * @returns {string|null} - Unit string
   */
  getUnit(signalType) {
    const units = {
      HR: 'bpm',
      BAT: '%',
      LOC: 'coordinates',
    };
    return units[signalType] || null;
  }

  /**
   * Get severity for signal type
   * @param {string} signalType - Signal type
   * @returns {string} - Severity level
   */
  getSeverity(signalType) {
    const severity = {
      FD: 'critical',
      SOS: 'critical',
      PANIC: 'critical',
      EMERGENCY: 'critical',
      IN: 'warning',
      BAT: 'warning',
      TF: 'error',
    };
    return severity[signalType] || 'info';
  }

  /**
   * Check if signal type is an alert
   * @param {string} signalType - Signal type
   * @returns {boolean} - True if alert
   */
  isAlert(signalType) {
    const alertTypes = ['FD', 'SOS', 'IN', 'BAT', 'PANIC', 'EMERGENCY', 'TF'];
    return alertTypes.includes(signalType);
  }

  /**
   * Normalize history report data
   * @param {object} reportData - Report data from Reports API
   * @returns {object} - Normalized report data
   */
  normalizeHistoryReport(reportData) {
    return {
      report_id: reportData.report_id,
      title: reportData.title,
      created_at: reportData.created_at,
      status: reportData.status,
      data: reportData.data || [],
      metadata: reportData.metadata || {},
    };
  }
}

module.exports = new DataNormalizationService();
