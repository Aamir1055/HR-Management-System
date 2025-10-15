// RoleTable component - displays role records with sorting, actions
import React, { useState } from 'react';
import { Role } from '../../types';
import { Edit, Trash2, ArrowUpDown } from 'lucide-react';

interface RoleTableProps {
  roles: Role[];
  onEdit: (role: Role) => void;
  onDelete: (id: number) => void;
}

export const RoleTable: React.FC<RoleTableProps> = ({
  roles,
  onEdit,
  onDelete,
}) => {
  const [sortField, setSortField] = useState<keyof Role>('roleName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Sort roles
  const sortedRoles = [...roles].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'roleName':
        aValue = (a.roleName || '').toString().toLowerCase().trim();
        bValue = (b.roleName || '').toString().toLowerCase().trim();
        break;
      
      case 'roleId':
        aValue = a.roleId || 0;
        bValue = b.roleId || 0;
        break;
      
      case 'created_at':
        aValue = new Date(a.created_at || '').getTime();
        bValue = new Date(b.created_at || '').getTime();
        break;
      
      case 'updated_at':
        aValue = new Date(a.updated_at || '').getTime();
        bValue = new Date(b.updated_at || '').getTime();
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

  const handleSort = (field: keyof Role) => {
    if (field === sortField) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  if (roles.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-6xl mb-4">👥</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No roles found</h3>
        <p className="text-gray-500">Get started by adding your first role.</p>
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
                onClick={() => handleSort('roleId')}
              >
                <div className="flex items-center space-x-1">
                  <span>ID</span>
                  <ArrowUpDown className="w-4 h-4" />
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('roleName')}
              >
                <div className="flex items-center space-x-1">
                  <span>Role Name</span>
                  <ArrowUpDown className="w-4 h-4" />
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('created_at')}
              >
                <div className="flex items-center space-x-1">
                  <span>Created</span>
                  <ArrowUpDown className="w-4 h-4" />
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('updated_at')}
              >
                <div className="flex items-center space-x-1">
                  <span>Updated</span>
                  <ArrowUpDown className="w-4 h-4" />
                </div>
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedRoles.map((role) => (
              <tr key={role.roleId} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {role.roleId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {role.roleName}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(role.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(role.updated_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onEdit(role)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => role.roleId && onDelete(role.roleId)}
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