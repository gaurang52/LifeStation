const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/auth/verify-token');
const { apiLimiter, externalApiLimiter } = require('../middleware/rate-limit');

const getRecentVitals = require('../controllers/vitals/get-recent-vitals');
const downloadVitalsReport = require('../controllers/vitals/download-vitals-report');

// All routes require authentication
router.use(verifyToken);
router.use(apiLimiter);

// RESTful routes
// GET /vitals/recent?senior_id=123 - Get recent vitals for a senior
router.get('/recent', externalApiLimiter, getRecentVitals);
// GET /vitals/download?senior_id=123&format=csv|pdf - Download vitals report
router.get('/download', externalApiLimiter, downloadVitalsReport);

module.exports = router;
