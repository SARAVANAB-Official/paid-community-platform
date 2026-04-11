import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { publicApi, adminApi, attachAdminToken } from '../api/client.js';

const ADMIN_TOKEN_KEY = 'pc_admin_token';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in (valid token in localStorage), redirect to dashboard
  useEffect(() => {
    const existingToken = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (existingToken) {
      attachAdminToken(adminApi, existingToken);
      navigate('/admin/dashboard', { replace: true });
    }
  }, [navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Clear any stale token and adminApi header before attempting fresh login
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    attachAdminToken(adminApi, null);

    try {
      const { data } = await publicApi.post('/admin/login', { email, password });

      // Store fresh token and attach to adminApi
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      attachAdminToken(adminApi, data.token);
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand">Admin</div>
        <Link to="/payment">Member area</Link>
      </div>
      <div className="card" style={{ maxWidth: 400, margin: '0 auto' }}>
        <h1>Admin sign in</h1>
        <p className="muted">Restricted access — platform operators only.</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
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
      </div>
    </div>
  );
}
