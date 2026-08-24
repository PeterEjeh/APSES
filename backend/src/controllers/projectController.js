const ProjectModel    = require('../models/projectModel');
const ClearanceModel  = require('../models/clearanceModel');
const allocationService = require('../services/allocationService');
const panelAllocationService = require('../services/panelAllocationService');
const { sendNotification } = require('../utils/notifications');
const db = require('../config/db');

async function submitProject(req, res) {
  const { title, topic_area, abstract } = req.body;
  if (!title || !topic_area) return res.status(400).json({ message: 'Title and topic area are required' });

  const existing = await ProjectModel.findByStudent(req.user.id);
  if (existing && existing.status !== 'rejected') {
    return res.status(409).json({ message: 'You already have an active project submitted' });
  }

  const proposalFilePath = req.file ? `uploads/${req.file.filename}` : null;

  if (existing && existing.status === 'rejected') {
    await ProjectModel.resubmitTopic(existing.id, {
      title,
      topic_area,
      abstract,
      proposal_file_path: proposalFilePath
    });

    // Automatically allocate best matching supervisor
    const updatedProject = await ProjectModel.findById(existing.id);
    let allocInfo = null;
    try {
      allocInfo = await allocationService.autoAllocate(updatedProject);
      await sendNotification(
        req.user.id,
        'Supervisor Auto-Allocated',
        `Your revised proposal "${title}" has been automatically matched with supervisor ${allocInfo.chosen.supervisor_name}.`
      );
      await sendNotification(
        allocInfo.chosen.supervisor_id,
        'New Supervisee Assigned',
        `You have been automatically assigned to supervise project "${title}" by ${updatedProject.student_name}.`
      );
    } catch (allocErr) {
      console.error('Auto-allocation on resubmit notice:', allocErr.message);
      await sendNotification(
        req.user.id,
        'Project Proposal Resubmitted',
        `Your revised project proposal "${title}" has been resubmitted.`
      );
    }

    return res.json({ message: 'Project proposal resubmitted and supervisor automatically allocated', projectId: existing.id, allocation: allocInfo });
  }

  const projectId = await ProjectModel.create({
    student_id: req.user.id,
    title,
    topic_area,
    abstract,
    proposal_file_path: proposalFilePath
  });

  // Automatically allocate best matching supervisor
  const newProject = await ProjectModel.findById(projectId);
  let allocInfo = null;
  try {
    allocInfo = await allocationService.autoAllocate(newProject);
    await sendNotification(
      req.user.id,
      'Supervisor Auto-Allocated',
      `Your proposal "${title}" has been automatically matched with supervisor ${allocInfo.chosen.supervisor_name} based on domain specializations and capacity.`
    );
    await sendNotification(
      allocInfo.chosen.supervisor_id,
      'New Supervisee Assigned',
      `You have been automatically assigned to supervise project "${title}" by ${newProject.student_name}.`
    );
  } catch (allocErr) {
    console.error('Auto-allocation on submission notice:', allocErr.message);
    await sendNotification(
      req.user.id,
      'Project Proposal Submitted',
      `Your project proposal "${title}" in "${topic_area}" has been received.`
    );
  }

  res.status(201).json({ message: 'Project submitted and supervisor automatically allocated', projectId, allocation: allocInfo });
}

async function myProject(req, res) {
  const project = await ProjectModel.findByStudent(req.user.id);
  if (!project) return res.status(404).json({ message: 'No project submitted yet' });
  res.json(project);
}

async function mySupervisees(req, res) {
  const projects = await ProjectModel.findBySupervisor(req.user.id);
  res.json(projects);
}

async function getAllProjects(req, res) {
  const { search, status } = req.query;
  const projects = await ProjectModel.listAllProjects(search, status);
  res.json(projects);
}

async function previewAllocation(req, res) {
  const project = await ProjectModel.findById(req.params.projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });
  const ranked = await allocationService.rankCandidates(project);
  res.json({ project_id: project.id, project_title: project.title, topic_area: project.topic_area, candidates: ranked });
}

