const { DataTypes } = require('sequelize');

module.exports = sequelize => {
  const EventNotificationLog = sequelize.define(
    'event_notification_logs',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      caregiver_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        comment: 'Caregiver who received the notification',
      },
      senior_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        comment: 'Senior user associated with the event',
      },
      device_id: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Device ID (IMEI, serial, or UUID) that triggered the event',
      },
      eventrpt_id: {
        type: DataTypes.STRING(10),
        allowNull: false,
        comment: 'Event report ID (B, F, HU, M, RN, etc.)',
      },
      event_time: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Timestamp when the event occurred',
      },
      notification_type: {
        type: DataTypes.ENUM('push', 'sms', 'both'),
        allowNull: false,
        comment: 'Type of notification sent',
      },
      status: {
        type: DataTypes.ENUM('success', 'failed'),
        allowNull: false,
        comment: 'Status of the notification attempt',
      },
      error_message: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Error message if notification failed',
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
      },
    },
    {
      tableName: 'event_notification_logs',
      timestamps: false,
      underscored: true,
      indexes: [
        {
          fields: ['caregiver_id'],
        },
        {
          fields: ['senior_id'],
        },
        {
          fields: ['device_id'],
        },
        {
          fields: ['eventrpt_id'],
        },
        {
          fields: ['event_time'],
        },
        {
          fields: ['status'],
        },
        {
          // Composite index for duplicate detection
          fields: ['caregiver_id', 'eventrpt_id', 'device_id', 'event_time'],
        },
      ],
    },
  );

  return EventNotificationLog;
};
