import React, { useState } from 'react';
import API from '../services/api';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus('');
    setError('');
    try {
      const res = await API.post('/auth/forgot-password', { email });
      setStatus(res.data?.message || 'Check your inbox for a reset link.');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to send reset email.');
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-md-6">
        <h2>Forgot password</h2>
        {status && <div className="alert alert-info">{status}</div>}
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Send reset link
          </button>
        </form>
        <div className="mt-3">
          <Link to="/login" className="btn btn-link p-0 text-decoration-none">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
