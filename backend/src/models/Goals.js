const { DataTypes } = require('sequelize');

module.exports = sequelize => {
  const Goal = sequelize.define(
    'goals',
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
      goal_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Type of goal (steps, medication, etc.)',
      },
      target_value: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      current_value: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
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
      tableName: 'goals',
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

  return Goal;
};
