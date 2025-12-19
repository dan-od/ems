// src/components/User/UserManagement.js
import { Link } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './UserManagement.css';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'engineer'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      console.log('📥 Fetching users...');
      try {
        const { data } = await api.get('/users');
        console.log('✅ Users fetched:', data);
        setUsers(data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load users');
        console.error('❌ Failed to fetch users:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    console.log('📤 Submitting new user:', newUser);

    try {
      const { data } = await api.post('/users', newUser);
      console.log('✅ User created successfully:', data);

      setUsers([...users, data.user || data]); // in case backend returns { user }
      setNewUser({
        name: '',
        email: '',
        password: '',
        role: 'engineer'
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user');
      console.error('❌ Create user error:', err.response || err);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    console.log(`📤 Changing role for user ${userId} → ${newRole}`);
    try {
      await api.put(`/users/${userId}/role`, { role: newRole });
      console.log('✅ Role updated successfully');

      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update role');
      console.error('❌ Role change error:', err.response || err);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    console.log(`🗑️ Deleting user ${userId}...`);

    try {
      await api.delete(`/users/${userId}`);
      console.log(`✅ User ${userId} deleted`);
      setUsers(users.filter(user => user.id !== userId));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete user');
      console.error('❌ Delete user error:', err.response || err);
    }
  };

  if (loading) return <div className="loading-indicator">Loading users...</div>;

  return (
    <div className="user-management">
      <h2>User Management</h2>
  
      {error && <div className="error-message">{error}</div>}
  
      {/* 🔸 Shortcut to Add User */}
      <Link
        to="/dashboard/add-user"
        style={{
          display: 'inline-block',
          backgroundColor: '#ff7a00',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '6px',
          textDecoration: 'none',
          marginBottom: '20px',
          fontWeight: 'bold'
        }}
      >
        ➕ Add New User
      </Link>
  
      {/* 🔸 Users Table (unchanged) */}
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Department</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
  
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.department || 'Unassigned'}</td>
  
              {/* Role change */}
              <td>
                <select
                  value={user.role}
                  onChange={(e) => handleRoleChange(user.id, e.target.value)}
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="engineer">Engineer</option>
                  <option value="staff">Staff</option>
                </select>
              </td>
  
              {/* Delete user */}
              <td>
                <button onClick={() => handleDeleteUser(user.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
  
    </div>
  );
  
};

export default UserManagement;
