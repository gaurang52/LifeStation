'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('audit_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      action: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      resource_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      resource_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      external_api: {
        type: Sequelize.ENUM('account', 'device', 'reports'),
        allowNull: true,
      },
      request_method: {
        type: Sequelize.STRING(10),
        allowNull: true,
      },
      request_path: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      response_status: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true,
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      request_body: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      response_body: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        allowNull: false,
      },
    });

    await queryInterface.addIndex('audit_logs', ['user_id']);
    await queryInterface.addIndex('audit_logs', ['created_at']);
    await queryInterface.addIndex('audit_logs', ['action']);
    await queryInterface.addIndex('audit_logs', ['resource_type', 'resource_id']);
    await queryInterface.addIndex('audit_logs', ['external_api']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('audit_logs');
  },
};
