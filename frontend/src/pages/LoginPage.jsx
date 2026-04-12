import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { publicApi, setClientUserToken, userApi, setClientUser } from '../api/client.js';
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
      // Set token and user immediately on both AuthContext and API client
      // (Direct client calls ensure API is ready before navigation; AuthContext useEffect provides redundancy)
      setClientUserToken(userApi, data.token);
      setClientUser(userApi, data.user);
      setToken(data.token);
      setUser(data.user);
      // Redirect to user page
      navigate('/user', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand">JTSB NATURAL LIVE</div>
        <Link to="/payment">Pay & join</Link>
      </div>
      <div className="card" style={{ maxWidth: 400, margin: '2rem auto' }}>
        <h1>Sign In</h1>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input required type="email" value={email}
              onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label>Password</label>
            <input required type="password" value={password}
              onChange={e => setPassword(e.target.value)} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="muted" style={{ marginTop: '1rem' }}>
          New here? <Link to="/register">Register</Link> after payment.
        </p>
      </div>
    </div>
  );
}
