import React, { useState } from 'react';
import { equipmentService } from '../../services/api';
import { useNavigate } from 'react-router-dom'; // Add this import
import './Equipment.css';

const EquipmentForm = (props) => {
  const navigate = useNavigate(); // Add navigation hook
  
  const { 
    equipment = null, 
    onClose = null, 
    onSuccess = null,
    isPage = false // Add this prop to detect if it's a page
  } = props;

  // If it's a page, don't use modal overlay
  const [isVisible, setIsVisible] = useState(true);
  
  const [formData, setFormData] = useState(equipment || {
    name: '',
    description: '',
    status: 'Operational',
    location: '',
    last_maintained: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');

  const handleClose = () => {
    if (isPage) {
      // If it's a page, navigate back
      navigate('/dashboard/all-equipment');
    } else if (typeof onClose === 'function') {
      onClose();
    } else {
      setIsVisible(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const formattedData = {
      ...formData,
      last_maintained: formData.last_maintained ? new Date(formData.last_maintained).toISOString() : null
    };
    
    try {
      if (equipment) {
        await equipmentService.update(equipment.id, formattedData);
      } else {
        await equipmentService.create(formattedData);
      }
      
      setPopupMessage('✅ Equipment added successfully!');
      setShowPopup(true);
      
      setTimeout(() => {
        setShowPopup(false);
        if (isPage) {
          navigate('/dashboard/all-equipment'); // Redirect if it's a page
        } else if (typeof onSuccess === 'function') {
          onSuccess();
        }
        handleClose();
      }, 1500);
      
    } catch (err) {
      console.error(err);
      setPopupMessage('❌ Error saving equipment: ' + (err.response?.data?.error || err.message));
      setShowPopup(true);
      setTimeout(() => setShowPopup(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  // If it's a page, render as a regular form without modal overlay
  if (isPage) {
    return (
      <div className="equipment-form-page">
        <div className="page-header">
          <h1>{equipment ? 'Edit' : 'Add'} Equipment</h1>
          <button onClick={handleClose} className="back-button">
            ← Back to Equipment List
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="equipment-form standalone">
          {/* Your form fields here - same as before */}
          <div className="form-group">
            <label>Name *</label>
            <input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="Operational">Operational</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Retired">Retired</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Location *</label>
            <input
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Last Maintained</label>
            <input
              type="date"
              value={formData.last_maintained ? formData.last_maintained.split('T')[0] : ''}
              onChange={(e) => setFormData({ ...formData, last_maintained: e.target.value })}
            />
          </div>
          
          <div className="form-actions">
            <button type="button" onClick={handleClose} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" className="save-btn" disabled={loading}>
              {loading ? 'Saving...' : 'Save Equipment'}
            </button>
          </div>
        </form>
        
        {showPopup && (
          <div className="popup-overlay">
            <div className="popup-message">{popupMessage}</div>
          </div>
        )}
      </div>
    );
  }

  // Original modal rendering for when used as modal
  if (!isVisible) return null;

  return (
    <div className="modal-overlay" onClick={(e) => {
      // Close modal when clicking on the overlay (outside the modal)
      if (e.target.className === 'modal-overlay') {
        handleClose();
      }
    }}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{equipment ? 'Edit' : 'Add'} Equipment</h2>
          {/* Add a close button to the header */}
          <button 
            type="button" 
            className="close-btn"
            onClick={handleClose}
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="equipment-form">
          <div className="form-group">
            <label>Name</label>
            <input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="Operational">Operational</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Retired">Retired</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Location</label>
            <input
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Last Maintained</label>
            <input
              type="date"
              value={formData.last_maintained ? (typeof formData.last_maintained === 'string' ? formData.last_maintained.split('T')[0] : '') : ''}
              onChange={(e) => setFormData({ ...formData, last_maintained: e.target.value })}
            />
          </div>
          
          <div className="form-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={handleClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="save-btn"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Save'}
            </button>
          </div>
        </form>
        
        {/* Custom popup that appears instead of alert */}
        {showPopup && (
            <div className="popup-overlay">
              <div className="popup-message">{popupMessage}</div>
            </div>
          )}
      </div>
    </div>
  );
};

export default EquipmentForm;