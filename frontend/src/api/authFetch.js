const BASE_URL = '/api';

async function refreshAccessToken() {
  const refresh = localStorage.getItem('refresh');
  if (!refresh) return null;

  try {
    const res = await fetch(`${BASE_URL}/auth/token/refresh/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });

    if (!res.ok) {
      localStorage.removeItem('access');
      localStorage.removeItem('refresh');
      return null;
    }

    const data = await res.json();
    localStorage.setItem('access', data.access);
    return data.access;
  } catch {
    return null;
  }
}

export async function authFetch(url, options = {}) {
  const token = localStorage.getItem('access');

  const doFetch = (accessToken) =>
    fetch(`${BASE_URL}${url}`, {
      ...options,
      credentials: 'include', // для анонимной сессионной cookie
      headers: {
        ...(options.headers || {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    });

  let res = await doFetch(token);

  // Если access протух — пробуем обновить один раз и повторить запрос
  if (res.status === 401 && token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await doFetch(newToken);
    }
  }

  return res;
}

export async function parseJsonOrThrow(res, fallbackMessage) {
  if (!res.ok) {
    const errorResponse = await res.json().catch(() => ({}));
    console.error(fallbackMessage, errorResponse);
    throw new Error(errorResponse.detail || fallbackMessage);
  }
  return res.json();
}