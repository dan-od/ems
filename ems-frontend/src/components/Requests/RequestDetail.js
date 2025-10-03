import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './Requests.css';

const RequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        const { data } = await api.get(`/requests/${id}`);
        setRequest(data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch request details');
        console.error('Error fetching request:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRequest();
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    try {
      await api.patch(`/requests/${id}`, { status: newStatus });
      // Refresh the request data
      const { data } = await api.get(`/requests/${id}`);
      setRequest(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update request status');
      console.error('Error updating request:', err);
    }
  };

  if (loading) return <div className="loading">Loading request details...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!request) return <div className="error">Request not found</div>;

  return (
    <div className="request-detail-container">
      <div className="request-detail-header">
        <h1>Request Details</h1>
        <button 
          className="back-button"
          onClick={() => navigate('/dashboard/my-requests')}
        >
          Back to Requests
        </button>
      </div>

      <div className="request-detail-card">
        <div className="request-detail-section">
          <h2>Request Information</h2>
          <div className="request-info-grid">
            <div className="info-item">
              <span className="info-label">Request ID:</span>
              <span className="info-value">{request.id}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Equipment:</span>
              <span className="info-value">
                {request.is_new_equipment ? (
                  <span className="new-equipment-tag">
                    {request.new_equipment_name} (New Equipment)
                  </span>
                ) : (
                  request.equipment_name
                )}
              </span>
            </div>
            {request.is_new_equipment && (
              <div className="info-item">
                <span className="info-label">Equipment Specification:</span>
                <span className="info-value">{request.new_equipment_description}</span>
              </div>
            )}
            <div className="info-item">
              <span className="info-label">Requested By:</span>
              <span className="info-value">{request.requested_by_name}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Status:</span>
              <span className={`status-badge ${request.status.toLowerCase()}`}>
                {request.status}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Priority:</span>
              <span className={`priority-badge ${request.priority.toLowerCase()}`}>
                {request.priority}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Created:</span>
              <span className="info-value">
                {new Date(request.created_at).toLocaleString()}
              </span>
            </div>
            {request.approved_by_name && (
              <div className="info-item">
                <span className="info-label">Approved/Rejected By:</span>
                <span className="info-value">{request.approved_by_name}</span>
              </div>
            )}
            {request.approved_at && (
              <div className="info-item">
                <span className="info-label">Approved/Rejected At:</span>
                <span className="info-value">
                  {new Date(request.approved_at).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="request-detail-section">
          <h2>Subject</h2>
          <p className="request-subject">{request.subject}</p>
        </div>

        <div className="request-detail-section">
          <h2>Description</h2>
          <p className="request-description">{request.description}</p>
        </div>

        {/* Only show action buttons if request is Pending AND user is manager/admin */}
        {request.status === 'Pending' && (user?.role === 'manager' || user?.role === 'admin') && (
          <div className="request-actions">
            <button
              className="approve-btn"
              onClick={() => handleStatusChange('Approved')}
            >
              Approve Request
            </button>
            <button
              className="reject-btn"
              onClick={() => handleStatusChange('Rejected')}
            >
              Reject Request
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default RequestDetail; 