const db = require('../models');
const logger = require('../utils/logger');

class AccessControlService {
  /**
   * Check if caregiver can access senior
   * @param {number} caregiverId - Caregiver user ID
   * @param {number} seniorId - Senior user ID
   * @returns {Promise<boolean>} - True if access allowed
   */
  async canCaregiverAccessSenior(caregiverId, seniorId) {
    try {
      const mapping = await db.SeniorCaregiverMapping.findOne({
        where: {
          caregiver_id: caregiverId,
          senior_id: seniorId,
        },
      });

      return !!mapping;
    } catch (error) {
      logger.error('Error checking caregiver access:', error);
      return false;
    }
  }

  /**
   * Check if user can access device
   * @param {number} userId - User ID
   * @param {string} deviceId - Device ID
   * @param {string} idType - ID type ('imei', 'serial', 'uuid')
   * @returns {Promise<boolean>} - True if access allowed
   */
  async canUserAccessDevice(userId, deviceId, idType) {
    try {
      const user = await db.Users.findByPk(userId);
      if (!user) {
        return false;
      }

      // Admins have full access
      if (user.user_type === 'ADMIN' || user.user_type === 'SUPER_ADMIN') {
        return true;
      }

      // Find device by external identifier
      const device = await db.Devices.findOne({
        where: {
          device_id: deviceId,
          id_type: idType,
        },
      });

      if (!device) {
        return false;
      }

      // Seniors can only access their own devices
      if (user.user_type === 'senior') {
        const mapping = await db.UserDeviceMapping.findOne({
          where: {
            user_id: userId,
            device_id: device.id,
          },
        });
        return !!mapping;
      }

      // Caregivers can access devices of linked seniors
      if (user.user_type === 'caregiver') {
        const deviceMapping = await db.UserDeviceMapping.findOne({
          where: {
            device_id: device.id,
          },
        });

        if (!deviceMapping) {
          return false;
        }

        return await this.canCaregiverAccessSenior(userId, deviceMapping.user_id);
      }

      return false;
    } catch (error) {
      logger.error('Error checking device access:', error);
      return false;
    }
  }

  /**
   * Get accessible seniors for caregiver
   * @param {number} caregiverId - Caregiver user ID
   * @returns {Promise<number[]>} - Array of senior IDs
   */
  async getAccessibleSeniorsForCaregiver(caregiverId) {
    try {
      const mappings = await db.SeniorCaregiverMapping.findAll({
        where: { caregiver_id: caregiverId },
        attributes: ['senior_id'],
      });

      return mappings.map(m => m.senior_id);
    } catch (error) {
      logger.error('Error getting accessible seniors:', error);
      return [];
    }
  }

  /**
   * Get accessible devices for user
   * @param {number} userId - User ID
   * @returns {Promise<Array>} - Array of device objects {device_id, id_type}
   */
  async getAccessibleDevicesForUser(userId) {
    try {
      const user = await db.Users.findByPk(userId);
      if (!user) {
        return [];
      }

      // Admins can access all devices
      if (user.user_type === 'ADMIN' || user.user_type === 'SUPER_ADMIN') {
        const allDevices = await db.Devices.findAll({
          attributes: ['device_id', 'id_type'],
        });
        return allDevices.map(d => ({
          device_id: d.device_id,
          id_type: d.id_type,
        }));
      }

      // Seniors can access their own devices
      if (user.user_type === 'senior') {
        const mappings = await db.UserDeviceMapping.findAll({
          where: { user_id: userId },
          include: [
            {
              model: db.Devices,
              as: 'device',
              attributes: ['device_id', 'id_type'],
            },
          ],
        });
        return mappings
          .filter(m => m.device)
          .map(m => ({
            device_id: m.device.device_id,
            id_type: m.device.id_type,
          }));
      }

      // Caregivers can access devices of linked seniors
      if (user.user_type === 'caregiver') {
        const seniorIds = await this.getAccessibleSeniorsForCaregiver(userId);
        if (seniorIds.length === 0) {
          return [];
        }

        const mappings = await db.UserDeviceMapping.findAll({
          where: { user_id: seniorIds },
          include: [
            {
              model: db.Devices,
              as: 'device',
              attributes: ['device_id', 'id_type'],
            },
          ],
        });
        return mappings
          .filter(m => m.device)
          .map(m => ({
            device_id: m.device.device_id,
            id_type: m.device.id_type,
          }));
      }

      return [];
    } catch (error) {
      logger.error('Error getting accessible devices:', error);
      return [];
    }
  }

  /**
   * Check if user can access senior's data
   * @param {number} userId - User ID requesting access
   * @param {number} seniorId - Senior user ID
   * @returns {Promise<boolean>} - True if access allowed
   */
  async canUserAccessSenior(userId, seniorId) {
    try {
      const user = await db.Users.findByPk(userId);
      if (!user) {
        return false;
      }

      // Admins have full access
      if (user.user_type === 'ADMIN' || user.user_type === 'SUPER_ADMIN') {
        return true;
      }

      // Seniors can only access their own data
      if (user.user_type === 'senior') {
        return parseInt(userId) === parseInt(seniorId);
      }

      // Caregivers can access data of linked seniors
      if (user.user_type === 'caregiver') {
        return await this.canCaregiverAccessSenior(userId, seniorId);
      }

      return false;
    } catch (error) {
      logger.error('Error checking senior access:', error);
      return false;
    }
  }
}

module.exports = new AccessControlService();
