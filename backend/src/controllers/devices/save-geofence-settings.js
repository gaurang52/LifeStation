const db = require('../../models');
const logger = require('../../utils/logger');

/**
 * POST /save-geo-fence-settings
 * Save or update geofence settings for a device
 * Matches umbrella-app-backend implementation exactly
 */
const saveGeofenceSettings = async (req, res) => {
  try {
    const { device_id, settings } = req.body;

    if (!device_id || !settings) {
      return res.status(400).json({ error: 'Device ID or Settings should be in Request Payload!' });
    }

    // First check whether settings is already present
    const existingSetting = await db.DeviceGeoFenceSettings.findOne({
      where: { device_id: device_id },
    });

    let savedSettings;
    if (!existingSetting) {
      savedSettings = await db.DeviceGeoFenceSettings.create({
        device_id: device_id,
        geo_fence_settings: settings,
      });

      if (!savedSettings) {
        return res.status(400).json({ error: 'Error occured while saving geo fence settings!' });
      }
    } else {
      savedSettings = await db.DeviceGeoFenceSettings.update(
        {
          geo_fence_settings: settings,
        },
        { where: { device_id: device_id } },
      );

      if (!savedSettings) {
        return res.status(400).json({ error: 'Error occured while updating geo fence settings' });
      }
    }

    return res.status(200).json({ message: 'Saved Geo Fence Settings Succesfully!' });
  } catch (e) {
    logger.error('Error detected in save geo fence settings.', e);
    return res.status(500).json({ error: e });
  }
};

module.exports = saveGeofenceSettings;
