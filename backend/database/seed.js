// Quick manual seed for local dev/demo (not a migration tool).
// Run: node database/seed.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../src/config/db');

async function seed() {
  const password_hash = await bcrypt.hash('Password123!', 10);

  const [adminRes] = await db.query(
    `INSERT INTO users (full_name, email, password_hash, role_id) VALUES (?, ?, ?, 4)`,
    ['System Admin', 'admin@atbu.edu.ng', password_hash]
  );

  const [supRes] = await db.query(
    `INSERT INTO users (full_name, email, password_hash, role_id, matric_or_staff_no) VALUES (?, ?, ?, 2, ?)`,
    ['Dr. Ismail Zahradeen Yakubu', 'iyakubu@atbu.edu.ng', password_hash, 'STAFF001']
  );
  await db.query(
    `INSERT INTO supervisor_profiles (user_id, specializations, max_students) VALUES (?, ?, ?)`,
    [supRes.insertId, 'AI,Machine Learning,Networks', 5]
  );

  const [studentRes] = await db.query(
    `INSERT INTO users (full_name, email, password_hash, role_id, matric_or_staff_no) VALUES (?, ?, ?, 1, ?)`,
    ['Mariya Isa', 'misa@atbu.edu.ng', password_hash, '20/55777U/1']
  );

  const [panelRes] = await db.query(
    `INSERT INTO users (full_name, email, password_hash, role_id, matric_or_staff_no) VALUES (?, ?, ?, 3, ?)`,
    ['Dr. Fatima Aliyu', 'panel@atbu.edu.ng', password_hash, 'STAFF002']
  );
  await db.query(
    `INSERT INTO supervisor_profiles (user_id, specializations, max_students) VALUES (?, ?, ?)`,
    [panelRes.insertId, 'Cybersecurity,Networks,Databases', 5]
  );

  const [rubricRes] = await db.query(
    `INSERT INTO rubrics (name, created_by) VALUES (?, ?)`,
    ['Final Defense Rubric', adminRes.insertId]
  );
  await db.query(
    `INSERT INTO rubric_criteria (rubric_id, criterion_name, max_score, weight_percent) VALUES ?`,
    [[
      [rubricRes.insertId, 'Presentation', 100, 20],
      [rubricRes.insertId, 'Methodology', 100, 30],
      [rubricRes.insertId, 'Originality', 100, 25],
      [rubricRes.insertId, 'Documentation Quality', 100, 25]
    ]]
  );
  await db.query(
    `INSERT INTO assessor_weights (rubric_id, assessor_role, weight_percent) VALUES ?`,
    [[
      [rubricRes.insertId, 'supervisor', 40],
      [rubricRes.insertId, 'panel', 60]
    ]]
  );

  console.log('Seed complete.');
  console.log(`admin: admin@atbu.edu.ng / Password123!`);
  console.log(`supervisor: iyakubu@atbu.edu.ng / Password123!`);
  console.log(`panel: panel@atbu.edu.ng / Password123!`);
  console.log(`student: misa@atbu.edu.ng / Password123!`);
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
