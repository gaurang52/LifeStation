'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_device_mapping', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      device_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'devices',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'References devices.id',
      },
      external_device_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'External device identifier (IMEI, serial, or UUID) - kept for API compatibility',
      },
      id_type: {
        type: Sequelize.ENUM('imei', 'serial', 'uuid', 'iccid'),
        allowNull: false,
      },
      cs_no: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      device_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      is_primary: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        allowNull: true,
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        allowNull: true,
      },
    });

    await queryInterface.addIndex('user_device_mapping', ['user_id']);
    await queryInterface.addIndex('user_device_mapping', ['device_id']);
    await queryInterface.addIndex('user_device_mapping', ['external_device_id', 'id_type']);
    await queryInterface.addIndex('user_device_mapping', ['cs_no']);
    await queryInterface.addIndex('user_device_mapping', ['user_id', 'device_id'], {
      unique: true,
      name: 'user_device_mapping_user_device_unique',
    });
    await queryInterface.addIndex(
      'user_device_mapping',
      ['user_id', 'external_device_id', 'id_type'],
      { unique: true },
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('user_device_mapping');
  },
};
