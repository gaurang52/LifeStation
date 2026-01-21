const { DataTypes } = require('sequelize');

module.exports = sequelize => {
  const NotificationLog = sequelize.define(
    'notification_logs',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      recipient_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      recipient_fcm_token: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('success', 'failed'),
        allowNull: false,
      },
      error_message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      is_emergency: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: true,
      },
    },
    {
      tableName: 'notification_logs',
      timestamps: false,
      underscored: true,
      indexes: [
        {
          fields: ['recipient_id'],
        },
        {
          fields: ['created_at'],
        },
        {
          fields: ['status'],
        },
        {
          fields: ['is_emergency'],
        },
      ],
    },
  );

  return NotificationLog;
};
