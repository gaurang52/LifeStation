const PDFDocument = require('pdfkit');
const reportsApiService = require('../../services/reports-api.service');
const deviceContextService = require('../../services/device-context.service');
const auditLogService = require('../../services/audit-log.service');
const logger = require('../../utils/logger');
const { sanitizeResponseBody } = require('../../utils/audit-sanitizer');

const extractReportRows = reportData => {
  if (!reportData) {
    return [];
  }

  if (Array.isArray(reportData)) {
    return reportData;
  }

  if (Array.isArray(reportData.recent)) {
    return reportData.recent;
  }

  if (Array.isArray(reportData.reports)) {
    return reportData.reports;
  }

  if (Array.isArray(reportData.data)) {
    return reportData.data;
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
  if (!rows || rows.length === 0) {
    return '';
  }

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

/**
 * Generate PDF from report data
 * @param {Array} rows - Report rows
 * @param {Object} deviceInfo - Device information
 * @returns {Promise<Buffer>} - PDF buffer
 */
const generatePDF = (rows, deviceInfo) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('Recent Reports', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Device ID: ${deviceInfo.device_id}`, { align: 'left' });
      doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'left' });
      doc.moveDown(2);

      if (!rows || rows.length === 0) {
        doc.fontSize(14).text('No report data available.', { align: 'center' });
        doc.end();
        return;
      }

      // Get all unique keys from all rows
      const allKeys = Array.from(
        rows.reduce((set, row) => {
          if (row && typeof row === 'object') {
            Object.keys(row).forEach(key => set.add(key));
          }
          return set;
        }, new Set()),
      );

      // Table header
      doc.fontSize(10).font('Helvetica-Bold');
      const columnWidth = (doc.page.width - 100) / Math.min(allKeys.length, 5); // Max 5 columns
      const startX = 50;
      let currentY = doc.y;

      // Draw header row
      allKeys.slice(0, 5).forEach((key, index) => {
        doc.text(String(key).substring(0, 20), startX + index * columnWidth, currentY, {
          width: columnWidth,
          align: 'left',
        });
      });
      currentY += 20;

      // Draw line under header
      doc
        .moveTo(50, currentY)
        .lineTo(doc.page.width - 50, currentY)
        .stroke();
      currentY += 10;

      // Table rows
      doc.font('Helvetica');
      rows.forEach((row, rowIndex) => {
        // Check if we need a new page
        if (currentY > doc.page.height - 100) {
          doc.addPage();
          currentY = 50;
        }

        const normalizedRow = row && typeof row === 'object' ? row : { value: row };
        allKeys.slice(0, 5).forEach((key, colIndex) => {
          const value = normalizedRow[key];
          const displayValue =
            value !== null && value !== undefined ? String(value).substring(0, 30) : '--';

          doc.fontSize(9).text(displayValue, startX + colIndex * columnWidth, currentY, {
            width: columnWidth,
            align: 'left',
          });
        });
        currentY += 15;

        // Draw separator line every 5 rows
        if ((rowIndex + 1) % 5 === 0) {
          doc
            .moveTo(50, currentY)
            .lineTo(doc.page.width - 50, currentY)
            .stroke();
          currentY += 5;
        }
      });

      // Footer
      doc
        .fontSize(8)
        .text(`Page ${doc.page.number} - Total Records: ${rows.length}`, 50, doc.page.height - 50, {
          align: 'center',
        });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

const downloadRecentReports = async (req, res) => {
  try {
    const { device_id, id_type, format = 'json' } = req.query;
    const userId = req.user_id;

    if (!device_id) {
      return res.status(400).json({ error: 'device_id is required' });
    }

    const normalizedFormat = String(format).toLowerCase();
    if (!['json', 'csv', 'pdf'].includes(normalizedFormat)) {
      return res.status(400).json({ error: 'format must be either "json", "csv", or "pdf"' });
    }

    // Resolve device context to get cs_no (includes fallback to Device API)
    const { device, canAccess, csNo } = await deviceContextService.resolveDeviceContext({
      userId,
      deviceId: device_id,
      idType: id_type || null,
      userType: req.user_type,
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

    // cs_no comes from UserDeviceMapping or external Device API (GET /device/{id_type}/{id}); if missing, reporting is not configured for this device
    if (!csNo) {
      return res.status(404).json({
        error: 'Reports unavailable',
        message: 'Device is not yet configured for reporting. Please contact support.',
      });
    }

    // Fetch recent reports from External Reports API using Recent endpoint
    // Following Postman collection exactly: GET /report/recent/{cs_no}
    let recentData;
    try {
      recentData = await reportsApiService.getRecentReports(csNo);
    } catch (error) {
      logger.error('Error fetching recent reports from Reports API:', {
        error: error.message,
        cs_no: csNo,
        device_id: device.device_id,
      });

      // Log failed external API call to audit log
      await auditLogService.log({
        user_id: userId,
        action: 'reports_recent_download',
        resource_type: 'reports',
        resource_id: csNo,
        external_api: 'reports',
        request_method: 'GET',
        request_path: `/report/recent/${csNo}`,
        request_body: { cs_no: csNo },
        response_body: error.response?.data ? sanitizeResponseBody(error.response.data) : null,
        response_status: error.response?.status || 500,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        error_message: error.message,
      });

      const isExternalError = error.response?.status >= 400 && error.response?.status < 500;
      return res.status(500).json({
        error: 'Unable to fetch reports',
        message: isExternalError
          ? 'The reporting service is currently unavailable. Please try again later.'
          : 'An error occurred while fetching reports. Please try again later.',
      });
    }

    const rows = extractReportRows(recentData);
    if (!rows || rows.length === 0) {
      return res.status(404).json({
        error: 'No report data available',
        message: 'No recent reports found for this device.',
      });
    }

    const timestamp = Date.now();
    const filenameBase = `recent-reports-${device.device_id}-${timestamp}`;

    // Log successful download to audit log
    await auditLogService.log({
      user_id: userId,
      action: 'reports_recent_download',
      resource_type: 'reports',
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

    const deviceInfo = {
      device_id: device.device_id,
      id_type: device.id_type,
    };

    if (normalizedFormat === 'csv') {
      const csvContent = toCsv(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.csv"`);
      res.setHeader('Content-Length', Buffer.byteLength(csvContent, 'utf8'));
      res.status(200).send(csvContent);
    } else if (normalizedFormat === 'pdf') {
      const pdfBuffer = await generatePDF(rows, deviceInfo);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filenameBase}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.status(200).send(pdfBuffer);
    } else {
      const jsonContent = JSON.stringify(rows, null, 2);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.json"`);
      res.setHeader('Content-Length', Buffer.byteLength(jsonContent, 'utf8'));
      res.status(200).send(jsonContent);
    }
  } catch (error) {
    logger.error('Error in download-recent-reports:', error);
    res.status(500).json({
      error: 'Internal server error',
      message:
        process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred. Please try again later.'
          : error.message,
    });
  }
};

module.exports = downloadRecentReports;
