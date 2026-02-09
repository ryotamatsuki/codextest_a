import * as THREE from "https://cdn.skypack.dev/three@0.158.0";

const canvas = document.querySelector("#game");
const bootScreen = document.querySelector("#boot-screen");
const menuScreen = document.querySelector("#menu-screen");
const optionsScreen = document.querySelector("#options-screen");
const pauseScreen = document.querySelector("#pause-screen");
const hud = document.querySelector("#hud");
const positionEl = document.querySelector("#position");
const lapEl = document.querySelector("#lap");
const finalLapEl = document.querySelector("#final-lap");
const timerEl = document.querySelector("#timer");
const splitEl = document.querySelector("#split");
const itemSlotEl = document.querySelector("#item-slot");
const minimap = document.querySelector("#minimap");
const boostTierEl = document.querySelector("#boost-tier");
const miniMapToggle = document.querySelector("#mini-map-toggle");

const bootStart = document.querySelector("#boot-start");
const openOptions = document.querySelector("#open-options");
const closeOptions = document.querySelector("#close-options");
const startRaceBtn = document.querySelector("#start-race");
const resumeBtn = document.querySelector("#resume");
const restartBtn = document.querySelector("#restart");
const exitBtn = document.querySelector("#exit");
const musicToggle = document.querySelector("#music-toggle");
const sfxToggle = document.querySelector("#sfx-toggle");
const mirrorToggle = document.querySelector("#mirror-toggle");
const cloneToggle = document.querySelector("#clone-toggle");

const trackList = document.querySelector("#track-list");
const characterList = document.querySelector("#character-list");
const difficultyList = document.querySelector("#difficulty-list");

const state = {
  screen: "boot",
  paused: false,
  raceActive: false,
  settings: {
    music: true,
    sfx: true,
    minimap: true,
  },
  selection: {
    track: 0,
    character: 0,
    difficulty: 1,
    mirror: false,
    clones: false,
  },
};

const input = {
  accel: 0,
  brake: 0,
  steer: 0,
  drift: false,
  useItem: false,
};

const ITEMS = [
  {
    name: "Pulse Boost",
    use: (kart) => {
      kart.speed += 22;
      kart.boostTimer = Math.max(kart.boostTimer, 1.6);
      playSfx("boost");
    },
  },
  {
    name: "Shield",
    use: (kart) => {
      kart.shieldTimer = 4;
      playSfx("shield");
    },
  },
  {
    name: "Slipstream Burst",
    use: (kart) => {
      kart.speed += 14;
      kart.boostTimer = Math.max(kart.boostTimer, 1.0);
      kart.slipstreamTimer = 2.2;
      playSfx("boost");
    },
  },
  {
    name: "Oil Drip",
    use: (kart) => {
      kart.trailOilTimer = 3.5;
      playSfx("drop");
    },
  },
  {
    name: "Magnet Dash",
    use: (kart) => {
      kart.magnetTimer = 3;
      playSfx("boost");
    },
  },
  {
    name: "Shock Wave",
    use: (kart) => {
      kart.waveTimer = 1.2;
      playSfx("shock");
    },
  },
  {
    name: "Stability Chip",
    use: (kart) => {
      kart.stabilityTimer = 4;
      playSfx("shield");
    },
  },
  {
    name: "Drift Charge",
    use: (kart) => {
      kart.driftCharge = Math.max(kart.driftCharge, 1.2);
      playSfx("boost");
    },
  },
];

const CHARACTERS = [
  { name: "Nova", speed: 1.05, accel: 1.1, handling: 1.0, ai: "bold" },
  { name: "Kite", speed: 1.0, accel: 1.15, handling: 1.1, ai: "smooth" },
  { name: "Brix", speed: 1.1, accel: 0.95, handling: 0.95, ai: "bold" },
  { name: "Rune", speed: 0.98, accel: 1.05, handling: 1.2, ai: "safe" },
  { name: "Lyra", speed: 1.02, accel: 1.0, handling: 1.1, ai: "smooth" },
  { name: "Orion", speed: 1.08, accel: 1.0, handling: 0.9, ai: "bold" },
  { name: "Echo", speed: 0.97, accel: 1.1, handling: 1.25, ai: "safe" },
  { name: "Blitz", speed: 1.12, accel: 0.92, handling: 0.88, ai: "bold" },
];

