// src/components/Dashboard/dashboard.js
import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import logo from '../../assets/wfsllogo.png';
import './Dashboard.css';

import { equipmentService } from '../../services/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Get user info from localStorage
  const [userName] = useState(localStorage.getItem('userName') || 'User');
  const [userRole] = useState(localStorage.getItem('userRole') || '');

  const [stats, setStats] = useState({
    available: 0,
    maintenance: 0,
    retired: 0,
    pending: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data } = await equipmentService.getStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
        setError('Failed to load statistics');
        setStats({
          available: 0,
          maintenance: 0,
          retired: 0,
          pending: 0,
        });
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:3001/api/auth/logout', null, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Clear session storage
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userId');
      localStorage.removeItem('userName');
      navigate('/', { replace: true });
    }
  };

  // Function to check if a route is active
  const isActive = (path) => {
    return (
      location.pathname === path ||
      location.pathname.startsWith(`${path}/`)
    );
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <img
            src={logo}
            alt="Well Fluid Services Limited"
            className="company-logo"
          />
          <div className="user-info">
            <div className="user-greeting">Hi, {userName}</div>
          </div>
        </div>

        <nav className="menu">
          <ul>
            {/* Always visible */}
            <li>
              <Link
                to="/dashboard"
                className={isActive('/dashboard') ? 'active' : ''}
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                to="/dashboard/all-equipment"
                className={isActive('/dashboard/all-equipment') ? 'active' : ''}
              >
                All Equipment
              </Link>
            </li>
            <li>
              <Link
                to="/dashboard/under-maintenance"
                className={isActive('/dashboard/under-maintenance') ? 'active' : ''}
              >
                Under Maintenance
              </Link>
            </li>
            <li>
              <Link
                to="/dashboard/requests"
                className={isActive('/dashboard/requests') ? 'active' : ''}
              >
                Request Hub
              </Link>
            </li>

            <li>
              <Link
                to="/dashboard/my-requests"
                className={isActive('/dashboard/my-requests') ? 'active' : ''}
              >
                My Requests
              </Link>
            </li>

            {(userRole === 'manager' || userRole === 'admin') && (
              <li>
                <Link
                  to="/dashboard/manager-requests"
                  className={isActive('/dashboard/manager-requests') ? 'active' : ''}
                >
                  Dept Requests
                </Link>
              </li>
            )}

            <li>
              <Link
                to="/dashboard/reports"
                className={isActive('/dashboard/reports') ? 'active' : ''}
              >
                Reports / Logs
              </Link>
            </li>

            {userRole === 'admin' && (
              <>
                <li>
                  <Link
                    to="/dashboard/users"
                    className={isActive('/dashboard/users') ? 'active' : ''}
                  >
                    Users
                  </Link>
                </li>
                <li>
                  <Link
                    to="/dashboard/add-user"
                    className={isActive('/dashboard/add-user') ? 'active' : ''}
                  >
                    Add New User
                  </Link>
                </li>
              </>
            )}
          </ul>
        </nav>

        <div className="logout-section">
          <button onClick={handleLogout}>LOGOUT</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="stats-cards">
          <div className="card">
            <div className="card-value">{stats.available}</div>
            <div className="card-label">Available</div>
          </div>
          <div className="card">
            <div className="card-value">{stats.maintenance}</div>
            <div className="card-label">Maintenance</div>
          </div>
          <div className="card">
            <div className="card-value">{stats.retired}</div>
            <div className="card-label">Retired</div>
          </div>
          <div className="card">
            <div className="card-value">{stats.pending}</div>
            <div className="card-label">Pending Requests</div>
          </div>
        </div>
        {error && <div className="error-message">{error}</div>}
        <Outlet />
      </main>
    </div>
  );
};

export default Dashboard;
