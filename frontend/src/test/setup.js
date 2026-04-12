// Test setup file
import '@testing-library/jest-dom';
import { webcrypto } from 'crypto';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem(key) {
      return store[key] || null;
    },
    setItem(key, value) {
      store[key] = value.toString();
    },
    removeItem(key) {
      delete store[key];
    },
    clear() {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn(() => Promise.resolve()),
  },
});

// ===== FIX: Properly mock crypto.subtle for Node.js environment =====
// Use Node.js webcrypto which has full implementation
if (!window.crypto?.subtle) {
  Object.defineProperty(window, 'crypto', {
    value: webcrypto,
  });
}

// Mock import.meta.env for tests
if (!import.meta.env) {
  import.meta.env = {};
}

// Clear localStorage before each test
beforeEach(() => {
  localStorage.clear();
});
