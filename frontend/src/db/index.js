// Firebase Firestore database layer — replaces localStorage
// Keeps the same API (User.create, Payment.findOne, etc.) so controllers don't need changes

import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  query,
  where,
  updateDoc,
  deleteDoc,
  setDoc,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config.js';

const COL_USERS = 'users';
const COL_PAYMENTS = 'payments';
const COL_ADMINS = 'admins';

// Simple hash function for passwords (SHA-256 via Web Crypto API)
async function simpleHash(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'pc-salt-2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Simple compare function
async function simpleCompare(plaintext, hashed) {
  const hash = await simpleHash(plaintext);
  return hash === hashed;
}

// Generate unique referral code
function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ===== USERS =====

export const User = {
  async create(userData) {
    const now = new Date().toISOString();
    const userDoc = {
      name: userData.name,
      email: userData.email,
      password: userData.password,
      referralCode: userData.referralCode,
      referredBy: userData.referredBy || null,
      referralsCount: 0,
      paymentApproved: userData.paymentApproved || false,
      createdAt: now,
    };

    const ref = await addDoc(collection(db, COL_USERS), userDoc);
    return { _id: ref.id, ...userDoc };
  },

  async findOne(queryObj) {
    const colRef = collection(db, COL_USERS);
    let q;

    if (queryObj.email) {
      q = query(colRef, where('email', '==', queryObj.email.toLowerCase()));
    } else if (queryObj.referralCode) {
      q = query(colRef, where('referralCode', '==', queryObj.referralCode.toUpperCase()));
    } else {
      return null;
    }

    const snap = await getDocs(q);
    if (snap.empty) return null;

    const d = snap.docs[0].data();
    return { _id: snap.docs[0].id, ...d };
  },

  async findById(id) {
    const ref = doc(db, COL_USERS, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { _id: snap.id, ...snap.data() };
  },

  async updateOne(queryObj, update) {
    const colRef = collection(db, COL_USERS);
    let q;

    if (queryObj.referralCode) {
      q = query(colRef, where('referralCode', '==', queryObj.referralCode.toUpperCase()));
    } else if (queryObj.email) {
      q = query(colRef, where('email', '==', queryObj.email.toLowerCase()));
    } else {
      return { modifiedCount: 0 };
    }

    const snap = await getDocs(q);
    if (snap.empty) return { modifiedCount: 0 };

    const docSnap = snap.docs[0];
    const currentData = docSnap.data();
    const updates = {};

    if (update.$set) {
      Object.assign(updates, update.$set);
    }
    if (update.$inc) {
      for (const [key, val] of Object.entries(update.$inc)) {
        if (key === 'referralsCount') {
          updates[key] = (currentData[key] || 0) + val;
        }
      }
    }

    await updateDoc(docSnap.ref, updates);
    return { modifiedCount: 1 };
  },

  async findByIdAndDelete(id) {
    const ref = doc(db, COL_USERS, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;

    const data = snap.data();
    await deleteDoc(ref);
    return { _id: id, ...data };
  },

  async countDocuments(queryObj = {}) {
    const colRef = collection(db, COL_USERS);
    let q = query(colRef);

    if (queryObj.paymentApproved !== undefined) {
      q = query(colRef, where('paymentApproved', '==', queryObj.paymentApproved));
    }

    const snap = await getDocs(q);
    return snap.size;
  },

  async find(queryObj = {}) {
    const colRef = collection(db, COL_USERS);
    let q = query(colRef);

    // Firestore doesn't support $or — we handle it client-side
    const snap = await getDocs(q);
    let users = snap.docs.map(d => ({ _id: d.id, ...d.data() }));

    if (queryObj.$or) {
      users = users.filter(u =>
        queryObj.$or.some(condition => {
          if (condition.name?.$regex) {
            return u.name.toLowerCase().includes(condition.name.$regex.toLowerCase());
          }
          if (condition.email?.$regex) {
            return u.email.toLowerCase().includes(condition.email.$regex.toLowerCase());
          }
          return false;
        })
      );
    }

    return users;
  },
};

// ===== PAYMENTS =====

export const Payment = {
  async create(paymentData) {
    const now = new Date().toISOString();
    const paymentDoc = {
      name: paymentData.name,
      email: paymentData.email,
      phoneNumber: paymentData.phoneNumber,
      paymentId: paymentData.paymentId,
      screenshot: paymentData.screenshot,
      status: paymentData.status || 'pending',
      amount: paymentData.amount,
      createdAt: now,
    };

    const ref = await addDoc(collection(db, COL_PAYMENTS), paymentDoc);
    return { _id: ref.id, ...paymentDoc };
  },

  async findOne(queryObj) {
    const colRef = collection(db, COL_PAYMENTS);
    let q;

    if (queryObj.paymentId && queryObj.email) {
      q = query(colRef, where('paymentId', '==', queryObj.paymentId), where('email', '==', queryObj.email.toLowerCase()));
    } else if (queryObj.paymentId) {
      q = query(colRef, where('paymentId', '==', queryObj.paymentId));
    } else {
      return null;
    }

    const snap = await getDocs(q);
    if (snap.empty) return null;

    const d = snap.docs[0].data();
    return { _id: snap.docs[0].id, ...d };
  },

  async findById(id) {
    const ref = doc(db, COL_PAYMENTS, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { _id: snap.id, ...snap.data() };
  },

  async countDocuments(queryObj = {}) {
    const colRef = collection(db, COL_PAYMENTS);
    let q = query(colRef);

    if (queryObj.status) {
      q = query(colRef, where('status', '==', queryObj.status));
    } else if (queryObj.email) {
      q = query(colRef, where('email', '==', queryObj.email.toLowerCase()));
    }

    const snap = await getDocs(q);
    return snap.size;
  },

  async find(queryObj = {}) {
    const colRef = collection(db, COL_PAYMENTS);
    let q = query(colRef);

    if (queryObj.status) {
      q = query(colRef, where('status', '==', queryObj.status));
    }

    const snap = await getDocs(q);
    let payments = snap.docs.map(d => ({ _id: d.id, ...d.data() }));

    if (queryObj.$or) {
      payments = payments.filter(p =>
        queryObj.$or.some(condition => {
          if (condition.name?.$regex) {
            return p.name.toLowerCase().includes(condition.name.$regex.toLowerCase());
          }
          if (condition.email?.$regex) {
            return p.email.toLowerCase().includes(condition.email.$regex.toLowerCase());
          }
          if (condition.phoneNumber?.$regex) {
            return p.phoneNumber.includes(condition.phoneNumber.$regex);
          }
          if (condition.paymentId?.$regex) {
            return p.paymentId.includes(condition.paymentId.$regex);
          }
          return false;
        })
      );
    }

    return payments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async aggregate(pipeline) {
    const colRef = collection(db, COL_PAYMENTS);
    const snap = await getDocs(query(colRef));
    const payments = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
    const results = [];

    for (const stage of pipeline) {
      if (stage.$match) {
        if (stage.$match.status === 'approved') {
          results.push(...payments.filter(p => p.status === 'approved'));
        }
      }
      if (stage.$group) {
        if (stage.$group._id === null) {
          if (stage.$group.totalAmount) {
            const sum = results.reduce((acc, p) => acc + p.amount, 0);
            return [{ _id: null, totalAmount: sum }];
          }
        }
      }
    }

    return results;
  },
};

// ===== ADMINS =====

export const Admin = {
  async create(adminData) {
    const now = new Date().toISOString();
    const adminDoc = {
      email: adminData.email,
      password: adminData.password,
      createdAt: now,
      updatedAt: now,
    };

    const ref = await addDoc(collection(db, COL_ADMINS), adminDoc);
    return { _id: ref.id, ...adminDoc };
  },

  async findOne(queryObj) {
    const colRef = collection(db, COL_ADMINS);
    let q;

    if (queryObj.email) {
      q = query(colRef, where('email', '==', queryObj.email.toLowerCase()));
    } else {
      return null;
    }

    const snap = await getDocs(q);
    if (snap.empty) return null;

    const d = snap.docs[0].data();
    return { _id: snap.docs[0].id, ...d };
  },
};

// ===== SEED DEFAULT ADMIN =====

export async function seedDefaultAdmin() {
  const adminsSnap = await getDocs(collection(db, COL_ADMINS));
  let adminExists = false;

  for (const d of adminsSnap.docs) {
    if (d.data().email === 'jagan@gmail.com') {
      adminExists = true;
      break;
    }
  }

  if (!adminExists) {
    const hashed = await simpleHash('jagan7523');
    await addDoc(collection(db, COL_ADMINS), {
      email: 'jagan@gmail.com',
      password: hashed,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log('✅ Default admin created in Firestore: jagan@gmail.com');
  }
}

// ===== INIT DB =====

export async function initDb() {
  await seedDefaultAdmin();
}

// ===== EXPORTS =====

export { generateReferralCode, simpleHash, simpleCompare };

// For direct access (used by adminController verifyPayment)
export { db };
export const DB_KEYS = { users: COL_USERS, payments: COL_PAYMENTS, admins: COL_ADMINS };
