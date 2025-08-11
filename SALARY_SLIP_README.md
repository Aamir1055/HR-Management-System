# Salary Slip Module Documentation

## Overview
The Salary Slip module is a comprehensive feature of the Payroll Management System that allows users to generate, view, and export employee salary slips for any given month and year. This module calculates all relevant salary components including deductions, attendance metrics, and provides PDF export functionality.

## Features

### 🔍 **Core Functionality**
- **Generate Salary Slips**: Create detailed salary slips for individual employees
- **Period Selection**: Filter employees by specific month/year combinations
- **PDF Export**: Download salary slips as professional PDF documents
- **Real-time Calculations**: Automatic calculation of deductions and net salary
- **Responsive Design**: Works seamlessly on desktop and mobile devices

### 📊 **Salary Slip Components**
The salary slip contains the following detailed information:

#### **Employee Information**
- Employee ID
- Full Name
- Position/Job Title
- Office Location

#### **Attendance Summary**
- Total Working Days (calculated excluding weekends)
- Present Days
- Absent Days
- Half Days
- Late Punch In count
- Approved Leaves
- Excess Leaves

#### **Salary Breakdown**
- **Gross Salary**: Base monthly salary
- **Deductions**:
  - Absent/Half Days deduction (calculated per day rate)
  - Excess Leaves deduction
  - Advance Salary taken
- **Total Deductions**: Sum of all deductions
- **Net Salary**: Gross salary minus total deductions

## API Endpoints

### Authentication
All salary slip endpoints require authentication using JWT tokens.

```
Authorization: Bearer <your-jwt-token>
```

### Available Endpoints

#### 1. Get Available Periods
```http
GET /api/salary-slips/periods
```
Returns all available months/years for which salary data exists.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "month": 7,
      "year": 2025,
      "monthName": "July",
      "display": "July 2025"
    }
  ]
}
```

#### 2. Get Employees by Period
```http
GET /api/salary-slips/employees?month=7&year=2025
```
Returns all employees who have salary data for the specified period.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "employeeId": "EMP-001",
      "name": "John Doe",
      "position_name": "Software Developer",
      "office_name": "Dubai Office",
      "month": 7,
      "year": 2025
    }
  ]
}
```

#### 3. Generate Salary Slip Data
```http
GET /api/salary-slips/{employeeId}/{year}/{month}
```
Returns detailed salary slip data for a specific employee and period.

**Example:** `GET /api/salary-slips/EMP-001/2025/7`

**Response:**
```json
{
  "success": true,
  "data": {
    "employee": {
      "id": "EMP-001",
      "name": "John Doe",
      "position": "Software Developer",
      "office": "Dubai Office"
    },
    "period": {
      "month": 7,
      "year": 2025,
      "monthName": "July"
    },
    "attendance": {
      "totalWorkingDays": 22,
      "presentDays": 20,
      "absentDays": 1,
      "halfDays": 1,
      "latePunchIn": 3,
      "approvedLeaves": 0,
      "excessLeaves": 0
    },
    "salary": {
      "grossSalary": "3000.00",
      "absentHalfDayDeduction": "204.55",
      "excessLeaveDeduction": "0.00",
      "advanceSalary": "500.00",
      "totalDeductions": "704.55",
      "netSalary": "2295.45"
    }
  }
}
```

#### 4. Download Salary Slip PDF
```http
GET /api/salary-slips/{employeeId}/{year}/{month}/pdf
```
Downloads a professionally formatted PDF of the salary slip.

**Example:** `GET /api/salary-slips/EMP-001/2025/7/pdf`

**Response:** Binary PDF file with appropriate headers for download.

## Frontend Usage

### Navigation
The salary slip module is accessible through the main navigation menu:
```html
<li><a href="#" id="salary-slip-link">Salary Slips</a></li>
```

### User Workflow
1. **Select Period**: Choose month/year from dropdown
2. **Filter Employees**: Click "Filter Employees" to load relevant employees
3. **View Slip**: Click "View Salary Slip" for any employee
4. **Download PDF**: Click "Download PDF" to save the salary slip

### JavaScript Integration
The module uses modern JavaScript with async/await for API calls:

```javascript
// Load available periods
const loadAvailablePeriods = async () => {
  const response = await fetch('/api/salary-slips/periods');
  const result = await response.json();
  // Populate dropdown
};

// Generate PDF download
const downloadPDF = async () => {
  const response = await fetch(`/api/salary-slips/${employeeId}/${year}/${month}/pdf`);
  const blob = await response.blob();
  // Create download link
};
```

## Salary Calculations

### Working Days Calculation
```javascript
// UAE weekend: Friday (5) and Saturday (6)
const getWorkingDaysInMonth = (year, month) => {
  // Excludes Fridays and Saturdays
  // Returns total working days in the month
};
```

