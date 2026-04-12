import * as authController from '../controllers/authController';
import * as paymentController from '../controllers/paymentController';
import * as adminController from '../controllers/adminController';

// ===== Route map =====
const routes = {
  'POST /auth/register': authController.register,
  'POST /auth/login': authController.login,
  'GET /auth/me': authController.me,
  'GET /payments/config': paymentController.getPaymentConfig,
  'POST /payments/submit': paymentController.submitPayment,
  'GET /payments/status': paymentController.checkPaymentStatus,
  'POST /admin/login': adminController.adminLogin,
  'GET /admin/stats': adminController.dashboardStats,
  'GET /admin/users': adminController.listUsers,
  'DELETE /admin/users/:id': adminController.deleteUser,
  'GET /admin/payments': adminController.listPayments,
  'PATCH /admin/payments/:id/verify': adminController.verifyPayment,
  'GET /admin/referrals': adminController.referralTree,
  'GET /admin/referrals/:id': adminController.getUserReferrals,
  'GET /admin/users/filter': adminController.filterUsersByReferral,
};

// ===== Create client =====
export function createClient() {
  let token = null;
  let user = null;

  function matchRoute(method, path) {
    const key = `${method.toUpperCase()} ${path}`;
    // Exact match
    if (routes[key]) return { handler: routes[key], params: {} };
    // Dynamic match
    for (const pattern of Object.keys(routes)) {
      const [pm, ...pp] = pattern.split(' ');
      const [rm, ...rp] = key.split(' ');
      if (pm !== rm || pp.length !== rp.length) continue;
      const params = {};
      let ok = true;
      for (let i = 0; i < pp.length; i++) {
        if (pp[i].startsWith(':')) params[pp[i].slice(1)] = rp[i];
        else if (pp[i] !== rp[i]) { ok = false; break; }
      }
      if (ok) return { handler: routes[pattern], params };
    }
    return null;
  }

  async function request(method, path, body) {
    const match = matchRoute(method, path.split('?')[0]);
    if (!match) {
      const err = new Error('Route not found: ' + method + ' ' + path);
      err.response = { status: 404, data: { message: 'Route not found' } };
      throw err;
    }

    // Parse query parameters from URL
    const queryIndex = path.indexOf('?');
    const query = queryIndex !== -1
      ? Object.fromEntries(new URLSearchParams(path.slice(queryIndex + 1)))
      : {};

    const req = {
      body: body || {},
      params: match.params,
      query,
      headers: {},
      file: body?.__file || null,
    };
    if (token) req.headers.authorization = 'Bearer ' + token;

    try {
      const res = await match.handler(req, user, token);
      if (res.status >= 400) {
        const err = new Error(res.data?.message || 'Error');
        err.response = { status: res.status, data: res.data };
        throw err;
      }
      return { data: res.data, status: res.status };
    } catch (e) {
      if (e.response) throw e;
      const err = new Error(e.message || 'Server error');
      err.response = { status: e.status || 500, data: { message: e.message || 'Server error' } };
      throw err;
    }
  }

  return {
    get(path) { return request('GET', path, null); },
    post(path, body) { return request('POST', path, body); },
    patch(path, body) { return request('PATCH', path, body); },
    delete(path) { return request('DELETE', path, null); },
    // Internal setters
    _setToken(t) { token = t; },
    _setUser(u) { user = u; },
  };
}

export const publicApi = createClient();
export const userApi = createClient();
export const adminApi = createClient();

// Helpers
export function setClientUserToken(client, t) { client._setToken(t); }
export function setClientAdminToken(client, t) { client._setToken(t); }
export function setClientUser(client, u) { client._setUser(u); }

// Aliases for backward compatibility
export const attachUserToken = setClientUserToken;
export const attachAdminToken = setClientAdminToken;
