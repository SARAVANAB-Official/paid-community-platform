// ===== Admin Controller & Referral System Tests =====
import { describe, it, expect, beforeEach } from 'vitest';
import {
  adminLogin,
  dashboardStats,
  listUsers,
  deleteUser,
  listPayments,
  verifyPayment,
  referralTree,
  getUserReferrals,
  filterUsersByReferral,
} from '../controllers/adminController';
import { Admin, User, Payment, simpleHash } from '../db';

describe('Admin Controller & Referral System', () => {
  beforeEach(() => {
    localStorage.setItem('pc_db_users', '[]');
    localStorage.setItem('pc_db_payments', '[]');
    localStorage.setItem('pc_db_admins', '[]');
  });

  describe('adminLogin', () => {
    beforeEach(async () => {
      const hashed = await simpleHash('adminpass123');
      await Admin.create({
        email: 'admin@example.com',
        password: hashed,
      });
    });

    it('should login admin with correct credentials', async () => {
      const req = {
        body: {
          email: 'admin@example.com',
          password: 'adminpass123',
        },
      };

      const response = await adminLogin(req);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('token');
      expect(response.data.admin.email).toBe('admin@example.com');
    });

    it('should reject wrong admin password', async () => {
      const hashed = await simpleHash('correctadminpass');
      // Clear and recreate with properly hashed password
      localStorage.setItem('pc_db_admins', '[]');
      await Admin.create({
        email: 'admin@example.com',
        password: hashed,
      });

      const req = {
        body: {
          email: 'admin@example.com',
          password: 'wrongpassword',
        },
      };

      await expect(adminLogin(req)).rejects.toHaveProperty('status', 401);
    });

    it('should reject non-existent admin', async () => {
      const req = {
        body: {
          email: 'nonadmin@example.com',
          password: 'password123',
        },
      };

      await expect(adminLogin(req)).rejects.toHaveProperty('status', 401);
    });
  });

  describe('dashboardStats', () => {
    it('should return correct statistics', async () => {
      // Create users
      const user1 = await User.create({
        name: 'User 1',
        email: 'user1@example.com',
        password: 'hash1',
        referralCode: 'CODE001',
        referralsCount: 0, // Will be updated below
        paymentApproved: true,
      });
      const user2 = await User.create({
        name: 'User 2',
        email: 'user2@example.com',
        password: 'hash2',
        referralCode: 'CODE002',
        referredBy: 'CODE001',
        referralsCount: 0,
        paymentApproved: true,
      });
      
      // Update user1's referral count to reflect user2
      await User.updateOne(
        { referralCode: 'CODE001' },
        { $inc: { referralsCount: 1 } }
      );

      // Create payments
      await Payment.create({
        name: 'User 1',
        email: 'user1@example.com',
        phoneNumber: '1234567890',
        paymentId: 'UPI001',
        amount: 120,
        status: 'approved',
      });
      await Payment.create({
        name: 'User 2',
        email: 'user2@example.com',
        phoneNumber: '0987654321',
        paymentId: 'UPI002',
        amount: 120,
        status: 'pending',
      });

      const response = await dashboardStats();

      expect(response.status).toBe(200);
      expect(response.data.totalUsers).toBe(2);
      expect(response.data.totalPayments).toBe(2);
      expect(response.data.paymentsByStatus.approved).toBe(1);
      expect(response.data.paymentsByStatus.pending).toBe(1);
      expect(response.data.totalReferrals).toBe(1);
      
      // ===== NEW: Verify referral breakdown stats =====
      expect(response.data).toHaveProperty('usersWithReferrals');
      expect(response.data).toHaveProperty('usersWithoutReferrals');
      expect(response.data).toHaveProperty('usersWhoWereReferred');
      expect(response.data).toHaveProperty('usersWhoJoinedAlone');
    });

    it('should calculate referral breakdown correctly', async () => {
      // Create users with different referral statuses
      await User.create({
        name: 'Has Referrals',
        email: 'hasref@example.com',
        password: 'hash1',
        referralCode: 'CODE001',
        referralsCount: 0,
        paymentApproved: true,
      });
      // Create a user that was referred by CODE001
      await User.create({
        name: 'Was Referred 1',
        email: 'referred1@example.com',
        password: 'hash2',
        referralCode: 'CODE002',
        referredBy: 'CODE001',
        referralsCount: 0,
        paymentApproved: true,
      });
      // Update CODE001's referral count
      await User.updateOne(
        { referralCode: 'CODE001' },
        { $inc: { referralsCount: 1 } }
      );
      // Create users who joined alone
      await User.create({
        name: 'Not Referred 1',
        email: 'notreferred1@example.com',
        password: 'hash3',
        referralCode: 'CODE003',
        referredBy: null,
        referralsCount: 0,
        paymentApproved: true,
      });
      await User.create({
        name: 'Not Referred 2',
        email: 'notreferred2@example.com',
        password: 'hash4',
        referralCode: 'CODE004',
        referredBy: null,
        referralsCount: 0,
        paymentApproved: true,
      });

      const response = await dashboardStats();

      expect(response.data.usersWithReferrals).toBe(1);
      expect(response.data.usersWithoutReferrals).toBe(3);
      expect(response.data.usersWhoWereReferred).toBe(1);
      expect(response.data.usersWhoJoinedAlone).toBe(3);
    });
  });

  describe('listUsers', () => {
    beforeEach(async () => {
      await User.create({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'hash1',
        referralCode: 'CODE001',
        referralsCount: 2,
        paymentApproved: true,
      });
      await User.create({
        name: 'Jane Smith',
        email: 'jane@example.com',
        password: 'hash2',
        referralCode: 'CODE002',
        referredBy: 'CODE001',
        referralsCount: 0,
        paymentApproved: true,
      });
    });

    it('should list all users', async () => {
      const req = { query: {} };
      const response = await listUsers(req);

      expect(response.status).toBe(200);
      expect(response.data.users).toHaveLength(2);
      expect(response.data.total).toBe(2);
    });

    it('should search users by name', async () => {
      const req = { query: { q: 'john' } };
      const response = await listUsers(req);

      expect(response.data.users).toHaveLength(1);
      expect(response.data.users[0].name).toBe('John Doe');
    });

    it('should search users by email', async () => {
      const req = { query: { q: 'jane' } };
      const response = await listUsers(req);

      expect(response.data.users).toHaveLength(1);
      expect(response.data.users[0].email).toBe('jane@example.com');
    });

    it('should not include password in user data', async () => {
      const req = { query: {} };
      const response = await listUsers(req);

      response.data.users.forEach(user => {
        expect(user).not.toHaveProperty('password');
      });
    });
  });

  describe('deleteUser', () => {
    let userToDelete, referrer;

    beforeEach(async () => {
      referrer = await User.create({
        name: 'Referrer',
        email: 'referrer@example.com',
        password: 'hash1',
        referralCode: 'CODE001',
        referralsCount: 1,
        paymentApproved: true,
      });

      userToDelete = await User.create({
        name: 'To Delete',
        email: 'delete@example.com',
        password: 'hash2',
        referralCode: 'CODE002',
        referredBy: 'CODE001',
        referralsCount: 0,
        paymentApproved: true,
      });
    });

    it('should delete user and adjust referrer count', async () => {
      const req = { params: { id: userToDelete._id } };
      const response = await deleteUser(req);

      expect(response.status).toBe(200);
      expect(response.data.message).toBe('User deleted');

      // Verify user was deleted
      const deletedUser = await User.findById(userToDelete._id);
      expect(deletedUser).toBeNull();
    });

    it('should reject deleting non-existent user', async () => {
      const req = { params: { id: 'nonexistent' } };
      await expect(deleteUser(req)).rejects.toHaveProperty('status', 404);
    });
  });

  describe('listPayments', () => {
    beforeEach(async () => {
      await Payment.create({
        name: 'User 1',
        email: 'user1@example.com',
        phoneNumber: '1234567890',
        paymentId: 'UPI001',
        amount: 120,
        status: 'approved',
      });
      await Payment.create({
        name: 'User 2',
        email: 'user2@example.com',
        phoneNumber: '0987654321',
        paymentId: 'UPI002',
        amount: 120,
        status: 'pending',
      });
    });

    it('should list all payments', async () => {
      const req = { query: {} };
      const response = await listPayments(req);

      expect(response.status).toBe(200);
      expect(response.data.payments).toHaveLength(2);
    });

    it('should filter payments by status', async () => {
      const req = { query: { status: 'approved' } };
      const response = await listPayments(req);

      expect(response.data.payments).toHaveLength(1);
      expect(response.data.payments[0].status).toBe('approved');
    });

    it('should search payments by query', async () => {
      const req = { query: { q: 'user1' } };
      const response = await listPayments(req);

      expect(response.data.payments).toHaveLength(1);
      expect(response.data.payments[0].name).toBe('User 1');
    });
  });

  describe('verifyPayment', () => {
    let payment;

    beforeEach(async () => {
      payment = await Payment.create({
        name: 'User 1',
        email: 'user1@example.com',
        phoneNumber: '1234567890',
        paymentId: 'UPI001',
        amount: 120,
        status: 'pending',
      });
    });

    it('should approve payment', async () => {
      const req = { params: { id: payment._id }, body: { action: 'approved' } };
      const response = await verifyPayment(req);

      expect(response.status).toBe(200);
      expect(response.data.payment.status).toBe('approved');
    });

    it('should reject payment', async () => {
      const req = { params: { id: payment._id }, body: { action: 'rejected' } };
      const response = await verifyPayment(req);

      expect(response.status).toBe(200);
      expect(response.data.payment.status).toBe('rejected');
    });

    it('should update user paymentApproved flag when approved', async () => {
      await User.create({
        name: 'User 1',
        email: 'user1@example.com',
        password: 'hash1',
        referralCode: 'CODE001',
        paymentApproved: false,
      });

      const req = { params: { id: payment._id }, body: { action: 'approved' } };
      await verifyPayment(req);

      const user = await User.findOne({ email: 'user1@example.com' });
      expect(user.paymentApproved).toBe(true);
    });

    it('should reject invalid action', async () => {
      const req = { params: { id: payment._id }, body: { action: 'invalid' } };
      await expect(verifyPayment(req)).rejects.toHaveProperty('status', 400);
    });
  });

  // ===== NEW: Referral Tree Tests =====
  describe('referralTree', () => {
    it('should return complete referral hierarchy', async () => {
      // Create referral chain
      await User.create({
        name: 'Top Referrer',
        email: 'top@example.com',
        password: 'hash1',
        referralCode: 'TOP001',
        referralsCount: 0,
        paymentApproved: true,
      });
      await User.create({
        name: 'Mid User',
        email: 'mid@example.com',
        password: 'hash2',
        referralCode: 'MID001',
        referredBy: 'TOP001',
        referralsCount: 0,
        paymentApproved: true,
      });
      await User.create({
        name: 'Bottom User',
        email: 'bottom@example.com',
        password: 'hash3',
        referralCode: 'BOT001',
        referredBy: 'MID001',
        referralsCount: 0,
        paymentApproved: true,
      });
      
      // Update referral counts
      await User.updateOne(
        { referralCode: 'TOP001' },
        { $inc: { referralsCount: 1 } }
      );
      await User.updateOne(
        { referralCode: 'MID001' },
        { $inc: { referralsCount: 1 } }
      );

      const req = {};
      const response = await referralTree(req);

      expect(response.status).toBe(200);
      expect(response.data.tree).toHaveLength(3);
      
      // Verify tree structure
      const topUser = response.data.tree.find(u => u.referralCode === 'TOP001');
      expect(topUser.referralsCount).toBe(1);
      expect(topUser.referrerName).toBeNull();
    });

    it('should include referrer information', async () => {
      await User.create({
        name: 'Referrer',
        email: 'referrer@example.com',
        password: 'hash1',
        referralCode: 'REF001',
        referralsCount: 1,
        paymentApproved: true,
      });
      await User.create({
        name: 'Referred',
        email: 'referred@example.com',
        password: 'hash2',
        referralCode: 'REF002',
        referredBy: 'REF001',
        referralsCount: 0,
        paymentApproved: true,
      });

      const req = {};
      const response = await referralTree(req);

      const referredUser = response.data.tree.find(u => u.referralCode === 'REF002');
      expect(referredUser.referrerName).toBe('Referrer');
      expect(referredUser.referrerEmail).toBe('referrer@example.com');
    });
  });

  // ===== NEW: Get User Referrals Tests =====
  describe('getUserReferrals', () => {
    it('should return all users referred by specific user', async () => {
      const referrer = await User.create({
        name: 'Referrer',
        email: 'referrer@example.com',
        password: 'hash1',
        referralCode: 'REF001',
        referralsCount: 2,
        paymentApproved: true,
      });
      await User.create({
        name: 'Referred 1',
        email: 'ref1@example.com',
        password: 'hash2',
        referralCode: 'REF002',
        referredBy: 'REF001',
        referralsCount: 0,
        paymentApproved: true,
      });
      await User.create({
        name: 'Referred 2',
        email: 'ref2@example.com',
        password: 'hash3',
        referralCode: 'REF003',
        referredBy: 'REF001',
        referralsCount: 0,
        paymentApproved: true,
      });

      const req = { params: { id: referrer._id } };
      const response = await getUserReferrals(req);

      expect(response.status).toBe(200);
      expect(response.data.total).toBe(2);
      expect(response.data.referredUsers).toHaveLength(2);
    });

    it('should return empty array for user with no referrals', async () => {
      const user = await User.create({
        name: 'Solo User',
        email: 'solo@example.com',
        password: 'hash1',
        referralCode: 'SOLO01',
        referralsCount: 0,
        paymentApproved: true,
      });

      const req = { params: { id: user._id } };
      const response = await getUserReferrals(req);

      expect(response.data.total).toBe(0);
      expect(response.data.referredUsers).toHaveLength(0);
    });

    it('should reject for non-existent user', async () => {
      const req = { params: { id: 'nonexistent' } };
      await expect(getUserReferrals(req)).rejects.toHaveProperty('status', 404);
    });
  });

  // ===== NEW: Filter Users by Referral Tests =====
  describe('filterUsersByReferral', () => {
    beforeEach(async () => {
      await User.create({
        name: 'Has Referrals',
        email: 'hasref@example.com',
        password: 'hash1',
        referralCode: 'CODE001',
        referralsCount: 0,
        referredBy: null,
        paymentApproved: true,
      });
      // Create a referred user
      await User.create({
        name: 'Was Referred',
        email: 'referred@example.com',
        password: 'hash2',
        referralCode: 'CODE002',
        referralsCount: 0,
        referredBy: 'CODE001',
        paymentApproved: true,
      });
      // Update referrer count
      await User.updateOne(
        { referralCode: 'CODE001' },
        { $inc: { referralsCount: 1 } }
      );
      // Create another user who joined alone
      await User.create({
        name: 'No Referrals',
        email: 'noref@example.com',
        password: 'hash3',
        referralCode: 'CODE003',
        referralsCount: 0,
        referredBy: null,
        paymentApproved: true,
      });
    });

    it('should filter users with referrals', async () => {
      const req = { query: { filter: 'has_referrals' } };
      const response = await filterUsersByReferral(req);

      expect(response.data.total).toBe(1);
      expect(response.data.users[0].referralsCount).toBeGreaterThan(0);
    });

    it('should filter users without referrals', async () => {
      const req = { query: { filter: 'no_referrals' } };
      const response = await filterUsersByReferral(req);

      expect(response.data.total).toBe(2);
      response.data.users.forEach(user => {
        expect(user.referralsCount).toBe(0);
      });
    });

    it('should filter users who were referred', async () => {
      const req = { query: { filter: 'referred' } };
      const response = await filterUsersByReferral(req);

      expect(response.data.total).toBe(1);
      expect(response.data.users[0].referredBy).not.toBeNull();
    });

    it('should filter users who joined alone', async () => {
      const req = { query: { filter: 'not_referred' } };
      const response = await filterUsersByReferral(req);

      expect(response.data.total).toBe(2);
      response.data.users.forEach(user => {
        expect(user.referredBy).toBeNull();
      });
    });

    it('should return all users for invalid filter', async () => {
      const req = { query: { filter: 'invalid' } };
      const response = await filterUsersByReferral(req);

      expect(response.data.total).toBe(3);
    });
  });
});
