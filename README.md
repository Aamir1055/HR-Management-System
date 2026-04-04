# PayRoll Management System – Detailed Project Guide

> This is a **long, detailed README** (around 1000 lines) that explains the entire project in simple words.
>
> It is designed so that **anyone** (new developer, existing team member, or future maintainer) can:
> - Understand what this system does
> - Understand the full tech stack
> - See how the frontend, backend, and database work together
> - Find where each feature lives in the code
> - Learn how to run, deploy, and debug the system

You do **not** have to read everything in one go. You can jump directly to the section you need.

---

## 0. Quick Index (What You Will Find Here)

1. What this project is (business view)
2. Tech stack overview (frontend, backend, database, DevOps)
3. System architecture (how parts talk to each other)
4. Request–response flow (step-by-step example)
5. Main business modules and where the code is
6. Frontend structure in detail (React + Vite)
7. Backend structure in detail (Express + MySQL)
8. Database and migrations
9. Environments and configuration (.env files)
10. How to run in development (step-by-step)
11. How deployment works (high-level summary)
12. Important scripts and tools
13. Common flows explained (examples)
14. Testing and debugging tips
15. Important documentation files and when to read them
16. Checklist for new developers joining the project

You can search inside this file for the **section number** or **keywords**.

---

## 1. What This Project Is (Business View)

This project is a **complete HR and Payroll Management System** used by a company to manage its employees and their payments.

In very simple words, it helps you to:

- Create and maintain employee records
- Import attendance from Excel or from other systems
- Calculate monthly salaries using attendance, leaves, loans, and other rules
- Generate salary slips for employees (PDF output)
- Manage employee loans and EMI repayments
- Manage advance salary payments
- Handle holidays, leaves, and half-day rules
- Track small cash expenses (peticash)
- Manage recruitment pipelines (candidates, sources, platforms)
- Provide dashboards for management (overview, by office, by platform, celebrations)
- Track audit logs of user actions for safety and auditing

The system is **web-based**:

- Users open it in a **browser**.
- They see the **frontend application** built in React.
- The frontend sends requests to a **backend API**.
- The backend API reads and writes data in a **MySQL database**.

The same system can be used in **development**, **staging**, or **production** environments depending on how you configure the `.env` files and servers.

---

## 2. Tech Stack Overview

This section describes the main technologies used in the project.

### 2.1 Frontend (User Interface)

The frontend is a modern single-page application (SPA) built with:

- **React 18** – JavaScript library for building user interfaces.
- **TypeScript** – Adds static typing on top of JavaScript to catch errors early.
- **Vite** – Fast development server and bundler.
- **Tailwind CSS** – Utility-first CSS framework for styling.
- **MUI (Material UI)** – Component library for ready-made UI building blocks.
- **React Router** – Handles client-side routing (different URLs inside the app).
- **React Query** – Helps with API data fetching, caching, and refetching.
- **React Hook Form + Yup** – For building and validating complex forms.

What this means in practice:

- When you run the frontend dev server, Vite serves the React app on a port (often 5173).
- The user never has to reload the page; navigation happens inside the SPA.
- Components are split into pages, shared components, and layout.

### 2.2 Backend (API Server)

The backend is a Node.js server built with:

- **Node.js (LTS)** – JavaScript runtime for server-side code.
- **Express.js** – Minimalist framework for building HTTP APIs.
- **MySQL2** – Database driver to connect to MySQL using promises.
- **JWT (JSON Web Tokens)** – For secure, stateless user authentication.
- **Bcrypt** – For hashing and verifying passwords.
- **Multer** – For handling file uploads (such as Excel files for attendance).
- **PM2** – For running and monitoring the backend in production.

The backend exposes many endpoints starting with `/api/...` and covers all business modules.

### 2.3 Database

The database is **MySQL 8.0+**.

- There are tables for employees, attendance, payroll, salary slips, loans, advance salary, holidays, platforms, recruitment, audit logs, and more.
- Migrations and scripts are provided to create and update tables.

