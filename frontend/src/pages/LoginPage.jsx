import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { publicApi, attachUserToken, userApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setToken, setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await publicApi.post('/auth/login', { email, password });
      attachUserToken(userApi, data.token);
      setToken(data.token);
      setUser(data.user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const isNetworkError = !err.response;
      setError(
        isNetworkError
          ? 'Cannot connect to the server. Please check your connection and try again.'
          : err.response?.data?.message || 'Login failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand">Member login</div>
        <Link to="/payment">Pay & join</Link>
      </div>
      <div className="card" style={{ maxWidth: 400, margin: '0 auto' }}>
        <h1>Welcome back</h1>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="muted" style={{ marginTop: '1rem' }}>
          New here? <Link to="/register">Register</Link> after payment.
        </p>
      </div>
    </div>
  );
}
