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
   * @returns {object} - Normalized device data
   */
  normalizeDevice(externalDevice) {
    return {
      device_id: externalDevice.device_imei || externalDevice.serial || externalDevice.uuid,
      id_type: externalDevice.device_imei ? 'imei' : externalDevice.serial ? 'serial' : 'uuid',
      name: externalDevice.name || 'Unnamed Device',
      status: externalDevice.status || 'unknown',
      battery_level: externalDevice.battery_level,
      signal_strength: externalDevice.signal_strength,
      fall_detection_enabled: externalDevice.fall_detection_enabled || false,
      last_seen: externalDevice.last_seen || externalDevice.updated_at,
      sim_iccid: externalDevice.sim_iccid,
      device_type: externalDevice.device_type,
      metadata: externalDevice.metadata || {},
    };
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