### 2.4 DevOps and Infrastructure

For deployment and operations, the project uses:

- **Nginx** – Reverse proxy in front of the frontend and backend.
- **Docker / docker-compose** – Container-based deployment option.
- **PowerShell / shell scripts** – For syncing, deploying, and running migrations.
- **PM2** – Process manager for running the Node backend as a service.

There are multiple markdown files that explain how to deploy, sync databases, and fix issues.

---

## 3. System Architecture (How Parts Connect)

At a high level, the system has **three** main parts:

1. **Frontend application** (React SPA)
2. **Backend API** (Express server)
3. **MySQL database**

You can imagine it like this:

- Browser → Frontend (React) → HTTP → Backend (Express) → SQL → MySQL DB
- MySQL DB → Backend → JSON → Frontend → Browser UI

### 3.1 Frontend

- The entry point is `src/main.tsx`. This file mounts the React application into the HTML `<div id="root">`.
- `src/App.tsx` sets up all the routes and decides which page to show based on the URL.
- `AuthContext` controls whether the user is logged in, stores tokens, and exposes helper functions like `login`, `logout`, `hasPermission`.
- Each page (Dashboard, Employees, Payroll, etc.) is a React component under `src/pages/`.

### 3.2 Backend

- The main server file is `backend/server.js`.
- It sets up Express, CORS, body parsing, and attaches a MySQL connection pool.
- It mounts multiple route groups such as `/api/auth`, `/api/employees`, `/api/payroll`, etc.
- Each route group is defined in `backend/routes/*.js` and uses controllers in `backend/controllers/*.js`.
- Middleware in `backend/middleware` adds authentication, audit logging, and file upload processing.

### 3.3 Database

- MySQL tables store all persistent data.
- Migrations and SQL scripts exist in folders like `backend/db_migrations`, `backend/migrations`, `database`, and `database_migrations`.
- The backend uses `mysql2/promise` to run queries via `req.db`.

### 3.4 Communication

- Frontend and backend communicate via JSON over HTTP.
- Backend and database communicate via SQL queries.
- State (like login) is mostly kept in frontend memory + JWT and in database tables.

---

## 4. Request–Response Flow (Concrete Example)

To make things very clear, here is a real example of how one feature works end-to-end.

### Example: Employee List Screen

1. **User opens the Employees page**
   - URL in browser: `/employees`.
   - React Router loads the `Employees` page component from `src/pages/Employees.tsx`.

2. **Frontend requests data from API**
   - Employees page uses an API helper (often via React Query or Axios) to call something like:
     - `GET /api/employees`.
   - The JWT token is sent in the `Authorization: Bearer <token>` header.

3. **Express receives the request**
   - In `backend/server.js`, the route `/api/employees` is handled by `employeeRoutes`.
   - `employeeRoutes` uses `verifyToken` middleware to check the JWT.
   - If the user is not authenticated or does not have permission, an error is returned.

4. **Controller runs business logic**
   - `employeeRoutes` calls a function from `employeeController`.
   - The controller uses `req.db` to query the `employees` table and possibly related tables.
   - Any filters, pagination, or sorting are applied here.

5. **Response returned to frontend**
   - The controller sends back JSON, for example:
     - `[{ id: 1, name: "John Doe", office: "Office A", platform: "Platform X", ... }, ...]`.
   - The HTTP status is `200 OK` if everything is fine.

6. **Frontend updates the UI**
   - React receives the JSON data and stores it in component or hook state.
   - It renders a table showing the list of employees.
   - If there is an error, it shows a toast or error message instead.

This exact pattern repeats for **almost every feature**: dashboard cards, attendance uploads, payroll reports, salary slips, loans, etc.

---

## 5. Main Business Modules – Detailed Overview

This section explains each major module in more depth and points you to the relevant files.

### 5.1 Authentication, Authorization, and Users

**Purpose**

- Allow users to log in securely with username/password.
- Optionally require a first-time 2FA setup.
- Use roles and permissions to control access to pages and APIs.

