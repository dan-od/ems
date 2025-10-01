import React, { useState, useEffect } from 'react';
import EquipmentTable from '../Equipment/EquipmentTable';
import UserManagement from '../User/UserManagement';
import { requestService } from '../../services/api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import './Dashboard.css';

const DashboardHome = ({ userRole }) => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    fetchPendingRequests();
  }, []);

  useAutoRefresh(fetchPendingRequests, 30000);

  const getPriorityBadgeClass = (priority) => {
    const p = (priority || '').toString().toLowerCase();
    switch (p) {
      case 'urgent': return 'urgent';
      case 'high': return 'high';
      case 'medium': return 'medium';
      case 'low': return 'low';
      default: return 'in-progress';
    }
  };

  const getStatusBadgeClass = (status) => {
    const s = (status || '').toString().toLowerCase();
    switch (s) {
      case 'approved':
      case 'open':
      case 'active':
        return 'status-ok';
      case 'pending':
      case 'in-progress':
      case 'review':
        return 'status-warn';
      case 'rejected':
      case 'closed':
      case 'error':
        return 'status-bad';
      default:
        return 'status-neutral';
    }
  };

  return (
    <div className="dashboard-home">
      <header className="topbar">
        <h1>DASHBOARD</h1>
      </header>

      <div className="action-row">
        {(userRole === 'admin' || userRole === 'manager') && (
          <div className="action-buttons">
            <button className="action-btn">
              <i className="fas fa-plus"></i> Add Equipment
            </button>
            <button className="action-btn">
              <i className="fas fa-file-alt"></i> View All Logs
            </button>
            <button className="action-btn">
              <i className="fas fa-tools"></i> Equipment Maintenance
            </button>
          </div>
        )}
        <div className="search-container">
          <input
            className="search-filter"
            type="text"
            placeholder="Search & Filter"
            aria-label="Search and filter equipment"
          />
        </div>
      </div>

      <div className="dashboard-content">
        {userRole === 'admin' ? (
          <section className="panel user-management">
            <h2>
              <i className="fas fa-users"></i> User Management
            </h2>
            <UserManagement />
          </section>
        ) : (
          <section className="panel recent-requests">
            <h2>
              <i className="fas fa-clipboard-list"></i> Recent Requests
            </h2>
            {loading ? (
              <div className="loading-indicator">
                <i className="fas fa-spinner fa-spin"></i> Loading requests...
              </div>
            ) : error ? (
              <div className="error-message">
                <i className="fas fa-exclamation-circle"></i> {error}
              </div>
            ) : (pendingRequests ?? []).length === 0 ? (
              <p className="no-requests">No pending requests at the moment</p>
            ) : (
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>Equipment</th>
                      <th>Subject</th>
                      <th>Requested By</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingRequests.map(req => (
                      <tr key={req.id}>
                        <td>{req.equipmentName}</td>
                        <td>{req.subject}</td>
                        <td>{req.requestedByName}</td>
                        <td>
                          <span className={`status-badge ${getPriorityBadgeClass(req.priority)}`}>
                            {req.priority || '—'}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${getStatusBadgeClass(req.status)}`}>
                            {req.status || '—'}
                          </span>
                        </td>
                        <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        <section className="panel equipment-list">
          <h2>
            <i className="fas fa-boxes"></i> Equipment List
          </h2>
          <EquipmentTable />
        </section>
      </div>
    </div>
  );
};

export default DashboardHome;