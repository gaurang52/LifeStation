require('dotenv').config();
const { app } = require('./src/app');
const db = require('./src/models');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 3000;

// Start server
app.listen(PORT, async () => {
  logger.info(`Server is running on port ${PORT}`);

  try {
    // Test database connection
    await db.sequelize.authenticate();
    logger.info('Database connected successfully');
    // Associations are already loaded in src/models/index.js
    logger.info('Database associations loaded');
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  await db.sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  await db.sequelize.close();
  process.exit(0);
});
