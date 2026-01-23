const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/auth/verify-token');
const { apiLimiter } = require('../middleware/rate-limit');

const getCaregivers = require('../controllers/caregivers/get-caregivers');
const addCaregiver = require('../controllers/caregivers/add-caregiver');
const deleteCaregiver = require('../controllers/caregivers/delete-caregiver');
const getSeniors = require('../controllers/caregivers/get-seniors');

// All routes require authentication
router.use(verifyToken);
router.use(apiLimiter);

// Senior routes - manage caregivers (matching old API structure)
// GET /senior/get-mapped-caregiver-list - List all caregivers for the authenticated senior
router.get('/senior/get-mapped-caregiver-list', getCaregivers);

// POST /senior/add-caregiver - Add a caregiver by email
router.post('/senior/add-caregiver', addCaregiver);

// POST /senior/delete-caregiver - Remove a caregiver (using POST to match old API)
router.post('/senior/delete-caregiver', deleteCaregiver);

// Caregiver routes - view seniors
// GET /caregiver/get-mapped-seniors-list - List all seniors for the authenticated caregiver
router.get('/caregiver/get-mapped-seniors-list', getSeniors);

module.exports = router;
