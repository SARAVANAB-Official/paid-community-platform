import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { publicApi } from '../api/client.js';

function statusBadge(status) {
  if (status === 'approved') return <span className="badge badge-paid">approved</span>;
  if (status === 'pending') return <span className="badge badge-pending">pending</span>;
  if (status === 'suspicious') return <span className="badge badge-rejected">suspicious</span>;
  return <span className="badge badge-rejected">rejected</span>;
}

export default function PaymentPendingPage() {
  const [searchParams] = useSearchParams();
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const rawPaymentId = (searchParams.get('utr') || '').trim();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!rawPaymentId) {
        setError('Missing payment ID. Open this page as /payment/pending?utr=YOUR_ID');
        setLoading(false);
        return;
      }
      setError('');
      setLoading(true);
      try {
        const { data } = await publicApi.get(`/payments/status?utr=${encodeURIComponent(rawPaymentId)}`);
        if (!cancelled) setPayment(data.payment);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Could not load payment status');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [rawPaymentId]);

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand">Payment status</div>
        <div>
          <Link to="/payment">Payment</Link>
          {' · '}
          <Link to="/login">Login</Link>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 560, margin: '0 auto' }}>
        <h1>Verification</h1>
        <p className="muted">
          UPI Reference: <code>{rawPaymentId || '—'}</code>
        </p>

        {loading && <div className="muted">Loading…</div>}
        {error && <div className="alert alert-error">{error}</div>}

        {payment && (
          <>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                Status: <strong>{statusBadge(payment.status)}</strong>
              </div>
              <div className="muted">Amount: ₹{payment.amount}</div>
              <div className="muted">Phone: {payment.phoneNumber || '—'}</div>
            </div>

            {payment.status === 'approved' ? (
              <div className="alert alert-success" style={{ marginTop: '1rem' }}>
                Approved. You can now{' '}
                <Link to={`/register`}>register</Link> using the same email + UTR.
              </div>
            ) : payment.status === 'pending' ? (
              <div className="alert" style={{ marginTop: '1rem' }}>
                Pending admin verification. Please check back later.
              </div>
            ) : payment.status === 'suspicious' ? (
              <div className="alert alert-error" style={{ marginTop: '1rem' }}>
                Flagged for additional review. Please contact admin/support.
              </div>
            ) : (
              <div className="alert alert-error" style={{ marginTop: '1rem' }}>
                Rejected. Please contact admin/support.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

