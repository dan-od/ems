// ems-frontend/src/components/Dashboard/Widgets/Manager/TeamOverview.jsx
import React, { useState } from 'react';

const TeamOverview = ({ team }) => {
  const [expandedId, setExpandedId] = useState(null);

  const getRoleBadgeClass = (role) => {
    return role === 'engineer' 
      ? 'bg-blue-100 text-blue-800' 
      : 'bg-green-100 text-green-800';
  };

  const getRoleIcon = (role) => {
    return role === 'engineer' ? '⚙️' : '👔';
  };

  const toggleExpand = (userId) => {
    setExpandedId(expandedId === userId ? null : userId);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full">
      {/* Widget Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">👥</span>
          <h2 className="text-lg font-semibold text-gray-800">Team Overview</h2>
          {team.length > 0 && (
            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {team.length}
            </span>
          )}
        </div>
      </div>

      {/* Team List */}
      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {team.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="text-6xl mb-4">👤</div>
            <p className="text-gray-600 font-medium">No team members</p>
            <p className="text-gray-500 text-sm mt-1">
              No engineers or staff assigned to this department
            </p>
          </div>
        ) : (
          team.map((member) => (
            <div 
              key={member.id}
              className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => toggleExpand(member.id)}
            >
              {/* Member Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{getRoleIcon(member.role)}</div>
                  <div>
                    <div className="font-semibold text-gray-900">{member.name}</div>
                    <div className="text-xs text-gray-500">{member.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getRoleBadgeClass(member.role)}`}>
                    {member.role}
                  </span>
                  <svg 
                    className={`w-5 h-5 text-gray-400 transition-transform ${expandedId === member.id ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedId === member.id && (
                <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-gray-500 text-xs mb-1">Active Requests</div>
                    <div className="font-semibold text-orange-600 text-lg">
                      {member.active_requests || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs mb-1">Assigned Equipment</div>
                    <div className="font-semibold text-green-600 text-lg">
                      {member.assigned_equipment || 0}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Summary Footer */}
      {team.length > 0 && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <div className="text-sm text-gray-600 flex items-center justify-between">
            <span>
              Total: <strong className="text-gray-900">{team.length}</strong> team members
            </span>
            <span className="text-xs">
              {team.filter(m => m.role === 'engineer').length} engineers, {' '}
              {team.filter(m => m.role === 'staff').length} staff
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamOverview;