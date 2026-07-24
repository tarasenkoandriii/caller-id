const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.reload();
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || 'Ошибка запроса');
  }
  return data;
}

export const api = {
  login: (email: string, password: string) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  loginWithGoogle: (idToken: string) =>
    request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    }),

  loginWithTelegram: (data: unknown) =>
    request('/auth/telegram', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getStatus: () => request('/pool/status'),

  getNumbers: () => request('/pool/numbers'),

  orderNumber: (provider: string, number?: string) =>
    request('/pool/numbers/order', {
      method: 'POST',
      body: JSON.stringify({ provider, number }),
    }),

  getAdmins: () => request('/admins'),

  getVoices: () => request('/voiceovers/voices'),

  getVoiceovers: () => request('/voiceovers'),

  createVoiceover: (text: string, voiceId: string, voiceName?: string) =>
    request('/voiceovers', {
      method: 'POST',
      body: JSON.stringify({ text, voiceId, voiceName }),
    }),

  testCall: (toNumber: string, voiceoverId?: string) =>
    request('/calls/test', {
      method: 'POST',
      body: JSON.stringify({ toNumber, voiceoverId }),
    }),

  getCallLogs: () => request('/calls/logs'),

  getTelnyxAccounts: () => request('/telnyx-accounts'),

  createTelnyxAccount: (label: string, apiKey: string, connectionId: string) =>
    request('/telnyx-accounts', {
      method: 'POST',
      body: JSON.stringify({ label, apiKey, connectionId }),
    }),

  setTelnyxAccountEnabled: (id: string, enabled: boolean) =>
    request(`/telnyx-accounts/${id}/enabled`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    }),

  setActiveTelnyxAccount: (id: string) =>
    request(`/telnyx-accounts/${id}/active`, { method: 'PATCH' }),

  getTelnyxVpnState: () => request('/telnyx-accounts/vpn'),

  setTelnyxVpnEnabled: (enabled: boolean) =>
    request('/telnyx-accounts/vpn/enabled', {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    }),

  deleteTelnyxAccount: (id: string) =>
    request(`/telnyx-accounts/${id}`, { method: 'DELETE' }),
};

export function saveToken(token: string) {
  localStorage.setItem('token', token);
}

export function isAuthenticated() {
  return !!getToken();
}

export function logout() {
  localStorage.removeItem('token');
  window.location.reload();
}
