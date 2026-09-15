const EvaluationModel = require('../models/evaluationModel');
const evaluationService = require('../services/evaluationService');
const { sendNotification } = require('../utils/notifications');
const ProjectModel = require('../models/projectModel');

async function listRubrics(req, res) {
  const rubrics = await EvaluationModel.listAllRubrics();
  res.json(rubrics);
}

async function createRubric(req, res) {
  const { name, criteria, assessor_weights } = req.body;
  if (!name || !Array.isArray(criteria) || criteria.length === 0) {
    return res.status(400).json({ message: 'Rubric name and non-empty criteria array are required' });
  }

  const id = await EvaluationModel.createRubric({
    name,
    created_by: req.user.id,
    criteria,
    assessor_weights: assessor_weights || [
      { assessor_role: 'supervisor', weight_percent: 40 },
      { assessor_role: 'panel', weight_percent: 60 }
    ]
  });

  res.status(201).json({ message: 'Rubric created successfully', rubricId: id });
}

async function getRubric(req, res) {
  const rubric = await EvaluationModel.getRubricWithCriteria(req.params.rubricId);
  if (!rubric) return res.status(404).json({ message: 'Rubric not found' });
  res.json(rubric);
}

async function submitEvaluation(req, res) {
  const { project_id, rubric_id, scores } = req.body; // scores: [{criterion_id, score, comment}]
  if (!project_id || !rubric_id || !Array.isArray(scores) || scores.length === 0) {
    return res.status(400).json({ message: 'project_id, rubric_id and a non-empty scores array are required' });
  }

  const project = await ProjectModel.findById(project_id);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  // Dynamically resolve assessor_role based on project context (supervisor vs panel member)
  let assessorRole = req.body.assessor_role;
  if (!assessorRole) {
    if (Number(project.supervisor_id) === Number(req.user.id)) {
      assessorRole = 'supervisor';
    } else {
      assessorRole = 'panel';
    }
  }

  // Validate that non-admin assessor is actually assigned to this project
  if (req.user.role !== 'admin') {
    if (assessorRole === 'supervisor') {
      if (Number(project.supervisor_id) !== Number(req.user.id)) {
        return res.status(403).json({ message: 'You are not the designated supervisor for this project.' });
      }
    } else if (assessorRole === 'panel') {
      const panelMembers = await ProjectModel.getPanelMembersForProject(project_id);
      const isAssigned = panelMembers.some(m => Number(m.id) === Number(req.user.id));
      if (!isAssigned) {
        return res.status(403).json({ message: 'You are not assigned as a defense panel member for this project.' });
      }
    }
  }

  const evaluationId = await EvaluationModel.createEvaluation({
    project_id,
    rubric_id,
    assessor_id: req.user.id,
    assessor_role: assessorRole
  });

  await EvaluationModel.saveScores(evaluationId, scores);
  await EvaluationModel.submitEvaluation(evaluationId);

  // Automatically check if all assigned panel members have completed evaluation
  try {
    const panelMembers = await ProjectModel.getPanelMembersForProject(project_id);
    const submittedEvals = await EvaluationModel.getSubmittedEvaluationsForProject(project_id, rubric_id);

    if (panelMembers.length > 0 && submittedEvals.length >= panelMembers.length) {
      const result = await evaluationService.aggregateForProject(project_id, rubric_id);
      await EvaluationModel.publishFinalResult(project_id, true);

      const project = await ProjectModel.findById(project_id);

      if (result.is_approved) {
        await ProjectModel.updateStatus(project_id, 'completed');
        if (project && project.student_id) {
          await sendNotification(
            project.student_id,
            'Defense Proposal Approved! 🎉',
            `Congratulations! Your defense presentation has been APPROVED by the panel with ${result.approved_votes}/${result.total_votes} approvals. Final Grade: ${result.grade} (${result.final_score}%).`
          );
        }
      } else {
        await ProjectModel.updateStatus(project_id, 'rejected');
        if (project && project.student_id) {
          await sendNotification(
            project.student_id,
            'Defense Proposal Not Approved ❌',
            `Your defense presentation was NOT APPROVED by the panel (${result.approved_votes}/${result.total_votes} approvals, 3 or more required). Grade: ${result.grade}. Please consult your supervisor for resubmission.`
          );
        }
      }
    }
  } catch (aggErr) {
    console.error('Auto-aggregation on evaluation submission notice:', aggErr.message);
  }

  res.status(201).json({ message: 'Evaluation submitted successfully', evaluationId });
}

async function aggregate(req, res) {
  const { projectId, rubricId } = req.params;
  const result = await evaluationService.aggregateForProject(projectId, rubricId);

  const project = await ProjectModel.findById(projectId);
  if (project && project.student_id) {
    const title = result.is_approved ? 'Defense Proposal Approved! 🎉' : 'Defense Proposal Not Approved ❌';
    const msg = result.is_approved
      ? `Your defense presentation has been APPROVED by the panel (${result.approved_votes}/${result.total_votes} approvals). Final Grade: ${result.grade} (${result.final_score}%).`
      : `Your defense presentation was NOT APPROVED (${result.approved_votes}/${result.total_votes} approvals, 3 or more required). Grade: ${result.grade}.`;
    await sendNotification(project.student_id, title, msg);
  }

  res.json(result);
}

async function getFinalResult(req, res) {
  const result = await EvaluationModel.getFinalResult(req.params.projectId);
  if (!result) return res.status(404).json({ message: 'No aggregated evaluation result found yet' });
  res.json(result);
}

async function publishFinalResult(req, res) {
  const { is_published } = req.body;
  const projectId = req.params.projectId;
  await EvaluationModel.publishFinalResult(projectId, is_published !== false);

  const project = await ProjectModel.findById(projectId);
  if (project && project.student_id) {
    await sendNotification(
      project.student_id,
      'Final Grade Published',
      `Your official final project evaluation grade has been published.`
    );
  }

  res.json({ message: 'Final result publish status updated' });
}

module.exports = {
  listRubrics,
  createRubric,
  getRubric,
  submitEvaluation,
  aggregate,
  getFinalResult,
  publishFinalResult
};
