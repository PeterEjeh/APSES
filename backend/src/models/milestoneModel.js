const db = require('../config/db');

const MilestoneModel = {
  async create({ project_id, title, description, due_date, created_by }) {
    const [result] = await db.query(
      `INSERT INTO milestones (project_id, title, description, due_date, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [project_id, title, description, due_date, created_by]
    );
    return result.insertId;
  },

  async listByProject(projectId) {
    const [rows] = await db.query(
      `SELECT * FROM milestones WHERE project_id = ? ORDER BY due_date ASC`,
      [projectId]
    );
    return rows;
  },

  async updateStatus(id, status) {
    const completedAt = status === 'completed' ? 'NOW()' : 'NULL';
    await db.query(
      `UPDATE milestones SET status = ?, completed_at = ${completedAt} WHERE id = ?`,
      [status, id]
    );
  },

  async markOverdue() {
    // Called by a daily scheduled job
    await db.query(
      `UPDATE milestones SET status = 'overdue'
       WHERE due_date < CURDATE() AND status IN ('pending','in_progress')`
    );
  }
};

module.exports = MilestoneModel;
