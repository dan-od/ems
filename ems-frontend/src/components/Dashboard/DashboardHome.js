import React, { useState, useEffect } from 'react';
import EquipmentTable from '../Equipment/EquipmentTable';
import UserManagement from '../User/UserManagement';
import './Dashboard.css';

const DashboardHome = ({ userRole }) => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPendingRequests = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/requests/dashboard/pending', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Accept': 'application/json'
          }
        });
        if (!response.ok) throw new Error('Failed to fetch pending requests');
        const raw = await response.json();

        // ---- Normalize backend → frontend (handles old/new field names safely) ----
        const data = (Array.isArray(raw) ? raw : []).map(r => {
          const priority =
            (r?.priority ?? r?.priority_level ?? r?.severity ?? '').toString();

          const status =
            (r?.status ?? r?.request_status ?? 'in-progress').toString();

          return {
            id: r?.id ?? r?.request_id ?? r?._id ?? crypto.randomUUID(),
            equipmentName:
              r?.equipment_name ??
              r?.equipmentName ??
              r?.equipment?.name ??
              'New Equipment',
            subject: r?.subject ?? r?.title ?? '—',
            requestedByName:
              r?.requested_by_name ??
              r?.requestedByName ??
              r?.requested_by ??
              r?.requester?.name ??
              'Unknown',
            priority,
            status,
            createdAt:
              r?.created_at ??
              r?.createdAt ??
              r?.created_on ??
              r?.created_at_utc ??
              r?.timestamp ??
              new Date().toISOString(),
          };
        });

        setPendingRequests(data);
      } catch (err) {
        setError(err.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };

    fetchPendingRequests();
  }, []);

  // --------- UI helpers (defensive against null/undefined) ----------
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
        return 'status-ok';          // add corresponding CSS classes
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
