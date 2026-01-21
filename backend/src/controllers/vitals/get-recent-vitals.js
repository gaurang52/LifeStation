const reportsApiService = require('../../services/reports-api.service');
const accessControlService = require('../../services/access-control.service');
const db = require('../../models');
const dataNormalizationService = require('../../services/data-normalization.service');
const auditLogService = require('../../services/audit-log.service');
const cacheService = require('../../services/cache.service');
const logger = require('../../utils/logger');

const getRecentVitals = async (req, res) => {
  try {
    const { senior_id } = req.query;
    const userId = req.user_id;

    if (!senior_id) {
      return res.status(400).json({ error: 'senior_id is required' });
    }

    // Check access control
    const user = await db.Users.findByPk(userId);
    let canAccess = false;
    let targetSeniorId = senior_id;

    if (user.user_type === 'senior') {
      // Seniors can only access their own vitals
      canAccess = parseInt(userId) === parseInt(senior_id);
      targetSeniorId = userId;
    } else if (user.user_type === 'caregiver') {
      // Caregivers can access vitals of linked seniors
      canAccess = await accessControlService.canCaregiverAccessSenior(userId, senior_id);
    } else if (user.user_type === 'ADMIN' || user.user_type === 'SUPER_ADMIN') {
      // Admins have full access
      canAccess = true;
    }

    if (!canAccess) {
      return res.status(403).json({
        error: "Access denied: You do not have permission to access this senior's vitals",
      });
    }

    // Get senior's cs_no
    const senior = await db.Users.findByPk(targetSeniorId);
    if (!senior || !senior.cs_no) {
      return res.status(404).json({
        error: 'Senior account not found or not linked to external system',
      });
    }

    // Try to get from cache first
    const cacheKey = `vitals:recent:${senior.cs_no}`;
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      logger.debug(`Returning cached vitals for cs_no: ${senior.cs_no}`);
      return res.status(200).json({
        vitals: cached,
        senior_id: targetSeniorId,
        cached: true,
      });
    }

    // Get recent vitals from Reports API
    let recentData;
    try {
      recentData = await reportsApiService.getRecentReports(senior.cs_no);
    } catch (error) {
      logger.error('Error fetching recent vitals from Reports API:', error);

      // If cache exists but expired, return stale data
      if (cached) {
        return res.status(200).json({
          vitals: cached,
          senior_id: targetSeniorId,
          cached: true,
          warning: 'Using cached data due to external API error',
        });
      }

      return res.status(500).json({
        error: 'Failed to fetch vitals from external service',
        message: error.message,
      });
    }

    // Normalize data for mobile app
    const normalizedData = dataNormalizationService.normalizeVitals(recentData, {
      senior_id: targetSeniorId,
    });

    // Cache normalized data for 5 minutes
    await cacheService.set(cacheKey, normalizedData, 300);

    // Log audit entry
    await auditLogService.log({
      user_id: userId,
      action: 'vitals_access',
      resource_type: 'vitals',
      resource_id: senior.cs_no,
      external_api: 'reports',
      request_method: 'GET',
      request_path: `/report/recent/${senior.cs_no}`,
      response_status: 200,
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    });

    res.status(200).json({
      vitals: normalizedData,
      senior_id: targetSeniorId,
      cached: false,
    });
  } catch (error) {
    logger.error('Error in get-recent-vitals:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
};

module.exports = getRecentVitals;