### Deduction Formula
```javascript
const perDayRate = grossSalary / totalWorkingDays;
const absentHalfDayDeduction = (absentDays + (halfDays * 0.5)) * perDayRate;
const totalDeductions = absentHalfDayDeduction + excessLeaveDeduction + advanceSalary;
const netSalary = grossSalary - totalDeductions;
```

## Database Schema Dependencies

The salary slip module relies on the following tables:

### Core Tables
- `employees`: Employee master data
- `payroll`: Monthly payroll calculations
- `advance_salary`: Advance salary records
- `positions`: Job positions/titles
- `offices`: Office locations

### Key Relationships
```sql
-- Employee with position and office
SELECT e.*, p.name as position_name, o.name as office_name
FROM employees e
LEFT JOIN positions p ON e.position_id = p.id
LEFT JOIN offices o ON e.office_id = o.id

-- Payroll data for specific period
SELECT * FROM payroll 
WHERE employeeId = ? AND month = ? AND year = ?

-- Advance salary for the month
SELECT COALESCE(SUM(amount), 0) as advance_amount
FROM advance_salary 
WHERE employee_id = ? AND month_year = ?
```

## Styling and Responsive Design

### CSS Classes
- `.salary-slip-filters`: Filter controls styling
- `.employee-card`: Individual employee card styling  
- `.salary-slip-preview`: Salary slip display area
- `.salary-table`: Salary breakdown table
- `.salary-row`: Individual salary line items

### Responsive Breakpoints
- **Desktop**: Full grid layout with cards
- **Tablet**: 2-column layout
- **Mobile**: Single column with stacked elements

## Error Handling

The module includes comprehensive error handling:

### Frontend
```javascript
try {
  const response = await fetch('/api/salary-slips/...');
  if (!response.ok) throw new Error('API Error');
  const result = await response.json();
  // Process result
} catch (error) {
  console.error('Error:', error);
  alert('Operation failed. Please try again.');
}
```

### Backend
```javascript
try {
  // Database operations
} catch (error) {
  console.error('Database error:', error);
  res.status(500).json({ error: 'Internal server error' });
}
```

## Security Features

- **JWT Authentication**: All endpoints require valid authentication
- **Input Validation**: Employee ID, month, and year validation
- **SQL Injection Protection**: Parameterized queries
- **Error Information Limiting**: Production mode hides sensitive error details

## File Structure

```
backend/
├── controllers/
│   └── salarySlipController.js    # Main controller logic
├── routes/
│   └── salarySlipRoutes.js        # API route definitions
└── server.js                      # Route registration

src/
├── index.html                     # Frontend HTML structure
├── scripts.js                     # JavaScript functionality
└── styles.css                     # Styling and responsive design
```

## Testing

### Manual Testing Steps
1. **Authentication**: Verify login requirements
2. **Period Loading**: Check dropdown population
3. **Employee Filtering**: Test period-based filtering
4. **Salary Calculation**: Verify calculation accuracy
5. **PDF Generation**: Test download functionality
6. **Responsive Design**: Test on different screen sizes

### API Testing with cURL
```bash
# Get available periods
curl -H "Authorization: Bearer <token>" \
     http://localhost:5000/api/salary-slips/periods

# Get salary slip data
curl -H "Authorization: Bearer <token>" \
     http://localhost:5000/api/salary-slips/EMP-001/2025/7

# Download PDF
curl -H "Authorization: Bearer <token>" \
     -o salary_slip.pdf \
     http://localhost:5000/api/salary-slips/EMP-001/2025/7/pdf
```

## Future Enhancements

### Potential Features
- **Batch PDF Generation**: Generate multiple salary slips at once
- **Email Integration**: Send salary slips via email
- **Template Customization**: Customizable PDF templates
- **Multi-language Support**: Support for different languages
- **Digital Signatures**: Add digital signatures to PDFs
- **Salary Comparison**: Compare salary across months
- **Export Formats**: Excel, Word export options

### Performance Optimizations
- **Caching**: Cache frequently accessed salary data
- **Pagination**: Paginate employee lists for large datasets
- **Background Processing**: Generate PDFs asynchronously
- **Database Indexing**: Optimize database queries

## Troubleshooting

### Common Issues

#### 1. PDF Generation Fails
```
Error: Failed to generate salary slip PDF
```
**Solution**: Check if PDFKit is properly installed and server has write permissions.

#### 2. No Employees Found
```
No employees found for the selected period
```
**Solution**: Verify payroll data exists for the selected month/year.

#### 3. Calculation Errors
```
Salary calculations seem incorrect
```
**Solution**: Check working days calculation and advance salary data.

#### 4. Authentication Issues
```
401 Unauthorized
```
**Solution**: Ensure valid JWT token is included in request headers.

## Support

For technical support or feature requests:
1. Check this documentation first
2. Review the console logs for error details
3. Verify database connectivity and data integrity
4. Test API endpoints individually
5. Check browser network tab for failed requests

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Compatibility**: Node.js 14+, Modern Browsers
