-- =====================================================================
-- APSES: Proposal Defense Clearance Form Migration
-- Run this against the apses database after schema.sql
-- =====================================================================

USE apses;

-- Add programme and level to users (optional student fields)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS programme VARCHAR(100) DEFAULT 'B.Sc Computer Science',
  ADD COLUMN IF NOT EXISTS level     VARCHAR(20)  DEFAULT '400 Level';

-- Clearance form table (one per project)
CREATE TABLE IF NOT EXISTS clearance_forms (
  id                        INT AUTO_INCREMENT PRIMARY KEY,
  project_id                INT NOT NULL UNIQUE,

  -- Supervisor's Assessment Criteria (NULL = not yet answered, 1 = Yes, 0 = No)
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

  -- Recommendation
  recommendation            ENUM('cleared', 'not_cleared') DEFAULT NULL,
  comments                  TEXT DEFAULT NULL,

  -- Status & audit
  status                    ENUM('pending', 'submitted') NOT NULL DEFAULT 'pending',
  submitted_at              DATETIME DEFAULT NULL,
  submitted_by              INT DEFAULT NULL,

  created_at                DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at                DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (project_id)  REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL
);
