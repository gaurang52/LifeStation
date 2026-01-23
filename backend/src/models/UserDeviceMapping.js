const { DataTypes } = require('sequelize');

module.exports = sequelize => {
  const UserDeviceMapping = sequelize.define(
    'user_device_mapping',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      device_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'devices',
          key: 'id',
        },
        comment: 'References devices.id',
      },
      external_device_id: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment:
          'External device identifier (IMEI, serial, or UUID) - kept for backward compatibility',
      },
      id_type: {
        type: DataTypes.ENUM('imei', 'serial', 'uuid', 'iccid'),
        allowNull: false,
      },
      cs_no: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Account API customer service number',
      },
      device_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'User-friendly device name',
      },
      is_primary: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Primary device for the user',
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: true,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: true,
      },
    },
    {
      tableName: 'user_device_mapping',
      timestamps: false,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['user_id', 'device_id'],
        },
        {
          unique: true,
          fields: ['user_id', 'external_device_id', 'id_type'],
        },
        {
          fields: ['user_id'],
        },
        {
          fields: ['external_device_id', 'id_type'],
        },
        {
          fields: ['cs_no'],
        },
      ],
    },
  );

  return UserDeviceMapping;
};
