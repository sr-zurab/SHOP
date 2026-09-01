const BASE_URL = '/api';

export function authFetch(url, options = {}) {
  const token = localStorage.getItem('access');
  return fetch(`${BASE_URL}${url}`, {
    ...options,
    credentials: 'include', // для анонимной сессионной cookie
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

export async function parseJsonOrThrow(res, fallbackMessage) {
  if (!res.ok) {
    const errorResponse = await res.json().catch(() => ({}));
    console.error(fallbackMessage, errorResponse);
    throw new Error(errorResponse.detail || fallbackMessage);
  }
  return res.json();
}