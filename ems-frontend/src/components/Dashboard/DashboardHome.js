import React, { useState, useEffect } from 'react';
import EquipmentTable from '../Equipment/EquipmentTable';
import UserManagement from '../User/UserManagement';
import { requestService, equipmentService } from '../../services/api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

const DashboardHome = () => {
  // Read userRole directly from localStorage instead of props
  const userRole = localStorage.getItem('userRole');
  
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

  // Debug log
  useEffect(() => {
    console.log('🎯 DashboardHome loaded - Role:', userRole);
  }, [userRole]);

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
      {/* Stats Cards - Show for all roles except admin */}
      {userRole !== 'admin' && (
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
      )}

      {/* Dashboard Title */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">
          {userRole === 'admin' && 'ADMIN DASHBOARD'}
          {userRole === 'manager' && 'MANAGER DASHBOARD'}
          {userRole === 'engineer' && 'ENGINEER DASHBOARD'}
          {userRole === 'staff' && 'STAFF DASHBOARD'}
          {!userRole && 'DASHBOARD'}
        </h1>
        <p className="text-gray-600 mt-2">
          {userRole === 'admin' && 'System administration and user management'}
          {userRole === 'manager' && 'Department oversight and request approvals'}
          {userRole === 'engineer' && 'Field operations and equipment management'}
          {userRole === 'staff' && 'Office operations and request tracking'}
        </p>
      </div>

      {/* Content Sections - Role-based rendering */}
      <div className="space-y-6">
        {/* ADMIN: User Management */}
        {userRole === 'admin' ? (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">User Management</h2>
            <UserManagement />
          </div>
        ) : (
          /* MANAGER, ENGINEER, STAFF: Recent Requests */
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              {userRole === 'staff' ? 'My Recent Requests' : 'Recent Requests'}
            </h2>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading requests...</div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">{error}</div>
            ) : (pendingRequests ?? []).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No pending requests</p>
                {userRole === 'staff' && (
                  <p className="text-sm mt-2">Create your first request to get started</p>
                )}
              </div>
            ) : (
              <>
                {/* Desktop: Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left">Equipment</th>
                        <th className="px-4 py-3 text-left">Subject</th>
                        <th className="px-4 py-3 text-left">Requested By</th>
                        <th className="px-4 py-3 text-left">Priority</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-left">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {pendingRequests.map(req => (
                        <tr key={req.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">{req.equipmentName}</td>
                          <td className="px-4 py-3">{req.subject}</td>
                          <td className="px-4 py-3">{req.requestedByName}</td>
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
                          <td className="px-4 py-3">
                            {new Date(req.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile: Card View */}
                <div className="lg:hidden space-y-3">
                  {pendingRequests.map(req => (
                    <div key={req.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-base">{req.equipmentName}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(req.status)}`}>
                          {req.status || '—'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{req.subject}</p>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>By: {req.requestedByName}</span>
                        <span className={`px-2 py-1 rounded-full font-medium ${getPriorityBadgeClass(req.priority)}`}>
                          {req.priority || '—'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Equipment List - Show for all roles except staff */}
        {userRole !== 'staff' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Equipment List</h2>
            <EquipmentTable />
          </div>
        )}

        {/* Quick Actions for Staff */}
        {userRole === 'staff' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex flex-col items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition cursor-pointer">
                <span className="text-3xl mb-2">🖥️</span>
                <span className="text-sm font-medium text-gray-700">IT Support</span>
              </div>
              
              <div className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition cursor-pointer">
                <span className="text-3xl mb-2">🗂️</span>
                <span className="text-sm font-medium text-gray-700">Office Supplies</span>
              </div>
              
              <div className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition cursor-pointer">
                <span className="text-3xl mb-2">🚗</span>
                <span className="text-sm font-medium text-gray-700">Transport</span>
              </div>
              
              <div className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition cursor-pointer">
                <span className="text-3xl mb-2">💰</span>
                <span className="text-sm font-medium text-gray-700">Travel Advance</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardHome;