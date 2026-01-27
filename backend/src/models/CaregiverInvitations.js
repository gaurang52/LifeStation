const { DataTypes } = require('sequelize');

module.exports = sequelize => {
  const CaregiverInvitation = sequelize.define(
    'caregiver_invitations',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      inviter_user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      caregiver_email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isEmail: true,
        },
      },
      invitation_token: {
        type: DataTypes.STRING,
        allowNull: true, // Not used - email-based matching only
        unique: false, // Removed unique constraint as token is not used
      },
      status: {
        type: DataTypes.ENUM('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      relationship_with_senior: {
        type: DataTypes.ENUM(
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
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      accepted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      revoked_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'caregiver_invitations',
      timestamps: false,
      underscored: true,
      indexes: [
        {
          fields: ['inviter_user_id'],
        },
        {
          fields: ['caregiver_email'],
        },
        {
          unique: true,
          fields: ['invitation_token'],
        },
        {
          fields: ['status'],
        },
        {
          fields: ['expires_at'],
        },
        {
          fields: ['inviter_user_id', 'caregiver_email', 'status'],
        },
      ],
    },
  );

  return CaregiverInvitation;
};
