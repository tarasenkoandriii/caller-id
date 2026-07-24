const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const TOKEN_KEY = 'client_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
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
    localStorage.removeItem(TOKEN_KEY);
    window.location.reload();
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || 'Ошибка запроса');
  }
  return data;
}

export const clientApi = {
  loginWithGoogle: (idToken: string) =>
    request('/client-auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    }),

  loginWithTelegram: (data: unknown) =>
    request('/client-auth/telegram', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  loginWithTelegramWebApp: (initData: string) =>
    request('/client-auth/telegram-webapp', {
      method: 'POST',
      body: JSON.stringify({ initData }),
    }),

  /** Один запрос при открытии Telegram Mini App — логин + всё начальное состояние сразу */
  bootstrap: (initData: string) =>
    request('/client-bootstrap', {
      method: 'POST',
      body: JSON.stringify({ initData }),
    }),

  getContacts: () => request('/client-contacts'),
  addContact: (phoneNumber: string) =>
    request('/client-contacts', { method: 'POST', body: JSON.stringify({ phoneNumber }) }),
  removeContact: (id: string) => request(`/client-contacts/${id}`, { method: 'DELETE' }),

  getVoices: () => request('/client-voiceovers/voices'),
  getVoiceovers: () => request('/client-voiceovers'),
  createVoiceover: (text: string, voiceId: string, voiceName?: string) =>
    request('/client-voiceovers', {
      method: 'POST',
      body: JSON.stringify({ text, voiceId, voiceName }),
    }),

  getCampaigns: () => request('/client-campaigns'),
  createCampaign: (params: {
    voiceoverId: string;
    scheduleType: string;
    scheduleAt?: string;
    intervalMinutes?: number;
  }) => request('/client-campaigns', { method: 'POST', body: JSON.stringify(params) }),
  cancelCampaign: (id: string) => request(`/client-campaigns/${id}`, { method: 'DELETE' }),

  getCallLogs: () => request('/client-campaigns/logs'),
};

export function saveClientToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function isClientAuthenticated() {
  return !!getToken();
}

export function clientLogout() {
  localStorage.removeItem(TOKEN_KEY);
  window.location.reload();
}
