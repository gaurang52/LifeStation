const reportsApiService = require('../../services/reports-api.service');
const deviceContextService = require('../../services/device-context.service');
const auditLogService = require('../../services/audit-log.service');
const logger = require('../../utils/logger');

const extractReportRows = reportData => {
  if (!reportData) {
    return [];
  }

  if (Array.isArray(reportData)) {
    return reportData;
  }

  if (Array.isArray(reportData.data)) {
    return reportData.data;
  }

  if (Array.isArray(reportData.report)) {
    return reportData.report;
  }

  if (Array.isArray(reportData.signals)) {
    return reportData.signals;
  }

  if (Array.isArray(reportData.events)) {
    return reportData.events;
  }

  return [];
};

const toCsv = rows => {
  const normalizedRows = rows.map(row => (row && typeof row === 'object' ? row : { value: row }));
  const headers = Array.from(
    normalizedRows.reduce((set, row) => {
      Object.keys(row).forEach(key => set.add(key));
      return set;
    }, new Set()),
  );

  const escape = value => {
    if (value === null || value === undefined) {
      return '""';
    }
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    return `"${stringValue.replace(/"/g, '""')}"`;
  };

  const lines = [
    headers.map(header => `"${header}"`).join(','),
    ...normalizedRows.map(row => headers.map(header => escape(row[header])).join(',')),
  ];

  return lines.join('\n');
};

const normalizeSignalTypes = signalTypes => {
  if (!signalTypes) {
    return null;
  }

  if (Array.isArray(signalTypes)) {
    return signalTypes;
  }

  if (typeof signalTypes === 'string') {
    return signalTypes
      .split(',')
      .map(value => value.trim())
      .filter(Boolean);
  }

  return null;
};

const downloadHistoryReport = async (req, res) => {
  try {
    const { device_id, id_type, before, after, signal_types, format = 'json' } = req.body;
    const userId = req.user_id;

    if (!device_id) {
      return res.status(400).json({ error: 'device_id is required' });
    }

    const normalizedFormat = String(format).toLowerCase();
    if (!['json', 'csv'].includes(normalizedFormat)) {
      return res.status(400).json({ error: 'format must be either "json" or "csv"' });
    }

    const { device, canAccess, csNo } = await deviceContextService.resolveDeviceContext({
      userId,
      deviceId: device_id,
      idType: id_type || null,
    });

    if (!device) {
      return res.status(404).json({
        error: 'Device not found',
        message: 'The specified device was not found in the system',
      });
    }

    if (!canAccess) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to access reports for this device',
      });
    }

    if (!csNo) {
      return res.status(404).json({
        error: 'Reports unavailable',
        message: 'Device is not yet configured for reporting. Please contact support.',
      });
    }

    let reportData;
    try {
      reportData = await reportsApiService.getEventHistory({
        csNo,
        before,
        after,
        signalTypes: normalizeSignalTypes(signal_types),
      });
    } catch (error) {
      logger.error('Error creating or fetching history report:', {
        error: error.message,
        cs_no: csNo,
        device_id: device.device_id,
      });

      const isExternalError = error.response?.status >= 400 && error.response?.status < 500;
      return res.status(500).json({
        error: 'Unable to generate report',
        message: isExternalError
          ? 'The reporting service is currently unavailable. Please try again later.'
          : 'An error occurred while generating the report. Please try again later.',
      });
    }

    const rows = extractReportRows(reportData);
    if (!rows || rows.length === 0) {
      return res.status(404).json({
        error: 'No report data available',
        message: 'No report data found for the selected filters.',
      });
    }

    const timestamp = Date.now();
    const filenameBase = `history-report-${device.device_id}-${timestamp}`;

    if (normalizedFormat === 'csv') {
      const csvContent = toCsv(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.csv"`);
      res.status(200).send(csvContent);
    } else {
      const jsonContent = JSON.stringify(rows, null, 2);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.json"`);
      res.status(200).send(jsonContent);
    }

    await auditLogService.log({
      user_id: userId,
      action: 'reports_history_download',
      resource_type: 'reports',
      resource_id: csNo,
      external_api: 'reports',
      request_method: 'POST',
      request_path: '/reports/history/download',
      response_status: 200,
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    });
  } catch (error) {
    logger.error('Error in download-history-report:', error);
    res.status(500).json({
      error: 'Internal server error',
      message:
        process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred. Please try again later.'
          : error.message,
    });
  }
};

module.exports = downloadHistoryReport;
