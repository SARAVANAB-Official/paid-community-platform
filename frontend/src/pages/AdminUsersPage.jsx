import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { adminApi, attachAdminToken } from '../api/client.js';

const ADMIN_TOKEN_KEY = 'pc_admin_token';

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  // ===== NEW: Referral summary state =====
  const [referralSummary, setReferralSummary] = useState({
    totalUsers: 0,
    totalReferrals: 0,
    usersWithReferrals: 0,
    usersWithoutReferrals: 0,
    usersWhoWereReferred: 0,
    usersWhoJoinedAlone: 0,
    topReferrers: []
  });

  const q = (searchParams.get('q') || '').trim();
  // ===== NEW: Referral filter parameter =====
  const referralFilter = (searchParams.get('referral') || '').trim(); // 'all', 'has_referrals', 'no_referrals', 'was_referred', 'not_referred'

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (referralFilter && referralFilter !== 'all') sp.set('referral', referralFilter);
    return sp.toString();
  }, [q, referralFilter]);

  const load = useCallback(async () => {
    setError('');
    try {
      const { data } = await adminApi.get(`/admin/users${queryString ? `?${queryString}` : ''}`);
      let filteredUsers = data.users || [];

      // ===== NEW: Apply referral filter on client side =====
      if (referralFilter) {
        switch (referralFilter) {
          case 'has_referrals':
            filteredUsers = filteredUsers.filter(u => u.referralsCount > 0);
            break;
          case 'no_referrals':
            filteredUsers = filteredUsers.filter(u => u.referralsCount === 0);
            break;
          case 'was_referred':
            filteredUsers = filteredUsers.filter(u => u.referredBy !== null);
            break;
          case 'not_referred':
            filteredUsers = filteredUsers.filter(u => u.referredBy === null);
            break;
          default:
            break;
        }
      }

      setUsers(filteredUsers);

      // ===== NEW: Calculate referral summary statistics =====
      // Load all users for summary (without filters)
      const { data: allData } = await adminApi.get('/admin/users');
      const allUsers = allData.users || [];
      
      const totalUsers = allUsers.length;
      const totalReferrals = allUsers.reduce((sum, u) => sum + u.referralsCount, 0);
      const usersWithReferrals = allUsers.filter(u => u.referralsCount > 0).length;
      const usersWithoutReferrals = allUsers.filter(u => u.referralsCount === 0).length;
      const usersWhoWereReferred = allUsers.filter(u => u.referredBy !== null).length;
      const usersWhoJoinedAlone = allUsers.filter(u => u.referredBy === null).length;
      
      // Get top referrers (sorted by referralsCount descending)
      const topReferrers = allUsers
        .filter(u => u.referralsCount > 0)
        .sort((a, b) => b.referralsCount - a.referralsCount)
        .slice(0, 5)
        .map(u => ({
          name: u.name,
          email: u.email,
          referralCode: u.referralCode,
          referralsCount: u.referralsCount
        }));

      setReferralSummary({
        totalUsers,
        totalReferrals,
        usersWithReferrals,
        usersWithoutReferrals,
        usersWhoWereReferred,
        usersWhoJoinedAlone,
        topReferrers
      });
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
          : err.response?.data?.message || 'Could not load users'
      );
    }
  }, [navigate, queryString]);

  useEffect(() => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) {
      navigate('/admin', { replace: true });
      return;
    }
    attachAdminToken(adminApi, token);
    load();
  }, [navigate, load]);

  async function deleteUser(id) {
    if (!window.confirm('Delete this user? This cannot be undone.')) return;
    setBusyId(id);
    setError('');
    try {
      await adminApi.delete(`/admin/users/${id}`);
      await load();
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
          ? 'Cannot connect to the server. Please try again.'
          : err.response?.data?.message || 'Delete failed'
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand">Users</div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link className="btn btn-ghost" to="/admin/dashboard">
            Dashboard
          </Link>
          <Link className="btn btn-ghost" to="/admin/payments">
            Payments
          </Link>
          <button type="button" className="btn btn-ghost" onClick={load}>
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* ===== NEW: Referral Summary Section ===== */}
      <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(91, 140, 255, 0.1), rgba(52, 199, 89, 0.1))', border: '1px solid rgba(91, 140, 255, 0.3)' }}>
        <h2>📊 Referral Summary</h2>
        
        {/* Summary Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          <div style={{ padding: '1rem', background: 'white', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
              {referralSummary.totalUsers}
            </div>
            <div className="muted" style={{ fontSize: '0.85rem' }}>Total Users</div>
          </div>
          <div style={{ padding: '1rem', background: 'white', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>
              {referralSummary.totalReferrals}
            </div>
            <div className="muted" style={{ fontSize: '0.85rem' }}>Total Referrals</div>
          </div>
          <div style={{ padding: '1rem', background: 'white', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea' }}>
              {referralSummary.usersWithReferrals}
            </div>
            <div className="muted" style={{ fontSize: '0.85rem' }}>Users with Referrals</div>
          </div>
          <div style={{ padding: '1rem', background: 'white', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f7971e' }}>
              {referralSummary.usersWhoWereReferred}
            </div>
            <div className="muted" style={{ fontSize: '0.85rem' }}>Users Who Were Referred</div>
          </div>
        </div>

        {/* Top Referrers Table */}
        {referralSummary.topReferrers.length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <h3>🏆 Top Referrers</h3>
            <div className="table-wrap" style={{ marginTop: '0.75rem' }}>
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Referral Code</th>
                    <th>Referrals Made</th>
                  </tr>
                </thead>
                <tbody>
                  {referralSummary.topReferrers.map((user, index) => (
                    <tr key={user.referralCode}>
                      <td>
                        <span style={{ 
                          fontSize: '1.2rem', 
                          fontWeight: 'bold',
                          color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : 'var(--text)'
                        }}>
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                        </span>
                      </td>
                      <td><strong>{user.name}</strong></td>
                      <td>{user.email}</td>
                      <td><code style={{ fontSize: '0.8rem' }}>{user.referralCode}</code></td>
                      <td>
                        <span style={{ 
                          fontWeight: 'bold', 
                          color: 'var(--success)',
                          fontSize: '1.1rem'
                        }}>
                          {user.referralsCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h2>Search & Filter</h2>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          {/* Search input */}
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label>Search</label>
            <div className="copy-row" style={{ marginTop: '0.5rem' }}>
              <input
                value={q}
                onChange={(e) => {
                  const next = new URLSearchParams(searchParams);
                  const val = e.target.value;
                  if (val) next.set('q', val);
                  else next.delete('q');
                  setSearchParams(next, { replace: true });
                }}
                placeholder="Search name / email"
              />
            </div>
          </div>
          {/* ===== NEW: Referral filter dropdown ===== */}
          <div>
            <label>Referral Status</label>
            <select
              value={referralFilter || 'all'}
              onChange={(e) => {
                const next = new URLSearchParams(searchParams);
                const val = e.target.value;
                if (val && val !== 'all') next.set('referral', val);
                else next.delete('referral');
                setSearchParams(next, { replace: true });
              }}
              style={{ marginTop: '0.5rem', minWidth: '180px' }}
            >
              <option value="all">All Users</option>
              <option value="has_referrals">Has Referrals</option>
              <option value="no_referrals">No Referrals</option>
              <option value="was_referred">Was Referred</option>
              <option value="not_referred">Not Referred (Self-joined)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>All users ({users.length})</h2>
        <div className="table-wrap" style={{ marginTop: '1rem' }}>
          <table>
            <thead>
              <tr>
                <th>Created</th>
                <th>Name</th>
                <th>Email</th>
                <th>Referral code</th>
                <th>Referred by</th>
                <th>Referrals</th>
                <th>Payment</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td className="muted" style={{ fontSize: '0.85rem' }}>
                    {u.createdAt ? new Date(u.createdAt).toLocaleString() : '—'}
                  </td>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <code style={{ fontSize: '0.8rem' }}>{u.referralCode}</code>
                  </td>
                  <td>{u.referredBy || '—'}</td>
                  <td>{u.referralsCount}</td>
                  <td>{u.paymentApproved ? 'approved' : 'not approved'}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-danger"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.85rem' }}
                      disabled={busyId === u._id}
                      onClick={() => deleteUser(u._id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={8} className="muted">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

