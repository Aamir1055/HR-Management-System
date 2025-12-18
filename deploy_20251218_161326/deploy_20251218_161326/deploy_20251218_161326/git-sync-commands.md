# 🔄 Git Commands to Sync Master Data & Recruitment Changes

## 📋 **Files to Sync:**

### **🎯 Master Data Module Files:**
```bash
# Frontend Master Data Files
git add src/pages/MasterData.tsx
git add src/hooks/useMasterData.ts
git add src/components/Masters/MasterDataForm.tsx
git add src/components/Masters/MasterDataTable.tsx

# Role Module Files
git add src/pages/Roles.tsx
git add src/components/Roles/RoleForm.tsx
git add src/components/Roles/RoleTable.tsx
git add src/hooks/useRoles.ts
git add src/services/roleApi.ts

# Backend Role Files
git add backend/models/Role.js
git add backend/repositories/RoleRepository.js
git add backend/services/RoleService.js
git add backend/controllers/roleController.js
git add backend/routes/roleRoutes.js

# Recruitment Master Data Backend Files
git add backend/models/RecruitmentSource.js
git add backend/models/RecruitmentPipeline.js
git add backend/models/RecruitmentPlatform.js
git add backend/repositories/RecruitmentSourceRepository.js
git add backend/repositories/RecruitmentPipelineRepository.js
git add backend/repositories/RecruitmentPlatformRepository.js
git add backend/services/RecruitmentSourceService.js
git add backend/services/RecruitmentPipelineService.js
git add backend/services/RecruitmentPlatformService.js
git add backend/controllers/recruitmentSourceController.js
git add backend/controllers/recruitmentPipelineController.js
git add backend/controllers/recruitmentPlatformController.js
git add backend/routes/recruitmentSourceRoutes.js
git add backend/routes/recruitmentPipelineRoutes.js
git add backend/routes/recruitmentPlatformRoutes.js

# Backend Server Integration
git add backend/server.js

# Database Migration Files
git add backend/run_role_migration.cjs
git add backend/run_recruitment_masters_migration.cjs
git add create_role_master_table.sql
git add create_recruitment_master_tables.sql
```

### **📱 Recruitment Module Files:**
```bash
# Recruitment Table Responsive Fix
git add src/components/Recruitments/RecruitmentTable.tsx

# Updated Types (if changed)
git add src/types/index.ts
```

## 🚀 **Complete Git Commands:**

### **Option 1: Add All Files at Once**
```bash
# Add all Master Data and Recruitment files
git add src/pages/MasterData.tsx src/hooks/useMasterData.ts src/components/Masters/MasterDataForm.tsx src/components/Masters/MasterDataTable.tsx src/pages/Roles.tsx src/components/Roles/RoleForm.tsx src/components/Roles/RoleTable.tsx src/hooks/useRoles.ts src/services/roleApi.ts backend/models/Role.js backend/repositories/RoleRepository.js backend/services/RoleService.js backend/controllers/roleController.js backend/routes/roleRoutes.js backend/models/RecruitmentSource.js backend/models/RecruitmentPipeline.js backend/models/RecruitmentPlatform.js backend/repositories/RecruitmentSourceRepository.js backend/repositories/RecruitmentPipelineRepository.js backend/repositories/RecruitmentPlatformRepository.js backend/services/RecruitmentSourceService.js backend/services/RecruitmentPipelineService.js backend/services/RecruitmentPlatformService.js backend/controllers/recruitmentSourceController.js backend/controllers/recruitmentPipelineController.js backend/controllers/recruitmentPlatformController.js backend/routes/recruitmentSourceRoutes.js backend/routes/recruitmentPipelineRoutes.js backend/routes/recruitmentPlatformRoutes.js backend/server.js backend/run_role_migration.cjs backend/run_recruitment_masters_migration.cjs create_role_master_table.sql create_recruitment_master_tables.sql src/components/Recruitments/RecruitmentTable.tsx src/types/index.ts

# Commit the changes
git commit -m "feat: Add Master Data modules for Roles and Recruitment (Sources, Pipeline, Platforms) + Responsive Recruitment Table

- Add complete Role master data module with CRUD operations
- Add Recruitment Sources master data (Indeed, Employee Reference, etc.)
- Add Recruitment Pipeline master data (HR Screening → Onboarded)
- Add Recruitment Platforms master data (NSE, Forex)
- Integrate all master data modules into Master Data Management interface
- Fix recruitment table horizontal scrolling with responsive design
- Add database migrations for all master tables
- Update backend with complete API endpoints for all modules"

# Push to your branch
git push origin your-branch-name
```

### **Option 2: Step by Step (Recommended)**
```bash
# 1. Add Frontend Master Data Files
git add src/pages/MasterData.tsx src/hooks/useMasterData.ts src/components/Masters/

# 2. Add Role Module Files
git add src/pages/Roles.tsx src/components/Roles/ src/hooks/useRoles.ts src/services/roleApi.ts

# 3. Add Backend Role Files
git add backend/models/Role.js backend/repositories/RoleRepository.js backend/services/RoleService.js backend/controllers/roleController.js backend/routes/roleRoutes.js

# 4. Add Recruitment Master Data Backend Files
git add backend/models/Recruitment*.js backend/repositories/Recruitment*.js backend/services/Recruitment*.js backend/controllers/recruitment*.js backend/routes/recruitment*.js

# 5. Add Server Integration & Migrations
git add backend/server.js backend/run_*_migration.cjs create_*_table.sql

# 6. Add Recruitment Table Fix
git add src/components/Recruitments/RecruitmentTable.tsx src/types/index.ts

# 7. Commit everything
git commit -m "feat: Complete Master Data system with Role and Recruitment modules + Responsive table fix"

# 8. Push to your branch
git push origin your-branch-name
```

### **Option 3: Selective Sync (If you want to exclude some files)**
```bash
# Only Master Data Interface Changes
git add src/pages/MasterData.tsx src/hooks/useMasterData.ts src/components/Masters/

# Only Role Module
git add src/pages/Roles.tsx src/components/Roles/ src/hooks/useRoles.ts src/services/roleApi.ts backend/models/Role.js backend/repositories/RoleRepository.js backend/services/RoleService.js backend/controllers/roleController.js backend/routes/roleRoutes.js

# Only Recruitment Master Data Backend
git add backend/models/Recruitment*.js backend/repositories/Recruitment*.js backend/services/Recruitment*.js backend/controllers/recruitment*.js backend/routes/recruitment*.js

# Only Recruitment Table Fix
git add src/components/Recruitments/RecruitmentTable.tsx

# Commit and push
git commit -m "feat: Add specific module changes"
git push origin your-branch-name
```

## 📝 **Notes:**
- Replace `your-branch-name` with your actual branch name
- Run `git status` first to see what files have been modified
- Use `git diff filename` to review changes before committing
- The migration files (.cjs and .sql) are important for database setup on your server

## 🎯 **What These Changes Include:**
- ✅ Complete Master Data system with 8 modules
- ✅ Role master data with full CRUD
- ✅ 3 Recruitment master data modules (Sources, Pipeline, Platforms)
- ✅ Responsive recruitment table (no horizontal scrolling)
- ✅ Database migrations for all new tables
- ✅ Complete backend API endpoints
- ✅ Frontend integration with improved UI/UX