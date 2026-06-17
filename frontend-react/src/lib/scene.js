// UniFund cinematic particle scene
// Stages: dust -> molecule -> dna -> brain
// One BufferGeometry of N particles; each stage provides a target position array.
// Particles lerp toward their assigned target with a per-particle delay for organic morphs.

import * as THREE from 'three';

const PARTICLE_COUNT = 6000;

// ---------- Target shape generators ----------

function genDust(n) {
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    // Wide, sparse spherical shell
    const r = 6 + Math.pow(Math.random(), 0.5) * 8;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    arr[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
    arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
    arr[i * 3 + 2] = r * Math.cos(phi);
  }
  return arr;
}

function genMolecule(n) {
  // A pleasing 8-atom cluster with bonds between them
  const atoms = [
    [0, 0, 0],
    [1.8, 0.4, 0.2],
    [-1.8, 0.4, -0.2],
    [0.2, 1.8, 0.4],
    [-0.2, -1.8, -0.4],
    [1.2, 1.2, -1.2],
    [-1.2, -1.2, 1.2],
    [1.2, -1.2, 1.2],
  ];
  const bonds = [
    [0, 1], [0, 2], [0, 3], [0, 4],
    [0, 5], [0, 6], [0, 7],
    [1, 5], [3, 5], [2, 6], [4, 6], [1, 7], [4, 7],
  ];

  const arr = new Float32Array(n * 3);
  // 30% of particles cluster around atom centers, 70% along bonds
  const atomShare = Math.floor(n * 0.3);
  const perAtom = Math.floor(atomShare / atoms.length);
  let idx = 0;
  for (let a = 0; a < atoms.length; a++) {
    for (let k = 0; k < perAtom; k++) {
      const [ax, ay, az] = atoms[a];
      const r = Math.pow(Math.random(), 0.5) * 0.45;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[idx * 3 + 0] = ax + r * Math.sin(phi) * Math.cos(theta);
      arr[idx * 3 + 1] = ay + r * Math.sin(phi) * Math.sin(theta);
      arr[idx * 3 + 2] = az + r * Math.cos(phi);
      idx++;
    }
  }
  // Bonds (fill remainder)
  while (idx < n) {
    const b = bonds[idx % bonds.length];
    const a1 = atoms[b[0]], a2 = atoms[b[1]];
    const t = Math.random();
    const jitter = 0.06;
    arr[idx * 3 + 0] = a1[0] * (1 - t) + a2[0] * t + (Math.random() - 0.5) * jitter;
    arr[idx * 3 + 1] = a1[1] * (1 - t) + a2[1] * t + (Math.random() - 0.5) * jitter;
    arr[idx * 3 + 2] = a1[2] * (1 - t) + a2[2] * t + (Math.random() - 0.5) * jitter;
    idx++;
  }
  return arr;
}

function genDNA(n) {
  const arr = new Float32Array(n * 3);
  const height = 7.5;
  const turns = 2.6;
  const radius = 1.1;
  const strandShare = Math.floor(n * 0.72);

  for (let i = 0; i < strandShare; i++) {
    const t = i / strandShare;
    const y = -height / 2 + t * height;
    const angle = t * Math.PI * 2 * turns;
    const strand = (i % 2 === 0) ? 0 : Math.PI;
    const jitter = 0.04;
    arr[i * 3 + 0] = Math.cos(angle + strand) * radius + (Math.random() - 0.5) * jitter;
    arr[i * 3 + 1] = y + (Math.random() - 0.5) * jitter;
    arr[i * 3 + 2] = Math.sin(angle + strand) * radius + (Math.random() - 0.5) * jitter;
  }
  // Cross-bridge "rungs"
  const rungs = 26;
  for (let i = strandShare; i < n; i++) {
    const k = Math.floor(Math.random() * rungs);
    const t = k / rungs;
    const y = -height / 2 + t * height;
    const angle = t * Math.PI * 2 * turns;
    const u = Math.random();
    const jitter = 0.03;
    arr[i * 3 + 0] = Math.cos(angle) * radius * (1 - 2 * u) + (Math.random() - 0.5) * jitter;
    arr[i * 3 + 1] = y + (Math.random() - 0.5) * jitter;
    arr[i * 3 + 2] = Math.sin(angle) * radius * (1 - 2 * u) + (Math.random() - 0.5) * jitter;
  }
  return arr;
}