const DIFFICULTIES = [
  { name: "Chill", speed: 0.92, itemRate: 0.6, aggression: 0.4 },
  { name: "Standard", speed: 1.0, itemRate: 0.75, aggression: 0.6 },
  { name: "Mean", speed: 1.08, itemRate: 0.9, aggression: 0.8 },
];

const TRACKS = [
  {
    name: "Neon Harbour",
    color: "#4f46e5",
    music: [220, 330, 247],
    points: [
      [0, 0, 0],
      [60, 0, -40],
      [140, 0, -20],
      [210, 0, 40],
      [160, 0, 120],
      [40, 0, 100],
      [-40, 0, 60],
      [0, 0, 0],
    ],
    driftZones: [0.18, 0.48, 0.72],
    hazards: [0.24, 0.56, 0.84],
  },
  {
    name: "Voxel Dunes",
    color: "#f97316",
    music: [196, 233, 174],
    points: [
      [0, 0, 0],
      [80, 0, -20],
      [160, 0, 30],
      [120, 0, 130],
      [20, 0, 150],
      [-80, 0, 100],
      [-60, 0, 20],
      [0, 0, 0],
    ],
    driftZones: [0.12, 0.42, 0.66],
    hazards: [0.3, 0.52, 0.9],
  },
  {
    name: "Skyline Circuit",
    color: "#38bdf8",
    music: [247, 311, 208],
    points: [
      [0, 0, 0],
      [100, 0, -60],
      [200, 0, -30],
      [240, 0, 50],
      [180, 0, 120],
      [60, 0, 140],
      [-40, 0, 80],
      [0, 0, 0],
    ],
    driftZones: [0.2, 0.5, 0.78],
    hazards: [0.36, 0.64],
  },
  {
    name: "Aurora Loop",
    color: "#22c55e",
    music: [233, 262, 196],
    points: [
      [0, 0, 0],
      [70, 0, -50],
      [140, 0, -40],
      [190, 0, 10],
      [160, 0, 80],
      [90, 0, 130],
      [0, 0, 120],
      [-40, 0, 60],
      [0, 0, 0],
    ],
    driftZones: [0.1, 0.44, 0.7],
    hazards: [0.26, 0.58, 0.82],
  },
  {
    name: "Starlight Arch",
    color: "#a855f7",
    music: [262, 311, 208],
    points: [
      [0, 0, 0],
      [50, 0, -80],
      [130, 0, -90],
      [210, 0, -20],
      [180, 0, 90],
      [100, 0, 130],
      [0, 0, 110],
      [-40, 0, 40],
      [0, 0, 0],
    ],
    driftZones: [0.22, 0.52, 0.74],
    hazards: [0.33, 0.61, 0.86],
  },
  {
    name: "Pulse Quarry",
    color: "#facc15",
    music: [174, 220, 196],
    points: [
      [0, 0, 0],
      [90, 0, -30],
      [170, 0, 0],
      [200, 0, 70],
      [150, 0, 130],
      [50, 0, 120],
      [-50, 0, 70],
      [-20, 0, 10],
      [0, 0, 0],
    ],
    driftZones: [0.16, 0.46, 0.68],
    hazards: [0.2, 0.4, 0.76],
  },
  {
    name: "Crimson Range",
    color: "#ef4444",
    music: [196, 262, 247],
    points: [
      [0, 0, 0],
      [60, 0, -70],
      [140, 0, -80],
      [210, 0, -20],
      [180, 0, 80],
      [90, 0, 140],
      [0, 0, 120],
      [-60, 0, 40],
      [0, 0, 0],
    ],
    driftZones: [0.14, 0.47, 0.7],
    hazards: [0.28, 0.54, 0.86],
  },
  {
    name: "Glitch Gardens",
    color: "#14b8a6",
    music: [208, 294, 247],
    points: [
      [0, 0, 0],
      [80, 0, -30],
      [140, 0, -70],
      [220, 0, -20],
      [200, 0, 80],
      [120, 0, 140],
      [20, 0, 130],
      [-40, 0, 60],
      [0, 0, 0],
    ],
    driftZones: [0.18, 0.5, 0.77],
    hazards: [0.32, 0.58, 0.9],
  },
];

const keys = new Set();
window.addEventListener("keydown", (event) => {
  if (event.repeat) return;
  keys.add(event.code);
  if (event.code === "Escape" && state.raceActive) {
    togglePause();
  }
  if (event.code === "Space") {
    input.useItem = true;
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
  if (event.code === "Space") {
    input.useItem = false;
  }
});

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color("#0b0d18");
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 40, 80);

