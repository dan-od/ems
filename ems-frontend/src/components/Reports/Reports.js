// ems-frontend/src/components/Reports/Reports.js
// Equipment Maintenance Logs - Department-scoped for all users

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import './Reports.css';

const EquipmentMaintenanceLogs = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [equipmentFilter, setEquipmentFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  
  // User context
  const userRole = localStorage.getItem('role');
  const userName = localStorage.getItem('userName');
  const departmentName = localStorage.getItem('departmentName');

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [equipmentFilter, typeFilter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = {};
      if (equipmentFilter) params.equipment_id = equipmentFilter;
      if (typeFilter) params.maintenance_type = typeFilter;

      const response = await api.get('/maintenance/logs', { params });
      setLogs(response.data.logs || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching maintenance logs:', err);
      setError('Failed to load maintenance logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/maintenance/logs/stats');
      setStats(response.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'Preventive':
        return 'bg-blue-100 text-blue-800';
      case 'Repair':
        return 'bg-red-100 text-red-800';
      case 'Inspection':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="reports-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Equipment Maintenance Logs
          </h1>
          <p className="text-gray-600 mt-2">
            {userRole === 'admin' 
              ? 'View all equipment maintenance records across all departments'
              : `View maintenance records for ${departmentName || 'your department'}'s equipment`}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Logged in as: <span className="font-medium">{userName}</span> ({userRole})
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats.total_logs >= 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <div className="text-2xl font-bold text-blue-600">{stats.total_logs || 0}</div>
            <div className="text-sm text-gray-600">Total Logs</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <div className="text-2xl font-bold text-green-600">{stats.preventive_count || 0}</div>
            <div className="text-sm text-gray-600">Preventive Maintenance</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
            <div className="text-2xl font-bold text-red-600">{stats.repair_count || 0}</div>
            <div className="text-sm text-gray-600">Repairs</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
            <div className="text-2xl font-bold text-purple-600">{stats.this_month_count || 0}</div>
            <div className="text-sm text-gray-600">This Month</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maintenance Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            >
              <option value="">All Types</option>
              <option value="Preventive">Preventive Maintenance</option>
              <option value="Repair">Repair</option>
              <option value="Inspection">Inspection</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setEquipmentFilter('');
                setTypeFilter('');
              }}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          <p className="mt-4 text-gray-600">Loading maintenance logs...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-gray-400 text-6xl mb-4">🔧</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No maintenance logs found</h3>
          <p className="text-gray-500 mb-6">
            {userRole === 'admin' 
              ? 'No maintenance records have been created yet.'
              : `No maintenance records found for ${departmentName || 'your department'}.`}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Equipment</th>
                  {userRole === 'admin' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Hours</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Performed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(log.date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="font-medium">{log.equipment_name}</div>
                      {log.equipment_serial && (
                        <div className="text-xs text-gray-500">S/N: {log.equipment_serial}</div>
                      )}
                    </td>
                    {userRole === 'admin' && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {log.department_name || 'N/A'}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(log.maintenance_type)}`}>
                        {log.maintenance_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {log.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-600">
                      {log.hours_at_service ? `${log.hours_at_service}h` : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {log.performed_by || log.performed_by_user || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Info */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing {logs.length} maintenance record{logs.length !== 1 ? 's' : ''}
              {userRole !== 'admin' && ` from ${departmentName || 'your department'}`}
            </p>
          </div>
        </div>
      )}

      {/* Info Box for Users */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">About Maintenance Logs</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                {userRole === 'admin' 
                  ? 'As an admin, you can view all equipment maintenance records across all departments. This helps with asset lifecycle management and cost tracking.'
                  : userRole === 'manager'
                  ? `As a manager, you can view all maintenance logs for equipment in ${departmentName || 'your department'}. This helps you track team activities and equipment costs.`
                  : `You can view maintenance records for equipment in ${departmentName || 'your department'}. This helps you understand equipment service history before using it.`}
              </p>
              <p className="mt-2">
                <strong>Note:</strong> You {userRole === 'admin' ? 'have full access to' : 'can only see'} maintenance logs {userRole === 'admin' ? 'from all departments' : 'from your department'}.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EquipmentMaintenanceLogs;