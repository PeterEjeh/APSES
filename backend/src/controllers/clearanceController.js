const ClearanceModel = require('../models/clearanceModel');
const ProjectModel   = require('../models/projectModel');
const panelAllocationService = require('../services/panelAllocationService');
const { sendNotification } = require('../utils/notifications');

/**
 * GET /api/clearance/project/:projectId
 * Accessible by: the student who owns the project, their supervisor, and admin.
 * Returns the clearance form. Creates a blank one if it doesn't exist yet.
 */
async function getClearanceForm(req, res) {
  const { projectId } = req.params;
  const { id: userId, role } = req.user;

  // Verify access: load the project and confirm the caller is related
  const project = await ProjectModel.findById(projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  const isStudent    = role === 'student' && Number(project.student_id) === Number(userId);
  const isSupervisor = (role === 'supervisor' || role === 'panel') && Number(project.supervisor_id) === Number(userId);
  const isAdmin      = role === 'admin';

  if (!isStudent && !isSupervisor && !isAdmin) {
    return res.status(403).json({ message: 'Access denied' });
  }

  let form = await ClearanceModel.findByProject(projectId);

  // Auto-create a blank form the first time a supervisor (or admin) views it
  if (!form) {
    if (isSupervisor || isAdmin) {
      await ClearanceModel.create(projectId);
      form = await ClearanceModel.findByProject(projectId);
    } else {
      // Student has no form yet
      return res.json(null);
    }
  }

  res.json(form);
}

/**
 * PUT /api/clearance/project/:projectId
 * Supervisor only. Save or submit the clearance form.
 * Body: { ...criteria, recommendation, comments, isSubmitting }
 */
async function saveClearanceForm(req, res) {
  const { projectId } = req.params;
  const { id: userId } = req.user;

  const project = await ProjectModel.findById(projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  if (Number(project.supervisor_id) !== Number(userId) && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only the assigned supervisor can fill this form' });
  }

  // Ensure form row exists
  let form = await ClearanceModel.findByProject(projectId);
  if (!form) await ClearanceModel.create(projectId);

  // Guard: cannot edit an already submitted form
  form = await ClearanceModel.findByProject(projectId);
  if (form.status === 'submitted') {
    return res.status(409).json({ message: 'This clearance form has already been submitted and cannot be edited' });
  }

  const { isSubmitting } = req.body;

  // If submitting, validate required fields
  if (isSubmitting) {
    const required = [
      'title_approved', 'template_followed', 'intro_satisfactory',
      'background_adequate', 'problem_statement_clear', 'motivation_appropriate',
      'objectives_clear', 'scope_defined', 'methodology_sound',
      'literature_adequate', 'references_correct', 'formatting_satisfactory',
      'suitable_for_defense', 'recommendation'
    ];
    for (const field of required) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        return res.status(400).json({ message: `Field "${field}" is required before submitting` });
      }
    }
  }

  await ClearanceModel.save(projectId, req.body, userId);

  // On submit: notify student & automatically assign defense panel members
  if (isSubmitting) {
    const rec = req.body.recommendation;
    if (rec === 'cleared') {
      try {
        const panelAlloc = await panelAllocationService.autoAllocate(project, 4);
        const panelNames = panelAlloc.assigned_panel_members.map((p) => p.panel_member_name).join(', ');

        await sendNotification(
          project.student_id,
          'Defense Cleared & Panel Allocated ✅',
          `Your project proposal "${project.title}" has been cleared for defense! Defense panel members have been automatically assigned: ${panelNames}.`
        );

        for (const pm of panelAlloc.assigned_panel_members) {
          await sendNotification(
            pm.panel_member_id,
            'New Defense Panel Assignment 📋',
            `You have been assigned to the defense evaluation panel for project "${project.title}" by ${project.student_name}.`
          );
        }
      } catch (panelErr) {
        console.error('Auto panel allocation on clearance warning:', panelErr.message);
        await sendNotification(
          project.student_id,
          'Proposal Defense Clearance: Cleared ✅',
          `Your project proposal "${project.title}" has been cleared for defense by your supervisor.`
        );
      }
    } else {
      await sendNotification(
        project.student_id,
        'Proposal Defense Clearance: Not Cleared ❌',
        `Your project proposal "${project.title}" has NOT been cleared for defense. Please review your supervisor's comments.`
      );
    }
  }

  res.json({
    message: isSubmitting ? 'Clearance form submitted successfully' : 'Clearance form saved as draft'
  });
}

module.exports = { getClearanceForm, saveClearanceForm };
