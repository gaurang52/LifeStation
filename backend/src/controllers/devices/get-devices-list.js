/**
 * GET /devices/list - Light device list for Map/selectors
 *
 * Returns {device_id, id_type, name} from internal DB only.
 * No external Device API or Account API calls - fast and lightweight.
 *
 * Use this for Map screen device selector instead of full getDevices.
 */
const db = require('../../models');
const { Op } = require('sequelize');
const logger = require('../../utils/logger');

const getDevicesList = async (req, res) => {
  try {
    const userId = req.user_id;
    const userType = (req.user_type && String(req.user_type).toLowerCase()) || '';

    let user = null;
    if (!userType) {
      user = await db.Users.findByPk(userId, {
        attributes: ['id', 'user_type'],
      });
      if (!user) {
        return res.status(200).json({ devices: [], message: 'User not found' });
      }
    }

    const effectiveUserType =
      userType || (user?.user_type && String(user.user_type).toLowerCase()) || '';

    let devices = [];

    if (effectiveUserType === 'admin' || effectiveUserType === 'super_admin') {
      const allDevices = await db.Devices.findAll({
        where: { status: { [Op.in]: ['active', 'A'] } },
        attributes: ['device_id', 'id_type', 'name'],
      });
      devices = allDevices.map(d => ({
        device_id: d.device_id,
        id_type: d.id_type,
        name: d.name || d.device_id,
      }));
    } else if (effectiveUserType === 'senior') {
      const mappings = await db.UserDeviceMapping.findAll({
        where: { user_id: userId },
        include: [
          {
            model: db.Devices,
            as: 'device',
            attributes: ['device_id', 'id_type', 'name'],
            required: true,
          },
        ],
      });
      devices = mappings
        .filter(m => m.device)
        .map(m => ({
          device_id: m.external_device_id || m.device.device_id,
          id_type: m.id_type,
          name:
            m.device_name?.trim() || m.device.name || m.external_device_id || m.device.device_id,
        }));
    } else if (effectiveUserType === 'caregiver') {
      const seniorMappings = await db.SeniorCaregiverMapping.findAll({
        where: { caregiver_id: userId },
        attributes: ['senior_id'],
      });
      const seniorIds = seniorMappings.map(m => m.senior_id);
      if (seniorIds.length === 0) {
        return res.status(200).json({ devices: [], message: 'No linked seniors' });
      }

      const mappings = await db.UserDeviceMapping.findAll({
        where: { user_id: seniorIds },
        include: [
          {
            model: db.Devices,
            as: 'device',
            attributes: ['device_id', 'id_type', 'name'],
            required: true,
          },
        ],
      });
      const seen = new Set();
      devices = mappings
        .filter(m => m.device)
        .filter(m => {
          const key = `${m.external_device_id || m.device.device_id}-${m.id_type}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map(m => ({
          device_id: m.external_device_id || m.device.device_id,
          id_type: m.id_type,
          name:
            m.device_name?.trim() || m.device.name || m.external_device_id || m.device.device_id,
        }));
    }

    res.status(200).json({
      devices,
      message: devices.length === 0 ? 'No devices found' : undefined,
    });
  } catch (error) {
    logger.error('Error in get-devices-list:', { error: error.message, stack: error.stack });
    res.status(500).json({
      error: 'Internal server error',
      message:
        process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : error.message,
    });
  }
};

module.exports = getDevicesList;
