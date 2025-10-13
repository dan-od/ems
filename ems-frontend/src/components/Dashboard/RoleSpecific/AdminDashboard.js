// ems-frontend/src/components/Dashboard/RoleSpecific/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { useAutoRefresh } from '../../../hooks/useAutoRefresh';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/stats/admin-dashboard');
      setDashboardData(data);
      setError(null);
      setLastRefresh(new Date());
      console.log('✅ Admin dashboard loaded:', data);
    } catch (err) {
      console.error('❌ Failed to fetch admin dashboard:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // Auto-refresh every 60 seconds
  useAutoRefresh(fetchDashboard, 60000);

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 text-lg font-semibold mb-2">❌ Error Loading Dashboard</div>
          <p className="text-red-700 mb-4">{error}</p>
          <button 
            onClick={fetchDashboard}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { systemStats, departmentComparison, recentActivity, equipmentUtilization, pendingApprovals, performance } = dashboardData || {};

  // Health score color
  const getHealthColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="admin-dashboard p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">System Overview</h1>
          <p className="text-gray-600">Company-wide operations dashboard</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Last updated</div>
          <div className="text-sm font-medium">{lastRefresh.toLocaleTimeString()}</div>
        </div>
      </div>

      {/* System Health Score */}
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-700">System Health</h2>
            <p className="text-sm text-gray-500">Overall operational status</p>
          </div>
          <div className={`text-4xl font-bold px-6 py-3 rounded-lg ${getHealthColor(systemStats?.healthScore)}`}>
            {systemStats?.healthScore || 0}%
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Users */}
        <div className="bg-white rounded-lg shadow p-6 border-t-4 border-blue-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">👥</span>
            <span className="text-2xl font-bold text-blue-600">{systemStats?.users?.total || 0}</span>
          </div>
          <div className="text-gray-700 font-medium">Total Users</div>
          <div className="text-xs text-gray-500 mt-2">
            {systemStats?.users?.engineers || 0} Engineers • {systemStats?.users?.managers || 0} Managers • {systemStats?.users?.staff || 0} Staff
          </div>
        </div>

        {/* Requests */}
        <div className="bg-white rounded-lg shadow p-6 border-t-4 border-orange-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">📋</span>
            <span className="text-2xl font-bold text-orange-600">{systemStats?.requests?.pending || 0}</span>
          </div>
          <div className="text-gray-700 font-medium">Pending Requests</div>
          <div className="text-xs text-gray-500 mt-2">
            {systemStats?.requests?.total || 0} Total • {systemStats?.requests?.completedThisMonth || 0} Completed This Month
          </div>
        </div>

        {/* Equipment */}
        <div className="bg-white rounded-lg shadow p-6 border-t-4 border-green-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">🛠️</span>
            <span className="text-2xl font-bold text-green-600">{systemStats?.equipment?.operational || 0}</span>
          </div>
          <div className="text-gray-700 font-medium">Operational Equipment</div>
          <div className="text-xs text-gray-500 mt-2">
            {systemStats?.equipment?.assigned || 0} Assigned • {systemStats?.equipment?.maintenance || 0} In Maintenance
          </div>
        </div>

        {/* Departments */}
        <div className="bg-white rounded-lg shadow p-6 border-t-4 border-purple-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">🏢</span>
            <span className="text-2xl font-bold text-purple-600">{systemStats?.departments || 0}</span>
          </div>
          <div className="text-gray-700 font-medium">Active Departments</div>
          <div className="text-xs text-gray-500 mt-2">
            {systemStats?.requests?.thisMonth || 0} Requests This Month
          </div>
        </div>
      </div>

      {/* Department Comparison Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">Department Performance</h2>
          <p className="text-sm text-gray-500">Compare metrics across all departments</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Members</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Pending</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Active</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Completed</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Equipment</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Avg Approval</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {departmentComparison?.map((dept) => (
                <tr key={dept.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{dept.name}</div>
                    <div className="text-xs text-gray-500">{dept.description}</div>
                  </td>
                  <td className="px-6 py-4 text-center">{dept.memberCount}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      dept.pendingRequests > 5 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {dept.pendingRequests}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">{dept.activeRequests}</td>
                  <td className="px-6 py-4 text-center text-green-600 font-medium">{dept.completedRequests}</td>
                  <td className="px-6 py-4 text-center">{dept.equipmentAssigned}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-sm ${
                      dept.avgApprovalHours > 24 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {dept.avgApprovalHours}h
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-800">Recent Activity</h2>
            <p className="text-sm text-gray-500">Latest 20 requests across all departments</p>
          </div>
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {recentActivity?.slice(0, 20).map((activity) => (
              <div key={activity.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-gray-900 text-sm">{activity.subject}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    activity.status === 'Completed' ? 'bg-green-100 text-green-800' :
                    activity.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                    activity.status === 'Approved' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {activity.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{activity.department_name}</span>
                  <span>•</span>
                  <span>{activity.requested_by_name} ({activity.requester_role})</span>
                  <span>•</span>
                  <span>{new Date(activity.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-800">Urgent Approvals</h2>
            <p className="text-sm text-gray-500">Top 10 pending requests system-wide</p>
          </div>
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {pendingApprovals?.map((request) => (
              <div key={request.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-gray-900 text-sm">{request.subject}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    request.priority === 'Urgent' ? 'bg-red-100 text-red-800' :
                    request.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {request.priority}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{request.department_name}</span>
                  <span>•</span>
                  <span>{request.requested_by_name}</span>
                  <span>•</span>
                  <span className={request.hours_pending > 48 ? 'text-red-600 font-medium' : ''}>
                    {request.hours_pending}h pending
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Performance Metrics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">System Performance (Last 30 Days)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-800">{performance?.last30Days?.totalRequests || 0}</div>
            <div className="text-sm text-gray-600">Total Requests</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{performance?.last30Days?.completionRate || 0}%</div>
            <div className="text-sm text-gray-600">Completion Rate</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{performance?.last30Days?.avgApprovalHours || 0}h</div>
            <div className="text-sm text-gray-600">Avg Approval Time</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{performance?.last30Days?.avgCompletionDays || 0}d</div>
            <div className="text-sm text-gray-600">Avg Completion Time</div>
          </div>
        </div>
      </div>

      {/* Equipment Utilization */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Equipment Utilization</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {equipmentUtilization?.map((item) => (
            <div key={item.status} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">{item.status}</span>
                <span className="text-lg font-bold text-gray-800">{item.count}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    item.status === 'Operational' ? 'bg-green-500' :
                    item.status === 'Maintenance' ? 'bg-yellow-500' :
                    'bg-gray-500'
                  }`}
                  style={{ width: `${item.percentage}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">{item.percentage}% of total</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;