function genBrain(n) {
  const arr = new Float32Array(n * 3);

  const cerebellumCount = Math.floor(n * 0.10);
  const brainstemCount  = Math.floor(n * 0.03);
  const interiorCount   = Math.floor(n * 0.05);
  const cortexCount     = n - cerebellumCount - brainstemCount - interiorCount;

  // ---- Cerebrum: two surface hemispheres ----
  for (let i = 0; i < cortexCount; i++) {
    const side = i % 2 === 0 ? 1 : -1;

    const u = Math.random() * Math.PI * 2;
    const v = Math.acos(2 * Math.random() - 1);
    let nx = Math.sin(v) * Math.cos(u);
    let ny = Math.cos(v);
    let nz = Math.sin(v) * Math.sin(u);
    nx = Math.abs(nx) * side;

    let x = nx * 1.35;
    let y = ny * 1.20;
    let z = nz * 1.95;

    const zNorm = z / 1.95;
    if (zNorm > 0.55) {
      const k = (zNorm - 0.55) / 0.45;
      x *= 1.0 - 0.06 * k;
      y *= 1.0 - 0.04 * k;
    }
    if (zNorm < -0.55) {
      const k = (-zNorm - 0.55) / 0.45;
      x *= 1.0 - 0.14 * k;
      y *= 1.0 - 0.10 * k;
      z *= 1.0 - 0.03 * k;
    }
    const yNorm = y / 1.20;
    if (yNorm < 0.0 && yNorm > -0.75 && zNorm > -0.55 && zNorm < 0.55) {
      const t = 1 - Math.abs(yNorm + 0.40) / 0.40;
      x *= 1.0 + 0.13 * Math.max(0, t);
    }

    const gyriPrimary  = 0.085 * Math.sin(z * 6.5 + side * 0.4);
    const gyriCross    = 0.055 * Math.sin(z * 3.2 + Math.abs(x) * 4.0);
    const gyriDetail   = 0.035 * Math.sin(z * 13.0 + y * 4.0 + u * 0.5);
    const gyriCap      = 0.030 * Math.sin(y * 7.5 + z * 2.0);
    const wrinkle = gyriPrimary + gyriCross + gyriDetail + gyriCap;

    x += nx * wrinkle;
    y += ny * wrinkle;
    z += nz * wrinkle;

    const absX = Math.abs(x);
    const gapWidth = 0.30;
    if (absX < gapWidth && y > -0.10) {
      const t = 1 - absX / gapWidth;
      const topMask = Math.max(0, (y + 0.10) / 1.30);
      x += side * 0.22 * t * topMask;
      y -= 0.22 * t * topMask;
    } else {
      x += side * 0.05;
    }

    if (y < -0.65) {
      const overshoot = -0.65 - y;
      y = -0.65 - overshoot * 0.30;
    }

    const tilt = 0.10;
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    const y2 = y * ct - z * st;
    const z2 = y * st + z * ct;

    arr[i * 3 + 0] = x;
    arr[i * 3 + 1] = y2;
    arr[i * 3 + 2] = z2;
  }

  // ---- Cerebellum ----
  for (let i = cortexCount; i < cortexCount + cerebellumCount; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const u = Math.random() * Math.PI * 2;
    const v = Math.acos(2 * Math.random() - 1);
    let nx = Math.sin(v) * Math.cos(u);
    let ny = Math.cos(v);
    let nz = Math.sin(v) * Math.sin(u);
    nx = Math.abs(nx) * side;

    let x = nx * 0.55;
    let y = ny * 0.50;
    let z = nz * 0.60;

    const fold =
      0.07 * Math.sin(y * 30.0) +
      0.03 * Math.sin(z * 20.0) +
      0.02 * Math.cos(u * 12.0);
    x += nx * fold;
    y += ny * fold;
    z += nz * fold;

    x += side * 0.04;

    const tilt = 0.10;
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    const y2 = y * ct - z * st;
    const z2 = y * st + z * ct;

    arr[i * 3 + 0] = x;
    arr[i * 3 + 1] = y2 - 0.90;
    arr[i * 3 + 2] = z2 - 1.45;
  }

  // ---- Brainstem ----
  for (let i = cortexCount + cerebellumCount;
       i < cortexCount + cerebellumCount + brainstemCount; i++) {
    const t = Math.random();
    const radius = 0.18 * (1 - t * 0.4);
    const angle = Math.random() * Math.PI * 2;
    arr[i * 3 + 0] = Math.cos(angle) * radius;
    arr[i * 3 + 1] = -1.10 - t * 0.55;
    arr[i * 3 + 2] = -1.35 + Math.sin(angle) * radius;
  }

  // ---- Interior neural nodes ----
  for (let i = n - interiorCount; i < n; i++) {
    const u = Math.random() * Math.PI * 2;
    const v = Math.acos(2 * Math.random() - 1);
    const r = Math.pow(Math.random(), 0.7) * 0.85;
    arr[i * 3 + 0] = r * Math.sin(v) * Math.cos(u) * 1.20;
    arr[i * 3 + 1] = r * Math.cos(v) * 0.95;
    arr[i * 3 + 2] = r * Math.sin(v) * Math.sin(u) * 1.65;
  }

  return arr;
}

