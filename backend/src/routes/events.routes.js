const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/auth/verify-token');
const { apiLimiter, externalApiLimiter } = require('../middleware/rate-limit');

const getAllEvents = require('../controllers/events/get-all-events');
const getEventsByType = require('../controllers/events/get-events-by-type');
const webhookEvent = require('../controllers/events/webhook-event');

// Webhook endpoint (no authentication required - should be secured with API key or IP whitelist in production)
// POST /events/webhook - Receive real-time events from external APIs
router.post('/webhook', apiLimiter, webhookEvent);

// All other routes require authentication
router.use(verifyToken);
router.use(apiLimiter);

// POST /events/get-all-events - Get all events for a device
router.post('/get-all-events', externalApiLimiter, getAllEvents);

// POST /events/get-events-by-type - Get events filtered by type
router.post('/get-events-by-type', externalApiLimiter, getEventsByType);

module.exports = router;
