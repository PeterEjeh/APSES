const express = require('express');
const router  = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const { asyncWrap } = require('../middleware/errorHandler');
const ctrl = require('../controllers/clearanceController');

router.use(auth);

// GET: student, supervisor, or admin may read the form
router.get('/project/:projectId', asyncWrap(ctrl.getClearanceForm));

// PUT: only the assigned supervisor may fill/submit the form
router.put('/project/:projectId', requireRole('supervisor'), asyncWrap(ctrl.saveClearanceForm));

module.exports = router;
