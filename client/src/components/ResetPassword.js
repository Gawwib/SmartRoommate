import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../services/api';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    try {
      const res = await API.post('/auth/reset-password', { token, password });
      setStatus(res.data?.message || 'Password updated.');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to reset password.');
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-md-6">
        <h2>Reset password</h2>
        {status && <div className="alert alert-info">{status}</div>}
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">New password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Confirm password</label>
            <input
              type="password"
              className="form-control"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Reset password
          </button>
        </form>
      </div>
    </div>
  );
}
