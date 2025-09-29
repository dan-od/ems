import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './Requests.css';

const RequestForm = () => {
  const [equipmentList, setEquipmentList] = useState([]);
  const [formData, setFormData] = useState({
    item_id: '',
    custom_name: '',
    subject: '',
    description: '',
    priority: 'Medium',
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        const { data } = await api.get('/equipment');
        setEquipmentList(data);
      } catch (err) {
        console.error('Failed to fetch equipment:', err);
      }
    };
    fetchEquipment();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      custom_name: e.target.value,
      item_id: '', // reset item if typing new
    });
    setShowSuggestions(true);
  };

  const handleSelect = (item) => {
    setFormData({
      ...formData,
      item_id: item.id,
      custom_name: item.name,
    });
    setShowSuggestions(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.item_id && !formData.custom_name) {
      setMessage('Please select existing equipment or add a new one.');
      return;
    }

    try {
      await api.post('/requests/bulk', { requests: [formData] });
      setMessage('Request submitted successfully!');
      setFormData({
        item_id: '',
        custom_name: '',
        subject: '',
        description: '',
        priority: 'Medium',
      });
      setShowSuggestions(false);
    } catch (err) {
      console.error('Failed to submit request:', err);
      setMessage('Failed to submit request.');
    }
  };

  const filtered = equipmentList.filter((item) =>
    item.name.toLowerCase().includes(formData.custom_name.toLowerCase())
  );

  return (
    <form className="request-form" onSubmit={handleSubmit}>
      <h2>Create Equipment Request</h2>

      <div className="form-group autocomplete">
        <label>Equipment</label>
        <input
          type="text"
          placeholder="Search or add new equipment..."
          value={formData.custom_name}
          onChange={handleChange}
          onFocus={() => setShowSuggestions(true)}
        />
        {showSuggestions && formData.custom_name && (
          <ul className="suggestions">
            {filtered.length > 0 ? (
              filtered.map((item) => (
                <li key={item.id} onClick={() => handleSelect(item)}>
                  {item.name} - {item.status || 'Available'}
                </li>
              ))
            ) : (
              <li className="add-new">
                + Add "{formData.custom_name}" as new equipment
              </li>
            )}
          </ul>
        )}
      </div>

      <div className="form-group">
        <label>Subject</label>
        <input
          type="text"
          name="subject"
          value={formData.subject}
          onChange={(e) =>
            setFormData({ ...formData, subject: e.target.value })
          }
        />
      </div>

      <div className="form-group">
        <label>Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
        />
      </div>

      <div className="form-group">
        <label>Priority</label>
        <select
          name="priority"
          value={formData.priority}
          onChange={(e) =>
            setFormData({ ...formData, priority: e.target.value })
          }
        >
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Urgent">Urgent</option>
        </select>
      </div>

      <button type="submit" className="submit-btn">
        Submit Request
      </button>
      {message && <p className="form-message">{message}</p>}
    </form>
  );
};

export default RequestForm;
