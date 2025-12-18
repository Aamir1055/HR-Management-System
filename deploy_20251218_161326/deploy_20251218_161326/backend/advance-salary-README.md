# Advance Salary Upload Module

This module allows managers and HR staff to upload advance salary data for employees via Excel files.

## Features

- **Excel Upload**: Upload advance salary data from Excel files with validation
- **Role-based Access**: Only managers and above can upload data
- **Office-based Security**: Users can only manage data for employees in their assigned offices
- **Data Validation**: Comprehensive validation of employee IDs, amounts, and date formats
- **Duplicate Prevention**: Prevents duplicate entries for the same employee/month combination
- **CRUD Operations**: Full create, read, update, delete functionality via API

## API Endpoints

### File Upload
- `POST /api/advance-salary/upload` - Upload Excel file (Manager+ required)

### Query Operations  
- `GET /api/advance-salary` - Get all advance salary records
- `GET /api/advance-salary/filter?month_year=YYYY-MM` - Filter by month-year
- `GET /api/advance-salary/:employeeId` - Get records for specific employee
- `GET /api/advance-salary/:employeeId/:monthYear` - Get single record

### CRUD Operations
- `POST /api/advance-salary` - Create/Update single record
- `PUT /api/advance-salary/:employeeId/:monthYear` - Update record
- `DELETE /api/advance-salary/:employeeId/:monthYear` - Delete record (Manager+ required)

## Excel File Format

Your Excel file must contain the following columns (case insensitive):

| Column Name | Type | Description | Example |
|-------------|------|-------------|---------|
| EmployeeID | Text | Employee ID | EMP-005 |
| Month | Number | Month (1-12) | 8 |
| Year | Number | Year (2020-2030) | 2025 |
| Amount | Number | Advance amount | 500.00 |

### Sample Excel Data

```
| EmployeeID | Month | Year | Amount |
|------------|-------|------|--------|
| EMP-005    | 8     | 2025 | 500.00 |
| EMP-006    | 8     | 2025 | 300.50 |
| EMP-007    | 9     | 2025 | 750.00 |
```

## Validation Rules

1. **Employee ID**: Must exist in your accessible offices
2. **Month**: Must be 1-12
3. **Year**: Must be between 2020-2030
4. **Amount**: Must be a positive number
5. **Uniqueness**: One record per employee per month-year

## Error Handling

The system provides detailed error messages for:
- Missing or invalid columns
- Invalid employee IDs
- Access permission violations
- Data validation failures
- Duplicate records

## Security Features

- **Authentication**: All endpoints require valid JWT tokens
- **Role-based Access**: Upload and delete operations require Manager+ privileges
- **Office Restrictions**: Users can only access data for employees in their assigned offices

## Usage Examples

### Using cURL

#### 1. Login to get token
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"floormanager","password":"manager123"}'
```

#### 2. Upload Excel file
```bash
curl -X POST http://localhost:5000/api/advance-salary/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@advance_salary.xlsx"
```

#### 3. Get all records
```bash
curl -X GET http://localhost:5000/api/advance-salary \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 4. Filter by month-year
```bash
curl -X GET "http://localhost:5000/api/advance-salary/filter?month_year=2025-08" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 5. Create single record
```bash
curl -X POST http://localhost:5000/api/advance-salary \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"employee_id":"EMP-005","month_year":"2025-08","amount":500.00}'
```

### Using the Test Script

Run the included test script to verify the module:

```bash
# Start the server first
node server.js

# In another terminal, run the test
node test-advance-salary.js
```

## Database Schema

The `advance_salary` table structure:

```sql
CREATE TABLE `advance_salary` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_id` varchar(10) NOT NULL,
  `month_year` varchar(7) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `uploaded_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `uploaded_by` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_employee_month` (`employee_id`,`month_year`)
);
```

## Response Formats

### Success Response
```json
{
  "success": true,
  "message": "Advance salary data uploaded successfully",
  "recordsProcessed": 3
}
```

### Error Response
```json
{
  "success": false,
  "message": "Data validation failed",
  "errors": [
    "Row 3: Invalid Amount (abc). Amount should be a positive number"
  ]
}
```

### Record Response
```json
{
  "id": 1,
  "employee_id": "EMP-005",
  "month_year": "2025-08",
  "amount": "500.00",
  "uploaded_date": "2025-08-09T13:30:00.000Z",
  "uploaded_by": "floormanager",
  "employee_name": "John Doe",
  "office_name": "Main Office"
}
```

## Troubleshooting

### Common Issues

1. **"Access Denied" error**: Make sure you have manager privileges and access to the employee's office
2. **"Required columns not found"**: Verify Excel headers match: EmployeeID, Month, Year, Amount
3. **"Invalid Employee ID"**: Employee must exist in your accessible offices
4. **"Records already exist"**: Use update functionality or remove existing records first

### File Format Issues

- Ensure Excel file has data starting from row 2 (after headers)
- Month should be numeric (1-12), not text ("January")
- Year should be 4 digits (2025), not 2 digits (25)
- Amount should be numeric, currency symbols are automatically removed

## Integration Notes

This module integrates with:
- **Employee Management**: Validates employee IDs against employee table
- **Office Management**: Enforces office-based access control
- **User Authentication**: Requires valid JWT tokens
- **Role Management**: Enforces role-based permissions

The data uploaded through this module can be used by payroll systems for salary calculations and deductions.
