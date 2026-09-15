const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const { asyncWrap } = require('../middleware/errorHandler');
const upload = require('../middleware/upload');
const ctrl = require('../controllers/projectController');

router.use(auth);

router.post('/', requireRole('student'), upload.single('proposal_file'), asyncWrap(ctrl.submitProject));
router.get('/mine', requireRole('student'), asyncWrap(ctrl.myProject));
router.get('/supervisees', requireRole('supervisor'), asyncWrap(ctrl.mySupervisees));
router.get('/panel-assigned', requireRole('panel', 'supervisor', 'admin'), asyncWrap(ctrl.myPanelProjects));

router.get('/all', requireRole('admin'), asyncWrap(ctrl.getAllProjects));
router.get('/pending', requireRole('admin'), asyncWrap(ctrl.listPending));
router.get('/:projectId/allocation-preview', requireRole('admin'), asyncWrap(ctrl.previewAllocation));
router.post('/:projectId/allocate', requireRole('admin'), asyncWrap(ctrl.runAllocation));
router.post('/:projectId/manual-allocate', requireRole('admin'), asyncWrap(ctrl.manualAllocate));
router.post('/:projectId/approve', requireRole('supervisor', 'admin'), asyncWrap(ctrl.approveProjectTopic));
router.post('/:projectId/reject', requireRole('supervisor', 'admin'), asyncWrap(ctrl.rejectProjectTopic));
router.post('/:projectId/assign-panel', requireRole('admin'), asyncWrap(ctrl.assignPanelMember));

router.get('/:projectId/panel-preview', requireRole('admin'), asyncWrap(ctrl.previewPanelAllocation));
router.post('/:projectId/panel-auto-allocate', requireRole('admin'), asyncWrap(ctrl.runPanelAutoAllocation));
router.post('/batch-panel-allocate', requireRole('admin'), asyncWrap(ctrl.batchAutoAllocatePanels));

module.exports = router;
