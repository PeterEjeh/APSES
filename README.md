# APSES — Automated Project Supervision and Evaluation System

Final year project (B.Tech Computer Science, ATBU Bauchi) — *Automated Project
Supervision and Evaluation System (A Case Study of Faculty of Computing)*.

A three-tier web app: React front end, Node.js/Express REST API, MySQL database.
Implements the four core modules from the proposal:

1. **Auth & role-based access** — JWT, four roles (student, supervisor, panel, admin).
2. **Supervisor allocation engine** — matches project topic area to supervisor
   specialization + remaining capacity, logs every candidate considered for auditability.
3. **Milestone & meeting-log tracking** — supervisors set milestones, either party logs
   consultation meetings.
4. **Rubric-based, multi-assessor evaluation & aggregation engine** — supervisor + panel
   (+ optional external) each score against a weighted rubric; scores are combined into
   one final, auditable result.

## Repository layout

```
apses/
├── backend/           Node.js/Express REST API
│   ├── database/
│   │   ├── schema.sql     MySQL schema (run this first)
│   │   └── seed.js        demo data: 1 admin, 1 supervisor, 1 student, 1 rubric
│   └── src/
│       ├── config/db.js       MySQL connection pool
│       ├── models/            raw-SQL data access layer
│       ├── services/          allocationService.js, evaluationService.js (the two engines)
│       ├── controllers/       request handlers
│       ├── middleware/        JWT auth, role guard, error handler
│       ├── routes/            /api/auth, /api/projects, /api/milestones, /api/evaluations
│       ├── app.js / server.js
├── frontend/          React app (Create React App layout)
│   └── src/
│       ├── api/client.js      axios instance with JWT interceptor
│       ├── context/AuthContext.jsx
│       ├── routes/ProtectedRoute.jsx
│       └── pages/{student,supervisor,panel,admin}/  one dashboard per role
└── docs/              SRS / architecture documentation (see docs/ folder)
```

## Local setup

### 1. Database
```bash
mysql -u root -p < backend/database/schema.sql
```

### 2. Backend
```bash
cd backend
cp .env.example .env      # fill in DB credentials + a real JWT_SECRET
npm install
npm run seed               # optional demo data
npm run dev                 # http://localhost:5000
```

### 3. Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm start                   # http://localhost:3000
```

## API surface (v1)

| Method | Route | Role | Purpose |
|---|---|---|---|
| POST | /api/auth/register | any | create account |
| POST | /api/auth/login | any | get JWT |
| POST | /api/projects | student | submit project topic/proposal |
| GET | /api/projects/mine | student | view own project + status |
| GET | /api/projects/supervisees | supervisor | list assigned students |
| GET | /api/projects/pending | admin | projects awaiting allocation |
| GET | /api/projects/:id/allocation-preview | admin | ranked supervisor candidates |
| POST | /api/projects/:id/allocate | admin | commit auto-allocation |
| POST | /api/milestones | supervisor/admin | set a milestone |
| GET | /api/milestones/project/:id | any assigned | list milestones |
| PATCH | /api/milestones/:id/status | any assigned | update milestone status |
| POST | /api/milestones/meetings | any assigned | log a consultation meeting |
| GET | /api/milestones/meetings/project/:id | any assigned | meeting history |
| GET | /api/evaluations/rubric/:id | any | get rubric criteria + weights |
| POST | /api/evaluations | supervisor/panel/admin | submit a rubric score |
| POST | /api/evaluations/project/:pid/rubric/:rid/aggregate | admin/panel | compute final weighted score |

## What's scaffolded vs. what's left for you to build

**Done (working code):** DB schema, JWT auth, role guard, project submission,
supervisor-allocation engine + audit log, milestone/meeting CRUD, rubric evaluation
submission, weighted aggregation engine, React auth flow + one dashboard per role.

**Left as follow-up work (see sprint plan in docs/):** file upload for proposals/attachments
(multer), email/SMTP notification dispatch, a scheduled job for overdue-milestone checks,
password reset flow, pagination/search on admin lists, and UI styling/polish. These are
called out as their own sprint tasks so they're not a surprise at defense time.
