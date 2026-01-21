const { DataTypes } = require('sequelize');

module.exports = sequelize => {
  const SeniorCaregiverMapping = sequelize.define(
    'senior_caregiver_mapping',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      senior_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      caregiver_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      relationship_with_senior: {
        type: DataTypes.ENUM(
          'parent',
          'sibling',
          'spouse',
          'child',
          'friend',
          'professional_caregiver',
          'other',
        ),
        allowNull: false,
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
      tableName: 'senior_caregiver_mapping',
      timestamps: false,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['senior_id', 'caregiver_id'],
        },
      ],
    },
  );

  return SeniorCaregiverMapping;
};
