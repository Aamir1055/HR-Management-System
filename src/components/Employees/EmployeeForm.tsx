import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { Employee } from '../../types';
import { formatDateForInput, formatDateFromEpoch } from '../../utils/dateUtils';

interface Office {
  id: number;
  name: string;
}
interface Position {
  id: number;
  title: string;
}
interface VisaType {
  id: number;
  typeofvisa: string;
}
interface Platform {
  id: number;
  platform_name: string;
}
interface EmployeeFormProps {
  employee?: Employee;
  onSubmit?: (data: any) => Promise<any> | void;
  onClose: () => void;
  viewOnly?: boolean;
  fullPage?: boolean;
  // Optional, if want to control delete success externally
  onDelete?: () => void;
}

const EmployeeForm: React.FC<EmployeeFormProps> = ({
  employee,
  onSubmit,
  onClose,
  viewOnly = false,
  fullPage = false,
  onDelete,
}) => {
  const [offices, setOffices] = useState<Office[]>([]);
  const [allPositions, setAllPositions] = useState<Position[]>([]);
  const [filteredPositions, setFilteredPositions] = useState<Position[]>([]);
  const [visaTypes, setVisaTypes] = useState<VisaType[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reportingTime, setReportingTime] = useState<string>('Select office and position');
  const [dutyHours, setDutyHours] = useState<string>('Select office and position');
  const [message, setMessage] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
    watch,
  } = useForm<Employee>({
    defaultValues: {
      id: undefined,
      employeeId: '',
      name: '',
      first_name: '',
      last_name: '',
      nationality: '',
      email: '',
      office_id: 0,
      office_name: '',
      position_id: 0,
      position_name: '',
      monthlySalary: 0,
      joiningDate: '',
      status: true,
      dob: '',
      passport_number: '',
      passport_expiry: '',
      visa_type_id: 0,
      visa_type: '',
      visa_expiry: '',
      platform_id: 0,
      platform: '',
      address: '',
      current_address: '',
      phone: '',
      whatsapp: '',
      gender: '',
      primary_language: '',
      secondary_language: '',
      marital_status: '',
      hiring_source: '',
      salary_currency: 'AED',
      emirates_id: '',
      emergency_contact: '',
      emergency_contact_relation: '',
    },
  });

  const watchedFirstName = watch('first_name');
  const watchedLastName = watch('last_name');
  const statusValue = watch('status');
  const officeId = watch('office_id');
  const positionId = watch('position_id');

  // Automatically update the `name` field when first_name or last_name changes
  useEffect(() => {
    const firstName = watchedFirstName || '';
    const lastName = watchedLastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    setValue('name', fullName);
  }, [watchedFirstName, watchedLastName, setValue]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    };
  };

  const formatDutyHours = (hours: unknown): string => {
    if (hours === undefined || hours === null) return 'Not set';
    if (typeof hours === 'number') return `${hours} hours`;
    if (typeof hours === 'string') return hours.includes('hours') ? hours : `${hours} hours`;
    return 'Not set';
  };

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [officesRes, positionsRes, visaTypesRes, platformsRes] = await Promise.all([
          fetch('/api/employees/offices/options', { headers: getAuthHeaders() }),
          fetch('/api/employees/positions/options', { headers: getAuthHeaders() }),
          fetch('/api/masters/visa-types', { headers: getAuthHeaders() }),
          fetch('/api/employees/platforms/options', { headers: getAuthHeaders() }),
        ]);

        let officesData: Office[] = [];
        let positionsData: Position[] = [];
        let visaTypesData: VisaType[] = [];
        let platformsData: Platform[] = [];

        if (officesRes.ok) {
          officesData = await officesRes.json();
          setOffices(officesData);
        }
        if (positionsRes.ok) {
          positionsData = await positionsRes.json();
          setAllPositions(positionsData);
          setFilteredPositions(positionsData);
        }
        if (visaTypesRes.ok) {
          visaTypesData = await visaTypesRes.json();
          setVisaTypes(visaTypesData);
        }
        if (platformsRes.ok) {
          platformsData = await platformsRes.json();
          setPlatforms(platformsData);
        }

        if (employee) {
          const officeObj = officesData.find(o =>
            o.name === employee.office_name ||
            o.id === employee.office_id
          );
          const positionObj = positionsData.find(p =>
            p.title === (employee.position_name || employee.position_title) ||
            p.id === employee.position_id
          );
          const visaTypeObj = visaTypesData.find(v =>
            v.typeofvisa === employee.visa_type_name ||
            v.id === employee.visa_type
          );
          const platformObj = platformsData.find(p =>
            p.platform_name === employee.platform ||
            p.id === employee.platform_id
          );
          let statusBoolean = true;
          if (typeof employee.status === 'boolean') {
            statusBoolean = employee.status;
          } else if (typeof employee.status === 'number') {
            statusBoolean = employee.status === 1;
          } else if (typeof employee.status === 'string') {
            statusBoolean = employee.status.toLowerCase() === 'active' || employee.status === '1';
          }

          // Split name into first_name and last_name if needed
          const nameParts = (employee.name || '').trim().split(' ');
          const firstName = employee.first_name || nameParts[0] || '';
          const lastName = employee.last_name || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');

          reset({
            ...employee,
            office_id: officeObj?.id ?? 0,
            position_id: positionObj?.id ?? 0,
            visa_type_id: visaTypeObj?.id ?? 0,
            platform_id: platformObj?.id ?? 0,
            office_name: employee.office_name || officeObj?.name || '',
            position_name: employee.position_name || employee.position_title || positionObj?.title || '',
            joiningDate: formatDateFromEpoch(employee.joiningDate) === 'No Date' ? '' : formatDateFromEpoch(employee.joiningDate),
            status: statusBoolean,
            dob: formatDateFromEpoch(employee.dob) === 'No Date' ? '' : formatDateFromEpoch(employee.dob),
            passport_number: employee.passport_number || '',
            passport_expiry: formatDateFromEpoch(employee.passport_expiry) === 'No Date' ? '' : formatDateFromEpoch(employee.passport_expiry),
            visa_type: employee.visa_type || visaTypeObj?.typeofvisa || '',
            visa_expiry: formatDateFromEpoch(employee.visa_expiry) === 'No Date' ? '' : formatDateFromEpoch(employee.visa_expiry),
            platform: employee.platform || platformObj?.platform_name || '',
            address: employee.address || '',
            current_address: employee.current_address || '',
            phone: employee.phone || '',
            whatsapp: employee.whatsapp || '',
            gender: employee.gender || '',
            primary_language: employee.primary_language || '',
            secondary_language: employee.secondary_language || '',
            marital_status: employee.marital_status || '',
            hiring_source: employee.hiring_source || '',
            salary_currency: employee.salary_currency || 'AED',
            emirates_id: employee.emirates_id || '',
            emergency_contact: employee.emergency_contact || '',
            emergency_contact_relation: employee.emergency_contact_relation || '',
            nationality: employee.nationality || '',
            first_name: firstName,
            last_name: lastName,
          });

          setReportingTime(employee.reporting_time?.toString() || 'Not set');
          setDutyHours(formatDutyHours(employee.duty_hours));
          if (officeObj?.id) {
            await fetchPositionsForOffice(officeObj.id);
          }
        } else {
          reset();
        }
      } catch (error) {
        console.error('Error fetching options:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOptions();
    // eslint-disable-next-line
  }, [employee?.id, viewOnly]); // Only reset when employee ID changes, not on every employee object change

  useEffect(() => {
    if (officeId && officeId !== 0) {
      fetchPositionsForOffice(officeId);
      if (!employee || employee.office_id !== officeId) {
        setValue('position_id', 0);
        setReportingTime('Select position');
        setDutyHours('Select position');
      }
    } else {
      setFilteredPositions(allPositions);
      setReportingTime('Select office and position');
      setDutyHours('Select office and position');
    }
    // eslint-disable-next-line
    }, [officeId, allPositions, employee?.office_id, setValue]);

  useEffect(() => {
    const fetchOfficePositionData = async () => {
      if (officeId && positionId && officeId !== 0 && positionId !== 0) {
        try {
          const response = await fetch(`/api/employees/office-position/${officeId}/${positionId}`, {
            headers: getAuthHeaders(),
          });
          if (response.ok) {
            const data = await response.json();
            setReportingTime(data.reporting_time?.toString() || 'Not set');
            setDutyHours(formatDutyHours(data.duty_hours));
          } else {
            setReportingTime('Not set');
            setDutyHours('Not set');
          }
        } catch (error) {
          console.error('Error fetching office position data:', error);
          setReportingTime('Error loading data');
          setDutyHours('Error loading data');
        }
      }
    };
    fetchOfficePositionData();
    // eslint-disable-next-line
  }, [officeId, positionId]);

  const fetchPositionsForOffice = async (selectedOfficeId: number) => {
    try {
      const response = await fetch(`/api/employees/positions/by-office/${selectedOfficeId}`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const positionsData = await response.json();
        setFilteredPositions(positionsData);
      } else {
        setFilteredPositions([]);
      }
    } catch (error) {
      console.error('Error fetching positions for office:', error);
      setFilteredPositions([]);
    }
  };

  // Helper for showing status messages
  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 2500);
  };

  const handleFormSubmit = async (formData: Employee) => {
    try {
      // Debug: Log the raw form data to see what we're receiving
      console.log('🔍 Raw form data received:', formData);
      console.log('🔍 First Name:', formData.first_name);
      console.log('🔍 Last Name:', formData.last_name);
      console.log('🔍 Nationality:', formData.nationality);
      console.log('🔍 Emergency Contact Relation:', formData.emergency_contact_relation);

      const office = offices.find(o => String(o.id) === String(formData.office_id));
      const position = filteredPositions.find(p => String(p.id) === String(formData.position_id));
      const visaType = visaTypes.find(v => String(v.id) === String(formData.visa_type_id));
      const platform = platforms.find(p => String(p.id) === String(formData.platform_id));
      const completeEmployeeData: any = {
        // Add ID for existing employees
        ...(employee?.id && { id: employee.id }),
        employeeId: formData.employeeId,
        name: formData.name, // This will be the concatenated name from first_name + last_name
        first_name: formData.first_name || '',
        last_name: formData.last_name || '',
        nationality: formData.nationality || '',
        email: formData.email,
        office_name: office?.name || '',
        position_name: position?.title || '',
        monthlySalary: formData.monthlySalary,
        joiningDate: formData.joiningDate || '', // Send DD/MM/YYYY directly to backend
        status: formData.status,
        dob: formData.dob || null,
        passport_number: formData.passport_number || null,
        passport_expiry: formData.passport_expiry || null,
        visa_type: visaType?.typeofvisa || null,
        visa_expiry: formData.visa_expiry || null,
        platform: platform?.platform_name || null,
        address: formData.address || null,
        current_address: formData.current_address || null,
        phone: formData.phone || null,
        whatsapp: formData.whatsapp || null,
        gender: formData.gender || null,
        primary_language: formData.primary_language || null,
        secondary_language: formData.secondary_language || null,
        marital_status: formData.marital_status || null,
        hiring_source: formData.hiring_source || null,
        salary_currency: formData.salary_currency || 'AED',
        emirates_id: formData.emirates_id || null,
        emergency_contact: formData.emergency_contact || null,
        emergency_contact_relation: formData.emergency_contact_relation || '',
      };

      // Debug: Log the complete data being sent to backend
      console.log('📤 Complete data being sent to backend:', completeEmployeeData);

      if (onSubmit) {
        const result = await onSubmit(completeEmployeeData);
        // Show success message based on whether it's edit or add
        if (employee) {
          showMessage('Data updated successfully!');
        } else {
          showMessage('Data added successfully!');
        }
      }
    } catch (error) {
      showMessage('Error saving data!');
      console.error('Error in handleFormSubmit:', error);
    }
  };

  if (isLoading) {
    return (
      <div className={fullPage ? "flex justify-center items-center h-screen" : "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"}>
        <div className={fullPage ? "bg-white rounded-lg shadow-xl p-6 w-full max-w-6xl mx-auto" : "bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl"}>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  // --- GROUPED FIELDS START ---
  const personalFields = (
    <>
      {/* Employee ID */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID <span className="text-red-600">*</span></label>
        <input
          {...register('employeeId', { required: 'Employee ID is required' })}
          disabled={viewOnly}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        />
        {errors.employeeId && <p className="text-red-500 text-sm mt-1">{errors.employeeId.message}</p>}
      </div>

      {/* Nationality */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
        <input
          {...register('nationality')}
          disabled={viewOnly}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          placeholder="e.g., UAE, India, Pakistan"
        />
      </div>

      {/* First Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">First Name <span className="text-red-600">*</span></label>
        <input
          {...register('first_name', { required: 'First name is required' })}
          disabled={viewOnly}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        />
        {errors.first_name && <p className="text-red-500 text-sm mt-1">{errors.first_name.message}</p>}
      </div>

      {/* Last Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name <span className="text-red-600">*</span></label>
        <input
          {...register('last_name', { required: 'Last name is required' })}
          disabled={viewOnly}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        />
        {errors.last_name && <p className="text-red-500 text-sm mt-1">{errors.last_name.message}</p>}
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-600">*</span></label>
        <input
          type="email"
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address',
            },
          })}
          disabled={viewOnly}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        />
        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
      </div>

      {/* Date of Birth */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
        <input
          type="text"
          {...register('dob', {
            pattern: {
              value: /^\d{2}\/\d{2}\/\d{4}$/,
              message: 'Date must be in DD/MM/YYYY format'
            },
            validate: (value) => {
              if (!value) return true; // Optional field
              const parts = value.split('/');
              if (parts.length !== 3) return 'Date must be in DD/MM/YYYY format';
              const day = parseInt(parts[0]);
              const month = parseInt(parts[1]);
              const year = parseInt(parts[2]);
              if (day < 1 || day > 31) return 'Day must be between 1-31';
              if (month < 1 || month > 12) return 'Month must be between 1-12';
              if (year < 1900 || year > 2100) return 'Year must be between 1900-2100';
              return true;
            }
          })}
          disabled={viewOnly}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-blue-50 focus:bg-white"
          placeholder="DD/MM/YYYY (e.g., 15/01/1990)"
          onInput={(e) => {
            // Auto-format as user types
            let value = e.currentTarget.value.replace(/\D/g, '');
            if (value.length >= 2) {
              value = value.substring(0, 2) + '/' + value.substring(2);
            }
            if (value.length >= 5) {
              value = value.substring(0, 5) + '/' + value.substring(5, 9);
            }
            e.currentTarget.value = value;
          }}
        />
        <div className="text-xs text-gray-500 mt-1">Format: DD/MM/YYYY</div>
        {errors.dob && <p className="text-red-500 text-sm mt-1">{errors.dob.message}</p>}
      </div>

      {/* Phone Number */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
        <input
          {...register('phone')}
          disabled={viewOnly}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          placeholder="e.g., +971-50-1234567"
        />
      </div>

      {/* WhatsApp Number */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
        <input
          {...register('whatsapp')}
          disabled={viewOnly}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          placeholder="e.g., +971-50-1234567"
        />
      </div>

      {/* Gender */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
        <select
          {...register('gender')}
          disabled={viewOnly}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value="">Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Marital Status */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Marital Status</label>
        <select
          {...register('marital_status')}
          disabled={viewOnly}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value="">Select Marital Status</option>
          <option value="Single">Single</option>
          <option value="Married">Married</option>
          <option value="Divorced">Divorced</option>
          <option value="Widowed">Widowed</option>
        </select>
      </div>

      {/* Primary Language */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Primary Language</label>
        <input
          {...register('primary_language')}
          disabled={viewOnly}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          placeholder="e.g., English, Arabic"
        />
      </div>

      {/* Secondary Language */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Language</label>
        <input
          {...register('secondary_language')}
          disabled={viewOnly}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          placeholder="e.g., Hindi, Urdu"
        />
      </div>
    </>
  );

  const employmentFields = (
    <>
      {/* DOJ - Date of Joining */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Date of Joining (DOJ) <span className="text-red-600">*</span></label>
        <input
          type="text"
          {...register('joiningDate', {
            required: 'Joining date is required',
            pattern: {
              value: /^\d{2}\/\d{2}\/\d{4}$/,
              message: 'Date must be in DD/MM/YYYY format'
            },
            validate: (value) => {
              if (!value) return 'Joining date is required';
              const parts = value.split('/');
              if (parts.length !== 3) return 'Date must be in DD/MM/YYYY format';
              const day = parseInt(parts[0]);
              const month = parseInt(parts[1]);
              const year = parseInt(parts[2]);
              if (day < 1 || day > 31) return 'Day must be between 1-31';
              if (month < 1 || month > 12) return 'Month must be between 1-12';
              if (year < 1900 || year > 2100) return 'Year must be between 1900-2100';
              return true;
            }
          })}
          disabled={viewOnly}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-green-50 focus:bg-white"
          placeholder="DD/MM/YYYY (e.g., 15/01/2023)"
          onInput={(e) => {
            // Auto-format as user types
            let value = e.currentTarget.value.replace(/\D/g, '');
            if (value.length >= 2) {
              value = value.substring(0, 2) + '/' + value.substring(2);
            }
            if (value.length >= 5) {
              value = value.substring(0, 5) + '/' + value.substring(5, 9);
            }
            e.currentTarget.value = value;
          }}
        />
        <div className="text-xs text-gray-500 mt-1">Format: DD/MM/YYYY (Required)</div>
        {errors.joiningDate && <p className="text-red-500 text-sm mt-1">{errors.joiningDate.message}</p>}
      </div>

      {/* Office */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Office <span className="text-red-600">*</span></label>
        <select
          {...register('office_id', {
            required: 'Office is required',
            validate: value => value !== 0 || 'Please select an office',
          })}
          disabled={viewOnly}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value={0}>Select Office</option>
          {offices.map(office => (
            <option key={office.id} value={office.id}>
              {office.name}
            </option>
          ))}
        </select>
        {errors.office_id && <p className="text-red-500 text-sm mt-1">{errors.office_id.message}</p>}
      </div>

      {/* Platform */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
        <select
          {...register('platform_id', {
            setValueAs: value => value === '' ? 0 : parseInt(value, 10)
          })}
          disabled={viewOnly}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value={0}>Select Platform</option>
          {platforms.map(platform => (
            <option key={platform.id} value={platform.id}>
              {platform.platform_name}
            </option>
          ))}
        </select>
      </div>

      {/* Position */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Position <span className="text-red-600">*</span></label>
        <select
          {...register('position_id', {
            required: 'Position is required',
            validate: value => value !== 0 || 'Please select a position',
          })}
          disabled={viewOnly || !officeId}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value={0}>
            {!officeId ? 'Select office first' : 'Select Position'}
          </option>
          {filteredPositions.map(position => (
            <option key={position.id} value={position.id}>
              {position.title}
            </option>
          ))}
        </select>
        {errors.position_id && <p className="text-red-500 text-sm mt-1">{errors.position_id.message}</p>}
      </div>

      {/* Currency */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
        <input
          {...register('salary_currency')}
          disabled={viewOnly}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          placeholder="e.g., AED, USD, EUR"
        />
      </div>

      {/* Salary */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Salary <span className="text-red-600">*</span></label>
        <input
          type="number"
          {...register('monthlySalary', {
            required: 'Salary is required',
            min: { value: 0, message: 'Salary must be positive' },
          })}
          disabled={viewOnly}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        />
        {errors.monthlySalary && <p className="text-red-500 text-sm mt-1">{errors.monthlySalary.message}</p>}
      </div>

      {/* Reporting Time (display only) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Reporting Time</label>
        <input
          type="text"
          value={reportingTime}
          disabled
          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100"
        />
      </div>
    </>
  );

  const additionalDetailsFields = (
    <>
      {/* Visa type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Visa Type</label>
        <select
          {...register('visa_type_id', {
            setValueAs: value => value === '' ? 0 : parseInt(value, 10)
          })}
          disabled={viewOnly}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value={0}>Select Visa Type</option>
          {visaTypes.map(visaType => (
            <option key={visaType.id} value={visaType.id}>
              {visaType.typeofvisa}
            </option>
          ))}
        </select>
      </div>

      {/* Visa expiry */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Visa Expiry Date</label>
        <input
          type="text"
          {...register('visa_expiry', {
            pattern: {
              value: /^\d{2}\/\d{2}\/\d{4}$/,
              message: 'Date must be in DD/MM/YYYY format'
            },
            validate: (value) => {
              if (!value) return true; // Optional field
              const parts = value.split('/');
              if (parts.length !== 3) return 'Date must be in DD/MM/YYYY format';
              const day = parseInt(parts[0]);
              const month = parseInt(parts[1]);
              const year = parseInt(parts[2]);
              if (day < 1 || day > 31) return 'Day must be between 1-31';
              if (month < 1 || month > 12) return 'Month must be between 1-12';
              if (year < 1900 || year > 2100) return 'Year must be between 1900-2100';
              return true;
            }
          })}
          disabled={viewOnly}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-purple-50 focus:bg-white"
          placeholder="DD/MM/YYYY (e.g., 30/06/2025)"
          onInput={(e) => {
            // Auto-format as user types
            let value = e.currentTarget.value.replace(/\D/g, '');
            if (value.length >= 2) {
              value = value.substring(0, 2) + '/' + value.substring(2);
            }
            if (value.length >= 5) {
              value = value.substring(0, 5) + '/' + value.substring(5, 9);
            }
            e.currentTarget.value = value;
          }}
        />
        <div className="text-xs text-gray-500 mt-1">Format: DD/MM/YYYY</div>
        {errors.visa_expiry && <p className="text-red-500 text-sm mt-1">{errors.visa_expiry.message}</p>}
      </div>

      {/* Passport no. */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Passport Number</label>
        <input
          {...register('passport_number')}
          disabled={viewOnly}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          placeholder="e.g., A1234567"
        />
      </div>

      {/* Passport expiry */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Passport Expiry</label>
        <input
          type="text"
          {...register('passport_expiry', {
            pattern: {
              value: /^\d{2}\/\d{2}\/\d{4}$/,
              message: 'Date must be in DD/MM/YYYY format'
            },
            validate: (value) => {
              if (!value) return true; // Optional field
              const parts = value.split('/');
              if (parts.length !== 3) return 'Date must be in DD/MM/YYYY format';
              const day = parseInt(parts[0]);
              const month = parseInt(parts[1]);
              const year = parseInt(parts[2]);
              if (day < 1 || day > 31) return 'Day must be between 1-31';
              if (month < 1 || month > 12) return 'Month must be between 1-12';
              if (year < 1900 || year > 2100) return 'Year must be between 1900-2100';
              return true;
            }
          })}
          disabled={viewOnly}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-yellow-50 focus:bg-white"
          placeholder="DD/MM/YYYY (e.g., 31/12/2030)"
          onInput={(e) => {
            // Auto-format as user types
            let value = e.currentTarget.value.replace(/\D/g, '');
            if (value.length >= 2) {
              value = value.substring(0, 2) + '/' + value.substring(2);
            }
            if (value.length >= 5) {
              value = value.substring(0, 5) + '/' + value.substring(5, 9);
            }
            e.currentTarget.value = value;
          }}
        />
        <div className="text-xs text-gray-500 mt-1">Format: DD/MM/YYYY</div>
        {errors.passport_expiry && <p className="text-red-500 text-sm mt-1">{errors.passport_expiry.message}</p>}
      </div>

      {/* Hiring source */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Hiring Source</label>
        <input
          {...register('hiring_source')}
          disabled={viewOnly}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          placeholder="e.g., Referral, Job Board, Direct"
        />
      </div>

      {/* Emergency contact relation */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Relation</label>
        <input
          {...register('emergency_contact_relation')}
          disabled={viewOnly}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          placeholder="e.g., Father, Mother, Spouse, Brother"
        />
      </div>

      {/* Current address */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Current Address</label>
        <input
          {...register('current_address')}
          disabled={viewOnly}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          placeholder="Current residential address"
        />
      </div>

      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Status <span className="text-red-600">*</span>
        </label>
        <select
          {...register('status', { required: 'Status is required' })}
          disabled={viewOnly}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value="">Select Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        {errors.status && <p className="text-red-500 text-sm mt-1">{errors.status.message}</p>}
      </div>
    </>
  );

  // --- GROUPED FIELDS END ---
  const allGroupedFields = (
    <>
      {/* Status/Snackbar Message */}
      {message && (
        <div className="md:col-span-2 px-2 py-2 mb-2 bg-green-100 border border-green-300 text-green-700 text-center rounded">
          {message}
        </div>
      )}
      {/* --- Personal --- */}
      <div className="md:col-span-2">
        <h3 className="text-lg font-semibold mt-2 mb-3 text-gray-800">Personal Details</h3>
      </div>
      {personalFields}
      {/* --- Employment --- */}
      <div className="md:col-span-2">
        <h3 className="text-lg font-semibold mt-5 mb-3 text-gray-800">Employee Details</h3>
      </div>
      {employmentFields}
      {/* --- Additional Details --- */}
      <div className="md:col-span-2">
        <h3 className="text-lg font-semibold mt-5 mb-3 text-gray-800">Additional Details</h3>
      </div>
      {additionalDetailsFields}
    </>
  );

  if (fullPage) {
    return (
      <div className="bg-white rounded-lg shadow-lg w-full max-w-6xl mx-auto p-8 my-8">
        <div className="flex items-center justify-between pb-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {viewOnly ? 'View Employee' : employee ? 'Edit Employee' : 'Add Employee'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {allGroupedFields}
          {!viewOnly && (
            <div className="md:col-span-2 flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
              >
                Save
              </button>
            </div>
          )}
        </form>
      </div>
    );
  }

  // MODAL BLOCK
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {viewOnly ? 'View Employee' : employee ? 'Edit Employee' : 'Add Employee'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {allGroupedFields}
          {!viewOnly && (
            <div className="md:col-span-2 flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
              >
                Save
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default EmployeeForm;
