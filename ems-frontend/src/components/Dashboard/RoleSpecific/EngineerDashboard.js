// ems-frontend/src/components/Dashboard/RoleSpecific/EngineerDashboard.js
// FINAL VERSION - Clean layout with no duplicates

import React, { useState, useEffect } from 'react';
import QuickActions from '../Widgets/QuickActions';
import MyActiveRequests from '../Widgets/MyActiveRequests';
import EquipmentStatus from '../Widgets/EquipmentStatus';
import StatsSummary from '../Widgets/StatsSummary';
import api from '../../../services/api';
import './Dashboards.css';

const EngineerDashboard = () => {
  const [stats, setStats] = useState({
    active_requests: 0,
    pending_requests: 0,
    assigned_equipment: 0,
    equipment_needing_attention: 0,
    completed_this_month: 0
  });
  const [myRequests, setMyRequests] = useState([]);
  const [myEquipment, setMyEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState(new Date());
  const [error, setError] = useState(null);
  
  // Get user info from localStorage
  const userId = localStorage.getItem('userId');
  const userName = localStorage.getItem('userName');

  useEffect(() => {
    fetchEngineerData();
    // Set up auto-refresh every 60 seconds
    const interval = setInterval(() => {
      fetchEngineerData();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const fetchEngineerData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel
      const promises = [
        api.get('/dashboard/engineer-stats').catch(err => {
          console.error('Stats fetch failed:', err);
          return { data: {} };
        }),
        api.get('/requests/my-requests').catch(err => {
          console.error('Requests fetch failed:', err);
          return { data: [] };
        }),
        api.get('/equipment/my-assigned').catch(err => {
          console.error('Equipment fetch failed:', err);
          return { data: [] };
        })
      ];

      const [statsRes, requestsRes, equipmentRes] = await Promise.all(promises);

      // Update state with fetched data
      setStats(statsRes.data || {});
      
      // Ensure requests is always an array and remove duplicates
      const requestsData = Array.isArray(requestsRes.data) ? requestsRes.data : [];
      const uniqueRequests = requestsData.filter((request, index, self) =>
        index === self.findIndex((r) => r.id === request.id)
      );
      setMyRequests(uniqueRequests);
      
      // Ensure equipment is always an array
      const equipmentData = Array.isArray(equipmentRes.data) ? equipmentRes.data : [];
      setMyEquipment(equipmentData);
      
      setLastSync(new Date());
    } catch (error) {
      console.error('Failed to fetch engineer dashboard data:', error);
      setError('Failed to load dashboard data. Please try refreshing the page.');
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
        <button 
          className="sync-btn" 
          onClick={handleRefresh} 
          disabled={loading}
        >
          {loading ? '🔄 Syncing...' : '🔄 Sync Now'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className="error-close">✕</button>
        </div>
      )}

      {/* Page Title */}
      <div className="dashboard-header">
        <h1>Field Engineer Dashboard</h1>
        <p className="dashboard-subtitle">
          Welcome back, {userName || 'Engineer'}! Here's your operations overview.
        </p>
      </div>

      {/* Stats Summary */}
      <StatsSummary stats={stats} loading={loading} role="engineer" />

      {/* Quick Actions */}
      <QuickActions role="engineer" />

      {/* Two Column Layout - NO DUPLICATE WIDGET */}
      <div className="dashboard-main-grid">
        {/* Left Column - My Active Requests */}
        <div className="dashboard-left">
          <MyActiveRequests 
            requests={myRequests} 
            loading={loading} 
          />
        </div>

        {/* Right Column - My Assigned Equipment ONLY */}
        <div className="dashboard-right">
          <EquipmentStatus 
            equipment={myEquipment} 
            loading={loading} 
          />
          
          {/* You can add Activity Feed here later if needed */}
          {/* <ActivityFeed /> */}
        </div>
      </div>

      {/* Bottom Section - Weekly Summary */}
      <div className="widget activity-summary">
        <h3>📊 This Week's Summary</h3>
        <div className="activity-stats-grid">
          <div className="activity-stat">
            <div className="activity-value">{stats.completed_this_month || 0}</div>
            <div className="activity-label">Completed This Month</div>
          </div>
          <div className="activity-stat">
            <div className="activity-value">{myEquipment.length}</div>
            <div className="activity-label">Equipment Assigned</div>
          </div>
          <div className="activity-stat">
            <div className="activity-value">
              {myRequests.filter(r => r.status === 'Pending').length}
            </div>
            <div className="activity-label">Pending Approvals</div>
          </div>
          <div className="activity-stat">
            <div className="activity-value">{stats.active_requests || 0}</div>
            <div className="activity-label">Active Requests</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EngineerDashboard;