import React, { useState, useEffect } from 'react';
import { equipmentService } from '../../services/api';
import './EquipmentList.css';

const EquipmentList = () => {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        const res = await equipmentService.getAll();
        setEquipment(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch equipment');
        console.error('API Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEquipment();
  }, []);

  const StatusBadge = ({ status }) => (
    <span className={`status-badge ${status.toLowerCase()}`}>
      {status}
    </span>
  );

  if (loading) return <div className="loading-indicator">Loading equipment...</div>;
  if (error) return <div className="error-message">⚠️ {error}</div>;

  return (
    <div className="equipment-list">
      <h3>Equipment Inventory</h3>
      {equipment.length === 0 ? (
        <p className="no-data">No equipment registered yet</p>
      ) : (
        <div className="equipment-list-container">
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
              {equipment.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.name}</td>
                  <td><StatusBadge status={item.status} /></td>
                  <td>{item.location || 'N/A'}</td>
                  <td>{item.last_maintained ? new Date(item.last_maintained).toLocaleDateString() : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

              )}
            </div>
          );
        };

export default EquipmentList;
