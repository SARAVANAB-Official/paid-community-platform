import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { userApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [referredByName, setReferredByName] = useState(null);
  const [copyMsg, setCopyMsg] = useState('');

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
      setCopyMsg('Copied link');
      setTimeout(() => setCopyMsg(''), 2000);
    } catch {
      setCopyMsg('Copy failed');
    }
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand">Member dashboard</div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="muted">{user?.email}</span>
          <button type="button" className="btn btn-ghost" onClick={logout}>
            Log out
          </button>
        </div>
      </div>

      <div className="grid-stats">
        <div className="stat">
          <div className="value">{stats?.totalUsers ?? '—'}</div>
          <div className="label">Total members on platform</div>
        </div>
        <div className="stat">
          <div className="value">{user?.referralsCount ?? 0}</div>
          <div className="label">Your successful referrals</div>
        </div>
        <div className="stat">
          <div className="value">{user?.paymentApproved ? 'Approved' : 'Not approved'}</div>
          <div className="label">Payment status</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h2>Your referral</h2>
        <p className="muted">Share this link or code. When someone joins with your code, your count increases.</p>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Referral code</label>
          <div className="copy-row">
            <code>{user?.referralCode}</code>
          </div>
        </div>
        <div className="field" style={{ marginTop: '1rem' }}>
          <label>Referral link</label>
          <div className="copy-row">
            <code style={{ flex: '1 1 200px' }}>{refLink}</code>
            <button type="button" className="btn btn-ghost" onClick={copyReferralLink}>
              Copy link
            </button>
          </div>
          {copyMsg && <p className="muted" style={{ marginTop: '0.5rem' }}>{copyMsg}</p>}
        </div>
      </div>

      <div className="card">
        <h2>Who referred you</h2>
        {user?.referredBy ? (
          <p>
            Code: <strong>{user.referredBy}</strong>
            {referredByName ? (
              <>
                {' '}
                · Referred by <strong>{referredByName}</strong>
              </>
            ) : (
              <span className="muted"> (referrer account unavailable)</span>
            )}
          </p>
        ) : (
          <p className="muted">You joined without a referral code.</p>
        )}
        <p className="muted" style={{ marginTop: '1rem' }}>
          <Link to="/payment">Payment page</Link>
        </p>
      </div>
    </div>
  );
}
