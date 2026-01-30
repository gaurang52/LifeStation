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
// Fall Detection toggle controllers removed - display only (matching reference app)
const requestSignal = require('../controllers/devices/request-signal');
const saveGeofenceSettings = require('../controllers/devices/save-geofence-settings');
const getGeofenceSettings = require('../controllers/devices/get-geofence-settings');

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

// Fall Detection route (display only - matching reference app)
// GET /devices/:id_type/:id/fall-detection - Get fall detection status
router.get('/:id_type/:id/fall-detection', getFallDetection);

// POST /devices/:id_type/:id/signal - Request device signal
router.post('/:id_type/:id/signal', requestSignal);

// Geofence routes (matching umbrella-app-backend exactly)
// POST /save-geo-fence-settings - Save/update geofence settings
router.post('/save-geo-fence-settings', saveGeofenceSettings);

// POST /get-geo-fence-settings - Get geofence settings
router.post('/get-geo-fence-settings', getGeofenceSettings);

// GET /devices/imei/:imei/metadata - Get device metadata by IMEI
router.get('/imei/:imei/metadata', getDeviceMetadata);

// GET /devices/:id_type/:id - Get specific device by ID (must be last)
router.get('/:id_type/:id', getDevice);

module.exports = router;
