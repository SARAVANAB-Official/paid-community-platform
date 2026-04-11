import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { adminApi, attachAdminToken } from '../api/client.js';

const ADMIN_TOKEN_KEY = 'pc_admin_token';

function badgeClass(status) {
  if (status === 'approved') return 'badge badge-paid';
  if (status === 'pending') return 'badge badge-pending';
  return 'badge badge-rejected';
}

export default function AdminPaymentsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [payments, setPayments] = useState([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const q = (searchParams.get('q') || '').trim();
  const status = (searchParams.get('status') || '').trim();

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (status) sp.set('status', status);
    return sp.toString();
  }, [q, status]);

  const load = useCallback(async () => {
    setError('');
    try {
      const { data } = await adminApi.get(`/admin/payments${queryString ? `?${queryString}` : ''}`);
      setPayments(data.payments || []);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        attachAdminToken(adminApi, null);
        navigate('/admin', { replace: true });
        return;
      }
      setError(err.response?.data?.message || 'Could not load payments');
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

  async function updatePayment(id, action) {
    setBusyId(id);
    setError('');
    try {
      await adminApi.patch(`/admin/payments/${id}/verify`, { action });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand">Payments</div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link className="btn btn-ghost" to="/admin/dashboard">
            Dashboard
          </Link>
          <Link className="btn btn-ghost" to="/admin/users">
            Users
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
            placeholder="Search name / email / UTR"
          />
          <select
            value={status}
            onChange={(e) => {
              const next = new URLSearchParams(searchParams);
              const val = e.target.value;
              if (val) next.set('status', val);
              else next.delete('status');
              setSearchParams(next, { replace: true });
            }}
            style={{ maxWidth: 220 }}
          >
            <option value="">All statuses</option>
            <option value="pending">pending</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
            <option value="suspicious">suspicious</option>
          </select>
        </div>
        <p className="muted" style={{ marginTop: '0.5rem' }}>
          Tip: approving a payment allows the user to register and access the dashboard.
        </p>
      </div>

      <div className="card">
        <h2>All payments ({payments.length})</h2>
        <div className="table-wrap" style={{ marginTop: '1rem' }}>
          <table>
            <thead>
              <tr>
                <th>Created</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>UPI Reference</th>
                <th>Status</th>
                <th>Screenshot</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p._id}>
                  <td className="muted" style={{ fontSize: '0.85rem' }}>
                    {p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'}
                  </td>
                  <td>{p.name}</td>
                  <td>{p.email}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{p.phoneNumber || '—'}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{p.paymentId || p.utr || '—'}</td>
                  <td>
                    <span className={badgeClass(p.status)}>{p.status}</span>
                  </td>
                  <td>
                    <a href={p.screenshot} target="_blank" rel="noreferrer">
                      view
                    </a>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.85rem' }}
                        disabled={busyId === p._id}
                        onClick={() => updatePayment(p._id, 'approved')}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.85rem' }}
                        disabled={busyId === p._id}
                        onClick={() => updatePayment(p._id, 'rejected')}
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.85rem' }}
                        disabled={busyId === p._id}
                        onClick={() => updatePayment(p._id, 'suspicious')}
                      >
                        Suspicious
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={8} className="muted">
                    No payments found.
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

