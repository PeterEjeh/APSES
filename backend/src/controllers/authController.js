const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const UserModel = require('../models/userModel');
const { getUserNotifications, markAsRead } = require('../utils/notifications');

const ROLE_IDS = { student: 1, supervisor: 2, panel: 3, admin: 4 };

async function register(req, res) {
  const { full_name, email, password, role, matric_or_staff_no, department, specializations, max_students } = req.body;

  if (!full_name || !email || !password || !role) {
    return res.status(400).json({ message: 'full_name, email, password and role are required' });
  }
  if (!ROLE_IDS[role]) {
    return res.status(400).json({ message: `role must be one of ${Object.keys(ROLE_IDS).join(', ')}` });
  }

  const existingEmail = await UserModel.findByEmail(email);
  if (existingEmail) return res.status(409).json({ message: 'An account with this email already exists' });

  if (matric_or_staff_no) {
    const existingMatric = await UserModel.findByMatricOrStaffNo(matric_or_staff_no);
    if (existingMatric) {
      return res.status(409).json({ message: 'An account with this Matriculation / Staff ID already exists' });
    }
  }

  const password_hash = await bcrypt.hash(password, 10);
  const userId = await UserModel.create({
    full_name,
    email,
    password_hash,
    role_id: ROLE_IDS[role],
    matric_or_staff_no,
    department
  });

  if (role === 'supervisor' || role === 'panel') {
    const parsedCapacity = max_students ? Math.min(Math.max(parseInt(max_students, 10) || 5, 1), 1000) : 5;
    await db.query(
      `INSERT INTO supervisor_profiles (user_id, specializations, max_students) VALUES (?, ?, ?)`,
      [userId, specializations || 'AI, Software Engineering, Networks', parsedCapacity]
    );
  }

  return res.status(201).json({ message: 'Account created successfully', userId });
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'email and password are required' });

  const user = await UserModel.findByEmail(email);
  if (!user) return res.status(401).json({ message: 'Invalid email or password' });

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(401).json({ message: 'Invalid email or password' });

  const token = jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET || 'apses_dev_jwt_secret_atbu_2026',
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  let supervisorProfile = null;
  if (user.role === 'supervisor' || user.role === 'panel') {
    supervisorProfile = await UserModel.getSupervisorProfile(user.id);
    if (!supervisorProfile) {
      await db.query(
        `INSERT IGNORE INTO supervisor_profiles (user_id, specializations, max_students) VALUES (?, ?, 5)`,
        [user.id, 'AI, Software Engineering, Networks']
      );
      supervisorProfile = await UserModel.getSupervisorProfile(user.id);
    }
  }

  return res.json({
    token,
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      matric_or_staff_no: user.matric_or_staff_no,
      department: user.department,
      supervisorProfile
    }
  });
}

async function getMe(req, res) {
  const user = await UserModel.findById(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  let supervisorProfile = null;
  if (user.role === 'supervisor' || user.role === 'panel') {
    supervisorProfile = await UserModel.getSupervisorProfile(user.id);
    if (!supervisorProfile) {
      await db.query(
        `INSERT IGNORE INTO supervisor_profiles (user_id, specializations, max_students) VALUES (?, ?, 5)`,
        [user.id, 'AI, Software Engineering, Networks']
      );
      supervisorProfile = await UserModel.getSupervisorProfile(user.id);
    }
  }

  res.json({ ...user, supervisorProfile });
}

async function resetPassword(req, res) {
  const { email, old_password, new_password } = req.body;
  if (!email || !new_password) {
    return res.status(400).json({ message: 'Email and new password are required' });
  }

  const user = await UserModel.findByEmail(email);
  if (!user) return res.status(404).json({ message: 'User account not found' });

  if (old_password) {
    const match = await bcrypt.compare(old_password, user.password_hash);
    if (!match) return res.status(401).json({ message: 'Current password incorrect' });
  }

  const newHash = await bcrypt.hash(new_password, 10);
  await db.query(`UPDATE users SET password_hash = ? WHERE id = ?`, [newHash, user.id]);

  res.json({ message: 'Password updated successfully' });
}

async function getMyNotifications(req, res) {
  const list = await getUserNotifications(req.user.id);
  res.json(list);
}

async function markNotificationRead(req, res) {
  await markAsRead(req.params.id, req.user.id);
  res.json({ message: 'Notification marked as read' });
}

async function listSupervisors(req, res) {
  const supervisors = await UserModel.listAllSupervisors();
  res.json(supervisors);
}

async function updateSupervisor(req, res) {
  const { specializations, max_students } = req.body;
  let parsedCapacity = undefined;
  if (max_students !== undefined && max_students !== null) {
    parsedCapacity = Math.min(Math.max(parseInt(max_students, 10) || 1, 1), 1000);
  }
  await UserModel.updateSupervisorProfile(req.params.id, { specializations, max_students: parsedCapacity });
  res.json({ message: 'Supervisor profile updated' });
}

async function listUsers(req, res) {
  const users = await UserModel.listAllUsers();
  res.json(users);
}

module.exports = {
  register,
  login,
  getMe,
  resetPassword,
  getMyNotifications,
  markNotificationRead,
  listSupervisors,
  updateSupervisor,
  listUsers
};
