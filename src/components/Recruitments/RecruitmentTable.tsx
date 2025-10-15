// RecruitmentTable component - displays recruitment records with sorting, actions, and file download
// Matches the styling and functionality of EmployeeTable component
import React, { useState } from 'react';
import { Recruitment } from '../../types';
import { Edit, Trash2, ArrowUpDown, FileText } from 'lucide-react';

interface RecruitmentTableProps {
  recruitments: Recruitment[];
  onEdit: (recruitment: Recruitment) => void;
  onDelete: (id: number) => void;
  onDownloadCV: (id: number, fileName?: string) => void;
}

export const RecruitmentTable: React.FC<RecruitmentTableProps> = ({
  recruitments,
  onEdit,
  onDelete,
  onDownloadCV,
}) => {
  const [sortField, setSortField] = useState<keyof Recruitment>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Sort recruitments
  const sortedRecruitments = [...recruitments].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'fullName':
        aValue = (a.fullName || '').toString().toLowerCase().trim();
        bValue = (b.fullName || '').toString().toLowerCase().trim();
        break;
      
      case 'email':
        aValue = (a.email || '').toString().toLowerCase().trim();
        bValue = (b.email || '').toString().toLowerCase().trim();
        break;
      
      case 'recruitmentSource':
        aValue = (a.recruitmentSource || '').toString().toLowerCase().trim();
        bValue = (b.recruitmentSource || '').toString().toLowerCase().trim();
        break;
      
      case 'recruitmentPipeline':
        aValue = (a.recruitmentPipeline || '').toString().toLowerCase().trim();
        bValue = (b.recruitmentPipeline || '').toString().toLowerCase().trim();
        break;
      
      
      case 'date':
        // Parse dates for comparison
        const parseDate = (dateStr: string): number => {
          if (!dateStr) return 0;
          
          // Handle DD/MM/YYYY format
          if (dateStr.includes('/')) {
            const [day, month, year] = dateStr.split('/').map(Number);
            return new Date(year, month - 1, day).getTime();
          }
          
          // Handle ISO date format
          return new Date(dateStr).getTime();
        };
        
        aValue = parseDate(a.formattedDate || a.date || '');
        bValue = parseDate(b.formattedDate || b.date || '');
        break;
      
      case 'createdAt':
        aValue = new Date(a.createdAt || '').getTime();
        bValue = new Date(b.createdAt || '').getTime();
        break;
      
      default:
        aValue = a[sortField] || '';
        bValue = b[sortField] || '';
    }

    // Perform comparison
    let result = 0;
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      result = aValue - bValue;
    } else {
      const aStr = String(aValue || '');
      const bStr = String(bValue || '');
      result = aStr.localeCompare(bStr);
    }

    return sortDirection === 'asc' ? result : -result;
  });

  const handleSort = (field: keyof Recruitment) => {
    if (field === sortField) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get pipeline status color
  const getPipelineStatusColor = (pipeline: string) => {
    const statusColors: { [key: string]: string } = {
      'Application Received': 'bg-blue-100 text-blue-800',
      'Initial Screening': 'bg-yellow-100 text-yellow-800',
      'Phone Interview': 'bg-purple-100 text-purple-800',
      'Technical Assessment': 'bg-indigo-100 text-indigo-800',
      'First Interview': 'bg-orange-100 text-orange-800',
      'Second Interview': 'bg-orange-100 text-orange-800',
      'Final Interview': 'bg-red-100 text-red-800',
      'Reference Check': 'bg-pink-100 text-pink-800',
      'Offer Extended': 'bg-green-100 text-green-800',
      'Offer Accepted': 'bg-green-200 text-green-900',
      'Offer Declined': 'bg-red-100 text-red-800',
      'Rejected': 'bg-gray-100 text-gray-800',
      'Withdrawn': 'bg-gray-100 text-gray-800',
      'Hired': 'bg-emerald-100 text-emerald-800',
    };
    
    return statusColors[pipeline] || 'bg-gray-100 text-gray-800';
  };

  const handleDownloadCV = (recruitment: Recruitment) => {
    if (recruitment.id) {
      onDownloadCV(recruitment.id, recruitment.cvOriginalName);
    }
  };

  if (recruitments.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-6xl mb-4">📋</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No recruitment records found</h3>
        <p className="text-gray-500">Get started by adding your first recruitment record.</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center space-x-1">
                  <span>Date</span>
                  <ArrowUpDown className="w-4 h-4" />
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('fullName')}
              >
                <div className="flex items-center space-x-1">
                  <span>Full Name</span>
                  <ArrowUpDown className="w-4 h-4" />
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('email')}
              >
                <div className="flex items-center space-x-1">
                  <span>Email</span>
                  <ArrowUpDown className="w-4 h-4" />
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Contact
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('recruitmentPipeline')}
              >
                <div className="flex items-center space-x-1">
                  <span>Pipeline</span>
                  <ArrowUpDown className="w-4 h-4" />
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Platform
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Role
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                CV
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedRecruitments.map((recruitment) => (
              <tr key={recruitment.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {recruitment.formattedDate || recruitment.date}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {recruitment.fullName}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{recruitment.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    <div>{recruitment.mobile}</div>
                    {recruitment.whatsapp && (
                      <div className="text-xs text-gray-500">{recruitment.whatsapp}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPipelineStatusColor(
                      recruitment.recruitmentPipeline
                    )}`}
                  >
                    {recruitment.recruitmentPipeline}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{recruitment.platform || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{recruitment.role || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {recruitment.cvOriginalName ? (
                    <button
                      onClick={() => handleDownloadCV(recruitment)}
                      className="flex items-center text-blue-600 hover:text-blue-800"
                      title="Download CV"
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      <span className="text-xs">Download</span>
                    </button>
                  ) : (
                    <span className="text-gray-400 text-xs">No CV</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onEdit(recruitment)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => recruitment.id && onDelete(recruitment.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
