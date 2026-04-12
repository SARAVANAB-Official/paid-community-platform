import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { adminApi, attachAdminToken } from '../api/client.js';

const ADMIN_TOKEN_KEY = 'pc_admin_token';

// ===== NEW: Admin Referrals Page =====
// Displays complete referral hierarchy showing who referred whom

export default function AdminReferralsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [referralTree, setReferralTree] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedUsers, setExpandedUsers] = useState(new Set());

  const q = (searchParams.get('q') || '').trim();
  const filter = (searchParams.get('filter') || '').trim(); // 'all', 'has_referrals', 'no_referrals'

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (filter && filter !== 'all') sp.set('filter', filter);
    return sp.toString();
  }, [q, filter]);

  // Load referral tree data
  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const { data } = await adminApi.get(`/admin/referrals${queryString ? `?${queryString}` : ''}`);
      let tree = data.tree || [];

      // Apply search filter
      if (q) {
        const lowerQ = q.toLowerCase();
        tree = tree.filter(
          user =>
            user.name.toLowerCase().includes(lowerQ) ||
            user.email.toLowerCase().includes(lowerQ) ||
            user.referralCode.toLowerCase().includes(lowerQ) ||
            (user.referrerName && user.referrerName.toLowerCase().includes(lowerQ))
        );
      }

      // Apply referral filter
      if (filter === 'has_referrals') {
        tree = tree.filter(user => user.referralsCount > 0);
      } else if (filter === 'no_referrals') {
        tree = tree.filter(user => user.referralsCount === 0);
      }

      setReferralTree(tree);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        attachAdminToken(adminApi, null);
        navigate('/admin', { replace: true });
        return;
      }
      const isNetworkError = !err.response;
      setError(
        isNetworkError
          ? 'Cannot connect to the server. Please check your connection and try again.'
          : err.response?.data?.message || 'Could not load referral data'
      );
    } finally {
      setLoading(false);
    }
  }, [navigate, queryString, q, filter]);

  useEffect(() => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) {
      navigate('/admin', { replace: true });
      return;
    }
    attachAdminToken(adminApi, token);
    load();
  }, [navigate, load]);

  // Toggle expand/collapse for user's referrals
  function toggleExpand(userId) {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }

  // Handle search input change
  function handleSearchChange(e) {
    const next = new URLSearchParams(searchParams);
    const val = e.target.value;
    if (val) next.set('q', val);
    else next.delete('q');
    setSearchParams(next, { replace: true });
  }

  // Handle filter change
  function handleFilterChange(e) {
    const next = new URLSearchParams(searchParams);
    const val = e.target.value;
    if (val && val !== 'all') next.set('filter', val);
    else next.delete('filter');
    setSearchParams(next, { replace: true });
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand">Referral Network</div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link className="btn btn-ghost" to="/admin/dashboard">
            Dashboard
          </Link>
          <Link className="btn btn-ghost" to="/admin/users">
            Users
          </Link>
          <Link className="btn btn-ghost" to="/admin/payments">
            Payments
          </Link>
          <button type="button" className="btn btn-ghost" onClick={load} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Search and Filter Controls */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h2>Search & Filter</h2>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label>Search</label>
            <input
              value={q}
              onChange={handleSearchChange}
              placeholder="Search name, email, referral code, or referrer"
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label>Filter by referrals</label>
            <select
              value={filter || 'all'}
              onChange={handleFilterChange}
              style={{ minWidth: '180px' }}
            >
              <option value="all">All Users</option>
              <option value="has_referrals">Has Referrals</option>
              <option value="no_referrals">No Referrals</option>
            </select>
          </div>
        </div>
      </div>

      {/* Referral Tree Display */}
      <div className="card">
        <h2>Referral Network ({referralTree.length} users)</h2>

        {loading && <p className="muted" style={{ marginTop: '1rem' }}>Loading referral data...</p>}

        {!loading && referralTree.length === 0 && (
          <p className="muted" style={{ marginTop: '1rem' }}>
            No users found matching your search criteria.
          </p>
        )}

        <div className="table-wrap" style={{ marginTop: '1rem' }}>
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Referral Code</th>
                <th>Referred By</th>
                <th>Referrals</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {referralTree.map(user => (
                <UserRow
                  key={user._id}
                  user={user}
                  isExpanded={expandedUsers.has(user._id)}
                  onToggle={() => toggleExpand(user._id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ===== NEW: User Row Component with Expandable Referrals =====
function UserRow({ user, isExpanded, onToggle }) {
  const hasReferrals = user.referredUsers && user.referredUsers.length > 0;

  return (
    <>
      <tr style={hasReferrals ? { cursor: 'pointer' } : {}}>
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {hasReferrals && (
              <span
                onClick={onToggle}
                style={{ fontSize: '0.8rem', userSelect: 'none' }}
              >
                {isExpanded ? '▼' : '▶'}
              </span>
            )}
            <strong>{user.name}</strong>
          </div>
        </td>
        <td>{user.email}</td>
        <td>
          <code style={{ fontSize: '0.8rem' }}>{user.referralCode}</code>
        </td>
        <td>
          {user.referredBy ? (
            <span title={`Code: ${user.referredBy}`}>
              {user.referrerName || 'Unknown'}{' '}
              <span className="muted" style={{ fontSize: '0.75rem' }}>
                ({user.referrerEmail})
              </span>
            </span>
          ) : (
            <span className="muted">— (Self-joined)</span>
          )}
        </td>
        <td>
          {hasReferrals ? (
            <span
              onClick={onToggle}
              style={{
                color: 'var(--primary)',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              {user.referralsCount} user{user.referralsCount !== 1 ? 's' : ''}
            </span>
          ) : (
            <span className="muted">0</span>
          )}
        </td>
        <td className="muted" style={{ fontSize: '0.85rem' }}>
          {new Date(user.createdAt).toLocaleDateString()}
        </td>
        <td>
          {hasReferrals && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onToggle}
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </button>
          )}
        </td>
      </tr>

      {/* Expanded row showing referred users */}
      {isExpanded && hasReferrals && (
        <>
          {user.referredUsers.map(referredUser => (
            <tr key={referredUser._id} style={{ background: 'rgba(91, 140, 255, 0.05)' }}>
              <td style={{ paddingLeft: '2rem' }}>
                <span style={{ fontSize: '0.8rem' }}>└─</span> {referredUser.name}
              </td>
              <td>{referredUser.email}</td>
              <td>
                <code style={{ fontSize: '0.8rem' }}>{referredUser.referralCode}</code>
              </td>
              <td>
                <span className="muted">Referred by {user.name}</span>
              </td>
              <td className="muted">0</td>
              <td className="muted" style={{ fontSize: '0.85rem' }}>
                {new Date(referredUser.createdAt).toLocaleDateString()}
              </td>
              <td></td>
            </tr>
          ))}
        </>
      )}
    </>
  );
}
