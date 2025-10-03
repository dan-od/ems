import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './UserManagement.css';

const AssignRoles = () => {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '', department_id: '' });

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
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
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update user');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/users/${id}`);
      setSuccessMessage('User deleted successfully');
      fetchUsers();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete user');
      setTimeout(() => setError(''), 3000);
    }
  };

  if (loading) return <div className="loading-indicator">Loading users...</div>;

  return (
    <div className="users-page">
      <h2>Users</h2>
      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      {/* Desktop: Table View */}
      <div className="users-table-desktop">
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
                          <option value="staff">Staff</option>
                        </select>
                      </td>
                      <td>
                        <select name="department_id" value={editForm.department_id} onChange={handleEditChange}>
                          <option value="">— Select Department —</option>
                          {departments.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button 
                          onClick={() => saveEdit(u.id)}
                          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mr-2"
                        >
                          Save
                        </button>
                        <button 
                          onClick={() => setEditingUser(null)}
                          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`role-badge ${u.role}`}>
                          {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                        </span>
                      </td>
                      <td>{u.department || '—'}</td>
                      <td>
                        <button 
                          onClick={() => startEdit(u)}
                          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-2"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(u.id)}
                          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                        >
                          Delete
                        </button>
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

      {/* Mobile: Card View */}
      <div className="users-cards-mobile">
        {users.length > 0 ? (
          users.map((u) => (
            <div key={u.id} className="user-card">
              {editingUser === u.id ? (
                <div className="user-card-edit">
                  <div className="edit-field">
                    <label>Name</label>
                    <input name="name" value={editForm.name} onChange={handleEditChange} />
                  </div>
                  <div className="edit-field">
                    <label>Email</label>
                    <input name="email" value={editForm.email} onChange={handleEditChange} />
                  </div>
                  <div className="edit-field">
                    <label>Role</label>
                    <select name="role" value={editForm.role} onChange={handleEditChange}>
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="engineer">Engineer</option>
                      <option value="staff">Staff</option>
                    </select>
                  </div>
                  <div className="edit-field">
                    <label>Department</label>
                    <select name="department_id" value={editForm.department_id} onChange={handleEditChange}>
                      <option value="">— Select Department —</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="card-actions-edit">
                    <button className="btn-save" onClick={() => saveEdit(u.id)}>Save</button>
                    <button className="btn-cancel" onClick={() => setEditingUser(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="user-card-header">
                    <h3>{u.name}</h3>
                    <span className={`role-badge ${u.role}`}>
                      {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                    </span>
                  </div>
                  <div className="user-card-body">
                    <div className="user-detail">
                      <strong>Email:</strong>
                      <span>{u.email}</span>
                    </div>
                    <div className="user-detail">
                      <strong>Department:</strong>
                      <span>{u.department || '—'}</span>
                    </div>
                  </div>
                  <div className="card-actions">
                    <button className="btn-edit" onClick={() => startEdit(u)}>Edit</button>
                    <button className="btn-delete" onClick={() => handleDelete(u.id)}>Delete</button>
                  </div>
                </>
              )}
            </div>
          ))
        ) : (
          <p className="no-users">No users found</p>
        )}
      </div>
    </div>
  );
};

export default AssignRoles;