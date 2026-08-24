const db = require('../config/db');

const MeetingLogModel = {
  async create({ project_id, logged_by, meeting_date, summary, next_steps, attachment_path }) {
    const [result] = await db.query(
      `INSERT INTO meeting_logs (project_id, logged_by, meeting_date, summary, next_steps, attachment_path)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [project_id, logged_by, meeting_date, summary, next_steps || null, attachment_path || null]
    );
    return result.insertId;
  },

  async listByProject(projectId) {
    const [rows] = await db.query(
      `SELECT ml.*, u.full_name AS logged_by_name
       FROM meeting_logs ml JOIN users u ON ml.logged_by = u.id
       WHERE project_id = ? ORDER BY meeting_date DESC`,
      [projectId]
    );
    return rows;
  }
};

module.exports = MeetingLogModel;
