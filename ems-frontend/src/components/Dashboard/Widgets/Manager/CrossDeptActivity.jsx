// ems-frontend/src/components/Dashboard/Widgets/Manager/CrossDeptActivity.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const CrossDeptActivity = ({ transfers }) => {
  const [activeTab, setActiveTab] = useState('incoming'); // 'incoming' or 'outgoing'

  const getPriorityClass = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = (now - date) / (1000 * 60 * 60);
    
    if (diffHours < 24) {
      return `${Math.floor(diffHours)} hrs ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const currentList = activeTab === 'incoming' ? transfers.incoming : transfers.outgoing;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Widget Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">🔄</span>
          <h2 className="text-lg font-semibold text-gray-800">Cross-Department Activity</h2>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('incoming')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'incoming'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            ⬇️ Incoming ({transfers.incoming.length})
          </button>
          <button
            onClick={() => setActiveTab('outgoing')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'outgoing'
                ? 'bg-orange-100 text-orange-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            ⬆️ Outgoing ({transfers.outgoing.length})
          </button>
        </div>
      </div>

      {/* Transfers List */}
      <div className="divide-y divide-gray-200 max-h-80 overflow-y-auto">
        {currentList.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="text-6xl mb-4">
              {activeTab === 'incoming' ? '📥' : '📤'}
            </div>
            <p className="text-gray-600 font-medium">
              No {activeTab} transfers
            </p>
            <p className="text-gray-500 text-sm mt-1">
              {activeTab === 'incoming' 
                ? 'No requests transferred to this department' 
                : 'No requests transferred to other departments'}
            </p>
          </div>
        ) : (
          currentList.map((transfer) => (
            <div 
              key={transfer.id}
              className="px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              {/* Transfer Header */}
              <div className="flex items-start justify-between mb-2">
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPriorityClass(transfer.priority)}`}>
                  {transfer.priority}
                </span>
                <span className="text-xs text-gray-500">
                  {formatDate(transfer.transferred_at || transfer.created_at)}
                </span>
              </div>

              {/* Transfer Content */}
              <div className="mb-2">
                <h4 className="font-semibold text-gray-900 text-sm mb-1">
                  {transfer.subject}
                </h4>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>
                    <span className="font-medium">From:</span> {transfer.requested_by_name}
                  </div>
                  <div>
                    <span className="font-medium">
                      {activeTab === 'incoming' ? 'Origin:' : 'Sent to:'}
                    </span>{' '}
                    {activeTab === 'incoming' ? transfer.origin_dept_name : transfer.target_dept_name}
                  </div>
                  {transfer.transferred_by_name && (
                    <div>
                      <span className="font-medium">By:</span> {transfer.transferred_by_name}
                    </div>
                  )}
                </div>
              </div>

              {/* View Link */}
              <Link 
                to={`/dashboard/requests/${transfer.id}`}
                className="text-orange-600 hover:text-orange-700 text-xs font-medium inline-flex items-center gap-1"
              >
                View Details
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          ))
        )}
      </div>

      {/* Footer Summary */}
      {(transfers.incoming.length > 0 || transfers.outgoing.length > 0) && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
          Total Transfers: <strong className="text-gray-900">
            {transfers.incoming.length + transfers.outgoing.length}
          </strong>
          {' '} ({transfers.incoming.length} in, {transfers.outgoing.length} out)
        </div>
      )}
    </div>
  );
};

export default CrossDeptActivity;