const TOKEN_KEY = 'prepsense_token';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function storeToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const headers = {};

  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  let payload;
  const contentType = response.headers.get('content-type') || '';
  try {
    payload = contentType.includes('application/json')
      ? await response.json()
      : null;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.success) {
    const message = response.status === 429
      ? 'AI requests are temporarily rate limited. Please wait a few minutes before trying again.'
      : payload?.message || 'The API server is not available right now. Check that the backend is running and connected to MongoDB.';

    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  if (payload.token) {
    return { ...(payload.data || {}), token: payload.token };
  }

  return payload.data;
}