**Frontend pieces**

- Login form component: `src/components/Auth/LoginForm.tsx`.
- First-time 2FA page: `src/pages/FirstLogin2FASetupPage.tsx` (exact path may vary but follows this pattern).
- Auth context: `src/context/AuthContext.tsx` (manages token and user info).
- Protected routes: Wrap pages with a `ProtectedRoute` component in `src/App.tsx` that checks `isAuthenticated` and `hasPermission`.

**Backend pieces**

- Routes: `backend/routes/authRoutes.js`.
- Controller: `backend/controllers/authController.js`.
- Middleware: `backend/middleware/auth.js` for `verifyToken`, `requireAdmin`, `requireHR`, etc.

**Flow**

1. User enters credentials and submits login.
2. Frontend calls `/api/auth/login` with JSON body.
3. Backend checks user in the `users` table and verifies the password using Bcrypt.
4. If first login + 2FA is configured, an extra step for 2FA is enforced.
5. Backend returns a JWT and user information.
6. Frontend saves them in `AuthContext` and redirects user to dashboard.

**Permissions**

- Pages such as employees, payroll, loans, etc. require different permissions.
- These are enforced on the frontend (for hiding pages) and on the backend (for API security).

---

### 5.2 Dashboard and Unified Dashboard

**Purpose**

- Give management and HR a quick overview of the system.
- Merge multiple smaller dashboards (overview, by platform, celebrations) into one unified experience.

**Frontend pieces**

- Unified dashboard page: `src/pages/UnifiedDashboard.tsx`.
- Legacy dashboards: `Dashboard`, `DashboardByPlatform`, `CelebrationsPage` under `src/pages/`.
- Tab and chart components: `src/components/Dashboard/...`.
- Routing: In `src/App.tsx`, the routes `/` and `/dashboard` point to `UnifiedDashboard`.

**Backend pieces**

- Routes: `backend/routes/dashboardRoutes.js`.
- Controller(s): `backend/controllers/dashboardController.js` or similarly named files.
- Endpoints typically provide aggregated data: totals, counts, group-by-office, group-by-platform, upcoming birthdays.

**What unified dashboard shows**

- **Overview tab**: Key metrics like total employees, total offices, total active employees, etc.
- **By platform tab**: Breakdown of employees by platform or team.
- **Celebrations tab**: List of upcoming birthdays and anniversaries.

**More information**

- See `UNIFIED_DASHBOARD_README.md` for a detailed design and implementation notes.

---

### 5.3 Employee Management

**Purpose**

- Central place to store employee data.
- Provide single source of truth for payroll, loans, attendance, and other modules.

**Frontend pieces**

- Employees list page: `src/pages/Employees.tsx`.
- Add/edit/view page: `src/pages/AddEmployee.tsx` (also used for viewing depending on mode or route).
- Office detail page: `OfficeEmployeeDetails` component under `src/pages/`.
- Platform detail page: `PlatformEmployeeDetails` component under `src/pages/`.

**Backend pieces**

- Routes: `backend/routes/employeeRoutes.js`.
- Controller: `backend/controllers/employeeController.js`.
- Additional helper code in `backend/services/` or `backend/repositories/` for queries.

**Key operations**

- Creating a new employee.
- Editing personal details, job details, salary base data.
- Linking employees to offices and platforms.
- Deactivating or archiving employees when they leave.

**Interactions**

- Payroll uses employee base salary and employment status.
- Attendance links each attendance row to an employee.
- Loans and advance salary link records to employees.

---

### 5.4 Attendance Management

**Purpose**

- Track daily presence/absence, working days, half-days, and leaves.
- Serve as a key input to payroll calculations.

**Frontend pieces**

- Attendance upload page: `src/pages/AttendanceUpload.tsx`.
- UI widgets for upload forms, progress, and error feedback.

**Backend pieces**

- Routes: `backend/routes/attendanceRoutes.js`.
- Controller: `backend/controllers/attendanceController.js`.
- Upload middleware: `backend/middleware/upload.js` for handling Excel files.

