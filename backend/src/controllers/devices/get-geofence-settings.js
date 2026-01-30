const db = require('../../models');
const logger = require('../../utils/logger');

/**
 * POST /get-geo-fence-settings
 * Get geofence settings for a device
 * Matches umbrella-app-backend implementation exactly
 */
const getGeofenceSettings = async (req, res) => {
  try {
    const { device_id } = req.body;

    if (!device_id) {
      return res.status(400).json({ error: 'Device ID is not present or undefined!' });
    }

    const geoFenceSettings = await db.DeviceGeoFenceSettings.findOne({
      where: { device_id: device_id },
      attributes: { exclude: ['created_at', 'updated_at', 'id'] },
    });

    if (!geoFenceSettings) {
      return res.status(404).json({ error: 'Geo fence settings not found!' });
    }

    return res.status(200).json({ data: geoFenceSettings, message: 'Geo Fence Settings Found!' });
  } catch (e) {
    logger.error('Error detected in save geo fence settings.', e);
    throw e;
  }
};

module.exports = getGeofenceSettings;
