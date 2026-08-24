const db = require('../config/db');

const ProjectModel = {
  async create({ student_id, title, topic_area, abstract, proposal_file_path }) {
    const [result] = await db.query(
      `INSERT INTO projects (student_id, title, topic_area, abstract, proposal_file_path, status)
       VALUES (?, ?, ?, ?, ?, 'pending_allocation')`,
      [student_id, title, topic_area, abstract, proposal_file_path || null]
    );
    return result.insertId;
  },

  async findById(id) {
    const [rows] = await db.query(
      `SELECT p.*,
              u.full_name AS student_name, u.email AS student_email, u.matric_or_staff_no AS student_matric,
              sup.full_name AS supervisor_name, sup.email AS supervisor_email
       FROM projects p
       JOIN users u ON p.student_id = u.id
       LEFT JOIN users sup ON p.supervisor_id = sup.id
       WHERE p.id = ?`,
      [id]
    );
    return rows[0];
  },

  async findByStudent(studentId) {
    const [rows] = await db.query(
      `SELECT p.*,
              sup.full_name AS supervisor_name, sup.email AS supervisor_email,
              fr.final_score, fr.grade, fr.is_published,
              cf.status AS clearance_form_status,
              cf.recommendation AS clearance_recommendation,
              CASE
                WHEN cf.status = 'submitted' AND cf.recommendation = 'cleared' THEN 'cleared'
                WHEN cf.status = 'submitted' AND cf.recommendation = 'not_cleared' THEN 'not_cleared'
                ELSE 'pending'
              END AS clearance_status,
              cf.submitted_at AS clearance_submitted_at
       FROM projects p
       LEFT JOIN users sup ON p.supervisor_id = sup.id
       LEFT JOIN final_results fr ON p.id = fr.project_id
       LEFT JOIN clearance_forms cf ON p.id = cf.project_id
       WHERE p.student_id = ?`,
      [studentId]
    );
    return rows[0];
  },

  async findBySupervisor(supervisorId) {
    const [rows] = await db.query(
      `SELECT p.*,
              u.full_name AS student_name, u.email AS student_email, u.matric_or_staff_no AS student_matric,
              fr.final_score, fr.grade, fr.is_published,
              cf.status AS clearance_form_status,
              cf.recommendation AS clearance_recommendation,
              CASE
                WHEN cf.status = 'submitted' AND cf.recommendation = 'cleared' THEN 'cleared'
                WHEN cf.status = 'submitted' AND cf.recommendation = 'not_cleared' THEN 'not_cleared'
                ELSE 'pending'
              END AS clearance_status,
              cf.submitted_at AS clearance_submitted_at
       FROM projects p
       JOIN users u ON p.student_id = u.id
       LEFT JOIN final_results fr ON p.id = fr.project_id
       LEFT JOIN clearance_forms cf ON p.id = cf.project_id
       WHERE p.supervisor_id = ?
       ORDER BY p.created_at DESC`,
      [supervisorId]
    );
    return rows;
  },

  async listPendingAllocation() {
    const [rows] = await db.query(
      `SELECT p.*, u.full_name AS student_name, u.email AS student_email, u.matric_or_staff_no AS student_matric
       FROM projects p
       JOIN users u ON p.student_id = u.id
       WHERE p.status = 'pending_allocation'
       ORDER BY p.created_at ASC`
    );
    return rows;
  },

  async listAllProjects(search = '', status = '') {
    let query = `
      SELECT p.*,
             u.full_name AS student_name, u.email AS student_email, u.matric_or_staff_no AS student_matric,
             sup.full_name AS supervisor_name,
             fr.final_score, fr.grade, fr.is_published
      FROM projects p
      JOIN users u ON p.student_id = u.id
      LEFT JOIN users sup ON p.supervisor_id = sup.id
      LEFT JOIN final_results fr ON p.id = fr.project_id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ` AND p.status = ?`;
      params.push(status);
    }
    if (search) {
      query += ` AND (p.title LIKE ? OR p.topic_area LIKE ? OR u.full_name LIKE ? OR u.matric_or_staff_no LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    query += ` ORDER BY p.created_at DESC`;
    const [rows] = await db.query(query, params);
    return rows;
  },

  async assignSupervisor(projectId, supervisorId) {
    await db.query(
      `UPDATE projects SET supervisor_id = ?, status = 'allocated', rejection_reason = NULL, allocated_at = NOW() WHERE id = ?`,
      [supervisorId, projectId]
    );
  },

  async updateStatus(projectId, status) {
    await db.query(`UPDATE projects SET status = ? WHERE id = ?`, [status, projectId]);
  },

  async approveTopic(projectId) {
    await db.query(`UPDATE projects SET status = 'in_progress' WHERE id = ?`, [projectId]);
  },

  async rejectTopic(projectId, reason, supervisorId) {
    await db.query(
      `UPDATE projects SET status = 'rejected', rejection_reason = ? WHERE id = ?`,
      [reason, projectId]
    );
    await db.query(`DELETE FROM project_panel WHERE project_id = ?`, [projectId]);
    if (supervisorId) {
      await db.query(
        `UPDATE supervisor_profiles SET current_load = GREATEST(0, current_load - 1) WHERE user_id = ?`,
        [supervisorId]
      );
    }
  },

  async resubmitTopic(projectId, { title, topic_area, abstract, proposal_file_path }) {
    let query = `UPDATE projects SET title = ?, topic_area = ?, abstract = ?, status = 'pending_allocation', rejection_reason = NULL, supervisor_id = NULL`;
    const params = [title, topic_area, abstract];

    if (proposal_file_path) {
      query += `, proposal_file_path = ?`;
      params.push(proposal_file_path);
    }

    query += ` WHERE id = ?`;
    params.push(projectId);

    await db.query(query, params);
  },

  async assignPanelMember(projectId, panelMemberId) {
    await db.query(
      `INSERT INTO project_panel (project_id, panel_member_id) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE assigned_at = NOW()`,
      [projectId, panelMemberId]
    );
  },

  async listProjectsForPanel(panelMemberId) {
    const [rows] = await db.query(
      `SELECT p.*,
              u.full_name AS student_name, u.email AS student_email, u.matric_or_staff_no AS student_matric,
              sup.full_name AS supervisor_name,
              fr.final_score, fr.grade, fr.is_published,
              (
                SELECT e.id FROM evaluations e
                WHERE e.project_id = p.id AND e.assessor_id = ? AND e.status = 'submitted'
                LIMIT 1
              ) AS evaluation_id,
              (
                SELECT e.submitted_at FROM evaluations e
                WHERE e.project_id = p.id AND e.assessor_id = ? AND e.status = 'submitted'
                LIMIT 1
              ) AS evaluated_at
       FROM project_panel pp
       JOIN projects p ON pp.project_id = p.id
       JOIN users u ON p.student_id = u.id
       LEFT JOIN users sup ON p.supervisor_id = sup.id
       LEFT JOIN final_results fr ON p.id = fr.project_id
       WHERE pp.panel_member_id = ?
       ORDER BY p.created_at DESC`,
      [panelMemberId, panelMemberId, panelMemberId]
    );
    return rows;
  },

  async getPanelMembersForProject(projectId) {
    const [rows] = await db.query(
      `SELECT u.id, u.full_name, u.email, u.department
       FROM project_panel pp
       JOIN users u ON pp.panel_member_id = u.id
       WHERE pp.project_id = ?`,
      [projectId]
    );
    return rows;
  }
};

module.exports = ProjectModel;
