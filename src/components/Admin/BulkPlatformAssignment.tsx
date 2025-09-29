import React, { useState, useEffect } from 'react';
import { useToast } from '../UI/ToastContainer';
import { Users, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

interface UnassignedEmployee {
  employeeId: string;
  name: string;
  email: string;
  office_name: string;
  position_name: string;
  status: boolean;
}

interface Platform {
  id: number;
  platform_name: string;
}

export const BulkPlatformAssignment: React.FC = () => {
  const [unassignedEmployees, setUnassignedEmployees] = useState<UnassignedEmployee[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  const { showSuccess, showError } = useToast();

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  const fetchUnassignedEmployees = async () => {
    try {
      const response = await fetch('/api/employees?unassigned=true', {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch unassigned employees');
      
      const allEmployees = await response.json();
      // Filter for employees without platform assignment
      const unassigned = allEmployees.filter((emp: any) => 
        !emp.platform || emp.platform.trim() === ''
      );
      
      setUnassignedEmployees(unassigned);
    } catch (error) {
      showError('Error', 'Failed to load unassigned employees');
      console.error('Error:', error);
    }
  };

  const fetchPlatforms = async () => {
    try {
      const response = await fetch('/api/employees/platforms/options', {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch platforms');
      
      const platformData = await response.json();
      setPlatforms(platformData);
    } catch (error) {
      showError('Error', 'Failed to load platforms');
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchUnassignedEmployees(),
        fetchPlatforms()
      ]);
      setLoading(false);
    };

    loadData();
  }, []);

  const handleEmployeeToggle = (employeeId: string) => {
    const newSelected = new Set(selectedEmployees);
    if (newSelected.has(employeeId)) {
      newSelected.delete(employeeId);
    } else {
      newSelected.add(employeeId);
    }
    setSelectedEmployees(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedEmployees.size === unassignedEmployees.length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(unassignedEmployees.map(emp => emp.employeeId)));
    }
  };

  const handleAssignPlatform = async () => {
    if (selectedEmployees.size === 0) {
      showError('Error', 'Please select at least one employee');
      return;
    }

    if (!selectedPlatform) {
      showError('Error', 'Please select a platform');
      return;
    }

    setProcessing(true);
    try {
      const selectedPlatformName = platforms.find(p => p.id.toString() === selectedPlatform)?.platform_name;
      
      const promises = Array.from(selectedEmployees).map(employeeId => 
        fetch(`/api/employees/${employeeId}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            ...unassignedEmployees.find(emp => emp.employeeId === employeeId),
            platform: selectedPlatformName
          })
        })
      );

      const results = await Promise.all(promises);
      const failed = results.filter(r => !r.ok);
      
      if (failed.length === 0) {
        showSuccess(
          'Success', 
          `Assigned ${selectedEmployees.size} employees to ${selectedPlatformName} platform`
        );
        
        // Refresh data
        setSelectedEmployees(new Set());
        setSelectedPlatform('');
        await fetchUnassignedEmployees();
      } else {
        throw new Error(`${failed.length} assignments failed`);
      }
    } catch (error) {
      showError('Error', 'Failed to assign platforms to some employees');
      console.error('Error:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateAllPlatform = async () => {
    setProcessing(true);
    try {
      // First create "All Platform" if it doesn't exist
      await fetch('/api/masters/platforms', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          platform_name: 'All Platform'
        })
      });

      // Then assign all unassigned employees to it
      const promises = unassignedEmployees.map(employee => 
        fetch(`/api/employees/${employee.employeeId}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            ...employee,
            platform: 'All Platform'
          })
        })
      );

      await Promise.all(promises);
      
      showSuccess(
        'Success', 
        `Assigned ${unassignedEmployees.length} employees to 'All Platform'`
      );
      
      // Refresh data
      await Promise.all([
        fetchUnassignedEmployees(),
        fetchPlatforms()
      ]);
    } catch (error) {
      showError('Error', 'Failed to create All Platform or assign employees');
      console.error('Error:', error);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-amber-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              Unassigned Platform Employees ({unassignedEmployees.length})
            </h3>
          </div>
          <button
            onClick={fetchUnassignedEmployees}
            disabled={processing}
            className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${processing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {unassignedEmployees.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-500">All employees have been assigned to platforms!</p>
          </div>
        ) : (
          <>
            {/* Bulk Actions */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign Selected to Platform
                  </label>
                  <select
                    value={selectedPlatform}
                    onChange={(e) => setSelectedPlatform(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Platform...</option>
                    {platforms.map(platform => (
                      <option key={platform.id} value={platform.id}>
                        {platform.platform_name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateAllPlatform}
                    disabled={processing || unassignedEmployees.length === 0}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {processing ? 'Processing...' : `Assign All to "All Platform"`}
                  </button>
                  
                  <button
                    onClick={handleAssignPlatform}
                    disabled={processing || selectedEmployees.size === 0 || !selectedPlatform}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {processing ? 'Assigning...' : `Assign Selected (${selectedEmployees.size})`}
                  </button>
                </div>
              </div>
            </div>

            {/* Employee List */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedEmployees.size === unassignedEmployees.length}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Office
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Position
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {unassignedEmployees.map((employee) => (
                    <tr key={employee.employeeId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedEmployees.has(employee.employeeId)}
                          onChange={() => handleEmployeeToggle(employee.employeeId)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                          <div className="text-sm text-gray-500">{employee.employeeId}</div>
                          <div className="text-sm text-gray-500">{employee.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {employee.office_name || 'Not assigned'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {employee.position_name || 'Not assigned'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          employee.status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {employee.status ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
