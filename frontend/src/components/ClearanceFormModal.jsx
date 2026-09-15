import { useEffect, useState } from 'react';
import { getClearanceForm, saveClearanceForm } from '../api/clearance';
import { generateClearancePDF } from '../utils/generateClearancePDF';

// ─── Constants ────────────────────────────────────────────────────────────────

const CRITERIA = [
  { key: 'title_approved',          label: 'Title approved' },
  { key: 'template_followed',       label: 'Template followed' },
  { key: 'intro_satisfactory',      label: 'Introduction satisfactory' },
  { key: 'background_adequate',     label: 'Background adequate' },
  { key: 'problem_statement_clear', label: 'Problem statement clear' },
  { key: 'motivation_appropriate',  label: 'Motivation appropriate' },
  { key: 'objectives_clear',        label: 'Objectives clear' },
  { key: 'scope_defined',           label: 'Scope defined' },
  { key: 'methodology_sound',       label: 'Methodology sound' },
  { key: 'literature_adequate',     label: 'Literature adequate' },
  { key: 'references_correct',      label: 'References correct' },
  { key: 'formatting_satisfactory', label: 'Formatting satisfactory' },
  { key: 'suitable_for_defense',    label: 'Suitable for defense' },
];

const EMPTY_FORM = Object.fromEntries(CRITERIA.map((c) => [c.key, null]));

// ─── Status Banner ─────────────────────────────────────────────────────────────

function StatusBanner({ form }) {
  if (!form || form.status !== 'submitted') return null;
  const cleared = form.recommendation === 'cleared';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.6rem',
      padding: '0.75rem 1rem',
      borderRadius: 'var(--radius-md)',
      marginBottom: '1.25rem',
      fontWeight: 600, fontSize: '0.9rem',
      background: cleared ? '#ecfdf5' : '#fef2f2',
      color:      cleared ? '#065f46' : '#991b1b',
      border: `1px solid ${cleared ? '#a7f3d0' : '#fecaca'}`,
    }}>
      <span style={{ fontSize: '1.2rem' }}>{cleared ? '✅' : '❌'}</span>
      {cleared
        ? 'Cleared for Proposal Defense'
        : 'Not Cleared — Review supervisor comments below'}
    </div>
  );
}

// ─── Main Modal ────────────────────────────────────────────────────────────────

/**
 * ClearanceFormModal
 *
 * Props:
 *   projectId  – the project to load the form for
 *   role       – 'supervisor' | 'student' | 'admin'
 *   onClose    – callback to close the modal
 */
