// ems-frontend/src/components/Dashboard/Widgets/Manager/ApprovalQueue.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../../../services/api';

const ApprovalQueue = ({ queue, onRefresh }) => {
  const navigate = useNavigate();
  const [processingId, setProcessingId] = useState(null);

  const getPriorityClass = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatTimeAgo = (hours) => {
    if (hours < 1) return `${Math.floor(hours * 60)} min ago`;
    if (hours < 24) return `${Math.floor(hours)} hrs ago`;
    return `${Math.floor(hours / 24)} days ago`;
  };

  const handleQuickApprove = async (requestId) => {
    if (!window.confirm('Approve this request? This action cannot be undone.')) return;
    
    setProcessingId(requestId);
    try {
      await api.put(`/requests/${requestId}`, { 
        status: 'Approved',
        approved_by: parseInt(localStorage.getItem('userId'))
      });
      
      alert('✅ Request approved successfully!');
      await onRefresh();
    } catch (err) {
      console.error('Approval error:', err);
      alert(`❌ Failed to approve: ${err.response?.data?.error || err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Widget Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚡</span>
          <h2 className="text-lg font-semibold text-gray-800">Approval Queue</h2>
          {queue.length > 0 && (
            <span className="bg-orange-100 text-orange-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {queue.length}
            </span>
          )}
        </div>
        <Link 
          to="/dashboard/manager-requests" 
          className="text-orange-600 hover:text-orange-700 text-sm font-medium flex items-center gap-1"
        >
          View All
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Queue Content */}
      <div className="divide-y divide-gray-200">
        {queue.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="text-6xl mb-4">✅</div>
            <p className="text-gray-600 font-medium">All caught up!</p>
            <p className="text-gray-500 text-sm mt-1">No pending approvals at the moment</p>
          </div>
        ) : (
          queue.map((request) => (
            <div 
              key={request.id} 
              className="px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              {/* Request Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getPriorityClass(request.priority)}`}>
                    {request.priority}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTimeAgo(request.hours_pending)}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  #{request.id}
                </div>
              </div>

              {/* Request Content */}
              <div className="mb-3">
                <h4 className="font-semibold text-gray-900 mb-1">{request.subject}</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Requester:</span>
                    <span>{request.requested_by_name}</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                      {request.requester_role}
                    </span>
                  </div>
                  {request.equipment_name && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Equipment:</span>
                      <span>{request.equipment_name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button 
                  onClick={() => handleQuickApprove(request.id)}
                  disabled={processingId === request.id}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingId === request.id ? 'Processing...' : '✓ Approve'}
                </button>
                <Link 
                  to={`/dashboard/requests/${request.id}`}
                  className="flex-1 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-center"
                >
                  View Details →
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ApprovalQueue;