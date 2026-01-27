'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('caregiver_invitations', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      inviter_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      caregiver_email: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          isEmail: true,
        },
      },
      invitation_token: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      status: {
        type: Sequelize.ENUM('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED'),
        allowNull: false,
        defaultValue: 'PENDING',
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
        defaultValue: 'other',
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        allowNull: false,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      accepted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      revoked_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Add indexes for performance
    await queryInterface.addIndex('caregiver_invitations', ['inviter_user_id']);
    await queryInterface.addIndex('caregiver_invitations', ['caregiver_email']);
    await queryInterface.addIndex('caregiver_invitations', ['invitation_token'], {
      unique: true,
    });
    await queryInterface.addIndex('caregiver_invitations', ['status']);
    await queryInterface.addIndex('caregiver_invitations', ['expires_at']);
    // Composite index for checking active invitations
    await queryInterface.addIndex('caregiver_invitations', [
      'inviter_user_id',
      'caregiver_email',
      'status',
    ]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('caregiver_invitations');
  },
};
