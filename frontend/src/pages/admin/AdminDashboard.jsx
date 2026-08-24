import { useEffect, useRef, useState } from 'react';
import client from '../../api/client';

const TOPIC_COLOURS = {
  AI:                    { bg: '#fef9c3', color: '#854d0e', border: '#fde047' },
  Networks:              { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
  Databases:             { bg: '#dcfce7', color: '#166534', border: '#86efac' },
  'Software Engineering':{ bg: '#f3e8ff', color: '#6b21a8', border: '#d8b4fe' },
  Cybersecurity:         { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
};
const topicStyle = (a) => TOPIC_COLOURS[a] || { bg: '#f1f5f9', color: '#334155', border: '#cbd5e1' };

// ─── Shared three-dot dropdown (without emojis) ─────────────────────────────
function MoreMenu({ children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: '30px',
          height: '30px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-strong)',
          background: 'var(--bg-surface)',
          cursor: 'pointer',
          fontSize: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)'
        }}
        title="More actions"
      >
        ⋮
      </button>
      {open && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: '34px',
          zIndex: 300,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-md)',
          minWidth: '160px',
          padding: '0.25rem 0'
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

function MenuItem({ onClick, children, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '0.5rem 0.85rem',
        border: 'none',
        background: 'transparent',
        fontSize: '0.82rem',
        fontWeight: 500,
        cursor: 'pointer',
        color: danger ? 'var(--accent-red)' : 'var(--text-main)'
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {children}
    </button>
  );
}

export default function AdminDashboard() {
  const [tab, setTab] = useState('pending'); // 'pending' | 'projects' | 'supervisors' | 'rubrics'

  const [pending, setPending] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [users, setUsers] = useState([]);
  const [rubrics, setRubrics] = useState([]);
  const [loading, setLoading] = useState(true);

  // Supervisor Candidate Match Preview Modal
  const [preview, setPreview] = useState(null);

  // Panel Candidate Match Preview Modal
  const [panelPreview, setPanelPreview] = useState(null);

  // Supervisor Edit Modal
  const [editSup, setEditSup] = useState(null);
  const [supForm, setSupForm] = useState({ specializations: '', max_students: 5 });

  // Panel Member Manual Assignment Modal
  const [panelAssignProj, setPanelAssignProj] = useState(null);
  const [selectedPanelMemberId, setSelectedPanelMemberId] = useState('');

  // Rubric Builder Modal
  const [showRubricModal, setShowRubricModal] = useState(false);
  const [rubricName, setRubricName] = useState('');
  const [criteriaList, setCriteriaList] = useState([
    { criterion_name: 'Presentation & Defense', max_score: 100, weight_percent: 30 },
    { criterion_name: 'Methodology & Implementation', max_score: 100, weight_percent: 40 },
    { criterion_name: 'Originality & Technical Quality', max_score: 100, weight_percent: 30 }
  ]);
  const [assessorWeights] = useState([
    { assessor_role: 'supervisor', weight_percent: 40 },
    { assessor_role: 'panel', weight_percent: 60 }
  ]);

  useEffect(() => {
    loadAdminData();
  }, []);

  async function loadAdminData() {
    setLoading(true);
    try {
      const [pRes, aRes, sRes, rRes, uRes] = await Promise.all([
        client.get('/projects/pending'),
        client.get('/projects/all'),
        client.get('/auth/supervisors'),
        client.get('/evaluations/rubrics'),
        client.get('/auth/users').catch(() => ({ data: [] }))
      ]);

      setPending(pRes.data);
      setAllProjects(aRes.data);
      setSupervisors(sRes.data);
      setRubrics(rRes.data);
      setUsers(uRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadPreview(projectId) {
    try {
      const { data } = await client.get(`/projects/${projectId}/allocation-preview`);
      setPreview(data);
    } catch (e) {
      alert('Error fetching preview candidates');
    }
  }

  async function autoAllocate(projectId) {
    try {
      await client.post(`/projects/${projectId}/allocate`);
      alert('Supervisor auto-allocated successfully!');
      setPreview(null);
      loadAdminData();
    } catch (e) {
      alert('Allocation error: ' + (e.response?.data?.message || e.message));
    }
  }

  async function manualAllocate(projectId, supervisorId) {
    if (!supervisorId) return;
    try {
      await client.post(`/projects/${projectId}/manual-allocate`, { supervisor_id: Number(supervisorId) });
      alert('Supervisor manually assigned!');
      loadAdminData();
    } catch (e) {
      alert('Manual allocation error: ' + (e.response?.data?.message || e.message));
    }
  }

  async function handleAssignPanelMember(e) {
    e.preventDefault();
    if (!panelAssignProj || !selectedPanelMemberId) return;

    try {
      await client.post(`/projects/${panelAssignProj.id}/assign-panel`, {
        panel_member_id: Number(selectedPanelMemberId)
      });
      alert('Panel member assigned to defense project!');
      setPanelAssignProj(null);
      setSelectedPanelMemberId('');
      loadAdminData();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to assign panel member');
    }
  }

  async function loadPanelPreview(projectId) {
    try {
      const { data } = await client.get(`/projects/${projectId}/panel-preview`);
      setPanelPreview(data);
    } catch (e) {
      alert('Error fetching panel candidate match rankings');
    }
  }

  async function autoAllocatePanel(projectId) {
    try {
      await client.post(`/projects/${projectId}/panel-auto-allocate`);
      alert('Defense panel members auto-allocated successfully!');
      setPanelPreview(null);
      loadAdminData();
    } catch (e) {
      alert('Panel allocation error: ' + (e.response?.data?.message || e.message));
    }
  }

  async function batchAutoAllocatePanels() {
    if (!window.confirm('Auto-assign defense panel members for all approved projects needing panels?')) return;
    try {
      const { data } = await client.post('/projects/batch-panel-allocate');
      alert(`Batch panel allocation completed!\nTotal Processed: ${data.results.length}`);
      loadAdminData();
    } catch (e) {
      alert('Batch panel allocation error: ' + (e.response?.data?.message || e.message));
    }
  }

  async function handleUpdateSupervisor(e) {
    e.preventDefault();
    if (!editSup) return;

    try {
      await client.patch(`/auth/supervisors/${editSup.user_id}`, supForm);
      setEditSup(null);
      loadAdminData();
    } catch (e) {
      alert('Failed to update supervisor profile');
    }
  }

  async function triggerAggregate(projectId) {
    if (rubrics.length === 0) {
      alert('No rubrics found. Please create a rubric first.');
      return;
    }
    const defaultRubricId = rubrics[0].id;
    try {
      const { data } = await client.post(`/evaluations/project/${projectId}/rubric/${defaultRubricId}/aggregate`);
      alert(`Final evaluation score aggregated successfully!\nFinal Score: ${data.final_score}% (Grade: ${data.grade})`);
      loadAdminData();
    } catch (e) {
      alert('Aggregation error: ' + (e.response?.data?.message || e.message));
    }
  }

  async function togglePublish(projectId, currentStatus) {
    try {
      await client.patch(`/evaluations/project/${projectId}/publish`, { is_published: !currentStatus });
      loadAdminData();
    } catch (e) {
      alert('Failed to update publish status');
    }
  }

  async function handleCreateRubric(e) {
    e.preventDefault();
    const totalCritWeight = criteriaList.reduce((sum, c) => sum + Number(c.weight_percent), 0);
    if (Math.abs(totalCritWeight - 100) > 0.1) {
      alert(`Criterion weights must sum to 100%. Current sum: ${totalCritWeight}%`);
      return;
    }

    try {
      await client.post('/evaluations/rubrics', {
        name: rubricName,
        criteria: criteriaList,
        assessor_weights: assessorWeights
      });
      setShowRubricModal(false);
      setRubricName('');
      loadAdminData();
    } catch (e) {
      alert('Failed to create rubric');
    }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading admin console...</div>;

  const panelUsers = users.filter(u => u.role === 'panel' || u.role === 'admin' || u.role === 'supervisor');

  return (
    <div>
      {/* Header & Metrics */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">System Administration &amp; Oversight</h2>
            <span className="role-badge admin">Administrator</span>
          </div>
        </div>

        <div className="metrics-grid">
          <div className="metric-card">
            <span className="metric-label">Total Student Projects</span>
            <span className="metric-value">{allProjects.length}</span>
            <span className="metric-desc">Submissions across department</span>
          </div>

          <div className="metric-card">
            <span className="metric-label">Pending Allocation</span>
            <span className="metric-value" style={{ color: pending.length > 0 ? 'var(--accent-amber)' : 'inherit' }}>
              {pending.length}
            </span>
            <span className="metric-desc">Awaiting supervisor matching</span>
          </div>

          <div className="metric-card">
            <span className="metric-label">Active Supervisors</span>
            <span className="metric-value">{supervisors.length}</span>
            <span className="metric-desc">Faculty supervision pool</span>
          </div>

          <div className="metric-card">
            <span className="metric-label">Evaluation Rubrics</span>
            <span className="metric-value">{rubrics.length}</span>
            <span className="metric-desc">Active scoring frameworks</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="auth-tabs" style={{ marginBottom: 0 }}>
          <button className={`auth-tab ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>
            Pending Allocations ({pending.length})
          </button>
          <button className={`auth-tab ${tab === 'projects' ? 'active' : ''}`} onClick={() => setTab('projects')}>
            Projects Portfolio ({allProjects.length})
          </button>
          <button className={`auth-tab ${tab === 'supervisors' ? 'active' : ''}`} onClick={() => setTab('supervisors')}>
            Supervisors Pool ({supervisors.length})
          </button>
          <button className={`auth-tab ${tab === 'rubrics' ? 'active' : ''}`} onClick={() => setTab('rubrics')}>
            Evaluation Rubrics ({rubrics.length})
          </button>
        </div>
      </div>

      {/* TAB 1: Pending Allocations */}
      {tab === 'pending' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Projects Awaiting Supervisor Matching</h3>
          </div>

          {pending.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>All submitted projects have been allocated to supervisors!</p>
          ) : (
            <>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Project Title</th>
                      <th>Topic Area</th>
                      <th>Submitted</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map(p => (
                      <tr key={p.id}>
                        <td style={{ minWidth: '130px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.875rem', display: 'block' }}>{p.student_name}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.student_matric || p.student_email}</span>
                        </td>
                        <td style={{ maxWidth: '280px' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.82rem', lineHeight: 1.4, display: 'block' }}>{p.title}</span>
                        </td>
                        <td>
                          {(() => {
                            const ts = topicStyle(p.topic_area);
                            return (
                              <span style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                padding: '0.18rem 0.55rem',
                                borderRadius: '999px',
                                background: ts.bg,
                                color: ts.color,
                                border: `1px solid ${ts.border}`,
                                whiteSpace: 'nowrap'
                              }}>
                                {p.topic_area}
                              </span>
                            );
                          })()}
                        </td>
                        <td>{new Date(p.created_at).toLocaleDateString()}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', justifyContent: 'flex-end' }}>
                            <button className="btn btn-primary btn-sm" onClick={() => autoAllocate(p.id)}>
                              Auto-Allocate
                            </button>
                            <MoreMenu>
                              <MenuItem onClick={() => loadPreview(p.id)}>Preview Candidates</MenuItem>
                            </MoreMenu>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Showing 1 to {pending.length} of {pending.length} {pending.length === 1 ? 'entry' : 'entries'}
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: All Projects */}
      {tab === 'projects' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">All Departmental Projects</h3>
            <button className="btn btn-primary btn-sm" onClick={batchAutoAllocatePanels}>
              Batch Auto-Assign Defense Panels
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Project Title &amp; Topic</th>
                  <th>Supervisor</th>
                  <th>Status</th>
                  <th>Grade</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allProjects.map(p => (
                  <tr key={p.id}>
                    <td style={{ minWidth: '130px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.875rem', display: 'block' }}>{p.student_name}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.student_matric}</span>
                    </td>
                    <td style={{ maxWidth: '260px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.82rem', lineHeight: 1.4, display: 'block' }}>{p.title}</span>
                      <div style={{ marginTop: '0.25rem' }}>
                        {(() => {
                          const ts = topicStyle(p.topic_area);
                          return (
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '0.15rem 0.5rem',
                              borderRadius: '999px',
                              background: ts.bg,
                              color: ts.color,
                              border: `1px solid ${ts.border}`,
                              display: 'inline-block'
                            }}>
                              {p.topic_area}
                            </span>
                          );
                        })()}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {p.supervisor_name || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Unassigned</span>}
                    </td>
                    <td>
                      <span className={`status-badge ${p.status}`}>
                        {p.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      {p.final_score != null ? (
                        <span style={{ fontSize: '0.85rem' }}>
                          <strong>Grade {p.grade}</strong> <span style={{ color: 'var(--text-muted)' }}>({p.final_score}%)</span>
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Unevaluated</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', justifyContent: 'flex-end' }}>
                        {(p.status === 'in_progress' || p.status === 'completed') ? (
                          <>
                            <button className="btn btn-secondary btn-sm" onClick={() => setPanelAssignProj(p)}>
                              Assign Panel
                            </button>
                            <button className="btn btn-primary btn-sm" onClick={() => autoAllocatePanel(p.id)}>
                              Auto-Panel
                            </button>
                            <MoreMenu>
                              <MenuItem onClick={() => loadPanelPreview(p.id)}>Rank Candidates</MenuItem>
                              <MenuItem onClick={() => triggerAggregate(p.id)}>Aggregate Score</MenuItem>
                              {p.final_score != null && (
                                <MenuItem onClick={() => togglePublish(p.id, p.is_published)} danger={p.is_published}>
                                  {p.is_published ? 'Unpublish Result' : 'Publish Result'}
                                </MenuItem>
                              )}
                            </MoreMenu>
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', marginRight: '0.25rem' }}>
                              {p.status === 'allocated' ? 'Awaiting Supervisor Approval' : 'Panel Unassignable'}
                            </span>
                            <MoreMenu>
                              <MenuItem onClick={() => triggerAggregate(p.id)}>Aggregate Score</MenuItem>
                              {p.final_score != null && (
                                <MenuItem onClick={() => togglePublish(p.id, p.is_published)} danger={p.is_published}>
                                  {p.is_published ? 'Unpublish Result' : 'Publish Result'}
                                </MenuItem>
                              )}
                            </MoreMenu>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Showing 1 to {allProjects.length} of {allProjects.length} {allProjects.length === 1 ? 'entry' : 'entries'}
          </div>
        </div>
      )}

      {/* TAB 3: Supervisor Profiles */}
      {tab === 'supervisors' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Supervision Faculty Capacity Manager</h3>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Faculty Name</th>
                  <th>Email / Staff No</th>
                  <th>Specialization Tags</th>
                  <th>Current Load / Capacity</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {supervisors.map(s => (
                  <tr key={s.user_id}>
                    <td><strong>{s.full_name}</strong></td>
                    <td>
                      {s.email}
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.matric_or_staff_no}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.775rem', background: '#f1f5f9', color: 'var(--brand-primary)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
                        {s.specializations}
                      </span>
                    </td>
                    <td>
                      <strong>{s.current_load} / {s.max_students}</strong> students
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setEditSup(s);
                          setSupForm({ specializations: s.specializations, max_students: s.max_students });
                        }}
                      >
                        Edit Capacity
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Showing 1 to {supervisors.length} of {supervisors.length} {supervisors.length === 1 ? 'entry' : 'entries'}
          </div>
        </div>
      )}

      {/* TAB 4: Rubrics */}
      {tab === 'rubrics' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Configurable Evaluation Rubrics</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowRubricModal(true)}>
              + Create Rubric
            </button>
          </div>

          {rubrics.map(r => (
            <div key={r.id} style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '0.75rem', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <h4 style={{ fontSize: '0.95rem', color: 'var(--brand-primary)' }}>{r.name}</h4>
                <small style={{ color: 'var(--text-muted)' }}>Created by: {r.created_by_name}</small>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Assign Panel Member */}
      {panelAssignProj && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Assign Panel Member to Project</h3>
              <button className="close-btn" onClick={() => setPanelAssignProj(null)}>×</button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Assign an evaluator for project: <strong>"{panelAssignProj.title}"</strong> ({panelAssignProj.student_name})
            </p>

            <form onSubmit={handleAssignPanelMember}>
              <div className="form-group">
                <label>Select Panel Evaluator / Faculty Member</label>
                <select
                  className="form-control"
                  value={selectedPanelMemberId}
                  onChange={(e) => setSelectedPanelMemberId(e.target.value)}
                  required
                >
                  <option value="">-- Select Faculty / Panel Member --</option>
                  {panelUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.role}) — {u.email}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setPanelAssignProj(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Assign Panel Member</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Panel Match Candidate Ranking Preview */}
      {panelPreview && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <div>
                <h3>Defense Panel Candidate Match Rankings</h3>
                <small style={{ color: 'var(--text-muted)' }}>Project #{panelPreview.project_id}: "{panelPreview.project_title}" ({panelPreview.topic_area})</small>
              </div>
              <button className="close-btn" onClick={() => setPanelPreview(null)}>×</button>
            </div>

            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Specialization Match (60% weight) + Capacity Balance (40% weight). <strong>Conflict of Interest Rule enforced: Assigned supervisor is excluded.</strong>
            </p>

            <div className="table-container" style={{ marginBottom: '1.25rem' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Panel Member</th>
                    <th>Specializations</th>
                    <th>Current Panel Load</th>
                    <th>Match Score %</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {panelPreview.candidates.map((c, index) => (
                    <tr key={c.panel_member_id} style={{ background: index < 2 ? '#ecfdf5' : 'transparent' }}>
                      <td><strong>#{index + 1}</strong></td>
                      <td>
                        <strong>{c.panel_member_name}</strong>
                        {index < 2 && <span style={{ fontSize: '0.7rem', color: 'var(--accent-green)', marginLeft: '0.5rem' }}>(Recommended)</span>}
                      </td>
                      <td><small>{c.specializations}</small></td>
                      <td>{c.current_panel_count} projects</td>
                      <td>
                        <strong style={{ color: c.match_score > 60 ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
                          {c.match_score}%
                        </strong>
                      </td>
                      <td>
                        <button className="btn btn-primary btn-sm" onClick={async () => {
                          await client.post(`/projects/${panelPreview.project_id}/assign-panel`, { panel_member_id: c.panel_member_id });
                          alert(`Assigned ${c.panel_member_name} to defense panel!`);
                          setPanelPreview(null);
                          loadAdminData();
                        }}>
                          Assign
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setPanelPreview(null)}>Close</button>
              <button className="btn btn-success" onClick={() => autoAllocatePanel(panelPreview.project_id)}>
                Confirm Auto-Allocate Top Ranked Candidates
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Candidate Match Score Preview */}
      {preview && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <div>
                <h3>Supervisor Matching Candidate Ranking</h3>
                <small style={{ color: 'var(--text-muted)' }}>Project #{preview.project_id}: "{preview.project_title}" ({preview.topic_area})</small>
              </div>
              <button className="close-btn" onClick={() => setPreview(null)}>×</button>
            </div>

            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              The allocation engine evaluates candidate supervisors on <strong>Topic Match (70% weight)</strong> and <strong>Available Capacity (30% weight)</strong>.
            </p>

            <div className="table-container" style={{ marginBottom: '1.25rem' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Supervisor Name</th>
                    <th>Match Score %</th>
                    <th>Capacity Free</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.candidates.map((c, index) => (
                    <tr key={c.supervisor_id} style={{ background: index === 0 ? '#ecfdf5' : 'transparent' }}>
                      <td><strong>#{index + 1}</strong></td>
                      <td>
                        <strong>{c.supervisor_name}</strong>
                        {index === 0 && <span style={{ fontSize: '0.7rem', color: 'var(--accent-green)', marginLeft: '0.5rem' }}>(Best Match)</span>}
                      </td>
                      <td>
                        <strong style={{ color: c.match_score > 60 ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
                          {c.match_score}%
                        </strong>
                      </td>
                      <td>{c.capacity_available} slots left</td>
                      <td>
                        <button className="btn btn-primary btn-sm" onClick={() => manualAllocate(preview.project_id, c.supervisor_id)}>
                          Assign
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setPreview(null)}>Close</button>
              <button className="btn btn-success" onClick={() => autoAllocate(preview.project_id)}>
                Confirm Auto-Allocate #1 Candidate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Supervisor Profile */}
      {editSup && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Edit Supervisor Profile: {editSup.full_name}</h3>
              <button className="close-btn" onClick={() => setEditSup(null)}>×</button>
            </div>

            <form onSubmit={handleUpdateSupervisor}>
              <div className="form-group">
                <label>Specialization Tags (comma-separated)</label>
                <input
                  className="form-control"
                  value={supForm.specializations}
                  onChange={(e) => setSupForm({ ...supForm, specializations: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Maximum Student Capacity (1 - 1000)</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  className="form-control"
                  value={supForm.max_students}
                  onChange={(e) => setSupForm({ ...supForm, max_students: parseInt(e.target.value) || '' })}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditSup(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Rubric */}
      {showRubricModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <h3>Create New Evaluation Rubric</h3>
              <button className="close-btn" onClick={() => setShowRubricModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreateRubric}>
              <div className="form-group">
                <label>Rubric Title</label>
                <input
                  className="form-control"
                  placeholder="e.g. Final Year Project Defense Rubric"
                  value={rubricName}
                  onChange={(e) => setRubricName(e.target.value)}
                  required
                />
              </div>

              <h4 style={{ fontSize: '0.875rem', margin: '1rem 0 0.5rem', color: 'var(--brand-primary)' }}>Criterion Breakdown (Weights must sum to 100%)</h4>
              {criteriaList.map((c, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input
                    className="form-control"
                    placeholder="Criterion name"
                    value={c.criterion_name}
                    onChange={(e) => {
                      const updated = [...criteriaList];
                      updated[i].criterion_name = e.target.value;
                      setCriteriaList(updated);
                    }}
                    required
                  />
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Max Score"
                    value={c.max_score}
                    onChange={(e) => {
                      const updated = [...criteriaList];
                      updated[i].max_score = Number(e.target.value);
                      setCriteriaList(updated);
                    }}
                    required
                  />
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Weight %"
                    value={c.weight_percent}
                    onChange={(e) => {
                      const updated = [...criteriaList];
                      updated[i].weight_percent = Number(e.target.value);
                      setCriteriaList(updated);
                    }}
                    required
                  />
                </div>
              ))}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowRubricModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Rubric</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
