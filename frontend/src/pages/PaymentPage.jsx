import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { publicApi } from '../api/client.js';

export default function PaymentPage() {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [utr, setUtr] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotError, setScreenshotError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
  const UPI_REF_REGEX = /^[0-9]{10,20}$/;

  useEffect(() => {
    publicApi
      .get('/payments/config')
      .then((res) => setConfig(res.data))
      .catch((err) => {
        const isNetworkError = !err.response;
        setError(
          isNetworkError
            ? 'Cannot connect to the payment server. Please make sure the backend is running (npm start in the backend folder).'
            : err.response?.data?.message || 'Could not load payment configuration'
        );
      });
  }, []);

  function validateForm() {
    if (!fullName.trim() || fullName.trim().length < 2) {
      setError('Full name must be at least 2 characters');
      return false;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!phoneNumber || !/^[6-9]\d{9}$/.test(phoneNumber)) {
      setError('Please enter a valid 10-digit Indian mobile number');
      return false;
    }
    if (!utr.trim() || !UPI_REF_REGEX.test(utr.trim())) {
      setError('Enter a valid UPI Reference Number (10-20 digits)');
      return false;
    }
    if (!screenshot) {
      setError('Payment screenshot is required');
      return false;
    }
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setScreenshotError('');
    setSuccess('');

    if (!validateForm()) return;

    setLoading(true);
    setSubmitted(true);
    try {
      const normalizedPaymentId = utr.trim();

      const form = new FormData();
      form.append('fullName', fullName.trim());
      form.append('email', email.trim().toLowerCase());
      form.append('phoneNumber', phoneNumber.trim());
      form.append('utr', normalizedPaymentId);
      form.append('screenshot', screenshot);

      await publicApi.post('/payments/submit', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess('Payment submitted. You can track status on the next page.');
      navigate(`/payment/pending?utr=${encodeURIComponent(normalizedPaymentId)}`);
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors && Array.isArray(data.errors)) {
        const firstError = data.errors[0]?.msg || data.message;
        setError(firstError);
      } else {
        setError(data?.message || 'Submission failed. Please try again.');
      }
      setSubmitted(false);
    } finally {
      setLoading(false);
    }
  }

  function copyUpiId() {
    if (config?.upiVpa) {
      navigator.clipboard.writeText(config.upiVpa);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand">Paid Community</div>
        <div>
          <Link to="/login">Member login</Link>
          {' · '}
          <Link to="/admin">Admin</Link>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
        <div className="payment-header">
          <h1>Complete Payment to Join</h1>
          <p className="muted">
            One-time payment of ₹{config?.amount || '0'} for lifetime access
          </p>
        </div>

        <div className="payment-steps">
          <h3>How to Pay:</h3>
          <div className="step-item">
            <div className="step-number">1</div>
            <div className="step-text">
              <strong>Scan the QR code</strong> below with any UPI app (PhonePe, GPay, Paytm, etc.)
            </div>
          </div>
          <div className="step-item">
            <div className="step-number">2</div>
            <div className="step-text">
              <strong>Pay ₹{config?.amount || '0'}</strong> and save the transaction screenshot
            </div>
          </div>
          <div className="step-item">
            <div className="step-number">3</div>
            <div className="step-text">
              <strong>Copy the UPI Reference Number</strong> from your payment confirmation screen
            </div>
          </div>
          <div className="step-item">
            <div className="step-number">4</div>
            <div className="step-text">
              <strong>Fill the form</strong> below with your details and submit
            </div>
          </div>
        </div>

        {config && (
          <>
            <div className="qr-container">
              <div className="qr-box">
                <img src={config.qrDataUrl} alt="UPI QR Code" />
              </div>
              <div className="qr-label">📱 Scan with any UPI app</div>
            </div>

            <div className="amount-display">
              <div className="amount">₹{config.amount}</div>
              <div className="label">Payment Amount</div>
            </div>

            <div className="upi-id-box">
              <div className="label">UPI ID / VPA</div>
              <div className="value">
                <code>{config.upiVpa}</code>
                <button type="button" className={`copy-btn ${copied ? 'copied' : ''}`} onClick={copyUpiId}>
                  {copied ? '✓ Copied!' : '📋 Copy'}
                </button>
              </div>
            </div>
          </>
        )}

        <div className="divider">
          <span>📝 Submit Payment Details</span>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Full Name *</label>
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
            />
          </div>

          <div className="field">
            <label>Email Address *</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              autoComplete="email"
            />
          </div>

          <div className="field">
            <label>Phone Number *</label>
            <input
              required
              inputMode="numeric"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit mobile number"
              autoComplete="tel"
            />
            <div className="hint">Example: 9876543210</div>
          </div>

          <div className="field">
            <label>UPI Reference Number *</label>
            <input
              required
              value={utr}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setUtr(val.slice(0, 20));
              }}
              inputMode="numeric"
              placeholder="e.g. 1234567890123"
            />
            <div className="hint">
              💡 This is the <strong>UPI Reference Number</strong> (10-20 digits) shown in your payment app after completing the payment
            </div>
          </div>

          <div className="field">
            <label>Payment Screenshot *</label>
            <input
              required
              type="file"
              accept="image/png,image/jpeg"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) {
                  setScreenshot(null);
                  return;
                }
                if (!['image/jpeg', 'image/png'].includes(file.type)) {
                  setScreenshotError('Only JPG and PNG files are allowed');
                  setScreenshot(null);
                  e.target.value = '';
                  return;
                }
                if (file.size > MAX_FILE_SIZE) {
                  setScreenshotError('File size must be 2MB or less');
                  setScreenshot(null);
                  e.target.value = '';
                  return;
                }
                setScreenshotError('');
                setScreenshot(file);
              }}
            />
            {screenshotError && <div className="alert alert-error" style={{ marginTop: '0.5rem', padding: '0.4rem 0.75rem' }}>{screenshotError}</div>}
            <div className="hint">Upload a screenshot of the successful payment (JPG/PNG, max 2MB)</div>
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading || !config} style={{ width: '100%', padding: '0.85rem', fontSize: '1.05rem' }}>
            {loading ? 'Submitting...' : 'Submit Payment Details →'}
          </button>
        </form>

        <p className="muted" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          After approval, you can <Link to="/register">register</Link> using the same email + UTR.
        </p>
      </div>
    </div>
  );
}
