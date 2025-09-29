import React, { useEffect, useRef, useState } from 'react';
import { equipmentService } from '../../services/api';
import './MaintenanceLog.css';

const MaintenanceLog = ({ equipmentId }) => {
  const [logs, setLogs] = useState([]);
  const [maintenanceType, setMaintenanceType] = useState('Routine');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);

  // Type-ahead by NAME only
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);   // [{id,name}]
  const [showSug, setShowSug] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null); // {id,name}
  const [isSearching, setIsSearching] = useState(false);
  const boxRef = useRef(null);

  const userRole = localStorage.getItem('userRole');

  // Preselect by id if provided
  useEffect(() => {
    (async () => {
      if (!equipmentId) return;
      try {
        const { data } = await equipmentService.getById(equipmentId);
        if (data?.id) {
          setSelectedEquipment({ id: data.id, name: data.name });
          setQuery(data.name || '');
        }
      } catch (err) {
        console.error('Failed to fetch equipment by id:', err);
      }
    })();
  }, [equipmentId]);

  // Search: NAME only (debounced)
  useEffect(() => {
    if (!query || (selectedEquipment && query === selectedEquipment.name)) {
      setSuggestions([]);
      setShowSug(false);
      return;
    }

    const t = setTimeout(async () => {
      try {
        setIsSearching(true);
        // If backend expects ?q=, change to { q: query, limit: 10 }
        const { data } = await equipmentService.getAll({ name: query, limit: 10 });
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

  // Close suggestions on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) setShowSug(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Load logs on selection
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

  const pickEquipment = (eq) => {
    setSelectedEquipment({ id: eq.id, name: eq.name });
    setQuery(eq.name || '');
    setShowSug(false);
  };

  const clearSelection = () => {
    setSelectedEquipment(null);
    setQuery('');
    setLogs([]);
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
      });

      // refresh logs
      const { data } = await equipmentService.getMaintenanceLogs(selectedEquipment.id);
      setLogs(Array.isArray(data) ? data : []);

      setMaintenanceType('Routine');
      setDescription('');
    } catch (err) {
      console.error('Add log error:', err?.response?.data || err.message);
      alert(`Error: ${JSON.stringify(err?.response?.data || err.message)}`);
    }
  };

  return (
    <div className="maintenance-page">
      <div className="maintenance-content">
        <div className="maintenance-header">
          <h1>Maintenance Logs</h1>

          {/* Type-ahead by NAME only */}
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
                  }
                }}
                placeholder="Type equipment name…"
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
                {isSearching && <div className="equip-sug-row searching">Searching…</div>}
                {suggestions.map((s) => (
                  <div
                    key={s.id}
                    className="equip-sug-row"
                    role="option"
                    onMouseDown={() => pickEquipment(s)} /* mousedown avoids blur cancel */
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

        {['admin', 'manager', 'engineer'].includes(userRole) && (
          <form onSubmit={handleAddLog} className="log-form">
            <h3>Add New Log Entry</h3>

            <div className="form-group">
              <label>Maintenance Type</label>
              <select
                value={maintenanceType}
                onChange={(e) => setMaintenanceType(e.target.value)}
                className="form-control"
              >
                <option value="Routine">Routine Maintenance</option>
                <option value="Repair">Repair</option>
                <option value="Inspection">Inspection</option>
              </select>
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

            <button type="submit" className="submit-button" disabled={!selectedEquipment?.id}>
              Add Log Entry
            </button>
          </form>
        )}

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
                <div>Date</div>
                <div>Recorded By</div>
              </div>
              <div className="logs-list table-like">
                {logs.map((log) => (
                  <div key={log.id} className="log-entry grid-row">
                    <div className="cell type">{log.maintenance_type || '—'}</div>
                    <div className="cell desc">{log.description || '—'}</div>
                    <div className="cell date">
                      {log.date ? new Date(log.date).toLocaleDateString() : '—'}
                    </div>
                    <div className="cell by">{log.created_by_name || log.user_name || '—'}</div>
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
