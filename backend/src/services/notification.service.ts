import nodemailer from "nodemailer";
import { logger } from "../config/logger";
import type { FeedbackDocument } from "../models/feedback.model";

// Team email routing map
const TEAM_EMAILS: Record<string, string> = {
  payments: "payments-team@company.com",
  frontend: "frontend-team@company.com",
  product: "product-team@company.com",
  infrastructure: "infra-team@company.com",
  security: "security-team@company.com",
  growth: "growth-team@company.com",
  general: "support@company.com",
};

// Priority to emoji mapping for quick visual scanning
const PRIORITY_EMOJI: Record<string, string> = {
  critical: "🔴",
  high: "🟠",
  medium: "🟡",
  low: "🟢",
};

export class NotificationService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.ethereal.email",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async notifyTeam(feedback: FeedbackDocument): Promise<void> {
    const team = feedback.team || "general";
    const teamEmail = TEAM_EMAILS[team];
    const emoji = PRIORITY_EMOJI[feedback.priority || "medium"];

    // Only send email for high and critical priority
    if (
      feedback.priority !== "critical" &&
      feedback.priority !== "high"
    ) {
      logger.info(
        { feedbackId: feedback.id, priority: feedback.priority },
        "Skipping notification — low priority"
      );
      return;
    }

    const subject =
      `${emoji} [${feedback.priority?.toUpperCase()}] ` +
      `New ${feedback.category} feedback`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2>${emoji} New Feedback Requires Attention</h2>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; font-weight: bold;">From:</td>
            <td style="padding: 8px;">${feedback.userName} (${feedback.email})</td>
          </tr>
          <tr style="background: #f5f5f5;">
            <td style="padding: 8px; font-weight: bold;">Category:</td>
            <td style="padding: 8px;">${feedback.category}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Priority:</td>
            <td style="padding: 8px;">${emoji} ${feedback.priority}</td>
          </tr>
          <tr style="background: #f5f5f5;">
            <td style="padding: 8px; font-weight: bold;">Sentiment:</td>
            <td style="padding: 8px;">${feedback.sentiment}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Summary:</td>
            <td style="padding: 8px;">${feedback.summary}</td>
          </tr>
        </table>

        <div style="margin-top: 16px; padding: 16px; background: #f9f9f9;
                    border-left: 4px solid #333;">
          <strong>Full Message:</strong>
          <p>${feedback.message}</p>
        </div>

        <p style="margin-top: 16px; color: #666;">
          AI Confidence: ${((feedback.confidence || 0) * 100).toFixed(0)}%
        </p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: '"Feedback System" <noreply@company.com>',
        to: teamEmail,
        subject,
        html,
      });

      logger.info(
        {
          feedbackId: feedback.id,
          team,
          email: teamEmail,
          priority: feedback.priority,
        },
        "Team notification sent"
      );
    } catch (error) {
      // Notification failure should not break the system
      logger.error(
        { err: error, feedbackId: feedback.id },
        "Failed to send notification"
      );
    }
  }
}