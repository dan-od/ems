import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import './ManagerRequests.css'; // Add this import

const ManagerRequests = () => {
  const [requests, setRequests] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [transferOptions, setTransferOptions] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const userRole = localStorage.getItem('userRole') || '';

  useEffect(() => {
    if (userRole === 'admin') {
      fetchDepartments();
    }
  }, [userRole]);

  useEffect(() => {
    if (userRole === 'admin' && selectedDept) {
      fetchDeptRequests(selectedDept);
    } else if (userRole === 'manager') {
      fetchDeptRequests();
    }
  }, [userRole, selectedDept]);

  useAutoRefresh(() => {
    if (userRole === 'admin' && selectedDept) {
      fetchDeptRequests(selectedDept);
    } else if (userRole === 'manager') {
      fetchDeptRequests();
    }
  }, 30000, [userRole, selectedDept]);

  const fetchDepartments = async () => {
    try {
      const { data } = await api.get('/departments');
      setDepartments(data);
    } catch (err) {
      console.error('Failed to load departments:', err);
    }
  };

  const fetchDeptRequests = async (deptId) => {
    try {
      let url = '/requests/department/requests';
      if (deptId) {
        url += `?deptId=${deptId}`;
      }
      
      const { data } = await api.get(url);
      setRequests(data);
      setError('');
    } catch (err) {
      console.error('Failed to fetch department requests:', err);
      setError('Failed to fetch requests');
      setRequests([]);
    }
  };

  const handleApprove = async (requestId) => {
    if (!window.confirm('Are you sure you want to approve this request?')) return;
    setActionLoading(true);
    try {
      await api.patch(`/requests/${requestId}/approve`);
      alert('Request approved successfully');
      fetchDeptRequests(selectedDept);
    } catch (err) {
      console.error('Approve error:', err);
      alert('Failed to approve request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (requestId) => {
    if (!notes.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    if (!window.confirm('Are you sure you want to reject this request?')) return;
    setActionLoading(true);
    try {
      await api.patch(`/requests/${requestId}/reject`, { notes });
      alert('Request rejected successfully');
      setNotes('');
      setSelectedRequest(null);
      fetchDeptRequests(selectedDept);
    } catch (err) {
      console.error('Reject error:', err);
      alert('Failed to reject request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransfer = async (requestId, targetDeptId) => {
    if (!window.confirm('Are you sure you want to transfer this request?')) return;
    setActionLoading(true);
    try {
      await api.patch(`/requests/${requestId}/transfer`, { 
        targetDepartmentId: targetDeptId, 
        notes 
      });
      alert('Request transferred successfully');
      setNotes('');
      setSelectedRequest(null);
      setTransferOptions([]);
      fetchDeptRequests(selectedDept);
    } catch (err) {
      console.error('Transfer error:', err);
      alert('Failed to transfer request');
    } finally {
      setActionLoading(false);
    }
  };

  const loadTransferOptions = async (requestId) => {
    try {
      const { data } = await api.get(`/requests/${requestId}/transfer-options`);
      setTransferOptions(data);
      setSelectedRequest(requestId);
    } catch (err) {
      console.error('Load transfer options error:', err);
      alert('Failed to load transfer options');
    }
  };

  return (
    <div className="manager-requests-container">
      <div className="manager-header">
        <h1>Department Requests Management</h1>
        <p>Approve, reject, or transfer requests</p>

        {userRole === 'admin' && (
          <div className="dept-selector">
            <label>Select Department:</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
            >
              <option value="">-- choose dept --</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <div className="error-alert">
            {error}
          </div>
        )}
      </div>

      <div className="requests-grid">
        {requests.length === 0 ? (
          <p className="no-requests">No pending requests</p>
        ) : (
          requests.map((request) => (
            <div key={request.id} className="request-card-manager">
              <div className="request-card-header-manager">
                <h3>{request.subject}</h3>
                <span className={`priority-badge ${request.priority?.toLowerCase()}`}>
                  {request.priority}
                </span>
              </div>

              <div className="request-details">
                <div className="detail-row">
                  <strong>Requested by:</strong> 
                  <span>{request.requested_by_name}</span>
                </div>
                <div className="detail-row">
                  <strong>Date:</strong> 
                  <span>{new Date(request.created_at).toLocaleDateString()}</span>
                </div>
                <div className="detail-row">
                  <strong>Department:</strong> 
                  <span>{request.department_name}</span>
                </div>
              </div>

              <div className="action-buttons">
                <button 
                  onClick={() => handleApprove(request.id)} 
                  disabled={actionLoading}
                  className="btn-approve"
                >
                  Approve
                </button>
                <button 
                  onClick={() => setSelectedRequest(request.id)} 
                  disabled={actionLoading}
                  className="btn-reject"
                >
                  Reject
                </button>
                <button 
                  onClick={() => loadTransferOptions(request.id)} 
                  disabled={actionLoading}
                  className="btn-transfer"
                >
                  Transfer
                </button>
              </div>

              {selectedRequest === request.id && (
                <div className="action-form">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter reason..."
                    rows={3}
                  />
                  <div className="form-actions">
                    {transferOptions.length > 0 ? (
                      <>
                        <select
                          onChange={(e) => handleTransfer(request.id, e.target.value)}
                        >
                          <option value="">-- Select Department --</option>
                          {transferOptions.map(dept => (
                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => {
                            setSelectedRequest(null);
                            setTransferOptions([]);
                            setNotes('');
                          }}
                          className="btn-cancel"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleReject(request.id)}
                          disabled={!notes.trim()}
                          className="btn-confirm-reject"
                        >
                          Confirm Reject
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRequest(null);
                            setNotes('');
                          }}
                          className="btn-cancel"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ManagerRequests;