import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../../api/client';
import DocumentViewer from '../../components/DocumentViewer';
import { useAuth } from '../../context/AuthContext';

const TOPIC_COLOURS = {
  AI:                    { bg: '#fef9c3', color: '#854d0e', border: '#fde047' },
  Networks:              { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
  Databases:             { bg: '#dcfce7', color: '#166534', border: '#86efac' },
  'Software Engineering':{ bg: '#f3e8ff', color: '#6b21a8', border: '#d8b4fe' },
  Cybersecurity:         { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
};
const topicStyle = (a) => TOPIC_COLOURS[a] || { bg: '#f1f5f9', color: '#334155', border: '#cbd5e1' };

const BACKEND_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
const getFileUrl = (filePath) => (filePath ? `${BACKEND_BASE}/${filePath.replace(/^\//, '')}` : null);

export default function PanelDashboard() {
  const { user } = useAuth();
  const [allProjects,      setAllProjects]      = useState([]);
  const [rubrics,          setRubrics]          = useState([]);
  const [selectedProjectId,setSelectedProjectId]= useState('');
  const [selectedRubricId, setSelectedRubricId] = useState('');
  const [rubricData,       setRubricData]       = useState(null);
  const [scores,           setScores]           = useState({});
  const [comments,         setComments]         = useState({});
  const [loading,          setLoading]          = useState(true);
  const [submitting,       setSubmitting]        = useState(false);
  const [message,          setMessage]          = useState('');
  const [error,            setError]            = useState('');
  const [showDocPreview,   setShowDocPreview]   = useState(false);
  const [previewProject,   setPreviewProject]   = useState(null);
  const [previewTab,       setPreviewTab]       = useState('abstract'); // 'abstract' | 'document'
  const [activeTab,        setActiveTab]        = useState('pending'); // 'pending' | 'completed'

  useEffect(() => { loadPanelData(); }, []);

  async function loadPanelData() {
    setLoading(true);
    try {
      const [projRes, rubRes] = await Promise.all([
        client.get('/projects/panel-assigned'),
        client.get('/evaluations/rubrics'),
      ]);
      const assigned = projRes.data || [];
      setAllProjects(assigned);
      setRubrics(rubRes.data || []);

      const pending = assigned.filter((p) => !p.evaluated_at);
      if (pending.length > 0) {
        setSelectedProjectId(pending[0].id.toString());
      } else {
        setSelectedProjectId('');
      }

      if (rubRes.data?.length > 0) {
        setSelectedRubricId(rubRes.data[0].id.toString());
        loadRubric(rubRes.data[0].id);
      }
    } catch (e) { console.error(e); setError('Failed to load assigned panel projects'); }
    finally { setLoading(false); }
  }

  async function loadRubric(rid) {
    if (!rid) return;
    setSelectedRubricId(rid.toString());
    try {
      const { data } = await client.get(`/evaluations/rubric/${rid}`);
      setRubricData(data);
      const init = {};
      data.criteria.forEach((c) => (init[c.id] = c.max_score));
      setScores(init);
    } catch (e) { setRubricData(null); }
  }

  function openPreview(project, tab = 'abstract') {
    setPreviewProject(project);
    setPreviewTab(tab);
    setShowDocPreview(true);
  }

  async function submitEvaluation(e) {
    e.preventDefault();
    setMessage(''); setError('');
    if (!selectedProjectId || !selectedRubricId || !rubricData) {
      setError('Please select an assigned project and evaluation rubric first.'); return;
    }
    setSubmitting(true);
    const payload = {
      project_id: Number(selectedProjectId),
      rubric_id:  Number(selectedRubricId),
      scores: Object.entries(scores).map(([criterion_id, score]) => ({
        criterion_id: Number(criterion_id), score: Number(score), comment: comments[criterion_id] || '',
      })),
    };
    try {
      await client.post('/evaluations', payload);
      setMessage('Panel evaluation submitted successfully! Project removed from your pending queue.');
      setScores({});
      setComments({});
      await loadPanelData();
    } catch (err) { setError(err.response?.data?.message || 'Failed to submit evaluation.'); }
    finally { setSubmitting(false); }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading panel dashboard...</div>;

  const pendingProjects = allProjects.filter((p) => !p.evaluated_at);
  const completedProjects = allProjects.filter((p) => !!p.evaluated_at);
  const currentProject = pendingProjects.find((p) => p.id.toString() === selectedProjectId.toString());

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      {/* ── Header card ── */}
      <div className="card">
        {user?.role === 'supervisor' && (
          <div style={{ marginBottom: '0.85rem' }}>
            <Link
              to="/supervisor"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.82rem',
                color: 'var(--brand-primary)',
                textDecoration: 'none',
                fontWeight: 600
              }}
            >
              ← Back to My Supervisees
            </Link>
          </div>
        )}
        <div className="card-header" style={{ marginBottom: '1rem' }}>
          <div>
            <h2 className="card-title">Panel Defense Evaluation</h2>
            <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.2rem' }}>
              {user?.role === 'supervisor' && (
                <span className="role-badge supervisor">Supervisor</span>
              )}
              <span className="role-badge panel">Defense Panel Member</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {allProjects.length} total assigned · {pendingProjects.length} pending · {completedProjects.length} completed
            </span>
          </div>
        </div>

        {/* ── Navigation Tabs: Pending vs Completed ── */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem' }}>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('pending')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <span>⏳</span> Pending Evaluation ({pendingProjects.length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'completed' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('completed')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <span>✅</span> Completed Evaluations ({completedProjects.length})
          </button>
        </div>

        {message && <div className="alert alert-success">{message}</div>}
        {error   && <div className="alert alert-error">{error}</div>}

        {activeTab === 'pending' ? (
          /* ── Pending Evaluations Tab ── */
          pendingProjects.length === 0 ? (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px dashed #e2e8f0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                {allProjects.length === 0 ? '📋' : '🎉'}
              </div>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--brand-primary)', marginBottom: '0.4rem' }}>
                {allProjects.length === 0 ? 'No Defense Projects Assigned Yet' : 'All Assigned Projects Evaluated!'}
              </h3>
              <p style={{ fontSize: '0.85rem', maxWidth: '450px', margin: '0 auto', lineHeight: 1.6 }}>
                {allProjects.length === 0
                  ? 'The department administrator has not assigned any approved project defense presentations to your panel portfolio.'
                  : 'You have evaluated all assigned defense presentations. Check the "Completed Evaluations" tab to review your submitted assessments.'}
              </p>
            </div>
          ) : (
            <>
              {/* ── Selectors ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Assigned Project for Defense ({pendingProjects.length} remaining)</label>
                  <select className="form-control" value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}>
                    {pendingProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        #{p.id} — {p.student_name} ({p.topic_area}){p.proposal_file_path ? ' [📄 Doc Attached]' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Select Evaluation Rubric</label>
                  <select className="form-control" value={selectedRubricId} onChange={(e) => loadRubric(e.target.value)}>
                    {rubrics.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>

              {/* ── Selected Project Info Card ── */}
              {currentProject && (() => {
                const ts = topicStyle(currentProject.topic_area);

                return (
                  <div style={{ background: 'var(--bg-subtle)', padding: '1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: '1rem', color: 'var(--brand-primary)', marginBottom: '0.4rem', lineHeight: 1.4 }}>{currentProject.title}</h4>
                        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          <span><strong style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Student</strong><br />{currentProject.student_name}</span>
                          <span><strong style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Matric No.</strong><br />{currentProject.student_matric || '—'}</span>
                          <span><strong style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Supervisor</strong><br />{currentProject.supervisor_name || 'Unassigned'}</span>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.65rem', borderRadius: '999px', background: ts.bg, color: ts.color, border: `1px solid ${ts.border}`, whiteSpace: 'nowrap', alignSelf: 'flex-start' }}>
                        {currentProject.topic_area}
                      </span>
                    </div>

                    {/* Abstract / Problem Statement preview box */}
                    <div style={{ background: '#ffffff', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <strong style={{ color: 'var(--brand-primary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Abstract / Problem Statement
                        </strong>
                        <button
                          type="button"
                          onClick={() => openPreview(currentProject, 'abstract')}
                          style={{ background: 'transparent', border: 'none', color: 'var(--accent-blue)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                        >
                          🔍 Expand Abstract
                        </button>
                      </div>
                      <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                        {currentProject.abstract
                          ? (currentProject.abstract.length > 220 ? `${currentProject.abstract.slice(0, 220)}...` : currentProject.abstract)
                          : 'No abstract provided by student.'}
                      </p>
                    </div>

                    {/* Action button */}
                    <div>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => openPreview(currentProject, 'abstract')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <span>📋</span> Preview Abstract &amp; Proposal
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* ── Rubric Scoring Form ── */}
              {rubricData && (
                <form onSubmit={submitEvaluation}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '0.95rem', color: 'var(--brand-primary)', fontWeight: 700 }}>Rubric Criteria Scoring</h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{rubricData.criteria.length} criteria</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    {rubricData.criteria.map((c, idx) => (
                      <div key={c.id} style={{ background: idx % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-subtle)', padding: '0.9rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <strong style={{ fontSize: '0.875rem', color: 'var(--brand-primary)' }}>{c.criterion_name}</strong>
                          <span style={{ fontSize: '0.72rem', background: '#e0f2fe', color: '#0369a1', padding: '0.12rem 0.45rem', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>
                            Weight: {c.weight_percent}% · Max {c.max_score}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.65rem', alignItems: 'center' }}>
                          <div>
                            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Score</label>
                            <input
                              type="number" min="0" max={c.max_score}
                              className="form-control"
                              placeholder={`0–${c.max_score}`}
                              value={scores[c.id] ?? ''}
                              onChange={(e) => setScores({ ...scores, [c.id]: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Remarks</label>
                            <input
                              className="form-control"
                              placeholder="Assessor feedback (optional)"
                              value={comments[c.id] ?? ''}
                              onChange={(e) => setComments({ ...comments, [c.id]: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.65rem' }} disabled={submitting}>
                    {submitting ? 'Submitting Evaluation...' : '✓ Submit Panel Evaluation'}
                  </button>
                </form>
              )}
            </>
          )
        ) : (
          /* ── Completed Evaluations Tab ── */
          completedProjects.length === 0 ? (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)', background: '#f8fafc', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
              <h3 style={{ fontSize: '1rem', color: 'var(--brand-primary)', marginBottom: '0.3rem' }}>No Completed Evaluations Yet</h3>
              <p style={{ fontSize: '0.85rem' }}>Evaluations you submit will be archived here for your records.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Project Title</th>
                    <th>Topic Area</th>
                    <th>Status</th>
                    <th>Evaluated On</th>
                    <th style={{ textAlign: 'right' }}>Proposal</th>
                  </tr>
                </thead>
                <tbody>
                  {completedProjects.map((p) => {
                    const ts = topicStyle(p.topic_area);
                    return (
                      <tr key={p.id}>
                        <td>
                          <strong style={{ fontSize: '0.85rem', display: 'block' }}>{p.student_name}</strong>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.student_matric || p.student_email}</span>
                        </td>
                        <td style={{ maxWidth: '280px' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>{p.title}</span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '999px', background: ts.bg, color: ts.color, border: `1px solid ${ts.border}` }}>
                            {p.topic_area}
                          </span>
                        </td>
                        <td>
                          <span className="status-badge completed" style={{ fontSize: '0.72rem' }}>
                            ✓ Evaluated
                          </span>
                        </td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {p.evaluated_at ? new Date(p.evaluated_at).toLocaleDateString() : 'Submitted'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => openPreview(p, 'abstract')}
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                          >
                            📝 Preview
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* ── Abstract & Document Preview Modal ── */}
      {showDocPreview && previewProject && (
        <div className="modal-overlay" onClick={() => setShowDocPreview(false)}>
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
                  <span><strong>Supervisor:</strong> {previewProject.supervisor_name || 'Unassigned'}</span>
                  <span><strong>Topic:</strong> {previewProject.topic_area}</span>
                </div>
              </div>
              <button type="button" className="close-btn" onClick={() => setShowDocPreview(false)}>✕</button>
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
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Supervisor</span>
                    <strong style={{ fontSize: '0.875rem', color: 'var(--brand-primary)' }}>{previewProject.supervisor_name || 'Unassigned'}</strong>
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

