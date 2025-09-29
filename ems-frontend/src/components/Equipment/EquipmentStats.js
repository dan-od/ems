// src/components/Equipment/EquipmentStats.js
import React, { useEffect, useState } from 'react';
import { equipmentService } from '../../services/api';
import './Equipment.css';

const EquipmentStats = () => {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await equipmentService.getStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div>Loading statistics...</div>;

  return (
    <div className="equipment-stats">
      <h3>Equipment Overview</h3>
      <div className="stats-grid">
        {stats.map((stat) => (
          <div key={stat.status} className="stat-card">
            <div className="stat-value">{stat.count}</div>
            <div className="stat-label">{stat.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EquipmentStats;