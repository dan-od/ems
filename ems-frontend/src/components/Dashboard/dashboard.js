import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { authService, equipmentService } from '../../services/api';
import logo from '../../assets/wfsllogo.png';
import './Dashboard.css';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userName] = useState(localStorage.getItem('userName') || 'User');
  const [userRole] = useState(localStorage.getItem('userRole') || '');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [stats, setStats] = useState({
    available: 0,
    maintenance: 0,
    retired: 0,
    pending: 0,
  });
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      const { data } = await equipmentService.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      setError('Failed to load statistics');
      setStats({ available: 0, maintenance: 0, retired: 0, pending: 0 });
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useAutoRefresh(fetchStats, 30000);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      localStorage.clear();
      navigate('/', { replace: true });
    }
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="dashboard-layout">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="mobile-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <img src={logo} alt="Well Fluid Services Limited" className="company-logo" />
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="mobile-close-btn"
          >
            ×
          </button>
          <div className="user-info">
            <div className="user-greeting">Hi, {userName}</div>
          </div>
        </div>

        <nav className="menu">
          <ul>
            <li>
              <Link to="/dashboard" className={isActive('/dashboard') && location.pathname === '/dashboard' ? 'active' : ''}>
                Dashboard
              </Link>
            </li>
            <li>
              <Link to="/dashboard/all-equipment" className={isActive('/dashboard/all-equipment') ? 'active' : ''}>
                All Equipment
              </Link>
            </li>
            <li>
              <Link to="/dashboard/under-maintenance" className={isActive('/dashboard/under-maintenance') ? 'active' : ''}>
                Under Maintenance
              </Link>
            </li>
            <li>
              <Link to="/dashboard/requests" className={isActive('/dashboard/requests') ? 'active' : ''}>
                Request Hub
              </Link>
            </li>
            <li>
              <Link to="/dashboard/my-requests" className={isActive('/dashboard/my-requests') ? 'active' : ''}>
                My Requests
              </Link>
            </li>

            {(userRole === 'manager' || userRole === 'admin') && (
              <li>
                <Link to="/dashboard/manager-requests" className={isActive('/dashboard/manager-requests') ? 'active' : ''}>
                  Dept Requests
                </Link>
              </li>
            )}

            {/* System Reports/Logs (OLD - for maintenance logs, etc.) */}
            <li>
              <Link to="/dashboard/logs" className={isActive('/dashboard/logs') ? 'active' : ''}>
                Reports / Logs
              </Link>
            </li>

            {/* Field Reports (NEW - for job completion reports) */}
            {(userRole === 'engineer' || userRole === 'manager' || userRole === 'admin') && (
              <li>
                <Link to="/dashboard/field-reports" className={isActive('/dashboard/field-reports') ? 'active' : ''}>
                  Field Reports
                </Link>
              </li>
            )}

            {userRole === 'admin' && (
              <>
                <li>
                  <Link to="/dashboard/users" className={isActive('/dashboard/users') ? 'active' : ''}>
                    Users
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard/add-user" className={isActive('/dashboard/add-user') ? 'active' : ''}>
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
        {/* Mobile Header with Hamburger */}
        <header className="mobile-header">
          <button onClick={() => setIsMobileMenuOpen(true)} className="hamburger-btn">
            <span></span>
            <span></span>
            <span></span>
          </button>
          <span className="mobile-title">WFSL EMRS</span>
        </header>

        {error && <div className="error-message">{error}</div>}
        <Outlet />
      </main>
    </div>
  );
};

export default Dashboard;