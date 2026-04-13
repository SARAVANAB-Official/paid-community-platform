// Admin controller - mimics backend adminController.js
import jwt from '../utils/jwt.js';
import { Admin, User, Payment, simpleHash, simpleCompare } from '../db';
import { doc, updateDoc } from 'firebase/firestore';
import { getDb } from '../firebase/config.js';

const ADMIN_JWT_SECRET = import.meta.env.VITE_ADMIN_JWT_SECRET || import.meta.env.VITE_JWT_SECRET || 'frontend-dev-secret-change-in-production';

function signAdminToken(admin) {
  const expiresInMs = 7 * 24 * 60 * 60 * 1000; // 7 days
  const payload = {
    sub: admin._id,
    email: admin.email,
    role: 'admin',
    exp: Math.floor((Date.now() + expiresInMs) / 1000),
  };
  return jwt.sign(payload, ADMIN_JWT_SECRET);
}

export async function adminLogin(req) {
  const { email, password } = req.body;
  
  const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
  if (!admin) {
    throw { status: 401, message: 'Invalid credentials' };
  }
  
  const ok = await simpleCompare(password, admin.password);
  if (!ok) {
    throw { status: 401, message: 'Invalid credentials' };
  }
  
  const token = signAdminToken(admin);
  
  return {
    status: 200,
    data: {
      token,
      admin: { id: admin._id, email: admin.email },
    },
  };
}

export async function listUsers(req) {
  const q = String(req.query?.q || '').trim().toLowerCase();
  
  let users;
  if (q) {
    users = await User.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ],
    });
  } else {
    users = await User.find({});
  }
  
  // Sort by createdAt descending
  users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  // Select only safe fields
  const safeUsers = users.map(u => ({
    _id: u._id,
    name: u.name,
    email: u.email,
    referralCode: u.referralCode,
    referredBy: u.referredBy,
    referralsCount: u.referralsCount,
    paymentApproved: u.paymentApproved,
    createdAt: u.createdAt,
  }));

  return {
    status: 200,
    data: { users: safeUsers, total: safeUsers.length },
  };
}

export async function deleteUser(req) {
  const { id } = req.params;
  
  const user = await User.findById(id);
  if (!user) {
    throw { status: 404, message: 'User not found' };
  }
  
  // Adjust referrer's count
  if (user.referredBy) {
    await User.updateOne(
      { referralCode: user.referredBy, referralsCount: { $gt: 0 } },
      { $inc: { referralsCount: -1 } }
    );
  }
  
  await User.findByIdAndDelete(id);
  
  return {
    status: 200,
    data: { message: 'User deleted' },
  };
}

export async function dashboardStats() {
  const totalUsers = await User.countDocuments();
  const totalPayments = await Payment.countDocuments();
  const pending = await Payment.countDocuments({ status: 'pending' });
  const approved = await Payment.countDocuments({ status: 'approved' });
  const rejected = await Payment.countDocuments({ status: 'rejected' });
  const suspicious = await Payment.countDocuments({ status: 'suspicious' });

  // Calculate total referrals
  const allUsers = await User.find({});
  const referralsSum = allUsers.reduce((sum, u) => sum + u.referralsCount, 0);

  // Calculate total approved payment amount
  const approvedPayments = await Payment.find({ status: 'approved' });
  const totalApprovedAmount = approvedPayments.reduce((sum, p) => sum + p.amount, 0);

  // ===== NEW: Calculate referral breakdown statistics =====
  const usersWithReferrals = allUsers.filter(u => u.referralsCount > 0).length;
  const usersWithoutReferrals = allUsers.filter(u => u.referralsCount === 0).length;
  const usersWhoWereReferred = allUsers.filter(u => u.referredBy !== null).length;
  const usersWhoJoinedAlone = allUsers.filter(u => u.referredBy === null).length;

  return {
    status: 200,
    data: {
      totalUsers,
      totalPayments,
      paymentsByStatus: { pending, approved, rejected, suspicious },
      totalReferrals: referralsSum,
      totalApprovedAmount,
      // ===== NEW: Referral breakdown stats =====
      usersWithReferrals,
      usersWithoutReferrals,
      usersWhoWereReferred,
      usersWhoJoinedAlone,
    },
  };
}

