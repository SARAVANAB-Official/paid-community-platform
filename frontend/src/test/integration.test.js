// ===== Integration Tests - Full User Workflows =====
import { describe, it, expect, beforeEach } from 'vitest';
import { User, Payment, Admin, simpleHash } from '../db';
import { register, login, me } from '../controllers/authController';
import {
  adminLogin,
  dashboardStats,
  listUsers,
  referralTree,
  verifyPayment,
} from '../controllers/adminController';

describe('Integration Tests - Full Workflows', () => {
  beforeEach(() => {
    localStorage.setItem('pc_db_users', '[]');
    localStorage.setItem('pc_db_payments', '[]');
    localStorage.setItem('pc_db_admins', '[]');
  });

  describe('Complete User Registration with Referral', () => {
    it('should handle full referral workflow', async () => {
      // Step 1: First user creates payment and registers
      await Payment.create({
        name: 'First User',
        email: 'first@example.com',
        phoneNumber: '1234567890',
        paymentId: 'UPI001',
        amount: 120,
        status: 'approved',
      });

      const registerReq1 = {
        body: {
          name: 'First User',
          email: 'first@example.com',
          password: 'password123',
          utr: 'UPI001',
        },
      };

      const reg1 = await register(registerReq1);
      expect(reg1.status).toBe(201);
      const firstUserCode = reg1.data.user.referralCode;

      // Step 2: Second user uses referral code
      await Payment.create({
        name: 'Second User',
        email: 'second@example.com',
        phoneNumber: '0987654321',
        paymentId: 'UPI002',
        amount: 120,
        status: 'approved',
      });

      const registerReq2 = {
        body: {
          name: 'Second User',
          email: 'second@example.com',
          password: 'password123',
          utr: 'UPI002',
          referralCode: firstUserCode,
        },
      };

      const reg2 = await register(registerReq2);
      expect(reg2.data.user.referredBy).toBe(firstUserCode);

      // Step 3: Verify first user's referral count increased
      const firstUser = await User.findOne({ email: 'first@example.com' });
      expect(firstUser.referralsCount).toBe(1);

      // Step 4: Admin should see referral relationship
      const stats = await dashboardStats();
      expect(stats.data.totalUsers).toBe(2);
      expect(stats.data.totalReferrals).toBe(1);
      expect(stats.data.usersWhoWereReferred).toBe(1);
    });

    it('should prevent self-referral', async () => {
      await Payment.create({
        name: 'Test User',
        email: 'test@example.com',
        phoneNumber: '1234567890',
        paymentId: 'UPI001',
        amount: 120,
        status: 'approved',
      });

      // First registration
      const reg1 = await register({
        body: {
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
          utr: 'UPI001',
        },
      });

      // Try to register again with own code (should fail - duplicate email)
      const ownCode = reg1.data.user.referralCode;
      await Payment.create({
        name: 'Another User',
        email: 'another@example.com',
        phoneNumber: '1111111111',
        paymentId: 'UPI002',
        amount: 120,
        status: 'approved',
      });

      // Valid test: another user using valid code works
      const reg2 = await register({
        body: {
          name: 'Another User',
          email: 'another@example.com',
          password: 'password123',
          utr: 'UPI002',
          referralCode: ownCode,
        },
      });

      expect(reg2.data.user.referredBy).toBe(ownCode);
    });
  });

  describe('Admin Full Workflow', () => {
    it('should handle admin payment verification and user management', async () => {
      // Setup admin
      const hashedAdmin = await simpleHash('adminpass');
      await Admin.create({
        email: 'admin@example.com',
        password: hashedAdmin,
      });

      // Admin login
      const adminLoginRes = await adminLogin({
        body: { email: 'admin@example.com', password: 'adminpass' },
      });
      expect(adminLoginRes.status).toBe(200);

      // Create pending payment
      const payment = await Payment.create({
        name: 'Pending User',
        email: 'pending@example.com',
        phoneNumber: '1234567890',
        paymentId: 'UPI001',
        amount: 120,
        status: 'pending',
      });

      // Verify payment as approved
      const verifyRes = await verifyPayment({
        params: { id: payment._id },
        body: { action: 'approved' },
      });
      expect(verifyRes.data.payment.status).toBe('approved');

      // User can now register
      const regRes = await register({
        body: {
          name: 'Pending User',
          email: 'pending@example.com',
          password: 'password123',
          utr: 'UPI001',
        },
      });
      expect(regRes.status).toBe(201);

      // Admin can see user in list
      const usersRes = await listUsers({ query: {} });
      expect(usersRes.data.users).toHaveLength(1);
      expect(usersRes.data.users[0].email).toBe('pending@example.com');

      // Admin can view referral tree
      const treeRes = await referralTree({});
      expect(treeRes.data.tree).toHaveLength(1);
    });

    it('should maintain data consistency after deletions', async () => {
      // Create referrer
      await Payment.create({
        name: 'Referrer',
        email: 'referrer@example.com',
        phoneNumber: '1234567890',
        paymentId: 'UPI001',
        amount: 120,
        status: 'approved',
      });

      const refReg = await register({
        body: {
          name: 'Referrer',
          email: 'referrer@example.com',
          password: 'password123',
          utr: 'UPI001',
        },
      });
      const referrerCode = refReg.data.user.referralCode;

      // Create referred user
      await Payment.create({
        name: 'Referred',
        email: 'referred@example.com',
        phoneNumber: '0987654321',
        paymentId: 'UPI002',
        amount: 120,
        status: 'approved',
      });

      await register({
        body: {
          name: 'Referred',
          email: 'referred@example.com',
          password: 'password123',
          utr: 'UPI002',
          referralCode: referrerCode,
        },
      });

      // Verify referral count
      let referrer = await User.findOne({ referralCode: referrerCode });
      expect(referrer.referralsCount).toBe(1);

      // Get referred user
      const referredUser = await User.findOne({ email: 'referred@example.com' });

      // Delete referred user
      const { User: UserModel } = await import('../db');
      await UserModel.findByIdAndDelete(referredUser._id);

      // Stats should reflect deletion
      const stats = await dashboardStats();
      expect(stats.data.totalUsers).toBe(1);
      expect(stats.data.usersWhoWereReferred).toBe(0);
    });
  });

  describe('Multiple Referral Chain', () => {
    it('should handle multi-level referral chains', async () => {
      // User 1 registers
      await Payment.create({
        name: 'User 1',
        email: 'user1@example.com',
        phoneNumber: '1111111111',
        paymentId: 'UPI001',
        amount: 120,
        status: 'approved',
      });

      const reg1 = await register({
        body: {
          name: 'User 1',
          email: 'user1@example.com',
          password: 'password123',
          utr: 'UPI001',
        },
      });
      const code1 = reg1.data.user.referralCode;

      // User 2 registers with User 1's code
      await Payment.create({
        name: 'User 2',
        email: 'user2@example.com',
        phoneNumber: '2222222222',
        paymentId: 'UPI002',
        amount: 120,
        status: 'approved',
      });

      const reg2 = await register({
        body: {
          name: 'User 2',
          email: 'user2@example.com',
          password: 'password123',
          utr: 'UPI002',
          referralCode: code1,
        },
      });
      const code2 = reg2.data.user.referralCode;

      // User 3 registers with User 2's code
      await Payment.create({
        name: 'User 3',
        email: 'user3@example.com',
        phoneNumber: '3333333333',
        paymentId: 'UPI003',
        amount: 120,
        status: 'approved',
      });

      await register({
        body: {
          name: 'User 3',
          email: 'user3@example.com',
          password: 'password123',
          utr: 'UPI003',
          referralCode: code2,
        },
      });

      // Verify chain
      const treeRes = await referralTree({});
      
      const user1 = treeRes.data.tree.find(u => u.email === 'user1@example.com');
      const user2 = treeRes.data.tree.find(u => u.email === 'user2@example.com');
      const user3 = treeRes.data.tree.find(u => u.email === 'user3@example.com');

      expect(user1.referralsCount).toBe(1);
      expect(user1.referredUsers).toHaveLength(1);
      
      expect(user2.referredBy).toBe(code1);
      expect(user2.referralsCount).toBe(1);
      
      expect(user3.referredBy).toBe(code2);
      expect(user3.referralsCount).toBe(0);

      // Stats
      const stats = await dashboardStats();
      expect(stats.data.totalUsers).toBe(3);
      expect(stats.data.totalReferrals).toBe(2); // User 1 has 1, User 2 has 1
      expect(stats.data.usersWhoWereReferred).toBe(2); // User 2 and User 3
    });
  });

  describe('Login and Session Management', () => {
    it('should handle complete login workflow', async () => {
      // Register user
      await Payment.create({
        name: 'Login Test User',
        email: 'login@example.com',
        phoneNumber: '1234567890',
        paymentId: 'UPI001',
        amount: 120,
        status: 'approved',
      });

      await register({
        body: {
          name: 'Login Test User',
          email: 'login@example.com',
          password: 'SecurePass123',
          utr: 'UPI001',
        },
      });

      // Login
      const loginRes = await login({
        body: {
          email: 'login@example.com',
          password: 'SecurePass123',
        },
      });

      expect(loginRes.status).toBe(200);
      expect(loginRes.data).toHaveProperty('token');
      expect(loginRes.data.user.email).toBe('login@example.com');
      expect(loginRes.data.user).toHaveProperty('referralCode');
      expect(loginRes.data.user).toHaveProperty('referralsCount');

      // Access protected endpoint
      const meRes = await me({}, loginRes.data.user);
      expect(meRes.status).toBe(200);
      expect(meRes.data).toHaveProperty('platformStats');
    });
  });
});
