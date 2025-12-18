# PowerShell script to update production server with export improvements
# Run this script to apply the same changes to the production server

Write-Host "🔄 Updating production server with export improvements..." -ForegroundColor Green

# First, let's create the updated export function content
$exportFunction = @'
  // Export employees to Excel with same format as database
  exportEmployees: async (req, res) => {
    try {
      const { buildOfficeFilter } = require('../middleware/auth');
      const { whereClause, params } = buildOfficeFilter(req, 'e');
      
      let sql = `
        SELECT e.*, o.name AS office_name, p.title AS position_title,
               op.reporting_time, op.duty_hours, e.visa_type AS visa_type_name
        FROM employees e
        LEFT JOIN offices o ON e.office_id = o.id
        LEFT JOIN positions p ON e.position_id = p.id
        LEFT JOIN office_positions op ON e.office_id = op.office_id AND e.position_id = op.position_id
      `;
      
      if (whereClause) {
        sql += ` WHERE ${whereClause}`;
      }
      
      sql += ` ORDER BY CAST(e.employeeId AS UNSIGNED), e.employeeId`;
      
      const [employees] = await req.db.query(sql, params);
      
      // Helper function to format dates to DD/MM/YYYY for export
      const formatDateForExport = (dateStr) => {
        if (!dateStr) return '';
        
        try {
          let date;
          
          // Handle different input formats
          if (typeof dateStr === 'string') {
            // If it's already in YYYY-MM-DD format (from database)
            if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
              const [year, month, day] = dateStr.split('-');
              return `${day}/${month}/${year}`;
            }
            // If it's in YYYY/MM/DD format
            else if (dateStr.match(/^\d{4}\/\d{2}\/\d{2}$/)) {
              const [year, month, day] = dateStr.split('/');
              return `${day}/${month}/${year}`;
            }
            // If it's already in DD/MM/YYYY format, return as is
            else if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
              return dateStr;
            }
            // Try to parse as a general date
            else {
              date = new Date(dateStr);
            }
          } else {
            date = new Date(dateStr);
          }
          
          // If we have a valid date object, format it
          if (date && !isNaN(date.getTime())) {
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
          }
          
          return dateStr; // Return original if can't format
        } catch (error) {
          console.warn(`Warning: Could not format date '${dateStr}':`, error.message);
          return dateStr;
        }
      };
      
      // Format data for export - only specific columns in exact order as requested
      const exportData = employees.map(emp => ({
        'Employee ID': emp.employeeId,
        'First Name': emp.first_name || '',
        'Last Name': emp.last_name || '',
        'Date of Birth': formatDateForExport(emp.dob),
        'Date of Joining': formatDateForExport(emp.joiningDate),
        'Nationality': emp.nationality || '',
        'Passport Number': emp.passport_number || '',
        'Passport Expiry': formatDateForExport(emp.passport_expiry),
        'Visa Type': emp.visa_type_name || emp.visa_type || '',
        'Visa Expiry': formatDateForExport(emp.visa_expiry),
        'Office': emp.office_name || '',
        'Platform': emp.platform || '',
        'Position': emp.position_title || '',
        'Monthly Salary': emp.monthlySalary || 0,
        'Email': emp.email || '',
        'Phone': emp.phone || '',
        'WhatsApp': emp.whatsapp || '',
        'Gender': emp.gender || '',
        'Marital Status': emp.marital_status || '',
        'Primary Language': emp.primary_language || '',
        'Secondary Language': emp.secondary_language || '',
        'Hiring Source': emp.hiring_source || '',
        'Current Address': emp.current_address || '',
        'Emergency Contact Relation': emp.emergency_contact_relation || '',
        'Status': emp.status === 1 ? 'Active' : 'Inactive'
      }));
      
      // Create Excel file
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, 'Employees');
      
      // Set response headers for file download
      const fileName = `employees_${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      // Send the Excel file
      res.end(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
      
    } catch (err) {
      console.error('Export error:', err);
      res.status(500).json({ error: 'Failed to export employees: ' + err.message });
    }
  }
'@

Write-Host "📝 Export function content prepared" -ForegroundColor Yellow

Write-Host ""
Write-Host "🚀 Manual Steps to Update Production Server:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. SSH into your production server:" -ForegroundColor White
Write-Host "   ssh deployer@your-server-ip" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Navigate to the backend directory:" -ForegroundColor White
Write-Host "   cd ~/HR-Management-System/backend" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Create a backup of the current file:" -ForegroundColor White
Write-Host "   cp controllers/employeeController.js controllers/employeeController.js.backup" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Find the exportEmployees function and replace it with the updated version" -ForegroundColor White
Write-Host "   The key changes are:" -ForegroundColor Gray
Write-Host "   - ORDER BY CAST(e.employeeId AS UNSIGNED), e.employeeId" -ForegroundColor Yellow
Write-Host "   - DD/MM/YYYY date formatting" -ForegroundColor Yellow
Write-Host "   - Specific column selection and ordering" -ForegroundColor Yellow
Write-Host ""
Write-Host "5. Restart the backend service:" -ForegroundColor White
Write-Host "   pm2 restart backend" -ForegroundColor Gray
Write-Host ""
Write-Host "6. Test the export functionality" -ForegroundColor White
Write-Host ""

# Save the updated function to a file that can be transferred
$exportFunction | Out-File -FilePath "updated_export_function.txt" -Encoding UTF8

Write-Host "✅ Updated export function saved to 'updated_export_function.txt'" -ForegroundColor Green
Write-Host "   You can copy this content to replace the exportEmployees function in production" -ForegroundColor Gray