const ambient = new THREE.AmbientLight("#c7d2fe", 0.6);
scene.add(ambient);
const sun = new THREE.DirectionalLight("#ffffff", 0.6);
sun.position.set(100, 120, 40);
scene.add(sun);

const world = {
  trackGroup: new THREE.Group(),
  karts: [],
  items: [],
  hazards: [],
  splines: [],
  mapPoints: [],
  trackLength: 1,
};
scene.add(world.trackGroup);

const audio = {
  context: null,
  musicGain: null,
  sfxGain: null,
  loop: null,
};

function createAudio() {
  if (audio.context) return;
  const context = new AudioContext();
  audio.context = context;
  audio.musicGain = context.createGain();
  audio.sfxGain = context.createGain();
  audio.musicGain.connect(context.destination);
  audio.sfxGain.connect(context.destination);
  audio.musicGain.gain.value = 0.2;
  audio.sfxGain.gain.value = 0.25;
}

function playSfx(name) {
  if (!state.settings.sfx) return;
  createAudio();
  const ctx = audio.context;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(audio.sfxGain);
  let freq = 240;
  if (name === "boost") freq = 520;
  if (name === "shield") freq = 320;
  if (name === "drop") freq = 180;
  if (name === "shock") freq = 420;
  osc.frequency.value = freq;
  osc.type = "triangle";
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
  osc.start();
  osc.stop(ctx.currentTime + 0.45);
}

function playMusic(track) {
  if (!state.settings.music) return;
  createAudio();
  if (audio.loop) {
    audio.loop.stop();
  }
  const ctx = audio.context;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(audio.musicGain);
  osc.type = "sine";
  const chord = track.music;
  let step = 0;
  const interval = setInterval(() => {
    if (!audio.context) return;
    osc.frequency.setValueAtTime(chord[step % chord.length], ctx.currentTime);
    step += 1;
  }, 450);
  osc.start();
  audio.loop = osc;
  audio.loop.interval = interval;
}

function stopMusic() {
  if (!audio.loop) return;
  audio.loop.stop();
  clearInterval(audio.loop.interval);
  audio.loop = null;
}

function createButtonList(listEl, items, onSelect, initialIndex = 0) {
  listEl.innerHTML = "";
  items.forEach((item, index) => {
    const button = document.createElement("button");
    button.textContent = item.name;
    if (index === initialIndex) button.classList.add("active");
    button.addEventListener("click", () => {
      listEl.querySelectorAll("button").forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      onSelect(index);
    });
    listEl.appendChild(button);
  });
}

function showScreen(name) {
  [bootScreen, menuScreen, optionsScreen, pauseScreen].forEach((screen) =>
    screen.classList.remove("active")
  );
  if (name === "boot") bootScreen.classList.add("active");
  if (name === "menu") menuScreen.classList.add("active");
  if (name === "options") optionsScreen.classList.add("active");
  if (name === "pause") pauseScreen.classList.add("active");
  state.screen = name;
}

function updateHUD() {
  hud.classList.toggle("hidden", !state.raceActive);
  minimap.style.display = state.settings.minimap ? "block" : "none";
}

function setupMenu() {
  createButtonList(trackList, TRACKS, (index) => (state.selection.track = index));
  createButtonList(characterList, CHARACTERS, (index) => (state.selection.character = index));
  createButtonList(difficultyList, DIFFICULTIES, (index) => (state.selection.difficulty = index), 1);
}

bootStart.addEventListener("click", () => {
  showScreen("menu");
});

openOptions.addEventListener("click", () => {
  showScreen("options");
});

closeOptions.addEventListener("click", () => {
  state.settings.music = musicToggle.checked;
  state.settings.sfx = sfxToggle.checked;
  state.settings.minimap = miniMapToggle.checked;
  if (!state.settings.music) {
    stopMusic();
  } else if (state.raceActive) {
    playMusic(TRACKS[state.selection.track]);
  }
  showScreen("menu");
});

startRaceBtn.addEventListener("click", () => {
  state.selection.mirror = mirrorToggle.checked;
  state.selection.clones = cloneToggle.checked;
  initRace();
});

resumeBtn.addEventListener("click", () => togglePause(false));
restartBtn.addEventListener("click", () => initRace());
exitBtn.addEventListener("click", () => {
  stopMusic();
  state.raceActive = false;
  showScreen("menu");
  hud.classList.add("hidden");
});

