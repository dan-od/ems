import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const ManagerRequests = () => {
  const [requests, setRequests] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [transferOptions, setTransferOptions] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState('');

  const userRole = localStorage.getItem('userRole') || '';

  useEffect(() => {
    if (userRole === 'admin') {
      fetchDepartments(); // load available depts for dropdown
    }
  }, [userRole]);

  useEffect(() => {
    if (userRole === 'admin' && selectedDept) {
      fetchDeptRequests(selectedDept);
    } else if (userRole === 'manager') {
      fetchDeptRequests();
    }
  }, [userRole, selectedDept]);

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
      let url = '/requests/department/my-requests';
      if (deptId) url += `?deptId=${deptId}`;
      const { data } = await api.get(url);
      setRequests(data);
    } catch (err) {
      console.error('Failed to fetch department requests:', err);
    }
  };

  // Approve/Reject/Transfer handlers (unchanged, just fixed fetch calls)
  const handleApprove = async (requestId) => {
    if (!window.confirm('Are you sure you want to approve this request?')) return;
    setActionLoading(true);
    try {
      await api.patch(`/requests/${requestId}/approve`);
      alert('Request approved successfully');
      fetchDeptRequests(selectedDept);
    } catch (err) {
      console.error('Approve error:', err);
      alert('Failed to approve request: ' + (err.response?.data?.error || err.message));
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
      alert('Failed to reject request: ' + (err.response?.data?.error || err.message));
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
      alert('Failed to transfer request: ' + (err.response?.data?.error || err.message));
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
      </div>

      <div className="requests-grid">
        {requests.map((request) => (
          <div key={request.id} className="bg-white shadow rounded-xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3>{request.subject}</h3>
              <span className={`priority-badge ${request.priority.toLowerCase()}`}>
                {request.priority}
              </span>
            </div>

            <div className="request-details">
              <p><strong>Equipment:</strong> {request.equipment_name || 'N/A'}</p>
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
                  placeholder="Enter reason for rejection or transfer notes..."
                  rows={3}
                  className="w-full border rounded p-2"
                />
                <div className="flex gap-2 mt-2">
                  {transferOptions.length > 0 ? (
                    <>
                      <select onChange={(e) => handleTransfer(request.id, e.target.value)}>
                        <option value="">Select department...</option>
                        {transferOptions.map(dept => (
                          <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                      </select>
                      <button onClick={() => setSelectedRequest(null)}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleReject(request.id)}>Confirm Reject</button>
                      <button onClick={() => setSelectedRequest(null)}>Cancel</button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {requests.length === 0 && (
        <div className="no-requests">
          <p>No pending requests for this department</p>
        </div>
      )}
    </div>
  );
};

export default ManagerRequests;
