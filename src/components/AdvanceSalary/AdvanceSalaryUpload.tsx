import React, { useState, useCallback, useRef } from 'react';
import { Upload, Download, Eye, FileText, AlertCircle, CheckCircle, DollarSign } from 'lucide-react';

interface AdvanceSalaryRecord {
  employee_id: string;
  employee_name?: string;
  month: number;
  year: number;
  amount: number;
  remarks?: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

interface AdvanceSalaryUploadProps {
  onUploadComplete?: (records: AdvanceSalaryRecord[]) => void;
}

const AdvanceSalaryUpload: React.FC<AdvanceSalaryUploadProps> = ({ onUploadComplete }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<AdvanceSalaryRecord[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sample data for Excel template
  const sampleData: AdvanceSalaryRecord[] = [
    {
      employee_id: 'EMP-005',
      employee_name: 'John Doe',
      month: 8,
      year: 2025,
      amount: 500.00,
      remarks: 'Emergency advance'
    },
    {
      employee_id: 'EMP-006',
      employee_name: 'Jane Smith',
      month: 8,
      year: 2025,
      amount: 300.50,
      remarks: 'Salary advance'
    },
    {
      employee_id: 'EMP-007',
      employee_name: 'Bob Johnson',
      month: 9,
      year: 2025,
      amount: 750.00,
      remarks: 'Festival advance'
    }
  ];

  const downloadSampleFile = () => {
    const headers = [
      'EmployeeID',
      'Month',
      'Year',
      'Amount'
    ];
    
    const csvContent = [
      headers.join(','),
      ...sampleData.map(record => [
        record.employee_id,
        record.month,
        record.year,
        record.amount
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'advance_salary_sample.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const validateRecord = (record: any, rowIndex: number): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    // Validate Employee ID
    if (!record.EmployeeID || !record.EmployeeID.trim()) {
      errors.push({
        row: rowIndex,
        field: 'EmployeeID',
        message: 'Employee ID is required',
        severity: 'error'
      });
    }
    
    // Validate Month
    const month = parseInt(record.Month);
    if (!record.Month || isNaN(month) || month < 1 || month > 12) {
      errors.push({
        row: rowIndex,
        field: 'Month',
        message: 'Month must be a number between 1-12',
        severity: 'error'
      });
    }
    
    // Validate Year
    const year = parseInt(record.Year);
    if (!record.Year || isNaN(year) || year < 2020 || year > 2030) {
      errors.push({
        row: rowIndex,
        field: 'Year',
        message: 'Year must be between 2020-2030',
        severity: 'error'
      });
    }
    
    // Validate Amount
    const amount = parseFloat(record.Amount);
    if (!record.Amount || isNaN(amount) || amount <= 0) {
      errors.push({
        row: rowIndex,
        field: 'Amount',
        message: 'Amount must be a positive number',
        severity: 'error'
      });
    }
    
    return errors;
  };

  const parseCSV = (csvText: string): AdvanceSalaryRecord[] => {
    console.log('Parsing CSV content...');
    const lines = csvText.split('\n').filter(line => line.trim());
    console.log('Number of lines:', lines.length);
    
    if (lines.length < 2) {
      throw new Error('File must contain at least a header row and one data row');
    }
    
    const headers = lines[0].split(',').map(h => h.trim());
    console.log('CSV Headers:', headers);

    // Map headers to expected format
    const headerMap: { [key: string]: number } = {};
    headers.forEach((header, index) => {
      const normalizedHeader = header.toLowerCase().trim();
      if (normalizedHeader.includes('employee') && normalizedHeader.includes('id')) {
        headerMap['EmployeeID'] = index;
      } else if (normalizedHeader === 'month') {
        headerMap['Month'] = index;
      } else if (normalizedHeader === 'year') {
        headerMap['Year'] = index;
      } else if (normalizedHeader.includes('amount') || normalizedHeader.includes('salary')) {
        headerMap['Amount'] = index;
      }
    });

    // Check required columns
    const requiredColumns = ['EmployeeID', 'Month', 'Year', 'Amount'];
    const missingColumns = requiredColumns.filter(col => headerMap[col] === undefined);
    if (missingColumns.length > 0) {
      throw new Error(`Required columns not found: ${missingColumns.join(', ')}`);
    }

    const records: AdvanceSalaryRecord[] = lines.slice(1).map((line, idx) => {
      console.log(`Parsing line ${idx + 2}:`, line);
      const values = line.split(',').map(v => v.trim());
      
      return {
        employee_id: values[headerMap['EmployeeID']] || '',
        month: parseInt(values[headerMap['Month']]) || 0,
        year: parseInt(values[headerMap['Year']]) || 0,
        amount: parseFloat(values[headerMap['Amount']]) || 0
      };
    });

    console.log('All parsed records:', records);
    return records;
  };

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File selection triggered.');
    const file = event.target.files?.[0];
    console.log('Selected file:', file);
    
    if (!file) return;
    
    // Check file type
    const isCSV = file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv');
    const isExcel = file.type.includes('sheet') || file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');
    
    if (!isCSV && !isExcel) {
      alert('⚠️ Please select a CSV or Excel file');
      console.warn('Selected file is not CSV or Excel:', file.type);
      return;
    }
    
    setSelectedFile(file);
    setIsProcessing(true);

    if (isCSV) {
      // Handle CSV file
      const reader = new FileReader();
      reader.onload = (e) => {
        console.log('CSV file loaded.');
        const csvText = e.target?.result as string;
        console.log('CSV Text preview:', csvText.slice(0, 200));
        
        try {
          const records = parseCSV(csvText);
          processRecords(records);
        } catch (error) {
          alert('❌ Error reading CSV file. Please check the file format.');
          console.error('Error parsing CSV:', error);
          setIsProcessing(false);
        }
      };
      reader.onerror = (e) => {
        alert('❌ Error reading CSV file.');
        console.error('FileReader error:', e);
        setIsProcessing(false);
      };
      reader.readAsText(file);
    } else {
      // Handle Excel file - will be processed by backend
      setIsProcessing(false);
      alert('📋 Excel file selected. Click "Upload Records" to process.');
      setPreviewData([]);
      setValidationErrors([]);
      setShowPreview(true);
    }
  }, []);

  const processRecords = (records: AdvanceSalaryRecord[]) => {
    const allErrors: ValidationError[] = [];
    
    records.forEach((record, idx) => {
      // Convert to validation format
      const validationRecord = {
        EmployeeID: record.employee_id,
        Month: record.month.toString(),
        Year: record.year.toString(),
        Amount: record.amount.toString()
      };
      
      const errors = validateRecord(validationRecord, idx + 2);
      allErrors.push(...errors);
    });

    setPreviewData(records);
    setValidationErrors(allErrors);
    setShowPreview(true);
    setIsProcessing(false);
  };


  const handleUpload = async () => {
    if (!selectedFile) {
      alert('⚠️ Please select a file first');
      return;
    }

    if (validationErrors.some(e => e.severity === 'error')) {
      alert('⚠️ Please fix all errors before uploading');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      await performUpload();
    } catch (error) {
      alert('❌ Network error. Please check your connection and try again.');
      console.error('Upload error:', error);
      setIsProcessing(false);
    }
  };

  const performUpload = async () => {
    try {
      const formData = new FormData();
      formData.append('file', selectedFile!);
      
      const token = localStorage.getItem('token');
      console.log('Uploading with token:', token ? `${token.substring(0, 20)}...` : 'No token');
      
      const response = await fetch('/api/advance-salary/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      console.log('Upload response status:', response.status);
      console.log('Upload response headers:', Object.fromEntries(response.headers.entries()));
      
      const result = await response.json();
      console.log('Upload response body:', result);
      console.log('Response body details:', JSON.stringify(result, null, 2));
      
      if (response.ok && result.success) {
        // Handle different possible field names from backend
        const recordCount = result.recordsProcessed || result.recordsUploaded || result.count || result.totalRecords || previewData.length || 'Unknown number of';
        alert(`✅ Advance salary records uploaded successfully! ${recordCount} records processed.`);
        onUploadComplete?.(previewData);
        resetForm();
      } else {
        // Handle different error scenarios
        if (response.status === 409 && result.existingRecords) {
          // Show simple duplicate message and let user handle manually
          const duplicateList = result.existingRecords
            .map((existing: any) => `• ${existing.employee_id} for ${existing.month_year}`)
            .join('\n');
          
          alert(`⚠️ Upload failed - Duplicate records found:\n\n${duplicateList}\n\nPlease remove these duplicate records from your file and try uploading again.`);
        } else if (result.unauthorizedEmployeeIds) {
          alert(`❌ Upload failed: ${result.message}`);
        } else if (result.errors) {
          alert(`❌ Upload failed: Data validation errors found:\n\n${result.errors.join('\n')}`);
        } else {
          alert(`❌ Upload failed: ${result.message || 'Unknown error'}`);
        }
      }
    } catch (error) {
      throw error; // Re-throw to be handled by the caller
    } finally {
      setIsProcessing(false);
    }
  };


  const resetForm = () => {
    setSelectedFile(null);
    setPreviewData([]);
    setValidationErrors([]);
    setShowPreview(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const errorCount = validationErrors.filter(e => e.severity === 'error').length;
  const warningCount = validationErrors.filter(e => e.severity === 'warning').length;

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <DollarSign className="w-8 h-8 text-green-600" />
          <h2 className="text-2xl font-bold text-gray-800">Upload Advance Salary Records</h2>
        </div>
        <button
          onClick={downloadSampleFile}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          <Download className="w-4 h-4" />
          Download Sample
        </button>
      </div>

      {/* Instructions */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">Instructions</h3>
        <div className="text-blue-700 space-y-1">
          <p>• Download the sample file to see the required format</p>
          <p>• Supported formats: CSV and Excel (.xlsx, .xls)</p>
          <p>• Required columns: <strong>EmployeeID, Month, Year, Amount</strong></p>
          <p>• Month should be numeric (1-12), Year should be 4 digits (2020-2030)</p>
          <p>• Amount should be positive numbers (currency symbols will be removed)</p>
        </div>
      </div>

      <div className="mb-6">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 mb-4">
            Upload a CSV or Excel file with advance salary records. Download the sample file to see the required format.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="flex items-center gap-2 mx-auto px-6 py-3 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {isProcessing ? 'Processing...' : 'Choose File'}
          </button>
          {selectedFile && (
            <p className="mt-2 text-sm text-gray-600">
              Selected: {selectedFile.name}
            </p>
          )}
        </div>
      </div>

      {showPreview && (
        <>
          <div className="mb-6">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                <span className="font-medium">Records: {previewData.length}</span>
              </div>
              {errorCount > 0 && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">Errors: {errorCount}</span>
                </div>
              )}
              {warningCount > 0 && (
                <div className="flex items-center gap-2 text-yellow-600">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">Warnings: {warningCount}</span>
                </div>
              )}
              {errorCount === 0 && warningCount === 0 && previewData.length > 0 && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">All records valid</span>
                </div>
              )}
            </div>
          </div>

          {previewData.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-semibold">Preview</h3>
              </div>
              <div className="max-h-96 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left">Employee ID</th>
                      <th className="px-4 py-2 text-left">Month</th>
                      <th className="px-4 py-2 text-left">Year</th>
                      <th className="px-4 py-2 text-left">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((record, index) => {
                      const rowErrors = validationErrors.filter(e => e.row === index + 2);
                      return (
                        <tr key={index} className={`border-b ${rowErrors.length > 0 ? 'bg-red-50' : ''}`}>
                          <td className="px-4 py-2">{record.employee_id}</td>
                          <td className="px-4 py-2">{record.month}</td>
                          <td className="px-4 py-2">{record.year}</td>
                          <td className="px-4 py-2 font-medium text-green-600">
                            {formatCurrency(record.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {validationErrors.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-red-600">Validation Issues</h3>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {validationErrors.map((error, index) => (
              <div
                key={index}
                className={`p-3 rounded-md ${
                  error.severity === 'error' ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'
                }`}
              >
                <div className={`flex items-center gap-2 ${
                  error.severity === 'error' ? 'text-red-600' : 'text-yellow-600'
                }`}>
                  <AlertCircle className="w-4 h-4" />
                  <span className="font-medium">
                    Row {error.row}, {error.field}: {error.message}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showPreview && (
        <div className="flex justify-end gap-3">
          <button
            onClick={resetForm}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={isProcessing || (selectedFile?.name.endsWith('.csv') && errorCount > 0)}
            className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {isProcessing ? 'Uploading...' : 'Upload Records'}
          </button>
        </div>
      )}

    </div>
  );
};

export default AdvanceSalaryUpload;