**Typical flow**

1. HR user downloads/receives an attendance Excel file.
2. User opens the Attendance Upload page, selects the file, and uploads it.
3. Backend parses the Excel using libraries (like `xlsx`), validates structure and data.
4. Backend updates or inserts rows into attendance-related tables.
5. Any errors are reported back for correction.

**Special rules**

- Late arrivals can be counted as half-day or full day based on configuration.
- Half-day and waivers can override default behavior.
- Relevant improvements and fixes are documented in files like `ATTENDANCE_SYSTEM_ENHANCEMENT_SUMMARY.md`.

---

### 5.5 Payroll and Salary Slips

**Purpose**

- Calculate and manage monthly salaries.
- Generate salary slips for employees.

**Frontend pieces**

- Payroll reports page: `src/pages/PayrollReports.tsx`.
- Salary slips page: `src/pages/SalarySlips.tsx`.
- Export to PDF or Excel where supported.

**Backend pieces**

- Routes: `/api/payroll` via `backend/routes/payrollRoutes.js`.
- Routes: `/api/salary-slips` via `backend/routes/salarySlipRoutes.js`.
- Controllers: `backend/controllers/payrollController.js`, `backend/controllers/salarySlipController.js`.

**What payroll does**

- Reads employee base data (basic salary, allowances).
- Reads attendance data (present days, absences, leaves, half-days).
- Reads loans and advance salary details.
- Applies payroll rules (skip-month salary, bonuses, deductions).
- Computes final payable salary for each employee.

**Salary slips**

- For each employee, a detailed slip is generated.
- Commonly includes earnings, deductions, net pay, and period information.
- Backend uses PDF libraries like `jspdf` or `pdfkit` to generate downloadable PDFs.

---

### 5.6 Employee Loans

**Purpose**

- Manage loans granted to employees.
- Track outstanding balance and monthly deductions.

**Frontend pieces**

- Loans page: `src/pages/EmployeeLoans.tsx`.
- Loan history page: `src/pages/EmployeeLoanHistory.tsx`.

**Backend pieces**

- Routes: `/api/loans` via `backend/routes/loanRoutes.js`.
- Controller: `backend/controllers/loanController.js` (name may vary slightly but is structured this way).

**Key operations**

- Create new loan (principal amount, start date, interest rules if any).
- Update loan or close loan.
- Calculate monthly deduction and pass data to payroll.

**Documentation**

- See `EMPLOYEE_LOAN_MODULE_REFACTOR_SUMMARY.md`, `LOAN_MODULE_IMPROVEMENTS.md`, `EMPLOYEE_LOANS_README.md` for the history of how this module was improved and key decisions.

---

### 5.7 Advance Salary

**Purpose**

- Track one-time or ad-hoc salary advances to employees.
- Reflect them in monthly payroll and salary slips.

**Frontend pieces**

- Advance salary page: `src/pages/AdvanceSalary.tsx`.
- Advance salary history page: `src/pages/AdvanceSalaryHistory.tsx`.

**Backend pieces**

- Routes: `/api/advance-salary` via `backend/routes/advanceSalaryRoutes.js`.
- Controller: `backend/controllers/advanceSalaryController.js` (pattern-based name).

**Documentation**

- Main description and history in `advance-salary-README.md`.

---

### 5.8 Holidays and Approved Leaves

**Purpose**

- Maintain holiday calendars.
- Track approved leaves which affect attendance and payroll.

**Frontend pieces**

- Holiday management page: `src/pages/holidays.tsx`.

**Backend pieces**

- Holiday routes: `/api/holidays` via `backend/routes/holidaysRoutes.js`.
- Approved leave routes: `/api/approved-leaves` via `backend/routes/approvedLeaveRoutes.js`.

**Behavior**

- Holidays prevent counting certain dates as working days.
- Approved leaves may be paid or unpaid based on company rules.

---

### 5.9 Half-Day Management and Waivers

**Purpose**

