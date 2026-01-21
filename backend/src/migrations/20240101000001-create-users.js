'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      mobile: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      user_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      gender: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      is_login: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      reset_token: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      token_expiration: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      deletion_token: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      deletion_token_expiry: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      deletion_requested: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      fcm_token: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      platform: {
        type: Sequelize.ENUM('ios', 'android', 'web'),
        allowNull: true,
      },
      last_notified_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      notification_enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      extra_info: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: { isPro: false },
      },
      status: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: 'ACTIVATED',
      },
      privacy_accepted: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      terms_accepted: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      cs_no: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
    });

    await queryInterface.addIndex('users', ['email'], { unique: true });
    await queryInterface.addIndex('users', ['user_type']);
    await queryInterface.addIndex('users', ['status']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('users');
  },
};
