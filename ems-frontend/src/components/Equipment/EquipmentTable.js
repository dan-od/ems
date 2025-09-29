import React, { useState, useEffect } from 'react';
import { equipmentService } from '../../services/api';
import EquipmentForm from './EquipmentForm';
import MaintenanceLog from './MaintenanceLog';
import './Equipment.css';

const EquipmentTable = () => {
  const [equipment, setEquipment] = useState([]);
  const [filteredEquipment, setFilteredEquipment] = useState([]);
  const [selected, setSelected] = useState(null);
  const [action, setAction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const userRole = localStorage.getItem('userRole');

  // Fetch equipment with filters
  const fetchEquipment = async () => {
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (locationFilter !== 'all') params.location = locationFilter;
      
      const { data } = await equipmentService.getAll(params);
      setEquipment(data);
      setFilteredEquipment(data);
    } catch (err) {
      console.error('Failed to fetch equipment:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, [searchTerm, statusFilter, locationFilter]);

  // Get unique locations for filter dropdown
  const locations = [...new Set(equipment.map(item => item.location))].filter(Boolean);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this equipment?')) {
      try {
        await equipmentService.delete(id);
        setEquipment(equipment.filter(item => item.id !== id));
        setFilteredEquipment(filteredEquipment.filter(item => item.id !== id));
      } catch (err) {
        console.error('Delete failed:', err);
        alert('Failed to delete equipment');
      }
    }
  };
  
  const handleCreate = async (formData) => {
    try {
      const { data } = await equipmentService.create(formData);
      setEquipment([...equipment, data]);
      setFilteredEquipment([...filteredEquipment, data]);
      setAction(null);
    } catch (err) {
      console.error('Create failed:', err);
    }
  };
  
  const handleUpdate = async (id, formData) => {
    try {
      const { data } = await equipmentService.update(id, formData);
      setEquipment(equipment.map(item => item.id === id ? data : item));
      setFilteredEquipment(filteredEquipment.map(item => item.id === id ? data : item));
      setAction(null);
    } catch (err) {
      console.error('Update failed:', err);
    }
  };

  if (loading) return <div>Loading equipment...</div>;

  return (
    <div className="equipment-container">
      {/* Toolbar removed so that the list has more space */}
      <table className="equipment-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Status</th>
            <th>Location</th>
            <th>Last Maintained</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {equipment.map(item => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>{item.name}</td>
              <td>
                <span className={`status-badge ${item.status.toLowerCase()}`}>
                  {item.status}
                </span>
              </td>
              <td>{item.location || 'N/A'}</td>
              <td>{item.last_maintained ? new Date(item.last_maintained).toLocaleDateString() : 'N/A'}</td>
              <td className="actions">
                <button onClick={() => {
                  setSelected(item);
                  setAction('view-logs');
                }}>
                  View Logs
                </button>
                {['admin', 'manager'].includes(userRole) && (
                  <>
                    <button onClick={() => {
                      setSelected(item);
                      setAction('edit');
                    }}>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="danger">
                      Delete
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modals */}
      {action === 'create' && (
        <EquipmentForm
          onClose={() => setAction(null)}
          onSuccess={() => {
            setAction(null);
            fetchEquipment();
          }}
        />
      )}
      {action === 'edit' && selected && (
        <EquipmentForm
          equipment={selected}
          onClose={() => setAction(null)}
          onSuccess={() => {
            setAction(null);
            fetchEquipment();
          }}
        />
      )}
      {action === 'view-logs' && selected && (
        <MaintenanceLog
          equipmentId={selected.id}
          onClose={() => setAction(null)}
        />
      )}
    </div>
  );
};


export default EquipmentTable;
