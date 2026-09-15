import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../../api/client';
import ClearanceFormModal from '../../components/ClearanceFormModal';
import DocumentViewer from '../../components/DocumentViewer';

// ─── Topic Area colour map ─────────────────────────────────────────────────────
const TOPIC_COLOURS = {
  AI:                   { bg: '#fef9c3', color: '#854d0e', border: '#fde047' },
  Networks:             { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
  Databases:            { bg: '#dcfce7', color: '#166534', border: '#86efac' },
  'Software Engineering':{ bg: '#f3e8ff', color: '#6b21a8', border: '#d8b4fe' },
  Cybersecurity:        { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
};
const topicStyle = (area) => TOPIC_COLOURS[area] || { bg: '#f1f5f9', color: '#334155', border: '#cbd5e1' };

// ─── Three-dot dropdown component ──────────────────────────────────────────────
function MoreMenu({ children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '30px', height: '30px', borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-strong)', background: 'var(--bg-surface)',
          cursor: 'pointer', fontSize: '1rem', display: 'flex',
          alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)',
        }}
        title="More actions"
      >⋮</button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '34px', zIndex: 200,
          background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)',
          minWidth: '160px', padding: '0.25rem 0',
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
      onClick={onClick}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        padding: '0.5rem 0.85rem', border: 'none', background: 'transparent',
        fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer',
        color: danger ? 'var(--accent-red)' : 'var(--text-main)',
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-subtle)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      {children}
    </button>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
const BACKEND_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
const getFileUrl = (filePath) => (filePath ? `${BACKEND_BASE}/${filePath.replace(/^\//, '')}` : null);

