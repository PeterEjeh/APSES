const MilestoneModel = require('../models/milestoneModel');
const MeetingLogModel = require('../models/meetingLogModel');
const { checkOverdueMilestones } = require('../utils/scheduler');
const { sendNotification } = require('../utils/notifications');
const ProjectModel = require('../models/projectModel');

async function createMilestone(req, res) {
  const { project_id, title, description, due_date } = req.body;
  if (!project_id || !title || !due_date) {
    return res.status(400).json({ message: 'project_id, title and due_date are required' });
  }

  const id = await MilestoneModel.create({
    project_id,
    title,
    description,
    due_date,
    created_by: req.user.id
  });

  const project = await ProjectModel.findById(project_id);
  if (project && project.student_id) {
    await sendNotification(
      project.student_id,
      'New Project Milestone',
      `Milestone "${title}" has been set for your project with due date ${new Date(due_date).toLocaleDateString()}.`
    );
  }

  res.status(201).json({ message: 'Milestone created', id });
}

async function listMilestones(req, res) {
  await checkOverdueMilestones(); // Automatically update overdue status when listing
  const milestones = await MilestoneModel.listByProject(req.params.projectId);
  res.json(milestones);
}

async function updateMilestoneStatus(req, res) {
  const { status } = req.body;
  const allowed = ['pending', 'in_progress', 'completed', 'overdue'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ message: `status must be one of ${allowed.join(', ')}` });
  }
  await MilestoneModel.updateStatus(req.params.id, status);
  res.json({ message: 'Milestone updated successfully' });
}

async function triggerOverdueCheck(req, res) {
  const count = await checkOverdueMilestones();
  res.json({ message: 'Overdue milestone check completed', updatedCount: count });
}

async function logMeeting(req, res) {
  const { project_id, meeting_date, summary, next_steps } = req.body;
  if (!project_id || !meeting_date || !summary) {
    return res.status(400).json({ message: 'project_id, meeting_date and summary are required' });
  }

  const attachmentPath = req.file ? `uploads/${req.file.filename}` : null;

  const id = await MeetingLogModel.create({
    project_id,
    logged_by: req.user.id,
    meeting_date,
    summary,
    next_steps,
    attachment_path: attachmentPath
  });

  res.status(201).json({ message: 'Meeting logged successfully', id });
}

async function listMeetings(req, res) {
  const meetings = await MeetingLogModel.listByProject(req.params.projectId);
  res.json(meetings);
}

module.exports = {
  createMilestone,
  listMilestones,
  updateMilestoneStatus,
  triggerOverdueCheck,
  logMeeting,
  listMeetings
};
