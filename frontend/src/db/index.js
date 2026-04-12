// localStorage-based database layer that mimics MongoDB operations
// This replaces the entire backend database with browser storage

const DB_KEYS = {
  users: 'pc_db_users',
  payments: 'pc_db_payments',
  admins: 'pc_db_admins',
};

// Helper functions for localStorage operations
function getCollection(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveCollection(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Simple hash function for browser (replaces bcrypt for frontend-only)
async function simpleHash(password) {
  // Use Web Crypto API for SHA-256 hashing
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'pc-salt-2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Simple compare function (replaces bcrypt.compare for frontend-only)
async function simpleCompare(plaintext, hashed) {
  const hash = await simpleHash(plaintext);
  return hash === hashed;
}

// ===== USERS =====

export const User = {
  async create(userData) {
    const users = getCollection(DB_KEYS.users);
    const now = new Date().toISOString();
    const user = {
      _id: generateId(),
      name: userData.name,
      email: userData.email,
      password: userData.password, // Already hashed by caller
      referralCode: userData.referralCode,
      referredBy: userData.referredBy || null,
      referralsCount: 0,
      paymentApproved: userData.paymentApproved || false,
      createdAt: now,
    };
    users.push(user);
    saveCollection(DB_KEYS.users, users);
    return user;
  },

  async findOne(query) {
    const users = getCollection(DB_KEYS.users);
    if (query.email) {
      return users.find(u => u.email === query.email.toLowerCase()) || null;
    }
    if (query.referralCode) {
      return users.find(u => u.referralCode === query.referralCode.toUpperCase()) || null;
    }
    return null;
  },

  async findById(id) {
    const users = getCollection(DB_KEYS.users);
    return users.find(u => u._id === id) || null;
  },

  async updateOne(query, update) {
    const users = getCollection(DB_KEYS.users);
    let updated = false;
    
    if (query.referralCode) {
      const idx = users.findIndex(u => u.referralCode === query.referralCode.toUpperCase());
      if (idx !== -1) {
        if (update.$set) {
          Object.assign(users[idx], update.$set);
        }
        if (update.$inc) {
          if (update.$inc.referralsCount) {
            users[idx].referralsCount += update.$inc.referralsCount;
          }
        }
        updated = true;
      }
    } else if (query.email) {
      const idx = users.findIndex(u => u.email === query.email.toLowerCase());
      if (idx !== -1) {
        if (update.$set) {
          Object.assign(users[idx], update.$set);
        }
        if (update.$inc) {
          if (update.$inc.referralsCount) {
            users[idx].referralsCount += update.$inc.referralsCount;
          }
        }
        updated = true;
      }
    }
    
    if (updated) {
      saveCollection(DB_KEYS.users, users);
    }
    return { modifiedCount: updated ? 1 : 0 };
  },

  async findByIdAndDelete(id) {
    const users = getCollection(DB_KEYS.users);
    const idx = users.findIndex(u => u._id === id);
    if (idx === -1) return null;
    
    const deleted = users.splice(idx, 1)[0];
    saveCollection(DB_KEYS.users, users);
    return deleted;
  },

  async countDocuments(query = {}) {
    const users = getCollection(DB_KEYS.users);
    if (Object.keys(query).length === 0) {
      return users.length;
    }
    return users.filter(u => {
      if (query.paymentApproved !== undefined) {
        return u.paymentApproved === query.paymentApproved;
      }
      return true;
    }).length;
  },

  async find(query = {}) {
    let users = getCollection(DB_KEYS.users);
    
    if (query.$or) {
      users = users.filter(u => 
        query.$or.some(condition => {
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
    const payments = getCollection(DB_KEYS.payments);
    const now = new Date().toISOString();
    const payment = {
      _id: generateId(),
      name: paymentData.name,
      email: paymentData.email,
      phoneNumber: paymentData.phoneNumber,
      paymentId: paymentData.paymentId, // UPI Reference Number
      screenshot: paymentData.screenshot,
      status: paymentData.status || 'pending',
      amount: paymentData.amount,
      createdAt: now,
    };
    payments.push(payment);
    saveCollection(DB_KEYS.payments, payments);
    return payment;
  },

  async findOne(query) {
    const payments = getCollection(DB_KEYS.payments);
    if (query.paymentId) {
      return payments.find(p => p.paymentId === query.paymentId) || null;
    }
    if (query.email && query.paymentId) {
      return payments.find(p => 
        p.email === query.email.toLowerCase() && p.paymentId === query.paymentId
      ) || null;
    }
    return null;
  },

  async findById(id) {
    const payments = getCollection(DB_KEYS.payments);
    return payments.find(p => p._id === id) || null;
  },

  async countDocuments(query = {}) {
    const payments = getCollection(DB_KEYS.payments);
    if (Object.keys(query).length === 0) {
      return payments.length;
    }
    if (query.status) {
      return payments.filter(p => p.status === query.status).length;
    }
    if (query.email) {
      return payments.filter(p => p.email === query.email.toLowerCase()).length;
    }
    return payments.length;
  },

  async find(query = {}) {
    let payments = getCollection(DB_KEYS.payments);
    
    if (query.status) {
      payments = payments.filter(p => p.status === query.status);
    }
    
    if (query.$or) {
      payments = payments.filter(p => 
        query.$or.some(condition => {
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
    const payments = getCollection(DB_KEYS.payments);
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
    const admins = getCollection(DB_KEYS.admins);
    const now = new Date().toISOString();
    const admin = {
      _id: generateId(),
      email: adminData.email,
      password: adminData.password, // Already hashed by caller
      createdAt: now,
      updatedAt: now,
    };
    admins.push(admin);
    saveCollection(DB_KEYS.admins, admins);
    return admin;
  },

  async findOne(query) {
    const admins = getCollection(DB_KEYS.admins);
    if (query.email) {
      return admins.find(a => a.email === query.email.toLowerCase()) || null;
    }
    return null;
  },
};

// ===== UTILITIES =====

export function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function seedDefaultAdmin() {
  const admins = getCollection(DB_KEYS.admins);
  const hashed = await simpleHash('jagan7523');
  
  // Check if admin with jagan@gmail.com exists
  const jaganAdmin = admins.find(a => a.email === 'jagan@gmail.com');
  
  if (!jaganAdmin) {
    // Clear old admins and create new one
    saveCollection(DB_KEYS.admins, []);
    await Admin.create({
      email: 'jagan@gmail.com',
      password: hashed,
    });
    console.log('✅ Admin created: jagan@gmail.com');
  } else if (admins.length > 0) {
    // Update existing admin to use new credentials
    admins[0].email = 'jagan@gmail.com';
    admins[0].password = hashed;
    saveCollection(DB_KEYS.admins, admins);
    console.log('✅ Admin updated: jagan@gmail.com');
  }
}

// Initialize database on first load
export async function initDb() {
  await seedDefaultAdmin();
}

// Export DB_KEYS for controllers that need direct access
export { DB_KEYS };

// Export helper functions for direct localStorage access (used by controllers)
export { getCollection, saveCollection, simpleHash, simpleCompare };