function togglePause(force) {
  if (!state.raceActive) return;
  const newState = typeof force === "boolean" ? force : !state.paused;
  state.paused = newState;
  if (state.paused) {
    showScreen("pause");
  } else {
    showScreen("none");
  }
}

function resetWorld() {
  world.trackGroup.clear();
  world.karts = [];
  world.items = [];
  world.hazards = [];
  world.splines = [];
  world.mapPoints = [];
  world.oilPatches = [];
}

function createTrack(track) {
  const group = world.trackGroup;
  const points = track.points.map((p) => {
    const x = state.selection.mirror ? -p[0] : p[0];
    return new THREE.Vector3(x, p[1], p[2]);
  });
  const curve = new THREE.CatmullRomCurve3(points, true);
  world.splines = [curve];
  const segments = 220;
  world.mapPoints = curve.getPoints(segments);
  world.trackLength = curve.getLength();

  const roadMaterial = new THREE.MeshStandardMaterial({ color: track.color });
  const roadGeometry = new THREE.BoxGeometry(12, 2, 12);
  const instanced = new THREE.InstancedMesh(roadGeometry, roadMaterial, segments);
  const dummy = new THREE.Object3D();
  world.mapPoints.forEach((point, i) => {
    dummy.position.copy(point);
    dummy.position.y = -1;
    dummy.updateMatrix();
    instanced.setMatrixAt(i, dummy.matrix);
  });
  group.add(instanced);

  const borderMaterial = new THREE.MeshStandardMaterial({ color: "#1f2937" });
  const borderGeometry = new THREE.BoxGeometry(3, 4, 12);
  const borderLeft = new THREE.InstancedMesh(borderGeometry, borderMaterial, segments);
  const borderRight = new THREE.InstancedMesh(borderGeometry, borderMaterial, segments);
  const tangent = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  world.mapPoints.forEach((point, i) => {
    curve.getTangent(i / segments, tangent);
    normal.copy(tangent).cross(up).normalize();
    const left = point.clone().add(normal.clone().multiplyScalar(-7));
    const right = point.clone().add(normal.clone().multiplyScalar(7));
    dummy.position.copy(left);
    dummy.position.y = 0;
    dummy.rotation.y = Math.atan2(tangent.x, tangent.z);
    dummy.updateMatrix();
    borderLeft.setMatrixAt(i, dummy.matrix);
    dummy.position.copy(right);
    dummy.updateMatrix();
    borderRight.setMatrixAt(i, dummy.matrix);
  });
  group.add(borderLeft, borderRight);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(400, 64),
    new THREE.MeshStandardMaterial({ color: "#0f172a" })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -3;
  group.add(ground);

  track.hazards.forEach((marker) => {
    const hazard = new THREE.Mesh(
      new THREE.BoxGeometry(6, 3, 6),
      new THREE.MeshStandardMaterial({ color: "#ef4444" })
    );
    const pos = curve.getPointAt(marker);
    hazard.position.copy(pos);
    hazard.position.y = 1;
    hazard.userData.progress = marker;
    group.add(hazard);
    world.hazards.push(hazard);
  });

  const driftMarkerMaterial = new THREE.MeshStandardMaterial({ color: "#f8fafc" });
  track.driftZones.forEach((marker) => {
    const drift = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 3), driftMarkerMaterial);
    const pos = curve.getPointAt(marker);
    drift.position.copy(pos);
    drift.position.y = 1;
    drift.userData.progress = marker;
    group.add(drift);
  });
}

function createKart(color) {
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(3, 1.4, 4),
    new THREE.MeshStandardMaterial({ color })
  );
  body.castShadow = true;
  return body;
}

function spawnKarts(track) {
  const baseCurve = world.splines[0];
  const tangent = new THREE.Vector3();
  for (let i = 0; i < 8; i += 1) {
    const characterIndex = state.selection.clones ? state.selection.character : i;
    const data = CHARACTERS[characterIndex];
    const isPlayer = i === 0;
    const kart = createKart(isPlayer ? "#22c55e" : "#64748b");
    const offset = i * 0.02;
    const progress = 0.02 + offset;
    const position = baseCurve.getPointAt(progress);
    baseCurve.getTangent(progress, tangent);
    const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
    kart.position.copy(position.add(normal.multiplyScalar((i % 2 === 0 ? -1 : 1) * 4)));
    kart.position.y = 1;
    kart.userData = {
      progress,
      speed: 0,
      drift: false,
      driftCharge: 0,
      driftSide: 0,
      boostTimer: 0,
      shieldTimer: 0,
      slipstreamTimer: 0,
      stabilityTimer: 0,
      trailOilTimer: 0,
      magnetTimer: 0,
      waveTimer: 0,
      item: null,
      lap: 1,
      lastLapTime: null,
      split: null,
      isPlayer,
      data,
      lane: (i % 3) - 1,
      aiPhase: Math.random(),
    };
    world.karts.push(kart);
    scene.add(kart);
  }
}

