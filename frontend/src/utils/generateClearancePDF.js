import jsPDF from 'jspdf';

const CRITERIA_LABELS = [
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

export function generateClearancePDF(form, fields) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageW  = doc.internal.pageSize.getWidth();
  const margin = 20;
  const usable = pageW - margin * 2;
  let y = 20;

  // ── Helpers ────────────────────────────────────────────────────────────────
  const center = (text, yPos, size = 11, style = 'normal') => {
    doc.setFontSize(size);
    doc.setFont('helvetica', style);
    doc.text(text, pageW / 2, yPos, { align: 'center' });
  };

  const field = (label, value, x, yPos, labelW = 35) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(label + ':', x, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value || '—'), x + labelW, yPos);
    doc.setDrawColor(180);
    doc.line(x + labelW, yPos + 0.8, x + labelW + (usable / 2 - labelW - 4), yPos + 0.8);
  };

  const sectionTitle = (text, yPos) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 41, 66); // brand navy
    doc.text(text, margin, yPos);
    doc.setTextColor(0);
    doc.setDrawColor(15, 41, 66);
    doc.line(margin, yPos + 1.5, margin + usable, yPos + 1.5);
    doc.setDrawColor(180);
  };

  // ── HEADER ─────────────────────────────────────────────────────────────────
  doc.setDrawColor(15, 41, 66);
  doc.setLineWidth(0.8);
  doc.rect(margin - 3, y - 8, usable + 6, 32);
  doc.setLineWidth(0.2);

  center('ABUBAKAR TAFAWA BALEWA UNIVERSITY, BAUCHI', y, 11, 'bold');
  center('FACULTY OF COMPUTING', y + 5.5, 10, 'bold');
  center('DEPARTMENT OF COMPUTER SCIENCE', y + 10.5, 9, 'normal');
  center('FINAL YEAR PROJECT PROPOSAL DEFENSE CLEARANCE FORM', y + 17, 10, 'bold');

  y += 30;

  // ── SECTION A: Student Info ────────────────────────────────────────────────
  y += 4;
  sectionTitle('SECTION A — STUDENT INFORMATION', y);
  y += 7;

  const half = usable / 2;
  field('Student Name',  form?.student_name   || '—',                     margin,          y, 32);
  field('Matric No.',    form?.student_matric  || '—',                     margin + half + 4, y, 22);
  y += 7;
  field('Programme',     form?.programme       || 'B.Sc Computer Science', margin,          y, 32);
  field('Level',         form?.level           || '400 Level',             margin + half + 4, y, 22);
  y += 7;
  field('Supervisor',    form?.supervisor_name || '—',                     margin,          y, 32);
  y += 7;

  // Project title (may be long)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Project Title:', margin, y);
  doc.setFont('helvetica', 'normal');
  const titleLines = doc.splitTextToSize(form?.project_title || '—', usable - 36);
  doc.text(titleLines, margin + 32, y);
  y += titleLines.length * 5 + 3;

  // ── SECTION B: Assessment Criteria ────────────────────────────────────────
  sectionTitle("SECTION B — SUPERVISOR'S ASSESSMENT CRITERIA", y);
  y += 7;

  // Table header
  const colCrit  = margin;
  const colYes   = margin + usable - 30;
  const colNo    = margin + usable - 12;
  const rowH     = 6.5;

  doc.setFillColor(241, 245, 249);
  doc.rect(colCrit, y - 4.5, usable, rowH, 'F');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Criterion', colCrit + 1, y);
  doc.text('Yes', colYes, y, { align: 'center' });
  doc.text('No',  colNo,  y, { align: 'center' });
  doc.setFont('helvetica', 'normal');

  y += 2;

  CRITERIA_LABELS.forEach((c, i) => {
    y += rowH;
    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(colCrit, y - 4.5, usable, rowH, 'F');
    }
    doc.setFontSize(9);
    doc.text(c.label, colCrit + 1, y);

    const val = fields[c.key];
    // Yes checkbox
    doc.setDrawColor(120);
    doc.rect(colYes - 2.5, y - 3.5, 5, 5);
    if (val === 1) { doc.setFont('helvetica', 'bold'); doc.text('✓', colYes - 1.5, y); doc.setFont('helvetica', 'normal'); }
    // No checkbox
    doc.rect(colNo - 2.5, y - 3.5, 5, 5);
    if (val === 0) { doc.setFont('helvetica', 'bold'); doc.text('✓', colNo - 1.5, y); doc.setFont('helvetica', 'normal'); }
    doc.setDrawColor(180);
  });

  y += 8;

  // ── SECTION C: Recommendation ─────────────────────────────────────────────
  sectionTitle('SECTION C — RECOMMENDATION', y);
  y += 8;

  const cleared    = fields.recommendation === 'cleared';
  const notCleared = fields.recommendation === 'not_cleared';

  doc.setDrawColor(120);
  doc.setFontSize(9);

  doc.rect(margin, y - 3.5, 5, 5);
  if (cleared) { doc.setFont('helvetica', 'bold'); doc.text('✓', margin + 0.5, y); doc.setFont('helvetica', 'normal'); }
  doc.text('Cleared for Proposal Defense', margin + 7, y);

  doc.rect(margin + 80, y - 3.5, 5, 5);
  if (notCleared) { doc.setFont('helvetica', 'bold'); doc.text('✓', margin + 80.5, y); doc.setFont('helvetica', 'normal'); }
  doc.text('Not Cleared', margin + 87, y);

  y += 10;

  // ── SECTION D: Comments ───────────────────────────────────────────────────
  sectionTitle('SECTION D — COMMENTS', y);
  y += 7;

  const commentText = fields.comments || '(No comments provided)';
  const commentLines = doc.splitTextToSize(commentText, usable);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(commentLines, margin, y);
  doc.setDrawColor(180);
  doc.line(margin, y + 6, margin + usable, y + 6);
  doc.line(margin, y + 12, margin + usable, y + 12);
  y += 18;

  // ── SECTION E: Certification ──────────────────────────────────────────────
  sectionTitle('SECTION E — CERTIFICATION', y);
  y += 9;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Supervisor:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(form?.submitted_by_name || form?.supervisor_name || '—', margin + 25, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Date:', margin + half + 4, y);
  doc.setFont('helvetica', 'normal');
  const dateStr = form?.submitted_at
    ? new Date(form.submitted_at).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';
  doc.text(dateStr, margin + half + 18, y);

  y += 12;

  doc.setFont('helvetica', 'bold');
  doc.text('Signature:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setDrawColor(60);
  doc.line(margin + 25, y + 0.5, margin + 100, y + 0.5);

  // ── Footer ─────────────────────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(7.5);
  doc.setTextColor(150);
  doc.text('APSES — Abubakar Tafawa Balewa University, Bauchi · Department of Computer Science', pageW / 2, pageH - 8, { align: 'center' });
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageW / 2, pageH - 4, { align: 'center' });

  // ── Save ──────────────────────────────────────────────────────────────────
  const studentName = (form?.student_name || 'student').replace(/\s+/g, '_');
  const matric      = (form?.student_matric || '').replace(/\//g, '-');
  doc.save(`Clearance_Form_${studentName}_${matric}.pdf`);
}