// ---------- Color palette ----------
function buildColors(n) {
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const t = Math.random();
    const c1 = [0.0, 0.82, 1.0];
    const c2 = [0.48, 0.38, 1.0];
    const c3 = [1.0, 0.37, 0.71];
    let r, g, b;
    if (t < 0.5) {
      const u = t / 0.5;
      r = c1[0] * (1 - u) + c2[0] * u;
      g = c1[1] * (1 - u) + c2[1] * u;
      b = c1[2] * (1 - u) + c2[2] * u;
    } else {
      const u = (t - 0.5) / 0.5;
      r = c2[0] * (1 - u) + c3[0] * u;
      g = c2[1] * (1 - u) + c3[1] * u;
      b = c2[2] * (1 - u) + c3[2] * u;
    }
    colors[i * 3 + 0] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }
  return colors;
}

// Soft round particle texture (no external assets)
function buildParticleTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0.0, "rgba(255,255,255,1)");
  grd.addColorStop(0.25, "rgba(255,255,255,0.55)");
  grd.addColorStop(0.55, "rgba(255,255,255,0.12)");
  grd.addColorStop(1.0, "rgba(255,255,255,0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

// ---------- Scene factory ----------

export function createUniFundScene(container) {
  const width = container.clientWidth;
  const height = container.clientHeight;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05070a, 0.035);

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 200);
  camera.position.set(0, 0.4, 9.0);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.setClearColor(0x000000, 0);
  renderer.outputEncoding = THREE.sRGBEncoding;
  container.appendChild(renderer.domElement);

  // Particle buffer
  const positions = genDust(PARTICLE_COUNT);
  const currentPositions = new Float32Array(positions); // mutable
  const targets = {
    dust: genDust(PARTICLE_COUNT),
    molecule: genMolecule(PARTICLE_COUNT),
    dna: genDNA(PARTICLE_COUNT),
    brain: genBrain(PARTICLE_COUNT),
  };

  // Per-particle morph delays + speed for organic feel
  const morphDelay = new Float32Array(PARTICLE_COUNT);
  const morphSpeed = new Float32Array(PARTICLE_COUNT);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    morphDelay[i] = Math.random() * 0.6;        // 0..0.6s lag
    morphSpeed[i] = 0.9 + Math.random() * 0.6;  // 0.9..1.5x rate
  }

  const colors = buildColors(PARTICLE_COUNT);

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(currentPositions, 3));
  geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.075,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    map: buildParticleTexture(),
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geom, mat);
  scene.add(points);

  // A second, denser, smaller particle layer ("synapse sparks") for the brain
  const sparkCount = 600;
  const sparkPos = new Float32Array(sparkCount * 3);
  const sparkBase = new Float32Array(sparkCount * 3);
  for (let i = 0; i < sparkCount; i++) {
    // Pick a brain target point as base, jittered
    const j = Math.floor(Math.random() * PARTICLE_COUNT);
    sparkBase[i * 3 + 0] = targets.brain[j * 3 + 0];
    sparkBase[i * 3 + 1] = targets.brain[j * 3 + 1];
    sparkBase[i * 3 + 2] = targets.brain[j * 3 + 2];
    sparkPos[i * 3 + 0] = 0;
    sparkPos[i * 3 + 1] = 0;
    sparkPos[i * 3 + 2] = 0;
  }
  const sparkGeom = new THREE.BufferGeometry();
  sparkGeom.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
  const sparkMat = new THREE.PointsMaterial({
    size: 0.16,
    color: new THREE.Color(0xb89bff),
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    map: buildParticleTexture(),
    sizeAttenuation: true,
  });
  const sparks = new THREE.Points(sparkGeom, sparkMat);
  scene.add(sparks);

  // Soft core glow (sprite)
  const glowTex = buildParticleTexture();
  const glowMat = new THREE.SpriteMaterial({
    map: glowTex,
    color: 0x6a8cff,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glow = new THREE.Sprite(glowMat);
  glow.scale.set(8, 8, 1);
  scene.add(glow);

  // State
  const state = {
    stage: "dust",
    transitioning: false,
    burst: 0, // 0..1 burst factor on stage change
  };

  // Resize
  function onResize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", onResize);

  // Public API
  function transitionTo(stageName) {
    if (!targets[stageName]) return;
    state.stage = stageName;
    state.transitioning = true;
    state.burst = 1.0;
    // Shuffle delays so each transition is unique
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      morphDelay[i] = Math.random() * 0.7;
    }
    // Pulse glow color per stage
    if (stageName === "molecule") glowMat.color.setHex(0x4ad6ff);
    else if (stageName === "dna") glowMat.color.setHex(0x8e6dff);
    else if (stageName === "brain") glowMat.color.setHex(0xff6cc1);
    else glowMat.color.setHex(0x6a8cff);
  }

  // Animation loop
  const clock = new THREE.Clock();
  let stageElapsed = 0;
  let prevStage = "dust";

  function tick() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    if (state.stage !== prevStage) {
      stageElapsed = 0;
      prevStage = state.stage;
    } else {
      stageElapsed += dt;
    }

    const target = targets[state.stage];
    const posAttr = geom.attributes.position;
    const posArr = posAttr.array;

    // Lerp current toward target with per-particle delay/speed
    let totalDelta = 0;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const delay = morphDelay[i];
      const after = Math.max(0, stageElapsed - delay);
      const k = 1 - Math.exp(-after * 2.2 * morphSpeed[i]);
      const i3 = i * 3;
      const swayAmp = state.stage === "dust" ? 0.0
                    : state.stage === "brain" ? 0.012
                    : 0.025;
      const sway = swayAmp * Math.sin(t * 0.9 + i * 0.13);
      const tx = target[i3 + 0] + sway;
      const ty = target[i3 + 1] + Math.cos(t * 0.8 + i * 0.21) * swayAmp;
      const tz = target[i3 + 2] + Math.sin(t * 1.1 + i * 0.17) * swayAmp;
      const nx = posArr[i3 + 0] + (tx - posArr[i3 + 0]) * k;
      const ny = posArr[i3 + 1] + (ty - posArr[i3 + 1]) * k;
      const nz = posArr[i3 + 2] + (tz - posArr[i3 + 2]) * k;
      totalDelta += Math.abs(nx - posArr[i3]) + Math.abs(ny - posArr[i3 + 1]) + Math.abs(nz - posArr[i3 + 2]);
      posArr[i3 + 0] = nx;
      posArr[i3 + 1] = ny;
      posArr[i3 + 2] = nz;
    }
    posAttr.needsUpdate = true;

    // Rotate the whole structure slowly
    if (state.stage === "dna") {
      points.rotation.y += dt * 0.35;
    } else if (state.stage === "brain") {
      points.rotation.y += dt * 0.06;
      points.rotation.x = -0.10 + Math.sin(t * 0.18) * 0.03;
    } else if (state.stage === "molecule") {
      points.rotation.y += dt * 0.22;
      points.rotation.x = Math.sin(t * 0.3) * 0.08;
    } else {
      points.rotation.y += dt * 0.03;
    }

    // Brain sparks
    if (state.stage === "brain") {
      const sparkArr = sparkGeom.attributes.position.array;
      for (let i = 0; i < sparkCount; i++) {
        const phase = t * 1.3 + i * 0.7;
        const breathe = (Math.sin(phase) * 0.5 + 0.5);
        sparkArr[i * 3 + 0] = sparkBase[i * 3 + 0] * (1 + 0.02 * Math.sin(phase * 1.7));
        sparkArr[i * 3 + 1] = sparkBase[i * 3 + 1] * (1 + 0.02 * Math.cos(phase * 1.3));
        sparkArr[i * 3 + 2] = sparkBase[i * 3 + 2] * (1 + 0.02 * Math.sin(phase * 0.9));
        void breathe;
      }
      sparkGeom.attributes.position.needsUpdate = true;
      sparks.rotation.copy(points.rotation);
      sparkMat.opacity = Math.min(0.9, sparkMat.opacity + dt * 0.4);
    } else {
      sparkMat.opacity = Math.max(0.0, sparkMat.opacity - dt * 0.8);
    }

    // Camera slow float + per-stage zoom
    const targetZ = state.stage === "dust" ? 9.0 :
                    state.stage === "molecule" ? 7.6 :
                    state.stage === "dna" ? 7.0 : 6.2;
    const targetY = state.stage === "brain" ? 0.55 : 0.3;
    camera.position.z += (targetZ - camera.position.z) * 0.02;
    camera.position.x = Math.sin(t * 0.18) * 0.22;
    camera.position.y = targetY + Math.cos(t * 0.14) * 0.12;
    camera.lookAt(0, state.stage === "brain" ? -0.05 : 0, 0);

    // Glow pulse
    const burstPulse = Math.max(0, state.burst);
    state.burst = Math.max(0, state.burst - dt * 1.4);
    glowMat.opacity = 0.28 + burstPulse * 0.45 + Math.sin(t * 0.9) * 0.04;
    glow.scale.setScalar(7 + burstPulse * 3 + Math.sin(t * 0.7) * 0.4);

    // Material size pulses on burst
    mat.size = 0.075 + burstPulse * 0.05;

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  return {
    transitionTo,
    destroy() {
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    },
  };
}
