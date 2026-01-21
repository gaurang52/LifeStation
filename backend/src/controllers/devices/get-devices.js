const deviceApiService = require('../../services/device-api.service');
const db = require('../../models');
const accessControlService = require('../../services/access-control.service');
const dataNormalizationService = require('../../services/data-normalization.service');
const logger = require('../../utils/logger');

const getDevices = async (req, res) => {
  try {
    const userId = req.user_id;
    const { page = 1, limit = 10 } = req.query;

    // Get all accessible devices for user
    const accessibleDevices = await accessControlService.getAccessibleDevicesForUser(userId);

    if (accessibleDevices.length === 0) {
      return res.status(200).json({
        devices: [],
        message: 'No devices found',
      });
    }

    // Fetch device details from Device API
    const devicePromises = accessibleDevices.map(device =>
      deviceApiService
        .getDevice(device.id_type, device.device_id)
        .then(deviceData => ({
          ...dataNormalizationService.normalizeDevice(deviceData),
          id_type: device.id_type,
        }))
        .catch(error => {
          logger.error(`Error fetching device ${device.device_id}:`, error.message);
          return null;
        }),
    );

    const devices = (await Promise.all(devicePromises)).filter(device => device !== null);

    // Pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedDevices = devices.slice(startIndex, endIndex);

    res.status(200).json({
      devices: paginatedDevices,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: devices.length,
        totalPages: Math.ceil(devices.length / limitNum),
      },
    });
  } catch (error) {
    logger.error('Error in get-devices:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
};

module.exports = getDevices;
