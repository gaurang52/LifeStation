const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/auth/verify-token');
const { apiLimiter } = require('../middleware/rate-limit');

const addDevice = require('../controllers/devices/add-device');
const getDevices = require('../controllers/devices/get-devices');
const getDevice = require('../controllers/devices/get-device');
const getDeviceRecent = require('../controllers/devices/get-device-recent');
const getFallDetection = require('../controllers/devices/get-fall-detection');
const getDeviceTelemetry = require('../controllers/devices/get-device-telemetry');
const getDeviceMetadata = require('../controllers/devices/get-device-metadata');
const toggleFallDetection = require('../controllers/devices/toggle-fall-detection');
const requestSignal = require('../controllers/devices/request-signal');

// All routes require authentication
router.use(verifyToken);
router.use(apiLimiter);

// RESTful routes
// POST /devices - Create a new device
router.post('/', addDevice);

// GET /devices - List all accessible devices
router.get('/', getDevices);

// Specific routes must come before generic :id_type/:id route
// GET /devices/:id_type/:id/recent - Get most recent device information
router.get('/:id_type/:id/recent', getDeviceRecent);

// GET /devices/:id_type/:id/telemetry - Get telemetry (battery, signal, location)
router.get('/:id_type/:id/telemetry', getDeviceTelemetry);

// GET /devices/:id_type/:id/fall-detection - Get fall detection status
router.get('/:id_type/:id/fall-detection', getFallDetection);

// PUT /devices/:id_type/:id/fall-detection - Enable/update fall detection
router.put('/:id_type/:id/fall-detection', toggleFallDetection);

// POST /devices/:id_type/:id/signal - Request device signal
router.post('/:id_type/:id/signal', requestSignal);

// GET /devices/imei/:imei/metadata - Get device metadata by IMEI
router.get('/imei/:imei/metadata', getDeviceMetadata);

// GET /devices/:id_type/:id - Get specific device by ID (must be last)
router.get('/:id_type/:id', getDevice);

module.exports = router;
