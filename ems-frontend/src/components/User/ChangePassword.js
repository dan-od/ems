// frontend/src/components/User/ChangePassword.js
import React, { useState } from 'react';
import api from '../../services/api';
import './ChangePassword.css';

export default function ChangePassword() {
  const [form, setForm]       = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (form.newPassword !== form.confirm) {
      return setError('New passwords do not match');
    }
    try {
      await api.post('/users/change-password', {
        currentPassword: form.currentPassword,
        newPassword:     form.newPassword
      });
      setSuccess('Password updated – please re‑login.');
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password');
    }
  };

  return (
    <div className="change-password">
      <h2>Change Password</h2>
      {error   && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}
      <form onSubmit={handleSubmit}>
        <label>
          Current Password
          <input
            type="password"
            value={form.currentPassword}
            onChange={e => setForm({...form, currentPassword: e.target.value})}
            required
          />
        </label>
        <label>
          New Password
          <input
            type="password"
            value={form.newPassword}
            onChange={e => setForm({...form, newPassword: e.target.value})}
            required
            minLength={8}
          />
        </label>
        <label>
          Confirm New Password
          <input
            type="password"
            value={form.confirm}
            onChange={e => setForm({...form, confirm: e.target.value})}
            required
          />
        </label>
        <button type="submit">Change Password</button>
      </form>
    </div>
  );
}
