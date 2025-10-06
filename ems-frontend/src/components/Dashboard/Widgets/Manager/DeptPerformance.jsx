// ems-frontend/src/components/Dashboard/Widgets/Manager/DeptPerformance.jsx
import React from 'react';

const DeptPerformance = ({ metrics }) => {
  // Calculate metrics with fallbacks
  const avgApprovalTime = parseFloat(metrics.avgApprovalTime || 0);
  const totalRequests = parseInt(metrics.totalRequests || 0);
  const approvedCount = parseInt(metrics.approvedCount || 0);
  const completedCount = parseInt(metrics.completedCount || 0);
  const rejectedCount = parseInt(metrics.rejectedCount || 0);
  const completionRate = parseFloat(metrics.completionRate || 0);

  // Determine approval time status
  const getApprovalTimeStatus = (hours) => {
    if (hours === 0) return { color: 'gray', label: 'No Data', icon: '—' };
    if (hours < 4) return { color: 'green', label: 'Excellent', icon: '⚡' };
    if (hours < 12) return { color: 'blue', label: 'Good', icon: '👍' };
    if (hours < 24) return { color: 'yellow', label: 'Fair', icon: '⏱️' };
    return { color: 'red', label: 'Needs Improvement', icon: '⚠️' };
  };

  // Determine completion rate status
  const getCompletionRateStatus = (rate) => {
    if (rate === 0) return { color: 'gray', label: 'No Data' };
    if (rate >= 80) return { color: 'green', label: 'Excellent' };
    if (rate >= 60) return { color: 'blue', label: 'Good' };
    if (rate >= 40) return { color: 'yellow', label: 'Fair' };
    return { color: 'red', label: 'Needs Improvement' };
  };

  const approvalTimeStatus = getApprovalTimeStatus(avgApprovalTime);
  const completionRateStatus = getCompletionRateStatus(completionRate);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Widget Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📈</span>
          <h2 className="text-lg font-semibold text-gray-800">Department Performance</h2>
        </div>
        <p className="text-xs text-gray-500 mt-1">Last 7 days</p>
      </div>

      {/* Performance Metrics */}
      <div className="p-6 space-y-6">
        {/* Total Requests Overview */}
        <div>
          <div className="text-sm font-medium text-gray-700 mb-3">Request Breakdown</div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-3 rounded-lg bg-gray-50">
              <div className="text-2xl font-bold text-gray-900">{totalRequests}</div>
              <div className="text-xs text-gray-600 mt-1">Total</div>
            </div>
            <div className="p-3 rounded-lg bg-green-50">
              <div className="text-2xl font-bold text-green-700">{approvedCount}</div>
              <div className="text-xs text-green-600 mt-1">Approved</div>
            </div>
            <div className="p-3 rounded-lg bg-blue-50">
              <div className="text-2xl font-bold text-blue-700">{completedCount}</div>
              <div className="text-xs text-blue-600 mt-1">Completed</div>
            </div>
            <div className="p-3 rounded-lg bg-red-50">
              <div className="text-2xl font-bold text-red-700">{rejectedCount}</div>
              <div className="text-xs text-red-600 mt-1">Rejected</div>
            </div>
          </div>
        </div>

        {/* Average Approval Time */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-700">Avg. Approval Time</div>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
              approvalTimeStatus.color === 'green' ? 'bg-green-100 text-green-800' :
              approvalTimeStatus.color === 'blue' ? 'bg-blue-100 text-blue-800' :
              approvalTimeStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
              approvalTimeStatus.color === 'red' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {approvalTimeStatus.icon} {approvalTimeStatus.label}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-bold text-gray-900">
              {avgApprovalTime.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">hours</div>
          </div>
          {avgApprovalTime > 0 && (
            <div className="mt-2">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${
                    approvalTimeStatus.color === 'green' ? 'bg-green-500' :
                    approvalTimeStatus.color === 'blue' ? 'bg-blue-500' :
                    approvalTimeStatus.color === 'yellow' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${Math.min((48 - avgApprovalTime) / 48 * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0h</span>
                <span>Target: &lt;12h</span>
                <span>48h</span>
              </div>
            </div>
          )}
        </div>

        {/* Completion Rate */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-700">Completion Rate</div>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
              completionRateStatus.color === 'green' ? 'bg-green-100 text-green-800' :
              completionRateStatus.color === 'blue' ? 'bg-blue-100 text-blue-800' :
              completionRateStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
              completionRateStatus.color === 'red' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {completionRateStatus.label}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-bold text-gray-900">
              {completionRate}%
            </div>
            <div className="text-sm text-gray-600">of requests completed</div>
          </div>
          {totalRequests > 0 && (
            <div className="mt-2">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${
                    completionRateStatus.color === 'green' ? 'bg-green-500' :
                    completionRateStatus.color === 'blue' ? 'bg-blue-500' :
                    completionRateStatus.color === 'yellow' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span>Target: 80%</span>
                <span>100%</span>
              </div>
            </div>
          )}
        </div>

        {/* Empty State */}
        {totalRequests === 0 && (
          <div className="text-center py-6">
            <div className="text-4xl mb-2">📊</div>
            <p className="text-gray-600 text-sm">No activity in the last 7 days</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeptPerformance;