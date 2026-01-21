'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('goals', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      goal_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      target_value: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      current_value: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      start_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      end_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    await queryInterface.addIndex('goals', ['user_id']);
    await queryInterface.addIndex('goals', ['is_active']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('goals');
  },
};
