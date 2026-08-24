import { useEffect, useState } from 'react';
import client from '../../api/client';
import ClearanceFormModal from '../../components/ClearanceFormModal';

const BACKEND_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
const getFileUrl = (filePath) => (filePath ? `${BACKEND_BASE}/${filePath.replace(/^\//, '')}` : null);

export default function StudentDashboard() {
  const [project, setProject] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [finalResult, setFinalResult] = useState(null);

  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', topic_area: 'AI', abstract: '' });
  const [proposalFile, setProposalFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  // Clearance form
  const [showClearance, setShowClearance] = useState(false);

  // Meeting log modal
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingForm, setMeetingForm] = useState({ meeting_date: new Date().toISOString().split('T')[0], summary: '', next_steps: '' });
  const [meetingFile, setMeetingFile] = useState(null);

  useEffect(() => {
    loadStudentData();
  }, []);

  async function loadStudentData() {
    setLoading(true);
    try {
      const { data } = await client.get('/projects/mine');
      setProject(data);
      if (data && data.id) {
        loadProjectDetails(data.id);
        if (data.status === 'rejected') {
          setForm({ title: data.title || '', topic_area: data.topic_area || 'AI', abstract: data.abstract || '' });
        }
      }
    } catch (err) {
      setProject(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadProjectDetails(projectId) {
    try {
      const [mRes, meetRes, resRes] = await Promise.allSettled([
        client.get(`/milestones/project/${projectId}`),
        client.get(`/milestones/meetings/project/${projectId}`),
        client.get(`/evaluations/project/${projectId}/result`)
      ]);

      if (mRes.status === 'fulfilled') setMilestones(mRes.value.data);
      if (meetRes.status === 'fulfilled') setMeetings(meetRes.value.data);
      if (resRes.status === 'fulfilled') setFinalResult(resRes.value.data);
    } catch (e) {}
  }

  async function submitProject(e) {
    e.preventDefault();
    setSubmitting(true);
    setMsg('');

    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('topic_area', form.topic_area);
      formData.append('abstract', form.abstract);
      if (proposalFile) {
        formData.append('proposal_file', proposalFile);
      }

      await client.post('/projects', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setMsg('Project proposal submitted successfully!');
      loadStudentData();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to submit project');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitMeetingLog(e) {
    e.preventDefault();
    if (!project) return;

    try {
      const formData = new FormData();
      formData.append('project_id', project.id);
      formData.append('meeting_date', meetingForm.meeting_date);
      formData.append('summary', meetingForm.summary);
      formData.append('next_steps', meetingForm.next_steps);
      if (meetingFile) {
        formData.append('attachment', meetingFile);
      }

      await client.post('/milestones/meetings', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setShowMeetingModal(false);
      setMeetingForm({ meeting_date: new Date().toISOString().split('T')[0], summary: '', next_steps: '' });
      setMeetingFile(null);
      loadProjectDetails(project.id);
    } catch (e) {
      alert('Error logging meeting: ' + (e.response?.data?.message || e.message));
    }
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading student portal...</div>;
  }

  if (!project || project.status === 'rejected') {
    return (
      <div style={{ maxWidth: '750px', margin: '0 auto' }}>
        {project && project.status === 'rejected' && (
          <div className="alert alert-error" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.3rem', color: '#991b1b' }}>Topic Submission Rejected</h3>
            <p style={{ fontSize: '0.875rem' }}>
              Your previous project topic was rejected by your supervisor/faculty.
            </p>
            <div style={{ marginTop: '0.5rem', background: '#ffffff', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid #fecaca' }}>
              <strong>Reason for Rejection:</strong> {project.rejection_reason || 'Please refine topic scope and resubmit.'}
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              {project && project.status === 'rejected' ? 'Resubmit Revised Project Topic' : 'Submit Final Year Project Proposal'}
            </h2>
          </div>
          {msg && <div className={`alert ${msg.includes('success') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}

          <form onSubmit={submitProject}>
            <div className="form-group">
              <label>Project Title</label>
              <input
                className="form-control"
                placeholder="e.g. Automated Project Supervision and Evaluation System"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Topic / Research Area</label>
              <select
                className="form-control"
                value={form.topic_area}
                onChange={(e) => setForm({ ...form, topic_area: e.target.value })}
              >
                <option value="AI">AI & Machine Learning</option>
                <option value="Networks">Computer Networks & Security</option>
                <option value="Databases">Databases & Information Systems</option>
                <option value="Software Engineering">Software Engineering & Web</option>
                <option value="Cybersecurity">Cybersecurity & Cryptography</option>
              </select>
            </div>

            <div className="form-group">
              <label>Abstract / Problem Statement</label>
              <textarea
                className="form-control"
                rows="4"
                placeholder="Describe your research objective, methodology, and expected outcomes..."
                value={form.abstract}
                onChange={(e) => setForm({ ...form, abstract: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Upload Proposal Document (PDF / DOCX)</label>
              <input
                type="file"
                className="form-control"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setProposalFile(e.target.files[0])}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Submitting Proposal...' : (project && project.status === 'rejected' ? 'Resubmit Revised Topic' : 'Submit Project Proposal')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Overview Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <span className={`status-badge ${project.status}`} style={{ marginBottom: '0.5rem' }}>
              {project.status.replace('_', ' ')}
            </span>
            <h2 className="card-title" style={{ fontSize: '1.35rem' }}>{project.title}</h2>
          </div>
          {finalResult && finalResult.is_published && (
            <div style={{ textAlign: 'center' }}>
              <div className="grade-box">{finalResult.grade}</div>
              <small style={{ color: 'var(--text-muted)' }}>Score: {finalResult.final_score}%</small>
            </div>
          )}
        </div>

        <div className="metrics-grid" style={{ marginBottom: '1rem' }}>
          <div className="metric-card">
            <span className="metric-label">Topic Area</span>
            <span className="metric-value" style={{ fontSize: '1.2rem' }}>{project.topic_area}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Supervisor</span>
            <span className="metric-value" style={{ fontSize: '1.2rem' }}>
              {project.supervisor_name || 'Pending Allocation'}
            </span>
            <span className="metric-desc">{project.supervisor_email || 'Waiting for admin allocation'}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Milestones Progress</span>
            <span className="metric-value" style={{ fontSize: '1.2rem' }}>
              {milestones.filter(m => m.status === 'completed').length} / {milestones.length}
            </span>
          </div>
        </div>

        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.75, textAlign: 'justify', marginTop: '0.25rem' }}>
          <strong>Abstract:</strong>{' '}{project.abstract || 'No abstract provided.'}
        </div>
        {project.proposal_file_path && (
          <div style={{ marginTop: '1rem' }}>
            <a
              href={getFileUrl(project.proposal_file_path)}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary btn-sm"
            >
              Download Proposal Document
            </a>
          </div>
        )}

        {/* Clearance Status Banner + Button */}
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.85rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-muted)', marginRight: '0.4rem' }}>Proposal Clearance:</span>
            <span style={{
              fontWeight: 700,
              color: project.clearance_status === 'cleared' ? 'var(--accent-green)'
                   : project.clearance_status === 'not_cleared' ? 'var(--accent-red)'
                   : 'var(--accent-amber)'
            }}>
              {project.clearance_status === 'cleared'     ? '✅ Cleared for Defense'
               : project.clearance_status === 'not_cleared' ? '❌ Not Cleared'
               : '⏳ Awaiting Supervisor Review'}
            </span>
          </div>
          <button
            id="view-clearance-btn"
            className="btn btn-sm"
            style={{ background: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe' }}
            onClick={() => setShowClearance(true)}
          >
            View Clearance Form
          </button>
        </div>
      </div>

      {/* Grid for Milestones and Meeting Logs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Milestones */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Project Milestones</h3>
          </div>
          {milestones.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No milestones assigned by supervisor yet.
            </p>
          ) : (
            <div className="timeline">
              {milestones.map(m => (
                <div key={m.id} className="timeline-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--brand-primary)' }}>{m.title}</strong>
                    <span className={`status-badge ${m.status}`}>{m.status}</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.2rem 0' }}>
                    {m.description}
                  </p>
                  <small style={{ color: 'var(--text-muted)' }}>
                    Due Date: {new Date(m.due_date).toLocaleDateString()}
                  </small>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Meeting Logs */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Consultation Meetings</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowMeetingModal(true)}>
              + Log Meeting
            </button>
          </div>

          {meetings.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No meeting logs recorded yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {meetings.map(m => (
                <div key={m.id} style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--brand-primary)' }}>Logged by: {m.logged_by_name}</strong>
                    <small style={{ color: 'var(--text-muted)' }}>{new Date(m.meeting_date).toLocaleDateString()}</small>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{m.summary}</p>
                  {m.next_steps && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', marginTop: '0.3rem' }}>
                      <strong>Next steps:</strong> {m.next_steps}
                    </p>
                  )}
                  {m.attachment_path && (
                    <a
                      href={`http://localhost:5000/${m.attachment_path}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', textDecoration: 'none', display: 'inline-block', marginTop: '0.4rem' }}
                    >
                      View Attachment
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Log Meeting Modal */}
      {showMeetingModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Log Supervisor Consultation Meeting</h3>
              <button className="close-btn" onClick={() => setShowMeetingModal(false)}>×</button>
            </div>

            <form onSubmit={submitMeetingLog}>
              <div className="form-group">
                <label>Meeting Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={meetingForm.meeting_date}
                  onChange={(e) => setMeetingForm({ ...meetingForm, meeting_date: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Discussion Summary</label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="Key topics discussed, supervisor feedback..."
                  value={meetingForm.summary}
                  onChange={(e) => setMeetingForm({ ...meetingForm, summary: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Action Items / Next Steps</label>
                <input
                  className="form-control"
                  placeholder="Tasks to complete before next meeting..."
                  value={meetingForm.next_steps}
                  onChange={(e) => setMeetingForm({ ...meetingForm, next_steps: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Attachment (Optional file/notes)</label>
                <input
                  type="file"
                  className="form-control"
                  onChange={(e) => setMeetingFile(e.target.files[0])}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowMeetingModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Meeting Log</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Clearance Form Modal */}
      {showClearance && (
        <ClearanceFormModal
          projectId={project.id}
          role="student"
          onClose={() => {
            setShowClearance(false);
            loadStudentData();
          }}
        />
      )}
    </div>
  );
}
