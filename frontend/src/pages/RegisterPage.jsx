import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { publicApi, attachUserToken, userApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setToken, setUser } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [utr, setUtr] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) setReferralCode(ref.trim().toUpperCase());
  }, [searchParams]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await publicApi.post('/auth/register', {
        name,
        email,
        password,
        utr,
        referralCode: referralCode || undefined,
      });
      attachUserToken(userApi, data.token);
      setToken(data.token);
      setUser(data.user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand">Create account</div>
        <Link to="/payment">Payment</Link>
      </div>
      <div className="card" style={{ maxWidth: 440, margin: '0 auto' }}>
        <h1>Register</h1>
        <p className="muted">Only available after your payment is verified as paid.</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Full name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
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
            <label>Password (min 8 characters)</label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="field">
            <label>UPI Reference Number (same as payment)</label>
            <input required value={utr} onChange={(e) => setUtr(e.target.value.replace(/\D/g, '').slice(0, 20))} inputMode="numeric" />
          </div>
          <div className="field">
            <label>Referral code (optional)</label>
            <input value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Creating…' : 'Create account'}
          </button>
        </form>
        <p className="muted" style={{ marginTop: '1rem' }}>
          Already a member? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