export default function SupervisorDashboard() {
  const [supervisees,   setSupervisees]   = useState([]);
  const [panelProjects, setPanelProjects] = useState([]);
  const [userProfile,   setUserProfile]   = useState(null);
  const [loading,       setLoading]       = useState(true);

  // Abstract & Proposal Document preview modal
  const [previewProject, setPreviewProject] = useState(null);
  const [previewTab,     setPreviewTab]     = useState('abstract'); // 'abstract' | 'document'

  // Milestone / meetings modal
  const [activeProject, setActiveProject] = useState(null);
  const [milestones,    setMilestones]    = useState([]);
  const [meetings,      setMeetings]      = useState([]);
  const [newMilestone,  setNewMilestone]  = useState({ title: '', description: '', due_date: '' });

  // Reject modal
  const [rejectProject, setRejectProject] = useState(null);
  const [rejectReason,  setRejectReason]  = useState('');
  const [rejecting,     setRejecting]     = useState(false);

  // Clearance modal
  const [clearanceProject, setClearanceProject] = useState(null);

  useEffect(() => { loadSupervisorData(); }, []);

  async function loadSupervisorData() {
    setLoading(true);
    try {
      const [supRes, meRes, panelRes] = await Promise.all([
        client.get('/projects/supervisees'),
        client.get('/auth/me'),
        client.get('/projects/panel-assigned').catch(() => ({ data: [] }))
      ]);
      setSupervisees(supRes.data || []);
      setUserProfile(meRes.data);
      setPanelProjects(panelRes.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  function openAbstractPreview(project, tab = 'abstract') {
    setPreviewProject(project);
    setPreviewTab(tab);
  }

  async function handleApproveTopic(project) {
    if (!window.confirm(`Approve project topic "${project.title}" by ${project.student_name}?`)) return;
    try {
      await client.post(`/projects/${project.id}/approve`);
      alert('Project topic approved successfully!');
      loadSupervisorData();
    } catch (err) { alert(err.response?.data?.message || 'Failed to approve project topic'); }
  }

  async function openProjectManageModal(project) {
    setActiveProject(project);
    try {
      const [mRes, meetRes] = await Promise.all([
        client.get(`/milestones/project/${project.id}`),
        client.get(`/milestones/meetings/project/${project.id}`),
      ]);
      setMilestones(mRes.data);
      setMeetings(meetRes.data);
    } catch (e) {}
  }

  async function handleAddMilestone(e) {
    e.preventDefault();
    if (!activeProject) return;
    try {
      await client.post('/milestones', { project_id: activeProject.id, ...newMilestone });
      setNewMilestone({ title: '', description: '', due_date: '' });
      const { data } = await client.get(`/milestones/project/${activeProject.id}`);
      setMilestones(data);
    } catch (e) { alert(e.response?.data?.message || 'Error creating milestone'); }
  }

  async function updateMilestoneStatus(id, newStatus) {
    try {
      await client.patch(`/milestones/${id}/status`, { status: newStatus });
      setMilestones((prev) => prev.map((m) => m.id === id ? { ...m, status: newStatus } : m));
    } catch (e) { alert('Failed to update status'); }
  }

  async function handleRejectTopic(e) {
    e.preventDefault();
    if (!rejectProject || !rejectReason) return;
    setRejecting(true);
    try {
      await client.post(`/projects/${rejectProject.id}/reject`, { reason: rejectReason });
      alert('Project topic rejected. Student has been notified to resubmit.');
      setRejectProject(null);
      setRejectReason('');
      loadSupervisorData();
    } catch (err) { alert(err.response?.data?.message || 'Failed to reject project topic'); }
    finally { setRejecting(false); }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading supervisor portal...</div>;

  const prof = userProfile?.supervisorProfile;
  const clearedCount = supervisees.filter((s) => s.clearance_status === 'cleared').length;

  return (
    <div>
      {/* ── Overview Card ── */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Supervisor Dashboard</h2>
          <span className="role-badge supervisor">Supervisor</span>
        </div>
        <div className="metrics-grid">
          <div className="metric-card">
            <span className="metric-label">Current Supervisee Load</span>
            <span className="metric-value">{supervisees.length} / {prof?.max_students || 5}</span>
            <span className="metric-desc">Available capacity: {(prof?.max_students || 5) - supervisees.length}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Declared Specializations</span>
            <span className="metric-value" style={{ fontSize: '1rem', fontWeight: 600 }}>
              {prof?.specializations || 'AI, Software Engineering'}
            </span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Defense Clearance</span>
            <span className="metric-value">{clearedCount} / {supervisees.length}</span>
            <span className="metric-desc">{clearedCount} student{clearedCount !== 1 ? 's' : ''} cleared for defense</span>
          </div>
          <div className="metric-card" style={{ borderLeft: '4px solid #b45309' }}>
            <span className="metric-label">Defense Panel Duties</span>
            <span className="metric-value" style={{ color: '#b45309' }}>{panelProjects.length}</span>
            <span className="metric-desc">
              {panelProjects.filter(p => !p.evaluated_at).length} pending evaluation
            </span>
          </div>
        </div>
      </div>

      {/* ── Defense Panel Notice Banner (if assigned) ── */}
      {panelProjects.length > 0 && (
        <div style={{
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: 'var(--radius-md)',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>⚖️</span>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#92400e', fontWeight: 600 }}>
                Defense Panel Assignments ({panelProjects.length} Active)
              </h4>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#b45309', marginTop: '0.15rem' }}>
                You are assigned to evaluate {panelProjects.length} defense project{panelProjects.length !== 1 ? 's' : ''} ({panelProjects.filter(p => !p.evaluated_at).length} pending grading).
              </p>
            </div>
          </div>
          <Link
            to="/panel"
            className="btn btn-primary btn-sm"
            style={{ background: '#b45309', borderColor: '#92400e', color: '#ffffff', textDecoration: 'none' }}
          >
            Open Defense Panel Workspace →
          </Link>
        </div>
      )}

      {/* ── Supervisees Table ── */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Assigned Supervisees &amp; Projects</h3>
        </div>

        {supervisees.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            No students currently assigned to your supervision portfolio.
          </p>
        ) : (
          <>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Project Title</th>
                    <th>Topic Area</th>
                    <th>Status</th>
                    <th>Clearance</th>
                    <th>Proposal</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {supervisees.map((p) => {
                    const ts = topicStyle(p.topic_area);
                    return (
                      <tr key={p.id}>
                        {/* Student */}
                        <td style={{ minWidth: '130px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.875rem', display: 'block' }}>{p.student_name}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.student_matric || p.student_email}</span>
                        </td>

                        {/* Project title */}
                        <td style={{ maxWidth: '260px' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.82rem', letterSpacing: '0.01em', color: 'var(--text-main)', lineHeight: 1.4, display: 'block' }}>
                            {p.title}
                          </span>
                        </td>

                        {/* Topic area badge */}
                        <td>
                          <span style={{
                            fontSize: '0.72rem', fontWeight: 700, padding: '0.18rem 0.55rem',
                            borderRadius: '999px', letterSpacing: '0.03em',
                            background: ts.bg, color: ts.color, border: `1px solid ${ts.border}`,
                            whiteSpace: 'nowrap',
                          }}>
                            {p.topic_area}
                          </span>
                        </td>

                        {/* Status badge */}
                        <td>
                          <span className={`status-badge ${p.status}`}>
                            {p.status.replace(/_/g, ' ')}
                          </span>
                        </td>

                        {/* Clearance status badge */}
                        <td>
                          <button
                            type="button"
                            onClick={() => setClearanceProject(p)}
                            className="btn btn-sm"
                            style={{
                              fontSize: '0.72rem',
                              padding: '0.18rem 0.55rem',
                              fontWeight: 600,
                              background: p.clearance_status === 'cleared' ? '#ecfdf5' : p.clearance_status === 'not_cleared' ? '#fef2f2' : '#fefce8',
                              color: p.clearance_status === 'cleared' ? '#065f46' : p.clearance_status === 'not_cleared' ? '#991b1b' : '#854d0e',
                              border: `1px solid ${p.clearance_status === 'cleared' ? '#a7f3d0' : p.clearance_status === 'not_cleared' ? '#fecaca' : '#fde047'}`,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                            title="Open Defense Clearance Form"
                          >
                            {p.clearance_status === 'cleared' ? '✅ Cleared' : p.clearance_status === 'not_cleared' ? '❌ Not Cleared' : '📝 Review Form'}
                          </button>
                        </td>

                        {/* Proposal & Abstract */}
                        <td>
                          <button
                            type="button"
                            onClick={() => openAbstractPreview(p, 'abstract')}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.25rem 0.6rem', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }}
                            title="Preview Abstract and Proposal"
                          >
                            <span>📝</span> Preview
                          </button>
                        </td>

                        {/* Actions */}
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', justifyContent: 'flex-end' }}>
                            {p.status === 'allocated' && (
                              <>
                                <button
                                  className="btn btn-success btn-sm"
                                  onClick={() => handleApproveTopic(p)}
                                  style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                >
                                  <span>✓</span> Approve
                                </button>
                                <button
                                  className="btn btn-sm"
                                  onClick={() => { setRejectProject(p); setRejectReason(''); }}
                                  style={{ border: '1.5px solid #fca5a5', color: 'var(--accent-red)', background: '#fff5f5', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                >
                                  <span>✕</span> Reject
                                </button>
                              </>
                            )}
                            <MoreMenu>
                              <MenuItem onClick={() => setClearanceProject(p)}>Clearance Form</MenuItem>
                              <MenuItem onClick={() => openProjectManageModal(p)}>Milestones</MenuItem>
                              <MenuItem onClick={() => openAbstractPreview(p, 'abstract')}>Preview Proposal</MenuItem>
                            </MoreMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Showing 1 to {supervisees.length} of {supervisees.length} {supervisees.length === 1 ? 'entry' : 'entries'}
            </div>
          </>
        )}
      </div>

      {/* ── Milestones & Meetings Modal ── */}
      {activeProject && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Supervision Workspace: {activeProject.title}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Student: {activeProject.student_name}</span>
              </div>
              <button className="close-btn" onClick={() => setActiveProject(null)}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
              {/* Left Column: Milestones */}
              <div>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--brand-primary)' }}>Project Milestones</h4>
                <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.5rem' }}>
                  {milestones.length === 0 ? <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No milestones created yet.</p> : (
                    milestones.map((m) => (
                      <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '0.35rem 0', borderBottom: '1px solid #f1f5f9' }}>
                        <div>
                          <strong>{m.title}</strong>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Due: {m.due_date ? new Date(m.due_date).toLocaleDateString() : 'N/A'}</div>
                        </div>
                        <select
                          className="form-control"
                          style={{ width: 'auto', padding: '0.15rem 0.4rem', fontSize: '0.75rem' }}
                          value={m.status}
                          onChange={(e) => updateMilestoneStatus(m.id, e.target.value)}
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddMilestone} style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>+ Add New Milestone</span>
                  <input className="form-control" style={{ marginBottom: '0.4rem', fontSize: '0.8rem' }} placeholder="Milestone title" value={newMilestone.title} onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })} required />
                  <input type="date" className="form-control" style={{ marginBottom: '0.4rem', fontSize: '0.8rem' }} value={newMilestone.due_date} onChange={(e) => setNewMilestone({ ...newMilestone, due_date: e.target.value })} />
                  <button type="submit" className="btn btn-primary btn-sm" style={{ width: '100%' }}>Create Milestone</button>
                </form>
              </div>

              {/* Right Column: Meetings */}
              <div>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--brand-primary)' }}>Logged Meetings ({meetings.length})</h4>
                <div style={{ maxHeight: '320px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.5rem' }}>
                  {meetings.length === 0 ? <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No meetings logged yet.</p> : (
                    meetings.map((meet) => (
                      <div key={meet.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-sm)', padding: '0.5rem', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                          <span>📅 {new Date(meet.meeting_date).toLocaleDateString()}</span>
                          <span>By: {meet.logged_by_name}</span>
                        </div>
                        <p style={{ fontSize: '0.8rem', margin: '0 0 0.2rem', color: 'var(--text-main)' }}>{meet.summary}</p>
                        {meet.next_steps && <p style={{ fontSize: '0.75rem', margin: 0, color: 'var(--brand-secondary)' }}><strong>Next steps:</strong> {meet.next_steps}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Rejection Modal ── */}
      {rejectProject && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Reject Project Topic &amp; Request Resubmission</h3>
              <button className="close-btn" onClick={() => setRejectProject(null)}>×</button>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              You are rejecting <strong>"{rejectProject.title}"</strong> submitted by <strong>{rejectProject.student_name}</strong>.
            </p>
            <form onSubmit={handleRejectTopic}>
              <div className="form-group">
                <label>Reason for Rejection &amp; Guidance for Resubmission</label>
                <textarea className="form-control" rows="4" placeholder="Explain why this topic is rejected and what the student should change..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setRejectProject(null)}>Cancel</button>
                <button type="submit" className="btn btn-danger" disabled={rejecting}>{rejecting ? 'Rejecting...' : 'Confirm Rejection'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Clearance Form Modal ── */}
      {clearanceProject && (
        <ClearanceFormModal
          projectId={clearanceProject.id}
          role="supervisor"
          onClose={() => {
            setClearanceProject(null);
            loadSupervisorData();
          }}
        />
      )}

      {/* ── Abstract & Document Preview Modal ── */}
      {previewProject && (
        <div className="modal-overlay" onClick={() => setPreviewProject(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: '960px', width: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ marginBottom: '1rem', paddingBottom: '0.75rem' }}>
              <div>
                <h3 className="modal-title" style={{ fontSize: '1.05rem', color: 'var(--brand-primary)', marginBottom: '0.2rem' }}>
                  {previewProject.title}
                </h3>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <span><strong>Student:</strong> {previewProject.student_name} ({previewProject.student_matric || 'N/A'})</span>
                  <span><strong>Topic:</strong> {previewProject.topic_area}</span>
                  <span><strong>Status:</strong> {previewProject.status.replace(/_/g, ' ')}</span>
                </div>
              </div>
              <button type="button" className="close-btn" onClick={() => setPreviewProject(null)}>✕</button>
            </div>

            {/* Navigation Tabs (if document file exists) */}
            {previewProject.proposal_file_path && (
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem', alignItems: 'center' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${previewTab === 'abstract' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setPreviewTab('abstract')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <span>📝</span> Abstract / Problem Statement
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${previewTab === 'document' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setPreviewTab('document')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <span>📄</span> Uploaded Document
                </button>
                {getFileUrl(previewProject.proposal_file_path) && (
                  <a
                    href={getFileUrl(previewProject.proposal_file_path)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ marginLeft: 'auto', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <span>↗</span> Open File
                  </a>
                )}
              </div>
            )}

            {/* Modal Body: Abstract vs. Document File */}
            {previewTab === 'abstract' || !previewProject.proposal_file_path ? (
              <div style={{ overflowY: 'auto', padding: '0.25rem 0' }}>
                <div style={{ background: 'var(--bg-subtle)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>📌</span> Research Abstract &amp; Problem Statement
                  </h4>
                  {previewProject.abstract ? (
                    <p style={{ fontSize: '0.92rem', color: 'var(--text-main)', lineHeight: 1.8, whiteSpace: 'pre-wrap', textAlign: 'justify', margin: 0 }}>
                      {previewProject.abstract}
                    </p>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>
                      No abstract or problem statement was provided for this project proposal.
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Research Area</span>
                    <strong style={{ fontSize: '0.875rem', color: 'var(--brand-primary)' }}>{previewProject.topic_area}</strong>
                  </div>
                  <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Submission Status</span>
                    <strong style={{ fontSize: '0.875rem', color: 'var(--brand-primary)', textTransform: 'capitalize' }}>
                      {previewProject.status.replace(/_/g, ' ')}
                    </strong>
                  </div>
                  <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Document Attached</span>
                    <strong style={{ fontSize: '0.875rem', color: previewProject.proposal_file_path ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                      {previewProject.proposal_file_path ? 'Yes (PDF / Docx)' : 'None'}
                    </strong>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, minHeight: '450px', background: '#f8fafc', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
                <DocumentViewer
                  fileUrl={getFileUrl(previewProject.proposal_file_path)}
                  title={`Proposal - ${previewProject.title}`}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
