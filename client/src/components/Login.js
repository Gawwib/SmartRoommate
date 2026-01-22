import React, { useState } from 'react';
import API, { setAuthToken } from '../services/api';
import { Link, useNavigate } from 'react-router-dom';


export default function Login() {
const [data, setData] = useState({ email: '', password: '' });
const [error, setError] = useState('');
const navigate = useNavigate();


const handleChange = e => setData({ ...data, [e.target.name]: e.target.value });


const handleSubmit = async (e) => {
e.preventDefault();
try {
const res = await API.post('/auth/login', data);
const token = res.data.token;
localStorage.setItem('token', token);
setAuthToken(token);
navigate('/profile');
} catch (err) {
setError(err.response?.data?.message || 'Error');
}
}


return (
<div className="row justify-content-center">
<div className="col-md-6">
<h2>Login</h2>
{error && <div className="alert alert-danger">{error}</div>}
<form onSubmit={handleSubmit}>
<div className="mb-3">
<label className="form-label">Email</label>
<input name="email" type="email" onChange={handleChange} value={data.email} required className="form-control" />
</div>
<div className="mb-3">
<label className="form-label">Password</label>
<input name="password" type="password" onChange={handleChange} value={data.password} required className="form-control" />
</div>
<div className="mb-3 text-end">
<Link to="/forgot-password" className="btn btn-link p-0 text-decoration-none">
Forgot password?
</Link>
</div>
<button className="btn btn-primary" type="submit">Login</button>
</form>
</div>
</div>
);
}
