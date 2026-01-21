const { DataTypes } = require('sequelize');

module.exports = sequelize => {
  const MedicationReminder = sequelize.define(
    'medication_reminders',
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
      medication_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      dosage: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      frequency: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      time_schedule: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Array of times for medication',
      },
      start_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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
      tableName: 'medication_reminders',
      timestamps: false,
      underscored: true,
      indexes: [
        {
          fields: ['user_id'],
        },
        {
          fields: ['is_active'],
        },
      ],
    },
  );

  return MedicationReminder;
};
