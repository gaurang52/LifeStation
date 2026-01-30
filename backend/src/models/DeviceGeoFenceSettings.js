const { DataTypes } = require('sequelize');

module.exports = sequelize => {
  const DeviceGeoFenceSettings = sequelize.define(
    'device_geofence_settings',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      device_id: {
        type: DataTypes.STRING(255),
        allowNull: false,
        references: {
          model: 'devices',
          key: 'device_id',
        },
        comment: 'Reference to device_id in devices table',
      },
      geo_fence_settings: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Geofence settings containing center (lat, lng) and radius in meters',
      },
      extra_information: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Additional geofence metadata',
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
      tableName: 'device_geofence_settings',
      timestamps: false, // We manage created_at and updated_at manually
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['device_id'],
        },
      ],
    },
  );

  return DeviceGeoFenceSettings;
};
