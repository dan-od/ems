// ems-frontend/src/components/JobPreparation/PreJobInspection.jsx
// =======================================================
// Pre-Job Inspection Component
// Equipment readiness checklist before going to field
// =======================================================

import React, { useState, useEffect } from 'react';
import { jobPreparationService } from '../../services/jobPreparation';
import './JobPreparation.css';

const PreJobInspection = ({ jobId, items, onUpdate }) => {
  const [inspections, setInspections] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const [inspectionForm, setInspectionForm] = useState({
    pressure_test: { checked: false, value: '', passed: true },
    pressure_rating: { checked: false, value: '', passed: true },
    leakage_check: { checked: false, result: '', passed: true },
    visual_inspection: { checked: false, result: '', passed: true },
    last_service_date: '',
    needs_maintenance: false,
    certification_valid: true,
    certification_expiry: '',
    overall_status: 'pending',
    inspector_notes: ''
  });

  const [images, setImages] = useState([]);
  const userRole = localStorage.getItem('userRole');

  useEffect(() => {
    if (jobId) {
      fetchInspections();
    }
  }, [jobId]);

  const fetchInspections = async () => {
    try {
      const { data } = await jobPreparationService.getPreJobInspections(jobId);
      setInspections(data);
    } catch (error) {
      console.error('Failed to fetch inspections:', error);
    }
  };

  const handleStartInspection = (item) => {
    setSelectedItem(item);
    setInspectionForm({
      pressure_test: { checked: false, value: '', passed: true },
      pressure_rating: { checked: false, value: '', passed: true },
      leakage_check: { checked: false, result: '', passed: true },
      visual_inspection: { checked: false, result: '', passed: true },
      last_service_date: '',
      needs_maintenance: false,
      certification_valid: true,
      certification_expiry: '',
      overall_status: 'pending',
      inspector_notes: ''
    });
    setImages([]);
  };

  const handleChecklistChange = (field, key, value) => {
    if (typeof inspectionForm[field] === 'object' && key) {
      setInspectionForm({
        ...inspectionForm,
        [field]: {
          ...inspectionForm[field],
          [key]: value
        }
      });
    } else {
      setInspectionForm({
        ...inspectionForm,
        [field]: value
      });
    }
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 5) {
      setMessage('❌ Maximum 5 images allowed');
      return;
    }
    setImages([...images, ...files]);
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const calculateOverallStatus = () => {
    const checks = [
      inspectionForm.pressure_test.passed,
      inspectionForm.pressure_rating.passed,
      inspectionForm.leakage_check.passed,
      inspectionForm.visual_inspection.passed,
      inspectionForm.certification_valid,
      !inspectionForm.needs_maintenance
    ];

    if (checks.every(c => c)) return 'passed';
    if (checks.some(c => !c)) return 'failed';
    return 'needs_attention';
  };

  const handleSubmitInspection = async (e) => {
    e.preventDefault();
    
    if (!selectedItem) {
      setMessage('❌ No item selected');
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('job_preparation_item_id', selectedItem.id);
      
      const overall = calculateOverallStatus();
      formData.append('overall_status', overall);
      formData.append('inspector_notes', inspectionForm.inspector_notes);
      
      // Build checklist data
      const checklistData = {
        pressure_test: inspectionForm.pressure_test,
        pressure_rating: inspectionForm.pressure_rating,
        leakage_check: inspectionForm.leakage_check,
        visual_inspection: inspectionForm.visual_inspection,
        last_service_date: inspectionForm.last_service_date,
        needs_maintenance: inspectionForm.needs_maintenance,
        certification_valid: inspectionForm.certification_valid,
        certification_expiry: inspectionForm.certification_expiry
      };
      
      formData.append('checklist_data', JSON.stringify(checklistData));

      // Add images
      images.forEach(image => {
        formData.append('inspection_images', image);
      });

      await jobPreparationService.createPreJobInspection(formData);
      
      setMessage('✅ Inspection submitted successfully');
      setSelectedItem(null);
      fetchInspections();
      if (onUpdate) onUpdate();
      
    } catch (error) {
      console.error('Submit inspection failed:', error);
      setMessage('❌ Failed to submit inspection');
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
          ⏳ Pending
        </span>
      );
    }

    const statusConfig = {
      passed: { color: 'green', label: 'Passed', icon: '✅' },
      failed: { color: 'red', label: 'Failed', icon: '❌' },
      needs_attention: { color: 'orange', label: 'Needs Attention', icon: '⚠️' },
      pending: { color: 'gray', label: 'Pending', icon: '⏳' }
    };

    const config = statusConfig[inspection.overall_status] || statusConfig.pending;
    
    return (
      <span className={`status-badge status-${config.color}`}>
        {config.icon} {config.label}
      </span>
    );
  };

  return (
    <div className="prejob-inspection">
      <div className="inspection-header">
        <h3>Pre-Job Equipment Inspection</h3>
        <p className="subtitle">
          Verify each equipment item is job-ready before deployment
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
                const canInspect = !inspection || inspection.overall_status === 'pending';
                
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
                          🔍 Inspect
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            // View inspection details
                            alert(`Inspection completed by ${inspection.inspector_name}\n\nStatus: ${inspection.overall_status}\n\nNotes: ${inspection.inspector_notes || 'None'}`);
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
              No equipment items to inspect.
            </div>
          )}
        </div>
      ) : (
        /* INSPECTION FORM */
        <div className="inspection-form">
          <div className="form-header">
            <h4>Inspecting: {selectedItem.equipment_name || selectedItem.custom_item_name}</h4>
            <button 
              onClick={() => setSelectedItem(null)}
              className="btn btn-secondary"
            >
              ← Back to List
            </button>
          </div>

          <form onSubmit={handleSubmitInspection}>
            {/* Pressure Test */}
            <div className="checklist-section">
              <h5>Pressure Testing</h5>
              
              <div className="checklist-item">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={inspectionForm.pressure_test.checked}
                    onChange={(e) => handleChecklistChange('pressure_test', 'checked', e.target.checked)}
                  />
                  <span>Pressure Test Completed</span>
                </label>
                
                {inspectionForm.pressure_test.checked && (
                  <div className="checklist-details">
                    <input
                      type="text"
                      placeholder="Test pressure (e.g., 3000 PSI)"
                      value={inspectionForm.pressure_test.value}
                      onChange={(e) => handleChecklistChange('pressure_test', 'value', e.target.value)}
                      className="form-input"
                    />
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={inspectionForm.pressure_test.passed}
                        onChange={(e) => handleChecklistChange('pressure_test', 'passed', e.target.checked)}
                      />
                      <span>Test Passed</span>
                    </label>
                  </div>
                )}
              </div>

              <div className="checklist-item">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={inspectionForm.pressure_rating.checked}
                    onChange={(e) => handleChecklistChange('pressure_rating', 'checked', e.target.checked)}
                  />
                  <span>Pressure Rating Verified</span>
                </label>
                
                {inspectionForm.pressure_rating.checked && (
                  <div className="checklist-details">
                    <input
                      type="text"
                      placeholder="Rated pressure (e.g., 5000 PSI)"
                      value={inspectionForm.pressure_rating.value}
                      onChange={(e) => handleChecklistChange('pressure_rating', 'value', e.target.value)}
                      className="form-input"
                    />
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={inspectionForm.pressure_rating.passed}
                        onChange={(e) => handleChecklistChange('pressure_rating', 'passed', e.target.checked)}
                      />
                      <span>Rating Acceptable</span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Visual Inspection */}
            <div className="checklist-section">
              <h5>Visual & Physical Inspection</h5>
              
              <div className="checklist-item">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={inspectionForm.leakage_check.checked}
                    onChange={(e) => handleChecklistChange('leakage_check', 'checked', e.target.checked)}
                  />
                  <span>Leakage Check Performed</span>
                </label>
                
                {inspectionForm.leakage_check.checked && (
                  <div className="checklist-details">
                    <textarea
                      placeholder="Results (e.g., No leaks detected)"
                      value={inspectionForm.leakage_check.result}
                      onChange={(e) => handleChecklistChange('leakage_check', 'result', e.target.value)}
                      className="form-textarea"
                      rows="2"
                    />
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={inspectionForm.leakage_check.passed}
                        onChange={(e) => handleChecklistChange('leakage_check', 'passed', e.target.checked)}
                      />
                      <span>No Leaks Found</span>
                    </label>
                  </div>
                )}
              </div>

              <div className="checklist-item">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={inspectionForm.visual_inspection.checked}
                    onChange={(e) => handleChecklistChange('visual_inspection', 'checked', e.target.checked)}
                  />
                  <span>Visual Condition Check</span>
                </label>
                
                {inspectionForm.visual_inspection.checked && (
                  <div className="checklist-details">
                    <textarea
                      placeholder="Condition notes (e.g., Good condition, minor wear)"
                      value={inspectionForm.visual_inspection.result}
                      onChange={(e) => handleChecklistChange('visual_inspection', 'result', e.target.value)}
                      className="form-textarea"
                      rows="2"
                    />
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={inspectionForm.visual_inspection.passed}
                        onChange={(e) => handleChecklistChange('visual_inspection', 'passed', e.target.checked)}
                      />
                      <span>Condition Acceptable</span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Maintenance & Certification */}
            <div className="checklist-section">
              <h5>Maintenance & Certification</h5>
              
              <div className="form-group">
                <label>Last Service/Maintenance Date</label>
                <input
                  type="date"
                  value={inspectionForm.last_service_date}
                  onChange={(e) => handleChecklistChange('last_service_date', null, e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="checklist-item">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={inspectionForm.needs_maintenance}
                    onChange={(e) => handleChecklistChange('needs_maintenance', null, e.target.checked)}
                  />
                  <span className="warning-text">Needs Maintenance Before Job</span>
                </label>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={inspectionForm.certification_valid}
                    onChange={(e) => handleChecklistChange('certification_valid', null, e.target.checked)}
                  />
                  <span>Certification Valid</span>
                </label>
              </div>

              {inspectionForm.certification_valid && (
                <div className="form-group">
                  <label>Certification Expiry Date</label>
                  <input
                    type="date"
                    value={inspectionForm.certification_expiry}
                    onChange={(e) => handleChecklistChange('certification_expiry', null, e.target.value)}
                    className="form-input"
                  />
                </div>
              )}
            </div>

            {/* Images */}
            <div className="checklist-section">
              <h5>Inspection Photos</h5>
              
              <div className="image-upload">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  id="inspection-images"
                  style={{ display: 'none' }}
                />
                <label htmlFor="inspection-images" className="btn btn-secondary">
                  📸 Add Photos ({images.length}/5)
                </label>
              </div>

              {images.length > 0 && (
                <div className="image-preview-grid">
                  {images.map((image, index) => (
                    <div key={index} className="image-preview-item">
                      <img 
                        src={URL.createObjectURL(image)} 
                        alt={`Inspection ${index + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="remove-image-btn"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="checklist-section">
              <h5>Inspector Notes</h5>
              <textarea
                value={inspectionForm.inspector_notes}
                onChange={(e) => handleChecklistChange('inspector_notes', null, e.target.value)}
                placeholder="Additional notes, observations, or concerns..."
                className="form-textarea"
                rows="4"
              />
            </div>

            {/* Overall Status Preview */}
            <div className="overall-status-preview">
              <h5>Overall Status:</h5>
              <span className={`status-badge status-${calculateOverallStatus()}`}>
                {calculateOverallStatus().toUpperCase()}
              </span>
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
                {loading ? '⏳ Submitting...' : '✅ Submit Inspection'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default PreJobInspection;