- Handle special cases where an employee works half a day.
- Allow waiving half-day penalties based on rules.

**Frontend pieces**

- Half-day management page: `src/pages/HalfDayManagement.tsx`.

**Backend pieces**

- Routes: `/api/half-day-waivers` in `backend/routes/halfDayWaiverRoutes.js`.
- Feature flag: `HALF_DAY_FEATURE_ENABLED` environment variable.
- Health check includes flag for `halfDayShifts`.

**Database**

- Special tables like `half_day_shifts` may exist.
- When the feature is enabled, backend checks whether the required tables are present.

---

### 5.10 Peticash Management

**Purpose**

- Record small day-to-day cash expenses.
- Help reconcile cash box and track spending separate from main payroll.

**Frontend pieces**

- Peticash page: `src/pages/Peticash.tsx`.

**Backend pieces**

- Routes: `/api/peticash` in `backend/routes/peticashRoutes.js`.
- Controller: `backend/controllers/peticashController.js`.

**Behavior**

- Users can log expense entries (date, amount, category, notes).
- Data can be exported or used for monthly reconciliation.

---

### 5.11 Recruitment

**Purpose**

- Manage recruitment pipeline details like candidate sources, platforms, and stages.

**Frontend pieces**

- Recruitments page: `src/pages/Recruitments.tsx`.

**Backend pieces**

- Routes:
  - `/api/recruitment`
  - `/api/recruitment-sources`
  - `/api/recruitment-platforms`
  - `/api/recruitment-pipelines`

**Documentation**

- Recruitment-related markdown files in root, such as `recruitment-masters-implementation-summary.md` and similar docs.

---

### 5.12 Audit Logs

**Purpose**

- Track important actions (who did what and when).
- Improve transparency and help debug issues.

**Frontend pieces**

- Audit logs viewer page: `src/pages/AuditLogs.tsx`.

**Backend pieces**

- Routes: `/api/audit-logs` in `backend/routes/auditLogRoutes.js`.
- Middleware: `backend/middleware/auditMiddleware.js` (attaches audit helper to requests and records actions).

**Behavior**

- Whenever certain actions occur (for example, employee update, payroll run), entries are added to audit logs.
- Admins can view them through the `AuditLogs` page.

---

## 6. Frontend Structure in Detail

The frontend lives in the `src` folder.

### 6.1 Key Files

- `src/main.tsx`
  - Entry point.
  - Creates React root and renders `<App />` inside `<React.StrictMode>`.

- `src/App.tsx`
  - Main routing file.
  - Imports pages like `UnifiedDashboard`, `Employees`, `PayrollReports`, etc.
  - Wraps routes with `AuthProvider`, `ToastProvider`, and `ErrorBoundary`.
  - Defines `ProtectedRoute` that checks authentication and permissions.

### 6.2 Routing and Navigation

- Uses `BrowserRouter` from React Router.
- Key routes:
  - `/` and `/dashboard` → Unified dashboard.
  - `/employees`, `/employees/add`, `/employees/edit/:employeeId`.
  - `/attendance-upload`.
  - `/advance-salary`, `/advance-salary-history`.
  - `/employee-loans`, `/employee-loan-history`.
  - `/salary-slips`.
  - `/peticash`.
  - `/recruitments`.
  - `/audit-logs`.
  - `/office/:officeName`, `/platform/:platformName`.
  - `/celebrations`.

### 6.3 State Management

- `AuthContext` manages:
  - Whether the user is authenticated.
  - The logged-in user’s role and permissions.
  - Token storage and refresh behavior.

- React Query is often used for API data:
  - Caches data by key (for example, `employees`, `dashboardData`).
  - Handles loading state and refetching.

### 6.4 Components and Pages

- `src/components/` contains reusable UI parts (tables, forms, modals, navigation, dashboard widgets).
- `src/pages/` contains main screens for each module.
- `src/styles/` and `tailwind` configuration provide the visual design.

---

## 7. Backend Structure in Detail

