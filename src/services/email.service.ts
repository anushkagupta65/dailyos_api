import { env } from '../config/env';

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export class EmailService {
  /**
   * Send an email or log it in development mode.
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    // In production, integrate with nodemailer, SendGrid, Resend, or AWS SES.
    // For local development and default environments, we log the email details clearly.
    console.log('--------------------------------------------------');
    console.log(`[EMAIL DISPATCH] To: ${options.to}`);
    console.log(`[EMAIL DISPATCH] Subject: ${options.subject}`);
    console.log(`[EMAIL DISPATCH] Body: ${options.text}`);
    console.log('--------------------------------------------------');
    return true;
  }

  /**
   * Send account verification link
   */
  async sendVerificationEmail(email: string, token: string): Promise<boolean> {
    const verificationUrl = `${env.clientUrl}/verify-email?token=${token}`;
    return this.sendEmail({
      to: email,
      subject: 'Verify your DailyOS email address',
      text: `Hello,\n\nPlease verify your email address by clicking on the link below:\n${verificationUrl}\n\nThis link will expire in 24 hours.`,
      html: `<p>Hello,</p><p>Please verify your email address by clicking the link below:</p><p><a href="${verificationUrl}">${verificationUrl}</a></p><p>This link will expire in 24 hours.</p>`,
    });
  }

  /**
   * Send password reset link
   */
  async sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
    const resetUrl = `${env.clientUrl}/reset-password?token=${token}`;
    return this.sendEmail({
      to: email,
      subject: 'Reset your DailyOS password',
      text: `Hello,\n\nYou requested to reset your password. Please click the link below to set a new password:\n${resetUrl}\n\nThis link will expire in 1 hour.\nIf you did not request this, please ignore this email.`,
      html: `<p>Hello,</p><p>You requested to reset your password. Click the link below to proceed:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link will expire in 1 hour.</p><p>If you did not request this, please ignore this email.</p>`,
    });
  }
}

export const emailService = new EmailService();