function initRace() {
  resetWorld();
  showScreen("none");
  hud.classList.remove("hidden");
  state.raceActive = true;
  state.paused = false;
  updateHUD();
  const track = TRACKS[state.selection.track];
  createTrack(track);
  spawnKarts(track);
  playMusic(track);
  raceTimer.reset();
}

const raceTimer = {
  start: 0,
  elapsed: 0,
  running: false,
  reset() {
    this.start = performance.now();
    this.elapsed = 0;
    this.running = true;
  },
  update() {
    if (!this.running) return;
    this.elapsed = performance.now() - this.start;
  },
  format() {
    const totalMs = this.elapsed;
    const minutes = Math.floor(totalMs / 60000)
      .toString()
      .padStart(2, "0");
    const seconds = Math.floor((totalMs % 60000) / 1000)
      .toString()
      .padStart(2, "0");
    const ms = Math.floor(totalMs % 1000)
      .toString()
      .padStart(3, "0");
    return `${minutes}:${seconds}.${ms}`;
  },
};

function updateInput() {
  input.accel = keys.has("ArrowUp") || keys.has("KeyW") ? 1 : 0;
  input.brake = keys.has("ArrowDown") || keys.has("KeyS") ? 1 : 0;
  input.steer = 0;
  if (keys.has("ArrowLeft") || keys.has("KeyA")) input.steer -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD")) input.steer += 1;
  input.drift = keys.has("ShiftLeft") || keys.has("ShiftRight");
}

function weightedItem(positionIndex) {
  const weights = [
    1 + positionIndex * 0.1,
    1.2,
    1 + positionIndex * 0.15,
    0.8,
    0.9 + positionIndex * 0.1,
    0.7,
    1.1,
    0.8,
  ];
  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < weights.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) return ITEMS[i];
  }
  return ITEMS[0];
}

function assignItem(kart, positionIndex) {
  if (kart.userData.item) return;
  kart.userData.item = weightedItem(positionIndex);
}

function useItem(kart) {
  if (!kart.userData.item) return;
  kart.userData.item.use(kart.userData);
  kart.userData.item = null;
}

function updateItems(dt) {
  const difficulty = DIFFICULTIES[state.selection.difficulty];
  world.karts.forEach((kart) => {
    if (kart.userData.waveTimer > 0) {
      world.karts.forEach((other) => {
        if (other === kart) return;
        const distance = other.position.distanceTo(kart.position);
        if (distance < 10) {
          other.userData.slowTimer = Math.max(other.userData.slowTimer || 0, 0.8);
        }
      });
    }
    if (kart.userData.trailOilTimer > 0 && Math.random() < dt * 2) {
      world.oilPatches.push({
        position: kart.position.clone(),
        timer: 2.2,
      });
    }
  });

  world.oilPatches.forEach((patch) => {
    patch.timer -= dt;
  });
  world.oilPatches = world.oilPatches.filter((patch) => patch.timer > 0);

  world.karts.forEach((kart) => {
    if (kart.userData.isPlayer && input.useItem) {
      useItem(kart);
      input.useItem = false;
    }
    if (!kart.userData.isPlayer && Math.random() < dt * 0.15) {
      useItem(kart);
    }
    if (!kart.userData.item && Math.random() < dt * 0.08 * difficulty.itemRate) {
      const rankIndex = kart.userData.rank ? kart.userData.rank - 1 : 4;
      assignItem(kart, rankIndex);
    }
  });
}

