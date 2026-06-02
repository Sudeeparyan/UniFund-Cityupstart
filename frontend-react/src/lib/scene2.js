// UniFund Agentic Web — cinematic neural cosmos v2
// API: createUniFundWeb(container) -> { destroy, runSimulation, getCoreScreenPos, onPhase, onCoreHover, onCoreClick, onPortal, resetSimulation, setTimeframe }

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// ---------- Helpers ----------
function rand(a, b) {
  return a + Math.random() * (b - a);
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}
function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}
function easeOut2(t) {
  return 1 - Math.pow(1 - t, 2);
}

// Radial glow texture (cached)
let _glowTex = null;
function makeGlowTexture() {
  if (_glowTex) return _glowTex;
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  g.addColorStop(0.0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.55)");
  g.addColorStop(0.55, "rgba(255,255,255,0.12)");
  g.addColorStop(1.0, "rgba(255,255,255,0.0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  _glowTex = new THREE.CanvasTexture(c);
  _glowTex.minFilter = THREE.LinearFilter;
  _glowTex.magFilter = THREE.LinearFilter;
  return _glowTex;
}

function makeStarTexture() {
  const size = 64;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  g.addColorStop(0.0, "rgba(255,255,255,1)");
  g.addColorStop(0.3, "rgba(255,255,255,0.35)");
  g.addColorStop(1.0, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

export function createUniFundWeb(container) {
  const W = () => container.clientWidth || window.innerWidth;
  const H = () => container.clientHeight || window.innerHeight;
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);

  // ---------- Renderer ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(W(), H());
  renderer.setClearColor(0x02030a, 1);
  container.appendChild(renderer.domElement);
  renderer.domElement.style.display = "block";
  renderer.domElement.style.cursor = "default";

  // ---------- Scene / Camera ----------
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x02030a, 0.014);

  const camera = new THREE.PerspectiveCamera(58, W() / H(), 0.1, 400);
  camera.position.set(0, 0, 70);
  camera.lookAt(0, 0, 0);

  // ---------- Orbit controls ----------
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 12;
  controls.maxDistance = 140;
  controls.enabled = false; // disabled until entry animation finishes

  // ---------- Fly-to animation state ----------
  let _flyActive = false, _flyT = 0;
  const _flyTarget = new THREE.Vector3();
  const _flyFrom = new THREE.Vector3();

  // ---------- Post-processing bloom ----------
  let composer, bloomPass;
  let bloomTarget = 0.8,
    currentBloom = 0.8;
  if (!isMobile) {
    bloomPass = new UnrealBloomPass(
      new THREE.Vector2(W() * 0.75, H() * 0.75),
      0.8, // strength
      0.45, // radius
      0.12, // threshold (low = more things bloom)
    );
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(bloomPass);
  }

  // ---------- Starfield ----------
  const starGeom = new THREE.BufferGeometry();
  const STARS = 1400;
  const starPos = new Float32Array(STARS * 3);
  const starCol = new Float32Array(STARS * 3);
  for (let i = 0; i < STARS; i++) {
    const r = rand(60, 180),
      theta = Math.random() * Math.PI * 2,
      phi = Math.acos(2 * Math.random() - 1);
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPos[i * 3 + 2] = r * Math.cos(phi);
    const c = new THREE.Color().setHSL(
      0.55 + Math.random() * 0.15,
      0.4,
      0.6 + Math.random() * 0.3,
    );
    starCol[i * 3] = c.r;
    starCol[i * 3 + 1] = c.g;
    starCol[i * 3 + 2] = c.b;
  }
  starGeom.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  starGeom.setAttribute("color", new THREE.BufferAttribute(starCol, 3));
  const starMat = new THREE.PointsMaterial({
    size: 0.6,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    map: makeStarTexture(),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const stars = new THREE.Points(starGeom, starMat);
  scene.add(stars);

  // ---------- Floating dust ----------
  const dustGeom = new THREE.BufferGeometry();
  const DUST = 260;
  const dustPos = new Float32Array(DUST * 3);
  const dustVel = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) {
    dustPos[i * 3] = rand(-50, 50);
    dustPos[i * 3 + 1] = rand(-30, 30);
    dustPos[i * 3 + 2] = rand(-30, 30);
    dustVel[i * 3] = rand(-0.02, 0.02);
    dustVel[i * 3 + 1] = rand(-0.015, 0.015);
    dustVel[i * 3 + 2] = rand(-0.02, 0.02);
  }
  dustGeom.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    size: 0.5,
    color: 0xb6c4ff,
    transparent: true,
    opacity: 0.35,
    map: makeStarTexture(),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const dust = new THREE.Points(dustGeom, dustMat);
  scene.add(dust);

  // ---------- Nodes ----------
  const NODES = 1400;
  const nodePositions = [],
    nodeColors = [],
    nodeKind = [],
    nodePulsePhase = [],
    nodeBasePos = [],
    nodeSize = [];
  const COL_NEW = new THREE.Color(0xe3f2fd);
  const COL_COMM = new THREE.Color(0x4fc3f7);
  const COL_EXP = new THREE.Color(0xb388ff);
  const COL_USER = new THREE.Color(0xffd54f);

  function shellPos(rMin, rMax, flatten) {
    const r = lerp(rMin, rMax, Math.pow(Math.random(), 0.55));
    const theta = Math.random() * Math.PI * 2,
      phi = Math.acos(2 * Math.random() - 1);
    return new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta) * flatten,
      r * Math.cos(phi),
    );
  }

  for (let i = 0; i < NODES; i++) {
    const layer = Math.random();
    let p;
    if (layer < 0.55) p = shellPos(9, 22, 0.55);
    else if (layer < 0.85) p = shellPos(22, 36, 0.5);
    else p = shellPos(36, 52, 0.45);
    nodePositions.push(p);
    nodeBasePos.push(p.clone());
    const r = Math.random();
    let kind, col, sz;
    if (r < 0.18) {
      kind = 2;
      col = COL_EXP;
      sz = rand(0.55, 0.95);
    } else if (r < 0.62) {
      kind = 1;
      col = COL_COMM;
      sz = rand(0.4, 0.75);
    } else {
      kind = 0;
      col = COL_NEW;
      sz = rand(0.3, 0.55);
    }
    nodeKind.push(kind);
    nodeColors.push(col);
    nodeSize.push(sz);
    nodePulsePhase.push(Math.random() * Math.PI * 2);
  }

  const USER_IDX = NODES;
  const userTargetPos = shellPos(14, 18, 0.55);
  nodePositions.push(userTargetPos.clone());
  nodeBasePos.push(userTargetPos.clone());
  nodeKind.push(3);
  nodeColors.push(COL_USER);
  nodeSize.push(1.4);
  nodePulsePhase.push(0);

  const TOTAL_NODES = NODES + 1;

  // Precompute distance from center for staggered reveal
  const nodeDistNorm = new Float32Array(TOTAL_NODES);
  let maxDist = 0;
  for (let i = 0; i < TOTAL_NODES; i++) {
    const d = nodeBasePos[i].length();
    if (d > maxDist) maxDist = d;
  }
  for (let i = 0; i < TOTAL_NODES; i++)
    nodeDistNorm[i] = nodeBasePos[i].length() / maxDist;

  const nodePosArr = new Float32Array(TOTAL_NODES * 3);
  const nodeColArr = new Float32Array(TOTAL_NODES * 3);
  const nodeSizeArr = new Float32Array(TOTAL_NODES);
  for (let i = 0; i < TOTAL_NODES; i++) {
    nodePosArr[i * 3] = nodePositions[i].x;
    nodePosArr[i * 3 + 1] = nodePositions[i].y;
    nodePosArr[i * 3 + 2] = nodePositions[i].z;
    nodeColArr[i * 3] = nodeColors[i].r;
    nodeColArr[i * 3 + 1] = nodeColors[i].g;
    nodeColArr[i * 3 + 2] = nodeColors[i].b;
    nodeSizeArr[i] = nodeSize[i];
  }
  const nodeGeom = new THREE.BufferGeometry();
  nodeGeom.setAttribute("position", new THREE.BufferAttribute(nodePosArr, 3));
  nodeGeom.setAttribute("color", new THREE.BufferAttribute(nodeColArr, 3));
  nodeGeom.setAttribute("aSize", new THREE.BufferAttribute(nodeSizeArr, 1));
  nodeGeom.setAttribute(
    "aPhase",
    new THREE.BufferAttribute(new Float32Array(nodePulsePhase), 1),
  );

  // Per-node highlight buffer (0=normal, 1=highlighted, 0.5=path neighbor)
  const nodeHighlightArr = new Float32Array(TOTAL_NODES);
  nodeGeom.setAttribute('aHighlight', new THREE.BufferAttribute(nodeHighlightArr, 1));

  const nodeMat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: makeGlowTexture() },
      uPx: { value: renderer.getPixelRatio() },
      uTime: { value: 0 },
      uGlobalPulse: { value: 0 },
      uHighlightT: { value: 0 },
    },
    vertexShader: `
      attribute float aSize;
      attribute float aPhase;
      attribute float aHighlight;
      varying vec3 vColor;
      varying float vPulse;
      uniform float uTime;
      uniform float uGlobalPulse;
      uniform float uPx;
      uniform float uHighlightT;
      void main() {
        vColor = color;
        float pulse = 0.65 + 0.35 * sin(uTime * 1.6 + aPhase);
        float dim = 1.0 - uHighlightT * (1.0 - max(aHighlight, 0.15));
        vPulse = pulse * dim;
        float boost = 1.0 + aHighlight * 0.9 * (0.5 + 0.5 * sin(uTime * 4.0));
        float size = aSize * (1.0 + 0.6 * uGlobalPulse) * boost;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = size * 240.0 / -mv.z * uPx * (0.7 + 0.5 * pulse);
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      varying vec3 vColor;
      varying float vPulse;
      void main() {
        vec2 uv = gl_PointCoord;
        vec4 tex = texture2D(uMap, uv);
        if (tex.a < 0.02) discard;
        vec3 col = vColor * (1.4 + 0.6 * vPulse);
        gl_FragColor = vec4(col, tex.a);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexColors: true,
  });

  const nodesObj = new THREE.Points(nodeGeom, nodeMat);
  scene.add(nodesObj);

  // ---------- Connections ----------
  const CONNECTIONS_PER_NODE = 2;
  const connections = [];
  {
    const cell = 5,
      grid = new Map();
    function key(ix, iy, iz) {
      return ix + "," + iy + "," + iz;
    }
    for (let i = 0; i < NODES; i++) {
      const p = nodePositions[i];
      const k = key(
        Math.floor(p.x / cell),
        Math.floor(p.y / cell),
        Math.floor(p.z / cell),
      );
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push(i);
    }
    for (let i = 0; i < NODES; i++) {
      const p = nodePositions[i];
      const ix = Math.floor(p.x / cell),
        iy = Math.floor(p.y / cell),
        iz = Math.floor(p.z / cell);
      const cand = [];
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++)
          for (let dz = -1; dz <= 1; dz++) {
            const arr = grid.get(key(ix + dx, iy + dy, iz + dz));
            if (arr) for (const j of arr) if (j !== i) cand.push(j);
          }
      cand.sort(
        (a, b) =>
          nodePositions[a].distanceToSquared(p) -
          nodePositions[b].distanceToSquared(p),
      );
      const slots = Math.min(
        CONNECTIONS_PER_NODE + (Math.random() < 0.25 ? 1 : 0),
        cand.length,
      );
      for (let s = 0; s < slots; s++)
        if (cand[s] > i) connections.push([i, cand[s]]);
    }
  }

  // Connect user node to its 3 nearest regular nodes so BFS can reach it
  {
    const userPos = userTargetPos;
    const userCands = [];
    for (let j = 0; j < NODES; j++)
      userCands.push({ j, d: nodePositions[j].distanceToSquared(userPos) });
    userCands.sort((a, b) => a.d - b.d);
    for (let s = 0; s < Math.min(3, userCands.length); s++)
      connections.push([Math.min(USER_IDX, userCands[s].j), Math.max(USER_IDX, userCands[s].j)]);
  }

  // Adjacency list for BFS path finding
  const adjacency = Array.from({ length: TOTAL_NODES }, () => []);
  for (const [i, j] of connections) { adjacency[i].push(j); adjacency[j].push(i); }

  // Edge map: (min*10000+max) -> connection index, for path line highlighting
  const connEdgeMap = new Map();
  for (let c = 0; c < connections.length; c++) {
    const [i, j] = connections[c];
    connEdgeMap.set(Math.min(i, j) * 10000 + Math.max(i, j), c);
  }

  // Node reveal order for timeline scrubbing: inner nodes (closer to center) joined first
  const nodeRevealOrder = Array.from({ length: TOTAL_NODES }, (_, i) => i)
    .sort((a, b) => nodeBasePos[a].length() - nodeBasePos[b].length());

  // ---------- Filter state ----------
  // Indexed by nodeKind (0=New, 1=Community, 2=Expert, 3=User)
  const filterMask = [true, true, true, true];

  // ---------- Timeline visibility state ----------
  let timelineCutoff = TOTAL_NODES;
  const timelineVisibleSet = new Set(Array.from({ length: TOTAL_NODES }, (_, i) => i));

  // Per-connection: distance from origin for signal triggering
  const connTriggerDist = new Float32Array(connections.length);
  const connDistNorm = new Float32Array(connections.length); // normalized 0→1 for shader reveal
  let maxConnDist = 0;
  for (let c = 0; c < connections.length; c++) {
    const [i, j] = connections[c];
    const mid = new THREE.Vector3()
      .addVectors(nodeBasePos[i], nodeBasePos[j])
      .multiplyScalar(0.5);
    connTriggerDist[c] = mid.length();
    if (connTriggerDist[c] > maxConnDist) maxConnDist = connTriggerDist[c];
  }
  for (let c = 0; c < connections.length; c++) {
    // also use closer endpoint distance (inner node controls when line first reveals)
    connDistNorm[c] = Math.min(
      nodeDistNorm[connections[c][0]],
      nodeDistNorm[connections[c][1]],
    );
  }

  // Build line geometry with aReveal attribute
  const SEGS = 10;
  const lineVerts = new Float32Array(connections.length * SEGS * 2 * 3);
  const lineCols = new Float32Array(connections.length * SEGS * 2 * 3);
  const lineReveal = new Float32Array(connections.length * SEGS * 2); // one value per vertex
  const linePathArr = new Float32Array(connections.length * SEGS * 2); // 1=on highlighted path

  function rebuildLineGeometry() {
    let lv = 0;
    for (let c = 0; c < connections.length; c++) {
      const [i, j] = connections[c];
      const a = nodePositions[i],
        b = nodePositions[j];
      const mid = a.clone().add(b).multiplyScalar(0.5);
      const outward = mid
        .clone()
        .normalize()
        .multiplyScalar(mid.length() * 0.06 + 0.6);
      const ctrl = mid.clone().add(outward.multiplyScalar(0.25));
      const colA = nodeColors[i],
        colB = nodeColors[j];
      const prev = new THREE.Vector3(),
        cur = new THREE.Vector3();
      const rv = connDistNorm[c]; // reveal value for this connection
      for (let s = 0; s <= SEGS; s++) {
        const t = s / SEGS,
          u = 1 - t;
        cur.set(
          u * u * a.x + 2 * u * t * ctrl.x + t * t * b.x,
          u * u * a.y + 2 * u * t * ctrl.y + t * t * b.y,
          u * u * a.z + 2 * u * t * ctrl.z + t * t * b.z,
        );
        if (s > 0) {
          lineVerts[lv * 3] = prev.x;
          lineVerts[lv * 3 + 1] = prev.y;
          lineVerts[lv * 3 + 2] = prev.z;
          const cA = new THREE.Color().lerpColors(colA, colB, (s - 1) / SEGS);
          lineCols[lv * 3] = cA.r;
          lineCols[lv * 3 + 1] = cA.g;
          lineCols[lv * 3 + 2] = cA.b;
          lineReveal[lv] = rv;
          lv++;
          lineVerts[lv * 3] = cur.x;
          lineVerts[lv * 3 + 1] = cur.y;
          lineVerts[lv * 3 + 2] = cur.z;
          const cB = new THREE.Color().lerpColors(colA, colB, s / SEGS);
          lineCols[lv * 3] = cB.r;
          lineCols[lv * 3 + 1] = cB.g;
          lineCols[lv * 3 + 2] = cB.b;
          lineReveal[lv] = rv;
          lv++;
        }
        prev.copy(cur);
      }
    }
  }
  rebuildLineGeometry();

  const lineGeom = new THREE.BufferGeometry();
  lineGeom.setAttribute("position", new THREE.BufferAttribute(lineVerts, 3));
  lineGeom.setAttribute("color", new THREE.BufferAttribute(lineCols, 3));
  lineGeom.setAttribute("aReveal", new THREE.BufferAttribute(lineReveal, 1));
  lineGeom.setAttribute("aIsPath", new THREE.BufferAttribute(linePathArr, 1));

  const lineHideArr = new Float32Array(connections.length * SEGS * 2);
  lineGeom.setAttribute('aHideEdge', new THREE.BufferAttribute(lineHideArr, 1));

  // ShaderMaterial for lines — supports per-connection wave reveal + signal glow
  const lineShaderMat = new THREE.ShaderMaterial({
    uniforms: {
      uLineOpacity: { value: 0.0 },
      uWebRevealT: { value: 0.0 }, // 0→1 entry reveal
      uSignalT: { value: 0.0 }, // 0→1 wave front position
      uSignalMode: { value: 0.0 }, // 0=off, 0→1 during Phase 1
      uPathMode: { value: 0.0 }, // 1=path highlight active
    },
    vertexShader: `
      attribute float aReveal;
      attribute float aIsPath;
      attribute float aHideEdge;
      varying vec3 vColor;
      varying float vReveal;
      varying float vIsPath;
      varying float vHideEdge;
      void main() {
        vColor    = color;
        vReveal   = aReveal;
        vIsPath   = aIsPath;
        vHideEdge = aHideEdge;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vReveal;
      varying float vIsPath;
      varying float vHideEdge;
      uniform float uLineOpacity;
      uniform float uWebRevealT;
      uniform float uSignalT;
      uniform float uSignalMode;
      uniform float uPathMode;
      void main() {
        if (vHideEdge > 0.5) discard;

        // Entry reveal wave: inner connections appear first
        float revealFactor = clamp((uWebRevealT - vReveal*0.5) / 0.5, 0.0, 1.0);
        revealFactor = pow(revealFactor, 0.6);
        float alpha = uLineOpacity * revealFactor;

        // Signal wave glow (Phase 1)
        float signalGlow = 0.0;
        if (uSignalMode > 0.001) {
          float frontDist = abs(uSignalT - vReveal);
          float glow = clamp(1.0 - frontDist / 0.11, 0.0, 1.0);
          glow = pow(glow, 1.5);
          signalGlow = glow * uSignalMode;
        }

        // Path highlight
        float pathBoost = uPathMode > 0.001 ? (vIsPath > 0.5 ? 3.5 : 0.18) : 1.0;

        vec3 finalCol = vColor * (1.0 + signalGlow * 4.0);
        float finalAlpha = (alpha + signalGlow * 0.55) * pathBoost;
        if (finalAlpha < 0.004) discard;
        gl_FragColor = vec4(finalCol, finalAlpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexColors: true,
  });

  const lines = new THREE.LineSegments(lineGeom, lineShaderMat);
  scene.add(lines);

  // ---------- Flow particles ----------
  const FLOW_COUNT = 220;
  const flowGeom = new THREE.BufferGeometry();
  const flowPos = new Float32Array(FLOW_COUNT * 3);
  const flowCol = new Float32Array(FLOW_COUNT * 3);
  const flowConn = new Int32Array(FLOW_COUNT);
  const flowT = new Float32Array(FLOW_COUNT);
  const flowSpeed = new Float32Array(FLOW_COUNT);
  for (let i = 0; i < FLOW_COUNT; i++) {
    flowConn[i] = Math.floor(Math.random() * connections.length);
    flowT[i] = Math.random();
    flowSpeed[i] = rand(0.0009, 0.0028);
    flowCol[i * 3] = 0.6;
    flowCol[i * 3 + 1] = 0.85;
    flowCol[i * 3 + 2] = 1.0;
  }
  flowGeom.setAttribute("position", new THREE.BufferAttribute(flowPos, 3));
  flowGeom.setAttribute("color", new THREE.BufferAttribute(flowCol, 3));
  const flowMat = new THREE.PointsMaterial({
    size: 0.45,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    map: makeGlowTexture(),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const flow = new THREE.Points(flowGeom, flowMat);
  scene.add(flow);
  let flowBoost = 0;

  function bezierPt(a, ctrl, b, t, out) {
    const u = 1 - t;
    out[0] = u * u * a.x + 2 * u * t * ctrl.x + t * t * b.x;
    out[1] = u * u * a.y + 2 * u * t * ctrl.y + t * t * b.y;
    out[2] = u * u * a.z + 2 * u * t * ctrl.z + t * t * b.z;
  }

  function getCtrl(a, b) {
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    const outward = mid
      .clone()
      .normalize()
      .multiplyScalar(mid.length() * 0.06 + 0.6);
    return mid.add(outward.multiplyScalar(0.25));
  }

  function updateFlow(dt) {
    const arr = flowGeom.attributes.position.array;
    const tmp = [0, 0, 0];
    for (let i = 0; i < FLOW_COUNT; i++) {
      flowT[i] += flowSpeed[i] * (1 + flowBoost * 8) * dt * 60;
      if (flowT[i] > 1) {
        flowT[i] = 0;
        flowConn[i] = Math.floor(Math.random() * connections.length);
      }
      const [iA, iB] = connections[flowConn[i]];
      bezierPt(
        nodePositions[iA],
        getCtrl(nodePositions[iA], nodePositions[iB]),
        nodePositions[iB],
        flowT[i],
        tmp,
      );
      arr[i * 3] = tmp[0];
      arr[i * 3 + 1] = tmp[1];
      arr[i * 3 + 2] = tmp[2];
    }
    flowGeom.attributes.position.needsUpdate = true;
  }

  // ---------- Signal particles (Phase 1) ----------
  const SIG_COUNT = 200;
  const sigGeom = new THREE.BufferGeometry();
  const sigPos = new Float32Array(SIG_COUNT * 3);
  const sigCol = new Float32Array(SIG_COUNT * 3);
  const sigConn = new Int32Array(SIG_COUNT);
  const sigT = new Float32Array(SIG_COUNT);
  const sigSpd = new Float32Array(SIG_COUNT);
  const sigActive = new Uint8Array(SIG_COUNT);
  for (let i = 0; i < SIG_COUNT; i++) {
    sigCol[i * 3] = 1.0;
    sigCol[i * 3 + 1] = 0.96;
    sigCol[i * 3 + 2] = 1.0;
    sigActive[i] = 0;
    sigT[i] = 0;
    sigSpd[i] = rand(0.003, 0.009);
  }
  sigGeom.setAttribute("position", new THREE.BufferAttribute(sigPos, 3));
  sigGeom.setAttribute("color", new THREE.BufferAttribute(sigCol, 3));
  const sigMat = new THREE.PointsMaterial({
    size: 0.75,
    vertexColors: true,
    transparent: true,
    opacity: 0.0,
    map: makeGlowTexture(),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const sigParticles = new THREE.Points(sigGeom, sigMat);
  scene.add(sigParticles);

  let signalWaveRadius = 0;
  const connLit = new Float32Array(connections.length);
  const SIGNAL_WAVE_SPEED = 26; // units/sec

  // Build fast lookup: connections sorted by trigger dist for wave activation
  const connByDist = Array.from(
    { length: connections.length },
    (_, i) => i,
  ).sort((a, b) => connTriggerDist[a] - connTriggerDist[b]);

  function updateSignal(dt, phase1T) {
    sigMat.opacity = clamp(phase1T * 4, 0, 1);
    signalWaveRadius += SIGNAL_WAVE_SPEED * dt;
    const normWave = clamp(signalWaveRadius / 52.0, 0, 1);
    lineShaderMat.uniforms.uSignalT.value = normWave;
    lineShaderMat.uniforms.uSignalMode.value = clamp(phase1T * 2, 0, 1);

    // Light up connections as wave passes
    for (let c = 0; c < connections.length; c++) {
      if (signalWaveRadius > connTriggerDist[c]) {
        const overBy = signalWaveRadius - connTriggerDist[c];
        connLit[c] = Math.min(connLit[c] + overBy * 0.08, 1.0);
      }
      connLit[c] = Math.max(0, connLit[c] - dt * 0.4);
    }

    // Update active signal particles
    const arr = sigGeom.attributes.position.array;
    const tmp = [0, 0, 0];
    let toActivate = Math.floor(dt * 60 * 1.2);
    for (let i = 0; i < SIG_COUNT; i++) {
      if (sigActive[i]) {
        sigT[i] += sigSpd[i] * dt * 60;
        if (sigT[i] >= 1.0) {
          sigActive[i] = 0;
          continue;
        }
        const [iA, iB] = connections[sigConn[i]];
        bezierPt(
          nodePositions[iA],
          getCtrl(nodePositions[iA], nodePositions[iB]),
          nodePositions[iB],
          sigT[i],
          tmp,
        );
        arr[i * 3] = tmp[0];
        arr[i * 3 + 1] = tmp[1];
        arr[i * 3 + 2] = tmp[2];
      } else if (toActivate > 0) {
        // Activate on a lit connection
        const pick = Math.floor(Math.random() * connections.length);
        if (connLit[pick] > 0.3) {
          sigConn[i] = pick;
          sigT[i] = 0;
          sigActive[i] = 1;
          sigSpd[i] = rand(0.003, 0.009);
          toActivate--;
        }
      }
    }
    sigGeom.attributes.position.needsUpdate = true;
  }

  function resetSignal() {
    signalWaveRadius = 0;
    connLit.fill(0);
    sigMat.opacity = 0;
    sigActive.fill(0);
    lineShaderMat.uniforms.uSignalT.value = 0;
    lineShaderMat.uniforms.uSignalMode.value = 0;
  }

  // ---------- Convergence stream particles (Phase 3) ----------
  const STREAM_COUNT = 500;
  const streamGeom = new THREE.BufferGeometry();
  const streamPos = new Float32Array(STREAM_COUNT * 3);
  const streamAge = new Float32Array(STREAM_COUNT); // 0=alive,1=dead
  for (let i = 0; i < STREAM_COUNT; i++) streamAge[i] = 1.0; // all dead initially
  streamGeom.setAttribute("position", new THREE.BufferAttribute(streamPos, 3));
  const streamMat = new THREE.PointsMaterial({
    size: 0.6,
    color: 0x88ccff,
    transparent: true,
    opacity: 0.0,
    map: makeGlowTexture(),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const streamParticles = new THREE.Points(streamGeom, streamMat);
  scene.add(streamParticles);

  let streamMode = false;

  function updateStream(dt, phase3T) {
    streamMat.opacity = clamp(phase3T * 2.5, 0, 0.95);
    const spawnCount = Math.floor(dt * 90);
    const arr = streamGeom.attributes.position.array;
    let spawned = 0;
    for (let i = 0; i < STREAM_COUNT; i++) {
      if (streamAge[i] < 1.0) {
        streamAge[i] += dt / 1.1;
        const px = arr[i * 3],
          py = arr[i * 3 + 1],
          pz = arr[i * 3 + 2];
        const dist = Math.sqrt(px * px + py * py + pz * pz);
        if (dist < 1.8) {
          streamAge[i] = 1.0;
          arr[i * 3] = arr[i * 3 + 1] = arr[i * 3 + 2] = 0;
          continue;
        }
        const accel = 8 * (1 + (1 - streamAge[i]) * 5);
        const inv = (accel * dt) / Math.max(dist, 0.01);
        arr[i * 3] -= px * inv;
        arr[i * 3 + 1] -= py * inv;
        arr[i * 3 + 2] -= pz * inv;
      } else if (spawned < spawnCount) {
        const ni = Math.floor(Math.random() * NODES);
        arr[i * 3] = nodeBasePos[ni].x + rand(-0.8, 0.8);
        arr[i * 3 + 1] = nodeBasePos[ni].y + rand(-0.8, 0.8);
        arr[i * 3 + 2] = nodeBasePos[ni].z + rand(-0.8, 0.8);
        streamAge[i] = 0;
        spawned++;
      }
    }
    streamGeom.attributes.position.needsUpdate = true;
  }

  function resetStream() {
    streamMat.opacity = 0;
    streamAge.fill(1.0);
    streamMode = false;
  }

  // ---------- UniFund Core ----------
  const coreGroup = new THREE.Group();
  scene.add(coreGroup);

  const auraMat = new THREE.SpriteMaterial({
    map: makeGlowTexture(),
    color: 0x9aa9ff,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const aura = new THREE.Sprite(auraMat);
  aura.scale.set(18, 18, 1);
  coreGroup.add(aura);

  const auraMat2 = new THREE.SpriteMaterial({
    map: makeGlowTexture(),
    color: 0xb388ff,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const aura2 = new THREE.Sprite(auraMat2);
  aura2.scale.set(34, 34, 1);
  coreGroup.add(aura2);

  const CORE_PARTICLES = 3500;
  const coreGeom = new THREE.BufferGeometry();
  const corePos = new Float32Array(CORE_PARTICLES * 3);
  const coreCol = new Float32Array(CORE_PARTICLES * 3);
  const coreBase = new Float32Array(CORE_PARTICLES * 3);
  for (let i = 0; i < CORE_PARTICLES; i++) {
    const r = lerp(1.6, 3.6, Math.pow(Math.random(), 0.4));
    const theta = Math.random() * Math.PI * 2,
      phi = Math.acos(2 * Math.random() - 1);
    const x = r * Math.sin(phi) * Math.cos(theta),
      y = r * Math.sin(phi) * Math.sin(theta),
      z = r * Math.cos(phi);
    corePos[i * 3] = x;
    corePos[i * 3 + 1] = y;
    corePos[i * 3 + 2] = z;
    coreBase[i * 3] = x;
    coreBase[i * 3 + 1] = y;
    coreBase[i * 3 + 2] = z;
    const tint = Math.random();
    if (tint < 0.55) {
      coreCol[i * 3] = 1.0;
      coreCol[i * 3 + 1] = 1.0;
      coreCol[i * 3 + 2] = 1.0;
    } else if (tint < 0.85) {
      coreCol[i * 3] = 0.55;
      coreCol[i * 3 + 1] = 0.85;
      coreCol[i * 3 + 2] = 1.0;
    } else {
      coreCol[i * 3] = 0.78;
      coreCol[i * 3 + 1] = 0.55;
      coreCol[i * 3 + 2] = 1.0;
    }
  }
  coreGeom.setAttribute("position", new THREE.BufferAttribute(corePos, 3));
  coreGeom.setAttribute("color", new THREE.BufferAttribute(coreCol, 3));
  const coreMat = new THREE.PointsMaterial({
    size: 0.16,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    map: makeGlowTexture(),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const coreParticles = new THREE.Points(coreGeom, coreMat);
  coreGroup.add(coreParticles);

  const hotMat = new THREE.SpriteMaterial({
    map: makeGlowTexture(),
    color: 0xffffff,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const hot = new THREE.Sprite(hotMat);
  hot.scale.set(7, 7, 1);
  coreGroup.add(hot);

  // Arc lines inside core
  const ARC_COUNT = 6,
    ARC_SEGS = 18;
  const arcGeom = new THREE.BufferGeometry();
  const arcPos = new Float32Array(ARC_COUNT * ARC_SEGS * 2 * 3);
  const arcCol = new Float32Array(ARC_COUNT * ARC_SEGS * 2 * 3);
  arcGeom.setAttribute("position", new THREE.BufferAttribute(arcPos, 3));
  arcGeom.setAttribute("color", new THREE.BufferAttribute(arcCol, 3));
  const arcMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const arcs = new THREE.LineSegments(arcGeom, arcMat);
  coreGroup.add(arcs);
  let arcSpeed = 0.65,
    lastArcRegen = 0;

  function regenArcs() {
    let v = 0;
    const arr = arcGeom.attributes.position.array,
      ca = arcGeom.attributes.color.array;
    for (let a = 0; a < ARC_COUNT; a++) {
      const phi = Math.random() * Math.PI * 2,
        phiB = phi + rand(0.6, 1.6) * (Math.random() < 0.5 ? 1 : -1);
      const elev = rand(-0.7, 0.7),
        elev2 = elev + rand(-0.5, 0.5);
      const radius = rand(2.4, 3.2),
        radiusEnd = radius + rand(-0.3, 0.6);
      const start = new THREE.Vector3(
        Math.cos(phi) * radius,
        Math.sin(elev) * radius,
        Math.sin(phi) * radius,
      );
      const end = new THREE.Vector3(
        Math.cos(phiB) * radiusEnd,
        Math.sin(elev2) * radiusEnd,
        Math.sin(phiB) * radiusEnd,
      );
      let prev = start.clone();
      for (let s = 1; s <= ARC_SEGS; s++) {
        const t = s / ARC_SEGS,
          pt = start.clone().lerp(end, t);
        const jitter = (1 - Math.abs(2 * t - 1)) * 0.55;
        pt.x += rand(-jitter, jitter);
        pt.y += rand(-jitter, jitter);
        pt.z += rand(-jitter, jitter);
        arr[v * 3] = prev.x;
        arr[v * 3 + 1] = prev.y;
        arr[v * 3 + 2] = prev.z;
        ca[v * 3] = 0.55;
        ca[v * 3 + 1] = 0.95;
        ca[v * 3 + 2] = 1.0;
        v++;
        arr[v * 3] = pt.x;
        arr[v * 3 + 1] = pt.y;
        arr[v * 3 + 2] = pt.z;
        ca[v * 3] = 0.7;
        ca[v * 3 + 1] = 0.85;
        ca[v * 3 + 2] = 1.0;
        v++;
        prev = pt;
      }
    }
    arcGeom.attributes.position.needsUpdate = true;
    arcGeom.attributes.color.needsUpdate = true;
  }
  regenArcs();

  // Portal expansion rings
  const RING_COUNT = 3;
  const ringMeshes = [],
    ringMats = [];
  const RING_COLORS = [0x00d1ff, 0x7b61ff, 0xff5fb6];
  const RING_DELAYS = [0, 0.18, 0.34];
  for (let r = 0; r < RING_COUNT; r++) {
    const geo = new THREE.RingGeometry(0.12, 0.45, 64);
    const mat = new THREE.MeshBasicMaterial({
      color: RING_COLORS[r],
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = (r * Math.PI) / RING_COUNT;
    mesh.rotation.z = (r * Math.PI * 0.7) / RING_COUNT;
    mesh.scale.setScalar(0);
    coreGroup.add(mesh);
    ringMeshes.push(mesh);
    ringMats.push(mat);
  }

  // ---------- User orb + trail ----------
  const userOrbMat = new THREE.SpriteMaterial({
    map: makeGlowTexture(),
    color: 0xffd54f,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const userOrb = new THREE.Sprite(userOrbMat);
  userOrb.scale.set(3.5, 3.5, 1);
  userOrb.position.set(0, -32, 6);
  userOrb.visible = false;
  scene.add(userOrb);

  const TRAIL_LEN = 60;
  const trailGeom = new THREE.BufferGeometry();
  const trailPos = new Float32Array(TRAIL_LEN * 3);
  const trailCol = new Float32Array(TRAIL_LEN * 3);
  for (let i = 0; i < TRAIL_LEN; i++) {
    trailPos[i * 3] = 0;
    trailPos[i * 3 + 1] = -32;
    trailPos[i * 3 + 2] = 6;
    const t = i / TRAIL_LEN;
    trailCol[i * 3] = 1.0;
    trailCol[i * 3 + 1] = 0.85 - t * 0.3;
    trailCol[i * 3 + 2] = 0.31;
  }
  trailGeom.setAttribute("position", new THREE.BufferAttribute(trailPos, 3));
  trailGeom.setAttribute("color", new THREE.BufferAttribute(trailCol, 3));
  const trailMat = new THREE.PointsMaterial({
    size: 0.6,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    map: makeGlowTexture(),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const trail = new THREE.Points(trailGeom, trailMat);
  trail.visible = false;
  scene.add(trail);

  function setUserNodeVisible(v) {
    const arr = nodeGeom.attributes.aSize.array;
    arr[USER_IDX] = v ? nodeSize[USER_IDX] : 0;
    nodeGeom.attributes.aSize.needsUpdate = true;
  }
  setUserNodeVisible(false);

  // ---------- Camera + mouse ----------
  const mouse = new THREE.Vector2(0, 0);
  let mouseInside = false;
  container.addEventListener("mousemove", (e) => {
    const r = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    mouseInside = true;
  });
  container.addEventListener("mouseleave", () => {
    mouseInside = false;
  });

  // ---------- Raycaster (core hit) ----------
  const raycaster = new THREE.Raycaster();
  const coreHitGeom = new THREE.SphereGeometry(4.2, 16, 16);
  const coreHitMat = new THREE.MeshBasicMaterial({ visible: false });
  const coreHit = new THREE.Mesh(coreHitGeom, coreHitMat);
  coreGroup.add(coreHit);

  let coreHovered = false;
  const callbacks = {
    onPhase: null,
    onCoreHover: null,
    onCoreClick: null,
    onPortal: null,
    onNodeClick: null,
  };

  container.addEventListener("mousemove", () => {
    if (simRunning) return;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObject(coreHit);
    const nh = hits.length > 0;
    if (nh !== coreHovered) {
      coreHovered = nh;
      renderer.domElement.style.cursor = coreHovered ? "none" : "default";
      callbacks.onCoreHover && callbacks.onCoreHover(coreHovered);
    }
  });

  // Track pointer-down position to distinguish click from drag
  let _ptrDown = { x: 0, y: 0 };
  renderer.domElement.addEventListener("pointerdown", (e) => {
    _ptrDown.x = e.clientX;
    _ptrDown.y = e.clientY;
  });
  renderer.domElement.addEventListener("click", (e) => {
    if (simRunning) return;
    if (Math.hypot(e.clientX - _ptrDown.x, e.clientY - _ptrDown.y) > 4) return;
    raycaster.setFromCamera(mouse, camera);
    if (raycaster.intersectObject(coreHit).length > 0) {
      callbacks.onCoreClick && callbacks.onCoreClick();
    } else {
      raycaster.params.Points = { threshold: 1.5 };
      const nodeHits = raycaster.intersectObject(nodesObj);
      if (nodeHits.length > 0) callbacks.onNodeClick && callbacks.onNodeClick(nodeHits[0].index);
    }
  });

  // ---------- Timeframe dim ----------
  let timeframeDimT = 0,
    timeframeDimDir = 0,
    timeframeDimStart = 0;

  function triggerTimeframeDim() {
    timeframeDimDir = 1;
    timeframeDimStart = clock.getElapsedTime();
  }

  // ---------- Simulation state ----------
  let simRunning = false,
    simPhase = 0,
    simT0 = 0;
  let globalPulseStrength = 0,
    coreEnergy = 1,
    convergenceMode = 0;
  let inPortalPhase = false;
  let portalT = 0;

  function setPhase(p) {
    simPhase = p;
    callbacks.onPhase && callbacks.onPhase(p);
  }

  function runSimulation() {
    if (simRunning) return;
    controls.enabled = false;
    _flyActive = false;
    simRunning = true;
    simT0 = clock.getElapsedTime();
    setPhase(1);
    coreHovered = false;
    renderer.domElement.style.cursor = "default";
    bloomTarget = 1.2;
  }

  // ---------- Animation loop ----------
  const clock = new THREE.Clock();
  let raf = 0;
  const ENTRY_DURATION = 3.6;
  let webRevealT = 0,
    entryDone = false;

  const tmpNDC = new THREE.Vector3();
  function projectToScreen(v) {
    tmpNDC.copy(v).project(camera);
    return { x: tmpNDC.x, y: tmpNDC.y };
  }

  function tick() {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.getElapsedTime();

    // ---- Bloom smooth tracking ----
    if (!isMobile && bloomPass) {
      currentBloom = lerp(currentBloom, bloomTarget, dt * 3.5);
      bloomPass.strength = currentBloom;
    }

    // ---- Entry / web reveal ----
    const entryT = clamp(t / ENTRY_DURATION, 0, 1);
    webRevealT = clamp(easeOut(entryT / 0.45), 0, 1);
    lineShaderMat.uniforms.uWebRevealT.value = webRevealT;
    lineShaderMat.uniforms.uLineOpacity.value = lerp(0, 0.22, webRevealT);
    flowMat.opacity = lerp(0, 0.85, webRevealT);

    // Staggered node reveal — inner nodes appear first
    const sizeArr = nodeGeom.attributes.aSize.array;
    for (let i = 0; i < NODES; i++) {
      const rt = clamp((webRevealT - nodeDistNorm[i] * 0.5) / 0.5, 0, 1);
      sizeArr[i] = (filterMask[nodeKind[i]] && timelineVisibleSet.has(i)) ? nodeSize[i] * easeOut(rt) : 0;
    }

    // Camera entry path (only while OrbitControls is still disabled)
    const camZ = lerp(180, 70, easeOut(entryT));
    if (!simRunning && !controls.enabled) {
      camera.position.set(0, lerp(8, 0, easeOut(entryT)), camZ);
      camera.lookAt(0, 0, 0);
    }

    // ---- User orb entry ----
    if (entryT >= 0.35 && !entryDone) {
      userOrb.visible = true;
      trail.visible = true;
      const orbT = clamp((entryT - 0.35) / 0.55, 0, 1);
      const target = nodeBasePos[USER_IDX];
      const start = new THREE.Vector3(0, -22, 26);
      const cp = new THREE.Vector3(
        target.x * 0.4,
        lerp(-6, target.y + 4, orbT),
        target.z + 12,
      );
      const u = 1 - orbT;
      const pos = new THREE.Vector3(
        u * u * start.x + 2 * u * orbT * cp.x + orbT * orbT * target.x,
        u * u * start.y + 2 * u * orbT * cp.y + orbT * orbT * target.y,
        u * u * start.z + 2 * u * orbT * cp.z + orbT * orbT * target.z,
      );
      userOrb.position.copy(pos);

      // Update trail
      const tarr = trailGeom.attributes.position.array;
      for (let i = TRAIL_LEN - 1; i > 0; i--) {
        tarr[i * 3] = tarr[(i - 1) * 3];
        tarr[i * 3 + 1] = tarr[(i - 1) * 3 + 1];
        tarr[i * 3 + 2] = tarr[(i - 1) * 3 + 2];
      }
      tarr[0] = pos.x;
      tarr[1] = pos.y;
      tarr[2] = pos.z;
      trailGeom.attributes.position.needsUpdate = true;
      userOrb.scale.setScalar(lerp(3.8, 2.2, orbT));

      if (orbT >= 1.0) {
        entryDone = true;
        controls.enabled = true;
        controls.target.set(0, 0, 0);
        controls.update();
        setUserNodeVisible(true);
        gsapLikePulse();
        setTimeout(() => {
          userOrb.visible = false;
          trail.visible = false;
        }, 350);
      }
    }
    if (entryDone && filterMask[3])
      sizeArr[USER_IDX] = nodeSize[USER_IDX] * (1 + 0.3 * Math.sin(t * 2.3));
    nodeGeom.attributes.aSize.needsUpdate = true;

    // ---- Mouse repulsion on nodes ----
    if (mouseInside && entryDone && !simRunning) {
      const posArr = nodeGeom.attributes.position.array;
      for (let i = 0; i < TOTAL_NODES; i += 2) {
        const base = nodeBasePos[i];
        const sp = projectToScreen(base);
        const dx = sp.x - mouse.x,
          dy = sp.y - mouse.y;
        const d = Math.hypot(dx, dy);
        const force = clamp(1 - d / 0.18, 0, 1);
        const ang = Math.atan2(dy, dx),
          push = force * 0.7;
        posArr[i * 3] = base.x + Math.cos(ang) * push;
        posArr[i * 3 + 1] = base.y + Math.sin(ang) * push;
        posArr[i * 3 + 2] = base.z;
        if (i + 1 < TOTAL_NODES) {
          posArr[(i + 1) * 3] = lerp(
            posArr[(i + 1) * 3],
            nodeBasePos[i + 1].x,
            0.12,
          );
          posArr[(i + 1) * 3 + 1] = lerp(
            posArr[(i + 1) * 3 + 1],
            nodeBasePos[i + 1].y,
            0.12,
          );
        }
      }
      nodeGeom.attributes.position.needsUpdate = true;
    }

    // ---- Timeframe dim ----
    if (timeframeDimDir !== 0) {
      const elapsed = t - timeframeDimStart;
      const half = 0.3;
      if (timeframeDimDir === 1) {
        timeframeDimT = clamp(elapsed / half, 0, 1);
        if (timeframeDimT >= 1) {
          timeframeDimDir = -1;
          timeframeDimStart = t;
        }
      } else {
        timeframeDimT = 1 - clamp(elapsed / half, 0, 1);
        if (timeframeDimT <= 0) {
          timeframeDimDir = 0;
          bloomTarget = simRunning ? bloomTarget : 0.8;
        }
      }
      if (!simRunning) {
        lineShaderMat.uniforms.uLineOpacity.value =
          0.22 * (1 - timeframeDimT * 0.68);
        if (timeframeDimDir === -1 && timeframeDimT < 0.3)
          bloomTarget = Math.max(bloomTarget, 1.35);
      }
    }

    // ---- Simulation phases ----
    if (simRunning) {
      const st = t - simT0;
      if (st < 1.5) {
        // Phase 1 — Signal broadcast
        if (simPhase !== 1) {
          setPhase(1);
          bloomTarget = 1.2;
        }
        const u = st / 1.5;
        globalPulseStrength = u;
        flowBoost = u * 0.5;
        lineShaderMat.uniforms.uLineOpacity.value = lerp(0.22, 0.55, u);
        coreEnergy = 1 + u * 0.6;
        updateSignal(dt, u);
      } else if (st < 3.0) {
        // Phase 2 — Collective processing
        if (simPhase !== 2) {
          setPhase(2);
          bloomTarget = 1.8;
          resetSignal();
        }
        const u = (st - 1.5) / 1.5;
        flowBoost = 0.6 + u * 1.4;
        coreEnergy = 1.7 + u * 1.3;
        const cz = lerp(70, 38, easeInOut(u));
        camera.position.set(0, lerp(0, 2, u), cz);
        camera.lookAt(0, 0, 0);
        lineShaderMat.uniforms.uLineOpacity.value = lerp(0.55, 0.35, u);
      } else if (st < 4.5) {
        // Phase 3 — Convergence
        if (simPhase !== 3) {
          setPhase(3);
          bloomTarget = 2.5;
          streamMode = true;
        }
        const u = (st - 3.0) / 1.5;
        convergenceMode = u;
        flowBoost = 2.0;
        coreEnergy = 3.0 + u * 1.5;
        lineShaderMat.uniforms.uLineOpacity.value = lerp(0.35, 0.04, u);
        nodeMat.uniforms.uGlobalPulse.value = lerp(0, 0.8, u);
        camera.position.set(0, lerp(2, 4, u), lerp(38, 24, u));
        camera.lookAt(0, 0, 0);
        flowMat.opacity = lerp(0.85, 0.0, u);
        updateStream(dt, u);
      } else if (st < 6.0) {
        // Phase 4 — Portal
        if (simPhase !== 4) {
          setPhase(4);
          bloomTarget = 4.0;
          inPortalPhase = true;
          streamMode = false;
        }
        const u4 = (st - 4.5) / 1.5;
        portalT = u4;
        convergenceMode = 1;
        coreEnergy = lerp(4.5, 12.0, u4);
        camera.position.set(0, 4, lerp(24, 10, u4));
        camera.lookAt(0, 0, 0);

        // Fade stream out
        streamMat.opacity = lerp(0.95, 0.0, clamp(u4 / 0.4, 0, 1));

        // Expand core sprites for portal explosion
        hot.scale.setScalar(lerp(7, 32, easeOut(u4)));
        aura.scale.setScalar(lerp(18, 58, easeOut(u4)));
        aura2.scale.setScalar(lerp(34, 95, easeOut(u4)));
        hotMat.opacity = lerp(0.95, 1.0, u4);
        auraMat.opacity = lerp(0.6, 0.9, u4);

        // Expanding rings
        for (let r = 0; r < RING_COUNT; r++) {
          const rt = clamp((u4 - RING_DELAYS[r]) / (1 - RING_DELAYS[r]), 0, 1);
          const s = lerp(0.5, 40, easeOut(rt));
          ringMeshes[r].scale.setScalar(rt > 0 ? s : 0);
          ringMats[r].opacity = Math.sin(rt * Math.PI) * 0.8;
        }
      } else {
        portalT = 1.0;
        streamMat.opacity = 0;
      }
    } else {
      // Idle — not simulating
      globalPulseStrength = 0;
      flowBoost = 0;
      nodeMat.uniforms.uGlobalPulse.value = 0;
      if (!inPortalPhase) {
        // only override line opacity if timeframe dim is not running
        if (timeframeDimDir === 0)
          lineShaderMat.uniforms.uLineOpacity.value = lerp(
            lineShaderMat.uniforms.uLineOpacity.value,
            0.22,
            0.05,
          );
      }
    }

    // Convergence: flow particles stream toward core
    if (convergenceMode > 0 && !streamMode) {
      const arr = flowGeom.attributes.position.array;
      for (let i = 0; i < FLOW_COUNT; i++) {
        arr[i * 3] = lerp(arr[i * 3], 0, convergenceMode * 0.05);
        arr[i * 3 + 1] = lerp(arr[i * 3 + 1], 0, convergenceMode * 0.05);
        arr[i * 3 + 2] = lerp(arr[i * 3 + 2], 0, convergenceMode * 0.05);
      }
      flowGeom.attributes.position.needsUpdate = true;
    } else if (!convergenceMode) {
      updateFlow(dt);
    }

    // ---- Core animations ----
    coreGroup.rotation.y += dt * 0.06;
    coreGroup.rotation.x = Math.sin(t * 0.3) * 0.12;

    if (!inPortalPhase) {
      hotMat.opacity = 0.6 + 0.35 * Math.sin(t * 2.5);
      const energyPulse = 1 + 0.08 * Math.sin(t * 2.0);
      const scale = coreEnergy * energyPulse;
      hot.scale.setScalar(7 * Math.min(scale, 8));
      aura.scale.setScalar(18 * Math.min(scale * 0.8 + 0.2, 6));
      aura2.scale.setScalar(34 * Math.min(scale * 0.6 + 0.4, 5));
      auraMat.opacity = clamp(0.6 * (coreHovered ? 1.4 : 1), 0, 1);
      auraMat2.opacity = clamp(0.35 * (coreHovered ? 1.25 : 1), 0, 1);
    }

    // Core particle breathing
    const ca = coreGeom.attributes.position.array;
    const breath = 1 + 0.05 * Math.sin(t * 1.4) + (simRunning ? 0.18 : 0);
    for (let i = 0; i < CORE_PARTICLES; i++) {
      ca[i * 3] = coreBase[i * 3] * breath;
      ca[i * 3 + 1] = coreBase[i * 3 + 1] * breath;
      ca[i * 3 + 2] = coreBase[i * 3 + 2] * breath;
    }
    coreGeom.attributes.position.needsUpdate = true;

    arcSpeed = coreHovered || simRunning ? (simRunning ? 18 : 12) : 6;
    if (t - lastArcRegen > 1 / arcSpeed) {
      regenArcs();
      lastArcRegen = t;
    }
    arcMat.opacity = clamp(
      0.65 + 0.35 * Math.sin(t * 4) + (coreHovered ? 0.2 : 0),
      0.3,
      1.0,
    );

    // ---- Background ----
    stars.rotation.y += dt * 0.005;
    stars.rotation.x += dt * 0.002;
    const dpos = dustGeom.attributes.position.array;
    for (let i = 0; i < DUST; i++) {
      dpos[i * 3] += dustVel[i * 3];
      dpos[i * 3 + 1] += dustVel[i * 3 + 1];
      dpos[i * 3 + 2] += dustVel[i * 3 + 2];
      if (dpos[i * 3] > 50) dpos[i * 3] -= 100;
      if (dpos[i * 3] < -50) dpos[i * 3] += 100;
      if (dpos[i * 3 + 1] > 30) dpos[i * 3 + 1] -= 60;
      if (dpos[i * 3 + 1] < -30) dpos[i * 3 + 1] += 60;
    }
    dustGeom.attributes.position.needsUpdate = true;

    // Fly-to animation (camera moves toward a target node)
    if (_flyActive && !simRunning) {
      if (_flyT === 0) {
        _flyFrom.copy(camera.position);
        controls.enabled = false;
      }
      _flyT = Math.min(_flyT + dt * 1.1, 1);
      const et = easeInOut(_flyT);
      const dir = _flyFrom.clone().sub(_flyTarget).normalize();
      const dist = Math.max(_flyFrom.distanceTo(_flyTarget) * 0.35, 16);
      camera.position.lerpVectors(_flyFrom, _flyTarget.clone().add(dir.multiplyScalar(dist)), et);
      controls.target.lerp(_flyTarget, et);
      camera.lookAt(controls.target);
      if (_flyT >= 1) {
        _flyActive = false;
        controls.enabled = true;
        controls.update();
      }
    }

    // OrbitControls damping update
    if (controls.enabled) controls.update();

    nodeMat.uniforms.uTime.value = t;

    // ---- Render ----
    if (composer) composer.render();
    else renderer.render(scene, camera);

    callbacks.onPortal && callbacks.onPortal(portalT);
  }

  // Enhanced arrival pulse — double-bounce, camera micro-push
  function gsapLikePulse() {
    const start = performance.now();
    function f() {
      const t = (performance.now() - start) / 900;
      if (t > 1) {
        nodeMat.uniforms.uGlobalPulse.value = 0;
        return;
      }
      const primary = Math.sin(t * Math.PI) * 1.4;
      const echo = t > 0.5 ? Math.sin((t - 0.5) * Math.PI * 2) * 0.5 : 0;
      nodeMat.uniforms.uGlobalPulse.value = primary + echo;
      requestAnimationFrame(f);
    }
    f();
    bloomTarget = 1.5;
    setTimeout(() => {
      if (!simRunning) bloomTarget = 0.8;
    }, 900);

    // Camera micro-push back then return
    const camZ0 = camera.position.z;
    const pushStart = performance.now();
    function camPush() {
      const pt = (performance.now() - pushStart) / 400;
      if (pt > 1) {
        camera.position.z = camZ0;
        return;
      }
      camera.position.z = camZ0 + Math.sin(pt * Math.PI) * 3.0;
      requestAnimationFrame(camPush);
    }
    camPush();
  }

  tick();

  // ---------- Resize ----------
  function onResize() {
    renderer.setSize(W(), H());
    camera.aspect = W() / H();
    camera.updateProjectionMatrix();
    nodeMat.uniforms.uPx.value = renderer.getPixelRatio();
    if (composer) {
      composer.setSize(W(), H());
      bloomPass.setSize(W() * 0.75, H() * 0.75);
    }
  }
  window.addEventListener("resize", onResize);

  // ---------- Public API ----------
  return {
    destroy() {
      cancelAnimationFrame(raf);
      controls.dispose();
      window.removeEventListener("resize", onResize);
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else o.material.dispose();
        }
      });
      if (composer && typeof composer.dispose === "function")
        composer.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode)
        renderer.domElement.parentNode.removeChild(renderer.domElement);
    },

    runSimulation,

    isSimRunning: () => simRunning,

    setTimeframe(_id) {
      triggerTimeframeDim();
    },

    onCoreHover(cb) {
      callbacks.onCoreHover = cb;
    },
    onCoreClick(cb) {
      callbacks.onCoreClick = cb;
    },
    onPhase(cb) {
      callbacks.onPhase = cb;
    },
    onPortal(cb) {
      callbacks.onPortal = cb;
    },

    getCoreScreenPos() {
      const v = new THREE.Vector3(0, 0, 0).project(camera);
      return { x: (v.x * 0.5 + 0.5) * W(), y: (-v.y * 0.5 + 0.5) * H() };
    },

    resetSimulation() {
      simRunning = false;
      setPhase(0);
      portalT = 0;
      convergenceMode = 0;
      flowBoost = 0;
      coreEnergy = 1;
      inPortalPhase = false;
      nodeMat.uniforms.uGlobalPulse.value = 0;
      lineShaderMat.uniforms.uLineOpacity.value = 0.22;
      lineShaderMat.uniforms.uSignalMode.value = 0;
      lineShaderMat.uniforms.uSignalT.value = 0;
      bloomTarget = 0.8;
      flowMat.opacity = 0.85;
      resetSignal();
      resetStream();
      for (let r = 0; r < RING_COUNT; r++) {
        ringMeshes[r].scale.setScalar(0);
        ringMats[r].opacity = 0;
      }
      camera.position.set(0, 0, 70);
      camera.lookAt(0, 0, 0);
      controls.target.set(0, 0, 0);
      controls.enabled = entryDone;
      if (entryDone) controls.update();
    },

    highlightNode(idx, pathEdgeIndices) {
      nodeHighlightArr.fill(0);
      linePathArr.fill(0);
      if (idx === null || idx === undefined) {
        nodeMat.uniforms.uHighlightT.value = 0;
        lineShaderMat.uniforms.uPathMode.value = 0;
      } else {
        nodeHighlightArr[idx] = 1.0;
        nodeMat.uniforms.uHighlightT.value = 1.0;
        lineShaderMat.uniforms.uPathMode.value = 1.0;
        for (const ci of (pathEdgeIndices || [])) {
          const base = ci * SEGS * 2;
          for (let v = 0; v < SEGS * 2; v++) linePathArr[base + v] = 1.0;
        }
        lineGeom.attributes.aIsPath.needsUpdate = true;
      }
      nodeGeom.attributes.aHighlight.needsUpdate = true;
    },

    clearHighlight() {
      this.highlightNode(null, null);
    },

    flyToNode(pos) {
      _flyTarget.copy(pos);
      _flyT = 0;
      _flyActive = true;
    },

    setFilters(mask) {
      for (const k of Object.keys(mask)) filterMask[k] = mask[k];
    },

    setVisibleNodeCount(n) {
      timelineCutoff = clamp(n, 1, TOTAL_NODES);
      timelineVisibleSet.clear();
      for (let i = 0; i < timelineCutoff; i++) {
        timelineVisibleSet.add(nodeRevealOrder[i]);
      }
      timelineVisibleSet.add(USER_IDX); // always keep user node visible
      // Update edge hide attribute: hide edges where either endpoint is hidden
      for (let c = 0; c < connections.length; c++) {
        const [ni, nj] = connections[c];
        const hide = (!timelineVisibleSet.has(ni) || !timelineVisibleSet.has(nj)) ? 1.0 : 0.0;
        const base = c * SEGS * 2;
        for (let v = 0; v < SEGS * 2; v++) lineHideArr[base + v] = hide;
      }
      lineGeom.attributes.aHideEdge.needsUpdate = true;
    },

    getGraphData() {
      return {
        basePositions: nodeBasePos,
        edges: connections,
        adjacency,
        connEdgeMap,
        nodeKinds: nodeKind,
        nodeCount: TOTAL_NODES,
      };
    },

    projectNodeToScreen(idx) {
      if (idx < 0 || idx >= TOTAL_NODES) return null;
      const v = nodeBasePos[idx].clone().project(camera);
      if (v.z > 1) return null;
      return { x: (v.x * 0.5 + 0.5) * W(), y: (-v.y * 0.5 + 0.5) * H() };
    },

    onNodeClick(cb) { callbacks.onNodeClick = cb; },
  };
}
