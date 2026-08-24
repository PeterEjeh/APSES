require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST,
    port:     process.env.DB_PORT || 3306,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  try {
    console.log('Connected to:', process.env.DB_NAME);

    // 1. Add programme & level columns to users (silently ignore if already exist)
    try {
      await conn.query(`ALTER TABLE users ADD COLUMN programme VARCHAR(100) DEFAULT 'B.Sc Computer Science'`);
      console.log('✅ Added users.programme');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('ℹ️  users.programme already exists');
      else throw e;
    }

    try {
      await conn.query(`ALTER TABLE users ADD COLUMN level VARCHAR(20) DEFAULT '400 Level'`);
      console.log('✅ Added users.level');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('ℹ️  users.level already exists');
      else throw e;
    }

    // 2. Create clearance_forms table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS clearance_forms (
        id                        INT AUTO_INCREMENT PRIMARY KEY,
        project_id                INT NOT NULL UNIQUE,
        title_approved            TINYINT(1) DEFAULT NULL,
        template_followed         TINYINT(1) DEFAULT NULL,
        intro_satisfactory        TINYINT(1) DEFAULT NULL,
        background_adequate       TINYINT(1) DEFAULT NULL,
        problem_statement_clear   TINYINT(1) DEFAULT NULL,
        motivation_appropriate    TINYINT(1) DEFAULT NULL,
        objectives_clear          TINYINT(1) DEFAULT NULL,
        scope_defined             TINYINT(1) DEFAULT NULL,
        methodology_sound         TINYINT(1) DEFAULT NULL,
        literature_adequate       TINYINT(1) DEFAULT NULL,
        references_correct        TINYINT(1) DEFAULT NULL,
        formatting_satisfactory   TINYINT(1) DEFAULT NULL,
        suitable_for_defense      TINYINT(1) DEFAULT NULL,
        recommendation            ENUM('cleared','not_cleared') DEFAULT NULL,
        comments                  TEXT DEFAULT NULL,
        status                    ENUM('pending','submitted') NOT NULL DEFAULT 'pending',
        submitted_at              DATETIME DEFAULT NULL,
        submitted_by              INT DEFAULT NULL,
        created_at                DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at                DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id)  REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ clearance_forms table ready');

    console.log('\n🎉 Migration complete!');
  } finally {
    await conn.end();
  }
}

migrate().catch((e) => { console.error('Migration failed:', e.message); process.exit(1); });
