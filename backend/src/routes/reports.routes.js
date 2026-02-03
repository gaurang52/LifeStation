const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/auth/verify-token');
const { apiLimiter, externalApiLimiter } = require('../middleware/rate-limit');

const getRecentReports = require('../controllers/reports/get-recent-reports');
const downloadRecentReports = require('../controllers/reports/download-recent-reports');
const downloadHistoryReport = require('../controllers/reports/download-history-report');
const getSignalTypes = require('../controllers/reports/get-signal-types');
const getAccountReport = require('../controllers/reports/get-account-report');

// All routes require authentication
router.use(verifyToken);
router.use(apiLimiter);

// GET /reports/recent?device_id=... - List recent reports for a device/account
router.get('/recent', externalApiLimiter, getRecentReports);

// GET /reports/recent/download?device_id=...&format=csv|json - Download recent reports (uses Recent API)
router.get('/recent/download', externalApiLimiter, downloadRecentReports);

// POST /reports/history/download - Generate and download history report (csv/json)
router.post('/history/download', externalApiLimiter, downloadHistoryReport);

// GET /reports/signal-types - Get available report signal types
router.get('/signal-types', externalApiLimiter, getSignalTypes);

// GET /reports/account - Create, poll, and return account report (Accounts Create → Ready → Get)
router.get('/account', externalApiLimiter, getAccountReport);

module.exports = router;
