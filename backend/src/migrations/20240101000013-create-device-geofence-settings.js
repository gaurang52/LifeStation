'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('device_geofence_settings', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      device_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
        references: {
          model: 'devices',
          key: 'device_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Reference to device_id in devices table',
      },
      geo_fence_settings: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Geofence settings containing center (lat, lng) and radius in meters',
      },
      extra_information: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Additional geofence metadata',
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

    // Add index on device_id for faster lookups
    await queryInterface.addIndex('device_geofence_settings', ['device_id'], {
      unique: true,
      name: 'device_geofence_settings_device_id_unique',
    });
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.dropTable('device_geofence_settings');
  },
};
