import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { authService, equipmentService } from '../../services/api';
import logo from '../../assets/wfsllogo.png';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await equipmentService.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      setError('Failed to load statistics');
      setStats({ available: 0, maintenance: 0, retired: 0, pending: 0 });
    } finally {
      setLoading(false);
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

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white shadow-lg
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <img src={logo} alt="WFSL" className="h-12" />
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="mt-2 text-sm text-gray-600">Hi, {userName}</div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-2">
            <li>
              <Link
                to="/dashboard"
                className={`block px-4 py-3 rounded-lg transition-colors ${
                  isActive('/dashboard') && location.pathname === '/dashboard'
                    ? 'bg-orange-500 text-white'
                    : 'hover:bg-gray-100'
                }`}
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                to="/dashboard/all-equipment"
                className={`block px-4 py-3 rounded-lg transition-colors ${
                  isActive('/dashboard/all-equipment') ? 'bg-orange-500 text-white' : 'hover:bg-gray-100'
                }`}
              >
                All Equipment
              </Link>
            </li>
            <li>
              <Link
                to="/dashboard/under-maintenance"
                className={`block px-4 py-3 rounded-lg transition-colors ${
                  isActive('/dashboard/under-maintenance') ? 'bg-orange-500 text-white' : 'hover:bg-gray-100'
                }`}
              >
                Under Maintenance
              </Link>
            </li>
            <li>
              <Link
                to="/dashboard/requests"
                className={`block px-4 py-3 rounded-lg transition-colors ${
                  isActive('/dashboard/requests') ? 'bg-orange-500 text-white' : 'hover:bg-gray-100'
                }`}
              >
                Request Hub
              </Link>
            </li>
            <li>
              <Link
                to="/dashboard/my-requests"
                className={`block px-4 py-3 rounded-lg transition-colors ${
                  isActive('/dashboard/my-requests') ? 'bg-orange-500 text-white' : 'hover:bg-gray-100'
                }`}
              >
                My Requests
              </Link>
            </li>

            {(userRole === 'manager' || userRole === 'admin') && (
              <li>
                <Link
                  to="/dashboard/manager-requests"
                  className={`block px-4 py-3 rounded-lg transition-colors ${
                    isActive('/dashboard/manager-requests') ? 'bg-orange-500 text-white' : 'hover:bg-gray-100'
                  }`}
                >
                  Dept Requests
                </Link>
              </li>
            )}

            <li>
              <Link
                to="/dashboard/reports"
                className={`block px-4 py-3 rounded-lg transition-colors ${
                  isActive('/dashboard/reports') ? 'bg-orange-500 text-white' : 'hover:bg-gray-100'
                }`}
              >
                Reports / Logs
              </Link>
            </li>

            {userRole === 'admin' && (
              <>
                <li>
                  <Link
                    to="/dashboard/users"
                    className={`block px-4 py-3 rounded-lg transition-colors ${
                      isActive('/dashboard/users') ? 'bg-orange-500 text-white' : 'hover:bg-gray-100'
                    }`}
                  >
                    Users
                  </Link>
                </li>
                <li>
                  <Link
                    to="/dashboard/add-user"
                    className={`block px-4 py-3 rounded-lg transition-colors ${
                      isActive('/dashboard/add-user') ? 'bg-orange-500 text-white' : 'hover:bg-gray-100'
                    }`}
                  >
                    Add New User
                  </Link>
                </li>
              </>
            )}
          </ul>
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            LOGOUT
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header with Hamburger */}
        <header className="lg:hidden bg-white shadow-sm p-4 flex items-center justify-between">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-semibold">WFSL EMRS</span>
          <div className="w-10" /> {/* Spacer for centering */}
        </header>

        {/* Stats Cards */}
        <div className="bg-white shadow-sm p-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border rounded-lg p-4 text-center">
              <div className="text-3xl lg:text-4xl font-bold text-orange-500">{stats.available}</div>
              <div className="text-sm text-gray-600 mt-1">Available</div>
            </div>
            <div className="bg-white border rounded-lg p-4 text-center">
              <div className="text-3xl lg:text-4xl font-bold text-orange-500">{stats.maintenance}</div>
              <div className="text-sm text-gray-600 mt-1">Maintenance</div>
            </div>
            <div className="bg-white border rounded-lg p-4 text-center">
              <div className="text-3xl lg:text-4xl font-bold text-orange-500">{stats.retired}</div>
              <div className="text-sm text-gray-600 mt-1">Retired</div>
            </div>
            <div className="bg-white border rounded-lg p-4 text-center">
              <div className="text-3xl lg:text-4xl font-bold text-orange-500">{stats.pending}</div>
              <div className="text-sm text-gray-600 mt-1">Pending Requests</div>
            </div>
          </div>
          {error && <div className="text-red-500 text-sm mt-2 text-center">{error}</div>}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;