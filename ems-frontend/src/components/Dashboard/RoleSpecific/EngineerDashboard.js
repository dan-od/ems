import React, { useState, useEffect } from 'react';
import QuickActions from '../Widgets/QuickActions';
import MyActiveRequests from '../Widgets/MyActiveRequests';
import EquipmentStatus from '../Widgets/EquipmentStatus';
import StatsSummary from '../Widgets/StatsSummary';
import api from '../../../services/api';
import './Dashboards.css';

const EngineerDashboard = () => {
  const [stats, setStats] = useState({});
  const [myRequests, setMyRequests] = useState([]);
  const [myEquipment, setMyEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState(new Date());
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEngineerData();
  }, []);

  const fetchEngineerData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [statsRes, requestsRes, equipmentRes] = await Promise.all([
        api.get('/dashboard/engineer-stats'),
        api.get('/requests/my-requests'),
        api.get('/equipment/my-assigned')
      ]);

      setStats(statsRes.data);
      setMyRequests(requestsRes.data);
      setMyEquipment(equipmentRes.data);
      setLastSync(new Date());
    } catch (error) {
      console.error('Failed to fetch engineer dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
      
      // Set empty data to avoid crashes
      setStats({});
      setMyRequests([]);
      setMyEquipment([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchEngineerData();
  };

  return (
    <div className="engineer-dashboard">
      {/* Sync Status Bar */}
      <div className="dashboard-sync-bar">
        <div className="sync-info">
          <span className="sync-icon">📡</span>
          <span className="sync-text">
            Last synced: {lastSync.toLocaleTimeString()}
          </span>
        </div>
        <button className="sync-btn" onClick={handleRefresh} disabled={loading}>
          {loading ? '🔄 Syncing...' : '🔄 Sync Now'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Page Title */}
      <div className="dashboard-header">
        <h1>Field Engineer Dashboard</h1>
        <p className="dashboard-subtitle">Your operations command center</p>
      </div>

      {/* Stats Summary */}
      <StatsSummary stats={stats} loading={loading} role="engineer" />

      {/* Quick Actions */}
      <QuickActions role="engineer" />

      {/* Two Column Layout */}
      <div className="dashboard-grid">
        {/* Left Column - Requests */}
        <div className="dashboard-column">
          <MyActiveRequests requests={myRequests} loading={loading} />
        </div>

        {/* Right Column - Equipment */}
        <div className="dashboard-column">
          <EquipmentStatus equipment={myEquipment} loading={loading} />
        </div>
      </div>

      {/* Activity Summary (Bottom Section) */}
      <div className="widget activity-summary">
        <h3>📊 This Week's Activity</h3>
        <div className="activity-stats-grid">
          <div className="activity-stat">
            <div className="activity-value">{stats.completed_this_month || 0}</div>
            <div className="activity-label">Requests Completed</div>
          </div>
          <div className="activity-stat">
            <div className="activity-value">{myEquipment.length}</div>
            <div className="activity-label">Equipment Used</div>
          </div>
          <div className="activity-stat">
            <div className="activity-value">{myRequests.filter(r => r.status === 'Pending').length}</div>
            <div className="activity-label">Pending Approvals</div>
          </div>
          <div className="activity-stat">
            <div className="activity-value">{myRequests.length}</div>
            <div className="activity-label">Total Requests</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EngineerDashboard;