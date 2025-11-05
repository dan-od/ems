// ems-frontend/src/components/Equipment/EquipmentList.js
// UPDATED - Request Hub style header card

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { equipmentService } from '../../services/api';
import EquipmentForm from './EquipmentForm';
import './EquipmentList.css';

const EquipmentList = () => {
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');

  const userRole = localStorage.getItem('userRole');
  const canModify = userRole === 'admin' || userRole === 'manager';

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

  const handleViewLogs = (id, name) => {
    const encodedName = encodeURIComponent(name);
    navigate(`/dashboard/maintenance-logs?equipment=${id}&name=${encodedName}`);
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'operational':
        return 'status-operational';
      case 'maintenance':
        return 'status-maintenance';
      case 'retired':
        return 'status-retired';
      default:
        return 'status-default';
    }
  };

  const filteredEquipment = equipment.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All Status' || 
                         item.status?.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  if (loading) return (
    <div className="loading-container">
      <div className="spinner"></div>
      <div>Loading equipment...</div>
    </div>
  );

  if (error) return (
    <div className="error-container">
      <div className="error-message">{error}</div>
    </div>
  );

  return (
    <div className="equipment-page">
      {/* ✅ Request Hub Style Header Card */}
      <div className="page-header-card">
        <div className="header-content">
          <h1 className="page-title">All Equipment</h1>
          <p className="page-subtitle">
            Manage and track all equipment, maintenance logs, and assignments
          </p>
        </div>
        {canModify && (
          <button
            onClick={() => {
              setSelectedEquipment(null);
              setShowForm(true);
            }}
            className="btn-add-new"
          >
            + Add Equipment
          </button>
        )}
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search equipment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-dropdown">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option>All Status</option>
            <option>Operational</option>
            <option>Maintenance</option>
            <option>Retired</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>NAME</th>
              <th>STATUS</th>
              <th>LOCATION</th>
              <th>LAST MAINTAINED</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredEquipment.length === 0 ? (
              <tr>
                <td colSpan="5" className="no-data">
                  No equipment found. {searchTerm && 'Try adjusting your search.'}
                </td>
              </tr>
            ) : (
              filteredEquipment.map((item) => (
                <tr key={item.id}>
                  <td className="equipment-name">{item.name}</td>
                  <td>
                    <span className={`status-badge ${getStatusBadge(item.status)}`}>
                      {item.status?.toUpperCase() || 'UNKNOWN'}
                    </span>
                  </td>
                  <td>{item.location || '—'}</td>
                  <td>
                    {item.last_maintained 
                      ? new Date(item.last_maintained).toLocaleDateString() 
                      : '—'}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        onClick={() => handleViewLogs(item.id, item.name)}
                        className="btn-action btn-view"
                      >
                        View Logs
                      </button>
                      {canModify && (
                        <>
                          <button
                            onClick={() => handleEdit(item)}
                            className="btn-action btn-edit"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="btn-action btn-delete"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="mobile-cards">
        {filteredEquipment.map((item) => (
          <div key={item.id} className="equipment-card">
            <div className="card-header">
              <h3 className="equipment-name">{item.name}</h3>
              <span className={`status-badge ${getStatusBadge(item.status)}`}>
                {item.status?.toUpperCase() || 'UNKNOWN'}
              </span>
            </div>
            <div className="card-body">
              <p><strong>Location:</strong> {item.location || 'Not specified'}</p>
              <p><strong>Last Maintained:</strong> {
                item.last_maintained 
                  ? new Date(item.last_maintained).toLocaleDateString() 
                  : 'Never'
              }</p>
            </div>
            <div className="card-actions">
              <button
                onClick={() => handleViewLogs(item.id, item.name)}
                className="btn-action btn-view"
              >
                View Logs
              </button>
              {canModify && (
                <>
                  <button
                    onClick={() => handleEdit(item)}
                    className="btn-action btn-edit"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="btn-action btn-delete"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

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