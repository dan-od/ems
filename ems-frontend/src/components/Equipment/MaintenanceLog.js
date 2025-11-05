// ems-frontend/src/components/Equipment/MaintenanceLog.js
// FIXED - Search filtering + Request Hub styling

import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { equipmentService } from '../../services/api';
import './MaintenanceLog.css';

const MaintenanceLog = ({ equipmentId }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [maintenanceType, setMaintenanceType] = useState('Routine');
  const [description, setDescription] = useState('');
  const [hoursAtService, setHoursAtService] = useState('');
  const [performedBy, setPerformedBy] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Equipment details with hours info
  const [equipmentDetails, setEquipmentDetails] = useState(null);

  // Type-ahead search state
  const [query, setQuery] = useState('');
  const [allEquipment, setAllEquipment] = useState([]); // ✅ Store all equipment
  const [suggestions, setSuggestions] = useState([]);
  const [showSug, setShowSug] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const boxRef = useRef(null);

  const userRole = localStorage.getItem('userRole');

  // ✅ Load ALL equipment on mount for proper filtering
  useEffect(() => {
    (async () => {
      try {
        const { data } = await equipmentService.getAll();
        const equipmentList = Array.isArray(data) ? data : [];
        setAllEquipment(equipmentList);
        console.log('✅ Loaded equipment list:', equipmentList.length, 'items');
      } catch (err) {
        console.error('Failed to load equipment:', err);
      }
    })();
  }, []);

  // ✅ Auto-load equipment from URL params
  useEffect(() => {
    const equipmentIdFromUrl = searchParams.get('equipment');
    const equipmentNameFromUrl = searchParams.get('name');
    
    if (equipmentIdFromUrl && equipmentNameFromUrl) {
      console.log('🔗 Auto-loading equipment from URL:', equipmentIdFromUrl, equipmentNameFromUrl);
      
      setSelectedEquipment({
        id: parseInt(equipmentIdFromUrl),
        name: decodeURIComponent(equipmentNameFromUrl)
      });
      
      setQuery(decodeURIComponent(equipmentNameFromUrl));
    }
  }, [searchParams]);

  // Load equipment details with hours info
  useEffect(() => {
    (async () => {
      if (!selectedEquipment?.id) return;
      try {
        const { data } = await equipmentService.getById(selectedEquipment.id);
        setEquipmentDetails(data);
        if (data.hours_run) {
          setHoursAtService(data.hours_run.toString());
        }
      } catch (err) {
        console.error('Failed to fetch equipment details:', err);
      }
    })();
  }, [selectedEquipment?.id]);

  // ✅ FIXED: Search implementation with proper filtering
  useEffect(() => {
    // Don't search if query is empty or matches selected equipment
    if (!query || (selectedEquipment && query === selectedEquipment.name)) {
      setSuggestions([]);
      setShowSug(false);
      return;
    }

    const t = setTimeout(() => {
      setIsSearching(true);
      
      // ✅ Filter from local equipment list (instant, client-side filtering)
      const searchLower = query.toLowerCase();
      const filtered = allEquipment
        .filter(eq => eq.name?.toLowerCase().includes(searchLower))
        .slice(0, 10) // Limit to 10 results
        .map(eq => ({ id: eq.id, name: eq.name }));
      
      console.log('🔍 Search results for "' + query + '":', filtered.length, 'matches');
      setSuggestions(filtered);
      setShowSug(true);
      setIsSearching(false);
    }, 250);

    return () => clearTimeout(t);
  }, [query, selectedEquipment, allEquipment]);

  const pickEquipment = (eq) => {
    setSelectedEquipment({ id: eq.id, name: eq.name });
    setQuery(eq.name || '');
    setShowSug(false);
    
    // Update URL when equipment is manually selected
    navigate(`/dashboard/maintenance-logs?equipment=${eq.id}&name=${encodeURIComponent(eq.name)}`, { replace: true });
  };

  const clearSelection = () => {
    setSelectedEquipment(null);
    setQuery('');
    setLogs([]);
    setEquipmentDetails(null);
    setHoursAtService('');
    
    // Clear URL params
    navigate('/dashboard/maintenance-logs', { replace: true });
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
      
      alert('Maintenance logged successfully! Operations department has been notified.');
      
      // Refresh equipment details
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

  // Load logs
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
      {/* ✅ NEW: Request Hub Style Header Card */}
      <div className="page-header-card">
        <h1 className="page-title">Maintenance Logs</h1>
        <p className="page-subtitle">
          {selectedEquipment 
            ? `Viewing maintenance history for ${selectedEquipment.name}`
            : 'Search for equipment to view and manage maintenance records'}
        </p>
      </div>

      <div className="maintenance-content">
        {/* Breadcrumb - only show when equipment selected */}
        {selectedEquipment && (
          <div className="breadcrumb-nav">
            <button
              onClick={() => navigate('/dashboard/equipment')}
              className="breadcrumb-link"
            >
              ← Back to All Equipment
            </button>
          </div>
        )}

        {/* Equipment Search Box */}
        <div className="search-section">
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
                  <div className="equip-sug-row empty">No matches found</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Equipment Status Bar */}
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

        {/* Maintenance Entry Form */}
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

        {/* Maintenance History */}
        <div className="logs-container">
          <h3>Maintenance History</h3>

          {!selectedEquipment?.id ? (
            <div className="no-logs">
              <p>Select an equipment to view its maintenance history.</p>
              <small>Search for equipment above or navigate from the Equipment List.</small>
            </div>
          ) : loading ? (
            <div className="loading">Loading logs...</div>
          ) : logs.length === 0 ? (
            <div className="no-logs">
              <p>No maintenance records found for {selectedEquipment.name}</p>
            </div>
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