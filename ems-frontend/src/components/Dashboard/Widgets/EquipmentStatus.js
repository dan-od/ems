import React from 'react';
import './Widgets.css';

const EquipmentStatus = ({ equipment, loading }) => {
  const getDaysText = (days) => {
    if (days === null || days === undefined) return 'Never serviced';
    if (days < 1) return 'Serviced today';
    if (days === 1) return 'Serviced yesterday';
    return `Serviced ${Math.floor(days)} days ago`;
  };

  const getServiceStatus = (serviceDue, daysUntilService) => {
    if (serviceDue) return { color: 'warning', text: '⚠️ Service Due' };
    if (daysUntilService !== null && daysUntilService < 7) {
      return { color: 'caution', text: '⏰ Service Soon' };
    }
    return { color: 'ok', text: '✅ Operational' };
  };

  if (loading) {
    return (
      <div className="widget loading">
        <h3>🛠️ My Assigned Equipment</h3>
        <p>Loading equipment...</p>
      </div>
    );
  }

  return (
    <div className="widget equipment-widget">
      <div className="widget-header">
        <h3>🛠️ My Assigned Equipment ({equipment.length})</h3>
      </div>

      {equipment.length === 0 ? (
        <div className="empty-state">
          <p>No equipment currently assigned to you</p>
        </div>
      ) : (
        <div className="equipment-list">
          {equipment.map((item) => {
            const serviceStatus = getServiceStatus(item.service_due, null);
            
            return (
              <div key={item.id} className="equipment-card">
                <div className="equipment-header">
                  <h4>{item.name}</h4>
                  <span className={`service-badge ${serviceStatus.color}`}>
                    {serviceStatus.text}
                  </span>
                </div>

                <div className="equipment-details">
                  <div className="detail-row">
                    <span className="label">📍 Location:</span>
                    <span className="value">{item.current_location || item.base_location || 'Unknown'}</span>
                  </div>
                  
                  {item.last_maintenance_date && (
                    <div className="detail-row">
                      <span className="label">🔧 Last Service:</span>
                      <span className="value">{getDaysText(item.days_since_maintenance)}</span>
                    </div>
                  )}

                  <div className="detail-row">
                    <span className="label">⏱️ Assigned:</span>
                    <span className="value">
                      {new Date(item.assigned_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {item.notes && (
                  <div className="equipment-notes">
                    <small>📝 {item.notes}</small>
                  </div>
                )}

                <div className="equipment-actions">
                  <button className="btn-sm btn-secondary">View Details</button>
                  {item.service_due && (
                    <button className="btn-sm btn-warning">Report Issue</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EquipmentStatus;