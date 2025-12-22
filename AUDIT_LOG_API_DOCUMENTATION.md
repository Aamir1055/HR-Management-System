# Audit Log API Documentation

## Overview
The Audit Log system tracks all user activities in the HR Management System, including create, update, delete operations, and authentication events.

## Database Table Structure

```sql
audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    username VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,  -- CREATE, UPDATE, DELETE, LOGIN, LOGOUT
    entity_type VARCHAR(100) NOT NULL,  -- employees, users, positions, offices, etc.
    entity_id INT NULL,
    entity_name VARCHAR(255) NULL,
    description TEXT NULL,
    old_values JSON NULL,  -- Previous values before update
    new_values JSON NULL,  -- New values after update/create
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

## API Endpoints

### 1. Get All Audit Logs (Admin Only)
```
GET /api/audit-logs
```

**Query Parameters:**
- `page` (number, default: 1) - Page number
- `limit` (number, default: 50) - Results per page
- `action` (string) - Filter by action (CREATE, UPDATE, DELETE, LOGIN)
- `entityType` (string) - Filter by entity type (users, employees, etc.)
- `userId` (number) - Filter by user ID
- `startDate` (string) - Filter from date (YYYY-MM-DD)
- `endDate` (string) - Filter to date (YYYY-MM-DD)
- `search` (string) - Search in username, entity_name, description

**Response:**
```json
{
  "logs": [
    {
      "id": 1,
      "user_id": 26,
      "username": "admin",
      "action": "CREATE",
      "entity_type": "users",
      "entity_id": 35,
      "entity_name": "testuser",
      "description": "Created new user: testuser with role: hr",
      "old_values": null,
      "new_values": {
        "username": "testuser",
        "role": "hr",
        "two_factor_enabled": false,
        "office_count": 1
      },
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0...",
      "created_at": "2025-12-22T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

### 2. Get Audit Log by ID (Admin Only)
```
GET /api/audit-logs/:id
```

**Response:**
```json
{
  "id": 1,
  "user_id": 26,
  "username": "admin",
  "action": "UPDATE",
  "entity_type": "employees",
  "entity_id": 100,
  "entity_name": "John Doe",
  "description": "Updated employee: John Doe. Changed: position, salary",
  "old_values": {
    "position": "Developer",
    "salary": 50000
  },
  "new_values": {
    "position": "Senior Developer",
    "salary": 65000
  },
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "created_at": "2025-12-22T12:00:00.000Z"
}
```

### 3. Get Audit Statistics (Admin Only)
```
GET /api/audit-logs/stats
```

**Query Parameters:**
- `startDate` (string) - Filter from date
- `endDate` (string) - Filter to date

**Response:**
```json
{
  "total": 1250,
  "byAction": [
    { "action": "LOGIN", "count": 450 },
    { "action": "CREATE", "count": 250 },
    { "action": "UPDATE", "count": 400 },
    { "action": "DELETE", "count": 150 }
  ],
  "byEntityType": [
    { "entity_type": "employees", "count": 500 },
    { "entity_type": "users", "count": 150 },
    { "entity_type": "auth", "count": 450 },
    { "entity_type": "attendance", "count": 150 }
  ],
  "topUsers": [
    { "user_id": 26, "username": "admin", "count": 650 },
    { "user_id": 33, "username": "hr_manager", "count": 300 }
  ]
}
```

### 4. Get Entity History (Admin Only)
```
GET /api/audit-logs/entity/:entityType/:entityId
```

**Example:**
```
GET /api/audit-logs/entity/employees/100
```

**Query Parameters:**
- `limit` (number, default: 100) - Maximum results

**Response:**
```json
{
  "logs": [
    {
      "id": 45,
      "action": "UPDATE",
      "description": "Updated employee salary",
      "old_values": { "salary": 50000 },
      "new_values": { "salary": 55000 },
      "username": "admin",
      "created_at": "2025-12-22T12:00:00.000Z"
    },
    {
      "id": 12,
      "action": "CREATE",
      "description": "Created new employee",
      "new_values": { "name": "John Doe", "position": "Developer" },
      "username": "hr_manager",
      "created_at": "2025-12-01T10:00:00.000Z"
    }
  ]
}
```

### 5. Get User Activity
```
GET /api/audit-logs/user/:userId
```

**Authorization:** Admin can see all users, regular users can only see their own logs

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 50)

**Response:**
```json
{
  "logs": [
    {
      "id": 100,
      "action": "LOGIN",
      "entity_type": "auth",
      "description": "User logged in successfully",
      "ip_address": "192.168.1.100",
      "created_at": "2025-12-22T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 25,
    "totalPages": 1
  }
}
```

## Automatically Tracked Actions

### Authentication
- ✅ `LOGIN` - User logs in (with/without 2FA)
- 🔄 `LOGOUT` - User logs out (to be implemented)

### User Management
- ✅ `CREATE` - New user created
- ✅ `UPDATE` - User details updated (tracks changes)
- ✅ `DELETE` - User deleted

### Employees (To be implemented)
- `CREATE` - Employee created
- `UPDATE` - Employee details updated
- `DELETE` - Employee deleted

### Other Modules (To be implemented)
- Attendance records
- Payroll operations
- Leave approvals
- Salary advances
- Loans

## Usage Examples

### Frontend API Calls

```typescript
// Get recent audit logs
const response = await api.get('/audit-logs?limit=20&page=1');

// Filter by action
const creates = await api.get('/audit-logs?action=CREATE');

// Get specific user activity
const userActivity = await api.get('/audit-logs/user/26');

// Get entity history
const employeeHistory = await api.get('/audit-logs/entity/employees/100');

// Get statistics
const stats = await api.get('/audit-logs/stats');
```

### Backend Audit Logging

```javascript
// In any controller, log an audit event
await logAudit({
  userId: req.user.id,
  username: req.user.username,
  action: 'CREATE',
  entityType: 'employees',
  entityId: newEmployee.id,
  entityName: newEmployee.name,
  description: `Created new employee: ${newEmployee.name}`,
  newValues: {
    name: newEmployee.name,
    position: newEmployee.position,
    salary: newEmployee.salary
  },
  ipAddress: req.ip,
  userAgent: req.get('user-agent')
});

// For updates, include old values
await logAudit({
  userId: req.user.id,
  username: req.user.username,
  action: 'UPDATE',
  entityType: 'employees',
  entityId: employee.id,
  entityName: employee.name,
  description: `Updated employee: ${employee.name}`,
  oldValues: {
    position: 'Developer',
    salary: 50000
  },
  newValues: {
    position: 'Senior Developer',
    salary: 65000
  },
  ipAddress: req.ip,
  userAgent: req.get('user-agent')
});
```

## Security & Permissions

- **Admin Users**: Full access to all audit logs
- **Regular Users**: Can only view their own activity logs
- **Audit logs cannot be modified or deleted** (append-only for audit integrity)

## Performance Considerations

- Audit logs are indexed by:
  - `user_id` - Fast lookup by user
  - `action` - Filter by action type
  - `entity_type` - Filter by entity
  - `entity_id` - Get history of specific record
  - `created_at` - Date range queries

- Use pagination for large result sets
- Consider archiving old logs after 1-2 years for performance

## Future Enhancements

1. Export audit logs to CSV/Excel
2. Real-time audit log notifications
3. Audit log retention policies
4. Advanced filtering and search
5. Audit log dashboard with charts
6. Scheduled audit reports via email