The backend lives in the `backend` folder.

### 7.1 Key File: server.js

- Loads environment variables from `backend/.env` using `dotenv`.
- Creates a MySQL connection pool using `mysql2/promise`.
- Attaches the pool to `req.db` for all requests.
- Sets up CORS, JSON body parsing, URL-encoded parsing.
- Adds logging and audit middleware.
- Defines a health check route at `/api/health`.
- Mounts all route files under `/api/...`.
- Adds error-handling middleware for JSON errors and JWT errors.
- Adds a 404 handler for unknown routes.

### 7.2 Routes and Controllers

- `backend/routes/*.js` – define paths like `/api/employees`, `/api/payroll`, etc.
- `backend/controllers/*.js` – implement business logic.

Pattern example:

- `employeeRoutes.js` might register:
  - `GET /api/employees` → `employeeController.getEmployees`
  - `POST /api/employees` → `employeeController.createEmployee`

### 7.3 Middleware

- `backend/middleware/auth.js`
  - `verifyToken` – check JWT and attach user data to `req.user`.
  - `requireAdmin`, `requireHR`, `requireManager` – restrict access by role.

- `backend/middleware/auditMiddleware.js`
  - Attaches `req.audit` helper to log key actions.

- `backend/middleware/upload.js`
  - Configures Multer for file uploads (for example, attendance Excel files).

### 7.4 Database Helper and Migrations

- `backend/db/`, `backend/db_migrations/`, `backend/migrations/` hold:
  - Migration scripts to create/alter tables.
  - Utility scripts for data fixes or schema changes.

The `npm run migrate` and `npm run migrate:prod` scripts call a migration runner (for example `migrate.js`) to apply changes.

---

## 8. Database and Migrations

The database layer is heavily supported by scripts and guides.

### 8.1 Structure

- There is likely a core schema including tables like:
  - `employees`
  - `attendance`
  - `payroll`
  - `salary_slips`
  - `loans`
  - `advance_salary`
  - `holidays`
  - `approved_leaves`
  - `platforms`, `offices`
  - `recruitment_*` tables
  - `audit_logs`

### 8.2 Migration Scripts

- `backend/db_migrations` and `backend/migrations` contain JS-based migrations.
- `database` and `database_migrations` contain raw SQL and helper scripts.
- `run_migration.ps1` and other scripts help run them in a controlled way.

### 8.3 Date and Format Fixes

- Several markdown files explain how date formats were migrated and fixed:
  - `DATE_FORMAT_MIGRATION_GUIDE.md`
  - `DATE_HANDLING_FIX_SUMMARY.md`
  - `DATE_FIX_SUMMARY.md`

If you see unexpected behavior around dates, read these first.

---

## 9. Environments and Configuration (.env)

There are multiple environment files to support different scenarios.

### 9.1 Root-Level Environment Files

- `.env`, `.env.docker`, `.env.production`, `.env.local.backup`, etc.
- These may contain shared settings or frontend-related values.

### 9.2 Backend Environment

- `backend/.env` is the main file read by `backend/server.js`.
- Common variables:
  - `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
  - `DB_CONNECTION_LIMIT`, `DB_QUEUE_LIMIT`
  - `PORT` (backend port, for ex. 5000)
  - `JWT_SECRET`
  - `FRONTEND_URL` / `CORS_ORIGINS`
  - `HALF_DAY_FEATURE_ENABLED`

### 9.3 Docker and Production

- `.env.docker` and associated compose files define environment for container deployments.
- `PRODUCTION_DEPLOYMENT_GUIDE.md` documents required variables in detail.

---

## 10. How to Run in Development (Step-by-Step)

This section summarizes and slightly expands the development instructions.

1. **Install Node and MySQL**
   - Install Node.js 18+.
   - Install MySQL 8.0+ and ensure you know the root password or create a dedicated DB user.

2. **Clone or copy the project**
   - Place the repository in your working folder.

3. **Install frontend dependencies**
   ```bash
   npm install
   ```

4. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

5. **Configure backend environment**
   - Create `backend/.env` using the template or examples.
   - Set DB-related variables to point to your local MySQL.
   - Set `JWT_SECRET` to a random secure string.

6. **Create the database**
   - In MySQL, run something like:
     ```sql
     CREATE DATABASE payroll_system;
     ```

7. **Run migrations**
   ```bash
   cd backend
   npm run migrate
   ```

8. **Start the backend (dev mode)**
   ```bash
   npm run dev
   ```
   - This usually runs on `http://localhost:5000`.

