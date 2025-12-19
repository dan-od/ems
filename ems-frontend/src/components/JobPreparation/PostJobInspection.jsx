// ems-frontend/src/components/JobPreparation/PostJobInspection.jsx
// =======================================================
// Post-Job Inspection Component
// Equipment return and condition assessment after field job
// =======================================================

import React, { useState, useEffect } from 'react';
import { jobPreparationService } from '../../services/jobPreparation';
import './JobPreparation.css';

const PostJobInspection = ({ jobId, items, onUpdate }) => {
  const [inspections, setInspections] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const [returnForm, setReturnForm] = useState({
    equipment_returned: true,
    equipment_condition: 'good',
    needs_maintenance: false,
    maintenance_priority: 'medium',
    maintenance_description: '',
    equipment_failed: false,
    failure_description: '',
    failure_date: '',
    downtime_hours: '',
    hours_used: '',
    cycles_completed: '',
    checklist: {
      cleaned: false,
      inspected: false,
      damage_assessment: '',
      parts_replaced: '',
      consumables_used: ''
    },
    inspector_notes: ''
  });

  const [generalImages, setGeneralImages] = useState([]);
  const [damageImages, setDamageImages] = useState([]);

  useEffect(() => {
    if (jobId) {
      fetchInspections();
    }
  }, [jobId]);

  const fetchInspections = async () => {
    try {
      const { data } = await jobPreparationService.getPostJobInspections(jobId);
      setInspections(data);
    } catch (error) {
      console.error('Failed to fetch post-job inspections:', error);
    }
  };

  const handleStartInspection = (item) => {
    setSelectedItem(item);
    setReturnForm({
      equipment_returned: true,
      equipment_condition: 'good',
      needs_maintenance: false,
      maintenance_priority: 'medium',
      maintenance_description: '',
      equipment_failed: false,
      failure_description: '',
      failure_date: '',
      downtime_hours: '',
      hours_used: '',
      cycles_completed: '',
      checklist: {
        cleaned: false,
        inspected: false,
        damage_assessment: '',
        parts_replaced: '',
        consumables_used: ''
      },
      inspector_notes: ''
    });
    setGeneralImages([]);
    setDamageImages([]);
  };

  const handleFormChange = (field, value) => {
    setReturnForm({
      ...returnForm,
      [field]: value
    });
  };

  const handleChecklistChange = (field, value) => {
    setReturnForm({
      ...returnForm,
      checklist: {
        ...returnForm.checklist,
        [field]: value
      }
    });
  };

  const handleGeneralImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + generalImages.length > 5) {
      setMessage('❌ Maximum 5 general images allowed');
      return;
    }
    setGeneralImages([...generalImages, ...files]);
  };

  const handleDamageImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + damageImages.length > 5) {
      setMessage('❌ Maximum 5 damage images allowed');
      return;
    }
    setDamageImages([...damageImages, ...files]);
  };

  const removeImage = (type, index) => {
    if (type === 'general') {
      setGeneralImages(generalImages.filter((_, i) => i !== index));
    } else {
      setDamageImages(damageImages.filter((_, i) => i !== index));
    }
  };

  const handleSubmitInspection = async (e) => {
    e.preventDefault();
    
    if (!selectedItem) {
      setMessage('❌ No item selected');
      return;
    }

    // Validation
    if (!returnForm.equipment_returned && !returnForm.equipment_condition) {
      setMessage('❌ Please specify equipment condition or mark as not returned');
      return;
    }

    if (returnForm.needs_maintenance && !returnForm.maintenance_description) {
      setMessage('❌ Please describe maintenance needed');
      return;
    }

    if (returnForm.equipment_failed && !returnForm.failure_description) {
      setMessage('❌ Please describe equipment failure');
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('job_preparation_item_id', selectedItem.id);
      formData.append('equipment_returned', returnForm.equipment_returned);
      formData.append('equipment_condition', returnForm.equipment_condition);
      formData.append('needs_maintenance', returnForm.needs_maintenance);
      
      if (returnForm.needs_maintenance) {
        formData.append('maintenance_priority', returnForm.maintenance_priority);
        formData.append('maintenance_description', returnForm.maintenance_description);
      }
      
      formData.append('equipment_failed', returnForm.equipment_failed);
      
      if (returnForm.equipment_failed) {
        formData.append('failure_description', returnForm.failure_description);
        if (returnForm.failure_date) formData.append('failure_date', returnForm.failure_date);
        if (returnForm.downtime_hours) formData.append('downtime_hours', returnForm.downtime_hours);
      }
      
      if (returnForm.hours_used) formData.append('hours_used', returnForm.hours_used);
      if (returnForm.cycles_completed) formData.append('cycles_completed', returnForm.cycles_completed);
      
      formData.append('checklist_data', JSON.stringify(returnForm.checklist));
      formData.append('inspector_notes', returnForm.inspector_notes);

      // Add images
      generalImages.forEach(image => {
        formData.append('general_images', image);
      });

      damageImages.forEach(image => {
        formData.append('damage_images', image);
      });

      await jobPreparationService.createPostJobInspection(formData);
      
      setMessage('✅ Post-job inspection submitted successfully');
      setSelectedItem(null);
      fetchInspections();
      if (onUpdate) onUpdate();
      
    } catch (error) {
      console.error('Submit post-job inspection failed:', error);
      setMessage('❌ Failed to submit inspection: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const getItemInspection = (itemId) => {
    return inspections.find(i => i.job_preparation_item_id === itemId);
  };

  const renderInspectionStatus = (item) => {
    const inspection = getItemInspection(item.id);
    
    if (!inspection) {
      return (
        <span className="status-badge status-gray">
          ⏳ Pending Return
        </span>
      );
    }

    if (!inspection.equipment_returned) {
      return (
        <span className="status-badge status-red">
          ❌ Not Returned
        </span>
      );
    }

    const conditionColors = {
      excellent: 'green',
      good: 'blue',
      fair: 'yellow',
      poor: 'orange',
      damaged: 'red',
      lost: 'red'
    };

    const color = conditionColors[inspection.equipment_condition] || 'gray';
    
    return (
      <span className={`status-badge status-${color}`}>
        {inspection.equipment_condition.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="postjob-inspection">
      <div className="inspection-header">
        <h3>Post-Job Equipment Return & Inspection</h3>
        <p className="subtitle">
          Document equipment condition and usage after job completion
        </p>
      </div>

      {message && (
        <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      {!selectedItem ? (
        /* ITEM SELECTION VIEW */
        <div className="inspection-list">
          <table className="inspection-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Equipment/Tool</th>
                <th>Quantity</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items && items.map((item, index) => {
                const inspection = getItemInspection(item.id);
                const canInspect = !inspection;
                
                return (
                  <tr key={item.id}>
                    <td>{index + 1}</td>
                    <td>
                      <strong>{item.equipment_name || item.custom_item_name}</strong>
                      {item.item_description && (
                        <p className="item-desc">{item.item_description}</p>
                      )}
                    </td>
                    <td>{item.quantity} {item.unit}</td>
                    <td>{renderInspectionStatus(item)}</td>
                    <td>
                      {canInspect ? (
                        <button
                          onClick={() => handleStartInspection(item)}
                          className="btn btn-small btn-primary"
                        >
                          📋 Return
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            const details = `
Returned: ${inspection.equipment_returned ? 'Yes' : 'No'}
Condition: ${inspection.equipment_condition}
Needs Maintenance: ${inspection.needs_maintenance ? 'Yes' : 'No'}
Equipment Failed: ${inspection.equipment_failed ? 'Yes' : 'No'}

Notes: ${inspection.inspector_notes || 'None'}
                            `.trim();
                            alert(details);
                          }}
                          className="btn btn-small btn-secondary"
                        >
                          👁️ View
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {(!items || items.length === 0) && (
            <div className="empty-state-small">
              No equipment items to return.
            </div>
          )}
        </div>
      ) : (
        /* RETURN INSPECTION FORM */
        <div className="inspection-form">
          <div className="form-header">
            <h4>Returning: {selectedItem.equipment_name || selectedItem.custom_item_name}</h4>
            <button 
              onClick={() => setSelectedItem(null)}
              className="btn btn-secondary"
            >
              ← Back to List
            </button>
          </div>

          <form onSubmit={handleSubmitInspection}>
            {/* Return Status */}
            <div className="form-section">
              <h5>Return Status</h5>
              
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={returnForm.equipment_returned}
                    onChange={(e) => handleFormChange('equipment_returned', e.target.checked)}
                  />
                  <span>Equipment Returned to Base</span>
                </label>
              </div>

              {returnForm.equipment_returned && (
                <div className="form-group">
                  <label>Equipment Condition</label>
                  <select
                    value={returnForm.equipment_condition}
                    onChange={(e) => handleFormChange('equipment_condition', e.target.value)}
                    className="form-select"
                  >
                    <option value="excellent">Excellent - Like new</option>
                    <option value="good">Good - Normal wear</option>
                    <option value="fair">Fair - Some wear, functional</option>
                    <option value="poor">Poor - Heavy wear, needs attention</option>
                    <option value="damaged">Damaged - Requires repair</option>
                    <option value="lost">Lost - Not recovered</option>
                  </select>
                </div>
              )}
            </div>

            {/* Equipment Failure */}
            <div className="form-section">
              <h5>Equipment Performance</h5>
              
              <div className="form-group">
                <label className="checkbox-label warning">
                  <input
                    type="checkbox"
                    checked={returnForm.equipment_failed}
                    onChange={(e) => handleFormChange('equipment_failed', e.target.checked)}
                  />
                  <span>Equipment Failed During Job</span>
                </label>
              </div>

              {returnForm.equipment_failed && (
                <>
                  <div className="form-group">
                    <label>Failure Description *</label>
                    <textarea
                      value={returnForm.failure_description}
                      onChange={(e) => handleFormChange('failure_description', e.target.value)}
                      placeholder="Describe what happened, symptoms, and when it occurred..."
                      className="form-textarea"
                      rows="3"
                      required={returnForm.equipment_failed}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Failure Date/Time</label>
                      <input
                        type="datetime-local"
                        value={returnForm.failure_date}
                        onChange={(e) => handleFormChange('failure_date', e.target.value)}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label>Downtime Hours</label>
                      <input
                        type="number"
                        step="0.1"
                        value={returnForm.downtime_hours}
                        onChange={(e) => handleFormChange('downtime_hours', e.target.value)}
                        placeholder="0.0"
                        className="form-input"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Maintenance Needs */}
            <div className="form-section">
              <h5>Maintenance Requirements</h5>
              
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={returnForm.needs_maintenance}
                    onChange={(e) => handleFormChange('needs_maintenance', e.target.checked)}
                  />
                  <span>Needs Maintenance Before Next Use</span>
                </label>
              </div>

              {returnForm.needs_maintenance && (
                <>
                  <div className="form-group">
                    <label>Maintenance Priority</label>
                    <select
                      value={returnForm.maintenance_priority}
                      onChange={(e) => handleFormChange('maintenance_priority', e.target.value)}
                      className="form-select"
                    >
                      <option value="low">Low - Routine service</option>
                      <option value="medium">Medium - Schedule soon</option>
                      <option value="high">High - Priority service</option>
                      <option value="urgent">Urgent - Immediate attention</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Maintenance Description *</label>
                    <textarea
                      value={returnForm.maintenance_description}
                      onChange={(e) => handleFormChange('maintenance_description', e.target.value)}
                      placeholder="Describe what maintenance is needed and why..."
                      className="form-textarea"
                      rows="3"
                      required={returnForm.needs_maintenance}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Usage Tracking */}
            <div className="form-section">
              <h5>Usage Tracking</h5>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Hours Used</label>
                  <input
                    type="number"
                    step="0.1"
                    value={returnForm.hours_used}
                    onChange={(e) => handleFormChange('hours_used', e.target.value)}
                    placeholder="0.0"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Cycles Completed</label>
                  <input
                    type="number"
                    value={returnForm.cycles_completed}
                    onChange={(e) => handleFormChange('cycles_completed', e.target.value)}
                    placeholder="0"
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            {/* Post-Job Checklist */}
            <div className="form-section">
              <h5>Post-Job Checklist</h5>
              
              <div className="checklist-grid">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={returnForm.checklist.cleaned}
                    onChange={(e) => handleChecklistChange('cleaned', e.target.checked)}
                  />
                  <span>Equipment Cleaned</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={returnForm.checklist.inspected}
                    onChange={(e) => handleChecklistChange('inspected', e.target.checked)}
                  />
                  <span>Post-Use Inspection Done</span>
                </label>
              </div>

              <div className="form-group">
                <label>Damage Assessment</label>
                <textarea
                  value={returnForm.checklist.damage_assessment}
                  onChange={(e) => handleChecklistChange('damage_assessment', e.target.value)}
                  placeholder="Note any damage, scratches, dents, etc..."
                  className="form-textarea"
                  rows="2"
                />
              </div>

              <div className="form-group">
                <label>Parts Replaced (if any)</label>
                <input
                  type="text"
                  value={returnForm.checklist.parts_replaced}
                  onChange={(e) => handleChecklistChange('parts_replaced', e.target.value)}
                  placeholder="e.g., O-ring, Seal, Filter"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Consumables Used</label>
                <input
                  type="text"
                  value={returnForm.checklist.consumables_used}
                  onChange={(e) => handleChecklistChange('consumables_used', e.target.value)}
                  placeholder="e.g., Hydraulic oil: 5L, Grease: 2kg"
                  className="form-input"
                />
              </div>
            </div>

            {/* Images */}
            <div className="form-section">
              <h5>Condition Photos</h5>
              
              <div className="image-upload-section">
                <div className="image-upload-group">
                  <label>General Condition Photos</label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleGeneralImageSelect}
                    id="general-images"
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="general-images" className="btn btn-secondary">
                    📸 Add Photos ({generalImages.length}/5)
                  </label>

                  {generalImages.length > 0 && (
                    <div className="image-preview-grid">
                      {generalImages.map((image, index) => (
                        <div key={index} className="image-preview-item">
                          <img 
                            src={URL.createObjectURL(image)} 
                            alt={`General ${index + 1}`}
                          />
                          <button
                            type="button"
                            onClick={() => removeImage('general', index)}
                            className="remove-image-btn"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="image-upload-group">
                  <label>Damage Photos (if any)</label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleDamageImageSelect}
                    id="damage-images"
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="damage-images" className="btn btn-secondary">
                    📸 Add Damage Photos ({damageImages.length}/5)
                  </label>

                  {damageImages.length > 0 && (
                    <div className="image-preview-grid">
                      {damageImages.map((image, index) => (
                        <div key={index} className="image-preview-item">
                          <img 
                            src={URL.createObjectURL(image)} 
                            alt={`Damage ${index + 1}`}
                          />
                          <button
                            type="button"
                            onClick={() => removeImage('damage', index)}
                            className="remove-image-btn"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Inspector Notes */}
            <div className="form-section">
              <h5>Inspector Notes</h5>
              <textarea
                value={returnForm.inspector_notes}
                onChange={(e) => handleFormChange('inspector_notes', e.target.value)}
                placeholder="Additional observations, recommendations, or concerns..."
                className="form-textarea"
                rows="4"
              />
            </div>

            {/* Submit */}
            <div className="form-actions">
              <button 
                type="button"
                onClick={() => setSelectedItem(null)}
                className="btn btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? '⏳ Submitting...' : '✅ Submit Return Inspection'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default PostJobInspection;