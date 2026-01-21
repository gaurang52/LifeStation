const { DataTypes } = require('sequelize');

module.exports = sequelize => {
  const Device = sequelize.define(
    'devices',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      // Primary identifier (IMEI, serial, or UUID)
      device_id: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        comment: 'Primary device identifier (IMEI, serial, or UUID)',
      },
      id_type: {
        type: DataTypes.ENUM('imei', 'serial', 'uuid'),
        allowNull: false,
        comment: 'Type of device identifier',
      },
      // Device identifiers
      device_imei: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Device IMEI number',
      },
      device_serial: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Device serial number',
      },
      device_uuid: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Device UUID',
      },
      // Device information
      name: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Device name or friendly name',
      },
      device_type: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Device type code from external API',
      },
      sim_iccid: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'SIM card ICCID',
      },
      servco_no: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Service Company Number from Account API',
      },
      // Device status
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'active',
        validate: {
          isIn: [['active', 'inactive', 'pending', 'deactivated', 'error']],
        },
        comment: 'Device status',
      },
      // Device features
      fall_detection_enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether fall detection is enabled',
      },
      // Device metadata from external API
      battery_level: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Battery level percentage',
      },
      signal_strength: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Signal strength (weak, moderate, strong)',
      },
      last_seen: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Last time device was seen/active',
      },
      device_metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Additional device metadata from Device API',
      },
      // Sync information
      last_synced_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Last time device data was synced from Device API',
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
      },
    },
    {
      tableName: 'devices',
      timestamps: false,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['device_id'],
        },
        {
          fields: ['id_type'],
        },
        {
          fields: ['device_imei'],
        },
        {
          fields: ['device_serial'],
        },
        {
          fields: ['device_uuid'],
        },
        {
          fields: ['servco_no'],
        },
        {
          fields: ['status'],
        },
        {
          fields: ['last_synced_at'],
        },
      ],
    },
  );

  return Device;
};
