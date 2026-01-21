'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('notification_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      recipient_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      recipient_fcm_token: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('success', 'failed'),
        allowNull: false,
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      is_emergency: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        allowNull: true,
      },
    });

    await queryInterface.addIndex('notification_logs', ['recipient_id']);
    await queryInterface.addIndex('notification_logs', ['created_at']);
    await queryInterface.addIndex('notification_logs', ['status']);
    await queryInterface.addIndex('notification_logs', ['is_emergency']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('notification_logs');
  },
};
