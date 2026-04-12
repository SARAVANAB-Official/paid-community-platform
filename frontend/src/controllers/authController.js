import jwt from '../utils/jwt.js';
import { User, Payment, generateReferralCode, simpleHash, simpleCompare } from '../db';

const JWT_SECRET = import.meta.env.VITE_JWT_SECRET || 'jtsb-secret-key-2026';
const TOKEN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function makeToken(user) {
  return jwt.sign({
    sub: user._id,
    email: user.email,
    exp: Math.floor((Date.now() + TOKEN_MS) / 1000),
  }, JWT_SECRET);
}

function safeUser(u) {
  const { password, ...rest } = u;
  return rest;
}

// ===== REGISTER =====
export async function register(req) {
  const { name, email, password, referralCode, utr } = req.body;
  const em = String(email || '').trim().toLowerCase();
  const utrVal = String(utr || '').trim();

  // Check payment
  const payment = await Payment.findOne({ email: em, paymentId: utrVal });
  if (!payment) {
    throw { status: 400, message: 'No approved payment found for this email + payment ID' };
  }
  if (payment.status !== 'approved') {
    let msg = 'Payment was rejected.';
    if (payment.status === 'pending') msg = 'Payment is pending admin verification.';
    else if (payment.status === 'suspicious') msg = 'Payment is under review.';
    throw { status: 403, message: msg };
  }

  // Check existing
  const existing = await User.findOne({ email: em });
  if (existing) throw { status: 409, message: 'An account with this email already exists' };

  // Validate referral
  let referredBy = null;
  if (referralCode && referralCode.trim()) {
    const rc = referralCode.trim().toUpperCase();
    const referrer = await User.findOne({ referralCode: rc });
    if (!referrer) throw { status: 400, message: 'Invalid referral code' };
    referredBy = rc;
  }

  // Generate unique code
  let code;
  for (let i = 0; i < 10; i++) {
    code = generateReferralCode();
    const clash = await User.findOne({ referralCode: code });
    if (!clash) break;
  }

  // Create
  const hash = await simpleHash(password);
  const user = await User.create({
    name: name.trim(),
    email: em,
    password: hash,
    referralCode: code,
    referredBy,
    referralsCount: 0,
    paymentApproved: true,
  });

  if (referredBy) {
    await User.updateOne({ referralCode: referredBy }, { $inc: { referralsCount: 1 } });
  }

  return { status: 201, data: { message: 'Registration successful', token: makeToken(user), user: safeUser(user) } };
}

// ===== LOGIN =====
export async function login(req) {
  const { email, password } = req.body;
  const em = String(email || '').trim().toLowerCase();

  const user = await User.findOne({ email: em });
  if (!user) throw { status: 401, message: 'Invalid email or password' };

  const ok = await simpleCompare(password, user.password);
  if (!ok) throw { status: 401, message: 'Invalid email or password' };

  if (!user.paymentApproved) {
    throw { status: 403, message: 'Payment not approved' };
  }

  return { status: 200, data: { token: makeToken(user), user: safeUser(user) } };
}

// ===== ME =====
export async function me(req, user) {
  if (!user) throw { status: 401, message: 'Not authenticated' };
  if (!user.paymentApproved) throw { status: 403, message: 'Payment not approved' };

  const totalUsers = await User.countDocuments();
  let referredByName = null;
  if (user.referredBy) {
    const r = await User.findOne({ referralCode: user.referredBy });
    referredByName = r?.name || null;
  }

  return { status: 200, data: { user, platformStats: { totalUsers }, referredByName } };
}
