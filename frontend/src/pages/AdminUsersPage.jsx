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

  const q = (searchParams.get('q') || '').trim();

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    return sp.toString();
  }, [q]);

  const load = useCallback(async () => {
    setError('');
    try {
      const { data } = await adminApi.get(`/admin/users${queryString ? `?${queryString}` : ''}`);
      setUsers(data.users || []);
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

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h2>Search</h2>
        <div className="copy-row" style={{ marginTop: '0.75rem' }}>
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

