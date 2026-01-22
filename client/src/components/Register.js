import React, { useState } from 'react';
import API, { setAuthToken } from '../services/api';
import { useNavigate } from 'react-router-dom';


export default function Register() {
const [data, setData] = useState({ name: '', email: '', password: '' });
const [termsAccepted, setTermsAccepted] = useState(false);
const [emailOptIn, setEmailOptIn] = useState(false);
const [error, setError] = useState('');
const navigate = useNavigate();


const handleChange = e => setData({ ...data, [e.target.name]: e.target.value });


const handleSubmit = async (e) => {
e.preventDefault();
try {
const payload = { ...data, termsAccepted, emailOptIn };
const res = await API.post('/auth/register', payload);
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
<h2>Register</h2>
{error && <div className="alert alert-danger">{error}</div>}
<form onSubmit={handleSubmit}>
<div className="mb-3">
<label className="form-label">Name</label>
<input name="name" onChange={handleChange} value={data.name} required className="form-control" />
</div>
<div className="mb-3">
<label className="form-label">Email</label>
<input name="email" type="email" onChange={handleChange} value={data.email} required className="form-control" />
</div>
<div className="mb-3">
<label className="form-label">Password</label>
<input name="password" type="password" onChange={handleChange} value={data.password} required className="form-control" />
</div>
<div className="mb-3 form-check">
<input
className="form-check-input"
type="checkbox"
id="termsAccepted"
checked={termsAccepted}
onChange={(e) => setTermsAccepted(e.target.checked)}
required
/>
<label className="form-check-label" htmlFor="termsAccepted">
I accept the Terms and Conditions *
</label>
</div>
<div className="mb-3 form-check">
<input
className="form-check-input"
type="checkbox"
id="emailOptIn"
checked={emailOptIn}
onChange={(e) => setEmailOptIn(e.target.checked)}
/>
<label className="form-check-label" htmlFor="emailOptIn">
Send me news and notifications by email
</label>
</div>
<button className="btn btn-primary" type="submit">Register</button>
</form>
</div>
</div>
);
}