9. **Start the frontend**
   ```bash
   cd ..   # project root
   npm run dev
   ```
   - Vite will show the local dev URL (often `http://localhost:5173`).

10. **Open the app in browser**
    - Go to the Vite dev URL.
    - Log in using a configured account or an initial admin user.

11. **Check connectivity**
    - If login fails due to CORS or network errors, verify:
      - Backend `PORT` and URL.
      - `FRONTEND_URL` or `CORS_ORIGINS` in the backend `.env`.

---

## 11. Deployment Overview (High Level)

For full step-by-step instructions, always refer to:

- `PRODUCTION_DEPLOYMENT_GUIDE.md`
- `README-DEPLOYMENT.md`
- `SERVER_DEPLOY.md`
- `PRODUCTION-SETUP-SUMMARY.md`

High-level idea:

1. Build frontend using `npm run build:prod` to create static files in `dist/`.
2. Install backend dependencies in production mode: `npm install --production` within `backend`.
3. Run production migrations: `npm run migrate:prod`.
4. Use PM2 to start the backend: `npm run pm2:start`.
5. Use Nginx to serve `dist/` and proxy `/api` to the backend.
6. Optionally, use Docker and docker-compose with provided configs instead of manual setup.

---

## 12. Scripts and Tools

The project includes many helper scripts to speed up operations.

### 12.1 Sync Scripts

- `sync-database.ps1`, `sync-database.bat` – Sync database data between servers.
- `sync-server.ps1`, `sync_payroll.ps1`, `quick-sync.ps1` – Helper scripts for syncing code and configs.

### 12.2 Migration and Data Fix Scripts

- Files like `migrate_attendance.cjs`, `migrate_comments.cjs`, `migrate_employee_dates_to_proper_DATE.js`, etc.
- These are used for special one-time migrations or complex refactors.

### 12.3 Testing Scripts

- Under root or backend, scripts such as:
  - `test_employee_api.js`
  - `test_offices_api.js`
  - `test_loan_functionality.js`
  - `test_salary_slip.js`
- They send test requests to the API for quick verification.

### 12.4 Deployment and Maintenance Scripts

- `deploy-to-new-server.ps1`, `deploy-to-new-server.sh` – End-to-end deployment steps.
- `deploy-safe.sh`, `fix-server.ps1`, `fix_nginx.sh` – Repair or restart critical services.

Many of these scripts have companion `.md` files explaining when and how to use them.

---

## 13. Common Flows Explained (End-to-End Examples)

This section gives short “story-style” explanations of how typical flows work.

### 13.1 Monthly Payroll Cycle

1. **Attendance Upload**
   - HR uploads the monthly attendance Excel file.
   - Backend imports and validates records.

2. **Review and Fix Issues**
   - HR checks attendance in the UI for anomalies.
   - If needed, manual fixes or re-uploads are done.

3. **Loans and Advance Salary**
   - New loans or advances that happened in the month are recorded in their respective modules.

4. **Run Payroll**
   - Payroll reports are viewed or triggered for the month.
   - Backend combines data from employees, attendance, loans, and advance salary.
   - Net salary is calculated for each employee.

5. **Generate Salary Slips**
   - Salary slips page is used to generate PDFs.
   - PDFs can be downloaded, printed, or emailed (depending on surrounding processes).

6. **Audit and Review**
   - Audit logs show who ran what and when.
   - Management dashboards reflect final numbers.

### 13.2 New Employee Onboarding

