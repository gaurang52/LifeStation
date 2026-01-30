const { DataTypes } = require('sequelize');

module.exports = sequelize => {
  const AllEvents = sequelize.define(
    'all_events',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      deviceid: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Device ID (IMEI, serial, or UUID)',
      },
      vendorcode: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Vendor code',
      },
      eventtime: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Event timestamp',
      },
      eventtype: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Event type (e.g., "In Fence", "Out Fence", "Panic", etc.)',
      },
      eventid: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        comment: 'Unique event identifier (UUID)',
      },
      rawevent: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Raw event data in JSON format',
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
      tableName: 'all_events',
      timestamps: false, // We manage created_at and updated_at manually
      underscored: true,
      indexes: [
        {
          fields: ['deviceid'],
        },
        {
          fields: ['eventtype'],
        },
        {
          fields: ['eventtime'],
        },
        {
          unique: true,
          fields: ['eventid'],
        },
      ],
    },
  );

  return AllEvents;
};
