'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect();

    // Add 'iccid' to the ENUM type for devices table
    if (dialect === 'postgres') {
      // PostgreSQL: Try to add value to ENUM type
      // First try the common naming convention
      try {
        await queryInterface.sequelize.query(
          "ALTER TYPE enum_devices_id_type ADD VALUE IF NOT EXISTS 'iccid';",
        );
      } catch (err) {
        // If that fails, use changeColumn which will recreate the ENUM with the new value
        console.log('Using changeColumn approach for devices table (this may take a moment)...');
        await queryInterface.changeColumn('devices', 'id_type', {
          type: Sequelize.ENUM('imei', 'serial', 'uuid', 'iccid'),
          allowNull: false,
          comment: 'Type of device identifier',
        });
      }
    } else {
      // MySQL and other databases: Alter the column to include the new ENUM value
      await queryInterface.changeColumn('devices', 'id_type', {
        type: Sequelize.ENUM('imei', 'serial', 'uuid', 'iccid'),
        allowNull: false,
        comment: 'Type of device identifier',
      });
    }

    // Add 'iccid' to the ENUM type for user_device_mapping table
    if (dialect === 'postgres') {
      try {
        await queryInterface.sequelize.query(
          "ALTER TYPE enum_user_device_mapping_id_type ADD VALUE IF NOT EXISTS 'iccid';",
        );
      } catch (err) {
        // If that fails, use changeColumn which will recreate the ENUM with the new value
        console.log(
          'Using changeColumn approach for user_device_mapping table (this may take a moment)...',
        );
        await queryInterface.changeColumn('user_device_mapping', 'id_type', {
          type: Sequelize.ENUM('imei', 'serial', 'uuid', 'iccid'),
          allowNull: false,
        });
      }
    } else {
      // MySQL and other databases: Alter the column to include the new ENUM value
      await queryInterface.changeColumn('user_device_mapping', 'id_type', {
        type: Sequelize.ENUM('imei', 'serial', 'uuid', 'iccid'),
        allowNull: false,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Note: Removing ENUM values can be complex and may fail if there are existing rows with that value
    // This migration is designed to be one-way (adding support for iccid)
    // If you need to remove it, you would need to:
    // 1. Update all rows with id_type='iccid' to a different value
    // 2. Then remove 'iccid' from the ENUM

    console.warn(
      'Down migration skipped: Removing ENUM values requires manual data migration first',
    );
  },
};
