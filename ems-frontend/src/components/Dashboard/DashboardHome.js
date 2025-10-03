import React, { useState, useEffect } from 'react';
import EquipmentTable from '../Equipment/EquipmentTable';
import UserManagement from '../User/UserManagement';
import { requestService, equipmentService } from '../../services/api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

const DashboardHome = ({ userRole }) => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Add stats state
  const [stats, setStats] = useState({
    available: 0,
    maintenance: 0,
    retired: 0,
    pending: 0,
  });

  // Fetch stats
  const fetchStats = async () => {
    try {
      const { data } = await equipmentService.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const { data } = await requestService.getPending();
      const normalized = (Array.isArray(data) ? data : []).map(r => ({
        id: r?.id ?? r?.request_id ?? crypto.randomUUID(),
        equipmentName: r?.equipment_name ?? r?.equipmentName ?? 'New Equipment',
        subject: r?.subject ?? r?.title ?? '—',
        requestedByName: r?.requested_by_name ?? r?.requestedByName ?? 'Unknown',
        priority: (r?.priority ?? r?.priority_level ?? '').toString(),
        status: (r?.status ?? r?.request_status ?? 'in-progress').toString(),
        createdAt: r?.created_at ?? r?.createdAt ?? new Date().toISOString(),
      }));
      setPendingRequests(normalized);
    } catch (err) {
      setError(err.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchPendingRequests();
  }, []);

  useAutoRefresh(() => {
    fetchStats();
    fetchPendingRequests();
  }, 30000);

  const getPriorityBadgeClass = (priority) => {
    const p = (priority || '').toString().toLowerCase();
    switch (p) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeClass = (status) => {
    const s = (status || '').toString().toLowerCase();
    switch (s) {
      case 'approved':
      case 'open':
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'in-progress':
      case 'review':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
      case 'closed':
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards - ONLY on Dashboard Home */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-6 text-center shadow-sm">
          <div className="text-4xl font-bold text-orange-500">{stats.available}</div>
          <div className="text-sm text-gray-600 mt-2">Available</div>
        </div>
        <div className="bg-white border rounded-lg p-6 text-center shadow-sm">
          <div className="text-4xl font-bold text-orange-500">{stats.maintenance}</div>
          <div className="text-sm text-gray-600 mt-2">Maintenance</div>
        </div>
        <div className="bg-white border rounded-lg p-6 text-center shadow-sm">
          <div className="text-4xl font-bold text-orange-500">{stats.retired}</div>
          <div className="text-sm text-gray-600 mt-2">Retired</div>
        </div>
        <div className="bg-white border rounded-lg p-6 text-center shadow-sm">
          <div className="text-4xl font-bold text-orange-500">{stats.pending}</div>
          <div className="text-sm text-gray-600 mt-2">Pending Requests</div>
        </div>
      </div>

      {/* Dashboard Title */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">DASHBOARD</h1>
      </div>

      {/* Content Sections */}
      <div className="space-y-6">
        {userRole === 'admin' ? (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">User Management</h2>
            <UserManagement />
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Requests</h2>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading requests...</div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">{error}</div>
            ) : (pendingRequests ?? []).length === 0 ? (
              <p className="text-center py-8 text-gray-500">No pending requests</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">Equipment</th>
                      <th className="px-4 py-3 text-left hidden lg:table-cell">Subject</th>
                      <th className="px-4 py-3 text-left hidden md:table-cell">Requested By</th>
                      <th className="px-4 py-3 text-left">Priority</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left hidden lg:table-cell">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {pendingRequests.map(req => (
                      <tr key={req.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{req.equipmentName}</td>
                        <td className="px-4 py-3 hidden lg:table-cell">{req.subject}</td>
                        <td className="px-4 py-3 hidden md:table-cell">{req.requestedByName}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadgeClass(req.priority)}`}>
                            {req.priority || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(req.status)}`}>
                            {req.status || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Equipment List</h2>
          <EquipmentTable />
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;