export default function ClearanceFormModal({ projectId, role, onClose }) {
  const [form, setForm]       = useState(null);
  const [fields, setFields]   = useState({ ...EMPTY_FORM, recommendation: null, comments: '' });
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [msg, setMsg]         = useState('');
  const [msgType, setMsgType] = useState('success'); // 'success' | 'error'

  const isSupervisor = role === 'supervisor';
  const isSubmitted  = form?.status === 'submitted';
  const isReadOnly   = !isSupervisor || isSubmitted;

  // ── Load form on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getClearanceForm(projectId);
        if (cancelled) return;
        setForm(data);
        if (data) {
          setFields({
            title_approved:          data.title_approved,
            template_followed:       data.template_followed,
            intro_satisfactory:      data.intro_satisfactory,
            background_adequate:     data.background_adequate,
            problem_statement_clear: data.problem_statement_clear,
            motivation_appropriate:  data.motivation_appropriate,
            objectives_clear:        data.objectives_clear,
            scope_defined:           data.scope_defined,
            methodology_sound:       data.methodology_sound,
            literature_adequate:     data.literature_adequate,
            references_correct:      data.references_correct,
            formatting_satisfactory: data.formatting_satisfactory,
            suitable_for_defense:    data.suitable_for_defense,
            recommendation:          data.recommendation,
            comments:                data.comments || '',
          });
        }
      } catch (e) {
        if (!cancelled) setMsg('Could not load clearance form.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  // ── Helpers
  function setCriterion(key, value) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(isSubmitting) {
    setSaving(true);
    setMsg('');
    try {
      await saveClearanceForm(projectId, { ...fields, isSubmitting });
      const newStatus = isSubmitting ? 'submitted' : 'pending';
      setMsg(isSubmitting ? 'Form submitted successfully!' : 'Draft saved.');
      setMsgType('success');
      // Update local form state so UI reflects submission
      setForm((prev) => ({ ...prev, status: newStatus, recommendation: fields.recommendation }));
      if (isSubmitting) {
        setTimeout(onClose, 1800);
      }
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to save form');
      setMsgType('error');
    } finally {
      setSaving(false);
    }
  }

  // ── Render helpers
  function CriterionRow({ criterion }) {
    const val = fields[criterion.key];
    return (
      <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
        <td style={{ padding: '0.6rem 0.5rem', fontSize: '0.85rem', color: 'var(--text-main)' }}>
          {criterion.label}
        </td>
        {/* Yes */}
        <td style={{ textAlign: 'center', padding: '0.6rem' }}>
          {isReadOnly ? (
            <span style={{ fontSize: '1rem' }}>{val === 1 ? '✅' : ''}</span>
          ) : (
            <input
              type="radio"
              name={criterion.key}
              id={`${criterion.key}_yes`}
              checked={val === 1}
              onChange={() => setCriterion(criterion.key, 1)}
              style={{ accentColor: 'var(--accent-green)', width: '16px', height: '16px', cursor: 'pointer' }}
            />
          )}
        </td>
        {/* No */}
        <td style={{ textAlign: 'center', padding: '0.6rem' }}>
          {isReadOnly ? (
            <span style={{ fontSize: '1rem' }}>{val === 0 ? '❌' : ''}</span>
          ) : (
            <input
              type="radio"
              name={criterion.key}
              id={`${criterion.key}_no`}
              checked={val === 0}
              onChange={() => setCriterion(criterion.key, 0)}
              style={{ accentColor: 'var(--accent-red)', width: '16px', height: '16px', cursor: 'pointer' }}
            />
          )}
        </td>
      </tr>
    );
  }

  // ── Main render
  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content" style={{ maxWidth: '680px', padding: '0' }}>

        {/* ── Header ── */}
        <div style={{
          background: 'var(--brand-primary)', color: '#fff',
          padding: '1.25rem 1.5rem',
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.7rem', fontWeight: 600, opacity: 0.75, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                Abubakar Tafawa Balewa University, Bauchi<br />
                Faculty of Computing · Department of Computer Science
              </p>
              <h2 style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
                Final Year Project Proposal Defense Clearance Form
              </h2>
            </div>
            <button
              className="close-btn"
              onClick={onClose}
              style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.5rem', marginLeft: '1rem' }}
            >×</button>
          </div>

          {/* Status chip */}
          {form && (
            <div style={{ marginTop: '0.75rem' }}>
              <span style={{
                display: 'inline-block',
                fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em',
                textTransform: 'uppercase', padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                background: isSubmitted ? (form.recommendation === 'cleared' ? '#a7f3d0' : '#fecaca')
                                        : 'rgba(255,255,255,0.2)',
                color: isSubmitted ? (form.recommendation === 'cleared' ? '#065f46' : '#991b1b') : '#fff',
              }}>
                {isSubmitted
                  ? (form.recommendation === 'cleared' ? '✅ Cleared for Defense' : '❌ Not Cleared')
                  : '⏳ Pending Supervisor Review'}
              </span>
            </div>
          )}
        </div>

        <div style={{ padding: '1.5rem', overflowY: 'auto', maxHeight: '75vh' }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
              Loading form...
            </p>
          ) : (
            <>
              {msg && (
                <div className={`alert alert-${msgType === 'success' ? 'success' : 'error'}`}>
                  {msg}
                </div>
              )}

              <StatusBanner form={form} />

              {/* ── Section A: Student Info ── */}
              <div style={{
                background: 'var(--bg-subtle)', border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', marginBottom: '1.5rem'
              }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  Section A — Student Information
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1.5rem' }}>
                  {[
                    ['Student Name',  form?.student_name    || '—'],
                    ['Matric No.',     form?.student_matric  || '—'],
                    ['Programme',      form?.programme       || 'B.Sc Computer Science'],
                    ['Level',          form?.level           || '500 Level'],
                    ['Department',     form?.department      || 'Computer Science'],
                    ['Supervisor',     form?.supervisor_name || '—'],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {label}
                      </span>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-main)', fontWeight: 500 }}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '0.75rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Project Title
                  </span>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-main)', fontWeight: 500 }}>
                    {form?.project_title || '—'}
                  </span>
                </div>
              </div>

              {/* ── Section B: Supervisor's Assessment ── */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  Section B — Supervisor's Assessment
                  {isSupervisor && !isSubmitted && (
                    <span style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--accent-blue)', marginLeft: '0.5rem', textTransform: 'none', letterSpacing: 0 }}>
                      (select Yes or No for each criterion)
                    </span>
                  )}
                </h4>

                <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-subtle)' }}>
                        <th style={{ textAlign: 'left', padding: '0.6rem 0.5rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                          Criterion
                        </th>
                        <th style={{ textAlign: 'center', padding: '0.6rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--accent-green)', width: '70px' }}>Yes</th>
                        <th style={{ textAlign: 'center', padding: '0.6rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--accent-red)',   width: '70px' }}>No</th>
                      </tr>
                    </thead>
                    <tbody>
                      {CRITERIA.map((c) => (
                        <CriterionRow key={c.key} criterion={c} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── Section C: Recommendation ── */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  Section C — Recommendation
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {[
                    { value: 'cleared',     label: 'Cleared for Proposal Defense', color: 'var(--accent-green)' },
                    { value: 'not_cleared', label: 'Not Cleared',                  color: 'var(--accent-red)'   },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      htmlFor={`rec_${opt.value}`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.65rem',
                        padding: '0.65rem 0.85rem',
                        border: `1.5px solid ${fields.recommendation === opt.value ? opt.color : 'var(--border-color)'}`,
                        borderRadius: 'var(--radius-md)',
                        background: fields.recommendation === opt.value
                          ? (opt.value === 'cleared' ? '#f0fdf4' : '#fef2f2')
                          : 'var(--bg-surface)',
                        cursor: isReadOnly ? 'default' : 'pointer',
                        transition: 'all 0.12s',
                      }}
                    >
                      <input
                        type="radio"
                        id={`rec_${opt.value}`}
                        name="recommendation"
                        value={opt.value}
                        checked={fields.recommendation === opt.value}
                        onChange={() => !isReadOnly && setFields((p) => ({ ...p, recommendation: opt.value }))}
                        disabled={isReadOnly}
                        style={{ accentColor: opt.color, width: '16px', height: '16px' }}
                      />
                      <span style={{ fontWeight: 600, fontSize: '0.875rem', color: fields.recommendation === opt.value ? opt.color : 'var(--text-main)' }}>
                        {opt.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* ── Section D: Comments ── */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  Section D — Comments
                </h4>
                {isReadOnly ? (
                  <div style={{ padding: '0.75rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.875rem', color: 'var(--text-secondary)', minHeight: '60px' }}>
                    {fields.comments || <em style={{ color: 'var(--text-muted)' }}>No comments provided.</em>}
                  </div>
                ) : (
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Optional — any additional guidance or feedback for the student..."
                    value={fields.comments}
                    onChange={(e) => setFields((p) => ({ ...p, comments: e.target.value }))}
                  />
                )}
              </div>

              {/* ── Certification block (once submitted) ── */}
              {isSubmitted && (
                <div style={{
                  background: 'var(--bg-subtle)', border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', marginBottom: '1.25rem'
                }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    Certification
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Supervisor</span>
                      <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{form?.submitted_by_name || form?.supervisor_name}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Date Submitted</span>
                      <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                        {form?.submitted_at ? new Date(form.submitted_at).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Action Buttons (supervisor only, before submission) ── */}
              {isSupervisor && !isSubmitted && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={saving}
                    onClick={() => handleSave(false)}
                  >
                    {saving ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={saving || !fields.recommendation}
                    onClick={() => handleSave(true)}
                    title={!fields.recommendation ? 'Please select a recommendation before submitting' : ''}
                  >
                    {saving ? 'Submitting...' : 'Submit Clearance Form'}
                  </button>
                </div>
              )}

              {/* Download PDF button — shown to BOTH roles once submitted */}
              {isSubmitted && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={onClose}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => generateClearancePDF(form, fields)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    ⬇ Download PDF
                  </button>
                </div>
              )}

              {/* Student close button — only when not yet submitted */}
              {!isSupervisor && !isSubmitted && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" onClick={onClose}>Close</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
