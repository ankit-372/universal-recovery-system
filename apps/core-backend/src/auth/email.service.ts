import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
    private transporter;

    constructor() {
        // ⚠️ PRODUCTION TIP: Use environment variables for these!
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
    }

    async sendResetEmail(email: string, token: string) {
        const resetLink = `http://localhost:5173/reset-password?token=${token}`;

        const mailOptions = {
            from: '"RecoveryAI Support" <no-reply@recoveryai.com>',
            to: email,
            subject: 'Password Reset Request',
            html: `
        <h3>Password Reset</h3>
        <p>You requested a password reset. Click the link below to set a new password:</p>
        <a href="${resetLink}" style="padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>This link expires in 1 hour.</p>
        <p>If you did not request this, please ignore this email.</p>
      `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`📧 Reset email sent to ${email}`);
        } catch (error) {
            console.error('❌ Failed to send email via SMTP:', error.message);
            console.log('⚠️  DEVELOPMENT MODE: Here is your reset link:\n', resetLink);
        }
    }
}
