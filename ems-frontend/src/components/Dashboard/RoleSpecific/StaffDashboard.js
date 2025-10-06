import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { useAutoRefresh } from '../../../hooks/useAutoRefresh';

const StaffDashboard = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMyRequests = async () => {
    try {
      const { data } = await api.get('/requests/my-requests');
      setRequests(data);
      setError('');
    } catch (err) {
      console.error('Failed to fetch requests:', err);
      setError('Failed to load your requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyRequests();
  }, []);

  // Auto-refresh every 30 seconds
  useAutoRefresh(fetchMyRequests, 30000);

  const getStatusBadgeClass = (status) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'approved':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'transferred':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityBadgeClass = (priority) => {
    const p = (priority || '').toLowerCase();
    switch (p) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-800">Staff Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage your office requests and tasks</p>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/dashboard/requests/new')}
            className="flex flex-col items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition"
          >
            <span className="text-3xl mb-2">🖥️</span>
            <span className="text-sm font-medium text-gray-700">IT Support</span>
          </button>
          
          <button
            onClick={() => navigate('/dashboard/requests/new')}
            className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
          >
            <span className="text-3xl mb-2">🗂️</span>
            <span className="text-sm font-medium text-gray-700">Office Supplies</span>
          </button>
          
          <button
            onClick={() => navigate('/dashboard/requests/new')}
            className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition"
          >
            <span className="text-3xl mb-2">🚗</span>
            <span className="text-sm font-medium text-gray-700">Transport</span>
          </button>
          
          <button
            onClick={() => navigate('/dashboard/requests/new')}
            className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition"
          >
            <span className="text-3xl mb-2">💰</span>
            <span className="text-sm font-medium text-gray-700">Travel Advance</span>
          </button>
        </div>
      </div>

      {/* My Requests */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">My Requests</h2>
        
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">{error}</div>
        ) : requests.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No requests yet</p>
            <button
              onClick={() => navigate('/dashboard/requests/new')}
              className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              Create Your First Request
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">Subject</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Department</th>
                  <th className="px-4 py-3 text-left">Priority</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell">Date</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {requests.map(req => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{req.subject || '—'}</td>
                    <td className="px-4 py-3 hidden md:table-cell">{req.department_name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadgeClass(req.priority)}`}>
                        {req.priority || 'Medium'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(req.status)}`}>
                        {req.status || 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {new Date(req.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/dashboard/requests/${req.id}`)}
                        className="text-orange-600 hover:text-orange-800 font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Notifications</h2>
        <div className="space-y-3">
          {requests.filter(r => r.status === 'Approved').length > 0 && (
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                ✅ {requests.filter(r => r.status === 'Approved').length} request(s) approved
              </p>
            </div>
          )}
          {requests.filter(r => r.status === 'Pending').length > 0 && (
            <div className="p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⏳ {requests.filter(r => r.status === 'Pending').length} request(s) pending approval
              </p>
            </div>
          )}
          {requests.filter(r => r.status === 'Rejected').length > 0 && (
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-red-800">
                ❌ {requests.filter(r => r.status === 'Rejected').length} request(s) rejected
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;