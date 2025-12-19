import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { jobPreparationService } from '../../services/jobPreparation';
import { equipmentService } from '../../services/api';
import './JobPreparation.css';

const JobPreparationForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    job_name: '',
    well_name: '',
    location: '',
    client_name: '',
    planned_start_date: '',
    planned_end_date: '',
    job_description: '',
    special_requirements: '',
    safety_considerations: ''
  });

  const [items, setItems] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({
    equipment_id: '',
    custom_item_name: '',
    item_description: '',
    quantity: 1,
    unit: 'piece',
    priority: 'normal',
    notes: ''
  });

  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchEquipment();
    if (isEdit) {
      fetchJobData();
    }
  }, [isEdit, id]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (formData.job_name) {
        handleAutoSave();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [formData, items]);

  const fetchEquipment = async () => {
    try {
      const { data } = await equipmentService.getAll();
      setEquipmentList(data.filter(e => e.status === 'available'));
    } catch (error) {
      console.error('Failed to fetch equipment:', error);
    }
  };

  const fetchJobData = async () => {
    try {
      const { data } = await jobPreparationService.getById(id);
      setFormData({
        job_name: data.job_name,
        well_name: data.well_name || '',
        location: data.location || '',
        client_name: data.client_name || '',
        planned_start_date: data.planned_start_date?.split('T')[0] || '',
        planned_end_date: data.planned_end_date?.split('T')[0] || '',
        job_description: data.job_description || '',
        special_requirements: data.special_requirements || '',
        safety_considerations: data.safety_considerations || ''
      });
      setItems(data.items || []);
    } catch (error) {
      console.error('Failed to fetch job:', error);
      setMessage('❌ Failed to load job preparation');
    }
  };

  const handleAutoSave = async () => {
    try {
      setAutoSaving(true);
      
      if (isEdit) {
        await jobPreparationService.update(id, formData);
      } else if (formData.job_name) {
        const { data } = await jobPreparationService.create({ ...formData, items });
        navigate(`/dashboard/job-preparation/${data.id}`, { replace: true });
      }
      
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setAutoSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.job_name) {
        setMessage('❌ Job name is required');
        return;
      }

      if (isEdit) {
        await jobPreparationService.update(id, formData);
        setMessage('✅ Job saved successfully');
      } else {
        const { data } = await jobPreparationService.create({ ...formData, items });
        setMessage('✅ Job created successfully');
        navigate(`/dashboard/job-preparation/${data.id}`);
      }
    } catch (error) {
      console.error('Save failed:', error);
      setMessage('❌ Failed to save job preparation');
    }
  };

  const handleAddItem = async () => {
    try {
      if (!newItem.equipment_id && !newItem.custom_item_name) {
        setMessage('❌ Please select equipment or enter custom item name');
        return;
      }

      if (isEdit) {
        await jobPreparationService.addItems(id, [newItem]);
        await fetchJobData();
      } else {
        setItems([...items, { ...newItem, id: Date.now() }]);
      }

      setNewItem({
        equipment_id: '',
        custom_item_name: '',
        item_description: '',
        quantity: 1,
        unit: 'piece',
        priority: 'normal',
        notes: ''
      });
      setShowAddItem(false);
      setMessage('✅ Item added');
    } catch (error) {
      console.error('Add item failed:', error);
      setMessage('❌ Failed to add item');
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      if (isEdit) {
        await jobPreparationService.deleteItem(id, itemId);
        await fetchJobData();
      } else {
        setItems(items.filter(item => item.id !== itemId));
      }
      setMessage('✅ Item removed');
    } catch (error) {
      console.error('Delete item failed:', error);
      setMessage('❌ Failed to remove item');
    }
  };

  const handleSubmit = async () => {
    try {
      if (!isEdit) {
        setMessage('❌ Please save the job first before submitting');
        return;
      }

      if (items.length === 0) {
        setMessage('❌ Cannot submit without items');
        return;
      }

      await jobPreparationService.submit(id);
      setMessage('✅ Job submitted for approval');
      navigate('/dashboard/job-preparation');
    } catch (error) {
      console.error('Submit failed:', error);
      setMessage('❌ Failed to submit job');
    }
  };

  return (
    <div className="job-prep-form notepad-style">
      {/* Header */}
      <div className="notepad-header">
        <div>
          <h1>{isEdit ? '📝 Edit Job Preparation' : '📝 New Job Preparation'}</h1>
          <div className="auto-save-indicator">
            {autoSaving ? (
              <span className="saving">💾 Saving...</span>
            ) : lastSaved ? (
              <span className="saved">✅ Last saved: {lastSaved.toLocaleTimeString()}</span>
            ) : null}
          </div>
        </div>
        <div className="header-actions">
          <button onClick={handleSave} className="btn btn-secondary">
            💾 Save
          </button>
          {isEdit && (
            <button onClick={handleSubmit} className="btn btn-primary">
              ✅ Submit for Approval
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      {/* Job Details Form */}
      <div className="notepad-section">
        <h2>Job Details</h2>
        <div className="form-grid">
          <div className="form-group">
            <label>Job Name *</label>
            <input
              type="text"
              value={formData.job_name}
              onChange={(e) => setFormData({...formData, job_name: e.target.value})}
              placeholder="e.g., Well Testing - Delta Creek"
              required
            />
          </div>

          <div className="form-group">
            <label>Well Name</label>
            <input
              type="text"
              value={formData.well_name}
              onChange={(e) => setFormData({...formData, well_name: e.target.value})}
              placeholder="e.g., DELTA-001"
            />
          </div>

          <div className="form-group">
            <label>Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              placeholder="e.g., Delta State, Nigeria"
            />
          </div>

          <div className="form-group">
            <label>Client</label>
            <input
              type="text"
              value={formData.client_name}
              onChange={(e) => setFormData({...formData, client_name: e.target.value})}
              placeholder="e.g., Shell Nigeria"
            />
          </div>

          <div className="form-group">
            <label>Planned Start Date</label>
            <input
              type="date"
              value={formData.planned_start_date}
              onChange={(e) => setFormData({...formData, planned_start_date: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>Planned End Date</label>
            <input
              type="date"
              value={formData.planned_end_date}
              onChange={(e) => setFormData({...formData, planned_end_date: e.target.value})}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Job Description</label>
          <textarea
            value={formData.job_description}
            onChange={(e) => setFormData({...formData, job_description: e.target.value})}
            rows="4"
            placeholder="Describe the job objectives and scope..."
          />
        </div>

        <div className="form-group">
          <label>Special Requirements</label>
          <textarea
            value={formData.special_requirements}
            onChange={(e) => setFormData({...formData, special_requirements: e.target.value})}
            rows="3"
            placeholder="Any special requirements or considerations..."
          />
        </div>

        <div className="form-group">
          <label>Safety Considerations</label>
          <textarea
            value={formData.safety_considerations}
            onChange={(e) => setFormData({...formData, safety_considerations: e.target.value})}
            rows="3"
            placeholder="Safety concerns and precautions..."
          />
        </div>
      </div>

      {/* Equipment & Tools Section */}
      <div className="notepad-section">
        <div className="section-header">
          <h2>Equipment & Tools ({items.length})</h2>
          <button 
            onClick={() => setShowAddItem(true)} 
            className="btn btn-small btn-primary"
          >
            + Add Item
          </button>
        </div>

        {/* Add Item Form */}
        {showAddItem && (
          <div className="add-item-form">
            <h3>Add Equipment/Tool</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Select from Inventory</label>
                <select
                  value={newItem.equipment_id}
                  onChange={(e) => setNewItem({...newItem, equipment_id: e.target.value, custom_item_name: ''})}
                >
                  <option value="">-- Select Equipment --</option>
                  {equipmentList.map(eq => (
                    <option key={eq.id} value={eq.id}>{eq.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>OR Custom Item Name</label>
                <input
                  type="text"
                  value={newItem.custom_item_name}
                  onChange={(e) => setNewItem({...newItem, custom_item_name: e.target.value, equipment_id: ''})}
                  placeholder="e.g., Wireline Tools"
                  disabled={Boolean(newItem.equipment_id)}
                />
              </div>

              <div className="form-group">
                <label>Quantity</label>
                <input
                  type="number"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value)})}
                  min="1"
                />
              </div>

              <div className="form-group">
                <label>Unit</label>
                <input
                  type="text"
                  value={newItem.unit}
                  onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                  placeholder="piece, set, ft, etc."
                />
              </div>

              <div className="form-group">
                <label>Priority</label>
                <select
                  value={newItem.priority}
                  onChange={(e) => setNewItem({...newItem, priority: e.target.value})}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div className="form-group full-width">
                <label>Notes</label>
                <textarea
                  value={newItem.notes}
                  onChange={(e) => setNewItem({...newItem, notes: e.target.value})}
                  rows="2"
                  placeholder="Additional notes or specifications..."
                />
              </div>
            </div>

            <div className="form-actions">
              <button onClick={handleAddItem} className="btn btn-primary">
                Add Item
              </button>
              <button 
                onClick={() => setShowAddItem(false)} 
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Items List */}
        <div className="items-list">
          {items.length === 0 ? (
            <div className="empty-state-small">
              No items added yet. Click "Add Item" to start building your checklist.
            </div>
          ) : (
            items.map((item, index) => (
              <div key={item.id} className="item-card">
                <div className="item-number">{index + 1}</div>
                <div className="item-details">
                  <div className="item-header">
                    <h4>{item.equipment_name || item.custom_item_name}</h4>
                    <div className="item-badges">
                      <span className={`priority-badge priority-${item.priority}`}>
                        {item.priority}
                      </span>
                      {item.item_status && (
                        <span className={`status-badge status-${item.item_status}`}>
                          {item.item_status}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="item-meta">
                    <span>Qty: {item.quantity} {item.unit}</span>
                    {item.notes && <p className="item-notes">{item.notes}</p>}
                  </div>
                </div>
                <button 
                  onClick={() => handleDeleteItem(item.id)}
                  className="btn-icon-delete"
                  title="Remove item"
                >
                  🗑️
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="notepad-footer">
        <button onClick={() => navigate('/dashboard/job-preparation')} className="btn btn-secondary">
          ← Back to List
        </button>
        <div className="footer-actions">
          <button onClick={handleSave} className="btn btn-secondary">
            💾 Save Draft
          </button>
          {isEdit && items.length > 0 && (
            <button onClick={handleSubmit} className="btn btn-primary">
              ✅ Submit for Approval
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobPreparationForm;