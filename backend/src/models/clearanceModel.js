const db = require('../config/db');

const ClearanceModel = {
  /**
   * Get clearance form for a project (with student & supervisor info joined).
   * Returns the row or null if not yet created.
   */
  async findByProject(projectId) {
    const [rows] = await db.query(
      `SELECT cf.*,
              u.full_name   AS student_name,
              u.matric_or_staff_no AS student_matric,
              u.programme,
              u.level,
              u.department,
              p.title       AS project_title,
              p.status      AS project_status,
              sup.full_name AS supervisor_name,
              sub.full_name AS submitted_by_name
       FROM clearance_forms cf
       JOIN projects p         ON cf.project_id = p.id
       JOIN users u            ON p.student_id  = u.id
       LEFT JOIN users sup     ON p.supervisor_id = sup.id
       LEFT JOIN users sub     ON cf.submitted_by  = sub.id
       WHERE cf.project_id = ?`,
      [projectId]
    );
    return rows[0] || null;
  },

  /**
   * Create a blank pending form for a project.
   */
  async create(projectId) {
    const [result] = await db.query(
      `INSERT INTO clearance_forms (project_id) VALUES (?)`,
      [projectId]
    );
    return result.insertId;
  },

  /**
   * Save (draft or submit) a clearance form.
   * If submitting, sets status='submitted' and submitted_at/submitted_by.
   */
  async save(projectId, fields, submittedBy = null) {
    const {
      title_approved, template_followed, intro_satisfactory,
      background_adequate, problem_statement_clear, motivation_appropriate,
      objectives_clear, scope_defined, methodology_sound,
      literature_adequate, references_correct, formatting_satisfactory,
      suitable_for_defense, recommendation, comments, isSubmitting
    } = fields;

    const status       = isSubmitting ? 'submitted' : 'pending';
    const submittedAt  = isSubmitting ? new Date() : null;
    const submittedById = isSubmitting ? submittedBy : null;

    await db.query(
      `UPDATE clearance_forms SET
        title_approved          = ?,
        template_followed       = ?,
        intro_satisfactory      = ?,
        background_adequate     = ?,
        problem_statement_clear = ?,
        motivation_appropriate  = ?,
        objectives_clear        = ?,
        scope_defined           = ?,
        methodology_sound       = ?,
        literature_adequate     = ?,
        references_correct      = ?,
        formatting_satisfactory = ?,
        suitable_for_defense    = ?,
        recommendation          = ?,
        comments                = ?,
        status                  = ?,
        submitted_at            = ?,
        submitted_by            = ?
       WHERE project_id = ?`,
      [
        title_approved          ?? null,
        template_followed       ?? null,
        intro_satisfactory      ?? null,
        background_adequate     ?? null,
        problem_statement_clear ?? null,
        motivation_appropriate  ?? null,
        objectives_clear        ?? null,
        scope_defined           ?? null,
        methodology_sound       ?? null,
        literature_adequate     ?? null,
        references_correct      ?? null,
        formatting_satisfactory ?? null,
        suitable_for_defense    ?? null,
        recommendation          ?? null,
        comments                ?? null,
        status,
        submittedAt,
        submittedById,
        projectId
      ]
    );
  }
};

module.exports = ClearanceModel;
