// ems-frontend/src/components/Dashboard/RoleSpecific/ManagerDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../services/api';
import { useAutoRefresh } from '../../../hooks/useAutoRefresh';
import ApprovalQueue from '../Widgets/Manager/ApprovalQueue';
import TeamOverview from '../Widgets/Manager/TeamOverview';
import CrossDeptActivity from '../Widgets/Manager/CrossDeptActivity';
import DeptPerformance from '../Widgets/Manager/DeptPerformance';
import './ManagerDashboard.css';

const ManagerDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/stats/manager-dashboard');
      setDashboardData(data);
      setError(null);
      setLastRefresh(new Date());
      console.log('✅ Manager dashboard loaded:', data);
    } catch (err) {
      console.error('❌ Failed to fetch manager dashboard:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // Auto-refresh every 30 seconds
  useAutoRefresh(fetchDashboard, 30000);

  // Loading state
  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading manager dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
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

  // Build stats cards data
  const stats = [
    { 
      label: 'Pending Approvals', 
      value: dashboardData?.stats?.pendingApprovals || 0,
      color: 'orange',
      icon: '⚠️',
      urgent: dashboardData?.stats?.pendingApprovals > 10
    },
    { 
      label: 'Team Active Jobs', 
      value: dashboardData?.stats?.teamActiveJobs || 0,
      color: 'blue',
      icon: '⚙️'
    },
    { 
      label: 'Dept Equipment', 
      value: dashboardData?.stats?.deptEquipmentAssigned || 0,
      color: 'green',
      icon: '📦'
    },
    { 
      label: 'Completed This Month', 
      value: dashboardData?.stats?.monthCompleted || 0,
      color: 'purple',
      icon: '✅'
    }
  ];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">Manager Dashboard</h1>
          <p className="text-gray-600 mt-1">Department Operations Overview</p>
        </div>
        <div className="mt-4 lg:mt-0 flex items-center gap-4">
          <span className="text-sm text-gray-500">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
          <button 
            onClick={fetchDashboard}
            className="text-orange-600 hover:text-orange-700 text-sm font-medium"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div 
            key={index}
            className={`bg-white border rounded-lg p-6 text-center shadow-sm transition-all hover:shadow-md ${
              stat.urgent ? 'ring-2 ring-orange-400' : ''
            }`}
          >
            <div className="text-3xl mb-2">{stat.icon}</div>
            <div className={`text-4xl font-bold ${
              stat.color === 'orange' ? 'text-orange-500' :
              stat.color === 'blue' ? 'text-blue-500' :
              stat.color === 'green' ? 'text-green-500' :
              'text-purple-500'
            }`}>
              {stat.value}
            </div>
            <div className="text-sm text-gray-600 mt-2">{stat.label}</div>
            {stat.urgent && (
              <div className="text-xs text-orange-600 font-semibold mt-1">
                Needs Attention!
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Approval Queue - Full width on mobile, 2/3 width on desktop */}
        <div className="lg:col-span-2">
          <ApprovalQueue 
            queue={dashboardData?.approvalQueue || []}
            onRefresh={fetchDashboard}
          />
        </div>

        {/* Team Overview - 1/3 width on desktop */}
        <div className="lg:col-span-1">
          <TeamOverview 
            team={dashboardData?.teamMembers || []}
          />
        </div>
      </div>

      {/* Secondary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cross-Department Activity */}
        <div>
          <CrossDeptActivity 
            transfers={dashboardData?.crossDeptTransfers || { incoming: [], outgoing: [] }}
          />
        </div>

        {/* Department Performance */}
        <div>
          <DeptPerformance 
            metrics={dashboardData?.performance || {}}
          />
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;