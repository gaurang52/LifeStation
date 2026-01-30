const db = require('../models');
const calculateDistanceService = require('./calculate-distance.service');
const logger = require('../utils/logger');
const crypto = require('crypto');

/**
 * Service for handling geofence logic
 */
class GeofenceService {
  /**
   * Check if a device location is within or outside the geofence
   * @param {string} deviceId - Device ID
   * @param {object} location - Location object with latitude and longitude
   * @param {object} options - Additional options (transaction, vendor, eventTime)
   * @returns {Promise<object|null>} - Geofence status object or null if no geofence set
   */
  async checkGeofenceStatus(deviceId, location, options = {}) {
    const { transaction, eventTime } = options;

    try {
      // Find geofence settings for the device
      const geoFenceSettings = await db.DeviceGeoFenceSettings.findOne(
        {
          where: { device_id: deviceId },
        },
        { transaction },
      );

      if (!geoFenceSettings) {
        logger.debug(`No geo-fence settings found for device: ${deviceId}`);
        return null;
      }

      const { geo_fence_settings } = geoFenceSettings.dataValues;

      // Extract center and radius from settings
      // Support both formats: { center: { lat, lng }, radius } or { points: [{ lat, lng }], radius }
      let centerLat, centerLng, radius;

      if (geo_fence_settings.center) {
        centerLat = geo_fence_settings.center.lat;
        centerLng = geo_fence_settings.center.lng;
        radius = geo_fence_settings.radius;
      } else if (geo_fence_settings.points && geo_fence_settings.points.length > 0) {
        // Support legacy format with points array
        centerLat = geo_fence_settings.points[0].lat;
        centerLng = geo_fence_settings.points[0].lng;
        radius = geo_fence_settings.radius;
      } else {
        logger.warn(`Invalid geofence settings format for device: ${deviceId}`);
        return null;
      }

      // Validate location data
      const { latitude, longitude } = location;
      if (
        latitude === null ||
        latitude === undefined ||
        isNaN(latitude) ||
        longitude === null ||
        longitude === undefined ||
        isNaN(longitude)
      ) {
        logger.warn(`Invalid location data for device: ${deviceId}`, { location });
        return null;
      }

      // Calculate distance using Haversine formula
      const distance = calculateDistanceService.calculateDistance(
        centerLat,
        centerLng,
        latitude,
        longitude,
      );

      // Determine if device is in or out of fence
      const status = distance <= radius ? 'in-fence' : 'out-fence';
      logger.info(`Geofence status for device ${deviceId}: ${status}`, {
        distance: distance.toFixed(2),
        radius,
        deviceLocation: { latitude, longitude },
        fenceCenter: { lat: centerLat, lng: centerLng },
      });

      // Save fence alert event to AllEvents table (matching umbrella-app-backend exactly)
      const eventType = status === 'in-fence' ? 'In Fence' : 'Out Fence';
      try {
        await db.AllEvents.create(
          {
            deviceid: deviceId,
            vendorcode: options.vendor || null,
            eventtime: eventTime || new Date(),
            eventtype: eventType,
            rawevent: { type: status, location: { latitude, longitude } },
            eventid: crypto.randomUUID(),
          },
          { transaction: options.transaction },
        );
        logger.debug('Geo-fence event saved to AllEvents');
      } catch (eventError) {
        logger.error('Error saving geofence event to AllEvents:', {
          error: eventError.message,
          deviceId,
        });
        // Don't throw - geofence check should still succeed even if event logging fails
      }

      return {
        status,
        distance: Math.round(distance), // Round to nearest meter
        radius,
        deviceLocation: { latitude, longitude },
        fenceCenter: { lat: centerLat, lng: centerLng },
        eventTime: eventTime || new Date(),
      };
    } catch (error) {
      logger.error(`Error checking geofence status for device ${deviceId}:`, {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Save or update geofence settings for a device
   * @param {string} deviceId - Device ID
   * @param {object} settings - Geofence settings object with center and radius
   * @param {object} options - Additional options (transaction, extraInformation)
   * @returns {Promise<object>} - Saved geofence settings
   */
  async saveGeofenceSettings(deviceId, settings, options = {}) {
    const { transaction, extraInformation = {} } = options;

    try {
      // Validate settings structure
      if (!settings || (!settings.center && !settings.points)) {
        throw new Error('Geofence settings must include center or points');
      }

      if (!settings.radius || isNaN(settings.radius) || settings.radius <= 0) {
        throw new Error('Geofence radius must be a positive number');
      }

      // Normalize settings format to use center
      let normalizedSettings = { ...settings };
      if (settings.points && settings.points.length > 0 && !settings.center) {
        normalizedSettings.center = {
          lat: settings.points[0].lat,
          lng: settings.points[0].lng,
        };
      }

      if (
        !normalizedSettings.center ||
        !normalizedSettings.center.lat ||
        !normalizedSettings.center.lng
      ) {
        throw new Error('Geofence center must include lat and lng');
      }

      // Validate center coordinates
      const { lat, lng } = normalizedSettings.center;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        throw new Error('Invalid geofence center coordinates');
      }

      // Check if settings already exist
      const existingSetting = await db.DeviceGeoFenceSettings.findOne(
        {
          where: { device_id: deviceId },
        },
        { transaction },
      );

      let savedSettings;
      if (!existingSetting) {
        // Create new settings
        savedSettings = await db.DeviceGeoFenceSettings.create(
          {
            device_id: deviceId,
            geo_fence_settings: normalizedSettings,
            extra_information: extraInformation,
          },
          { transaction },
        );
      } else {
        // Update existing settings
        await db.DeviceGeoFenceSettings.update(
          {
            geo_fence_settings: normalizedSettings,
            extra_information: extraInformation,
            updated_at: new Date(),
          },
          {
            where: { device_id: deviceId },
            transaction,
          },
        );

        // Fetch updated settings
        savedSettings = await db.DeviceGeoFenceSettings.findOne(
          {
            where: { device_id: deviceId },
          },
          { transaction },
        );
      }

      logger.info(`Geofence settings saved for device: ${deviceId}`, {
        center: normalizedSettings.center,
        radius: normalizedSettings.radius,
      });

      return savedSettings;
    } catch (error) {
      logger.error(`Error saving geofence settings for device ${deviceId}:`, {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Get geofence settings for a device
   * @param {string} deviceId - Device ID
   * @param {object} options - Additional options (transaction)
   * @returns {Promise<object|null>} - Geofence settings or null if not found
   */
  async getGeofenceSettings(deviceId, options = {}) {
    const { transaction } = options;

    try {
      const geoFenceSettings = await db.DeviceGeoFenceSettings.findOne(
        {
          where: { device_id: deviceId },
          attributes: { exclude: ['created_at', 'updated_at', 'id'] },
        },
        { transaction },
      );

      return geoFenceSettings;
    } catch (error) {
      logger.error(`Error getting geofence settings for device ${deviceId}:`, {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}

module.exports = new GeofenceService();
