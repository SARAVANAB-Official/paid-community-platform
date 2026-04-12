// ===== Authentication Tests =====
import { describe, it, expect, beforeEach } from 'vitest';
import { register, login, me } from '../controllers/authController';
import { User, Payment, simpleHash } from '../db';

describe('Authentication Controller', () => {
  beforeEach(() => {
    localStorage.setItem('pc_db_users', '[]');
    localStorage.setItem('pc_db_payments', '[]');
    localStorage.setItem('pc_db_admins', '[]');
  });

  describe('register', () => {
    it('should register user with valid payment and referral', async () => {
      // Create an approved payment first
      await Payment.create({
        name: 'Test User',
        email: 'test@example.com',
        phoneNumber: '1234567890',
        paymentId: 'UPI123456',
        amount: 120,
        status: 'approved',
      });

      const req = {
        body: {
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
          utr: 'UPI123456',
        },
      };

      const response = await register(req);

      expect(response.status).toBe(201);
      expect(response.data.message).toBe('Registration successful');
      expect(response.data.user).toHaveProperty('_id');
      expect(response.data.user.name).toBe('Test User');
      expect(response.data.user.email).toBe('test@example.com');
      expect(response.data.user).toHaveProperty('referralCode');
      expect(response.data).toHaveProperty('token');
    });

    it('should reject registration without approved payment', async () => {
      const req = {
        body: {
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
          utr: 'UPI000000',
        },
      };

      await expect(register(req)).rejects.toHaveProperty('status', 400);
    });

    it('should reject registration with pending payment', async () => {
      await Payment.create({
        name: 'Test User',
        email: 'test@example.com',
        phoneNumber: '1234567890',
        paymentId: 'UPI123456',
        amount: 120,
        status: 'pending',
      });

      const req = {
        body: {
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
          utr: 'UPI123456',
        },
      };

      await expect(register(req)).rejects.toHaveProperty('status', 403);
    });

    it('should reject duplicate email registration', async () => {
      await Payment.create({
        name: 'Test User',
        email: 'test@example.com',
        phoneNumber: '1234567890',
        paymentId: 'UPI123456',
        amount: 120,
        status: 'approved',
      });

      await User.create({
        name: 'Existing User',
        email: 'test@example.com',
        password: 'hashedpassword',
        referralCode: 'EXISTING',
        paymentApproved: true,
      });

      const req = {
        body: {
          name: 'New User',
          email: 'test@example.com',
          password: 'password123',
          utr: 'UPI123456',
        },
      };

      await expect(register(req)).rejects.toHaveProperty('status', 409);
    });

    it('should link user to referrer when valid referral code provided', async () => {
      // Create referrer
      const referrer = await User.create({
        name: 'Referrer',
        email: 'referrer@example.com',
        password: 'hashedpassword',
        referralCode: 'REFCODE1',
        paymentApproved: true,
      });

      // Create approved payment for new user
      await Payment.create({
        name: 'New User',
        email: 'newuser@example.com',
        phoneNumber: '1234567890',
        paymentId: 'UPI654321',
        amount: 120,
        status: 'approved',
      });

      const req = {
        body: {
          name: 'New User',
          email: 'newuser@example.com',
          password: 'password123',
          utr: 'UPI654321',
          referralCode: 'REFCODE1',
        },
      };

      const response = await register(req);

      expect(response.data.user.referredBy).toBe('REFCODE1');
      
      // Verify referrer's count was incremented
      const updatedReferrer = await User.findOne({ referralCode: 'REFCODE1' });
      expect(updatedReferrer.referralsCount).toBe(1);
    });

    it('should reject invalid referral code', async () => {
      await Payment.create({
        name: 'Test User',
        email: 'test@example.com',
        phoneNumber: '1234567890',
        paymentId: 'UPI123456',
        amount: 120,
        status: 'approved',
      });

      const req = {
        body: {
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
          utr: 'UPI123456',
          referralCode: 'INVALIDCODE',
        },
      };

      await expect(register(req)).rejects.toHaveProperty('status', 400);
    });

    it('should generate unique referral code for each user', async () => {
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
        status: 'approved',
      });

      const req1 = {
        body: {
          name: 'User 1',
          email: 'user1@example.com',
          password: 'password123',
          utr: 'UPI001',
        },
      };
      const req2 = {
        body: {
          name: 'User 2',
          email: 'user2@example.com',
          password: 'password123',
          utr: 'UPI002',
        },
      };

      const res1 = await register(req1);
      const res2 = await register(req2);

      expect(res1.data.user.referralCode).not.toBe(res2.data.user.referralCode);
    });

    it('should not include password in response', async () => {
      await Payment.create({
        name: 'Test User',
        email: 'test@example.com',
        phoneNumber: '1234567890',
        paymentId: 'UPI123456',
        amount: 120,
        status: 'approved',
      });

      const req = {
        body: {
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
          utr: 'UPI123456',
        },
      };

      const response = await register(req);
      expect(response.data.user).not.toHaveProperty('password');
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      const hashed = await simpleHash('password123');
      await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: hashed,
        referralCode: 'TESTCODE',
        paymentApproved: true,
      });
    });

    it('should login with correct credentials', async () => {
      const req = {
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      };

      const response = await login(req);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('token');
      expect(response.data.user.email).toBe('test@example.com');
    });

    it('should reject wrong password', async () => {
      const hashed = await simpleHash('correctpassword');
      // Clear and recreate with properly hashed password
      localStorage.setItem('pc_db_users', '[]');
      await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: hashed,
        referralCode: 'TESTCODE',
        paymentApproved: true,
      });

      const req = {
        body: {
          email: 'test@example.com',
          password: 'wrongpassword',
        },
      };

      await expect(login(req)).rejects.toHaveProperty('status', 401);
    });

    it('should reject non-existent email', async () => {
      const req = {
        body: {
          email: 'nonexistent@example.com',
          password: 'password123',
        },
      };

      await expect(login(req)).rejects.toHaveProperty('status', 401);
    });

    it('should reject user with unapproved payment', async () => {
      await User.create({
        name: 'Unapproved User',
        email: 'unapproved@example.com',
        password: await simpleHash('password123'),
        referralCode: 'UNAPPR',
        paymentApproved: false,
      });

      const req = {
        body: {
          email: 'unapproved@example.com',
          password: 'password123',
        },
      };

      await expect(login(req)).rejects.toHaveProperty('status', 403);
    });
  });

  describe('me', () => {
    let testUser;

    beforeEach(async () => {
      const hashed = await simpleHash('password123');
      testUser = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: hashed,
        referralCode: 'TESTCODE',
        referredBy: null,
        referralsCount: 5,
        paymentApproved: true,
      });
    });

    it('should return user data with stats', async () => {
      const req = {};
      const response = await me(req, testUser);

      expect(response.status).toBe(200);
      expect(response.data.user).toHaveProperty('name');
      expect(response.data.platformStats).toHaveProperty('totalUsers');
    });

    it('should reject user with unapproved payment', async () => {
      const unapprovedUser = await User.create({
        name: 'Unapproved User',
        email: 'unapproved@example.com',
        password: 'hashedpassword',
        referralCode: 'UNAPPR',
        paymentApproved: false,
      });

      const req = {};
      await expect(me(req, unapprovedUser)).rejects.toHaveProperty('status', 403);
    });
  });
});
