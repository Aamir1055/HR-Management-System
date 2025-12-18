# Employee Loan Management System

## Overview

The Employee Loan Management System is a comprehensive module integrated into the payroll management system that allows companies to track and manage loans provided to employees. The system automatically calculates and deducts loan payments from employee salaries and displays these deductions on salary slips.

## Features

### Core Functionality
- **Loan Creation**: Create loans for employees with customizable terms
- **Automatic Payment Processing**: Automatic loan payment deductions during payroll processing
- **Payment History**: Track all loan payments and remaining balances
- **Status Management**: Track loan status (active, completed, suspended)
- **Salary Slip Integration**: Loan deductions appear automatically on salary slips
- **PDF Integration**: Loan deductions are included in PDF salary slips

### Key Components

#### Database Tables

1. **employee_loans**
   - `id`: Primary key
   - `employee_id`: Foreign key to employees table
   - `title`: Loan title/description
   - `total_amount`: Original loan amount
   - `monthly_deduction`: Amount to deduct per month
   - `description`: Loan details
   - `start_date`: When loan payments begin
   - `end_date`: Calculated end date based on total amount and monthly deduction
   - `status`: active/completed/suspended
   - `remaining_amount`: Current remaining balance
   - `created_by`: Who created the loan
   - `created_at`, `updated_at`: Timestamps

2. **loan_payments**
   - `id`: Primary key
   - `loan_id`: Foreign key to employee_loans
   - `employee_id`: Foreign key to employees
   - `payment_date`: Date of payment
   - `amount_paid`: Amount deducted
   - `remaining_balance`: Balance after payment
   - `payroll_month`: Month format (YYYY-MM)
   - `created_at`: Timestamp

## API Endpoints

### Loan Management

#### GET /api/loans
Get all loans with optional filtering
- **Query Parameters**: `status`, `employee_id`
- **Auth Required**: Yes
- **Role Required**: Any authenticated user

```javascript
// Example Response
[
  {
    "id": 1,
    "employee_id": "EMP-196",
    "employee_name": "SYED SAHIDUL ISLAM",
    "title": "Personal Loan",
    "total_amount": 5000.00,
    "monthly_deduction": 500.00,
    "remaining_amount": 4500.00,
    "status": "active",
    "computed_status": "active",
    "total_paid": 500.00,
    "payment_count": 1
  }
]
```

#### GET /api/loans/:id
Get specific loan with payment history
- **Auth Required**: Yes
- **Role Required**: Any authenticated user

#### POST /api/loans
Create a new loan
- **Auth Required**: Yes
- **Role Required**: Manager or above
- **Body Parameters**:
  - `employee_id` (required): Employee ID
  - `title` (required): Loan title
  - `total_amount` (required): Total loan amount
  - `monthly_deduction` (required): Monthly deduction amount
  - `description` (optional): Loan description
  - `start_date` (required): Start date (YYYY-MM-DD)

```javascript
// Example Request
{
  "employee_id": "EMP-196",
  "title": "Personal Loan",
  "total_amount": 5000.00,
  "monthly_deduction": 500.00,
  "description": "Emergency loan for medical expenses",
  "start_date": "2025-08-01"
}
```

#### PUT /api/loans/:id
Update loan details
- **Auth Required**: Yes
- **Role Required**: Manager or above

#### DELETE /api/loans/:id
Delete loan (only if no payments made)
- **Auth Required**: Yes
- **Role Required**: Manager or above

### Employee-Specific Endpoints

#### GET /api/loans/employee/:employee_id/active
Get active loans for an employee (used for payroll calculation)
- **Query Parameters**: `payroll_month` (required, format: YYYY-MM)
- **Auth Required**: Yes

#### GET /api/loans/employee/:employee_id/summary
Get loan summary for an employee
- **Auth Required**: Yes

### Payment Management

#### POST /api/loans/payments
Record a loan payment manually
- **Auth Required**: Yes
- **Role Required**: Manager or above
- **Body Parameters**:
  - `loan_id` (required): Loan ID
  - `amount_paid` (required): Amount paid
  - `payroll_month` (required): Month (YYYY-MM)
  - `payment_date` (optional): Payment date

## Integration with Salary Slips

The loan system is fully integrated with the salary slip generation process:

### Automatic Deduction Calculation
When generating salary slips, the system:
1. Finds all active loans for the employee
2. Checks if payment has already been made for the current month
3. Calculates the deduction amount (minimum of monthly_deduction and remaining_amount)
4. Includes the deduction in total salary deductions

### Salary Slip Display
Loan deductions appear in salary slips as:
- **JSON Response**: `deductions.loanDeductions` with detailed `loanDetails` array
- **PDF Output**: Separate "Loan Deductions" section with individual loan breakdowns

### Payment Recording
When salary is processed, loan payments are automatically recorded, updating:
- Loan remaining balance
- Loan status (if fully paid)
- Payment history

## Setup Instructions

