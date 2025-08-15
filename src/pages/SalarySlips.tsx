import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MainLayout } from '../components/Layout/MainLayout';
import { api } from '../utils/api';
import { toast } from 'react-toastify';
import { DirhamIcon } from '../components/Icons/DirhamIcon';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import SalarySlipDataTable from '../components/SalarySlips/SalarySlipDataTable';
import { 
  FileText, 
  Download, 
  Calendar, 
  User, 
  Building, 
  Search, 
  Users, 
  Filter,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';

// Types
interface Employee {
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  office_name: string;
  position_title: string;
  joiningDate: string;
  monthlySalary: number;
  status: number;
}

// Simplified Salary Slip interface for the new display format
interface SimplifiedSalarySlip {
  employeeId: string;
  name: string;
  position: string;
  workingDays: number;
  absentDays: number; // includes half days as decimal (e.g., 3.5)
  latePunchIn: number; // renamed from lateDays
  excessLeaves: number;
  grossSalary: number; // monthly salary
  absentDeduction: number; // deduction for absent and half days
  excessLeaveDeduction?: number; // deduction for excess leaves (calculated from excessLeaves * perDayRate)
  advanceSalary: number;
  loanDeductions?: number; // loan deduction amount (plural to match backend)
  totalDeduction: number;
  netSalary: number;
}

// Legacy interface for backward compatibility
interface SalarySlipData {
  employee: {
    employeeId: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    office_name: string;
    position_title: string;
    joiningDate: string;
  };
  period: {
    year: number;
    month: number;
    monthName: string;
    fromDate: string;
    toDate: string;
  };
  attendance: {
    workingDays: number;
    presentDays: number;
    absentDays: number;
    halfDays: number;
    lateDays: number;
    excessLeaves: number;
    approvedLeaves: number;
    missingDays: number;
    dayStatus?: Array<{ date: string; status: string; hours?: number }>;
  };
  salary: {
    baseSalary: number;
    perDaySalary: number;
    grossSalary: number;
    totalDeductions: number;
    netSalary: number;
    advanceSalary: number;
  };
  deductions: {
    absentDeduction: number;
    approvedLeaveDeduction: number;
    halfDayDeduction: number;
    excessLeaveDeduction: number;
    missingDayDeduction: number;
    advanceDeduction: number;
    loanDeductions: number;
    loanDetails?: Array<{
      id: number;
      title: string;
      deduction: number;
      remainingAfter: number;
    }>;
  };
  metadata?: {
    generatedAt: string;
    generatedBy: string;
    workingDaysSource: string;
    timezone: string;
  };
}

interface FilterState {
  searchTerm: string;
  selectedOffice: string;
  selectedPosition: string;
  selectedEmployee: string;
  month: string;
  year: string;
}

interface LoadingState {
  employees: boolean;
  single: boolean;
  all: boolean;
  export: boolean;
}

// Utility functions
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    minimumFractionDigits: 2,
  }).format(amount);
};

const getDisplayName = (
  item: any,
  nameKey: string = 'name',
  fallbackKey?: string
): string => {
  if (typeof item === 'object' && item?.[nameKey]) return item[nameKey];
  if (typeof item === 'object' && fallbackKey && item?.[fallbackKey])
    return item[fallbackKey];
  return String(item);
};

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Custom hooks
const useFilters = (initialState: FilterState) => {
  const [filters, setFilters] = useState<FilterState>(initialState);

  const updateFilter = useCallback((key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      ...initialState,
      year: filters.year, // Keep year and month when clearing other filters
      month: filters.month,
    });
  }, [initialState, filters.year, filters.month]);

  return { filters, updateFilter, clearFilters };
};

const useEmployeeData = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [offices, setOffices] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      };

      // Parallel fetch for better performance
      const [employeesResponse, officesResponse, positionsResponse] = await Promise.allSettled([
        api.get('/employees'),
        fetch('http://localhost:5000/api/masters/offices', { headers }).then(r => r.ok ? r.json() : []),
        fetch('http://localhost:5000/api/masters/positions', { headers }).then(r => r.ok ? r.json() : [])
      ]);

      // Handle employees
      if (employeesResponse.status === 'fulfilled') {
        const employeesData = employeesResponse.value.data;
        // Handle the new API response structure
        const employeeList = employeesData?.success ? employeesData.data : (employeesData?.data || employeesData || []);
        setEmployees(Array.isArray(employeeList) ? employeeList : []);
      } else {
        console.error('Failed to fetch employees:', employeesResponse.reason);
      }

      // Handle offices
      if (officesResponse.status === 'fulfilled') {
        setOffices(Array.isArray(officesResponse.value) ? officesResponse.value : []);
      } else {
        console.error('Failed to fetch offices:', officesResponse.reason);
      }

      // Handle positions
      if (positionsResponse.status === 'fulfilled') {
        setPositions(Array.isArray(positionsResponse.value) ? positionsResponse.value : []);
      } else {
        console.error('Failed to fetch positions:', positionsResponse.reason);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load employee data');
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { employees, offices, positions, loading, error, refetch: fetchData };
};

