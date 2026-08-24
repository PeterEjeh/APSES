const db = require('../config/db');

const UserModel = {
  async create({ full_name, email, password_hash, role_id, matric_or_staff_no, department }) {
    const [result] = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role_id, matric_or_staff_no, department)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [full_name, email, password_hash, role_id, matric_or_staff_no || null, department || 'Computer Science']
    );
    return result.insertId;
  },

  async findByEmail(email) {
    const [rows] = await db.query(
      `SELECT u.*, r.name AS role
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE u.email = ?`,
      [email]
    );
    return rows[0];
  },

  async findByMatricOrStaffNo(matricOrStaffNo) {
    if (!matricOrStaffNo) return null;
    const [rows] = await db.query(
      `SELECT u.*, r.name AS role
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE u.matric_or_staff_no = ?`,
      [matricOrStaffNo]
    );
    return rows[0];
  },

  async findById(id) {
    const [rows] = await db.query(
      `SELECT u.id, u.full_name, u.email, u.matric_or_staff_no, u.department, u.created_at, r.name AS role
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [id]
    );
    return rows[0];
  },

  async getSupervisorProfile(userId) {
    const [rows] = await db.query(
      `SELECT sp.*, u.full_name, u.email, u.matric_or_staff_no, u.department
       FROM supervisor_profiles sp
       JOIN users u ON sp.user_id = u.id
       WHERE sp.user_id = ?`,
      [userId]
    );
    return rows[0];
  },

  async listAllSupervisors() {
    const [rows] = await db.query(
      `SELECT sp.*, u.full_name, u.email, u.matric_or_staff_no, u.department
       FROM supervisor_profiles sp
       JOIN users u ON sp.user_id = u.id
       ORDER BY u.full_name ASC`
    );
    return rows;
  },

  async updateSupervisorProfile(userId, { specializations, max_students }) {
    await db.query(
      `UPDATE supervisor_profiles
       SET specializations = COALESCE(?, specializations),
           max_students = COALESCE(?, max_students)
       WHERE user_id = ?`,
      [specializations || null, max_students || null, userId]
    );
  },

  async listAllUsers() {
    const [rows] = await db.query(
      `SELECT u.id, u.full_name, u.email, u.matric_or_staff_no, u.department, u.created_at, r.name AS role
       FROM users u JOIN roles r ON u.role_id = r.id
       ORDER BY u.id DESC`
    );
    return rows;
  }
};

module.exports = UserModel;
