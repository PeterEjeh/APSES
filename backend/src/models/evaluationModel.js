const db = require('../config/db');

const EvaluationModel = {
  async listAllRubrics() {
    const [rows] = await db.query(
      `SELECT r.*, u.full_name AS created_by_name
       FROM rubrics r
       JOIN users u ON r.created_by = u.id
       ORDER BY r.created_at DESC`
    );
    return rows;
  },

  async createRubric({ name, created_by, criteria, assessor_weights }) {
    const [result] = await db.query(
      `INSERT INTO rubrics (name, created_by) VALUES (?, ?)`,
      [name, created_by]
    );
    const rubricId = result.insertId;

    if (Array.isArray(criteria) && criteria.length > 0) {
      const cValues = criteria.map(c => [rubricId, c.criterion_name, c.max_score || 100, c.weight_percent]);
      await db.query(
        `INSERT INTO rubric_criteria (rubric_id, criterion_name, max_score, weight_percent) VALUES ?`,
        [cValues]
      );
    }

    if (Array.isArray(assessor_weights) && assessor_weights.length > 0) {
      const wValues = assessor_weights.map(w => [rubricId, w.assessor_role, w.weight_percent]);
      await db.query(
        `INSERT INTO assessor_weights (rubric_id, assessor_role, weight_percent) VALUES ?`,
        [wValues]
      );
    }

    return rubricId;
  },

  async getRubricWithCriteria(rubricId) {
    const [rubrics] = await db.query(`SELECT * FROM rubrics WHERE id = ?`, [rubricId]);
    if (rubrics.length === 0) return null;

    const [criteria] = await db.query(
      `SELECT * FROM rubric_criteria WHERE rubric_id = ?`, [rubricId]
    );
    const [weights] = await db.query(
      `SELECT * FROM assessor_weights WHERE rubric_id = ?`, [rubricId]
    );
    return { ...rubrics[0], criteria, assessorWeights: weights };
  },

  async createEvaluation({ project_id, rubric_id, assessor_id, assessor_role }) {
    const [result] = await db.query(
      `INSERT INTO evaluations (project_id, rubric_id, assessor_id, assessor_role)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE status = 'draft', created_at = NOW()`,
      [project_id, rubric_id, assessor_id, assessor_role]
    );
    return result.insertId || result.id;
  },

  async saveScores(evaluationId, scores) {
    await db.query(`DELETE FROM evaluation_scores WHERE evaluation_id = ?`, [evaluationId]);
    const values = scores.map(s => [evaluationId, s.criterion_id, s.score, s.comment || null]);
    if (values.length === 0) return;
    await db.query(
      `INSERT INTO evaluation_scores (evaluation_id, criterion_id, score, comment) VALUES ?`,
      [values]
    );
  },

  async submitEvaluation(evaluationId) {
    await db.query(
      `UPDATE evaluations SET status = 'submitted', submitted_at = NOW() WHERE id = ?`,
      [evaluationId]
    );
  },

  async getSubmittedEvaluationsForProject(projectId, rubricId) {
    const [evaluations] = await db.query(
      `SELECT e.*, u.full_name AS assessor_name
       FROM evaluations e
       JOIN users u ON e.assessor_id = u.id
       WHERE e.project_id = ? AND e.rubric_id = ? AND e.status = 'submitted'`,
      [projectId, rubricId]
    );
    for (const ev of evaluations) {
      const [scores] = await db.query(
        `SELECT es.*, rc.criterion_name, rc.weight_percent, rc.max_score
         FROM evaluation_scores es JOIN rubric_criteria rc ON es.criterion_id = rc.id
         WHERE es.evaluation_id = ?`,
        [ev.id]
      );
      ev.scores = scores;
    }
    return evaluations;
  },

  async saveFinalResult(projectId, finalScore, grade) {
    await db.query(
      `INSERT INTO final_results (project_id, final_score, grade)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE final_score = VALUES(final_score), grade = VALUES(grade), computed_at = NOW()`,
      [projectId, finalScore, grade]
    );
  },

  async publishFinalResult(projectId, isPublished) {
    await db.query(
      `UPDATE final_results SET is_published = ? WHERE project_id = ?`,
      [isPublished, projectId]
    );
  },

  async getFinalResult(projectId) {
    const [rows] = await db.query(`SELECT * FROM final_results WHERE project_id = ?`, [projectId]);
    return rows[0];
  }
};

module.exports = EvaluationModel;
