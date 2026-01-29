const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const db = require('../models');
const logger = require('../utils/logger');

// Initialize AWS SNS client
const snsClient = new SNSClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined,
});

/**
 * Send SMS message using AWS SNS
 * @param {string} phoneNumber - Recipient phone number (E.164 format: +1234567890)
 * @param {string} message - SMS message content
 * @returns {Promise<object|null>} - SNS response or null
 */
const sendSMS = async (phoneNumber, message) => {
  if (!phoneNumber) {
    logger.warn('No phone number provided, skipping SMS');
    return null;
  }

  // Validate phone number format (basic check)
  const cleanedPhone = phoneNumber.trim().replace(/[\s\-\(\)]/g, '');
  if (!cleanedPhone.match(/^\+?[1-9]\d{1,14}$/)) {
    logger.warn(`Invalid phone number format: ${phoneNumber}`);
    return null;
  }

  // Ensure phone number is in E.164 format (starts with +)
  const e164Phone = cleanedPhone.startsWith('+') ? cleanedPhone : `+${cleanedPhone}`;

  // Check if AWS credentials are configured
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    logger.warn(
      'AWS SNS credentials not configured. SMS will not be sent. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in environment variables.',
    );
    return null;
  }

  try {
    const command = new PublishCommand({
      PhoneNumber: e164Phone,
      Message: message,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional', // Use 'Promotional' for non-critical messages
        },
      },
    });

    const response = await snsClient.send(command);
    logger.info('SMS sent successfully:', {
      phoneNumber: e164Phone,
      messageId: response.MessageId,
    });
    return response;
  } catch (error) {
    logger.error('Error sending SMS:', {
      error: error.message,
      phoneNumber: e164Phone,
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * Send SMS to multiple recipients
 * @param {Array<{phoneNumber: string, message: string}>} recipients - Array of recipient objects
 * @returns {Promise<Array>} - Array of results
 */
const sendBulkSMS = async recipients => {
  logger.info('Sending bulk SMS:', recipients.length);
  const results = [];

  for (const recipient of recipients) {
    try {
      const response = await sendSMS(recipient.phoneNumber, recipient.message);
      results.push({ success: true, phoneNumber: recipient.phoneNumber, response });
    } catch (error) {
      logger.error('Error sending SMS to recipient:', {
        phoneNumber: recipient.phoneNumber,
        error: error.message,
      });
      results.push({
        success: false,
        phoneNumber: recipient.phoneNumber,
        error: error.message,
      });
    }
  }

  return results;
};

module.exports = {
  sendSMS,
  sendBulkSMS,
};
