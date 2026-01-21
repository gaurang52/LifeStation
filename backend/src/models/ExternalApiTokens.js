const { DataTypes } = require('sequelize');

module.exports = sequelize => {
  const ExternalApiToken = sequelize.define(
    'external_api_tokens',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      api_name: {
        type: DataTypes.ENUM('account', 'device', 'reports'),
        allowNull: false,
      },
      client_id: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      access_token_encrypted: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Encrypted OAuth2 access token',
      },
      refresh_token_encrypted: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Encrypted OAuth2 refresh token',
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Token expiration timestamp',
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: true,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: true,
      },
    },
    {
      tableName: 'external_api_tokens',
      timestamps: false,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['api_name', 'client_id'],
        },
        {
          fields: ['expires_at'],
        },
      ],
    },
  );

  return ExternalApiToken;
};