function applyKartPhysics(kart, dt) {
  const data = kart.userData;
  const difficulty = DIFFICULTIES[state.selection.difficulty];
  const baseSpeed = 34 * data.data.speed;
  const accel = 24 * data.data.accel;
  const handling = 1.4 * data.data.handling;
  const topSpeed = baseSpeed * (data.isPlayer ? 1 : difficulty.speed);

  if (data.isPlayer) {
    if (input.accel) data.speed += accel * dt;
    if (input.brake) data.speed -= accel * dt * 1.2;
  } else {
    data.speed += accel * dt * 0.85;
  }

  const maxSpeed = topSpeed + (data.boostTimer > 0 ? 12 : 0);
  data.speed = THREE.MathUtils.clamp(data.speed, 4, maxSpeed);

  let steer = data.isPlayer ? input.steer : data.aiSteer || 0;
  if (data.steerLockTimer > 0) {
    steer *= 0.4;
    data.steerLockTimer -= dt;
  }
  const driftInput = data.isPlayer ? input.drift : data.aiDrift;
  if (driftInput) {
    data.drift = true;
    data.driftSide = steer !== 0 ? Math.sign(steer) : data.driftSide || 1;
    data.driftCharge += dt * (0.6 + Math.abs(steer) * 0.6);
  } else if (data.drift) {
    const charge = data.driftCharge;
    if (charge >= 1.5) {
      data.boostTimer = Math.max(data.boostTimer, 1.5);
    } else if (charge >= 1.1) {
      data.boostTimer = Math.max(data.boostTimer, 1.1);
    } else if (charge >= 0.7) {
      data.boostTimer = Math.max(data.boostTimer, 0.7);
    }
    data.driftCharge = 0;
    data.drift = false;
  }

  const driftFactor = data.drift ? 1.8 : 1.0;
  data.lateral = (data.lateral || 0) + steer * handling * driftFactor * dt * 6;
  data.lateral *= 0.92;

  const roadLimit = 5.2;
  const offroad = Math.abs(data.lateral) > roadLimit;
  if (offroad) {
    const offroadSlow = data.boostTimer > 0 || data.stabilityTimer > 0 ? 0.95 : 0.9;
    data.speed *= offroadSlow;
    data.lateral *= 0.8;
  }

  if (data.slowTimer > 0) {
    data.speed *= 0.96;
    data.slowTimer -= dt;
  }

  if (data.boostTimer > 0) {
    data.boostTimer -= dt;
  }
  if (data.shieldTimer > 0) data.shieldTimer -= dt;
  if (data.slipstreamTimer > 0) data.slipstreamTimer -= dt;
  if (data.trailOilTimer > 0) data.trailOilTimer -= dt;
  if (data.magnetTimer > 0) data.magnetTimer -= dt;
  if (data.waveTimer > 0) data.waveTimer -= dt;
  if (data.stabilityTimer > 0) data.stabilityTimer -= dt;

  world.oilPatches.forEach((patch) => {
    const distance = patch.position.distanceTo(kart.position);
    if (distance < 4) {
      data.steerLockTimer = Math.max(data.steerLockTimer || 0, 0.6);
      data.speed *= 0.92;
    }
  });

  world.hazards.forEach((hazard) => {
    const distance = hazard.position.distanceTo(kart.position);
    if (distance < 5) {
      data.slowTimer = Math.max(data.slowTimer || 0, 1.0);
    }
  });

  const speedFactor = data.speed / world.trackLength;
  data.progress += speedFactor * dt * 1.2;
  if (data.progress >= 1) {
    data.progress -= 1;
    data.lap += 1;
    data.split = raceTimer.format();
    data.lastLapTime = raceTimer.elapsed;
  }
}

function updateKartVisual(kart) {
  const data = kart.userData;
  const curve = world.splines[0];
  const tangent = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const progress = data.progress;
  const position = curve.getPointAt(progress);
  curve.getTangent(progress, tangent);
  normal.copy(tangent).cross(up).normalize();
  const lateralOffset = data.lateral || 0;
  const adjusted = position.clone().add(normal.multiplyScalar(lateralOffset));
  kart.position.copy(adjusted);
  kart.position.y = 1;
  const angle = Math.atan2(tangent.x, tangent.z);
  kart.rotation.y = angle + (data.drift ? data.driftSide * 0.3 : 0);
}

