/**
 * Evaluation-aggregation engine.
 *
 * Takes every SUBMITTED evaluation for a project under a given rubric
 * (one per assessor: supervisor, panel, external) and computes a single
 * weighted final score:
 *
 *   1. Within one assessor's evaluation, each criterion score is
 *      normalized to a percentage of its max_score, then combined using
 *      the criterion's weight_percent  -> that assessor's rubric score.
 *   2. Across assessors, each assessor's rubric score is combined using
 *      that assessor role's weight_percent (assessor_weights table)
 *      -> the project's final_score.
 *
 * This removes manual grade collation and the computation errors the
 * proposal's Problem Statement (Sec. 4) calls out.
 */
const EvaluationModel = require('../models/evaluationModel');

function computeAssessorScore(scores) {
  // scores: [{ score, max_score, weight_percent }]
  const totalWeight = scores.reduce((sum, s) => sum + Number(s.weight_percent), 0);
  const weightedSum = scores.reduce((sum, s) => {
    const pct = (Number(s.score) / Number(s.max_score)) * 100;
    return sum + pct * Number(s.weight_percent);
  }, 0);
  if (totalWeight === 0) return 0;
  return weightedSum / totalWeight;
}

function scoreToGrade(score) {
  if (score >= 70) return 'A';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C';
  if (score >= 45) return 'D';
  if (score >= 40) return 'E';
  return 'F';
}

/**
 * Aggregates all submitted evaluations for a project + rubric into one
 * final score, persists it, and returns the breakdown for transparency
 * (each assessor can see how their score contributed).
 */
async function aggregateForProject(projectId, rubricId) {
  const evaluations = await EvaluationModel.getSubmittedEvaluationsForProject(projectId, rubricId);
  if (evaluations.length === 0) {
    const err = new Error('No submitted evaluations found for this project/rubric yet');
    err.status = 409;
    throw err;
  }

  const { assessorWeights } = await EvaluationModel.getRubricWithCriteria(rubricId);
  const weightByRole = Object.fromEntries(assessorWeights.map(w => [w.assessor_role, Number(w.weight_percent)]));

  const breakdown = evaluations.map(ev => ({
    assessor_id: ev.assessor_id,
    assessor_role: ev.assessor_role,
    assessor_score: Number(computeAssessorScore(ev.scores).toFixed(2)),
    role_weight: weightByRole[ev.assessor_role] ?? 0
  }));

  const totalRoleWeight = breakdown.reduce((sum, b) => sum + b.role_weight, 0) || 1;
  const finalScore = breakdown.reduce(
    (sum, b) => sum + b.assessor_score * (b.role_weight / totalRoleWeight),
    0
  );

  const rounded = Number(finalScore.toFixed(2));
  
  // Voting tally: individual assessor score >= 50% counts as approval
  const approved_votes = breakdown.filter(b => b.assessor_score >= 50).length;
  const total_votes = breakdown.length;
  const rejected_votes = total_votes - approved_votes;
  
  // Rule: 3 or 4 approvals required to pass (if <= 2, automatically rejected)
  const is_approved = total_votes >= 3 ? approved_votes >= 3 : approved_votes >= Math.ceil(total_votes * 0.75);
  const grade = is_approved ? scoreToGrade(rounded) : 'F';

  await EvaluationModel.saveFinalResult(projectId, rounded, grade);

  return {
    final_score: rounded,
    grade,
    breakdown,
    approved_votes,
    rejected_votes,
    total_votes,
    is_approved
  };
}

module.exports = { computeAssessorScore, aggregateForProject, scoreToGrade };
