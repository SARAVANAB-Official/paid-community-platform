import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminApi, attachAdminToken } from '../api/client.js';

const ADMIN_TOKEN_KEY = 'pc_admin_token';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    setError('');
    try {
      const { data } = await adminApi.get('/admin/stats');
      setStats(data);
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
          : err.response?.data?.message || 'Could not load dashboard'
      );
    }
  }

  useEffect(() => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) {
      navigate('/admin', { replace: true });
      return;
    }
    attachAdminToken(adminApi, token);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  function logout() {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    attachAdminToken(adminApi, null);
    navigate('/admin', { replace: true });
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand">Admin dashboard</div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link className="btn btn-ghost" to="/admin/payments">
            Payments
          </Link>
          <Link className="btn btn-ghost" to="/admin/users">
            Users
          </Link>
          {/* ===== NEW: Link to Referrals Page ===== */}
          <Link className="btn btn-ghost" to="/admin/referrals">
            Referrals
          </Link>
          <button type="button" className="btn btn-ghost" onClick={load}>
            Refresh
          </button>
          <button type="button" className="btn btn-ghost" onClick={logout}>
            Log out
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid-stats">
        <div className="stat">
          <div className="value">{stats?.totalUsers ?? '—'}</div>
          <div className="label">Total users</div>
        </div>
        <div className="stat">
          <div className="value">{stats?.totalPayments ?? '—'}</div>
          <div className="label">Total payments</div>
        </div>
        <div className="stat">
          <div className="value">{stats?.totalReferrals ?? '—'}</div>
          <div className="label">Total referrals</div>
        </div>
        <div className="stat" style={{ background: 'linear-gradient(135deg, rgba(52, 199, 89, 0.1), rgba(91, 140, 255, 0.1))', border: '1px solid rgba(52, 199, 89, 0.3)' }}>
          <div className="value" style={{ color: 'var(--success)' }}>
            ₹{stats?.totalApprovedAmount?.toFixed(2) ?? '0.00'}
          </div>
          <div className="label">Total Approved Revenue</div>
        </div>
      </div>

      {/* ===== NEW: Referral Breakdown Card ===== */}
      <div className="card" style={{ marginTop: '1.25rem' }}>
        <h2>Referral Breakdown</h2>
        <div className="table-wrap" style={{ marginTop: '1rem' }}>
          <table>
            <thead>
              <tr>
                <th>Users with Referrals</th>
                <th>Users without Referrals</th>
                <th>Users Who Were Referred</th>
                <th>Users Who Joined Alone</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <Link to="/admin/users?referral=has_referrals" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                    {stats?.usersWithReferrals ?? '—'}
                  </Link>
                </td>
                <td>
                  <Link to="/admin/users?referral=no_referrals" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                    {stats?.usersWithoutReferrals ?? '—'}
                  </Link>
                </td>
                <td>
                  <Link to="/admin/users?referral=was_referred" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                    {stats?.usersWhoWereReferred ?? '—'}
                  </Link>
                </td>
                <td>
                  <Link to="/admin/users?referral=not_referred" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                    {stats?.usersWhoJoinedAlone ?? '—'}
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ marginTop: '1rem' }}>
          Click on a number to filter users by their referral status.
        </p>
      </div>

      <div className="card">
        <h2>Payments by status</h2>
        <div className="table-wrap" style={{ marginTop: '1rem' }}>
          <table>
            <thead>
              <tr>
                <th>Pending</th>
                <th>Approved</th>
                <th>Rejected</th>
                <th>Suspicious</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{stats?.paymentsByStatus?.pending ?? '—'}</td>
                <td>
                  {stats?.paymentsByStatus?.approved ?? '—'}
                  <div style={{ fontSize: '0.8rem', color: 'var(--success)', marginTop: '0.25rem' }}>
                    ₹{stats?.totalApprovedAmount?.toFixed(2) ?? '0.00'}
                  </div>
                </td>
                <td>{stats?.paymentsByStatus?.rejected ?? '—'}</td>
                <td>{stats?.paymentsByStatus?.suspicious ?? '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ marginTop: '1rem' }}>
          <Link to="/payment">Public payment page</Link>
        </p>
      </div>
    </div>
  );
}
