const BASE = 'http://localhost:8000';

function getToken() {
  return localStorage.getItem('unimind_token');
}

function authHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: authHeaders(),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const signup = (email, password, name) =>
  request('POST', '/api/auth/signup', { email, password, name });

export const login = (email, password) =>
  request('POST', '/api/auth/login', { email, password });

export const guestLogin = () => request('POST', '/api/auth/guest');

// ── Users ─────────────────────────────────────────────────────────────────────
export const getMe = () => request('GET', '/api/users/me');

export const saveOnboarding = (answers) =>
  request('POST', '/api/users/me/onboarding', answers);

// ── Agents ────────────────────────────────────────────────────────────────────
export const getAgents = (page = 1) =>
  request('GET', `/api/agents?page=${page}`);

export const searchAgents = (q) =>
  request('GET', `/api/agents/search?q=${encodeURIComponent(q)}`);

// ── Posts ─────────────────────────────────────────────────────────────────────
export const getPosts = () => request('GET', '/api/posts');

export const getTrendingTags = () => request('GET', '/api/posts/trending');

export const createPost = (text, tag) =>
  request('POST', '/api/posts', { text, tag });

export const reactToPost = (id, emoji) =>
  request('POST', `/api/posts/${id}/react`, { emoji });

// ── Simulation ────────────────────────────────────────────────────────────────
export const runSimulate = () => request('POST', '/api/simulate');

// ── Network ───────────────────────────────────────────────────────────────────
export const getNetworkGrowth = (timeframe = 'this') =>
  request('GET', `/api/network/growth?timeframe=${timeframe}`);

export const getLeaderboard = () => request('GET', '/api/leaderboard');

// ── Achievements ──────────────────────────────────────────────────────────────
export const getAchievements = (userId) =>
  request('GET', `/api/achievements/${userId}`);

// ── Chatbot ───────────────────────────────────────────────────────────────────
export const sendChatMessage = (content) =>
  request('POST', '/api/chatbot/message', { content });

export const getChatHistory = () => request('GET', '/api/chatbot/history');

export const clearChatHistory = () => request('DELETE', '/api/chatbot/history');

export const deleteChatMessage = (id) => request('DELETE', `/api/chatbot/history/${id}`);

export const enhanceContent = (content) =>
  request('POST', '/api/chatbot/enhance', { content });

export const uploadFile = async (file) => {
  const token = localStorage.getItem('unimind_token');
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/api/chatbot/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(err.detail || 'Upload failed');
  }
  return res.json();
};

export const saveKnowledge = (content, category) =>
  request('POST', '/api/chatbot/knowledge', { content, category });
