import React, { useState, useEffect } from 'react';
import { equipmentService } from '../../services/api';
import EquipmentForm from './EquipmentForm';

const EquipmentList = () => {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      const { data } = await equipmentService.getAll();
      setEquipment(data || []);
    } catch (err) {
      console.error('Failed to fetch equipment:', err);
      setError('Failed to load equipment');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, []);

  const handleEdit = (item) => {
    setSelectedEquipment(item);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this equipment?')) return;
    try {
      await equipmentService.delete(id);
      fetchEquipment();
    } catch (err) {
      alert('Failed to delete equipment');
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'operational':
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'maintenance':
      case 'under_maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'retired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredEquipment = equipment.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status?.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  if (loading) return <div className="flex justify-center items-center h-64">Loading equipment...</div>;
  if (error) return <div className="text-red-500 text-center">{error}</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <h1 className="text-2xl font-bold">All Equipment</h1>
        <button
          onClick={() => {
            setSelectedEquipment(null);
            setShowForm(true);
          }}
          className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors"
        >
          + Add Equipment
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <input
          type="text"
          placeholder="Search equipment..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="all">All Status</option>
          <option value="operational">Operational</option>
          <option value="maintenance">Maintenance</option>
          <option value="retired">Retired</option>
        </select>
      </div>

      {/* Desktop: Table View */}
      <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Maintained</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredEquipment.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{item.name}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4">{item.location || '—'}</td>
                <td className="px-6 py-4">
                  {item.last_maintained 
                    ? new Date(item.last_maintained).toLocaleDateString() 
                    : '—'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: Card View */}
      <div className="lg:hidden space-y-4">
        {filteredEquipment.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{item.name}</h3>
                <p className="text-sm text-gray-600">{item.location || 'No location'}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                {item.status}
              </span>
            </div>

            <div className="text-sm">
              <div className="flex justify-between py-2 border-t">
                <span className="text-gray-600">Last Maintained:</span>
                <span className="font-medium">
                  {item.last_maintained 
                    ? new Date(item.last_maintained).toLocaleDateString() 
                    : 'Never'}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => handleEdit(item)}
                className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(item.id)}
                className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredEquipment.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No equipment found. {searchTerm && 'Try adjusting your search.'}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <EquipmentForm
          equipment={selectedEquipment}
          onClose={() => {
            setShowForm(false);
            setSelectedEquipment(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setSelectedEquipment(null);
            fetchEquipment();
          }}
        />
      )}
    </div>
  );
};

export default EquipmentList;