// ===== Database Layer Tests =====
import { describe, it, expect, beforeEach } from 'vitest';
import { User, Payment, Admin, generateReferralCode, simpleHash, simpleCompare } from '../db';

describe('Database Layer', () => {
  beforeEach(() => {
    // Clear all collections before each test
    localStorage.setItem('pc_db_users', '[]');
    localStorage.setItem('pc_db_payments', '[]');
    localStorage.setItem('pc_db_admins', '[]');
  });

  describe('User Model', () => {
    it('should create a user with all required fields', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashedpassword123',
        referralCode: 'TEST1234',
        referredBy: null,
      };

      const user = await User.create(userData);

      expect(user).toHaveProperty('_id');
      expect(user.name).toBe('Test User');
      expect(user.email).toBe('test@example.com');
      expect(user.referralCode).toBe('TEST1234');
      expect(user.referredBy).toBeNull();
      expect(user.referralsCount).toBe(0);
      expect(user.paymentApproved).toBe(false);
      expect(user).toHaveProperty('createdAt');
    });

    it('should find user by email', async () => {
      await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashedpassword',
        referralCode: 'TEST1234',
      });

      const found = await User.findOne({ email: 'test@example.com' });
      expect(found).not.toBeNull();
      expect(found.email).toBe('test@example.com');
    });

    it('should find user by referral code', async () => {
      await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashedpassword',
        referralCode: 'TEST1234',
      });

      const found = await User.findOne({ referralCode: 'TEST1234' });
      expect(found).not.toBeNull();
      expect(found.referralCode).toBe('TEST1234');
    });

    it('should return null for non-existent user', async () => {
      const found = await User.findOne({ email: 'nonexistent@example.com' });
      expect(found).toBeNull();
    });

    it('should update user referrals count', async () => {
      await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashedpassword',
        referralCode: 'TEST1234',
      });

      await User.updateOne(
        { referralCode: 'TEST1234' },
        { $inc: { referralsCount: 1 } }
      );

      const updated = await User.findOne({ referralCode: 'TEST1234' });
      expect(updated.referralsCount).toBe(1);
    });

    it('should delete user by id', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashedpassword',
        referralCode: 'TEST1234',
      });

      const deleted = await User.findByIdAndDelete(user._id);
      expect(deleted).not.toBeNull();
      expect(deleted._id).toBe(user._id);

      const found = await User.findOne({ email: 'test@example.com' });
      expect(found).toBeNull();
    });

    it('should count all users', async () => {
      await User.create({
        name: 'User 1',
        email: 'user1@example.com',
        password: 'hash1',
        referralCode: 'CODE0001',
      });
      await User.create({
        name: 'User 2',
        email: 'user2@example.com',
        password: 'hash2',
        referralCode: 'CODE0002',
      });

      const count = await User.countDocuments();
      expect(count).toBe(2);
    });

    it('should find all users with find()', async () => {
      await User.create({
        name: 'User 1',
        email: 'user1@example.com',
        password: 'hash1',
        referralCode: 'CODE0001',
      });
      await User.create({
        name: 'User 2',
        email: 'user2@example.com',
        password: 'hash2',
        referralCode: 'CODE0002',
      });

      const users = await User.find({});
      expect(users).toHaveLength(2);
    });

    it('should search users by name or email', async () => {
      await User.create({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'hash1',
        referralCode: 'CODE0001',
      });
      await User.create({
        name: 'Jane Smith',
        email: 'jane@example.com',
        password: 'hash2',
        referralCode: 'CODE0002',
      });

      const users = await User.find({
        $or: [
          { name: { $regex: 'john', $options: 'i' } },
          { email: { $regex: 'john', $options: 'i' } },
        ],
      });
      expect(users).toHaveLength(1);
      expect(users[0].name).toBe('John Doe');
    });

    it('should handle referral relationships', async () => {
      // Create referrer
      const referrer = await User.create({
        name: 'Referrer',
        email: 'referrer@example.com',
        password: 'hash1',
        referralCode: 'REFCODE1',
      });

      // Create referred user
      const referred = await User.create({
        name: 'Referred User',
        email: 'referred@example.com',
        password: 'hash2',
        referralCode: 'REFCODE2',
        referredBy: 'REFCODE1',
      });

      expect(referred.referredBy).toBe('REFCODE1');
      
      // Update referrer count
      await User.updateOne(
        { referralCode: 'REFCODE1' },
        { $inc: { referralsCount: 1 } }
      );

      const updatedReferrer = await User.findOne({ referralCode: 'REFCODE1' });
      expect(updatedReferrer.referralsCount).toBe(1);
    });
  });

  describe('Payment Model', () => {
    it('should create a payment', async () => {
      const payment = await Payment.create({
        name: 'Test User',
        email: 'test@example.com',
        phoneNumber: '1234567890',
        paymentId: 'UPI123456',
        screenshot: 'data:image/png;base64,test',
        amount: 120,
        status: 'pending',
      });

      expect(payment).toHaveProperty('_id');
      expect(payment.status).toBe('pending');
      expect(payment.amount).toBe(120);
    });

    it('should find payment by paymentId', async () => {
      await Payment.create({
        name: 'Test User',
        email: 'test@example.com',
        phoneNumber: '1234567890',
        paymentId: 'UPI123456',
        amount: 120,
        status: 'approved',
      });

      const found = await Payment.findOne({ paymentId: 'UPI123456' });
      expect(found).not.toBeNull();
      expect(found.paymentId).toBe('UPI123456');
    });

    it('should count payments by status', async () => {
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

      const approved = await Payment.countDocuments({ status: 'approved' });
      const pending = await Payment.countDocuments({ status: 'pending' });
      
      expect(approved).toBe(1);
      expect(pending).toBe(1);
    });
  });

  describe('Admin Model', () => {
    it('should create an admin', async () => {
      const admin = await Admin.create({
        email: 'admin@example.com',
        password: 'hashedpassword',
      });

      expect(admin).toHaveProperty('_id');
      expect(admin.email).toBe('admin@example.com');
    });

    it('should find admin by email', async () => {
      await Admin.create({
        email: 'admin@example.com',
        password: 'hashedpassword',
      });

      const found = await Admin.findOne({ email: 'admin@example.com' });
      expect(found).not.toBeNull();
      expect(found.email).toBe('admin@example.com');
    });
  });

  describe('Utility Functions', () => {
    it('should generate unique referral codes', () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add(generateReferralCode());
      }
      // All codes should be 8 characters
      codes.forEach(code => {
        expect(code).toHaveLength(8);
        expect(code).toMatch(/^[A-Z0-9]{8}$/);
      });
    });

    it('should hash passwords', async () => {
      const hash = await simpleHash('mypassword');
      expect(hash).toBeDefined();
      expect(hash).not.toBe('mypassword');
      expect(typeof hash).toBe('string');
    });

    it('should compare passwords correctly', async () => {
      const password = 'mypassword';
      const hash = await simpleHash(password);
      
      const match = await simpleCompare(password, hash);
      expect(match).toBe(true);
      
      // Different password should not match
      const differentHash = await simpleHash('differentpassword');
      const noMatch = await simpleCompare(password, differentHash);
      expect(noMatch).toBe(false);
    });
  });
});
