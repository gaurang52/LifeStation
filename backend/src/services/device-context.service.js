const db = require('../models');
const accessControlService = require('./access-control.service');
const deviceApiService = require('./device-api.service');
const logger = require('../utils/logger');

class DeviceContextService {
  async findDeviceRecord(deviceId, idType) {
    if (!deviceId) {
      return null;
    }

    if (idType) {
      return await db.Devices.findOne({
        where: {
          device_id: deviceId,
          id_type: idType,
        },
      });
    }

    return await db.Devices.findOne({
      where: {
        [db.Sequelize.Op.or]: [
          { device_id: deviceId },
          { device_imei: deviceId },
          { device_serial: deviceId },
          { device_uuid: deviceId },
        ],
      },
    });
  }

  async resolveDeviceContext({ userId, deviceId, idType = null, userType = null }) {
    const device = await this.findDeviceRecord(deviceId, idType);

    if (!device) {
      return { device: null, canAccess: false, csNo: null };
    }

    const canAccess = await accessControlService.canUserAccessDevice(
      userId,
      device.device_id,
      device.id_type,
      userType != null ? { userType } : {},
    );

    if (!canAccess) {
      return { device, canAccess: false, csNo: null };
    }

    let csNo = null;
    let mapping = await db.UserDeviceMapping.findOne({
      where: { device_id: device.id },
    });

    if (mapping?.cs_no) {
      csNo = mapping.cs_no;
    }

    if (!csNo) {
      try {
        const externalDevice = await deviceApiService.getDevice(device.id_type, device.device_id);
        csNo = externalDevice?.cs_no || externalDevice?.csNo || null;
      } catch (error) {
        logger.warn('Failed to resolve cs_no from Device API', {
          device_id: device.device_id,
          id_type: device.id_type,
          error: error.message,
        });
      }
    }

    if (csNo && (!mapping || !mapping.cs_no)) {
      await db.UserDeviceMapping.update({ cs_no: csNo }, { where: { device_id: device.id } });
    }

    return { device, canAccess: true, csNo };
  }
}

module.exports = new DeviceContextService();
