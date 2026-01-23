'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('devices', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      device_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
        comment: 'Primary device identifier (IMEI, serial, or UUID)',
      },
      id_type: {
        type: Sequelize.ENUM('imei', 'serial', 'uuid', 'iccid'),
        allowNull: false,
        comment: 'Type of device identifier',
      },
      device_imei: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Device IMEI number',
      },
      device_serial: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Device serial number',
      },
      device_uuid: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Device UUID',
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Device name or friendly name',
      },
      device_type: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Device type code from external API',
      },
      sim_iccid: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'SIM card ICCID',
      },
      servco_no: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Service Company Number from Account API',
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'active',
        comment: 'Device status',
      },
      fall_detection_enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether fall detection is enabled',
      },
      battery_level: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Battery level percentage',
      },
      signal_strength: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Signal strength (weak, moderate, strong)',
      },
      last_seen: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Last time device was seen/active',
      },
      device_metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Additional device metadata from Device API',
      },
      last_synced_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Last time device data was synced from Device API',
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        allowNull: false,
      },
    });

    // Add indexes
    await queryInterface.addIndex('devices', ['device_id'], { unique: true });
    await queryInterface.addIndex('devices', ['id_type']);
    await queryInterface.addIndex('devices', ['device_imei']);
    await queryInterface.addIndex('devices', ['device_serial']);
    await queryInterface.addIndex('devices', ['device_uuid']);
    await queryInterface.addIndex('devices', ['servco_no']);
    await queryInterface.addIndex('devices', ['status']);
    await queryInterface.addIndex('devices', ['last_synced_at']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('devices');
  },
};
