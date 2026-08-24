# APSES — Setup Guide for New Setup / Collaborators

This guide explains how to install prerequisites, setup the MySQL database, install dependencies, and run the **Automated Project Supervision and Evaluation System (APSES)** on any machine.

---

## 1. Prerequisites to Install

Before running the project, install the following software on your computer:

1. **Node.js (v18.x or v20.x)**:
   - Download link: [https://nodejs.org](https://nodejs.org)
   - *Verifies `node` and `npm` CLI tools in terminal.*

2. **XAMPP (or MySQL Server 8.0)**:
   - Download link: [https://www.apachefriends.org](https://www.apachefriends.org)
   - *Provides MySQL database server on port 3306 and phpMyAdmin.*

---

## 2. Environment Configuration

### A. Backend Configuration
Create a file named `.env` inside the `backend/` directory (`backend/.env`):
```env
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=apses

JWT_SECRET=apses_dev_jwt_secret_atbu_2026
JWT_EXPIRES_IN=8h

SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

### B. Frontend Configuration
Create a file named `.env` inside the `frontend/` directory (`frontend/.env`):
```env
REACT_APP_API_URL=http://localhost:5000/api
```

---

## 3. Installation Steps

Open your terminal / command prompt in the root project folder:

### Step 1: Install Dependencies
```bash
# Install backend packages
cd backend
npm install

# Install frontend packages
cd ../frontend
npm install
```

### Step 2: Initialize Database
1. Open **XAMPP Control Panel** and click **Start** next to **MySQL**.
2. Open terminal in the main project folder (`APSES/`) and run:

**PowerShell / Command Prompt (Windows)**:
```powershell
Get-Content backend\database\schema.sql | C:\xampp\mysql\bin\mysql.exe -u root
```
*(Or if `mysql` is added to system PATH: `mysql -u root < backend/database/schema.sql`)*

3. Seed initial demo users & evaluation rubrics:
```bash
cd backend
node database/seed.js
```

---

## 4. Running the Application

Open two separate terminal windows:

### Terminal 1: Start Backend REST API
```bash
cd backend
npm run dev
```
*(Runs on `http://localhost:5000`)*

### Terminal 2: Start Frontend Web App
```bash
cd frontend
npm start
```
*(Runs on `http://localhost:3000`)*

---

## 5. Demo Accounts for Testing

| Role | Email | Password |
|---|---|---|
| 👑 **Administrator** | `admin@atbu.edu.ng` | `Password123!` |
| 👨‍🏫 **Supervisor** | `iyakubu@atbu.edu.ng` | `Password123!` |
| 🎓 **Student** | `misa@atbu.edu.ng` | `Password123!` |
| ⚖️ **Panel Member** | `panel@atbu.edu.ng` | `Password123!` |
