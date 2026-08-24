const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const { asyncWrap } = require('../middleware/errorHandler');
const upload = require('../middleware/upload');
const ctrl = require('../controllers/milestoneController');

router.use(auth);

router.post('/', requireRole('supervisor', 'admin'), asyncWrap(ctrl.createMilestone));
router.get('/project/:projectId', asyncWrap(ctrl.listMilestones));
router.patch('/:id/status', asyncWrap(ctrl.updateMilestoneStatus));
router.post('/check-overdue', requireRole('admin'), asyncWrap(ctrl.triggerOverdueCheck));

router.post('/meetings', upload.single('attachment'), asyncWrap(ctrl.logMeeting));
router.get('/meetings/project/:projectId', asyncWrap(ctrl.listMeetings));

module.exports = router;
