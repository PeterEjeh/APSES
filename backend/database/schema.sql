-- =====================================================================
-- Automated Project Supervision and Evaluation System (APSES)
-- Faculty of Computing, Abubakar Tafawa Balewa University, Bauchi
-- MySQL 8.0 schema
-- =====================================================================

CREATE DATABASE IF NOT EXISTS apses CHARACTER SET utf8mb4;
USE apses;

-- ---------------------------------------------------------------------
-- 1. USERS & ROLES (role-based access control)
-- ---------------------------------------------------------------------
CREATE TABLE roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name ENUM('student','supervisor','panel','admin') NOT NULL UNIQUE
);

INSERT INTO roles (name) VALUES ('student'),('supervisor'),('panel'),('admin');

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role_id INT NOT NULL,
  matric_or_staff_no VARCHAR(50) UNIQUE,
  department VARCHAR(100) DEFAULT 'Computer Science',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- Supervisor-specific attributes (specialization + capacity for allocation)
CREATE TABLE supervisor_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  specializations VARCHAR(500) NOT NULL COMMENT 'comma-separated tags, e.g. AI,Networks,Databases',
  max_students INT NOT NULL DEFAULT 5,
  current_load INT NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 2. PROJECTS & ALLOCATION
-- ---------------------------------------------------------------------
CREATE TABLE projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL UNIQUE COMMENT 'one active project per student',
  title VARCHAR(300) NOT NULL,
  topic_area VARCHAR(150) NOT NULL COMMENT 'used for supervisor matching, e.g. AI, Networks',
  abstract TEXT,
  proposal_file_path VARCHAR(255),
  status ENUM('submitted','pending_allocation','allocated','in_progress','completed','rejected')
    DEFAULT 'submitted',
  supervisor_id INT NULL,
  rejection_reason TEXT NULL,
  allocated_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (supervisor_id) REFERENCES users(id)
);

-- Panel members assigned to a project (many-to-many)
CREATE TABLE project_panel (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  panel_member_id INT NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_panel_per_project (project_id, panel_member_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (panel_member_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Audit trail of the allocation engine's decisions (for the accuracy metric in the proposal)
CREATE TABLE allocation_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  candidate_supervisor_id INT NOT NULL,
  match_score DECIMAL(5,2) NOT NULL,
  was_selected BOOLEAN DEFAULT FALSE,
  reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (candidate_supervisor_id) REFERENCES users(id)
);

-- ---------------------------------------------------------------------
-- 3. MILESTONES & MEETING LOGS
-- ---------------------------------------------------------------------
CREATE TABLE milestones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  due_date DATE,
  status ENUM('pending','in_progress','completed','overdue') DEFAULT 'pending',
  completed_at TIMESTAMP NULL,
  created_by INT NOT NULL COMMENT 'supervisor or admin who set the milestone',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE meeting_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  logged_by INT NOT NULL,
  meeting_date DATE NOT NULL,
  summary TEXT NOT NULL,
  next_steps TEXT,
  attachment_path VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (logged_by) REFERENCES users(id)
);

-- ---------------------------------------------------------------------
-- 4. RUBRIC-BASED, MULTI-ASSESSOR EVALUATION
-- ---------------------------------------------------------------------
CREATE TABLE rubrics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL COMMENT 'e.g. Final Defense Rubric, Supervisor Progress Rubric',
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE rubric_criteria (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rubric_id INT NOT NULL,
  criterion_name VARCHAR(200) NOT NULL COMMENT 'e.g. Presentation, Methodology, Originality',
  max_score DECIMAL(5,2) NOT NULL DEFAULT 100,
  weight_percent DECIMAL(5,2) NOT NULL COMMENT 'weight of this criterion within the rubric, sums to 100',
  FOREIGN KEY (rubric_id) REFERENCES rubrics(id) ON DELETE CASCADE
);

-- Which assessor role contributes what overall weight to a project's final score
CREATE TABLE assessor_weights (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rubric_id INT NOT NULL,
  assessor_role ENUM('supervisor','panel','external') NOT NULL,
  weight_percent DECIMAL(5,2) NOT NULL COMMENT 'e.g. supervisor 40, panel 60',
  FOREIGN KEY (rubric_id) REFERENCES rubrics(id) ON DELETE CASCADE
);

CREATE TABLE evaluations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  rubric_id INT NOT NULL,
  assessor_id INT NOT NULL,
  assessor_role ENUM('supervisor','panel','external') NOT NULL,
  status ENUM('draft','submitted') DEFAULT 'draft',
  submitted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY one_evaluation_per_assessor (project_id, rubric_id, assessor_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (rubric_id) REFERENCES rubrics(id),
  FOREIGN KEY (assessor_id) REFERENCES users(id)
);

CREATE TABLE evaluation_scores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  evaluation_id INT NOT NULL,
  criterion_id INT NOT NULL,
  score DECIMAL(5,2) NOT NULL,
  comment TEXT,
  FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE CASCADE,
  FOREIGN KEY (criterion_id) REFERENCES rubric_criteria(id)
);

-- Final, aggregated result per project (computed by the evaluation-aggregation engine)
CREATE TABLE final_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL UNIQUE,
  final_score DECIMAL(5,2) NOT NULL,
  grade VARCHAR(5),
  computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_published BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 5. NOTIFICATIONS
-- ---------------------------------------------------------------------
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- Indexes for common lookups
-- ---------------------------------------------------------------------
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_supervisor ON projects(supervisor_id);
CREATE INDEX idx_milestones_project ON milestones(project_id);
CREATE INDEX idx_evaluations_project ON evaluations(project_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);
