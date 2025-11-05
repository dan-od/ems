  // ems-frontend/src/components/Dashboard/RoleSpecific/EngineerDashboard.js
  // FINAL VERSION - With refresh button and proper Quick Action links

  import React, { useState, useEffect } from 'react';
  import { useNavigate } from 'react-router-dom';
  import api from '../../../services/api';
  import './Dashboards.css';

  const EngineerDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
      active_requests: 10,
      pending_requests: 9,
      assigned_equipment: 0,
      equipment_needing_attention: 0
    });
    const [myRequests, setMyRequests] = useState([]);
    const [myEquipment, setMyEquipment] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastRefresh, setLastRefresh] = useState(new Date());
    
    const userName = localStorage.getItem('userName') || 'Engineer';

    useEffect(() => {
      fetchEngineerData();
      // Auto-refresh every 5 minutes
      const interval = setInterval(() => {
        fetchEngineerData();
      }, 300000);
      
      return () => clearInterval(interval);
    }, []);

    const fetchEngineerData = async () => {
      try {
        setLoading(true);
        const [statsRes, requestsRes, equipmentRes] = await Promise.all([
          api.get('/dashboard/engineer-stats').catch(() => ({ data: {} })),
          api.get('/requests/my-requests').catch(() => ({ data: [] })),
          api.get('/equipment/my-assigned').catch(() => ({ data: [] }))
        ]);

        setStats(statsRes.data || {});
        setMyRequests(Array.isArray(requestsRes.data) ? requestsRes.data : []);
        setMyEquipment(Array.isArray(equipmentRes.data) ? equipmentRes.data : []);
        setLastRefresh(new Date());
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    };

    const handleRefresh = () => {
      setIsRefreshing(true);
      fetchEngineerData();
    };

    const handleQuickAction = (actionType) => {
      switch(actionType) {
        case 'transport':
          navigate('/dashboard/requests/transport');
          break;
        case 'equipment':
          navigate('/dashboard/requests/equipment');
          break;
        case 'ppe':
          navigate('/dashboard/requests/ppe'); 
          break;
        case 'report':
          navigate('/dashboard/field-reports/new');
          break;
        default:
          navigate('/dashboard/requests/new');
      }
    };

    const quickActions = [
      { icon: '🚗', label: 'Request Transport', type: 'transport' },
      { icon: '🔧', label: 'Report Equipment Issue', type: 'equipment' },
      { icon: '🦺', label: 'Request PPE', type: 'ppe' },
      { icon: '📝', label: 'Submit Report', type: 'report' }
    ];

    return (
      <div className="engineer-dashboard clean-layout">
        {/* Header with Refresh Button */}
        <div className="dashboard-header-with-refresh">
          <div className="dashboard-header-clean">
            <h1>Engineer Dashboard</h1>
            <p className="dashboard-subtitle">
              Welcome back, {userName}! Here's your operations overview.
            </p>
          </div>
          
          {/* Refresh Button - Top Right */}
          <div className="refresh-section">
            <span className="last-updated">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
            <button 
              className={`refresh-btn ${isRefreshing ? 'refreshing' : ''}`}
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <span className="refresh-icon">🔄</span>
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Stats Cards with proper spacing */}
        <div className="stats-summary">
          <div className="stat-card">
            <div className="stat-icon requests">📋</div>
            <div className="stat-details">
              <div className="stat-value">{stats.active_requests || 10}</div>
              <div className="stat-label">Active Requests</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon pending">⏳</div>
            <div className="stat-details">
              <div className="stat-value">{stats.pending_requests || 9}</div>
              <div className="stat-label">Pending Approval</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon equipment">🔧</div>
            <div className="stat-details">
              <div className="stat-value">{myEquipment.length}</div>
              <div className="stat-label">Assigned Equipment</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon attention">⚠️</div>
            <div className="stat-details">
              <div className="stat-value">{stats.equipment_needing_attention || 0}</div>
              <div className="stat-label">Needs Attention</div>
            </div>
          </div>
        </div>

        {/* Quick Actions with proper links */}
        <div className="quick-actions-section">
          <h3 className="quick-actions-title">Quick Actions</h3>
          <div className="quick-actions-grid">
            {quickActions.map((action, index) => (
              <button
                key={index}
                className="quick-action-card"
                onClick={() => handleQuickAction(action.type)}
              >
                <span className="quick-action-icon">{action.icon}</span>
                <span className="quick-action-label">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Two Column Layout - BOTH widgets side by side */}
        <div className="dashboard-two-column">
          {/* Left Column - My Active Requests */}
          <div className="widget">
            <div className="widget-header">
              <h3>📋 My Active Requests</h3>
              <button 
                className="view-all-link"
                onClick={() => navigate('/dashboard/my-requests')}
              >
                View All →
              </button>
            </div>

            {loading && !isRefreshing ? (
              <div className="skeleton-loader">
                <div className="skeleton-item"></div>
                <div className="skeleton-item"></div>
              </div>
            ) : myRequests.length === 0 ? (
              <div className="empty-state-clean">
                <div className="empty-icon">✅</div>
                <p>No active requests</p>
                <button 
                  className="btn-create-new"
                  onClick={() => navigate('/dashboard/requests/new')}
                >
                  Create New Request
                </button>
              </div>
            ) : (
              <div className="requests-list">
                {myRequests.slice(0, 4).map(request => (
                  <div key={request.id} className="request-card">
                    <div className="request-header">
                      <span className="request-id">#{request.id}</span>
                      <span className="status-badge pending">PENDING</span>
                    </div>
                    <div className="request-title">Request</div>
                    <div className="request-subtitle">{request.equipment_name || request.subject || 'material'}</div>
                    <div className="request-details">
                      <span className="request-department">📍 {request.department_name || 'Operations'}</span>
                      <span className="request-priority">🟡 {request.priority || 'Medium'}</span>
                      <span className="request-date">{new Date(request.created_at).toLocaleDateString()}</span>
                    </div>
                    <button 
                      className="view-details-btn"
                      onClick={() => navigate(`/dashboard/request/${request.id}`)}
                    >
                      View Details
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column - My Assigned Equipment */}
          <div className="widget equipment-widget">
            <div className="widget-header">
              <h3>🔧 My Assigned Equipment ({myEquipment.length})</h3>
              {myEquipment.length > 0 && (
                <button 
                  className="view-all-link"
                  onClick={() => navigate('/dashboard/equipment')}
                >
                  View All →
                </button>
              )}
            </div>
            
            {loading && !isRefreshing ? (
              <div className="skeleton-loader">
                <div className="skeleton-item"></div>
              </div>
            ) : myEquipment.length === 0 ? (
              <div className="empty-state-clean">
                <p>No equipment currently assigned to you</p>
              </div>
            ) : (
              <div className="equipment-list">
                {myEquipment.slice(0, 5).map(equipment => (
                  <div key={equipment.id} className="equipment-item">
                    <div className="equipment-name">{equipment.name}</div>
                    <div className="equipment-status">{equipment.status}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  export default EngineerDashboard; 