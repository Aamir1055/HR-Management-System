# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

PayRoll Management System is a comprehensive HR and payroll solution built with:
- **Backend**: Node.js/Express.js with MySQL database
- **Frontend**: React/TypeScript with Vite (separate deployment)
- **Architecture**: RESTful API with JWT authentication and role-based access control
- **Features**: Employee management, attendance tracking, payroll processing, loan management, recruitment panel

## Development Commands

### Backend Development
```bash
# Start development server (with nodemon auto-restart)
cd backend
npm run dev

# Start production server
npm run start
npm run start:prod

# Database operations
npm run migrate          # Run database migrations (development)
npm run migrate:prod     # Run database migrations (production)

# Process management with PM2
npm run pm2:start        # Start with PM2
npm run pm2:stop         # Stop PM2 processes
npm run pm2:restart      # Restart PM2 processes
npm run pm2:delete       # Delete PM2 processes
npm run pm2:logs         # View logs
npm run pm2:monit        # Monitor processes

# Health and deployment
npm run health-check     # Check application health
npm run deploy          # Run deployment script
```

### Testing
```bash
# API testing (PowerShell script)
cd backend/tests
./test_apis.ps1                    # Run all API tests
./test_apis.ps1 -HealthOnly        # Health checks only
./test_apis.ps1 -Verbose           # Detailed output
./test_apis.ps1 -OutputReport "results.json"  # Generate test report
```

### Database Management
```bash
# Migration scripts (run from backend directory)
node migrate.js                    # Create all database tables
node add_employee_fields_migration.js  # Add specific employee fields
node apply_utc_fix.js              # Apply UTC date fixes
node check_db_structure.js         # Validate database structure

# Data validation and analysis
node check_data.js                 # Validate data integrity
node analyze_excel_import_gap.js   # Analyze Excel import gaps
node comprehensive_validation.js   # Full system validation
```

## Architecture Overview

### Backend Structure
```
backend/
├── server.js                 # Main application entry point with Express setup
├── controllers/              # Business logic layer
├── routes/                   # API route definitions
├── middleware/               # Authentication, validation, file upload
├── db/                       # Database connection pool
├── models/                   # Data models and database schemas  
├── services/                 # Business service layer
├── repositories/             # Data access layer
├── migrations/               # Database migration scripts
├── utils/                    # Utility functions and helpers
├── uploads/                  # File upload storage
└── tests/                    # API testing framework
```

### Key Components

#### Authentication System
- JWT-based authentication with role-based access control
- Roles: Admin, HR, Floor Manager, Employee
- Two-factor authentication support with TOTP
- Middleware: `requireAuth`, `requireAdmin`, `requireHR`, `requireManager`

#### Core Modules
1. **Employee Management** (`employeeRoutes.js`, `employeeController.js`)
   - CRUD operations, Excel import/export, visa tracking
   - Office/position assignment, salary management

2. **Attendance Tracking** (`attendanceRoutes.js`, `attendanceController.js`)
   - Daily attendance, half-day shifts, overtime calculations
   - Bulk attendance operations, Excel reporting

3. **Payroll Processing** (`payrollRoutes.js`, `payrollController.js`)
   - Monthly payroll generation, salary calculations
   - Deductions, advances, loan tracking

4. **Loan Management** (`loanRoutes.js`, `loanController.js`)
   - Employee loan tracking, monthly deductions
   - Payment history, outstanding balances

5. **Dashboard & Reporting** (`dashboardRoutes.js`, `dashboardController.js`)
   - Executive dashboards, summary statistics
   - Office-wise and platform-wise analytics

### Database Architecture

#### Core Tables
- `employees` - Employee master data with office/position relationships
- `attendance` - Daily attendance records with time tracking  
- `payroll` - Monthly payroll calculations and deductions
- `employee_loans` - Loan tracking with monthly deductions
- `offices`, `positions` - Master data for organizational structure
- `users` - System users with role-based permissions

#### Key Relationships
- Employees belong to offices and positions (many-to-one)
- Attendance and payroll link to employees (one-to-many)
- Loans are employee-specific with monthly deduction tracking
- Comments and approvals link to both employees and users

### API Architecture
- **Route Layer**: Express routes with middleware chains
- **Controller Layer**: Business logic and request/response handling
- **Service Layer**: Core business operations and calculations
- **Repository Layer**: Database access and query management
- **Middleware**: Authentication, validation, file uploads, error handling

## Development Guidelines

### Environment Configuration
- Copy appropriate `.env` template (`.env.production`, `.env.docker`)
- Required variables: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, `PORT`
- Optional features: `HALF_DAY_FEATURE_ENABLED`, `CORS_ORIGINS`

### Database Operations
- Always run migrations before starting development: `npm run migrate`
- Use the migration scripts for schema changes rather than direct SQL
- Test database connectivity with health check: `npm run health-check`

### File Uploads
- Excel files stored in `backend/uploads/` directory
- Supported formats: `.xlsx`, `.xls`, `.csv` (max 10MB)
- Template downloads available at `/api/employees/template`

### API Authentication
- Most endpoints require JWT token in Authorization header: `Bearer <token>`
- Public endpoints: login, health check, employee template download
- Role-based access enforced at route level with middleware

### Error Handling
- Centralized error handling middleware in `server.js`
- Database connection errors logged with detailed information
- File upload errors return specific error messages
- JWT token validation with appropriate HTTP status codes

### Testing Strategy
- Use PowerShell script in `backend/tests/` for comprehensive API testing
- Health checks run first to validate module availability
- Authentication tokens automatically applied from environment variables
- Test configuration in `api_endpoints.json` covers all major endpoints

### Deployment Considerations
- PM2 configuration in `ecosystem.config.js` for production clustering
- Docker support with `docker-compose.prod.yml`
- Nginx reverse proxy configuration available in deployment docs
- Database migrations must run before starting production services

### Common Development Tasks

#### Adding New API Endpoints
1. Create route in appropriate `routes/` file
2. Implement controller logic in `controllers/` 
3. Add service layer functions if needed in `services/`
4. Add database queries in `repositories/` if required
5. Update `tests/api_endpoints.json` for testing

#### Database Schema Changes
1. Create migration script in root directory following existing patterns
2. Test migration on development database first
3. Update relevant models and controllers
4. Run comprehensive validation: `node comprehensive_validation.js`

#### Excel Import/Export Features
1. Use existing multer middleware for file uploads
2. Follow patterns in `employeeController.js` for data processing
3. Validate data integrity before database operations
4. Provide template downloads for user guidance

This system handles complex HR operations with multi-office support, detailed attendance tracking, comprehensive payroll processing, and extensive reporting capabilities. The modular architecture allows for easy extension and maintenance while maintaining data integrity and security.
