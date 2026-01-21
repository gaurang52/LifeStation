const { DataTypes } = require('sequelize');

module.exports = sequelize => {
  const User = sequelize.define(
    'users',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      mobile: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      user_type: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isIn: [['ADMIN', 'SUPER_ADMIN', 'caregiver', 'senior']],
        },
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      gender: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      is_login: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      reset_token: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      token_expiration: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      deletion_token: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      deletion_token_expiry: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      deletion_requested: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      fcm_token: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      platform: {
        type: DataTypes.ENUM('ios', 'android', 'web'),
        allowNull: true,
      },
      last_notified_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
      },
      notification_enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      extra_info: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {
          isPro: false,
        },
      },
      status: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'ACTIVATED',
      },
      privacy_accepted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      terms_accepted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      cs_no: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'External Account API customer service number',
      },
    },
    {
      tableName: 'users',
      timestamps: false,
      underscored: true,
    },
  );

  return User;
};
