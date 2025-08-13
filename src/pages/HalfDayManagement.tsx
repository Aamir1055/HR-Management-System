import React, { useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import { MainLayout } from "../components/Layout/MainLayout";
import axios from "../api/axios";
import moment from "moment";

interface HalfDayShift {
  id: number;
  shift_name: string;
  start_time: string;
  end_time: string;
  min_hours: number;
  is_active: boolean;
  created_at: string;
}

interface FormData {
  shift_name: string;
  start_time: string;
  end_time: string;
  min_hours: number;
  is_active: boolean;
}

const HalfDayManagement: React.FC = () => {
  const navigate = useNavigate();
  const [shifts, setShifts] = useState<HalfDayShift[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingShift, setEditingShift] = useState<HalfDayShift | null>(null);
  const [formData, setFormData] = useState<FormData>({
    shift_name: '',
    start_time: '',
    end_time: '',
    min_hours: 4.5,
    is_active: true
  });

  const fetchShifts = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/payroll/half-day-shifts');
      setShifts(response.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch shifts');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (editingShift) {
        // Update existing shift
        await axios.put(`/payroll/half-day-shifts/${editingShift.id}`, formData);
        setSuccess('Shift updated successfully!');
      } else {
        // Create new shift
        await axios.post('/payroll/half-day-shifts', formData);
        setSuccess('Shift created successfully!');
      }
      
      resetForm();
      fetchShifts();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save shift');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (shift: HalfDayShift) => {
    setEditingShift(shift);
    setFormData({
      shift_name: shift.shift_name,
      start_time: shift.start_time.substring(0, 5), // Remove seconds
      end_time: shift.end_time.substring(0, 5),
      min_hours: shift.min_hours,
      is_active: shift.is_active
    });
    setShowForm(true);
  };

  const handleDelete = async (shiftId: number, shiftName: string) => {
    if (window.confirm(`Are you sure you want to delete "${shiftName}"? This action cannot be undone.`)) {
      setLoading(true);
      try {
        await axios.delete(`/payroll/half-day-shifts/${shiftId}`);
        setSuccess('Shift deleted successfully!');
        fetchShifts();
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to delete shift');
      } finally {
        setLoading(false);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      shift_name: '',
      start_time: '',
      end_time: '',
      min_hours: 4.5,
      is_active: true
    });
    setEditingShift(null);
    setShowForm(false);
  };

  const calculateDuration = (startTime: string, endTime: string) => {
    if (!startTime || !endTime) return '';
    const start = moment(startTime, 'HH:mm');
    const end = moment(endTime, 'HH:mm');
    const duration = moment.duration(end.diff(start));
    return `${duration.hours()}h ${duration.minutes()}m`;
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  return (
    <MainLayout title="Half-Day Management" subtitle="Manage half-day shift patterns and timings">
      <div className="space-y-8">
        
        {/* Header Section */}
        <div className="bg-white ring-1 ring-purple-100 rounded-2xl shadow-sm px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-purple-600 rounded-full p-2">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Half-Day Shift Management</h2>
                <p className="text-sm text-gray-600">Configure and manage half-day shift patterns</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/payroll')}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Reports
              </button>
              <button
                onClick={() => setShowForm(!showForm)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {showForm ? 'Cancel' : 'Add New Shift'}
              </button>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-md bg-green-50 border border-green-200 text-green-700 flex items-center gap-2">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{success}</span>
          </div>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              {editingShift ? 'Edit Shift' : 'Add New Shift'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Shift Name
                  </label>
                  <input
                    type="text"
                    value={formData.shift_name}
                    onChange={(e) => setFormData({...formData, shift_name: e.target.value})}
                    className="w-full border border-gray-200 rounded-md px-3 py-2 focus:ring-purple-400 focus:border-purple-500"
                    placeholder="e.g., Morning Half Day"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Minimum Hours
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="12"
                    value={formData.min_hours}
                    onChange={(e) => setFormData({...formData, min_hours: parseFloat(e.target.value)})}
                    className="w-full border border-gray-200 rounded-md px-3 py-2 focus:ring-purple-400 focus:border-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                    className="w-full border border-gray-200 rounded-md px-3 py-2 focus:ring-purple-400 focus:border-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                    className="w-full border border-gray-200 rounded-md px-3 py-2 focus:ring-purple-400 focus:border-purple-500"
                    required
                  />
                </div>
              </div>
              
              {formData.start_time && formData.end_time && (
                <div className="p-3 bg-blue-50 rounded-md">
                  <p className="text-sm text-blue-700">
                    <strong>Duration:</strong> {calculateDuration(formData.start_time, formData.end_time)}
                  </p>
                </div>
              )}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                  Active (employees can use this shift)
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:bg-gray-400"
                >
                  {loading ? 'Saving...' : (editingShift ? 'Update Shift' : 'Create Shift')}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Shifts Table */}
        <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b bg-gradient-to-r from-gray-50 to-purple-50">
            <h3 className="text-lg font-bold text-gray-800">Existing Half-Day Shifts</h3>
            <p className="text-sm text-gray-600">Manage your half-day shift configurations</p>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-flex items-center gap-2 text-gray-600">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 818-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 14 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading shifts...
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shift Name
                    </th>
                    <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time Range
                    </th>
                    <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Min Hours
                    </th>
                    <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="py-3 px-6 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {shifts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500">
                        No half-day shifts configured yet. Add your first shift to get started.
                      </td>
                    </tr>
                  ) : (
                    shifts.map((shift) => (
                      <tr key={shift.id} className="hover:bg-gray-50">
                        <td className="py-4 px-6">
                          <div className="font-semibold text-gray-900">{shift.shift_name}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-900">
                            {shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-500">
                            {calculateDuration(shift.start_time, shift.end_time)}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-900">{shift.min_hours}h</div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            shift.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {shift.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-500">
                            {moment(shift.created_at).format('MMM DD, YYYY')}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEdit(shift)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(shift.id, shift.shift_name)}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default HalfDayManagement;
