const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/auth/verify-token');
const { apiLimiter } = require('../middleware/rate-limit');

const getCaregivers = require('../controllers/caregivers/get-caregivers');
const addCaregiver = require('../controllers/caregivers/add-caregiver');
const deleteCaregiver = require('../controllers/caregivers/delete-caregiver');
const getSeniors = require('../controllers/caregivers/get-seniors');
const createInvitation = require('../controllers/caregivers/create-invitation');
const resendInvitation = require('../controllers/caregivers/resend-invitation');
const listInvitations = require('../controllers/caregivers/list-invitations');
const revokeInvitation = require('../controllers/caregivers/revoke-invitation');
const sendHelpNotification = require('../controllers/caregivers/send-help-notification');

// All routes require authentication
router.use(verifyToken);
router.use(apiLimiter);

// Senior routes - manage caregivers (matching old API structure)
// GET /senior/get-mapped-caregiver-list - List all caregivers for the authenticated senior
router.get('/senior/get-mapped-caregiver-list', getCaregivers);

// POST /senior/add-caregiver - Add a caregiver by email (creates invitation if caregiver doesn't exist)
router.post('/senior/add-caregiver', addCaregiver);

// POST /senior/delete-caregiver - Remove a caregiver (using POST to match old API)
router.post('/senior/delete-caregiver', deleteCaregiver);

// POST /senior/help - Send help/emergency notification to all mapped caregivers
router.post('/senior/help', sendHelpNotification);

// Invitation routes - manage caregiver invitations
// POST /senior/caregivers/invite - Create a new caregiver invitation
router.post('/senior/caregivers/invite', createInvitation);

// GET /senior/caregivers/invitations - List all invitations for the authenticated senior
router.get('/senior/caregivers/invitations', listInvitations);

// POST /senior/caregivers/invitations/:invitationId/resend - Resend an invitation
router.post('/senior/caregivers/invitations/:invitationId/resend', resendInvitation);

// POST /senior/caregivers/invitations/:invitationId/revoke - Revoke an invitation
router.post('/senior/caregivers/invitations/:invitationId/revoke', revokeInvitation);

// Caregiver routes - view seniors
// GET /caregiver/get-mapped-seniors-list - List all seniors for the authenticated caregiver
router.get('/caregiver/get-mapped-seniors-list', getSeniors);

module.exports = router;
