import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { userApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

// ===== NEW: Modern User Dashboard Page =====
// This is a completely separate dashboard for users after sign-in

export default function UserDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copyMsg, setCopyMsg] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // overview, referrals, share

  // Load dashboard data on mount
  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
      const { data } = await userApi.get('/auth/me');
      setDashboardData(data);
    } catch (err) {
      // If unauthorized, redirect to login
      if (err.response?.status === 401) {
        logout();
        navigate('/login', { replace: true });
        return;
      }
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const refLink = user ? `${origin}/register?ref=${encodeURIComponent(user.referralCode)}` : '';
  const firstName = user?.name?.split(' ')[0] || 'User';

  // Copy referral code to clipboard
  async function copyReferralCode() {
    if (!user?.referralCode) return;
    try {
      await navigator.clipboard.writeText(user.referralCode);
      setCopyMsg('Code copied!');
      setTimeout(() => setCopyMsg(''), 2000);
    } catch {
      setCopyMsg('Copy failed');
    }
  }

  // Copy referral link to clipboard
  async function copyReferralLink() {
    if (!refLink) return;
    try {
      await navigator.clipboard.writeText(refLink);
      setCopyMsg('Link copied!');
      setTimeout(() => setCopyMsg(''), 2000);
    } catch {
      setCopyMsg('Copy failed');
    }
  }

  // Share via WhatsApp
  function shareViaWhatsApp() {
    const message = encodeURIComponent(
      `🎉 Join JTSB NATURAL LIVE!\n\n` +
      `Use my referral code: *${user?.referralCode}*\n\n` +
      `Or sign up using this link:\n${refLink}\n\n` +
      `Looking forward to having you there!`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  }

  // Show loading state
  if (loading) {
    return (
      <div className="app-shell">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '60vh',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div style={{ 
            width: '50px', 
            height: '50px', 
            border: '4px solid rgba(91, 140, 255, 0.2)',
            borderTop: '4px solid var(--primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p className="muted">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* ===== Top Navigation Bar ===== */}
      <div className="topbar" style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 2rem',
        background: 'linear-gradient(135deg, var(--primary), #5b8cff)',
        borderRadius: '0 0 16px 16px',
        boxShadow: '0 4px 20px rgba(91, 140, 255, 0.3)'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'white' }}>
            Welcome back, {firstName}! 👋
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
            {user?.email}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            type="button" 
            onClick={loadDashboard}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            🔄 Refresh
          </button>
          <button 
            type="button" 
            onClick={logout}
            style={{
              background: 'rgba(255,71,87,0.8)',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            🚪 Logout
          </button>
        </div>
      </div>

      {/* ===== Main Content ===== */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
        
        {/* Stats Cards */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          {/* Total Members Card */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '1.5rem',
            borderRadius: '16px',
            color: 'white',
            boxShadow: '0 8px 20px rgba(102, 126, 234, 0.3)'
          }}>
            <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '0.5rem' }}>
              👥 Total Members
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
              {dashboardData?.platformStats?.totalUsers ?? '—'}
            </div>
          </div>

          {/* Your Referrals Card */}
          <div style={{
            background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
            padding: '1.5rem',
            borderRadius: '16px',
            color: 'white',
            boxShadow: '0 8px 20px rgba(17, 153, 142, 0.3)'
          }}>
            <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '0.5rem' }}>
              🎯 Your Referrals
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
              {user?.referralsCount ?? 0}
            </div>
          </div>

          {/* Payment Status Card */}
          <div style={{
            background: user?.paymentApproved 
              ? 'linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)'
              : 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)',
            padding: '1.5rem',
            borderRadius: '16px',
            color: 'white',
            boxShadow: '0 8px 20px rgba(86, 171, 47, 0.3)'
          }}>
            <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '0.5rem' }}>
              💳 Payment Status
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
              {user?.paymentApproved ? '✅ Approved' : '⏳ Pending'}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ 
          display: 'flex', 
          gap: '0.5rem', 
          marginBottom: '1.5rem',
          background: 'var(--card)',
          padding: '0.5rem',
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              flex: 1,
              padding: '0.75rem 1.5rem',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem',
              transition: 'all 0.2s',
              background: activeTab === 'overview' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'overview' ? 'white' : 'var(--text)'
            }}
          >
            📊 Overview
          </button>
          <button
            onClick={() => setActiveTab('referrals')}
            style={{
              flex: 1,
              padding: '0.75rem 1.5rem',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem',
              transition: 'all 0.2s',
              background: activeTab === 'referrals' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'referrals' ? 'white' : 'var(--text)'
            }}
          >
            🎁 Referrals
          </button>
          <button
            onClick={() => setActiveTab('share')}
            style={{
              flex: 1,
              padding: '0.75rem 1.5rem',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem',
              transition: 'all 0.2s',
              background: activeTab === 'share' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'share' ? 'white' : 'var(--text)'
            }}
          >
            📢 Share
          </button>
        </div>

        {/* Tab Content */}
        <div style={{
          background: 'var(--card)',
          padding: '2rem',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div>
              <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>📊 Account Overview</h2>
              
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1.5rem'
              }}>
                {/* Profile Info */}
                <div style={{ 
                  padding: '1.5rem', 
                  background: 'rgba(91, 140, 255, 0.1)',
                  borderRadius: '12px'
                }}>
                  <h3 style={{ marginTop: 0 }}>👤 Profile Information</h3>
                  <div style={{ marginTop: '1rem' }}>
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>
                        Full Name
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                        {user?.name}
                      </div>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>
                        Email
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                        {user?.email}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>
                        Member Since
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                        {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Referral Summary */}
                <div style={{ 
                  padding: '1.5rem', 
                  background: 'rgba(56, 239, 125, 0.1)',
                  borderRadius: '12px'
                }}>
                  <h3 style={{ marginTop: 0 }}>🎯 Referral Summary</h3>
                  <div style={{ marginTop: '1rem' }}>
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>
                        Your Referral Code
                      </div>
                      <div style={{ 
                        fontSize: '1.5rem', 
                        fontWeight: 'bold',
                        fontFamily: 'monospace',
                        letterSpacing: '2px',
                        color: 'var(--primary)'
                      }}>
                        {user?.referralCode}
                      </div>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>
                        Successful Referrals
                      </div>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>
                        {user?.referralsCount ?? 0}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>
                        Referred By
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                        {user?.referredBy ? (
                          <>
                            Code: {user.referredBy}
                            {dashboardData?.referredByName && (
                              <span style={{ color: 'var(--muted)' }}> ({dashboardData.referredByName})</span>
                            )}
                          </>
                        ) : (
                          <span style={{ color: 'var(--muted)' }}>Joined directly</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Referrals Tab */}
          {activeTab === 'referrals' && (
            <div>
              <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>🎁 Your Referral Code & Link</h2>
              
              {/* Referral Code Box */}
              <div style={{
                padding: '2rem',
                background: 'linear-gradient(135deg, rgba(91, 140, 255, 0.1), rgba(56, 239, 125, 0.1))',
                borderRadius: '16px',
                textAlign: 'center',
                marginBottom: '2rem'
              }}>
                <div style={{ fontSize: '1.2rem', marginBottom: '1rem', fontWeight: 'bold' }}>
                  Your Unique Referral Code
                </div>
                <div style={{
                  fontSize: '3rem',
                  fontWeight: 'bold',
                  fontFamily: 'monospace',
                  letterSpacing: '4px',
                  color: 'var(--primary)',
                  background: 'white',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  display: 'inline-block',
                  marginBottom: '1.5rem',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                }}>
                  {user?.referralCode}
                </div>
                <div>
                  <button 
                    onClick={copyReferralCode}
                    style={{
                      background: 'var(--primary)',
                      color: 'white',
                      border: 'none',
                      padding: '0.75rem 2rem',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    📋 Copy Code
                  </button>
                </div>
                {copyMsg && (
                  <p style={{ marginTop: '1rem', color: 'var(--success)', fontWeight: 'bold' }}>
                    {copyMsg}
                  </p>
                )}
              </div>

              {/* Referral Link Box */}
              <div style={{
                padding: '1.5rem',
                background: 'var(--bg)',
                borderRadius: '12px',
                marginBottom: '1.5rem'
              }}>
                <div style={{ fontSize: '1rem', marginBottom: '0.75rem', fontWeight: 'bold' }}>
                  🔗 Your Referral Link
                </div>
                <div style={{
                  padding: '1rem',
                  background: 'white',
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  marginBottom: '1rem',
                  wordBreak: 'break-all',
                  border: '1px solid rgba(0,0,0,0.1)'
                }}>
                  {refLink}
                </div>
                <button 
                  onClick={copyReferralLink}
                  style={{
                    background: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 2rem',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  📋 Copy Link
                </button>
              </div>

              {/* How It Works */}
              <div style={{
                padding: '1.5rem',
                background: 'rgba(255, 193, 7, 0.1)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 193, 7, 0.3)'
              }}>
                <h3 style={{ marginTop: 0 }}>💡 How Referrals Work</h3>
                <ol style={{ lineHeight: 2, paddingLeft: '1.5rem' }}>
                  <li>Share your referral code or link with friends</li>
                  <li>They sign up using your code/link</li>
                  <li>They complete the payment process</li>
                  <li>Your referral count increases automatically</li>
                  <li>The more you share, the more you grow JTSB NATURAL LIVE!</li>
                </ol>
              </div>
            </div>
          )}

          {/* Share Tab */}
          {activeTab === 'share' && (
            <div>
              <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>📢 Share With Friends</h2>
              
              <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>
                Help grow JTSB NATURAL LIVE by sharing your referral code with friends and family.
              </p>

              {/* Share Buttons */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem'
              }}>
                {/* WhatsApp */}
                <button 
                  onClick={shareViaWhatsApp}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    padding: '1.5rem',
                    background: '#25D366',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(37, 211, 102, 0.3)',
                    transition: 'transform 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                  onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                >
                  <span style={{ fontSize: '1.5rem' }}>💬</span>
                  WhatsApp
                </button>

                {/* Telegram */}
                <button 
                  onClick={() => {
                    const text = encodeURIComponent(
                      `🎉 Join JTSB NATURAL LIVE! Use my referral code: ${user?.referralCode}\n\nSign up here: ${refLink}`
                    );
                    window.open(`https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${text}`, '_blank');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    padding: '1.5rem',
                    background: '#0088cc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(0, 136, 204, 0.3)',
                    transition: 'transform 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                  onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                >
                  <span style={{ fontSize: '1.5rem' }}>✈️</span>
                  Telegram
                </button>

                {/* Email */}
                <button 
                  onClick={() => {
                    const subject = encodeURIComponent('Join JTSB NATURAL LIVE! 🎉');
                    const body = encodeURIComponent(
                      `Hi!\n\n` +
                      `I'd like to invite you to join JTSB NATURAL LIVE.\n\n` +
                      `Use my referral code: ${user?.referralCode}\n\n` +
                      `Or sign up using this link:\n${refLink}\n\n` +
                      `Looking forward to seeing you there!\n\n` +
                      `Best regards,\n${user?.name}`
                    );
                    window.location.href = `mailto:?subject=${subject}&body=${body}`;
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    padding: '1.5rem',
                    background: '#EA4335',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(234, 67, 53, 0.3)',
                    transition: 'transform 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                  onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                >
                  <span style={{ fontSize: '1.5rem' }}>📧</span>
                  Email
                </button>
              </div>

              {/* Quick Tip */}
              <div style={{
                padding: '1.5rem',
                background: 'rgba(91, 140, 255, 0.1)',
                borderRadius: '12px',
                border: '1px solid rgba(91, 140, 255, 0.2)'
              }}>
                <h3 style={{ marginTop: 0 }}>💡 Quick Tip</h3>
                <p style={{ marginBottom: 0, lineHeight: 1.6 }}>
                  Share your referral code on social media, in group chats, or directly with friends.
                  Every successful referral helps grow JTSB NATURAL LIVE and brings us closer together!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ 
          marginTop: '2rem', 
          textAlign: 'center',
          padding: '1rem',
          color: 'var(--muted)',
          fontSize: '0.9rem'
        }}>
          <Link to="/payment" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
            Payment Page
          </Link>
          {' • '}
          <span>© 2026 JTSB NATURAL LIVE</span>
        </div>
      </div>
    </div>
  );
}
