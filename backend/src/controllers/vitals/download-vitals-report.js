const reportsApiService = require('../../services/reports-api.service');
const accessControlService = require('../../services/access-control.service');
const deviceContextService = require('../../services/device-context.service');
const db = require('../../models');
const dataNormalizationService = require('../../services/data-normalization.service');
const auditLogService = require('../../services/audit-log.service');
const logger = require('../../utils/logger');
const { sanitizeResponseBody } = require('../../utils/audit-sanitizer');

/**
 * Generate CSV content from vitals data
 */
const generateCSV = (vitals, seniorInfo) => {
  const headers = [
    'Timestamp',
    'Heart Rate (bpm)',
    'Systolic BP (mmHg)',
    'Diastolic BP (mmHg)',
    'Temperature (°C)',
    'Oxygen Saturation (%)',
    'Steps',
  ];

  const rows = vitals.map(vital => {
    const timestamp = new Date(vital.timestamp).toLocaleString();
    const heartRate =
      vital.heart_rate !== null && vital.heart_rate !== undefined ? vital.heart_rate : '';
    const systolic =
      vital.blood_pressure?.systolic !== null && vital.blood_pressure?.systolic !== undefined
        ? vital.blood_pressure.systolic
        : '';
    const diastolic =
      vital.blood_pressure?.diastolic !== null && vital.blood_pressure?.diastolic !== undefined
        ? vital.blood_pressure.diastolic
        : '';
    const temperature =
      vital.temperature !== null && vital.temperature !== undefined ? vital.temperature : '';
    const oxygenSat =
      vital.oxygen_saturation !== null && vital.oxygen_saturation !== undefined
        ? vital.oxygen_saturation
        : '';
    const steps = vital.steps !== null && vital.steps !== undefined ? vital.steps : '';

    return [timestamp, heartRate, systolic, diastolic, temperature, oxygenSat, steps]
      .map(val => `"${String(val).replace(/"/g, '""')}"`)
      .join(',');
  });

  const csvContent = [
    `"Vitals Report for ${seniorInfo.name || `Senior ID: ${seniorInfo.id}`}"`,
    `"Generated: ${new Date().toLocaleString()}"`,
    '',
    headers.map(h => `"${h}"`).join(','),
    ...rows,
  ].join('\n');

  return csvContent;
};

/**
 * Generate PDF content from vitals data (simplified text-based PDF)
 * Note: For production, consider using pdfkit library
 */
const generatePDF = (vitals, seniorInfo) => {
  // Simple PDF structure (minimal PDF format)
  // For a proper PDF, you'd want to use pdfkit or similar library
  // This is a simplified version that works but may have formatting limitations

  const lines = [
    `Vitals Report for ${seniorInfo.name || `Senior ID: ${seniorInfo.id}`}`,
    `Generated: ${new Date().toLocaleString()}`,
    '',
    'Timestamp | Heart Rate | BP (Sys/Dia) | Temp | O2 Sat | Steps',
    '----------|------------|--------------|------|--------|------',
  ];

  vitals.forEach(vital => {
    const timestamp = new Date(vital.timestamp).toLocaleString();
    const heartRate =
      vital.heart_rate !== null && vital.heart_rate !== undefined ? vital.heart_rate : '--';
    const systolic =
      vital.blood_pressure?.systolic !== null && vital.blood_pressure?.systolic !== undefined
        ? vital.blood_pressure.systolic
        : '--';
    const diastolic =
      vital.blood_pressure?.diastolic !== null && vital.blood_pressure?.diastolic !== undefined
        ? vital.blood_pressure.diastolic
        : '--';
    const bp = `${systolic}/${diastolic}`;
    const temperature =
      vital.temperature !== null && vital.temperature !== undefined ? vital.temperature : '--';
    const oxygenSat =
      vital.oxygen_saturation !== null && vital.oxygen_saturation !== undefined
        ? vital.oxygen_saturation
        : '--';
    const steps = vital.steps !== null && vital.steps !== undefined ? vital.steps : '--';

    lines.push(`${timestamp} | ${heartRate} | ${bp} | ${temperature} | ${oxygenSat} | ${steps}`);
  });

  // Return as plain text for now - in production, use pdfkit to generate proper PDF
  return lines.join('\n');
};

