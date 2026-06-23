const BASE = 'http://localhost:8000';

function getToken() {
  return localStorage.getItem('unifund_token');
}

function authHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// A stale/invalid/expired token shouldn't strand the app on the offline
// fallback — silently mint a fresh guest token and retry once.
const AUTH_ENDPOINTS = ['/api/auth/guest', '/api/auth/login', '/api/auth/signup'];
let refreshPromise = null;

async function refreshGuestToken() {
  if (!refreshPromise) {
    refreshPromise = fetch(BASE + '/api/auth/guest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(res => {
        if (!res.ok) throw new Error('Guest login failed');
        return res.json();
      })
      .then(({ access_token }) => {
        localStorage.setItem('unifund_token', access_token);
        return access_token;
      })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

async function request(method, path, body, _retried) {
  const res = await fetch(BASE + path, {
    method,
    headers: authHeaders(),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (res.status === 401 && !_retried && !AUTH_ENDPOINTS.includes(path)) {
    await refreshGuestToken();
    return request(method, path, body, true);
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const guestLogin = () => request('POST', '/api/auth/guest');

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

export const getChatChunks = () => request('GET', '/api/chatbot/chunks');

export const clearChatHistory = () => request('DELETE', '/api/chatbot/history');

export const deleteChatMessage = (id) => request('DELETE', `/api/chatbot/history/${id}`);

export const enhanceContent = (content) =>
  request('POST', '/api/chatbot/enhance', { content });

export const uploadFile = async (file, _retried) => {
  const token = localStorage.getItem('unifund_token');
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/api/chatbot/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (res.status === 401 && !_retried) {
    await refreshGuestToken();
    return uploadFile(file, true);
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(err.detail || 'Upload failed');
  }
  return res.json();
};

export const saveKnowledge = (content, category) =>
  request('POST', '/api/chatbot/knowledge', { content, category });

// ── Runway ────────────────────────────────────────────────────────────────────
export const getRunwayProfile  = ()            => request('GET',    '/api/runway/profile');
export const updateRunwayProfile = (balance)   => request('PUT',    '/api/runway/profile', { savings_balance: balance });

export const getRunwayIncome   = ()            => request('GET',    '/api/runway/income');
export const addRunwayIncome   = (body)        => request('POST',   '/api/runway/income', body);
export const updateRunwayIncome = (id, body)   => request('PUT',    `/api/runway/income/${id}`, body);
export const deleteRunwayIncome = (id)         => request('DELETE', `/api/runway/income/${id}`);

export const getRunwayCategories = ()          => request('GET',    '/api/runway/categories');

export const getRunwayTransactions = ()        => request('GET',    '/api/runway/transactions');

export const getRunwayAccounts = ()            => request('GET',    '/api/runway/accounts');
export const addRunwayAccount  = (body)        => request('POST',   '/api/runway/accounts', body);
export const deleteRunwayAccount = (id)        => request('DELETE', `/api/runway/accounts/${id}`);

export const getRunwayCharts   = ()            => request('GET',    '/api/runway/charts');

export const generateTransactionTip = (merchant, category, amount, dateLabel) =>
  request('POST', '/api/runway/tip', { merchant, category, amount, date_label: dateLabel });

export const runRunwaySimulate = async (monthlyIncome, expenses) => {
  const data = await request('POST', '/api/runway/simulate', {
    monthly_income: monthlyIncome,
    expenses: expenses.map(e => ({ id: e.id, label: e.label, amount: e.amount })),
  });
  // Map snake_case → camelCase to match the existing computePlan() shape
  return {
    monthlyIncome:  data.monthly_income,
    totalSpend:     data.total_spend,
    surplus:        data.surplus,
    savingsActual:  data.savings_actual,
    targetSavings:  data.target_savings,
    split:          data.split,
    recommendations: data.recommendations,
    yearActual:     data.year_actual,
    yearTarget:     data.year_target,
    knowledgeCount: data.knowledge_count,
    personalised:   data.personalised,
  };
};

// ── Agent Studio ──────────────────────────────────────────────────────────────
export const runStudioPipeline = (task, jobDescription) =>
  request('POST', '/api/studio/run', { task, job_description: jobDescription });

// ── Expert Council (multi-agent) ───────────────────────────────────────────────
// Routes a question to the most relevant expert agents, runs them in parallel
// on the cheap tier, and returns one fused answer + each expert's contribution
// + agent_logs that drive the SpaceArena animation.
export const runAgentCouncil = (query, k = 3) =>
  request('POST', '/api/agent/council', { query, k });

export const getExperts = () => request('GET', '/api/agent/experts');

// Debate mode: ADVOCATE (optimist) vs SKEPTIC (red team) → ARIA judges.
export const runAgentDebate = (query) =>
  request('POST', '/api/agent/debate', { query });

// MENTOR-MATCH: real network agents most similar to you.
export const getMentors = (k = 3) => request('GET', `/api/agent/mentors?k=${k}`);

// Featured human persona agents (seeded, real, matchable).
export const getFeaturedNetwork = () => request('GET', '/api/agent/network');

// ── Developer (unauthenticated login, then dev-token requests) ────────────────
function getDevToken() {
  return localStorage.getItem('unifund_dev_token');
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

export const getChunkEvalStats = ()    => devRequest('GET',  '/api/dev/chunks/stats');
export const getChunkWorst     = ()    => devRequest('GET',  '/api/dev/chunks/worst');
export const getChunkBest      = ()    => devRequest('GET',  '/api/dev/chunks/best');
export const getChunkAll       = ()    => devRequest('GET',  '/api/dev/chunks/all');
export const getChunksByUser   = ()    => devRequest('GET',  '/api/dev/chunks/by-user');
export const evalOneChunk      = (id)  => devRequest('POST', `/api/dev/chunks/${id}/eval`);
export const evalAllPending    = ()    => devRequest('POST', '/api/dev/chunks/eval-all');

export const getSimEvalStats   = ()    => devRequest('GET',  '/api/dev/simulations/eval/stats');
export const getSimEvalRecent  = ()    => devRequest('GET',  '/api/dev/simulations/eval/recent');
export const getEnhanceStats   = ()    => devRequest('GET',  '/api/dev/enhance/stats');
export const getEnhanceLogs    = ()    => devRequest('GET',  '/api/dev/enhance/logs');
