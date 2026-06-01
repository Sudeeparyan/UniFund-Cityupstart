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

// ── Developer (unauthenticated login, then dev-token requests) ────────────────
function getDevToken() {
  return localStorage.getItem('unimind_dev_token');
}

function devHeaders() {
  const token = getDevToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function devRequest(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: devHeaders(),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

export async function devLogin(email, password) {
  const res = await fetch(`${BASE}/api/dev/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Invalid credentials' }));
    throw new Error(err.detail || 'Invalid credentials');
  }
  return res.json();
}

export const getDevLLMStats    = ()        => devRequest('GET',    '/api/dev/llm/stats');
export const getDevLLMRecent   = ()        => devRequest('GET',    '/api/dev/llm/recent');
export const getDevLLMHourly   = ()        => devRequest('GET',    '/api/dev/llm/hourly');
export const getDevFunnel      = ()        => devRequest('GET',    '/api/dev/funnel');
export const getDevUsers       = ()        => devRequest('GET',    '/api/dev/users');
export const clearDevUser      = (id)      => devRequest('POST',   `/api/dev/users/${id}/clear`);
export const suspendDevUser    = (id)      => devRequest('POST',   `/api/dev/users/${id}/suspend`);
export const deleteDevPost     = (id)      => devRequest('DELETE', `/api/dev/posts/${id}`);
export const broadcastMessage  = (content) => devRequest('POST',   '/api/dev/broadcast', { content });
export const getDevFlags       = ()        => devRequest('GET',    '/api/dev/flags');
export const updateDevFlags    = (flags)   => devRequest('POST',   '/api/dev/flags', flags);
export const getDevSimStats    = ()        => devRequest('GET',    '/api/dev/simulations/stats');
export const getDevSimRecent   = ()        => devRequest('GET',    '/api/dev/simulations/recent');
export const getDevSimDaily    = ()        => devRequest('GET',    '/api/dev/simulations/daily');
export const getDevCommunity   = ()        => devRequest('GET',    '/api/dev/community/stats');
