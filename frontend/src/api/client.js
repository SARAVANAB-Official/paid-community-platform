import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

function createClient() {
  return axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const userApi = createClient();
export const adminApi = createClient();
export const publicApi = createClient();

export function attachUserToken(client, token) {
  if (token) {
    client.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete client.defaults.headers.common.Authorization;
  }
}

export function attachAdminToken(client, token) {
  if (token) {
    client.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete client.defaults.headers.common.Authorization;
  }
}
