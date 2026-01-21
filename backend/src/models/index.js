require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  pool: {
    max: parseInt(process.env.DB_POOL_MAX) || 10,
    min: parseInt(process.env.DB_POOL_MIN) || 2,
    acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 30000,
    idle: parseInt(process.env.DB_POOL_IDLE) || 10000,
  },
  dialect: process.env.DB_DIALECT,
  dialectOptions: {
    statement_timeout: 60000,
  },
  retry: {
    max: 5,
    match: [/ConnectionAcquireTimeoutError/, /SequelizeConnectionTimedOutError/],
    backoffBase: 1000,
    backoffExponent: 1.5,
  },
  database: process.env.DB_NAME,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
});

const db = {};

// Import models
db.Users = require('./Users')(sequelize);
db.SeniorCaregiverMapping = require('./SeniorCaregiverMapping')(sequelize);
db.Devices = require('./Devices')(sequelize);
db.UserDeviceMapping = require('./UserDeviceMapping')(sequelize);
db.ExternalApiTokens = require('./ExternalApiTokens')(sequelize);
db.AuditLogs = require('./AuditLogs')(sequelize);
db.NotificationLogs = require('./NotificationLogs')(sequelize);
db.MedicationReminders = require('./MedicationReminders')(sequelize);
db.Goals = require('./Goals')(sequelize);

// Setup associations (only if not already set up)
if (!db.associationsLoaded) {
  require('./associations')(db);
  db.associationsLoaded = true;
}

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
