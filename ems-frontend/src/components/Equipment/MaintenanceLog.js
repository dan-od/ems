// MaintenanceLog.js - Enhanced version
import React, { useEffect, useRef, useState } from 'react';
import { equipmentService } from '../../services/api';
import './MaintenanceLog.css';

const MaintenanceLog = ({ equipmentId }) => {
  const [logs, setLogs] = useState([]);
  const [maintenanceType, setMaintenanceType] = useState('Routine');
  const [description, setDescription] = useState('');
  const [hoursAtService, setHoursAtService] = useState('');
  const [performedBy, setPerformedBy] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Equipment details with hours info
  const [equipmentDetails, setEquipmentDetails] = useState(null);

  // Type-ahead existing code...
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSug, setShowSug] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const boxRef = useRef(null);

  const userRole = localStorage.getItem('userRole');

  // Load equipment details with hours info
  useEffect(() => {
    (async () => {
      if (!selectedEquipment?.id) return;
      try {
        const { data } = await equipmentService.getById(selectedEquipment.id);
        setEquipmentDetails(data);
        // Pre-fill current hours if available
        if (data.hours_run) {
          setHoursAtService(data.hours_run.toString());
        }
      } catch (err) {
        console.error('Failed to fetch equipment details:', err);
      }
    })();
  }, [selectedEquipment?.id]);

  // Search implementation (keep existing)
  useEffect(() => {
    if (!query || (selectedEquipment && query === selectedEquipment.name)) {
      setSuggestions([]);
      setShowSug(false);
      return;
    }

    const t = setTimeout(async () => {
      try {
        setIsSearching(true);
        // Fixed: backend expects ?q not ?name
        const { data } = await equipmentService.getAll({ q: query, limit: 10 });
        const list = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
        setSuggestions(list.map(e => ({ id: e.id, name: e.name })));
        setShowSug(true);
      } catch (err) {
        console.error('Search failed:', err);
        setSuggestions([]);
        setShowSug(false);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [query, selectedEquipment]);

  // Keep existing event handlers...
  const pickEquipment = (eq) => {
    setSelectedEquipment({ id: eq.id, name: eq.name });
    setQuery(eq.name || '');
    setShowSug(false);
  };

  const clearSelection = () => {
    setSelectedEquipment(null);
    setQuery('');
    setLogs([]);
    setEquipmentDetails(null);
    setHoursAtService('');
  };

  const handleAddLog = async (e) => {
    e.preventDefault();
    if (!selectedEquipment?.id) {
      alert('Please select equipment first.');
      return;
    }
    
    try {
      await equipmentService.addMaintenanceLog(selectedEquipment.id, {
        maintenance_type: maintenanceType,
        description,
        date: new Date().toISOString().slice(0, 10),
        hours_at_service: hoursAtService ? parseInt(hoursAtService) : null,
        performed_by: performedBy || 'In-house'
      });

      // Refresh logs
      const { data } = await equipmentService.getMaintenanceLogs(selectedEquipment.id);
      setLogs(Array.isArray(data) ? data : []);

      // Reset form
      setMaintenanceType('Routine');
      setDescription('');
      setPerformedBy('');
      
      // Show success message
      alert('Maintenance logged successfully! Operations department has been notified.');
      
      // Refresh equipment details to get updated hours
      const { data: updatedEquip } = await equipmentService.getById(selectedEquipment.id);
      setEquipmentDetails(updatedEquip);
      if (updatedEquip.hours_run) {
        setHoursAtService(updatedEquip.hours_run.toString());
      }
      
    } catch (err) {
      console.error('Add log error:', err?.response?.data || err.message);
      alert(`Error: ${err?.response?.data?.error || err.message}`);
    }
  };

  // Calculate maintenance status
  const getMaintenanceStatus = () => {
    if (!equipmentDetails) return null;
    
    const hoursUntil = equipmentDetails.hours_until_service;
    if (!hoursUntil && hoursUntil !== 0) return null;
    
    if (hoursUntil < 0) {
      return <span className="status-badge overdue">⚠️ OVERDUE by {Math.abs(hoursUntil)} hours</span>;
    } else if (hoursUntil < 50) {
      return <span className="status-badge due-soon">⏰ Due in {hoursUntil} hours</span>;
    } else {
      return <span className="status-badge ok">✅ Next service in {hoursUntil} hours</span>;
    }
  };

  // Load logs (keep existing)
  useEffect(() => {
    (async () => {
      if (!selectedEquipment?.id) {
        setLogs([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const { data } = await equipmentService.getMaintenanceLogs(selectedEquipment.id);
        setLogs(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch logs:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedEquipment?.id]);

  return (
    <div className="maintenance-page">
      <div className="maintenance-content">
        <div className="maintenance-header">
          <h1>Maintenance Logs</h1>

          {/* Equipment search */}
          <div className="equip-search" ref={boxRef}>
            <label htmlFor="equipSearch">Find Equipment</label>
            <div className="equip-input-wrap">
              <input
                id="equipSearch"
                type="text"
                value={query}
                onChange={(e) => {
                  const v = e.target.value;
                  setQuery(v);
                  if (selectedEquipment && v !== selectedEquipment.name) {
                    setSelectedEquipment(null);
                    setEquipmentDetails(null);
                  }
                }}
                placeholder="Type equipment name..."
                autoComplete="off"
                onFocus={() => query && setShowSug(true)}
              />
              {selectedEquipment?.id && (
                <button type="button" className="equip-clear" onClick={clearSelection} aria-label="Clear selection">
                  ×
                </button>
              )}
            </div>

            {showSug && (suggestions.length > 0 || isSearching) && (
              <div className="equip-suggestions" role="listbox">
                {isSearching && <div className="equip-sug-row searching">Searching...</div>}
                {suggestions.map((s) => (
                  <div
                    key={s.id}
                    className="equip-sug-row"
                    role="option"
                    onMouseDown={() => pickEquipment(s)}
                  >
                    {s.name}
                  </div>
                ))}
                {(!isSearching && suggestions.length === 0) && (
                  <div className="equip-sug-row empty">No matches</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Show equipment hours status */}
        {selectedEquipment && equipmentDetails && (
          <div className="equipment-status-bar">
            <div className="status-info">
              <span>Current Hours: <strong>{equipmentDetails.hours_run || 0}</strong></span>
              <span>Last Service: <strong>{equipmentDetails.last_service_hours || 0} hours</strong></span>
              <span>Service Interval: <strong>{equipmentDetails.service_interval_hours || 250} hours</strong></span>
            </div>
            {getMaintenanceStatus()}
          </div>
        )}

        {/* Maintenance entry form */}
        {['admin', 'manager', 'engineer'].includes(userRole) && selectedEquipment && (
          <form onSubmit={handleAddLog} className="log-form">
            <h3>Add New Log Entry</h3>

            <div className="form-row">
              <div className="form-group">
                <label>Maintenance Type</label>
                <select
                  value={maintenanceType}
                  onChange={(e) => setMaintenanceType(e.target.value)}
                  className="form-control"
                >
                  <option value="Routine">Routine Maintenance</option>
                  <option value="Preventive">Preventive Maintenance</option>
                  <option value="Repair">Repair</option>
                  <option value="Inspection">Inspection</option>
                </select>
              </div>

              <div className="form-group">
                <label>Current Hour Reading</label>
                <input
                  type="number"
                  value={hoursAtService}
                  onChange={(e) => setHoursAtService(e.target.value)}
                  className="form-control"
                  placeholder="Equipment hour meter reading"
                />
              </div>

              <div className="form-group">
                <label>Performed By</label>
                <input
                  type="text"
                  value={performedBy}
                  onChange={(e) => setPerformedBy(e.target.value)}
                  className="form-control"
                  placeholder="In-house / Vendor name"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="form-control"
                placeholder="Enter maintenance details..."
                required
              />
            </div>

            <button type="submit" className="submit-button">
              Add Log Entry (Operations will be notified)
            </button>
          </form>
        )}

        {/* Maintenance history table */}
        <div className="logs-container">
          <h3>
            Maintenance History {selectedEquipment?.name ? `— ${selectedEquipment.name}` : ''}
          </h3>

          {!selectedEquipment?.id ? (
            <div className="no-logs">Select an equipment to view its maintenance history.</div>
          ) : loading ? (
            <div className="loading">Loading logs...</div>
          ) : logs.length === 0 ? (
            <div className="no-logs">No maintenance records found</div>
          ) : (
            <>
              <div className="logs-header grid-row">
                <div>Type</div>
                <div>Description</div>
                <div>Hours</div>
                <div>Date</div>
                <div>Performed By</div>
              </div>
              <div className="logs-list table-like">
                {logs.map((log) => (
                  <div key={log.id} className="log-entry grid-row">
                    <div className="cell type">
                      {log.maintenance_type === 'Preventive' && '🔧 '}
                      {log.maintenance_type || '—'}
                    </div>
                    <div className="cell desc">{log.description || '—'}</div>
                    <div className="cell hours">{log.hours_at_service ? `${log.hours_at_service} hrs` : '—'}</div>
                    <div className="cell date">
                      {log.date ? new Date(log.date).toLocaleDateString() : '—'}
                    </div>
                    <div className="cell by">{log.performed_by || 'In-house'}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MaintenanceLog;