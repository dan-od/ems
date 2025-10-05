import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './Reports.css';

const FieldReportForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  
  const [formData, setFormData] = useState({
    job_title: '',
    job_location: '',
    job_type: '',
    client_name: '',
    notes: ''
  });

  const jobTypes = [
    'Well Testing',
    'Equipment Installation',
    'Maintenance',
    'Inspection',
    'Fluid Services',
    'Commissioning',
    'Decommissioning',
    'Emergency Response',
    'Other'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    
    if (file) {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png'
      ];

      if (!allowedTypes.includes(file.type)) {
        setError('Invalid file type. Only PDF, Word, Excel, and images are allowed.');
        e.target.value = '';
        return;
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        e.target.value = '';
        return;
      }

      setSelectedFile(file);
      setError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create FormData for file upload
      const uploadData = new FormData();
      uploadData.append('report_file', selectedFile);
      uploadData.append('job_title', formData.job_title);
      uploadData.append('job_location', formData.job_location);
      uploadData.append('job_type', formData.job_type);
      uploadData.append('client_name', formData.client_name);
      uploadData.append('notes', formData.notes);

      await api.post('/field-reports/upload', uploadData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      alert('Field report uploaded successfully!');
      navigate('/dashboard/field-reports');
    } catch (err) {
      console.error('Upload report error:', err);
      setError(err.response?.data?.error || 'Failed to upload report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="field-report-form-container">
      <div className="form-header">
        <h1>Submit Field Report</h1>
        <button 
          className="btn-secondary"
          onClick={() => navigate('/dashboard/field-reports')}
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="field-report-form">
        {/* File Upload Section */}
        <section className="form-section">
          <h2>Upload Report File</h2>
          <p className="form-description">
            Upload your field report as PDF, Word, or Excel document (max 10MB)
          </p>
          
          <div className="file-upload-area">
            <input
              type="file"
              id="report_file"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              required
            />
            <label htmlFor="report_file" className="file-upload-label">
              {selectedFile ? (
                <div className="file-selected">
                  <span className="file-icon">📄</span>
                  <div>
                    <strong>{selectedFile.name}</strong>
                    <p>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
              ) : (
                <div className="file-placeholder">
                  <span className="upload-icon">📁</span>
                  <p>Click to select file or drag and drop</p>
                  <small>PDF, Word, Excel, or Image (max 10MB)</small>
                </div>
              )}
            </label>
          </div>
        </section>

        {/* Basic Information */}
        <section className="form-section">
          <h2>Basic Information</h2>
          
          <div className="form-group">
            <label>Job Title *</label>
            <input
              type="text"
              name="job_title"
              value={formData.job_title}
              onChange={handleChange}
              placeholder="e.g., Well Testing - Platform A"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Job Type</label>
              <select
                name="job_type"
                value={formData.job_type}
                onChange={handleChange}
              >
                <option value="">Select job type...</option>
                {jobTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Job Location</label>
              <input
                type="text"
                name="job_location"
                value={formData.job_location}
                onChange={handleChange}
                placeholder="e.g., Warri Delta Site 7"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Client Name</label>
            <input
              type="text"
              name="client_name"
              value={formData.client_name}
              onChange={handleChange}
              placeholder="e.g., Shell Nigeria"
            />
          </div>

          <div className="form-group">
            <label>Additional Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="4"
              placeholder="Any additional notes or comments about this report..."
            />
          </div>
        </section>

        {/* Submit Buttons */}
        <div className="form-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate('/dashboard/field-reports')}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? 'Uploading...' : 'Upload Report'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FieldReportForm;