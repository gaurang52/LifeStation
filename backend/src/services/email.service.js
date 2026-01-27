require('dotenv').config();
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

/**
 * Email Service
 * Handles sending emails using nodemailer
 * Supports SMTP configuration via environment variables
 */

// Create transporter based on environment configuration
const createTransporter = () => {
  // Check if Gmail service is configured
  if (process.env.GMAIL_SERVICE_HOST && process.env.GMAIL_SERVICE_PORT) {
    return nodemailer.createTransport({
      service: process.env.GMAIL_SERVICE_NAME || 'gmail',
      host: process.env.GMAIL_SERVICE_HOST,
      port: parseInt(process.env.GMAIL_SERVICE_PORT) || 587,
      secure: process.env.GMAIL_SERVICE_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.GMAIL_USER_NAME,
        pass: process.env.GMAIL_USER_PASSWORD,
      },
      tls: {
        rejectUnauthorized: true,
      },
    });
  }

  // Fallback to test account (for development)
  // In production, Gmail service should be configured
  logger.warn(
    'Gmail service not configured, using test account. Emails will not be sent in production.',
  );
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: 'test@example.com',
      pass: 'test',
    },
  });
};

const transporter = createTransporter();

/**
 * Send caregiver invitation email
 * @param {string} toEmail - Recipient email address
 * @param {string} inviterName - Name of the person sending the invitation
 * @param {string} appName - Application name (default: "LifeStation")
 * @returns {Promise<object>} - Email sending result
 */
const sendCaregiverInvitation = async (toEmail, inviterName, appName = 'LifeStation') => {
  try {
    // Construct signup URL (email-based matching, no token needed)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const signupUrl = `${frontendUrl}/signup`;

    // Format from address with FROM_NAME if provided
    const fromName = process.env.FROM_NAME || appName;
    const fromEmail = process.env.GMAIL_USER_NAME || 'noreply@lifestation.com';
    const fromAddress = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;

    const mailOptions = {
      from: fromAddress,
      to: toEmail,
      subject: `You've been invited to join ${appName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Caregiver Invitation</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
            <h1 style="color: #2c3e50; margin-top: 0;">You've Been Invited!</h1>
            
            <p>Hello,</p>
            
            <p><strong>${inviterName}</strong> has invited you to become a caregiver on ${appName}.</p>
            
            <p>As a caregiver, you'll be able to:</p>
            <ul>
              <li>Monitor health vitals and device status</li>
              <li>Receive important notifications</li>
              <li>View reports and insights</li>
              <li>Help manage care activities</li>
            </ul>
            
            <p><strong>Important:</strong> Please sign up using the email address <strong>${toEmail}</strong> to accept this invitation.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${signupUrl}" 
                 style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Sign Up as Caregiver
              </a>
            </div>
            
            <p style="font-size: 12px; color: #7f8c8d; margin-top: 30px;">
              Or copy and paste this link into your browser:<br>
              <a href="${signupUrl}" style="color: #3498db; word-break: break-all;">${signupUrl}</a>
            </p>
            
            <p style="font-size: 12px; color: #7f8c8d; margin-top: 20px;">
              <strong>Note:</strong> Make sure to use the email address <strong>${toEmail}</strong> when signing up. This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
            </p>
            
            <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #95a5a6; text-align: center;">
              © ${new Date().getFullYear()} ${appName}. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
You've Been Invited!

Hello,

${inviterName} has invited you to become a caregiver on ${appName}.

As a caregiver, you'll be able to:
- Monitor health vitals and device status
- Receive important notifications
- View reports and insights
- Help manage care activities

Important: Please sign up using the email address ${toEmail} to accept this invitation.

Sign up by clicking the link below:
${signupUrl}

Note: Make sure to use the email address ${toEmail} when signing up. This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.

© ${new Date().getFullYear()} ${appName}. All rights reserved.
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Caregiver invitation email sent to ${toEmail}. MessageId: ${info.messageId}`);

    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
    };
  } catch (error) {
    logger.error(`Error sending caregiver invitation email to ${toEmail}:`, error);
    throw error;
  }
};

/**
 * Verify email service configuration
 * @returns {Promise<boolean>} - True if email service is properly configured
 */
const verifyEmailConfig = async () => {
  try {
    await transporter.verify();
    logger.info('Email service configuration verified successfully');
    return true;
  } catch (error) {
    logger.error('Email service configuration verification failed:', error);
    return false;
  }
};

module.exports = {
  sendCaregiverInvitation,
  verifyEmailConfig,
};
