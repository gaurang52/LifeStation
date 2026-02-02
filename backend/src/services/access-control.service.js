const db = require('../models');
const logger = require('../utils/logger');
const deviceApiService = require('./device-api.service');
const accountApiService = require('./account-api.service');

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
   * Check if user can access device (OPTION A: Real-time validation via LifeStation Device API)
   * @param {number} userId - User ID
   * @param {string} deviceId - Device ID
   * @param {string} idType - ID type ('imei', 'serial', 'uuid')
   * @param {{ userType?: string }} [options] - Optional: pass userType from req to avoid re-fetching user (set by verifyToken)
   * @returns {Promise<boolean>} - True if access allowed
   */
  async canUserAccessDevice(userId, deviceId, idType, options = {}) {
    try {
      let userType = options.userType != null ? String(options.userType).toLowerCase() : '';
      let user = null;

      if (!userType) {
        user = await db.Users.findByPk(userId, { attributes: ['id', 'user_type', 'cs_no'] });
        if (!user) {
          logger.debug('canUserAccessDevice: user not found', { userId });
          return false;
        }
        userType = (user.user_type && String(user.user_type).toLowerCase()) || '';
      } else {
        // Still fetch user to get cs_no
        user = await db.Users.findByPk(userId, { attributes: ['id', 'user_type', 'cs_no'] });
      }

      // Admins have full access
      if (userType === 'admin' || userType === 'super_admin') {
        return true;
      }

      // OPTION A: Query LifeStation Device API to check if device is authorized for user's cs_no
      if (user && user.cs_no) {
        try {
          // Get device from Device API
          const deviceData = await deviceApiService.getDevice(idType, deviceId);

          // Check if device's cs_no matches user's cs_no
          const deviceCsNo = deviceData.cs_no || deviceData.csNo;
          if (deviceCsNo && deviceCsNo === user.cs_no) {
            logger.debug(
              'canUserAccessDevice: device authorized via LifeStation API (cs_no match)',
              {
                userId,
                deviceId,
                cs_no: user.cs_no,
              },
            );
            return true;
          }

          // For seniors: device must match their cs_no
          if (userType === 'senior') {
            logger.debug('canUserAccessDevice: senior device cs_no mismatch', {
              userId,
              deviceId,
              user_cs_no: user.cs_no,
              device_cs_no: deviceCsNo,
            });
            return false;
          }

          // For caregivers: check if device belongs to a linked senior
          if (userType === 'caregiver') {
            // Find senior with matching cs_no
            const senior = await db.Users.findOne({
              where: { cs_no: deviceCsNo, user_type: 'senior' },
              attributes: ['id'],
            });

            if (senior) {
              const canAccess = await this.canCaregiverAccessSenior(userId, senior.id);
              if (canAccess) {
                logger.debug(
                  'canUserAccessDevice: caregiver authorized via LifeStation API (linked senior)',
                  {
                    userId,
                    deviceId,
                    senior_id: senior.id,
                  },
                );
                return true;
              }
            }

            logger.debug('canUserAccessDevice: caregiver not linked to senior with device cs_no', {
              userId,
              deviceId,
              device_cs_no: deviceCsNo,
            });
            return false;
          }
        } catch (deviceApiError) {
          // If Device API fails, fall back to internal check (graceful degradation)
          logger.warn(
            'canUserAccessDevice: Device API check failed, falling back to internal check',
            {
              userId,
              deviceId,
              error: deviceApiError.message,
            },
          );

          // Fallback to internal UserDeviceMapping check
          const device = await db.Devices.findOne({
            where: {
              device_id: deviceId,
              id_type: idType,
            },
          });

          if (!device) {
            return false;
          }

          if (userType === 'senior') {
            const mapping = await db.UserDeviceMapping.findOne({
              where: {
                user_id: userId,
                device_id: device.id,
              },
            });
            return !!mapping;
          }

          if (userType === 'caregiver') {
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
        }
      } else {
        // User doesn't have cs_no - fall back to internal check
        logger.debug('canUserAccessDevice: user has no cs_no, using internal check', { userId });

        const device = await db.Devices.findOne({
          where: {
            device_id: deviceId,
            id_type: idType,
          },
        });

        if (!device) {
          return false;
        }

        if (userType === 'senior') {
          const mapping = await db.UserDeviceMapping.findOne({
            where: {
              user_id: userId,
              device_id: device.id,
            },
          });
          return !!mapping;
        }

        if (userType === 'caregiver') {
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
      }

      logger.debug('canUserAccessDevice: unknown user_type', {
        userId,
        user_type: userType,
      });
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
   * Get accessible devices for user (OPTION A: Query LifeStation Device API)
   * @param {number} userId - User ID
   * @param {{ userType?: string }} [options] - Optional: pass userType from req to avoid re-fetching user (set by verifyToken)
   * @returns {Promise<Array>} - Array of device objects {device_id, id_type}
   */
  async getAccessibleDevicesForUser(userId, options = {}) {
    try {
      let userType = options.userType != null ? String(options.userType).toLowerCase() : '';
      const user = await db.Users.findByPk(userId, {
        attributes: ['id', 'user_type', 'cs_no'],
      });

      if (!user) {
        return [];
      }

      if (!userType) {
        userType = (user.user_type && String(user.user_type).toLowerCase()) || '';
      }

      // Admins can access all devices (query Device API without filters)
      if (userType === 'admin' || userType === 'super_admin') {
        try {
          const devicesData = await deviceApiService.getDevices({});
          const devices = devicesData.devices || devicesData || [];
          return devices.map(d => ({
            device_id: d.IMEI || d.device_id || d.id,
            id_type: d.id_type || 'imei',
          }));
        } catch (error) {
          logger.error('Error fetching all devices for admin:', error);
          // Fallback to internal devices
          const allDevices = await db.Devices.findAll({
            attributes: ['device_id', 'id_type'],
          });
          return allDevices.map(d => ({
            device_id: d.device_id,
            id_type: d.id_type,
          }));
        }
      }

      // OPTION A: Query LifeStation Device API filtered by user's cs_no/servco_no
      if (user.cs_no) {
        try {
          // Get servco_no from Account API
          let servcoNo = null;
          try {
            const servcoData = await accountApiService.getServcoNo(user.cs_no);
            servcoNo = servcoData.servco_no || servcoData.servcoNo;
          } catch (servcoError) {
            logger.warn(`Failed to get servco_no for cs_no ${user.cs_no}:`, servcoError.message);
          }

          // Query Device API with servco filter
          const filters = {};
          if (servcoNo) {
            filters.servco = servcoNo;
          }
          filters.status = 'A'; // Active devices only

          const devicesData = await deviceApiService.getDevices(filters);
          const devices = devicesData.devices || devicesData || [];

          // Filter devices by cs_no match (for seniors) or linked seniors (for caregivers)
          const authorizedDevices = [];

          for (const device of devices) {
            const deviceCsNo = device.cs_no || device.csNo;
            const deviceId = device.IMEI || device.device_id || device.id;
            const deviceIdType = device.id_type || 'imei';

            if (!deviceId) continue;

            // For seniors: device cs_no must match user cs_no
            if (userType === 'senior') {
              if (deviceCsNo === user.cs_no) {
                authorizedDevices.push({
                  device_id: deviceId,
                  id_type: deviceIdType,
                });
              }
            }

            // For caregivers: device must belong to a linked senior
            if (userType === 'caregiver') {
              if (deviceCsNo) {
                const senior = await db.Users.findOne({
                  where: { cs_no: deviceCsNo, user_type: 'senior' },
                  attributes: ['id'],
                });

                if (senior && (await this.canCaregiverAccessSenior(userId, senior.id))) {
                  authorizedDevices.push({
                    device_id: deviceId,
                    id_type: deviceIdType,
                  });
                }
              }
            }
          }

          logger.debug(
            `getAccessibleDevicesForUser: Found ${authorizedDevices.length} devices via LifeStation API for user ${userId}`,
          );
          return authorizedDevices;
        } catch (deviceApiError) {
          logger.warn(
            'getAccessibleDevicesForUser: Device API query failed, falling back to internal check',
            {
              userId,
              error: deviceApiError.message,
            },
          );

          // Fallback to internal UserDeviceMapping
          if (userType === 'senior') {
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

          if (userType === 'caregiver') {
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
        }
      } else {
        // User doesn't have cs_no - fall back to internal check
        logger.debug('getAccessibleDevicesForUser: user has no cs_no, using internal check', {
          userId,
        });

        if (userType === 'senior') {
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

        if (userType === 'caregiver') {
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

      const userType = (user.user_type && String(user.user_type).toLowerCase()) || '';

      // Admins have full access
      if (userType === 'admin' || userType === 'super_admin') {
        return true;
      }

      // Seniors can only access their own data
      if (userType === 'senior') {
        return parseInt(userId) === parseInt(seniorId);
      }

      // Caregivers can access data of linked seniors
      if (userType === 'caregiver') {
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