function updateAI(dt) {
  const curve = world.splines[0];
  world.karts.forEach((kart, index) => {
    if (kart.userData.isPlayer) return;
    const data = kart.userData;
    const targetProgress = data.progress + 0.02;
    const tangent = curve.getTangentAt(targetProgress % 1);
    const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
    const aheadPoint = curve.getPointAt(targetProgress % 1);
    const laneWidth = 2.6;
    const laneTarget = data.lane * laneWidth;
    const target = aheadPoint.clone().add(normal.multiplyScalar(laneTarget));
    const toTarget = target.clone().sub(kart.position);
    data.aiSteer = THREE.MathUtils.clamp(toTarget.dot(normal) * 0.05, -1, 1);

    const hazardAhead = world.hazards.find(
      (hazard) => Math.abs(hazard.userData.progress - data.progress) < 0.04
    );
    if (hazardAhead) {
      data.aiSteer += hazardAhead.position.x > kart.position.x ? -0.5 : 0.5;
    }

    const driftZone = TRACKS[state.selection.track].driftZones.some(
      (zone) => Math.abs(zone - data.progress) < 0.03
    );
    data.aiDrift = driftZone && Math.random() < 0.9;

    const laneBias = data.data.ai === "bold" ? 0.4 : data.data.ai === "safe" ? 0.15 : 0.25;
    if (Math.random() < dt * laneBias) {
      data.lane = THREE.MathUtils.clamp(data.lane + (Math.random() > 0.5 ? 1 : -1), -1, 1);
    }
  });
}

function updateRanking() {
  const sorted = [...world.karts].sort((a, b) => {
    const scoreA = a.userData.lap + a.userData.progress;
    const scoreB = b.userData.lap + b.userData.progress;
    return scoreB - scoreA;
  });
  sorted.forEach((kart, index) => {
    kart.userData.rank = index + 1;
  });
  const player = world.karts.find((kart) => kart.userData.isPlayer);
  positionEl.textContent = `${player.userData.rank} / 8`;
  lapEl.textContent = `Lap ${player.userData.lap} / 3`;
  finalLapEl.classList.toggle("hidden", player.userData.lap < 3);
  itemSlotEl.textContent = player.userData.item ? player.userData.item.name : "None";
  splitEl.textContent = player.userData.split ? `Split: ${player.userData.split}` : "Split: --";
  boostTierEl.classList.toggle("hidden", player.userData.driftCharge < 0.4);
  if (player.userData.driftCharge >= 1.5) boostTierEl.textContent = "Tier 3";
  else if (player.userData.driftCharge >= 1.1) boostTierEl.textContent = "Tier 2";
  else boostTierEl.textContent = "Tier 1";

  if (player.userData.lap > 3) {
    state.raceActive = false;
    stopMusic();
    hud.classList.add("hidden");
    showScreen("menu");
  }
}

function drawMinimap() {
  if (!state.settings.minimap) return;
  const ctx = minimap.getContext("2d");
  ctx.clearRect(0, 0, minimap.width, minimap.height);
  ctx.strokeStyle = "#9aa5f7";
  ctx.lineWidth = 2;
  ctx.beginPath();
  world.mapPoints.forEach((point, index) => {
    const x = minimap.width / 2 + point.x * 0.5;
    const y = minimap.height / 2 + point.z * 0.5;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.stroke();
  world.karts.forEach((kart) => {
    const point = world.splines[0].getPointAt(kart.userData.progress);
    const x = minimap.width / 2 + point.x * 0.5;
    const y = minimap.height / 2 + point.z * 0.5;
    ctx.fillStyle = kart.userData.isPlayer ? "#22c55e" : "#94a3b8";
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

function updateCamera() {
  const player = world.karts.find((kart) => kart.userData.isPlayer);
  if (!player) return;
  const tangent = world.splines[0].getTangentAt(player.userData.progress);
  const behind = player.position
    .clone()
    .sub(tangent.clone().multiplyScalar(18))
    .add(new THREE.Vector3(0, 10, 0));
  camera.position.lerp(behind, 0.08);
  camera.lookAt(player.position);
}

function animate() {
  requestAnimationFrame(animate);
  if (!state.raceActive || state.paused) {
    renderer.render(scene, camera);
    return;
  }
  const now = performance.now();
  const dt = Math.min((now - (animate.last || now)) / 1000, 0.05);
  animate.last = now;
  updateInput();
  raceTimer.update();
  updateAI(dt);
  world.karts.forEach((kart) => {
    applyKartPhysics(kart, dt);
    updateKartVisual(kart);
  });
  updateItems(dt);
  updateRanking();
  drawMinimap();
  updateCamera();
  timerEl.textContent = raceTimer.format();
  renderer.render(scene, camera);
}

setupMenu();
showScreen("boot");
updateHUD();
animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener("click", () => {
  if (!audio.context) createAudio();
});