export async function listPayments(req) {
  const q = String(req.query?.q || '').trim();
  const status = String(req.query?.status || '').trim();
  
  let payments = await Payment.find({});
  
  // Filter by status
  if (status && ['pending', 'approved', 'rejected', 'suspicious'].includes(status)) {
    payments = payments.filter(p => p.status === status);
  }
  
  // Filter by search query
  if (q) {
    const lowerQ = q.toLowerCase();
    payments = payments.filter(p =>
      p.name.toLowerCase().includes(lowerQ) ||
      p.email.toLowerCase().includes(lowerQ) ||
      p.phoneNumber.includes(q) ||
      p.paymentId.includes(q)
    );
  }
  
  // Sort by createdAt descending
  payments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return {
    status: 200,
    data: { payments },
  };
}

export async function verifyPayment(req) {
  const { id } = req.params;
  const { action } = req.body;

  if (!['approved', 'rejected', 'suspicious', 'pending'].includes(action)) {
    throw { status: 400, message: 'action must be approved, rejected, suspicious, or pending' };
  }

  const payment = await Payment.findById(id);
  if (!payment) {
    throw { status: 404, message: 'Payment not found' };
  }

  // Update payment status using Firestore
  const db = await getDb();
  const paymentRef = doc(db, 'payments', id);
  await updateDoc(paymentRef, { status: action });

  const updatedPayment = { ...payment, status: action };

  // If approved, update user's paymentApproved flag
  if (action === 'approved') {
    await User.updateOne({ email: updatedPayment.email }, { $set: { paymentApproved: true } });
  }

  return {
    status: 200,
    data: { message: `Payment marked ${action}`, payment: updatedPayment },
  };
}

// ===== NEW: Referral Tree Controller =====
// Returns complete referral hierarchy with who referred whom
export async function referralTree(req) {
  const allUsers = await User.find({});
  
  // Build a map of referral code -> user for quick lookups
  const userByCode = {};
  allUsers.forEach(u => {
    userByCode[u.referralCode] = u;
  });

  // Build tree structure
  const tree = allUsers.map(user => {
    // Find who referred this user
    const referrer = user.referredBy ? userByCode[user.referredBy] : null;
    
    // Find all users this user has referred
    const referredUsers = allUsers.filter(u => u.referredBy === user.referralCode);

    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      referralCode: user.referralCode,
      referredBy: user.referredBy,
      referrerName: referrer?.name || null,
      referrerEmail: referrer?.email || null,
      referralsCount: user.referralsCount,
      referredUsers: referredUsers.map(u => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        referralCode: u.referralCode,
        createdAt: u.createdAt,
      })),
      createdAt: user.createdAt,
      paymentApproved: user.paymentApproved,
    };
  });

  // Sort by referrals count (most referrers first)
  tree.sort((a, b) => b.referralsCount - a.referralsCount);

  return {
    status: 200,
    data: { tree, total: tree.length },
  };
}

// ===== NEW: Get referrals for a specific user =====
export async function getUserReferrals(req) {
  const { id } = req.params;
  
  const user = await User.findById(id);
  if (!user) {
    throw { status: 404, message: 'User not found' };
  }

  // Find all users referred by this user
  const allUsers = await User.find({});
  const referredUsers = allUsers
    .filter(u => u.referredBy === user.referralCode)
    .map(u => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      referralCode: u.referralCode,
      createdAt: u.createdAt,
      paymentApproved: u.paymentApproved,
    }));

  return {
    status: 200,
    data: {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        referralCode: user.referralCode,
        referralsCount: user.referralsCount,
      },
      referredUsers,
      total: referredUsers.length,
    },
  };
}

// ===== NEW: Filter users by referral status =====
export async function filterUsersByReferral(req) {
  const { filter } = req.query; // 'has_referrals', 'no_referrals', 'referred', 'not_referred'
  
  const allUsers = await User.find({});
  let filteredUsers;

  switch (filter) {
    case 'has_referrals':
      filteredUsers = allUsers.filter(u => u.referralsCount > 0);
      break;
    case 'no_referrals':
      filteredUsers = allUsers.filter(u => u.referralsCount === 0);
      break;
    case 'referred':
      filteredUsers = allUsers.filter(u => u.referredBy !== null);
      break;
    case 'not_referred':
      filteredUsers = allUsers.filter(u => u.referredBy === null);
      break;
    default:
      filteredUsers = allUsers;
  }

  // Sort by createdAt descending
  filteredUsers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const safeUsers = filteredUsers.map(u => ({
    _id: u._id,
    name: u.name,
    email: u.email,
    referralCode: u.referralCode,
    referredBy: u.referredBy,
    referralsCount: u.referralsCount,
    paymentApproved: u.paymentApproved,
    createdAt: u.createdAt,
  }));

  return {
    status: 200,
    data: { users: safeUsers, total: safeUsers.length, filter },
  };
}
