// Test setup file — mocks Firebase Firestore with in-memory storage
import '@testing-library/jest-dom';
import { webcrypto } from 'crypto';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem(key) { return store[key] || null; },
    setItem(key, value) { store[key] = value.toString(); },
    removeItem(key) { delete store[key]; },
    clear() { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: vi.fn(() => Promise.resolve()) },
});

// Mock crypto.subtle
if (!window.crypto?.subtle) {
  Object.defineProperty(window, 'crypto', { value: webcrypto });
}

// ===== In-memory Firestore mock =====
const mockCollections = {
  users: new Map(),
  payments: new Map(),
  admins: new Map(),
};

let mockIdCounter = 0;
function genId() { return 'mock-' + (++mockIdCounter); }

// Clear before each test
beforeEach(() => {
  mockCollections.users.clear();
  mockCollections.payments.clear();
  mockCollections.admins.clear();
  mockIdCounter = 0;
  localStorage.clear();
});

// Mock Firebase modules
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),

  collection: vi.fn((_db, name) => ({ _type: 'collection', name })),

  doc: vi.fn((_db, colName, id) => ({ _type: 'doc', collection: colName, id })),

  addDoc: vi.fn(async (colRef, data) => {
    const id = genId();
    mockCollections[colRef.name].set(id, { ...data });
    return { id };
  }),

  setDoc: vi.fn(async (docRef, data) => {
    mockCollections[docRef.collection].set(docRef.id, { ...data });
  }),

  getDocs: vi.fn(async (queryObj) => {
    // If no query object, return all docs
    if (!queryObj || !queryObj._collectionName) {
      return { empty: true, docs: [], size: 0 };
    }
    const colName = queryObj._collectionName;
    const map = mockCollections[colName] || new Map();
    const docs = [];
    let filtered = [...map.entries()];

    // Apply where filters
    if (queryObj._filters) {
      for (const [field, op, val] of queryObj._filters) {
        filtered = filtered.filter(([id, doc]) => {
          const dv = doc[field];
          if (op === '==') return dv === val;
          if (op === '>=') return dv >= val;
          if (op === '<=') return dv <= val;
          if (op === '!=') return dv !== val;
          return true;
        });
      }
    }

    for (const [id, data] of filtered) {
      const docObj = {
        id,
        ref: { id, collection: colName },
        data: () => ({ ...data }),
      };
      docs.push(docObj);
    }

    return { empty: docs.length === 0, docs, size: docs.length };
  }),

  getDoc: vi.fn(async (docRef) => {
    const map = mockCollections[docRef.collection];
    if (!map || !map.has(docRef.id)) {
      return { exists: () => false, data: () => null };
    }
    const data = map.get(docRef.id);
    return { exists: () => true, data: () => ({ ...data }) };
  }),

  updateDoc: vi.fn(async (docRef, updates) => {
    const map = mockCollections[docRef.collection];
    if (map && map.has(docRef.id)) {
      const current = map.get(docRef.id);
      map.set(docRef.id, { ...current, ...updates });
    }
  }),

  deleteDoc: vi.fn(async (docRef) => {
    const map = mockCollections[docRef.collection];
    if (map) map.delete(docRef.id);
  }),

  query: vi.fn((colRef, ...constraints) => {
    const obj = { _collectionName: colRef.name, _filters: [] };
    for (const c of constraints) {
      if (c._type === 'where') {
        obj._filters.push([c.field, c.op, c.value]);
      }
    }
    return obj;
  }),

  where: vi.fn((field, op, value) => ({ _type: 'where', field, op, value })),

  orderBy: vi.fn(() => ({})),
  serverTimestamp: vi.fn(() => ({})),
}));
