const { DataTypes } = require('sequelize');

module.exports = sequelize => {
  const AuditLog = sequelize.define(
    'audit_logs',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      action: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Action performed (e.g., device_access, vitals_access, api_call)',
      },
      resource_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Type of resource (device, vitals, account, etc.)',
      },
      resource_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'External resource ID',
      },
      external_api: {
        type: DataTypes.ENUM('account', 'device', 'reports'),
        allowNull: true,
        comment: 'External API called',
      },
      request_method: {
        type: DataTypes.STRING(10),
        allowNull: true,
        comment: 'HTTP method (GET, POST, PUT, DELETE)',
      },
      request_path: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'API endpoint path',
      },
      response_status: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'HTTP response status code',
      },
      ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true,
        comment: 'Client IP address',
      },
      user_agent: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'User agent string',
      },
      request_body: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Request body (sanitized)',
      },
      response_body: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Response body (sanitized, if needed)',
      },
      error_message: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Error message if request failed',
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
      },
    },
    {
      tableName: 'audit_logs',
      timestamps: false,
      underscored: true,
      indexes: [
        {
          fields: ['user_id'],
        },
        {
          fields: ['created_at'],
        },
        {
          fields: ['action'],
        },
        {
          fields: ['resource_type', 'resource_id'],
        },
        {
          fields: ['external_api'],
        },
      ],
    },
  );

  return AuditLog;
};
