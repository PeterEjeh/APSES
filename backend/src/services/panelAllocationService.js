const db = require('../config/db');
const ProjectModel    = require('../models/projectModel');
const ClearanceModel  = require('../models/clearanceModel');

const panelAllocationService = {
  async getCandidatePanelMembers(project) {
    // 1. Get all potential panel members (users with role 'panel', 'supervisor', or 'admin')
    const [rows] = await db.query(
      `SELECT u.id AS panel_member_id, u.full_name AS panel_member_name, u.email, u.department,
              sp.specializations,
              (SELECT COUNT(*) FROM project_panel pp WHERE pp.panel_member_id = u.id) AS current_panel_count
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN supervisor_profiles sp ON u.id = sp.user_id
       WHERE r.name IN ('panel', 'supervisor', 'admin')`
    );

    // 2. Filter out conflict of interest (project supervisor cannot be panel member)
    const eligible = rows.filter(cand => Number(cand.panel_member_id) !== Number(project.supervisor_id));

    // 3. Compute score for each candidate
    const topicAreaLower = (project.topic_area || '').toLowerCase();

    const ranked = eligible.map(cand => {
      const specsLower = (cand.specializations || '').toLowerCase();
      const topicMatchScore = specsLower.includes(topicAreaLower) ? 100 : 20;

      // Workload balancing score: 0 to 100 (less panel count = higher score)
      const currentLoad = cand.current_panel_count || 0;
      const capacityBalanceScore = Math.max(0, 100 - (currentLoad / 5) * 100);

      const matchScore = Math.round(0.6 * topicMatchScore + 0.4 * capacityBalanceScore);

      return {
        panel_member_id: cand.panel_member_id,
        panel_member_name: cand.panel_member_name,
        email: cand.email,
        specializations: cand.specializations || 'General Computer Science',
        current_panel_count: currentLoad,
        topic_match_score: topicMatchScore,
        capacity_balance_score: capacityBalanceScore,
        match_score: matchScore
      };
    });

    // 4. Sort: Highest topic match first, then least current panel workload
    ranked.sort((a, b) => {
      if (b.topic_match_score !== a.topic_match_score) {
        return b.topic_match_score - a.topic_match_score;
      }
      return a.current_panel_count - b.current_panel_count;
    });

    return ranked;
  },

  async rankCandidates(project, limit = 4) {
    const candidates = await this.getCandidatePanelMembers(project);
    return candidates.slice(0, limit);
  },

  async autoAllocate(project, panelSize = 4) {
    if (project.status !== 'in_progress' && project.status !== 'completed') {
      throw new Error('Panel members can only be auto-allocated to projects with approved topics');
    }

    // ── Clearance gate ──
    const clearance = await ClearanceModel.findByProject(project.id);
    if (!clearance || clearance.status !== 'submitted' || clearance.recommendation !== 'cleared') {
      throw new Error('Clearance not issued: supervisor has not submitted a "Cleared for Defense" clearance form for this project');
    }

    const candidates = await this.getCandidatePanelMembers(project);
    if (candidates.length === 0) {
      throw new Error('No eligible panel members available for allocation');
    }

    const chosenList = candidates.slice(0, panelSize);

    for (const chosen of chosenList) {
      await ProjectModel.assignPanelMember(project.id, chosen.panel_member_id);
    }

    return {
      project_id: project.id,
      assigned_panel_members: chosenList
    };
  },

  async batchAutoAllocateAll(panelSize = 4) {
    // Find all in_progress/completed projects that currently have fewer than panelSize panel members
    const [projects] = await db.query(
      `SELECT p.*, u.full_name AS student_name
       FROM projects p
       JOIN users u ON p.student_id = u.id
       WHERE p.status IN ('in_progress', 'completed')
         AND (SELECT COUNT(*) FROM project_panel pp WHERE pp.project_id = p.id) < ?`,
      [panelSize]
    );

    const results = [];
    for (const proj of projects) {
      try {
        const alloc = await this.autoAllocate(proj, panelSize);
        results.push({ project_id: proj.id, student_name: proj.student_name, status: 'success', allocated: alloc.assigned_panel_members });
      } catch (err) {
        results.push({ project_id: proj.id, student_name: proj.student_name, status: 'skipped', reason: err.message });
      }
    }

    return results;
  }
};

module.exports = panelAllocationService;
