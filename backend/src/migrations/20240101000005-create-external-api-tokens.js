'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('external_api_tokens', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      api_name: {
        type: Sequelize.ENUM('account', 'device', 'reports'),
        allowNull: false,
      },
      client_id: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      access_token_encrypted: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      refresh_token_encrypted: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        allowNull: true,
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        allowNull: true,
      },
    });

    await queryInterface.addIndex('external_api_tokens', ['api_name', 'client_id'], {
      unique: true,
    });
    await queryInterface.addIndex('external_api_tokens', ['expires_at']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('external_api_tokens');
  },
};
