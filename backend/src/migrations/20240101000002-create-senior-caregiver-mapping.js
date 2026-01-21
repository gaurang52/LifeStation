'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('senior_caregiver_mapping', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      senior_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      caregiver_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      relationship_with_senior: {
        type: Sequelize.ENUM(
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

    await queryInterface.addIndex('senior_caregiver_mapping', ['senior_id']);
    await queryInterface.addIndex('senior_caregiver_mapping', ['caregiver_id']);
    await queryInterface.addIndex('senior_caregiver_mapping', ['senior_id', 'caregiver_id'], {
      unique: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('senior_caregiver_mapping');
  },
};
