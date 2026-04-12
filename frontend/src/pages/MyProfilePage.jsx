import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function MyProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Show loading while auth state initializes
  if (!user) {
    return (
      <div className="app-shell">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <p className="muted">Loading profile...</p>
        </div>
      </div>
    );
  }

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  async function copyCode() {
    if (!user?.referralCode) return;
    try {
      await navigator.clipboard.writeText(user.referralCode);
    } catch { /* ignore */ }
  }

  async function copyLink() {
    if (!user?.referralCode) return;
    const link = `${window.location.origin}/register?ref=${encodeURIComponent(user.referralCode)}`;
    try {
      await navigator.clipboard.writeText(link);
    } catch { /* ignore */ }
  }

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const refLink = user
    ? `${window.location.origin}/register?ref=${encodeURIComponent(user.referralCode)}`
    : '';

  return (
    <div className="app-shell">
      {/* Top bar */}
      <div className="topbar">
        <div className="brand">JTSB NATURAL LIVE</div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Link to="/dashboard" style={{ color: 'white', textDecoration: 'none' }}>Dashboard</Link>
          <button onClick={handleLogout}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', padding: '0.4rem 0.8rem',
              borderRadius: 8, color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
            Logout
          </button>
        </div>
      </div>

      {/* Profile Content */}
      <div style={{ maxWidth: 600, margin: '2rem auto', padding: '0 1rem' }}>

        {/* Profile Card */}
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'var(--primary)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', fontWeight: 'bold', margin: '0 auto 1rem'
          }}>
            {initials}
          </div>
          <h1 style={{ margin: '0 0 0.25rem 0' }}>{user?.name}</h1>
          <p className="muted" style={{ margin: 0 }}>{user?.email}</p>
          <p className="muted" style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>
            Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
          </p>
        </div>

        {/* Referral Code Card */}
        <div className="card" style={{ marginTop: '1.25rem' }}>
          <h2 style={{ margin: '0 0 1rem 0' }}>🎁 Your Referral Code</h2>
          <div style={{
            fontSize: '2rem', fontWeight: 'bold', fontFamily: 'monospace',
            letterSpacing: '4px', color: 'var(--primary)', textAlign: 'center',
            padding: '1rem', background: 'var(--bg)', borderRadius: 8, marginBottom: '1rem'
          }}>
            {user?.referralCode || '—'}
          </div>
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <button className="btn btn-primary" onClick={copyCode}>📋 Copy Code</button>
          </div>
          <div>
            <p className="muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>Referral Link:</p>
            <p style={{
              fontSize: '0.85rem', wordBreak: 'break-all', fontFamily: 'monospace',
              background: 'var(--bg)', padding: '0.75rem', borderRadius: 6
            }}>
              {refLink}
            </p>
            <button className="btn btn-primary" onClick={copyLink} style={{ marginTop: '0.5rem' }}>📋 Copy Link</button>
          </div>
        </div>

        {/* Stats Card */}
        <div className="card" style={{ marginTop: '1.25rem' }}>
          <h2 style={{ margin: '0 0 1rem 0' }}>📊 Your Stats</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--bg)', borderRadius: 8 }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--success)' }}>
                {user?.referralsCount ?? 0}
              </div>
              <div className="muted" style={{ fontSize: '0.85rem' }}>Referrals</div>
            </div>
            <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--bg)', borderRadius: 8 }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
                {user?.paymentApproved ? '✅' : '⏳'}
              </div>
              <div className="muted" style={{ fontSize: '0.85rem' }}>Payment</div>
            </div>
          </div>
        </div>

        {/* Referred By */}
        {user?.referredBy && (
          <div className="card" style={{ marginTop: '1.25rem' }}>
            <h2 style={{ margin: '0 0 0.5rem 0' }}>👤 Referred By</h2>
            <p style={{ margin: 0 }}>Code: <strong>{user.referredBy}</strong></p>
          </div>
        )}

        {/* Quick Links */}
        <div className="card" style={{ marginTop: '1.25rem' }}>
          <h2 style={{ margin: '0 0 1rem 0' }}>🔗 Quick Links</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Link to="/dashboard" className="btn btn-ghost" style={{ textAlign: 'center' }}>📊 View Dashboard</Link>
            <Link to="/payment" className="btn btn-ghost" style={{ textAlign: 'center' }}>💳 Payment Page</Link>
          </div>
        </div>

        <p className="muted" style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          © 2026 JTSB NATURAL LIVE
        </p>
      </div>
    </div>
  );
}