async function runAllocation(req, res) {
  const project = await ProjectModel.findById(req.params.projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  const result = await allocationService.autoAllocate(project);

  await sendNotification(
    project.student_id,
    'Supervisor Allocated',
    `Supervisor ${result.chosen.supervisor_name} has been assigned to your project "${project.title}".`
  );
  await sendNotification(
    result.chosen.supervisor_id,
    'New Supervisee Assigned',
    `You have been assigned to supervise project "${project.title}" by ${project.student_name}.`
  );

  res.json({ message: 'Supervisor allocated successfully', ...result });
}

async function manualAllocate(req, res) {
  const { supervisor_id } = req.body;
  const projectId = req.params.projectId;

  if (!supervisor_id) return res.status(400).json({ message: 'supervisor_id is required' });

  const project = await ProjectModel.findById(projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  await ProjectModel.assignSupervisor(projectId, supervisor_id);
  await db.query(
    `UPDATE supervisor_profiles SET current_load = current_load + 1 WHERE user_id = ?`,
    [supervisor_id]
  );

  await sendNotification(
    project.student_id,
    'Supervisor Allocated',
    `A supervisor has been assigned to your project "${project.title}".`
  );

  res.json({ message: 'Supervisor manually allocated successfully' });
}

async function listPending(req, res) {
  const projects = await ProjectModel.listPendingAllocation();
  res.json(projects);
}

async function approveProjectTopic(req, res) {
  const projectId = req.params.projectId;
  const project = await ProjectModel.findById(projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  await ProjectModel.approveTopic(projectId);

  await sendNotification(
    project.student_id,
    'Project Topic Approved',
    `Your project topic "${project.title}" has been approved by your supervisor! You can now proceed with research and milestone tracking.`
  );

  res.json({ message: 'Project topic approved successfully' });
}

async function rejectProjectTopic(req, res) {
  const { reason } = req.body;
  const projectId = req.params.projectId;

  if (!reason) return res.status(400).json({ message: 'A rejection reason is required' });

  const project = await ProjectModel.findById(projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  await ProjectModel.rejectTopic(projectId, reason, project.supervisor_id);

  await sendNotification(
    project.student_id,
    'Project Topic Rejected',
    `Your project topic "${project.title}" was rejected by your supervisor/admin. Reason: "${reason}". Please submit a revised topic.`
  );

  res.json({ message: 'Project topic rejected successfully' });
}

async function assignPanelMember(req, res) {
  const { panel_member_id } = req.body;
  const projectId = req.params.projectId;

  if (!panel_member_id) return res.status(400).json({ message: 'panel_member_id is required' });

  const project = await ProjectModel.findById(projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  if (project.status !== 'in_progress' && project.status !== 'completed') {
    return res.status(400).json({
      message: 'Panel members can only be assigned to projects after the supervisor has approved the project topic.'
    });
  }

  // ── Clearance gate: supervisor must have submitted a 'cleared' clearance form ──
  const clearance = await ClearanceModel.findByProject(projectId);
  if (!clearance || clearance.status !== 'submitted' || clearance.recommendation !== 'cleared') {
    return res.status(403).json({
      message: 'Panel assignment blocked: The supervisor has not yet submitted a clearance form with a "Cleared for Defense" recommendation for this project.'
    });
  }

  await ProjectModel.assignPanelMember(projectId, panel_member_id);

  await sendNotification(
    panel_member_id,
    'Assigned to Defense Panel',
    `You have been assigned as a panel member for project "${project.title}".`
  );

  res.json({ message: 'Panel member assigned to project successfully' });
}

async function previewPanelAllocation(req, res) {
  const project = await ProjectModel.findById(req.params.projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });
  const candidates = await panelAllocationService.getCandidatePanelMembers(project);
  res.json({ project_id: project.id, project_title: project.title, topic_area: project.topic_area, candidates });
}

async function runPanelAutoAllocation(req, res) {
  const project = await ProjectModel.findById(req.params.projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  const result = await panelAllocationService.autoAllocate(project);
  res.json({ message: 'Defense panel members auto-allocated successfully', ...result });
}

async function batchAutoAllocatePanels(req, res) {
  const results = await panelAllocationService.batchAutoAllocateAll();
  res.json({ message: 'Batch panel auto-allocation completed', results });
}

async function myPanelProjects(req, res) {
  const projects = await ProjectModel.listProjectsForPanel(req.user.id);
  res.json(projects);
}

module.exports = {
  submitProject,
  myProject,
  mySupervisees,
  getAllProjects,
  previewAllocation,
  runAllocation,
  manualAllocate,
  listPending,
  approveProjectTopic,
  rejectProjectTopic,
  assignPanelMember,
  previewPanelAllocation,
  runPanelAutoAllocation,
  batchAutoAllocatePanels,
  myPanelProjects
};
