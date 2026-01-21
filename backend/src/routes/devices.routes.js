const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/auth/verify-token');
const { apiLimiter } = require('../middleware/rate-limit');

const addDevice = require('../controllers/devices/add-device');
const getDevices = require('../controllers/devices/get-devices');
const getDevice = require('../controllers/devices/get-device');
const getFallDetection = require('../controllers/devices/get-fall-detection');
const toggleFallDetection = require('../controllers/devices/toggle-fall-detection');

// All routes require authentication
router.use(verifyToken);
router.use(apiLimiter);

// RESTful routes
// POST /devices - Create a new device
router.post('/', addDevice);

// GET /devices - List all accessible devices
router.get('/', getDevices);

// GET /devices/:id_type/:id - Get specific device by ID
router.get('/:id_type/:id', getDevice);

// GET /devices/:id_type/:id/fall-detection - Get fall detection status
router.get('/:id_type/:id/fall-detection', getFallDetection);

// PUT /devices/:id_type/:id/fall-detection - Enable/update fall detection
router.put('/:id_type/:id/fall-detection', toggleFallDetection);

module.exports = router;
