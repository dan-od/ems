import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";

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

  // Auto-refresh every 30 seconds
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
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="manager-header">
        <h1>Department Requests Management</h1>
        <p>Approve, reject, or transfer requests</p>

        {userRole === 'admin' && (
          <div className="mb-4">
            <label className="mr-2 font-semibold">Select Department:</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="border rounded p-2"
            >
              <option value="">-- choose dept --</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
      </div>

      <div className="requests-grid">
        {requests.length === 0 ? (
          <p>No pending requests</p>
        ) : (
          requests.map((request) => (
            <div key={request.id} className="bg-white shadow rounded-xl p-6 space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h3>{request.subject}</h3>
                <span className={`priority-badge ${request.priority?.toLowerCase()}`}>
                  {request.priority}
                </span>
              </div>

              <div className="request-details">
                <p><strong>Requested by:</strong> {request.requested_by_name}</p>
                <p><strong>Date:</strong> {new Date(request.created_at).toLocaleDateString()}</p>
                <p><strong>Department:</strong> {request.department_name}</p>
              </div>

              <div className="flex gap-3 mt-4">
                <button onClick={() => handleApprove(request.id)} disabled={actionLoading}
                  className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700">
                  Approve
                </button>
                <button onClick={() => setSelectedRequest(request.id)} disabled={actionLoading}
                  className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700">
                  Reject
                </button>
                <button onClick={() => loadTransferOptions(request.id)} disabled={actionLoading}
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
                  Transfer
                </button>
              </div>

              {selectedRequest === request.id && (
                <div className="action-form mt-4">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter reason..."
                    rows={3}
                    className="w-full border rounded p-2"
                  />
                  <div className="flex gap-2 mt-2">
                    {transferOptions.length > 0 ? (
                      <>
                        <select
                          onChange={(e) => handleTransfer(request.id, e.target.value)}
                          className="flex-1 border rounded p-2"
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
                          className="px-4 py-2 bg-gray-300 rounded"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleReject(request.id)}
                          disabled={!notes.trim()}
                          className="px-4 py-2 bg-red-600 text-white rounded"
                        >
                          Confirm Reject
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRequest(null);
                            setNotes('');
                          }}
                          className="px-4 py-2 bg-gray-300 rounded"
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