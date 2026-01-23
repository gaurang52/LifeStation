const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const errorHandler = require('./middleware/error-handler');
const auditLogger = require('./middleware/audit-logger');
const logger = require('./utils/logger');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Audit logging middleware (before routes)
app.use(auditLogger);

// Routes
const authRoutes = require('./routes/auth.routes');
const devicesRoutes = require('./routes/devices.routes');
const vitalsRoutes = require('./routes/vitals.routes');
const caregiversRoutes = require('./routes/caregivers.routes');
const eventsRoutes = require('./routes/events.routes');
const reportsRoutes = require('./routes/reports.routes');

app.use('/auth', authRoutes);
app.use('/devices', devicesRoutes);
app.use('/vitals', vitalsRoutes);
app.use('/events', eventsRoutes);
app.use('/reports', reportsRoutes);
app.use('/', caregiversRoutes); // Caregiver routes use root path (e.g., /senior/...)

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'brighton-backend',
  });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.status(200).json({ message: 'Test API Called!!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handler (must be last)
app.use(errorHandler);

module.exports = { app };