### 1. Database Migration
Run the migration to create loan tables:
```bash
node migrations/create_employee_loans_table.js
```

### 2. Server Configuration
The loan routes are automatically included in `server.js`:
```javascript
app.use('/api/loans', loanRoutes);
```

### 3. Test Data Creation
Create sample loan data for testing:
```bash
node test_loan_functionality.js
```

## Usage Examples

### Creating a New Loan
```bash
curl -X POST http://localhost:5000/api/loans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "employee_id": "EMP-196",
    "title": "Personal Loan",
    "total_amount": 5000.00,
    "monthly_deduction": 500.00,
    "description": "Emergency medical loan",
    "start_date": "2025-08-01"
  }'
```

### Getting Active Loans for Salary Calculation
```bash
curl -X GET "http://localhost:5000/api/loans/employee/EMP-196/active?payroll_month=2025-08" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Viewing All Loans
```bash
curl -X GET http://localhost:5000/api/loans \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Business Logic

### Loan Payment Calculation
- **Amount**: Minimum of monthly_deduction and remaining_amount
- **Timing**: Payments are processed during salary generation
- **Completion**: Loan status changes to 'completed' when remaining_amount reaches 0

### Payment Prevention
- Duplicate payments for the same month are prevented by unique constraint
- Payments cannot exceed remaining loan balance
- Completed loans are excluded from future deductions

### Status Management
- **Active**: Loan is being paid
- **Completed**: Fully paid off
- **Suspended**: Temporarily paused
- **Pending**: Start date in future

## Security Considerations

### Role-Based Access
- **Viewing**: All authenticated users can view loans
- **Creating/Editing**: Manager role or above required
- **Deleting**: Manager role or above, only if no payments made

### Data Validation
- All monetary amounts must be positive
- Monthly deduction cannot exceed total amount
- Employee must exist before loan creation
- Start date validation
- Status enumeration enforcement

## Error Handling

### Common Error Scenarios
- **400 Bad Request**: Invalid input data, validation failures
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Insufficient role permissions
- **404 Not Found**: Employee or loan not found
- **500 Internal Server Error**: Database or system errors

### Duplicate Payment Prevention
```javascript
// Handled automatically by unique constraint
{
  "error": "Payment for this loan in the specified month has already been recorded"
}
```

## Performance Considerations

### Database Optimization
- Indexes on employee_id, loan_id, payroll_month
- Foreign key relationships for data integrity
- Efficient queries using JOINs and subqueries

### Calculation Efficiency
- Loan deductions calculated only once per salary generation
- Cached results in salary slip data structure
- Minimal database queries during payroll processing

## Future Enhancements

### Potential Features
- **Interest Calculation**: Add interest rates and compound calculations
- **Payment Schedules**: Flexible payment schedules (bi-weekly, quarterly)
- **Loan Types**: Different loan categories with varying terms
- **Approval Workflow**: Multi-step approval process for loans
- **Reporting**: Comprehensive loan reports and analytics
- **Notifications**: Alert system for upcoming payments or defaults

### Integration Opportunities
- **Accounting System**: Export loan data to accounting software
- **HR Portal**: Employee self-service loan requests
- **Mobile App**: Mobile access to loan information
- **Document Management**: Loan agreements and documentation storage

## Testing

### Unit Tests
Test coverage should include:
- Loan CRUD operations
- Payment calculation logic
- Status transitions
- Integration with salary processing

### Integration Tests
- Salary slip generation with loans
- Payment recording during payroll
- PDF generation with loan deductions

### Sample Test Data
The `test_loan_functionality.js` script creates sample loans for testing all scenarios.

## Troubleshooting

### Common Issues

1. **Loans not appearing in salary slips**
   - Check loan status is 'active'
   - Verify start_date is not in future
   - Ensure remaining_amount > 0
   - Confirm payroll_month format (YYYY-MM)

2. **Duplicate payment errors**
   - Check if payment already recorded for the month
   - Review loan_payments table for existing entries

3. **Incorrect deduction amounts**
   - Verify monthly_deduction vs remaining_amount calculation
   - Check for rounding issues in monetary calculations

### Debug Queries
```sql
-- Check active loans for employee
SELECT * FROM employee_loans 
WHERE employee_id = 'EMP-196' AND status = 'active';

-- Check payment history
SELECT * FROM loan_payments 
WHERE employee_id = 'EMP-196' 
ORDER BY payment_date DESC;

-- Check loans due for payment in specific month
SELECT el.*, lp.loan_id as already_paid
FROM employee_loans el
LEFT JOIN loan_payments lp ON el.id = lp.loan_id AND lp.payroll_month = '2025-08'
WHERE el.employee_id = 'EMP-196' AND el.status = 'active';
```

## Support

For technical support or questions about the Employee Loan Management System:
1. Check this documentation
2. Review API endpoints and examples
3. Test with sample data using provided scripts
4. Check server logs for detailed error information

---

**Version**: 1.0.0  
**Last Updated**: August 2025  
**Author**: Payroll Management System Team