// Main component
export const SalarySlips: React.FC = () => {
  // State
  const { employees, offices, positions, loading: dataLoading } = useEmployeeData();
  const { filters, updateFilter, clearFilters } = useFilters({
    searchTerm: '',
    selectedOffice: '',
    selectedPosition: '',
    selectedEmployee: '',
    month: '',
    year: new Date().getFullYear().toString(),
  });

  const [employeeId, setEmployeeId] = useState<string>('');

  // Legacy state for backward compatibility
  const [salarySlip, setSalarySlip] = useState<SalarySlipData | null>(null);
  const [allSalarySlips, setAllSalarySlips] = useState<SalarySlipData[] | null>(null);
  
  // New simplified salary slip state
  const [simplifiedSalarySlips, setSimplifiedSalarySlips] = useState<SimplifiedSalarySlip[] | null>(null);
  const [loading, setLoading] = useState<LoadingState>({
    employees: false,
    single: false,
    all: false,
    export: false,
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Memoized filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const matchesSearch =
        filters.searchTerm === '' ||
        (employee.employeeId && employee.employeeId.toLowerCase().includes(filters.searchTerm.toLowerCase())) ||
        (employee.name && employee.name.toLowerCase().includes(filters.searchTerm.toLowerCase())) ||
        (employee.email && employee.email.toLowerCase().includes(filters.searchTerm.toLowerCase())) ||
        (employee.phone && employee.phone.toLowerCase().includes(filters.searchTerm.toLowerCase())) ||
        (employee.office_name && employee.office_name.toLowerCase().includes(filters.searchTerm.toLowerCase())) ||
        (employee.position_title && employee.position_title.toLowerCase().includes(filters.searchTerm.toLowerCase())) ||
        (employee.monthlySalary && employee.monthlySalary.toString().includes(filters.searchTerm));

      const matchesOffice =
        filters.selectedOffice === '' ||
        (employee.office_name && employee.office_name === filters.selectedOffice);

      const matchesPosition =
        filters.selectedPosition === '' ||
        (employee.position_title && employee.position_title === filters.selectedPosition);

      return matchesSearch && matchesOffice && matchesPosition;
    });
  }, [employees, filters]);

  // Memoized filtered positions based on selected office with deduplication
  const filteredPositions = useMemo(() => {
    let basePositions = positions;
    
    // If office is selected, filter positions based on employees in that office
    if (filters.selectedOffice && employees.length > 0) {
      const positionsInOffice = [...new Set(employees
        .filter(emp => emp.office_name === filters.selectedOffice)
        .map(emp => emp.position_title)
        .filter(Boolean)
      )];
      
      basePositions = positions.filter(pos => {
        const positionName = typeof pos === 'object' 
          ? (pos.position_name || pos.position_title || pos.title || pos.name)
          : String(pos);
        return positionsInOffice.includes(positionName);
      });
    }
    
    // Deduplicate positions by name
    const uniquePositions = [];
    const seenNames = new Set();
    
    for (const position of basePositions) {
      const positionName = typeof position === 'object' 
        ? (position.position_name || position.position_title || position.title || position.name)
        : String(position);
      
      if (!seenNames.has(positionName)) {
        seenNames.add(positionName);
        uniquePositions.push(position);
      }
    }
    
    return uniquePositions;
  }, [filters.selectedOffice, positions, employees]);

  // Memoized pagination for both employees and salary slips
  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedEmployees = filteredEmployees.slice(startIndex, startIndex + itemsPerPage);
    
    return { totalPages, startIndex, paginatedEmployees };
  }, [filteredEmployees, itemsPerPage, currentPage]);

  // Memoized pagination for salary slips
  const salarySlipsPaginationData = useMemo(() => {
    if (!simplifiedSalarySlips || simplifiedSalarySlips.length === 0) {
      return { totalPages: 0, startIndex: 0, paginatedSlips: [] };
    }
    
    const totalPages = Math.ceil(simplifiedSalarySlips.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedSlips = simplifiedSalarySlips.slice(startIndex, startIndex + itemsPerPage);
    
    return { totalPages, startIndex, paginatedSlips };
  }, [simplifiedSalarySlips, itemsPerPage, currentPage]);

  // Effect to reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.searchTerm, filters.selectedOffice, filters.selectedPosition]);

  // Effect to reset position when office changes
  useEffect(() => {
    if (filters.selectedOffice === '') {
      updateFilter('selectedPosition', '');
    }
  }, [filters.selectedOffice, updateFilter]);

  // Combined effect to handle auto-generation when filters or month/year change
  useEffect(() => {
    // Always clear existing salary slips data when any filter changes
    setSimplifiedSalarySlips(null);
    setAllSalarySlips(null);
    setSalarySlip(null);
    
    // Auto-generate salary slips if both month and year are selected and we have filtered employees
    if (filters.month && filters.year && filteredEmployees.length > 0) {
      // Small delay to ensure state is cleared first
      setTimeout(() => {
        handleGenerateAllSlips();
      }, 150);
    }
  }, [filters.month, filters.year, filters.searchTerm, filters.selectedOffice, filters.selectedPosition, filteredEmployees.length]);

  // Loading state helper
  const setLoadingState = useCallback((key: keyof LoadingState, value: boolean) => {
    setLoading(prev => ({ ...prev, [key]: value }));
  }, []);

  // Get selected employee for single slip generation
  const selectedEmployeeForSlip = useMemo(() => {
    return employees.find(emp => emp.employeeId === employeeId);
  }, [employees, employeeId]);

  // Validation helper
  const validateSlipGeneration = useCallback((requireEmployee: boolean = true) => {
    if (requireEmployee && !employeeId) {
      toast.error('Please enter an employee ID');
      return false;
    }
    if (requireEmployee && !selectedEmployeeForSlip) {
      toast.error('Employee ID not found');
      return false;
    }
    if (!filters.month || !filters.year) {
      toast.error('Please select month and year');
      return false;
    }
    return true;
  }, [employeeId, selectedEmployeeForSlip, filters.month, filters.year]);

  // API call handlers
  const handleGenerateSlip = useCallback(async () => {
    if (!validateSlipGeneration()) return;

    setLoadingState('single', true);
    try {
    const response = await api.get(
        `/salary-slips/generate/${employeeId}?year=${filters.year}&month=${filters.month}`
      );
      
      setSalarySlip(response.data.data);
      setAllSalarySlips(null); // Clear all slips when generating single
      setSimplifiedSalarySlips(null); // Clear simplified slips when generating single
      toast.success('Salary slip generated successfully');
    } catch (error: any) {
      console.error('Error generating salary slip:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to generate salary slip';
      toast.error(errorMessage);
    } finally {
      setLoadingState('single', false);
    }
  }, [employeeId, filters.year, filters.month, validateSlipGeneration, setLoadingState]);

  const handleGenerateAllSlips = useCallback(async () => {
    if (!validateSlipGeneration(false)) return;

    setLoadingState('all', true);
    try {
      const employeeIds = filteredEmployees.map(emp => emp.employeeId);
      
      // Use POST for large employee lists to avoid URL length limits
      const shouldUsePost = employeeIds.length > 50; // Threshold for switching to POST
      
      let response;
      if (shouldUsePost) {
        console.log(`Using POST request for ${employeeIds.length} employees to avoid URL length limits`);
        // Use POST request with employee IDs in body
        response = await api.post('/salary-slips/simplified/generate-all', {
          year: filters.year,
          month: filters.month,
          employeeIds: employeeIds,
          search: filters.searchTerm || undefined,
          office: filters.selectedOffice || undefined,
          position: filters.selectedPosition || undefined
        });
      } else {
        // Use GET request for smaller lists
        const queryParams = new URLSearchParams({
          year: filters.year,
          month: filters.month
        });
        
        // Send filtered employee IDs to ensure backend uses correct set
        if (employeeIds.length > 0) {
          queryParams.append('employeeIds', employeeIds.join(','));
        }
        
        // Add individual filter parameters for debugging
        if (filters.searchTerm) queryParams.append('search', filters.searchTerm);
        if (filters.selectedOffice) queryParams.append('office', filters.selectedOffice);
        if (filters.selectedPosition) queryParams.append('position', filters.selectedPosition);
        
        response = await api.get(
          `/salary-slips/simplified/generate-all?${queryParams.toString()}`
        );
      }
      
      const slipsData = response.data.data || response.data || [];
      
      setSimplifiedSalarySlips(slipsData);
      // Clear legacy state
      setAllSalarySlips(null);
      setSalarySlip(null);
      
      // Salary slips generated silently without notifications
    } catch (error: any) {
      console.error('Error generating all salary slips:', error);
      console.error('Full error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to generate salary slips';
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setLoadingState('all', false);
    }
  }, [filters.year, filters.month, filters.searchTerm, filters.selectedOffice, filters.selectedPosition, validateSlipGeneration, setLoadingState, filteredEmployees, employees]);

  // Export handlers
  const exportToPDF = useCallback((slip: SalarySlipData) => {
    setLoadingState('export', true);
    
    try {
      // Create enhanced printable HTML content
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Salary Slip - ${slip.employee.name}</title>
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              margin: 20px; 
              color: #333; 
              line-height: 1.6;
            }
            .header { 
              text-align: center; 
              border-bottom: 3px solid #2563eb; 
              padding-bottom: 15px; 
              margin-bottom: 25px; 
            }
            .header h1 {
              color: #2563eb;
              margin: 0;
              font-size: 28px;
            }
            .header p {
              margin: 5px 0;
              color: #666;
              font-size: 16px;
            }
            .employee-info { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 25px; 
              margin-bottom: 25px;
              padding: 20px;
              background-color: #f8fafc;
              border-radius: 8px;
            }
            .info-section h3 {
              color: #1e40af;
              margin-top: 0;
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 8px;
            }
            .info-item {
              margin-bottom: 8px;
            }
            .info-item strong {
              display: inline-block;
              width: 120px;
              color: #374151;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 20px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            th, td { 
              border: 1px solid #e5e7eb; 
              padding: 12px; 
              text-align: left; 
            }
            th { 
              background-color: #f3f4f6; 
              font-weight: 600;
              color: #374151;
            }
            .amount { 
              text-align: right; 
              font-weight: 500;
            }
            .gross-salary-row { 
              font-weight: bold; 
              background-color: #dcfce7;
              color: #166534;
            }
            .total-deduction-row {
              font-weight: bold;
              background-color: #fef2f2;
              color: #dc2626;
            }
            .net-salary-row {
              background-color: #dbeafe;
              color: #1d4ed8;
              font-size: 16px;
              font-weight: bold;
            }
            .deduction-row {
              background-color: #fef2f2;
            }
            .metadata {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
              font-size: 12px;
              color: #6b7280;
            }
            .status-badge {
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 500;
            }
            .status-present { background-color: #dcfce7; color: #166534; }
            .status-absent { background-color: #fecaca; color: #dc2626; }
            .status-late { background-color: #fed7aa; color: #ea580c; }
            .status-half { background-color: #fef3c7; color: #d97706; }
            .status-approved { background-color: #ddd6fe; color: #7c3aed; }
            @media print {
              body { margin: 0; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>SALARY SLIP</h1>
            <p>For the month of ${slip.period.monthName} ${slip.period.year}</p>
            ${slip.metadata?.workingDaysSource ? `<p style="font-size:12px;">Working Days Source: ${slip.metadata.workingDaysSource}</p>` : ''}
          </div>
          
          <div class="employee-info">
            <div class="info-section">
              <h3>Employee Information</h3>
              <div class="info-item"><strong>Employee ID:</strong> ${slip.employee.employeeId}</div>
              <div class="info-item"><strong>Name:</strong> ${slip.employee.name}</div>
              <div class="info-item"><strong>Position:</strong> ${slip.employee.position_title || 'N/A'}</div>
              <div class="info-item"><strong>Office:</strong> ${slip.employee.office_name || 'N/A'}</div>
              <div class="info-item"><strong>Email:</strong> ${slip.employee.email || 'N/A'}</div>
              <div class="info-item"><strong>Phone:</strong> ${slip.employee.phone || 'N/A'}</div>
            </div>
            <div class="info-section">
              <h3>Attendance Summary</h3>
              <div class="info-item"><strong>Working Days:</strong> ${slip.attendance.workingDays}</div>
              <div class="info-item"><strong>Present Days:</strong> ${slip.attendance.presentDays}</div>
              <div class="info-item"><strong>Absent Days:</strong> ${slip.attendance.absentDays}</div>
              <div class="info-item"><strong>Half Days:</strong> ${slip.attendance.halfDays}</div>
              <div class="info-item"><strong>Late Days:</strong> ${slip.attendance.lateDays}</div>
              <div class="info-item"><strong>Approved Leaves:</strong> ${slip.attendance.approvedLeaves}</div>
              <div class="info-item"><strong>Excess Leaves:</strong> ${slip.attendance.excessLeaves}</div>
              <div class="info-item"><strong>Missing Days:</strong> ${slip.attendance.missingDays}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="amount">Amount (AED)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Basic Salary</td>
                <td class="amount">${slip.salary.baseSalary.toFixed(2)}</td>
              </tr>
              <tr class="gross-salary-row">
                <td><strong>Gross Salary</strong></td>
                <td class="amount"><strong>${slip.salary.grossSalary.toFixed(2)}</strong></td>
              </tr>
              <tr style="height: 10px;"><td colspan="2"></td></tr>
              <tr>
                <td colspan="2"><strong>Deductions</strong></td>
              </tr>
              ${slip.deductions.absentDeduction > 0 ? `<tr class="deduction-row"><td>Absent Days Deduction</td><td class="amount">${slip.deductions.absentDeduction.toFixed(2)}</td></tr>` : ''}
              ${slip.deductions.approvedLeaveDeduction > 0 ? `<tr class="deduction-row"><td>Approved Leave Deduction</td><td class="amount">${slip.deductions.approvedLeaveDeduction.toFixed(2)}</td></tr>` : ''}
              ${slip.deductions.halfDayDeduction > 0 ? `<tr class="deduction-row"><td>Half Day Deduction</td><td class="amount">${slip.deductions.halfDayDeduction.toFixed(2)}</td></tr>` : ''}
              ${slip.deductions.excessLeaveDeduction > 0 ? `<tr class="deduction-row"><td>Excess Leave Deduction (2x)</td><td class="amount">${slip.deductions.excessLeaveDeduction.toFixed(2)}</td></tr>` : ''}
              ${slip.deductions.missingDayDeduction > 0 ? `<tr class="deduction-row"><td>Missing Day Deduction</td><td class="amount">${slip.deductions.missingDayDeduction.toFixed(2)}</td></tr>` : ''}
              ${slip.deductions.advanceDeduction > 0 ? `<tr class="deduction-row"><td>Advance Salary Deduction</td><td class="amount">${slip.deductions.advanceDeduction.toFixed(2)}</td></tr>` : ''}
              <tr class="total-deduction-row">
                <td><strong>Total Deductions</strong></td>
                <td class="amount"><strong>${slip.salary.totalDeductions.toFixed(2)}</strong></td>
              </tr>
              <tr class="net-salary-row">
                <td><strong>NET SALARY</strong></td>
                <td class="amount"><strong>${slip.salary.netSalary.toFixed(2)}</strong></td>
              </tr>
            </tbody>
          </table>

        </body>
        </html>
      `;

      // Open print window
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        
        // Wait for content to load before printing
        setTimeout(() => {
          printWindow.print();
        }, 250);
      } else {
        toast.error('Please allow popups to export PDF');
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    } finally {
      setLoadingState('export', false);
    }
  }, [setLoadingState]);

  const handleExportSingle = useCallback(() => {
    if (salarySlip) {
      exportToPDF(salarySlip);
    }
  }, [salarySlip, exportToPDF]);

  const handleExportAll = useCallback(() => {
    if (allSalarySlips && allSalarySlips.length > 0) {
      allSalarySlips.forEach((slip, index) => {
        setTimeout(() => exportToPDF(slip), index * 500); // Stagger exports
      });
    }
  }, [allSalarySlips, exportToPDF]);

  // Individual salary slip export for simplified data
  const exportSingleSlipToPDF = useCallback((slip: SimplifiedSalarySlip) => {
    setLoadingState('export', true);
    
    try {
      // Helper function to safely format numbers
      const safeToFixed = (value: any): string => {
        const num = Number(value) || 0;
        return num.toFixed(2);
      };

      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Salary Slip - ${slip.name}</title>
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              margin: 20px; 
              color: #333; 
              line-height: 1.6;
            }
            .header { 
              text-align: center; 
              border-bottom: 3px solid #2563eb; 
              padding-bottom: 15px; 
              margin-bottom: 25px; 
            }
            .header h1 { color: #2563eb; margin: 0; font-size: 28px; }
            .header p { margin: 5px 0; color: #666; font-size: 16px; }
            .employee-info { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 25px; 
              margin-bottom: 25px;
              padding: 20px;
              background-color: #f8fafc;
              border-radius: 8px;
            }
            .info-section h3 {
              color: #1e40af;
              margin-top: 0;
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 8px;
            }
            .info-item { margin-bottom: 8px; }
            .info-item strong {
              display: inline-block;
              width: 120px;
              color: #374151;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 20px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            th, td { 
              border: 1px solid #e5e7eb; 
              padding: 12px; 
              text-align: left; 
            }
            th { 
              background-color: #f3f4f6; 
              font-weight: 600;
              color: #374151;
            }
            .amount { text-align: right; font-weight: 500; }
            .gross-salary-row { 
              font-weight: bold; 
              background-color: #dcfce7;
              color: #166534;
            }
            .total-deduction-row {
              font-weight: bold;
              background-color: #fef2f2;
              color: #dc2626;
            }
            .net-salary-row {
              background-color: #dbeafe;
              color: #1d4ed8;
              font-size: 16px;
              font-weight: bold;
            }
            .deduction-row { background-color: #fef2f2; }
            .metadata {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
              font-size: 12px;
              color: #6b7280;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>SALARY SLIP</h1>
            <p>For the month of ${monthNames[Number(filters.month) - 1]} ${filters.year}</p>
          </div>
          
          <div class="employee-info">
            <div class="info-section">
              <h3>Employee Information</h3>
              <div class="info-item"><strong>Employee ID:</strong> ${slip.employeeId}</div>
              <div class="info-item"><strong>Name:</strong> ${slip.name}</div>
              <div class="info-item"><strong>Position:</strong> ${slip.position || 'N/A'}</div>
            </div>
            <div class="info-section">
              <h3>Attendance Summary</h3>
              <div class="info-item"><strong>Working Days:</strong> ${slip.workingDays || 0}</div>
              <div class="info-item"><strong>Absent Days:</strong> ${slip.absentDays || 0}</div>
              <div class="info-item"><strong>Late Punch In:</strong> ${slip.latePunchIn || 0}</div>
              <div class="info-item"><strong>Excess Leaves:</strong> ${slip.excessLeaves || 0}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="amount">Amount (AED)</th>
              </tr>
            </thead>
            <tbody>
              <tr class="gross-salary-row">
                <td><strong>Gross Salary</strong></td>
                <td class="amount"><strong>${safeToFixed(slip.grossSalary)}</strong></td>
              </tr>
              <tr style="height: 10px;"><td colspan="2"></td></tr>
              <tr>
                <td colspan="2"><strong>Deductions</strong></td>
              </tr>
              ${(Number(slip.absentDeduction) || 0) > 0 ? `<tr class="deduction-row"><td>Absent Days Deduction</td><td class="amount">${safeToFixed(slip.absentDeduction)}</td></tr>` : ''}
              ${(Number(slip.excessLeaves) || 0) > 0 ? `<tr class="deduction-row"><td>Excess Leave Deduction (${slip.excessLeaves} days, 2x penalty)</td><td class="amount">${safeToFixed((Number(slip.grossSalary) || 0) / (Number(slip.workingDays) || 22) * (Number(slip.excessLeaves) || 0) * 2)}</td></tr>` : ''}
              ${(Number(slip.advanceSalary) || 0) > 0 ? `<tr class="deduction-row"><td>Advance Salary Deduction</td><td class="amount">${safeToFixed(slip.advanceSalary)}</td></tr>` : ''}
              ${(Number(slip.loanDeductions) || 0) > 0 ? `<tr class="deduction-row"><td>Loan Deduction</td><td class="amount">${safeToFixed(slip.loanDeductions)}</td></tr>` : ''}
              <tr class="total-deduction-row">
                <td><strong>Total Deductions</strong></td>
                <td class="amount"><strong>${safeToFixed(slip.totalDeduction)}</strong></td>
              </tr>
              <tr class="net-salary-row">
                <td><strong>NET SALARY</strong></td>
                <td class="amount"><strong>${safeToFixed(slip.netSalary)}</strong></td>
              </tr>
            </tbody>
          </table>

        </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        
        setTimeout(() => {
          printWindow.print();
        }, 250);
      } else {
        toast.error('Please allow popups to export PDF');
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    } finally {
      setLoadingState('export', false);
    }
  }, [filters.month, filters.year, setLoadingState]);

  // Export all salary slips to Excel
  const exportAllToExcel = useCallback(() => {
    if (!simplifiedSalarySlips || simplifiedSalarySlips.length === 0) {
      toast.error('No salary slips data to export');
      return;
    }

    setLoadingState('export', true);
    try {
      const exportData = simplifiedSalarySlips.map((slip) => {
        // Calculate deductions from payroll data
        const grossSalary = Number(slip.grossSalary) || 0;
        const workingDays = Number(slip.workingDays) || 22; // fallback to 22 working days
        const perDayRate = grossSalary / workingDays;
        const excessLeaveDeduction = (Number(slip.excessLeaves) || 0) * perDayRate * 2; // 2x penalty
        
        // Note: absentDeduction already includes approved leaves from backend calculation
        
        return {
          'Employee ID': slip.employeeId,
          'Name': slip.name,
          'Position': slip.position || 'N/A',
          'Working Days': slip.workingDays,
          'Absent Days': slip.absentDays,
          'Late Punch In': slip.latePunchIn,
          'Excess Leaves': slip.excessLeaves,
          'Gross Salary (AED)': Number(slip.grossSalary).toFixed(2),
          'Absent Deduction (AED)': Number(slip.absentDeduction).toFixed(2),
          'Excess Leave Deduction (AED)': excessLeaveDeduction.toFixed(2),
          'Advance Salary (AED)': Number(slip.advanceSalary).toFixed(2),
          'Loan Deduction (AED)': Number(slip.loanDeductions || 0).toFixed(2),
          'Total Deduction (AED)': Number(slip.totalDeduction).toFixed(2),
          'Net Salary (AED)': Number(slip.netSalary).toFixed(2),
          'Period': `${monthNames[Number(filters.month) - 1]} ${filters.year}`
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Salary Slips');
      
      const excelBuffer = XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'array',
      });
      
      const blob = new Blob([excelBuffer], {
        type: 'application/octet-stream',
      });
      
      saveAs(blob, `salary_slips_${monthNames[Number(filters.month) - 1]}_${filters.year}_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Salary slips exported to Excel successfully!');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Failed to export salary slips to Excel');
    } finally {
      setLoadingState('export', false);
    }
  }, [simplifiedSalarySlips, filters.month, filters.year, setLoadingState]);

  // Render loading state
  if (dataLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center min-h-64">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Loading employee data...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
            <FileText className="mr-3 h-8 w-8 text-blue-600" />
            Salary Slip Generation
          </h1>
          <p className="text-gray-600">
            Generate detailed salary slips for employees with attendance, deductions, and advance salary details
          </p>
        </div>

        {/* Salary Slip Generation Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Clock className="mr-2 h-5 w-5" />
            Generate Salary Slips
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
              <select
                value={filters.month}
                onChange={(e) => updateFilter('month', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              >
                <option value="">Select Month</option>
                {monthNames.map((name, index) => (
                  <option key={index + 1} value={index + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
              <input
                type="number"
                placeholder="2024"
                value={filters.year}
                onChange={(e) => updateFilter('year', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                min="2020"
                max="2030"
              />
            </div>
          </div>
          
          <div className="flex justify-center">
            <button 
              onClick={handleGenerateAllSlips} 
              disabled={loading.all || !filters.month || !filters.year}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors text-lg font-medium"
            >
              {loading.all ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  Generating All Slips...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-5 w-5" />
                  Generate Salary Slips {simplifiedSalarySlips ? `(${simplifiedSalarySlips.length} generated)` : `(${filteredEmployees.length} employees)`}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Employee Search and Filter */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Employee Filters ({filteredEmployees.length} employees{simplifiedSalarySlips ? `, ${simplifiedSalarySlips.length} with payroll data` : ''})
            </h2>
            {(filters.searchTerm || filters.selectedOffice || filters.selectedPosition) && (
              <button
                onClick={clearFilters}
                className="flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
              >
                <Filter className="mr-1 h-4 w-4" />
                Clear Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search employees..."
                value={filters.searchTerm}
                onChange={(e) => updateFilter('searchTerm', e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>

            {/* Office Filter */}
            <div>
              <select
                value={filters.selectedOffice}
                onChange={(e) => updateFilter('selectedOffice', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              >
                <option value="">All Offices</option>
                {offices.map((office, index) => {
                  const displayName = typeof office === 'object' 
                    ? (office.office_name || office.name || office.location || `Office ${index + 1}`)
                    : String(office);
                  const optionValue = typeof office === 'object' 
                    ? (office.office_name || office.name || office.location || displayName)
                    : String(office);
                  // Create a unique key using multiple fallbacks
                  const uniqueKey = `office-${office.office_id || office.id || `${displayName}-${index}`}`;
                  return (
                    <option key={uniqueKey} value={optionValue}>
                      {displayName}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Position Filter */}
            <div>
              <select
                value={filters.selectedPosition}
                onChange={(e) => updateFilter('selectedPosition', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                disabled={!filters.selectedOffice && filteredPositions.length !== positions.length}
              >
                <option value="">All Positions</option>
                {filteredPositions.map((position, index) => {
                  const displayName = typeof position === 'object' 
                    ? (position.position_name || position.position_title || position.title || position.name || `Position ${index + 1}`)
                    : String(position);
                  const optionValue = typeof position === 'object' 
                    ? (position.position_name || position.position_title || position.title || position.name || displayName)
                    : String(position);
                  // Fix: Ensure unique key by combining id, name/title, and index as fallback
                  const idPart = (typeof position === 'object' && (position.position_id || position.id)) ? String(position.position_id || position.id) : '';
                  const namePart = displayName.replace(/\s+/g, '-');
                  const uniqueKey = `salaryslips-position-${idPart}-${namePart}-${index}`;
                  return (
                    <option key={uniqueKey} value={optionValue}>
                      {displayName}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Records per page */}
            <div>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>
          </div>

          {/* Results Summary and Pagination */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span className="flex items-center">
              <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
              Showing {paginationData.paginatedEmployees.length} of {filteredEmployees.length} employees
            </span>
            {paginationData.totalPages > 1 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  Previous
                </button>
                <span>Page {currentPage} of {paginationData.totalPages}</span>
                <button
                  onClick={() => setCurrentPage(Math.min(paginationData.totalPages, currentPage + 1))}
                  disabled={currentPage === paginationData.totalPages}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Debug Section - only show when needed */}
        {filteredEmployees.length === 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">No Employees Found</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>No employees are currently loaded. This could be due to:</p>
                  <ul className="list-disc list-inside mt-1">
                    <li>Database connection issues</li>
                    <li>No employees in the database</li>
                    <li>Authentication problems</li>
                    <li>Filter settings are too restrictive</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Single Salary Slip Display */}
        {salarySlip && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <FileText className="mr-2 h-6 w-6" />
                Salary Slip
              </h2>
              <div className="flex space-x-2">
                {salarySlip.metadata?.workingDaysSource && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    salarySlip.metadata.workingDaysSource === 'api' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {salarySlip.metadata.workingDaysSource === 'api' ? 'Live Data' : 'Fallback Data'}
                  </span>
                )}
                <button 
                  onClick={handleExportSingle} 
                  disabled={loading.export}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center transition-colors disabled:opacity-50"
                >
                  {loading.export ? (
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Export PDF
                </button>
              </div>
            </div>

            {/* Employee Header */}
            <div className="border-b-2 border-gray-200 pb-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center mb-2">
                    <User className="mr-2 h-5 w-5 text-gray-500" />
                    <h3 className="text-lg font-semibold text-gray-900">{salarySlip.employee.name}</h3>
                  </div>
                  <p className="text-sm text-gray-600">Employee ID: {salarySlip.employee.employeeId}</p>
                  <p className="text-sm text-gray-600">Position: {salarySlip.employee.position_title || 'N/A'}</p>
                  <div className="flex items-center mt-1">
                    <Building className="mr-1 h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{salarySlip.employee.office_name || 'N/A'}</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center mb-2">
                    <Calendar className="mr-2 h-5 w-5 text-gray-500" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {salarySlip.period.monthName} {salarySlip.period.year}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Period: {new Date(salarySlip.period.fromDate).toLocaleDateString()} - {new Date(salarySlip.period.toDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Attendance Summary */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Attendance Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Working Days</p>
                  <p className="text-xl font-bold text-blue-600">{salarySlip.attendance.workingDays}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Present Days</p>
                  <p className="text-xl font-bold text-green-600">{salarySlip.attendance.presentDays}</p>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Absent Days</p>
                  <p className="text-xl font-bold text-red-600">{salarySlip.attendance.absentDays}</p>
                </div>
                {/* Half Days and Approved Leaves are now included in Absent Days count */}
                <div className="bg-orange-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Late Days</p>
                  <p className="text-xl font-bold text-orange-600">{salarySlip.attendance.lateDays}</p>
                </div>
                <div className="bg-pink-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Excess Leaves</p>
                  <p className="text-xl font-bold text-pink-600">{salarySlip.attendance.excessLeaves}</p>
                  <p className="text-xs text-red-500 mt-1">Deduction: {formatCurrency(salarySlip.deductions.excessLeaveDeduction)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Missing Days</p>
                  <p className="text-xl font-bold text-gray-600">{salarySlip.attendance.missingDays}</p>
                </div>
              </div>
            </div>

            {/* Salary Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3 text-green-700">Earnings</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Basic Salary</span>
                    <span className="font-medium">{formatCurrency(salarySlip.salary.baseSalary)}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between font-bold">
                      <span>Gross Salary</span>
                      <span>{formatCurrency(salarySlip.salary.grossSalary)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3 text-red-700">Deductions</h4>
                <div className="space-y-2">
                  {salarySlip.deductions.absentDeduction > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Absent Days</span>
                      <span className="text-red-600">{formatCurrency(salarySlip.deductions.absentDeduction)}</span>
                    </div>
                  )}
                  {salarySlip.deductions.approvedLeaveDeduction > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Approved Leaves</span>
                      <span className="text-red-600">{formatCurrency(salarySlip.deductions.approvedLeaveDeduction)}</span>
                    </div>
                  )}
                  {salarySlip.deductions.halfDayDeduction > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Half Days</span>
                      <span className="text-red-600">{formatCurrency(salarySlip.deductions.halfDayDeduction)}</span>
                    </div>
                  )}
                  {salarySlip.deductions.excessLeaveDeduction > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Excess Leaves (2x)</span>
                      <span className="text-red-600">{formatCurrency(salarySlip.deductions.excessLeaveDeduction)}</span>
                    </div>
                  )}
                  {salarySlip.deductions.missingDayDeduction > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Missing Days</span>
                      <span className="text-red-600">{formatCurrency(salarySlip.deductions.missingDayDeduction)}</span>
                    </div>
                  )}
                  {salarySlip.deductions.advanceDeduction > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Advance Salary</span>
                      <span className="text-red-600">{formatCurrency(salarySlip.deductions.advanceDeduction)}</span>
                    </div>
                  )}
                  {salarySlip.deductions.loanDeductions > 0 && (
                    <div className="space-y-2 bg-red-50 p-3 rounded-lg border border-red-200">
                      <div className="flex justify-between">
                        <span className="text-gray-700 font-semibold flex items-center">
                          💰 Loan Deductions
                        </span>
                        <span className="text-red-700 font-bold text-lg">{formatCurrency(salarySlip.deductions.loanDeductions)}</span>
                      </div>
                      {salarySlip.deductions.loanDetails && salarySlip.deductions.loanDetails.map((loan, index) => (
                        <div key={loan.id || index} className="flex justify-between ml-4 p-2 bg-white rounded border border-red-100">
                          <div className="flex flex-col">
                            <span className="text-gray-700 text-sm font-medium">• {loan.title}</span>
                            <span className="text-gray-500 text-xs">Remaining: {formatCurrency(loan.remainingAfter || 0)}</span>
                          </div>
                          <span className="text-red-600 font-semibold">{formatCurrency(loan.deduction)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="border-t pt-2">
                    <div className="flex justify-between font-bold">
                      <span>Total Deductions</span>
                      <span className="text-red-600">{formatCurrency(salarySlip.salary.totalDeductions)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Salary */}
            <div className="mt-6 bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-gray-900">NET SALARY</span>
                <div className="flex items-center">
                  <DirhamIcon className="h-6 w-6 text-green-600 mr-1" />
                  <span className="text-2xl font-bold text-green-600">
                    {salarySlip.salary.netSalary.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-gray-200 text-sm text-gray-500">
              <div className="flex justify-between items-center">
                <div>
                  <p>Generated on {new Date(salarySlip.metadata?.generatedAt || new Date()).toLocaleDateString()} by {salarySlip.metadata?.generatedBy || 'System'}</p>
                  {salarySlip.metadata?.timezone && <p>Timezone: {salarySlip.metadata.timezone}</p>}
                </div>
                {salarySlip.metadata?.workingDaysSource && (
                  <div className="text-right">
                    <p>Working Days Source: {salarySlip.metadata.workingDaysSource}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Export All to Excel Button */}
        {simplifiedSalarySlips && simplifiedSalarySlips.length > 0 && (
          <div className="mb-6">
            <div className="flex justify-end">
              <button
                onClick={exportAllToExcel}
                disabled={loading.export}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading.export ? (
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Export All to Excel
              </button>
            </div>
          </div>
        )}

        {/* Salary Slips Data Table */}
        {simplifiedSalarySlips && (
          <SalarySlipDataTable
            data={simplifiedSalarySlips}
            loading={loading.all}
            exportLoading={loading.export}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            totalPages={salarySlipsPaginationData.totalPages}
            onExportPDF={exportSingleSlipToPDF}
            onPageChange={setCurrentPage}
            filters={filters}
            totalEmployees={filteredEmployees.length}
          />
        )}
      </div>
    </MainLayout>
  );
};
