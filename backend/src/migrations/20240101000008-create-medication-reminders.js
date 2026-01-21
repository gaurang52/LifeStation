'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('medication_reminders', {
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
      medication_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      dosage: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      frequency: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      time_schedule: {
        type: Sequelize.JSONB,
        allowNull: true,
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

    await queryInterface.addIndex('medication_reminders', ['user_id']);
    await queryInterface.addIndex('medication_reminders', ['is_active']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('medication_reminders');
  },
};
