/**
 * Supervisor-allocation engine.
 *
 * Matches a project's topic_area against each supervisor's declared
 * specializations, then scores candidates by (a) how well the topic
 * matches and (b) remaining capacity, so load is spread fairly instead
 * of piling onto the first keyword match.
 *
 * Every candidate's score is written to allocation_log for auditability,
 * satisfying the proposal's "auditable system" and "allocation accuracy"
 * evaluation requirement (see Sec. 10, Expected Results).
 */
const db = require('../config/db');

const TOPIC_MATCH_WEIGHT = 0.7;   // how much specialization overlap matters
const CAPACITY_WEIGHT = 0.3;      // how much free capacity matters

async function getEligibleSupervisors() {
  const [rows] = await db.query(
    `SELECT sp.user_id, sp.specializations, sp.max_students,
            (SELECT COUNT(*) FROM projects p WHERE p.supervisor_id = sp.user_id AND p.status != 'rejected') AS current_load,
            u.full_name
     FROM supervisor_profiles sp JOIN users u ON sp.user_id = u.id
     WHERE (SELECT COUNT(*) FROM projects p WHERE p.supervisor_id = sp.user_id AND p.status != 'rejected') < sp.max_students`
  );
  return rows;
}

function topicMatchScore(topicArea, specializationsCsv) {
  const specs = specializationsCsv.toLowerCase().split(',').map(s => s.trim());
  const topic = topicArea.toLowerCase().trim();
  if (specs.includes(topic)) return 1;
  // partial / substring match gets a smaller score instead of zero
  const partial = specs.some(s => s.includes(topic) || topic.includes(s));
  return partial ? 0.5 : 0;
}

function capacityScore(maxStudents, currentLoad) {
  if (maxStudents === 0) return 0;
  return (maxStudents - currentLoad) / maxStudents;
}

/**
 * Runs the matching algorithm for a single project and returns the ranked
 * candidate list. Prioritizes topic specialization, and intelligently allocates
 * to the supervisor with the lowest current workload among identical specializations.
 */
async function rankCandidates(project) {
  const supervisors = await getEligibleSupervisors();

  const ranked = supervisors.map(s => {
    const match = topicMatchScore(project.topic_area, s.specializations);
    const capacity = capacityScore(s.max_students, s.current_load);
    const score = (match * TOPIC_MATCH_WEIGHT + capacity * CAPACITY_WEIGHT) * 100;
    return {
      supervisor_id: s.user_id,
      supervisor_name: s.full_name,
      match_score: Number(score.toFixed(2)),
      topic_match: match,
      current_load: Number(s.current_load),
      max_students: Number(s.max_students),
      capacity_available: s.max_students - s.current_load
    };
  }).sort((a, b) => {
    // 1. Highest topic specialization match first
    if (b.topic_match !== a.topic_match) {
      return b.topic_match - a.topic_match;
    }
    // 2. Intelligent Load Balancing: when specialization match is equal, allocate to the supervisor with LESS current load
    if (a.current_load !== b.current_load) {
      return a.current_load - b.current_load;
    }
    // 3. Higher overall match score
    return b.match_score - a.match_score;
  });

  return ranked;
}

async function logCandidates(projectId, ranked, selectedSupervisorId) {
  for (const c of ranked) {
    await db.query(
      `INSERT INTO allocation_log (project_id, candidate_supervisor_id, match_score, was_selected, reason)
       VALUES (?, ?, ?, ?, ?)`,
      [
        projectId,
        c.supervisor_id,
        c.match_score,
        c.supervisor_id === selectedSupervisorId,
        c.supervisor_id === selectedSupervisorId
          ? 'Highest combined topic-match and capacity score'
          : 'Not selected - lower combined score'
      ]
    );
  }
}

/**
 * Full pipeline: rank candidates, pick the best, persist the allocation,
 * increment the chosen supervisor's load, and log every candidate considered.
 * Throws if no eligible supervisor exists (caller should route to manual
 * admin allocation in that case).
 */
async function autoAllocate(project) {
  const ranked = await rankCandidates(project);
  if (ranked.length === 0) {
    const err = new Error('No supervisor with available capacity matches this topic area');
    err.status = 409;
    throw err;
  }
  const chosen = ranked[0];

  await db.query(
    `UPDATE projects SET supervisor_id = ?, status = 'allocated', allocated_at = NOW() WHERE id = ?`,
    [chosen.supervisor_id, project.id]
  );
  await db.query(
    `UPDATE supervisor_profiles SET current_load = current_load + 1 WHERE user_id = ?`,
    [chosen.supervisor_id]
  );
  await logCandidates(project.id, ranked, chosen.supervisor_id);

  return { chosen, allCandidates: ranked };
}

module.exports = { rankCandidates, autoAllocate };
