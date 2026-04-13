import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { publicApi, setClientUserToken, userApi, setClientUser } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const REFERRAL_STORAGE_KEY = 'pc_pending_referral';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setToken, setUser } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [utr, setUtr] = useState('');
  const [referralCode, setReferralCode] = useState(() => {
    // Restore from localStorage on mount (survives reload/navigation)
    const stored = localStorage.getItem(REFERRAL_STORAGE_KEY);
    return stored || '';
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Capture referral code from URL and persist to localStorage
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      const trimmed = ref.trim().toUpperCase();
      setReferralCode(trimmed);
      localStorage.setItem(REFERRAL_STORAGE_KEY, trimmed);
    }
  }, [searchParams]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await publicApi.post('/auth/register', {
        name, email, password, utr,
        referralCode: referralCode || undefined,
      });
      setClientUserToken(userApi, data.token);
      setClientUser(userApi, data.user);
      setToken(data.token);
      setUser(data.user);
      // Clear stored referral code after successful registration
      localStorage.removeItem(REFERRAL_STORAGE_KEY);
      navigate('/user', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand">JTSB NATURAL LIVE</div>
        <Link to="/payment">Payment</Link>
      </div>
      <div className="card" style={{ maxWidth: 440, margin: '2rem auto' }}>
        <h1>Create Account</h1>
        <p className="muted">Register after your payment is verified.</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Full name</label>
            <input required value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="field">
            <label>Email</label>
            <input required type="email" value={email}
              onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label>Password (min 8 characters)</label>
            <input required type="password" value={password}
              onChange={e => setPassword(e.target.value)} />
          </div>
          <div className="field">
            <label>UPI Reference Number</label>
            <input required value={utr}
              onChange={e => setUtr(e.target.value.replace(/\D/g, '').slice(0, 20))}
              placeholder="10-20 digit UPI Reference Number" />
          </div>
          <div className="field">
            <label>Referral code (optional)</label>
            <input value={referralCode}
              onChange={e => setReferralCode(e.target.value.toUpperCase())} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>
        <p className="muted" style={{ marginTop: '1rem' }}>
          Already a member? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
