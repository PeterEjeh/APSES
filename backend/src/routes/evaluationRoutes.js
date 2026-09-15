const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const { asyncWrap } = require('../middleware/errorHandler');
const ctrl = require('../controllers/evaluationController');

router.use(auth);

router.get('/rubrics', asyncWrap(ctrl.listRubrics));
router.post('/rubrics', requireRole('admin'), asyncWrap(ctrl.createRubric));
router.get('/rubric/:rubricId', asyncWrap(ctrl.getRubric));

router.post('/', requireRole('supervisor', 'panel', 'admin'), asyncWrap(ctrl.submitEvaluation));
router.post('/project/:projectId/rubric/:rubricId/aggregate', requireRole('admin', 'panel', 'supervisor'), asyncWrap(ctrl.aggregate));

router.get('/project/:projectId/result', asyncWrap(ctrl.getFinalResult));
router.patch('/project/:projectId/publish', requireRole('admin'), asyncWrap(ctrl.publishFinalResult));

module.exports = router;
