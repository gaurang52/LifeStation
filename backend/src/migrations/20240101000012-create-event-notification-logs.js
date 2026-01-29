'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('event_notification_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      caregiver_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Caregiver who received the notification',
      },
      senior_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Senior user associated with the event',
      },
      device_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Device ID (IMEI, serial, or UUID) that triggered the event',
      },
      eventrpt_id: {
        type: Sequelize.STRING(10),
        allowNull: false,
        comment: 'Event report ID (B, F, HU, M, RN, etc.)',
      },
      event_time: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Timestamp when the event occurred',
      },
      notification_type: {
        type: Sequelize.ENUM('push', 'sms', 'both'),
        allowNull: false,
        comment: 'Type of notification sent',
      },
      status: {
        type: Sequelize.ENUM('success', 'failed'),
        allowNull: false,
        comment: 'Status of the notification attempt',
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error message if notification failed',
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        allowNull: false,
      },
    });

    // Add indexes
    await queryInterface.addIndex('event_notification_logs', ['caregiver_id']);
    await queryInterface.addIndex('event_notification_logs', ['senior_id']);
    await queryInterface.addIndex('event_notification_logs', ['device_id']);
    await queryInterface.addIndex('event_notification_logs', ['eventrpt_id']);
    await queryInterface.addIndex('event_notification_logs', ['event_time']);
    await queryInterface.addIndex('event_notification_logs', ['status']);
    // Composite index for duplicate detection
    await queryInterface.addIndex('event_notification_logs', [
      'caregiver_id',
      'eventrpt_id',
      'device_id',
      'event_time',
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('event_notification_logs');
  },
};
