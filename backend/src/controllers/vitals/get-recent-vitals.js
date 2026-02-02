const reportsApiService = require('../../services/reports-api.service');
const accessControlService = require('../../services/access-control.service');
const db = require('../../models');
const dataNormalizationService = require('../../services/data-normalization.service');
const auditLogService = require('../../services/audit-log.service');
const cacheService = require('../../services/cache.service');
const logger = require('../../utils/logger');
const { sanitizeResponseBody } = require('../../utils/audit-sanitizer');

const getRecentVitals = async (req, res) => {
  try {
    const { senior_id } = req.query;
    const userId = req.user_id;

    if (!senior_id) {
      return res.status(400).json({ error: 'senior_id is required' });
    }

    // Check access control (normalize user_type for case-insensitive comparison)
    const user = await db.Users.findByPk(userId);
    const userType = (user?.user_type && String(user.user_type).toLowerCase()) || '';
    let canAccess = false;
    let targetSeniorId = senior_id;

    if (userType === 'senior') {
      // Seniors can only access their own vitals
      canAccess = parseInt(userId) === parseInt(senior_id);
      targetSeniorId = userId;
    } else if (userType === 'caregiver') {
      // Caregivers can access vitals of linked seniors
      canAccess = await accessControlService.canCaregiverAccessSenior(userId, senior_id);
    } else if (userType === 'admin' || userType === 'super_admin') {
      // Admins have full access
      canAccess = true;
    }

    if (!canAccess) {
      return res.status(403).json({
        error: "Access denied: You do not have permission to access this senior's vitals",
      });
    }

    // Get senior's devices to fetch vitals
    // Note: External system is an integration service (device/reports provider), not a user management platform
    // We map internal users to external devices, not accounts
    const senior = await db.Users.findByPk(targetSeniorId);
    if (!senior) {
      return res.status(404).json({
        error: 'Senior account not found',
      });
    }

    // Get senior's devices from internal mapping
    const deviceMappings = await db.UserDeviceMapping.findAll({
      where: { user_id: targetSeniorId },
      include: [
        {
          model: db.Devices,
          as: 'device',
          attributes: ['device_id', 'id_type', 'device_imei', 'device_serial', 'device_uuid'],
        },
      ],
    });

    if (deviceMappings.length === 0) {
      return res.status(404).json({
        error: 'No devices found for this senior',
        message: 'Please register a device to view vitals',
      });
    }

    // Try to get cs_no from device mapping or use device identifier
    // External Reports API may require cs_no, which should come from device data, not user account
    const primaryDeviceMapping = deviceMappings.find(m => m.is_primary) || deviceMappings[0];
    const csNo = primaryDeviceMapping.cs_no;

    if (!csNo) {
      // If cs_no is not available, we cannot fetch reports from external API
      // This is expected if the external system doesn't have account records for our users
      logger.warn(`No cs_no found for senior ${targetSeniorId} - external reports unavailable`);
      return res.status(404).json({
        error: 'Vitals data unavailable',
        message: 'Device is not yet configured for reporting. Please contact support.',
      });
    }

    // Try to get from cache first
    const cacheKey = `vitals:recent:${csNo}`;
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      logger.debug(`Returning cached vitals for cs_no: ${csNo}`);
      const cachedVitals = Array.isArray(cached) ? cached : cached?.vitals || [];
      return res.status(200).json({
        vitals: cachedVitals,
        senior_id: targetSeniorId,
        cached: true,
      });
    }

    // Get recent vitals from Reports API using service-level credentials
    // Note: This call uses service credentials, not user-specific authentication
    let recentData;
    try {
      recentData = await reportsApiService.getRecentReports(csNo);
    } catch (error) {
      logger.error('Error fetching recent vitals from Reports API:', {
        error: error.message,
        cs_no: csNo,
        senior_id: targetSeniorId,
      });

      // If cache exists but expired, return stale data
      if (cached) {
        const cachedVitals = Array.isArray(cached) ? cached : cached?.vitals || [];
        return res.status(200).json({
          vitals: cachedVitals,
          senior_id: targetSeniorId,
          cached: true,
          warning: 'Using cached data due to external service temporarily unavailable',
        });
      }

      // Differentiate between external service errors and internal errors
      const isExternalError = error.response?.status >= 400 && error.response?.status < 500;
      return res.status(500).json({
        error: 'Unable to fetch vitals data',
        message: isExternalError
          ? 'The reporting service is currently unavailable. Please try again later.'
          : 'An error occurred while fetching vitals. Please try again later.',
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
      resource_id: csNo,
      external_api: 'reports',
      request_method: 'GET',
      request_path: `/report/recent/${csNo}`,
      request_body: { cs_no: csNo },
      response_body: sanitizeResponseBody(recentData),
      response_status: 200,
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    });

    res.status(200).json({
      vitals: normalizedData?.vitals || [],
      senior_id: targetSeniorId,
      cached: false,
    });
  } catch (error) {
    logger.error('Error in get-recent-vitals:', error);

    // Differentiate internal errors from external API errors
    if (error.response) {
      // External API error
      return res.status(500).json({
        error: 'Unable to fetch vitals data',
        message: 'The reporting service encountered an error. Please try again later.',
      });
    }

    // Internal error
    res.status(500).json({
      error: 'Internal server error',
      message:
        process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred. Please try again later.'
          : error.message,
    });
  }
};

module.exports = getRecentVitals;
