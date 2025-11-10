import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

type DataType = 'office' | 'position' | 'visaType' | 'platform' | 'loan' | 'role' | 'recruitmentSource' | 'recruitmentPipeline' | 'recruitmentPlatform';

interface UseMasterDataReturn {
  data: any[];
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  createItem: (itemData: any) => Promise<void>;
  updateItem: (id: number, itemData: any) => Promise<void>;
  deleteItem: (id: number) => Promise<void>;
  // New loan-specific methods
  adjustLoanAmount?: (loanId: number, type: 'add' | 'deduct', amount: number, reason?: string) => Promise<void>;
  recordLoanPayment?: (loanId: number, amount: number, payrollMonth: string, paymentDate?: string) => Promise<void>;
}

export const useMasterData = (dataType: DataType): UseMasterDataReturn => {
  const [data, setData] = useState<any[]>([]); // ✅ Always initialize as array
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = () => {
    // Get auth token for all endpoints
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  const getApiEndpoint = () => {
    switch (dataType) {
      case 'office':
        return '/api/masters/offices';
      case 'position':
        return '/api/masters/positions';
      case 'visaType':
        return '/api/masters/visa-types';
      case 'platform':
        return '/api/masters/platforms';
      case 'loan':
        return '/api/loans';
      case 'role':
        return '/api/roles';
      case 'recruitmentSource':
        return '/api/recruitment-sources';
      case 'recruitmentPipeline':
        return '/api/recruitment-pipelines';
      case 'recruitmentPlatform':
        return '/api/recruitment-platforms';
      default:
        return '';
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`🔄 Fetching ${dataType} data from ${getApiEndpoint()}`);
      
      const response = await fetch(getApiEndpoint(), {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('Authentication failed. Please log in again.');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      // ✅ Ensure we always set an array
      if (Array.isArray(result)) {
        setData(result);
        console.log(`✅ Successfully fetched ${result.length} ${dataType} records`);
        if (dataType === 'role') {
          console.log('📊 Role data:', result);
        }
      } else if (result && typeof result === 'object') {
        // Handle different response formats
        if (dataType === 'role' && result.roles) {
          setData(result.roles);
          console.log(`✅ Successfully fetched ${result.roles.length} ${dataType} records`);
          console.log('📊 Role data:', result.roles);
        } else if (dataType === 'recruitmentSource' && result.sources) {
          setData(result.sources);
          console.log(`✅ Successfully fetched ${result.sources.length} ${dataType} records`);
        } else if (dataType === 'recruitmentPipeline' && result.pipelines) {
          setData(result.pipelines);
          console.log(`✅ Successfully fetched ${result.pipelines.length} ${dataType} records`);
        } else if (dataType === 'recruitmentPlatform' && result.platforms) {
          setData(result.platforms);
          console.log(`✅ Successfully fetched ${result.platforms.length} ${dataType} records`);
        } else {
          console.warn('⚠️ API returned non-array data:', result);
          setData([]); // Fallback to empty array
        }
      } else {
        console.warn('⚠️ API returned non-array data:', result);
        setData([]); // Fallback to empty array
      }
      
    } catch (err: any) {
      console.error(`❌ Failed to fetch ${dataType} data:`, err);
      setError(`Failed to load ${dataType} data. Please try again later.`);
      setData([]); // ✅ Always ensure data is an array on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dataType]);

  const createItem = async (itemData: any) => {
    try {
      console.log(`➕ Creating ${dataType}:`, itemData);
      
      // For positions with multiple offices, use the specialized endpoint
      let endpoint = getApiEndpoint();
      let body = itemData;
      
      // Fix field mapping for office creation
      if (dataType === 'office') {
        body = {
          name: itemData.office_name || itemData.name,
          location: itemData.location
        };
      } else if (dataType === 'role') {
        // Map frontend field names to backend field names
        body = {
          name: itemData.roleName || itemData.name,
          description: itemData.description || null,
          isActive: itemData.isActive !== undefined ? itemData.isActive : true
        };
      } else if (dataType === 'position' && itemData.offices && Array.isArray(itemData.offices) && itemData.offices.length > 0) {
        console.log('🏢 Using multiple office position creation endpoint');
        endpoint = '/api/masters/positions-multiple-offices';
        
        // Transform the data for the multiple office endpoint
        body = {
          title: itemData.title,
          description: itemData.description || null,
          offices: itemData.offices
        };
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log(`✅ ${dataType} created successfully:`, result);
      
      // Show appropriate success message based on creation type
      if (dataType === 'position' && itemData.offices && itemData.offices.length > 1) {
        toast.success(`Position "${itemData.title}" created successfully for ${itemData.offices.length} offices`);
      } else {
        toast.success(`${dataType.charAt(0).toUpperCase() + dataType.slice(1)} created successfully`);
      }
      
      await fetchData();
      return result;
    } catch (err: any) {
      console.error(`❌ Failed to create ${dataType}:`, err);
      toast.error(`Failed to create ${dataType}: ${err.message}`);
      throw err;
    }
  };

  // Auto-process deduction helper
  const autoProcessDeduction = async (loanId: number, deductionAmount: number, reason: string) => {
    try {
      console.log(' Auto-processing deduction:', { loanId, deductionAmount, reason });
      
      const response = await fetch(`/api/loans/deduct/${loanId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deduction_amount: deductionAmount, // ✅ Fixed: removed backslash
          reason: reason || 'Automatic deduction processing',
          record_as_payment: true // ✅ Fixed: removed backslash
        })
      });

      if (!response.ok) {
        throw new Error(`Auto-deduction API failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Auto-deduction processed successfully:', result);
      
      return result;
    } catch (error) {
      console.error('❌ Auto-deduction processing failed:', error);
      throw error;
    }
  };

  // ✅ ENHANCED: updateItem function with proper field name handling
  const updateItem = async (id: number, itemData: any) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`🔄 Updating ${dataType} ${id}:`, itemData);
      console.log('📋 Current data array:', data);
      
      // ✅ Safety check to ensure data is an array
      if (!Array.isArray(data)) {
        console.error('❌ Data is not an array:', data);
        setData([]);
        throw new Error('Internal state error: data is not an array');
      }

      // 🔥 FIXED: Check for deduction changes BEFORE making the API call
      let shouldAutoProcess = false;
      let deductionDifference = 0;
      
      if (dataType === 'loan' && itemData.amount_deducted !== undefined) { // ✅ Fixed field name
        const currentLoan = data.find((item: any) => item.id === id);
        
        if (currentLoan) {
          const previousDeducted = parseFloat(currentLoan.amount_deducted || '0'); // ✅ Fixed field name
          const newDeducted = parseFloat(itemData.amount_deducted || '0');
          deductionDifference = newDeducted - previousDeducted;
          
          console.log('🔍 Deduction change check:', {
            currentLoan: currentLoan,
            previous: previousDeducted,
            new: newDeducted,
            difference: deductionDifference,
            itemData: itemData
          });
          
          if (deductionDifference > 0) {
            shouldAutoProcess = true;
            console.log('✅ Will auto-process deduction after update');
          }
        } else {
          console.warn('⚠️ Could not find current loan in data array for comparison');
        }
      }

      // Fix field mapping for office updates
      let updateBody = itemData;
      if (dataType === 'office') {
        updateBody = {
          name: itemData.office_name || itemData.name,
          location: itemData.location
        };
      } else if (dataType === 'role') {
        // Map frontend field names to backend field names
        updateBody = {
          name: itemData.roleName || itemData.name,
          description: itemData.description || null,
          isActive: itemData.isActive !== undefined ? itemData.isActive : true
        };
      }

      // Make the update API call
      const response = await fetch(`${getApiEndpoint()}/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updateBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ ${dataType} updated successfully:`, result);

      // 🔥 AUTO-PROCESS DEDUCTION (if needed)
      if (shouldAutoProcess && deductionDifference > 0) {
        console.log(' Starting auto-deduction process...');
        
        try {
          const autoResult = await autoProcessDeduction(
            id,
            deductionDifference,
            `Auto-processed deduction increase of ${deductionDifference.toFixed(2)}`
          );
          console.log('✅ Auto-deduction completed successfully:', autoResult);
          
          // Show success message for auto-processing
          toast.success(`Loan updated and ${deductionDifference.toFixed(2)} AED deduction processed automatically`);
        } catch (deductionError: any) {
          console.error('⚠️ Auto-deduction failed but loan was updated:', deductionError);
          // Show warning but don't fail the whole operation
          toast.warning(`Loan updated but automatic payment recording failed: ${deductionError.message}`);
        }
      } else {
        // Regular update success message
        toast.success(`${dataType.charAt(0).toUpperCase() + dataType.slice(1)} updated successfully`);
      }

      // Refresh data after successful update
      await fetchData();
      return result;
      
    } catch (err: any) {
      console.error(`❌ Failed to update ${dataType}:`, err);
      toast.error(`Failed to update ${dataType}: ${err.message}`);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (id: number) => {
    try {
      console.log(`🗑️ Deleting ${dataType} ${id}`);
      
      const response = await fetch(`${getApiEndpoint()}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      console.log(`✅ ${dataType} deleted successfully`);
      toast.success(`${dataType.charAt(0).toUpperCase() + dataType.slice(1)} deleted successfully`);
      await fetchData();
    } catch (err: any) {
      console.error(`❌ Failed to delete ${dataType}:`, err);
      toast.error(`Failed to delete ${dataType}: ${err.message}`);
      throw err;
    }
  };

  // Enhanced loan-specific functions
  const adjustLoanAmount = async (loanId: number, type: 'add' | 'deduct', amount: number, reason?: string) => {
    try {
      console.log(`${type === 'add' ? '➕ Adding' : '➖ Deducting'} AED ${amount} ${type === 'add' ? 'to' : 'from'} loan ${loanId}`);
      
      const endpoint = type === 'add' ? 'add-amount' : 'deduct-amount';
      const response = await fetch(`/api/loans/${loanId}/${endpoint}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          // ✅ Fixed: removed backslashes from field names
          [type === 'add' ? 'additional_amount' : 'deduction_amount']: amount,
          reason: reason || `${type === 'add' ? 'Amount added' : 'Amount deducted'} via frontend`
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log(`✅ Loan amount ${type}ed successfully:`, result);
      
      toast.success(`Loan amount ${type === 'add' ? 'added' : 'deducted'} successfully`);
      await fetchData(); // Refresh the loan data
      return result;
    } catch (err: any) {
      console.error(`❌ Failed to ${type} loan amount:`, err);
      toast.error(`Failed to ${type} loan amount: ${err.message}`);
      throw err;
    }
  };

  const recordLoanPayment = async (loanId: number, amount: number, payrollMonth: string, paymentDate?: string) => {
    try {
      console.log(`💳 Recording loan payment: Loan ${loanId}, Amount: AED ${amount}, Month: ${payrollMonth}`);
      
      const response = await fetch('/api/loans/payments', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          // ✅ Fixed: removed backslashes from field names
          loan_id: loanId,
          amount_paid: amount,
          payroll_month: payrollMonth,
          payment_date: paymentDate || new Date().toISOString().split('T')[0]
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Loan payment recorded successfully:', result);
      
      toast.success('Loan payment recorded successfully');
      await fetchData(); // Refresh the loan data
      return result;
    } catch (err: any) {
      console.error('❌ Failed to record loan payment:', err);
      toast.error(`Failed to record loan payment: ${err.message}`);
      throw err;
    }
  };

  // Enhanced refresh function with better error handling
  const refreshData = async () => {
    console.log(`🔄 Manually refreshing ${dataType} data`);
    await fetchData();
  };

  // Base return object
  const baseReturn = {
    data,
    loading,
    error,
    refreshData,
    createItem,
    updateItem,
    deleteItem
  };

  // Add loan-specific methods only when dataType is 'loan'
  if (dataType === 'loan') {
    return {
      ...baseReturn,
      adjustLoanAmount,
      recordLoanPayment
    };
  }

  return baseReturn;
};
