import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { userApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [referredByName, setReferredByName] = useState(null);
  const [copyMsg, setCopyMsg] = useState('');
  const [copyCodeMsg, setCopyCodeMsg] = useState('');
  const [referralCodeInput, setReferralCodeInput] = useState('');

  useEffect(() => {
    userApi
      .get('/auth/me')
      .then((res) => {
        setStats(res.data.platformStats);
        setReferredByName(res.data.referredByName);
      })
      .catch(() => setStats(null));
  }, []);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const refLink = user ? `${origin}/register?ref=${encodeURIComponent(user.referralCode)}` : '';

  async function copyReferralLink() {
    if (!refLink || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(refLink);
      setCopyMsg('Link copied!');
      setTimeout(() => setCopyMsg(''), 2000);
    } catch {
      setCopyMsg('Copy failed');
    }
  }

  // ===== NEW: Copy referral code to clipboard =====
  async function copyReferralCode() {
    if (!user?.referralCode || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(user.referralCode);
      setCopyCodeMsg('Code copied!');
      setTimeout(() => setCopyCodeMsg(''), 2000);
    } catch {
      setCopyCodeMsg('Copy failed');
    }
  }

  // ===== NEW: Share via WhatsApp =====
  function shareViaWhatsApp() {
    if (!user?.referralCode) return;
    const message = encodeURIComponent(
      `Join JTSB NATURAL LIVE! 🚀\n\nUse my referral code: ${user.referralCode}\nOr sign up using this link: ${refLink}\n\nLooking forward to having you here!`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  }

  // ===== NEW: Share via other platforms =====
  function shareViaSocial() {
    if (!user?.referralCode) return;
    const text = encodeURIComponent(
      `Join JTSB NATURAL LIVE! Use my referral code: ${user.referralCode}`
    );
    const url = encodeURIComponent(refLink);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  }

  // ===== NEW: Copy referral code from input =====
  async function copyInputCode() {
    if (!referralCodeInput.trim()) return;
    try {
      await navigator.clipboard.writeText(referralCodeInput.trim());
      setCopyCodeMsg('Code copied to clipboard!');
      setTimeout(() => setCopyCodeMsg(''), 2000);
    } catch {
      setCopyCodeMsg('Copy failed');
    }
  }

  // Get first name from user's full name
  const firstName = user?.name?.split(' ')[0] || 'Member';

  return (
    <div className="app-shell">
      {/* ===== NEW: Enhanced Welcome Header ===== */}
      <div className="topbar">
        <div className="brand">Welcome back, {firstName}! 👋</div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="muted">{user?.email}</span>
          <button type="button" className="btn btn-ghost" onClick={logout}>
            Log out
          </button>
        </div>
      </div>

      {/* ===== NEW: Welcome Banner ===== */}
      <div className="card" style={{ 
        marginBottom: '1.5rem',
        background: 'linear-gradient(135deg, rgba(91, 140, 255, 0.15), rgba(52, 199, 89, 0.15))',
        border: '1px solid rgba(91, 140, 255, 0.3)'
      }}>
        <h2 style={{ margin: '0 0 0.5rem 0' }}>🎉 Welcome to Your Dashboard!</h2>
        <p style={{ margin: '0.25rem 0' }}>
          Hi <strong>{user?.name}</strong>, we're glad you're here! Use your unique referral code below to invite others to join JTSB NATURAL LIVE.
        </p>
        <p className="muted" style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
          Share your code or link - every successful referral helps grow JTSB NATURAL LIVE!
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid-stats">
        <div className="stat">
          <div className="value">{stats?.totalUsers ?? '—'}</div>
          <div className="label">Total members</div>
        </div>
        <div className="stat" style={{ background: 'linear-gradient(135deg, rgba(52, 199, 89, 0.15), rgba(91, 140, 255, 0.15))' }}>
          <div className="value" style={{ color: 'var(--success)' }}>{user?.referralsCount ?? 0}</div>
          <div className="label">Your referrals</div>
        </div>
        <div className="stat">
          <div className="value">{user?.paymentApproved ? '✅ Approved' : '⏳ Pending'}</div>
          <div className="label">Payment status</div>
        </div>
      </div>

      {/* ===== NEW: Enhanced Referral Sharing Section ===== */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h2>📢 Share Your Referral Code</h2>
        <p className="muted">Invite friends to join JTSB NATURAL LIVE using your unique referral code or link.</p>
        
        {/* Referral Code Display */}
        <div className="field" style={{ marginBottom: '1rem', marginTop: '1rem' }}>
          <label>Your Referral Code</label>
          <div className="copy-row" style={{ gap: '0.5rem' }}>
            <code style={{ fontSize: '1.2rem', fontWeight: 'bold', flex: 1 }}>{user?.referralCode}</code>
            <button type="button" className="btn btn-primary" onClick={copyReferralCode}>
              Copy Code
            </button>
          </div>
          {copyCodeMsg && <p style={{ marginTop: '0.5rem', color: 'var(--success)', fontSize: '0.85rem' }}>{copyCodeMsg}</p>}
        </div>

        {/* Referral Link Display */}
        <div className="field" style={{ marginBottom: '1rem' }}>
          <label>Your Referral Link</label>
          <div className="copy-row" style={{ gap: '0.5rem' }}>
            <code style={{ flex: '1 1 200px', fontSize: '0.85rem' }}>{refLink}</code>
            <button type="button" className="btn btn-primary" onClick={copyReferralLink}>
              Copy Link
            </button>
          </div>
          {copyMsg && <p style={{ marginTop: '0.5rem', color: 'var(--success)', fontSize: '0.85rem' }}>{copyMsg}</p>}
        </div>

        {/* ===== NEW: Social Sharing Buttons ===== */}
        <div style={{ marginTop: '1.5rem' }}>
          <label>Share via</label>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            <button 
              type="button" 
              className="btn" 
              onClick={shareViaWhatsApp}
              style={{ 
                background: '#25D366', 
                color: 'white',
                border: 'none',
                padding: '0.6rem 1.2rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              💬 WhatsApp
            </button>
            <button 
              type="button" 
              className="btn" 
              onClick={shareViaSocial}
              style={{ 
                background: '#1DA1F2', 
                color: 'white',
                border: 'none',
                padding: '0.6rem 1.2rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              🐦 Twitter
            </button>
            <button 
              type="button" 
              className="btn"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: 'Join JTSB NATURAL LIVE',
                    text: `Use my referral code: ${user?.referralCode}`,
                    url: refLink
                  });
                }
              }}
              style={{ 
                background: '#6c757d', 
                color: 'white',
                border: 'none',
                padding: '0.6rem 1.2rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              🔗 More
            </button>
          </div>
        </div>
      </div>

      {/* ===== NEW: Enter Referral Code Section ===== */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h2>🎁 Have a Referral Code?</h2>
        <p className="muted">If someone gave you a referral code, enter it here to copy it to your clipboard and share with others.</p>
        <div className="field" style={{ marginTop: '1rem' }}>
          <label>Enter Referral Code</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              value={referralCodeInput} 
              onChange={(e) => setReferralCodeInput(e.target.value.toUpperCase())}
              placeholder="e.g., ABC12345"
              style={{ flex: 1 }}
              maxLength={8}
            />
            <button 
              type="button" 
              className="btn btn-ghost" 
              onClick={copyInputCode}
              disabled={!referralCodeInput.trim()}
            >
              Copy
            </button>
          </div>
        </div>
      </div>

      {/* Who Referred You Section */}
      <div className="card">
        <h2>👥 Who Referred You</h2>
        {user?.referredBy ? (
          <div style={{ padding: '1rem', background: 'rgba(91, 140, 255, 0.1)', borderRadius: '8px', marginTop: '0.75rem' }}>
            <p style={{ margin: '0 0 0.5rem 0' }}>
              You were referred by code: <strong>{user.referredBy}</strong>
            </p>
            {referredByName ? (
              <p style={{ margin: 0, color: 'var(--primary)' }}>
                Referred by: <strong>{referredByName}</strong>
              </p>
            ) : (
              <p className="muted" style={{ margin: 0 }}>Referrer account unavailable</p>
            )}
          </div>
        ) : (
          <p className="muted" style={{ marginTop: '0.75rem' }}>You joined JTSB NATURAL LIVE directly without a referral code.</p>
        )}
        <p className="muted" style={{ marginTop: '1rem' }}>
          <Link to="/payment">Go to Payment page</Link>
        </p>
      </div>
    </div>
  );
}
