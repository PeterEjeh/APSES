const db = require('../config/db');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  }
});

async function sendNotification(userId, title, message, sendEmail = false, emailAddress = null) {
  try {
    await db.query(
      `INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)`,
      [userId, title, message]
    );

    if (sendEmail && emailAddress && process.env.SMTP_USER) {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"APSES System" <noreply@apses.atbu.edu.ng>',
        to: emailAddress,
        subject: `[APSES Notification] ${title}`,
        text: message,
        html: `<div style="font-family: sans-serif; padding: 20px;">
                <h3 style="color: #1e293b;">${title}</h3>
                <p style="color: #334155; font-size: 15px;">${message}</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin-top: 20px;" />
                <small style="color: #64748b;">APSES - Faculty of Computing, ATBU Bauchi</small>
              </div>`
      });
    }
  } catch (err) {
    console.error('Notification send error:', err.message);
  }
}

async function getUserNotifications(userId) {
  const [rows] = await db.query(
    `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
    [userId]
  );
  return rows;
}

async function markAsRead(notificationId, userId) {
  await db.query(
    `UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?`,
    [notificationId, userId]
  );
}

module.exports = { sendNotification, getUserNotifications, markAsRead };