1. HR adds a new employee using the Employees module.
2. Employee record is stored in the database.
3. Employee can then be visible in attendance, payroll, and loan modules.
4. If necessary, an initial salary, loan, or advance is set up.

### 13.3 Recruitment Tracking

1. Recruitment team enters candidate details and selects the source and platform.
2. As the candidate moves through stages, `recruitment` API endpoints update statuses.
3. Reports and dashboards show pipeline health.

---

## 14. Testing and Debugging Tips

### 14.1 Frontend

- Use browser dev tools (Network tab) to inspect requests and responses.
- Watch for CORS errors if backend URL or origins are wrong.
- Check console logs for React errors or warnings.

### 14.2 Backend

- `backend/server.js` logs requests, especially related to 2FA and important endpoints.
- Use test scripts (for example, `test_employee_api.js`) to call endpoints directly.
- Check the `health-check` endpoint (`/api/health`) for feature flags and basic status.

### 14.3 Database

- Use MySQL client or workbench to inspect tables directly.
- If data looks wrong in UI, check the underlying tables.

### 14.4 Docs

- Before spending hours debugging, search the repo for relevant `.md` files.
- Many issues have already been documented with fixes.

---

## 15. Important Documentation Files and When to Read Them

- **Deployment and Production**
  - `PRODUCTION_DEPLOYMENT_GUIDE.md` – Most complete production guide.
  - `DEPLOY-INSTRUCTIONS.md`, `DEPLOY_TO_NEW_SERVER.md`, `SERVER_DEPLOY.md`.
  - `production-redeploy-guide.md`, `PRODUCTION-SETUP-SUMMARY.md`.

- **Database and Sync**
  - `SYNC-README.md`, `SYNC-GUIDE.md`, `SYNC_INSTRUCTIONS.md`.
  - `DATABASE-SYNC-GUIDE.md`, `DATABASE-SYNC-STEPS.md`, `DATABASE-SYNC-MYSQL-WORKBENCH.md`.
  - `MIGRATION_INSTRUCTIONS.md`, `MIGRATION_README.md`.

- **Dates and Time Handling**
  - `DATE_FORMAT_MIGRATION_GUIDE.md`.
  - `DATE_HANDLING_FIX_SUMMARY.md`.
  - `DATE_FIX_SUMMARY.md`.

- **Features and Modules**
  - `UNIFIED_DASHBOARD_README.md` – Dashboard architecture and changes.
  - `EMPLOYEE_LOAN_MODULE_REFACTOR_SUMMARY.md`, `LOAN_MODULE_IMPROVEMENTS.md`, `EMPLOYEE_LOANS_README.md`.
  - `advance-salary-README.md`.
  - `FRONTEND_DATE_HANDLING_UPDATE.md`, `EXCEL_EXPORT_ENHANCEMENTS.md`, `excel_import_improvements_summary.md`.
  - `ATTENDANCE_SYSTEM_ENHANCEMENT_SUMMARY.md` (backend/docs/).

- **Troubleshooting and Fixes**
  - `FIXES_SUMMARY.md`.
  - Multiple `*_fix.md` and `*_summary.md` documents for specific bugs.
  - `TEST_SCENARIOS.md`, `TESTING_AUDIT_LOGS.md`.

---

## 16. Checklist for New Developers

If you have just joined the project, follow this checklist:

1. **Read sections 1–4 of this README** to understand the project.
2. **Set up the project locally** using section 10.
3. **Log in and click around** the UI to understand main modules.
4. **Pick one feature** (for example, Employees or Loans) and trace it:
   - From page component in `src/pages/`.
   - To API calls in `services/`.
   - To routes in `backend/routes/`.
   - To controllers in `backend/controllers/`.
   - To tables in MySQL.
5. **Read related docs** for that module (loan docs, attendance docs, etc.).
6. **Try a small safe change** (for example, improve a label or add a small validation) and test end-to-end.

If you keep this README updated as the project evolves, it will remain the single best reference for the entire system.

---

End of detailed project README.
