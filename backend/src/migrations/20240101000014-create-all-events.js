'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('all_events', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      deviceid: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Device ID (IMEI, serial, or UUID)',
      },
      vendorcode: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Vendor code',
      },
      eventtime: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Event timestamp',
      },
      eventtype: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Event type (e.g., "In Fence", "Out Fence", "Panic", etc.)',
      },
      eventid: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
        comment: 'Unique event identifier (UUID)',
      },
      rawevent: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Raw event data in JSON format',
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

    // Add indexes
    await queryInterface.addIndex('all_events', ['deviceid']);
    await queryInterface.addIndex('all_events', ['eventtype']);
    await queryInterface.addIndex('all_events', ['eventtime']);
    await queryInterface.addIndex('all_events', ['eventid'], { unique: true });
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.dropTable('all_events');
  },
};
