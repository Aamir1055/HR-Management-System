// Legacy JavaScript for PayRoll Management System web interface navigation and functionality
// Handles dashboard statistics, employee listing, salary slip viewing, and PDF generation with DOM manipulation
document.addEventListener('DOMContentLoaded', () => {
    const dashboardLink = document.getElementById('dashboard-link');
    const employeesLink = document.getElementById('employees-link');
    const salarySlipLink = document.getElementById('salary-slip-link');
    const importSampleLink = document.getElementById('import-sample-link');

    const dashboardSection = document.getElementById('dashboard');
    const employeesSection = document.getElementById('employees');
    const salarySlipsSection = document.getElementById('salary-slips');
    const importSampleSection = document.getElementById('import-sample');

    const sections = [dashboardSection, employeesSection, salarySlipsSection, importSampleSection];

    const showSection = (section) => {
        sections.forEach(sec => sec.classList.add('hidden'));
        section.classList.remove('hidden');
    };

    dashboardLink.addEventListener('click', () => {
        showSection(dashboardSection);
        fetchDashboardStats();
    });

    employeesLink.addEventListener('click', () => {
        showSection(employeesSection);
        fetchEmployees();
    });

    salarySlipLink.addEventListener('click', () => {
        showSection(salarySlipsSection);
        initializeSalarySlips();
    });

    importSampleLink.addEventListener('click', () => {
        showSection(importSampleSection);
    });

    const fetchDashboardStats = async () => {
        try {
            const response = await fetch('/dashboard');
            const data = await response.json();

            document.getElementById('total-employees').innerText = data.totalEmployees;
            document.getElementById('active-employees').innerText = data.activeEmployees;
            document.getElementById('total-payroll').innerText = data.totalPayroll.toFixed(2);
            document.getElementById('avg-salary').innerText = data.avgSalary.toFixed(2);
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        }
    };

    const fetchEmployees = async () => {
        try {
            const response = await fetch('/api/employees');
            const employees = await response.json();
            const tableBody = document.getElementById('employee-table-body');
            tableBody.innerHTML = '';
            
            employees.forEach(emp => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${emp.firstName} ${emp.lastName}</td>
                    <td>${emp.email}</td>
                    <td>${emp.department}</td>
                    <td>${emp.position}</td>
                    <td>${emp.hireDate}</td>
                    <td>$${emp.baseSalary.toFixed(2)}</td>
                `;
                tableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Error fetching employees:', error);
        }
    };

    const importForm = document.getElementById('import-form');
    importForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(importForm);
        try {
            const response = await fetch('/import/employees', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            alert(`Imported: ${result.imported}, Errors: ${result.errors.length}`);
        } catch (error) {
            console.error('Error importing employees:', error);
        }
    });

    const generateSampleButton = document.getElementById('generate-sample-data');
    generateSampleButton.addEventListener('click', async () => {
        try {
            const response = await fetch('/generate-sample-data', { method: 'POST' });
            const result = await response.json();
            alert(`Sample data generated. Employees: ${result.employeesCount}, Payrolls: ${result.payrollsCount}`);
        } catch (error) {
            console.error('Error generating sample data:', error);
        }
    });

    // Salary Slip functionality
    let selectedEmployee = null;
    let selectedPeriod = null;

    const initializeSalarySlips = async () => {
        try {
            await loadAvailablePeriods();
            setupSalarySlipEventListeners();
        } catch (error) {
            console.error('Error initializing salary slips:', error);
        }
    };

    const loadAvailablePeriods = async () => {
        try {
            const response = await fetch('/api/salary-slips/periods');
            const result = await response.json();
            
            const periodSelect = document.getElementById('period-select');
            periodSelect.innerHTML = '<option value="">Select Month/Year</option>';
            
            if (result.success && result.data) {
                result.data.forEach(period => {
                    const option = document.createElement('option');
                    option.value = `${period.month}-${period.year}`;
                    option.textContent = period.display;
                    periodSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading available periods:', error);
        }
    };

    const loadEmployeesForPeriod = async (month, year) => {
        try {
            const response = await fetch(`/api/salary-slips/employees?month=${month}&year=${year}`);
            const result = await response.json();
            
            const employeesList = document.getElementById('salary-employees-list');
            employeesList.innerHTML = '';
            
            if (result.success && result.data && result.data.length > 0) {
                result.data.forEach(employee => {
                    const employeeCard = document.createElement('div');
                    employeeCard.className = 'employee-card';
                    employeeCard.innerHTML = `
                        <h4>${employee.name}</h4>
                        <p><strong>ID:</strong> ${employee.employeeId}</p>
                        <p><strong>Position:</strong> ${employee.position_name || 'N/A'}</p>
                        <p><strong>Office:</strong> ${employee.office_name || 'N/A'}</p>
                        <button class="btn btn-primary view-salary-slip" 
                                data-employee-id="${employee.employeeId}" 
                                data-month="${employee.month}" 
                                data-year="${employee.year}">
                            View Salary Slip
                        </button>
                    `;
                    employeesList.appendChild(employeeCard);
                });
            } else {
                employeesList.innerHTML = '<p>No employees found for the selected period.</p>';
            }
        } catch (error) {
            console.error('Error loading employees:', error);
            document.getElementById('salary-employees-list').innerHTML = 
                '<p>Error loading employees. Please try again.</p>';
        }
    };

    const viewSalarySlip = async (employeeId, year, month) => {
        try {
            const response = await fetch(`/api/salary-slips/${employeeId}/${year}/${month}`);
            const result = await response.json();
            
            if (result.success && result.data) {
                displaySalarySlip(result.data, employeeId, year, month);
            } else {
                alert('Error loading salary slip data');
            }
        } catch (error) {
            console.error('Error viewing salary slip:', error);
            alert('Error loading salary slip. Please try again.');
        }
    };

    const displaySalarySlip = (data, employeeId, year, month) => {
        const slipContent = document.getElementById('salary-slip-content');
        slipContent.innerHTML = `
            <div class="salary-slip-header">
                <h2>SALARY SLIP</h2>
                <p><strong>${data.period.monthName} ${data.period.year}</strong></p>
            </div>
            
            <div class="employee-info">
                <h3>Employee Information</h3>
                <div class="info-grid">
                    <div><strong>Emp Id:</strong> ${data.employee.id}</div>
                    <div><strong>Name:</strong> ${data.employee.name}</div>
                    <div><strong>Position:</strong> ${data.employee.position}</div>
                    <div><strong>Office:</strong> ${data.employee.office}</div>
                </div>
            </div>
            
            <div class="attendance-summary">
                <h3>Attendance Summary</h3>
                <div class="info-grid">
                    <div><strong>Working Days:</strong> ${data.attendance.totalWorkingDays}</div>
                    <div><strong>Present Days:</strong> ${data.attendance.presentDays}</div>
                    <div><strong>Absent Days:</strong> ${data.attendance.absentDays}</div>
                    <div><strong>Half Days:</strong> ${data.attendance.halfDays}</div>
                    <div><strong>Late Punch In:</strong> ${data.attendance.latePunchIn}</div>
                    <div><strong>Approved Leaves:</strong> ${data.attendance.approvedLeaves}</div>
                    <div><strong>Excess Leaves:</strong> ${data.attendance.excessLeaves}</div>
                </div>
            </div>
            
            <div class="salary-breakdown">
                <h3>Salary Breakdown</h3>
                <div class="salary-table">
                    <div class="salary-row">
                        <span><strong>Gross Salary:</strong></span>
                        <span><strong>AED ${data.salary.grossSalary}</strong></span>
                    </div>
                    <div class="salary-row">
                        <span>Absent/Half Days Deduction:</span>
                        <span>AED ${data.salary.absentHalfDayDeduction}</span>
                    </div>
                    <div class="salary-row">
                        <span>Excess Leaves Deduction:</span>
                        <span>AED ${data.salary.excessLeaveDeduction}</span>
                    </div>
                    <div class="salary-row">
                        <span>Advance Salary:</span>
                        <span>AED ${data.salary.advanceSalary}</span>
                    </div>
                    <div class="salary-row total-deduction">
                        <span><strong>Total Deductions:</strong></span>
                        <span><strong>AED ${data.salary.totalDeductions}</strong></span>
                    </div>
                    <div class="salary-row net-salary">
                        <span><strong>Net Salary:</strong></span>
                        <span><strong>AED ${data.salary.netSalary}</strong></span>
                    </div>
                </div>
            </div>
        `;
        
        // Store current selection for PDF download
        selectedEmployee = { employeeId, year, month };
        
        // Show the preview
        document.getElementById('salary-slip-preview').classList.remove('hidden');
        slipContent.scrollIntoView({ behavior: 'smooth' });
    };

    const downloadPDF = async () => {
        if (!selectedEmployee) {
            alert('No salary slip selected');
            return;
        }
        
        try {
            const { employeeId, year, month } = selectedEmployee;
            const response = await fetch(`/api/salary-slips/${employeeId}/${year}/${month}/pdf`);
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `salary_slip_${employeeId}_${month}_${year}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            } else {
                alert('Error downloading PDF');
            }
        } catch (error) {
            console.error('Error downloading PDF:', error);
            alert('Error downloading PDF. Please try again.');
        }
    };

    const setupSalarySlipEventListeners = () => {
        // Filter employees button
        document.getElementById('filter-employees').addEventListener('click', () => {
            const periodSelect = document.getElementById('period-select');
            const selectedValue = periodSelect.value;
            
            if (selectedValue) {
                const [month, year] = selectedValue.split('-');
                loadEmployeesForPeriod(month, year);
            } else {
                alert('Please select a period first');
            }
        });
        
        // View salary slip buttons (using event delegation)
        document.getElementById('salary-employees-list').addEventListener('click', (e) => {
            if (e.target.classList.contains('view-salary-slip')) {
                const employeeId = e.target.getAttribute('data-employee-id');
                const month = e.target.getAttribute('data-month');
                const year = e.target.getAttribute('data-year');
                viewSalarySlip(employeeId, year, month);
            }
        });
        
        // Download PDF button
        document.getElementById('download-pdf').addEventListener('click', downloadPDF);
        
        // Close preview button
        document.getElementById('close-preview').addEventListener('click', () => {
            document.getElementById('salary-slip-preview').classList.add('hidden');
            selectedEmployee = null;
        });
    };

    // Initialize dashboard
    dashboardLink.click();
});
