// Agentic Web — agent data for 1401 nodes (indices 0–1400)
// Index 1400 is always the current user node (USER_IDX).
// Real named agents come from src/data/real_agents.json — edit that file to update.

import REAL_AGENTS from '../data/real_agents.json';

const PREFIXES = [
  'ARI','NOX','VED','ORI','LUM','SOR','ECH','FLU','NOV','ZAR',
  'KAI','REX','MIR','DSK','LYR','JAD','PIN','CRS','WAV','ISL',
  'AXE','BYR','CEL','DYN','EVA','FAR','GYR','HAL','IXI','JOV',
  'KUL','LOR','MYX','NEB','OXY','PYR','QUA','RYL','SYN','TOR',
  'URN','VEX','WYN','XEN','YOR','ZEN','ALT','BEX','CYR','DAX',
];
const SUFFIXES = [
  'A','O','IX','ON','AR','EN','IS','RA','EX','OS',
  'AN','UR','IN','AL','AX','OR','EL','IK','YN','AV',
  'OX','EM','IT','RO','US','IA','EK','UL','AD','OT',
];

const EXPERT_ICONS  = ['🔮','🧬','⚡','🌀','💎','🔬','🌌','🧠'];
const COMM_ICONS    = ['🌊','🌿','💫','🎯','🌟','💡','🎪','🔵'];
const NEW_ICONS     = ['✨','🌱','○','◈','·','▸','◦','∘'];

// Seeded xorshift32 — stable names across reloads
function sr(seed) {
  let x = (seed ^ 0xdeadbeef) >>> 0;
  x ^= x << 13; x ^= x >> 17; x ^= x << 5;
  return (x >>> 0) / 0xffffffff;
}

function pickIcon(type, idx) {
  if (type === 2) return EXPERT_ICONS[Math.floor(sr(idx * 7 + 1) * EXPERT_ICONS.length)];
  if (type === 1) return COMM_ICONS[Math.floor(sr(idx * 7 + 2) * COMM_ICONS.length)];
  if (type === 3) return '★';
  return NEW_ICONS[Math.floor(sr(idx * 7 + 3) * NEW_ICONS.length)];
}

function makeName(idx) {
  const pi = Math.floor(sr(idx * 3 + 11) * PREFIXES.length);
  const si = Math.floor(sr(idx * 3 + 17) * SUFFIXES.length);
  return PREFIXES[pi] + SUFFIXES[si];
}

// Build the full array
const _agents = [];

// Named agents from real_agents.json (fill indices 0 … N-1)
for (let i = 0; i < REAL_AGENTS.length; i++) {
  _agents.push({ idx: i, ...REAL_AGENTS[i] });
}

// Procedural agents fill the rest up to index 1399; type filled after scene mount
for (let i = REAL_AGENTS.length; i < 1400; i++) {
  const name = makeName(i);
  _agents.push({
    idx: i,
    name,
    fullName: name,
    type: null, // filled from scene.getGraphData().nodeKinds after mount
    icon: null, // filled after type is known
    bio: null,
    score: Math.floor(sr(i * 13 + 7) * 380) + 10,
  });
}

// User node (idx 1400) — name injected at runtime
_agents.push({
  idx: 1400,
  name: 'YOU',
  fullName: 'YOU · just arrived',
  type: 3,
  icon: '★',
  bio: "That's you. Welcome to the web.",
  score: 100,
});

export const AGENTS = _agents;
export const USER_IDX = 1400;

// Fill procedural agent icons/bios once types are known (call after scene.getGraphData())
export function hydrateAgents(nodeKinds) {
  for (let i = REAL_AGENTS.length; i < 1400; i++) {
    const a = AGENTS[i];
    if (a.type === null) {
      a.type = nodeKinds[i] ?? 0;
      a.icon = pickIcon(a.type, i);
      const t = a.type;
      const rolePool = t === 2
        ? ['Expert','Researcher','Founder','Strategist','Mentor']
        : t === 1
        ? ['Explorer','Builder','Collaborator','Community Node','Connector']
        : ['Newcomer','Seeker','Learner','Wanderer','Observer'];
      a.fullName = `${a.name} · ${rolePool[Math.floor(sr(i * 5 + 3) * rolePool.length)]}`;
      a.bio = `Node #${i}. ${a.fullName.split('·')[1]?.trim()} in the UniFund web.`;
    }
  }
}

// Update user agent name
export function setUserName(name) {
  AGENTS[USER_IDX].name = name;
  AGENTS[USER_IDX].fullName = `${name} · YOU`;
}

// ---------- BFS path finding ----------
export function bfsPath(adjacency, fromIdx, toIdx) {
  if (fromIdx === toIdx) return [fromIdx];
  const n = adjacency.length;
  const visited = new Uint8Array(n);
  const parent = new Int32Array(n).fill(-1);
  const queue = [fromIdx];
  visited[fromIdx] = 1;
  let found = false;
  while (queue.length) {
    const cur = queue.shift();
    if (cur === toIdx) { found = true; break; }
    for (const nb of adjacency[cur]) {
      if (!visited[nb]) {
        visited[nb] = 1;
        parent[nb] = cur;
        queue.push(nb);
      }
    }
  }
  if (!found) return null;
  const path = [];
  let c = toIdx;
  while (c !== -1) { path.unshift(c); c = parent[c]; }
  return path[0] === fromIdx ? path : null;
}

export function pathToEdgeIndices(path, connEdgeMap) {
  const edges = [];
  for (let i = 0; i < path.length - 1; i++) {
    const a = Math.min(path[i], path[i + 1]);
    const b = Math.max(path[i], path[i + 1]);
    const key = a * 10000 + b;
    const ci = connEdgeMap.get(key);
    if (ci !== undefined) edges.push(ci);
  }
  return edges;
}
