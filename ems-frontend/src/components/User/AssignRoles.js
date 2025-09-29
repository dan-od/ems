import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './UserManagement.css';

const AssignRoles = () => {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]); // ✅ new
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '', department_id: '' });

  useEffect(() => {
    fetchUsers();
    fetchDepartments(); // ✅ new
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/users');
      setUsers(data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load users');
      setLoading(false);
    }
  };

  // ✅ Fetch departments
  const fetchDepartments = async () => {
    try {
      const { data } = await api.get('/departments');
      setDepartments(data);
    } catch (err) {
      console.error('Failed to load departments', err);
    }
  };

  const startEdit = (u) => {
    setEditingUser(u.id);
    setEditForm({
      name: u.name,
      email: u.email,
      role: u.role,
      department_id: u.department_id || ''
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm({ ...editForm, [name]: value });
  };

  const saveEdit = async (id) => {
    try {
      await api.put(`/users/${id}`, editForm);
      setSuccessMessage('User updated successfully');
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update user');
    }
  };


  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/users/${id}`);
      setSuccessMessage('User deleted successfully');
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete user');
    }
  };

  return (
    <div className="users-page">
      <h2>Users</h2>
      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      <table className="users-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Department</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.length > 0 ? (
            users.map((u) => (
              <tr key={u.id}>
                {editingUser === u.id ? (
                  <>
                    <td><input name="name" value={editForm.name} onChange={handleEditChange} /></td>
                    <td><input name="email" value={editForm.email} onChange={handleEditChange} /></td>
                    <td>
                      <select name="role" value={editForm.role} onChange={handleEditChange}>
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="engineer">Engineer</option>
                      </select>
                    </td>
                    <td>
                      <select
                        name="department_id"
                        value={editForm.department_id}
                        onChange={handleEditChange}
                      >
                        <option value="">— Select Department —</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td>
                      <button onClick={() => saveEdit(u.id)}>Save</button>
                      <button onClick={() => setEditingUser(null)}>Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td>{u.department || '—'}</td>
                    <td>
                      <button onClick={() => startEdit(u)}>Edit</button>
                      <button onClick={() => handleDelete(u.id)}>Delete</button>
                    </td>
                  </>
                )}
              </tr>
            ))
          ) : (
            <tr><td colSpan="5">No users found</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AssignRoles;