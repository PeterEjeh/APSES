const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  resetPassword,
  getMyNotifications,
  markNotificationRead,
  listSupervisors,
  updateSupervisor,
  listUsers
} = require('../controllers/authController');
const { auth, requireRole } = require('../middleware/auth');
const { asyncWrap } = require('../middleware/errorHandler');

router.post('/register', asyncWrap(register));
router.post('/login', asyncWrap(login));
router.post('/reset-password', asyncWrap(resetPassword));

router.get('/me', auth, asyncWrap(getMe));
router.get('/notifications', auth, asyncWrap(getMyNotifications));
router.patch('/notifications/:id/read', auth, asyncWrap(markNotificationRead));

router.get('/supervisors', auth, asyncWrap(listSupervisors));
router.patch('/supervisors/:id', auth, requireRole('admin'), asyncWrap(updateSupervisor));
router.get('/users', auth, requireRole('admin'), asyncWrap(listUsers));

module.exports = router;