const downloadVitalsReport = async (req, res) => {
  try {
    const { senior_id, format = 'csv' } = req.query;
    const userId = req.user_id;

    if (!senior_id) {
      return res.status(400).json({ error: 'senior_id is required' });
    }

    if (!['csv', 'pdf'].includes(format.toLowerCase())) {
      return res.status(400).json({ error: 'format must be either "csv" or "pdf"' });
    }

    // Check access control (same logic as get-recent-vitals)
    const user = await db.Users.findByPk(userId);
    if (!user) {
      logger.error(`User not found for userId: ${userId}`);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found. Please log in again.',
      });
    }

    // Normalize user_type for case-insensitive comparison (DB may store 'Caregiver' or 'caregiver')
    const userType = (user?.user_type && String(user.user_type).toLowerCase()) || '';
    let canAccess = false;
    let targetSeniorId = senior_id;

    if (userType === 'senior') {
      canAccess = parseInt(userId) === parseInt(senior_id);
      targetSeniorId = userId;
    } else if (userType === 'caregiver') {
      canAccess = await accessControlService.canCaregiverAccessSenior(userId, senior_id);
    } else if (userType === 'admin' || userType === 'super_admin') {
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
        message: 'Please register a device to download vitals reports',
      });
    }

    // Use device-context service to properly resolve cs_no (same as get-recent-reports)
    // This ensures cs_no is fetched from Device API if not in mapping
    const primaryDeviceMapping = deviceMappings.find(m => m.is_primary) || deviceMappings[0];
    const primaryDevice = primaryDeviceMapping.device;

    if (!primaryDevice) {
      return res.status(404).json({
        error: 'Device not found',
        message: 'The primary device was not found in the system',
      });
    }

    // Resolve device context to get cs_no (includes fallback to Device API)
    const {
      device: resolvedDevice,
      canAccess: deviceAccess,
      csNo,
    } = await deviceContextService.resolveDeviceContext({
      userId,
      deviceId: primaryDevice.device_id,
      idType: primaryDevice.id_type,
      userType: req.user_type,
    });

    if (!resolvedDevice) {
      return res.status(404).json({
        error: 'Device not found',
        message: 'The specified device was not found in the system',
      });
    }

    if (!deviceAccess) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to access reports for this device',
      });
    }

    if (!csNo) {
      // If cs_no is not available, we cannot fetch reports from external API
      logger.warn(
        `No cs_no found for senior ${targetSeniorId}, device ${primaryDevice.device_id} - external reports unavailable`,
      );
      return res.status(404).json({
        error: 'Report data unavailable',
        message: 'Device is not yet configured for reporting. Please contact support.',
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

      // Differentiate between external service errors and internal errors
      const isExternalError = error.response?.status >= 400 && error.response?.status < 500;
      return res.status(500).json({
        error: 'Unable to fetch report data',
        message: isExternalError
          ? 'The reporting service is currently unavailable. Please try again later.'
          : 'An error occurred while fetching report data. Please try again later.',
      });
    }

    // Normalize data for mobile app
    let normalizedData;
    try {
      const normalized = dataNormalizationService.normalizeVitals(recentData, {
        senior_id: targetSeniorId,
      });

      // normalizeVitals returns { timestamp, vitals: [], alerts: [], device_status: {} }
      // For CSV/PDF generation, we need an array of vitals objects
      // Check if normalized.vitals exists and is an array
      if (
        normalized &&
        normalized.vitals &&
        Array.isArray(normalized.vitals) &&
        normalized.vitals.length > 0
      ) {
        // Use the vitals array directly - it should already be in the right format
        normalizedData = normalized.vitals;
      } else if (normalized && Array.isArray(normalized)) {
        // If normalized is already an array, use it directly
        normalizedData = normalized;
      } else if (recentData && Array.isArray(recentData)) {
        // Fallback: use raw data if it's an array
        normalizedData = recentData;
      } else if (recentData && recentData.data && Array.isArray(recentData.data)) {
        // Fallback: use data property if it exists
        normalizedData = recentData.data;
      } else if (recentData && recentData.vitals && Array.isArray(recentData.vitals)) {
        // Fallback: use vitals property if it exists
        normalizedData = recentData.vitals;
      } else {
        // Last resort: try to create array from normalized object
        normalizedData = [];
        if (normalized && normalized.vitals) {
          normalizedData = Array.isArray(normalized.vitals)
            ? normalized.vitals
            : [normalized.vitals];
        }
      }

      logger.debug('Vitals data normalized for download', {
        cs_no: csNo,
        senior_id: targetSeniorId,
        normalizedDataLength: Array.isArray(normalizedData) ? normalizedData.length : 0,
        normalizedDataType: typeof normalizedData,
      });
    } catch (normalizeError) {
      logger.error('Error normalizing vitals data:', {
        error: normalizeError.message,
        stack: normalizeError.stack,
        cs_no: csNo,
        senior_id: targetSeniorId,
        recentDataType: typeof recentData,
        recentDataKeys:
          recentData && typeof recentData === 'object' ? Object.keys(recentData) : 'not an object',
      });
      return res.status(500).json({
        error: 'Unable to process report data',
        message: 'An error occurred while processing the report data. Please try again later.',
      });
    }

    if (!normalizedData || !Array.isArray(normalizedData) || normalizedData.length === 0) {
      logger.warn('No vitals data available for download', {
        cs_no: csNo,
        senior_id: targetSeniorId,
        normalizedDataType: typeof normalizedData,
        normalizedDataLength: Array.isArray(normalizedData)
          ? normalizedData.length
          : 'not an array',
        recentDataType: typeof recentData,
      });
      return res.status(404).json({
        error: 'No vitals data available for download',
        message:
          'No vitals data found for this device. Please ensure the device has been active and reporting data.',
      });
    }

    // Generate file content
    const seniorInfo = {
      id: targetSeniorId,
      name:
        senior.first_name && senior.last_name
          ? `${senior.first_name} ${senior.last_name}`
          : senior.email || `Senior ${targetSeniorId}`,
    };

    let fileContent;
    let contentType;
    let filename;

    if (format.toLowerCase() === 'csv') {
      fileContent = generateCSV(normalizedData, seniorInfo);
      contentType = 'text/csv';
      filename = `vitals-report-${seniorInfo.id}-${Date.now()}.csv`;
    } else {
      // PDF format
      fileContent = generatePDF(normalizedData, seniorInfo);
      contentType = 'application/pdf';
      filename = `vitals-report-${seniorInfo.id}-${Date.now()}.pdf`;

      // Note: For proper PDF generation, you'd want to use pdfkit
      // This returns plain text formatted as a simple PDF-like structure
      // In production, replace this with actual PDF generation
      contentType = 'text/plain'; // Temporary - use pdfkit for real PDF
    }

    // Log audit entry (don't fail if logging fails)
    try {
      await auditLogService.log({
        user_id: userId,
        action: 'vitals_download',
        resource_type: 'vitals',
        resource_id: csNo,
        external_api: 'reports',
        request_method: 'GET',
        request_path: `/report/recent/${csNo}`,
        request_body: { cs_no: csNo, senior_id, format },
        response_body: sanitizeResponseBody(recentData),
        response_status: 200,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
      });
    } catch (auditError) {
      // Log audit error but don't fail the request
      logger.warn('Failed to log audit entry for vitals download:', auditError.message);
    }

    // Set headers and send file
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(fileContent, 'utf8'));
    res.status(200).send(fileContent);
  } catch (error) {
    logger.error('Error in download-vitals-report:', {
      error: error.message,
      stack: error.stack,
      userId: req.user_id,
      senior_id: req.query.senior_id,
      format: req.query.format,
    });

    // Differentiate internal errors from external API errors
    if (error.response) {
      // External API error
      return res.status(500).json({
        error: 'Unable to generate report',
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

module.exports = downloadVitalsReport;
