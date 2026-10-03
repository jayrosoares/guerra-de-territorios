"use strict";

/* ===================== ELEMENTOS ===================== */
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const statusLabel = document.getElementById("status");
const scorePanel = document.getElementById("scores");
const startButton = document.getElementById("startButton");
const pauseButton = document.getElementById("pauseButton");
const resetButton = document.getElementById("resetButton");
const playAgainButton = document.getElementById("playAgainButton");
const speedSelect = document.getElementById("speedSelect");
const resultDialog = document.getElementById("resultDialog");
const resultTitle = document.getElementById("resultTitle");
const resultText = document.getElementById("resultText");

/* ===================== SOM DE FUNDO ===================== */
const music = new Audio("guerraporterritorioedit.mp3");
music.loop = true;
music.volume = 0.5;
let musicOn = true;

const audioBox = document.createElement("label");
audioBox.className = "speed-control";
const musicButton = document.createElement("button");
musicButton.type = "button";
musicButton.textContent = "🔊 Som";
const volumeSlider = document.createElement("input");
volumeSlider.type = "range";
volumeSlider.min = "0";
volumeSlider.max = "100";
volumeSlider.value = "50";
volumeSlider.style.width = "90px";
volumeSlider.setAttribute("aria-label", "Volume da música");
audioBox.append(musicButton, volumeSlider);
document.querySelector(".controls").appendChild(audioBox);

function playMusic() {
  if (musicOn) music.play().catch(() => {}); // navegador exige clique antes de tocar
}

musicButton.addEventListener("click", () => {
  musicOn = !musicOn;
  musicButton.textContent = musicOn ? "🔊 Som" : "🔇 Mudo";
  if (musicOn && running) playMusic();
  else music.pause();
});

volumeSlider.addEventListener("input", () => {
  music.volume = Number(volumeSlider.value) / 100;
});

/* ===================== ARENA DE PIXELS ===================== */
const COLS = 480;               // resolução da tinta (pixels)
const ROWS = 360;
const EMPTY = 255;
const GRID_STEP = 40;           // grid decorativo grosso
const EMPTY_RGB = [214, 214, 214];

const TOWER_R = 30;             // raio visual da torre (pixels da arena)
const BASE_R = 24;              // área inicial pintada
const PAINT_PER_SHOT = 55;      // partículas por tiro
const PAINT_SPEED = 270;        // px/s
const PAINT_DRAG = 0.85;        // atrito (maior = jato mais curto)
const PAINT_CONE = 0.16;        // abertura do jato (rad)
const PAINT_ENERGY = 7;         // energia de cada partícula
const MAX_PARTICLES = 14000;
const WALL_BOUNCE = 0.9;        // energia mantida no ricochete (1 = sem perda)
const OPENING_BURST = 20;       // rajada inicial mirando o centro
const CIRCLE_SPEED = 150;       // px/s do círculo do LIBERAR
const CIRCLE_LIFE = 8;          // segundos máximos do círculo
const AI_THINK = 0.1;           // intervalo de decisão do bot (s)
const RELEASE_MIN_AMMO = 1500;  // bot guarda o LIBERAR até ter esse estoque
const SCAN_RANGE = 600;         // alcance da análise da mira (pixels da arena)
const DEFENSE_RANGE = TOWER_R * 2.5; // distância que ativa a defesa contra o LIBERAR
const DEFENSE_TURN_SPEED = 7;   // giro rápido da mira de defesa (rad/s)
const DEFENSE_FIRE_INTERVAL = 0.08; // cadência dos tiros de defesa (s)
const CIRCLE_HIT_AREA = 3;      // pixels de área que cada partícula arranca da bola
const CIRCLE_PUSH = 0.004;      // quanto cada partícula empurra/desvia a bola
const CIRCLE_MIN_R = 1.5;       // abaixo disso a bola some

/* ===================== RECOMPENSAS POR MUNIÇÃO ===================== */
// Cada marco é concedido uma única vez por torre
const REWARDS = [
  { at: 1_000,     text: "+100 TIROS",   apply: t => { t.ammo += 100; } },
  { at: 2_000,     text: "+200 TIROS",   apply: t => { t.ammo += 200; } },
  { at: 3_000,     text: "+300 TIROS",   apply: t => { t.ammo += 300; } },
  { at: 4_000,     text: "+400 TIROS",   apply: t => { t.ammo += 400; } },
  { at: 5_000,     text: "+500 TIROS",   apply: t => { t.ammo += 500; } },
  { at: 10_000,     text: "+1000 TIROS",   apply: t => { t.ammo += 1000; } },
  { at: 15_000,    text: "+1500 TIROS",   apply: t => { t.ammo += 1500; } },
  { at: 20_000,     text: "+2000 TIROS",   apply: t => { t.ammo += 2000; } },
  { at: 30_000,     text: "+3000 TIROS",   apply: t => { t.ammo += 3000; } },
  { at: 40_000,     text: "+4000 TIROS",   apply: t => { t.ammo += 4000; } },
  { at: 50_000,    text: "+5000 TIROS",  apply: t => { t.ammo += 5000; } },
  { at: 100_000,     text: "+10000 TIROS",   apply: t => { t.ammo += 10000; } },
  { at: 200_000,     text: "+20000 TIROS",   apply: t => { t.ammo += 20000; } },
  { at: 450_000,     text: "+45000 TIROS",   apply: t => { t.ammo += 45000; } },
  { at: 250_000,   text: "+2 LIBERAR",   apply: t => { t.specials.lib += 2; } },
  { at: 500_000,   text: "+1M ESCUDO",   apply: t => { t.shield += 1_000_000; } },
  { at: 1_000_000, text: "BOLINHA x2",   apply: t => { t.marbleMult = 2; } }
];

/* ===================== CONFIGURAÇÕES ===================== */
const SHIELD_START = 10_000_000;
const SHIELD_DAMAGE_PER_HIT = 1;   // por partícula

const BULLET_INTERVAL = 0.42;
const BURST_INTERVAL = 0.075;
const MARBLE_INTERVAL = 1.1;

const TERRITORY_BONUS_STEP = 3000;
const TERRITORY_BONUS_PERCENT = 0.05;

const LIGHT_INTERVAL = 5;
const LIGHT_RADIUS = 7;
const MAX_LIGHTS = 1;

const multipliers = [2, 4, 8, 8, 4, 2];
const MULT_BIN_W = 0.125;
const GAP_LEFT = MULT_BIN_W * 3;
const GAP_RIGHT = 1 - MULT_BIN_W * 3;
const WALL_THICKNESS = 2;
const MULT_WALL_EXTRA = 26;
const POWER_WALL_EXTRA = 16;
const OBSTACLE_RESTITUTION = 0.5;
const PEG_RADIUS = 3.2;
const PEG_SPACING = 0.1;
const UPPER_BARS = [
  { x1: 0.14, x2: 0.62 }, { x1: 0.38, x2: 0.86 }, { x1: 0.14, x2: 0.62 },
  { x1: 0.38, x2: 0.86 }, { x1: 0.14, x2: 0.46 }
];
const LOWER_BARS = [{ x1: 0.38, x2: 0.62 }, { x1: 0.46, x2: 0.54 }];

const powerSlots = [
  { name: "750 TIROS", short: "750" },
  { name: "MEGA", short: "MEGA" },
  { name: "250 TIROS", short: "250" },
  { name: "+3000", short: "+3000" },
  { name: "LIBERAR", short: "%" }
];

const teams = [
  { name: "Azul", color: "#1f6fd6", glow: "#7fb4ff", shot: "#ff7a00" },
  { name: "Verde", color: "#1fb84f", glow: "#8dffb0", shot: "#ff2fd6" },
  { name: "Vermelho", color: "#d01f30", glow: "#ff8f9a", shot: "#00e5ff" },
  { name: "Amarelo", color: "#e8c40f", glow: "#fff0a0", shot: "#7a2cff" }
];
const teamRGB = teams.map(t => [1, 3, 5].map(i => parseInt(t.color.slice(i, i + 2), 16)));

/* ===================== ESTADO ===================== */
const owners = new Uint8Array(COLS * ROWS);
const paintCanvas = document.createElement("canvas");
paintCanvas.width = COLS;
paintCanvas.height = ROWS;
const pctx = paintCanvas.getContext("2d");
const imageData = pctx.createImageData(COLS, ROWS);
const buf = imageData.data;

let counts = [0, 0, 0, 0];
let towers = [];
let particles = [];
let circles = [];
let marbles = [];
let popups = [];
let lights = [];
let lightTimer = 0;
let running = false;
let gameOver = false;
let speedMultiplier = 1;
let lastFrame = 0;
let marbleTimer = 0;
let nextMarbleTeam = 0;
let scoreTimer = 0;
let layout = {};

/* ===================== PIXELS ===================== */
function setPixel(i, team) {
  const c = team === EMPTY ? EMPTY_RGB : teamRGB[team];
  const o = i * 4;
  buf[o] = c[0]; buf[o + 1] = c[1]; buf[o + 2] = c[2]; buf[o + 3] = 255;
}

function capturePixel(i, team) {
  const prev = owners[i];
  if (prev === team) return false;
  if (prev !== EMPTY) counts[prev]--;
  owners[i] = team;
  counts[team]++;
  setPixel(i, team);
  applyTerritoryBonus(team);
  return true;
}

function paintDisc(cx, cy, r, team) {
  for (let y = Math.floor(cy - r); y <= cy + r; y++) {
    for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      if (x < 0 || y < 0 || x >= COLS || y >= ROWS) continue;
      const jag = r * (0.8 + Math.random() * 0.3); // borda irregular
      if (Math.hypot(x - cx, y - cy) <= jag) capturePixel(y * COLS + x, team);
    }
  }
}

/* ===================== INICIALIZAÇÃO ===================== */
function createTower(team, x, y, angle, rotationSpeed) {
  return {
    team, x, y, angle, rotationSpeed,
    cooldown: 0.2 + team * 0.12, burstCooldown: 0,
    ammo: 30, burstQueue: 0, prepaidBurstQueue: 0, giantQueue: 0,
    shield: SHIELD_START, territoryMark: 0, alive: true, holdAim: true,
    specials: { b15: 0, mega: 0, b25: 0, p70: 0, lib: 0 },
    think: 0, defenseCooldown: 0,
    rewardsGot: 0, marbleMult: 1, earned: 0
  };
}

function resetGame(startImmediately = false) {
  owners.fill(EMPTY);
  for (let i = 0; i < COLS * ROWS; i++) setPixel(i, EMPTY);
  counts = [0, 0, 0, 0];
  particles = []; circles = []; marbles = []; popups = []; lights = [];
  lightTimer = 0; marbleTimer = 0; nextMarbleTeam = 0; scoreTimer = 0;
  gameOver = false;
  resultDialog.style.display = "none";

  const m = 42;
  const toCenter = (x, y) => Math.atan2(ROWS / 2 - y, COLS / 2 - x);
  // Sentidos de giro variados (rad/s; negativo = anti-horário)
  towers = [
    createTower(0, m, m, toCenter(m, m), 0.9),
    createTower(1, COLS - m, m, toCenter(COLS - m, m), -1.0),
    createTower(2, m, ROWS - m, toCenter(m, ROWS - m), -0.95),
    createTower(3, COLS - m, ROWS - m, toCenter(COLS - m, ROWS - m), 1.05)
  ];
  for (const t of towers) {
    paintDisc(t.x, t.y, BASE_R + 14, t.team);
    t.territoryMark = counts[t.team];
    // Rajada inicial no centro (gratuita)
    t.burstQueue = OPENING_BURST;
    t.prepaidBurstQueue = OPENING_BURST;
  }

  running = startImmediately;
  statusLabel.textContent = running ? "Partida em andamento" : "Pronto para iniciar";
  startButton.textContent = running ? "Em andamento" : "Iniciar";
  pauseButton.textContent = "Pausar";
  renderScores();
  draw();
  if (running) lastFrame = performance.now();
}

function renderScores() {
  scorePanel.innerHTML = teams.map((team, i) => {
    const t = towers[i];
    return `
      <div class="score ${t && !t.alive ? "dead" : ""}">
        <strong style="color:${team.color}">${team.name}</strong>
        ${counts[i].toLocaleString("pt-BR")} pixels<br>
        <span class="shield">Escudo: ${formatShield(t?.shield ?? SHIELD_START)}</span><br>
        <span>Munição: ${(t?.ammo ?? 0).toLocaleString("pt-BR")}</span><br>
        <span>150:${t?.specials.b15 ?? 0} M:${t?.specials.mega ?? 0} 25:${t?.specials.b25 ?? 0} +300:${t?.specials.p70 ?? 0} L:${t?.specials.lib ?? 0}</span><br>
        <span>Bônus: ${t?.rewardsGot ?? 0}/${REWARDS.length} • Total: ${(t?.earned ?? 0).toLocaleString("pt-BR")}${t?.marbleMult > 1 ? " • Bolinha x2" : ""}</span>
      </div>`;
  }).join("");
}

// Valor exato do escudo (ex.: 9.998.500)
function formatShield(v) {
  return Math.max(0, Math.floor(v)).toLocaleString("pt-BR");
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

/* ===================== LAYOUT ===================== */
function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  layout = calculateLayout(width, height);
  draw();
}

function calculateLayout(width, height) {
  const mobile = width <= 720;
  const headerBottom = mobile ? 105 : 12;
  const playHeight = Math.max(180, height - headerBottom - 22);

  if (!mobile) {
    const panelW = Math.min(255, width * 0.25);
    const panel = { x: 12, y: headerBottom, w: panelW, h: playHeight };
    const areaX = 12 + panelW + 14;
    const areaW = width - areaX - 248;
    const cell = Math.min(areaW / COLS, playHeight / ROWS);
    const w = cell * COLS, h = cell * ROWS;
    return {
      mobile, panel,
      board: { x: areaX + (areaW - w) / 2, y: headerBottom + (playHeight - h) / 2, cell, w, h }
    };
  }

  const panelH = Math.min(205, Math.max(150, playHeight * 0.33));
  const panel = { x: 12, y: headerBottom, w: width - 24, h: panelH };
  const boardY = headerBottom + panelH + 10;
  const areaH = Math.max(120, height - boardY - 20);
  const cell = Math.min((width - 24) / COLS, areaH / ROWS);
  const w = cell * COLS, h = cell * ROWS;
  return {
    mobile, panel,
    board: { x: (width - w) / 2, y: boardY + (areaH - h) / 2, cell, w, h }
  };
}

function getPanelMetrics() {
  const { x, y, w, h } = layout.panel;
  const powerBandH = 36;
  const playTop = y + 38;
  const powerY = y + h - powerBandH;
  const playHeight = Math.max(40, powerY - playTop);
  const multiplierY = playTop + playHeight * 0.57;
  const multiplierBandH = 25;
  return {
    x, y, w, h, playTop, playHeight, multiplierY, multiplierBandH, powerY, powerBandH,
    multiplierTopT: (multiplierY - playTop) / playHeight,
    dividerT: (multiplierY + multiplierBandH - playTop) / playHeight
  };
}

function draw() {
  if (!layout.panel || !layout.board) return;
  ctx.fillStyle = "#090b0e";
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  drawMarbleBoard();
  drawTerritoryBoard();
}

/* ===================== PAINEL DAS BOLINHAS ===================== */
function getMarbleRadius(pw) { return Math.max(3, Math.min(5.5, pw * 0.018)); }

function drawMarbleBoard() {
  const m = getPanelMetrics();
  const { x, y, w, h, playTop, playHeight, multiplierY, multiplierBandH, powerY, powerBandH } = m;

  ctx.fillStyle = "#050607";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#3c444e";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);

  ctx.fillStyle = "#f2f5f8";
  ctx.font = `bold ${layout.mobile ? 10 : 12}px system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("BOLINHAS → MUNIÇÃO E PODERES", x + 8, y + 15);
  ctx.fillStyle = "#8d98a5";
  ctx.font = `${layout.mobile ? 8 : 10}px system-ui, sans-serif`;
  ctx.fillText("A queda define o multiplicador e o reforço", x + 8, y + 29);

  ctx.fillStyle = "#b8bec5";
  for (const ob of getMarbleObstacles(m)) {
    ctx.beginPath();
    ctx.arc(x + ob.left, playTop + ob.top, ob.r, 0, Math.PI * 2);
    ctx.fill();
  }

  drawBins(x, multiplierY, w, multiplierBandH, true);
  drawBins(x, powerY, w, powerBandH, false);

  ctx.beginPath();
  ctx.strokeStyle = "#c3ccd6";
  ctx.lineWidth = WALL_THICKNESS;
  for (const wall of getMarbleWalls(m)) {
    ctx.moveTo(x + wall.x * w, playTop + wall.y1 * playHeight);
    ctx.lineTo(x + wall.x * w, playTop + wall.y2 * playHeight);
  }
  ctx.stroke();

  const r = getMarbleRadius(w);
  for (const mb of marbles) {
    ctx.beginPath();
    ctx.fillStyle = teams[mb.team].color;
    ctx.shadowColor = teams[mb.team].color;
    ctx.shadowBlur = 8;
    ctx.arc(x + mb.x * w, playTop + mb.y * playHeight, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${layout.mobile ? 7 : 8}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(mb.value, x + mb.x * w, playTop + mb.y * playHeight - r - 5);
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${layout.mobile ? 9 : 11}px system-ui, sans-serif`;
  for (const p of popups) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = teams[p.team].color;
    ctx.fillText(p.text, x + p.x * w, playTop + p.y * playHeight - (1 - p.life) * 16);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#aeb8c3";
  ctx.font = `${layout.mobile ? 7 : 9}px system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("MULTIPLICADOR", x + 5, multiplierY - MULT_WALL_EXTRA - 4);
  ctx.fillText("REFORÇO DA TORRE", x + 5, powerY - POWER_WALL_EXTRA - 4);
}

function drawBins(x, y, w, h, isMult) {
  const n = isMult ? multipliers.length : powerSlots.length;
  const binW = isMult ? w * MULT_BIN_W : w / n;

  for (let i = 0; i < n; i++) {
    const bx = isMult ? x + getMultiplierBinX(i) * w : x + i * binW;
    const hl = isMult ? multipliers[i] === 8 : i === 1;
    ctx.fillStyle = hl ? (isMult ? "#3b4855" : "#493451") : "#27313b";
    ctx.fillRect(bx, y, binW, h);
    ctx.strokeStyle = "#58636f";
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, y, binW, h);
    ctx.fillStyle = !isMult && i === 1 ? "#f5c8ff" : "#f1f5f8";
    ctx.font = `bold ${layout.mobile ? (isMult ? 9 : 7) : (isMult ? 11 : 9)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(isMult ? `x${multipliers[i]}` : powerSlots[i].name, bx + binW / 2, y + h / 2);
  }
}

function getObstacleDefs(dividerT) {
  const defs = [];
  const step = Math.max(0.045, (dividerT - 0.22) / 5);
  UPPER_BARS.forEach((b, r) => defs.push({ ...b, y: 0.12 + r * step }));
  const ls = Math.min(0.76, dividerT + 0.12);
  LOWER_BARS.forEach((b, r) => defs.push({ ...b, y: ls + r * (0.91 - ls) }));
  return defs;
}

function getMarbleObstacles({ w, playHeight, dividerT }) {
  const pegs = [];
  for (const d of getObstacleDefs(dividerT)) {
    const span = d.x2 - d.x1;
    const count = Math.max(1, Math.round(span / PEG_SPACING));
    for (let i = 0; i <= count; i++) {
      const px = (d.x1 + (span * i) / count) * w;
      const py = d.y * playHeight;
      pegs.push({ left: px, right: px, top: py, bottom: py, r: PEG_RADIUS });
    }
  }
  return pegs;
}

function getMultiplierBinX(i) {
  return i < 3 ? i * MULT_BIN_W : GAP_RIGHT + (i - 3) * MULT_BIN_W;
}

function getMultiplierBinIndex(x) {
  if (x < 0.5) return clamp(Math.floor(x / MULT_BIN_W), 0, 2);
  return 3 + clamp(Math.floor((x - GAP_RIGHT) / MULT_BIN_W), 0, 2);
}

function getMarbleWalls({ playHeight, multiplierTopT, dividerT, powerBandH }) {
  const walls = [];
  const multTop = multiplierTopT - MULT_WALL_EXTRA / playHeight;
  const xs = [
    MULT_BIN_W, MULT_BIN_W * 2, GAP_LEFT,
    GAP_RIGHT, GAP_RIGHT + MULT_BIN_W, GAP_RIGHT + MULT_BIN_W * 2
  ];
  for (const wx of xs) walls.push({ x: wx, y1: multTop, y2: dividerT });

  const pt = 1 - POWER_WALL_EXTRA / playHeight;
  const pb = 1 + powerBandH / playHeight;
  for (let i = 1; i < powerSlots.length; i++) {
    walls.push({ x: i / powerSlots.length, y1: pt, y2: pb });
  }
  return walls;
}

function bounceOffWalls(mb, walls, w, ph) {
  const r = getMarbleRadius(w);
  const limit = r + WALL_THICKNESS / 2;
  const px = mb.x * w;
  const py = mb.y * ph;

  for (const wall of walls) {
    if (py < wall.y1 * ph - r || py > wall.y2 * ph + r) continue;
    const dx = px - wall.x * w;
    if (Math.abs(dx) >= limit) continue;
    const side = dx !== 0 ? Math.sign(dx) : (Math.random() < 0.5 ? -1 : 1);
    mb.x = (wall.x * w + side * limit) / w;
    mb.vx = side * Math.max(Math.abs(mb.vx) * 0.7, 0.08);
    mb.vy *= 0.92;
    return;
  }
}

function bounceOffObstacles(mb, obstacles, w, ph) {
  const r = getMarbleRadius(w);
  let px = mb.x * w;
  let py = mb.y * ph;

  for (const ob of obstacles) {
    const dx = px - ob.left;
    const dy = py - ob.top;
    const d = Math.hypot(dx, dy);
    const reach = r + ob.r;
    if (d >= reach) continue;

    const nx = d === 0 ? 0 : dx / d;
    const ny = d === 0 ? -1 : dy / d;
    px = ob.left + nx * reach;
    py = ob.top + ny * reach;

    let vx = mb.vx * w;
    let vy = mb.vy * ph;
    const vn = vx * nx + vy * ny;
    if (vn < 0) {
      vx -= (1 + OBSTACLE_RESTITUTION) * vn * nx;
      vy -= (1 + OBSTACLE_RESTITUTION) * vn * ny;
    }
    mb.vx = vx / w;
    mb.vy = vy / ph;

    if (ny < -0.5) {
      let dir = px < ob.left ? -1 : 1;
      if (Math.random() < 0.15) dir *= -1;
      if (Math.sign(mb.vx) !== dir || Math.abs(mb.vx) < 0.1) {
        mb.vx = dir * (0.12 + Math.random() * 0.2);
      }
    }
  }

  mb.x = px / w;
  mb.y = py / ph;
}

function addPopup(mb, text) {
  popups.push({ x: mb.x, y: mb.y, text, team: mb.team, life: 1 });
}

function spawnMarble() {
  const team = nextMarbleTeam;
  nextMarbleTeam = (nextMarbleTeam + 1) % teams.length;
  if (!towers[team].alive) return;
  marbles.push({
    team,
    x: 0.12 + Math.random() * 0.76,
    y: 0.02,
    vx: (Math.random() - 0.5) * 0.12,
    vy: 0.08,
    value: (20 + Math.floor(Math.random() * 31)) * towers[team].marbleMult, // 20–50 (x2 após 1M)
    done: false
  });
}

function updateMarbles(dt) {
  const m = getPanelMetrics();
  const { w, playHeight, dividerT, multiplierTopT, powerBandH } = m;
  const walls = getMarbleWalls(m);
  const obs = getMarbleObstacles(m);
  const collectBinT = multiplierTopT + 8 / playHeight;
  const collectPowerT = 1 + (powerBandH * 0.6) / playHeight;

  marbleTimer += dt;
  while (marbleTimer >= MARBLE_INTERVAL) {
    marbleTimer -= MARBLE_INTERVAL;
    spawnMarble();
  }

  for (const mb of marbles) {
    mb.vy += 1.15 * dt;
    mb.x += mb.vx * dt;
    mb.y += mb.vy * dt;
    if (mb.x < 0.035) { mb.x = 0.035; mb.vx = Math.abs(mb.vx) * 0.8; }
    else if (mb.x > 0.965) { mb.x = 0.965; mb.vx = -Math.abs(mb.vx) * 0.8; }

    bounceOffObstacles(mb, obs, w, playHeight);
    bounceOffWalls(mb, walls, w, playHeight);

    if (mb.y >= collectBinT && mb.y <= dividerT && (mb.x < GAP_LEFT || mb.x > GAP_RIGHT)) {
      const ammo = mb.value * multipliers[getMultiplierBinIndex(mb.x)];
      addAmmo(towers[mb.team], ammo);
      addPopup(mb, `+${ammo}`);
      mb.done = true;
      continue;
    }

    if (mb.y >= collectPowerT) {
      const bin = clamp(Math.floor(mb.x * powerSlots.length), 0, powerSlots.length - 1);
      awardPower(mb, bin);
      addPopup(mb, powerSlots[bin].short);
      mb.done = true;
    }
  }

  marbles = marbles.filter(mb => !mb.done);
  for (const p of popups) p.life -= dt * 1.4;
  popups = popups.filter(p => p.life > 0);
}

const SPECIAL_KEYS = ["b15", "mega", "b25", "p70", "lib"];

// Reforço fica armazenado como tiro especial; o bot decide quando usar
function awardPower(mb, bin) {
  const t = towers[mb.team];
  addAmmo(t, mb.value);
  t.specials[SPECIAL_KEYS[bin]]++;
}

function useRelease(t) {
  const stored = t.ammo;
  const rel = Math.floor(stored * (0.25 + Math.random() * 0.75));
  if (rel <= 0) return false;
  t.ammo -= rel;
  const ratio = stored >= 1_000_000 ? 1 : stored >= 500_000 ? 0.5 : 0.25;
  launchCircle(t, TOWER_R * ratio, rel);
  return true;
}

/* ===================== ARENA: DESENHO ===================== */
function drawTerritoryBoard() {
  const { x, y, cell, w, h } = layout.board;

  pctx.putImageData(imageData, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(paintCanvas, x, y, w, h);

  ctx.beginPath();
  ctx.strokeStyle = "rgba(0, 0, 0, 0.13)";
  ctx.lineWidth = 1;
  for (let c = 0; c <= COLS; c += GRID_STEP) {
    ctx.moveTo(x + c * cell, y);
    ctx.lineTo(x + c * cell, y + h);
  }
  for (let r = 0; r <= ROWS; r += GRID_STEP) {
    ctx.moveTo(x, y + r * cell);
    ctx.lineTo(x + w, y + r * cell);
  }
  ctx.stroke();

  drawLights();
  drawParticles();
  drawCircles();
  drawTowers();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
}

function drawParticles() {
  const { x, y, cell } = layout.board;
  const s = Math.max(1, cell * 1.2);

  for (let t = 0; t < teams.length; t++) {
    ctx.fillStyle = teams[t].shot;
    for (const p of particles) {
      if (p.team === t) ctx.fillRect(x + p.x * cell - s / 2, y + p.y * cell - s / 2, s, s);
    }
  }
}

function drawTowers() {
  const { x, y, cell } = layout.board;

  for (const t of towers) {
    if (!t.alive) continue; // torre destruída some do mapa
    const px = x + t.x * cell;
    const py = y + t.y * cell;
    const r = TOWER_R * cell;
    const col = teams[t.team].color;

    ctx.save();

    ctx.beginPath();
    ctx.fillStyle = col + "aa";
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    ctx.lineWidth = Math.max(1.5, cell * 1.2);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = Math.max(2, cell * 2.2);
    ctx.lineCap = "round";
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(t.angle) * r * 0.55, py + Math.sin(t.angle) * r * 0.55);
    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = "#0d1a26";
    ctx.arc(px, py, r * 0.22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1a1a1a";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${Math.max(8, r * 0.28)}px system-ui, sans-serif`;
    ctx.fillText(formatShield(t.shield), px, py - r * 0.5);
    ctx.font = `${Math.max(7, r * 0.24)}px system-ui, sans-serif`;
    ctx.fillText(t.ammo.toLocaleString("pt-BR"), px, py + r * 0.5);
    ctx.restore();
  }
}

function drawLights() {
  const { x, y, cell } = layout.board;
  const pulse = 0.75 + 0.25 * Math.sin(performance.now() / 220);

  for (const l of lights) {
    const px = x + l.x * cell;
    const py = y + l.y * cell;
    const r = LIGHT_RADIUS * cell * 0.6;

    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.shadowColor = teams[l.team].color;
    ctx.shadowBlur = r * 2;
    ctx.beginPath();
    ctx.fillStyle = teams[l.team].glow;
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.strokeStyle = teams[l.team].color;
    ctx.lineWidth = Math.max(2, cell);
    ctx.arc(px, py, r * 1.45, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

/* ===================== ARENA: TINTA ===================== */
function emitPaint(x, y, team, count, angle, cone, speed, energy) {
  for (let i = 0; i < count && particles.length < MAX_PARTICLES; i++) {
    const a = angle + (Math.random() - 0.5) * cone;
    const s = speed * (0.55 + Math.random() * 0.6);
    particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      team,
      energy: energy * (0.6 + Math.random() * 0.8)
    });
  }
}

function fire(tower, kind = "normal") {
  if (!tower.alive) return false;

  const mx = tower.x + Math.cos(tower.angle) * TOWER_R * 0.5;
  const my = tower.y + Math.sin(tower.angle) * TOWER_R * 0.5;

  if (kind === "giant") {
    emitPaint(mx, my, tower.team, PAINT_PER_SHOT * 6, tower.angle, PAINT_CONE * 2.5, PAINT_SPEED * 1.1, PAINT_ENERGY * 4);
  } else {
    emitPaint(mx, my, tower.team, PAINT_PER_SHOT, tower.angle, PAINT_CONE, PAINT_SPEED, PAINT_ENERGY);
  }
  return true;
}

function splat(x, y, team) {
  for (let k = 0; k < 4; k++) {
    const sx = Math.floor(x + (Math.random() - 0.5) * 4);
    const sy = Math.floor(y + (Math.random() - 0.5) * 4);
    if (sx >= 0 && sy >= 0 && sx < COLS && sy < ROWS) capturePixel(sy * COLS + sx, team);
  }
}

function updateParticles(dt) {
  const drag = Math.exp(-PAINT_DRAG * dt);

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];

    if (!towers[p.team].alive) {
      particles[i] = particles[particles.length - 1];
      particles.pop();
      continue;
    }

    // Turbulência leve para bordas orgânicas
    p.vx = p.vx * drag + (Math.random() - 0.5) * 60 * dt;
    p.vy = p.vy * drag + (Math.random() - 0.5) * 60 * dt;

    const speed = Math.hypot(p.vx, p.vy);
    const steps = Math.max(1, Math.ceil(speed * dt));
    let dead = false;

    for (let s = 0; s < steps && !dead; s++) {
      p.x += (p.vx * dt) / steps;
      p.y += (p.vy * dt) / steps;

      // Bordas: reflete posição e velocidade, como uma bola na parede
      if (p.x < 0)          { p.x = -p.x;                  p.vx =  Math.abs(p.vx) * WALL_BOUNCE; }
      else if (p.x >= COLS) { p.x = 2 * COLS - p.x - 0.01; p.vx = -Math.abs(p.vx) * WALL_BOUNCE; }
      if (p.y < 0)          { p.y = -p.y;                  p.vy =  Math.abs(p.vy) * WALL_BOUNCE; }
      else if (p.y >= ROWS) { p.y = 2 * ROWS - p.y - 0.01; p.vy = -Math.abs(p.vy) * WALL_BOUNCE; }
      p.x = clamp(p.x, 0, COLS - 0.01);
      p.y = clamp(p.y, 0, ROWS - 0.01);

      if (hitTower(p) || hitLight(p) || hitCircle(p)) { dead = true; break; }

      const idx = Math.floor(p.y) * COLS + Math.floor(p.x);
      const owner = owners[idx];
      if (owner === p.team) continue;               // passa livre no próprio território

      capturePixel(idx, p.team);
      p.energy -= owner === EMPTY ? 0.35 : 1;      // inimigo custa mais
      if (p.energy <= 0) dead = true;
    }

    if (!dead && speed < 18) {
      splat(p.x, p.y, p.team);                      // respingo final
      dead = true;
    }

    if (dead) {
      particles[i] = particles[particles.length - 1];
      particles.pop();
    }
  }
}

function hitTower(p) {
  for (const t of towers) {
    if (!t.alive || t.team === p.team) continue;
    if (Math.hypot(p.x - t.x, p.y - t.y) <= TOWER_R * 0.9) {
      t.shield = Math.max(0, t.shield - SHIELD_DAMAGE_PER_HIT);
      if (t.shield === 0) destroyTower(t, p.team);
      return true;
    }
  }
  return false;
}

/* ===================== LIBERAR: CÍRCULO ===================== */
// Partícula inimiga atinge a bola: arranca pixels (encolhe) e desvia a trajetória
function hitCircle(p) {
  for (const c of circles) {
    if (c.team === p.team || c.r < CIRCLE_MIN_R) continue;
    const dx = p.x - c.x, dy = p.y - c.y;
    if (dx * dx + dy * dy > c.r * c.r) continue;

    const area = Math.max(0, Math.PI * c.r * c.r - CIRCLE_HIT_AREA);
    c.r = Math.sqrt(area / Math.PI);

    c.vx += p.vx * CIRCLE_PUSH;
    c.vy += p.vy * CIRCLE_PUSH;
    const sp = Math.hypot(c.vx, c.vy) || 1;
    c.vx = (c.vx / sp) * CIRCLE_SPEED;
    c.vy = (c.vy / sp) * CIRCLE_SPEED;
    return true;
  }
  return false;
}

function launchCircle(t, r, released) {
  const c = Math.cos(t.angle), s = Math.sin(t.angle);
  circles.push({
    team: t.team, r,
    x: clamp(t.x + c * (TOWER_R + r), r, COLS - r),
    y: clamp(t.y + s * (TOWER_R + r), r, ROWS - r),
    vx: c * CIRCLE_SPEED, vy: s * CIRCLE_SPEED,
    energy: released * PAINT_PER_SHOT * PAINT_ENERGY * 0.5,
    life: CIRCLE_LIFE
  });
}

function paintCircle(c) {
  let cost = 0;
  const r2 = c.r * c.r;
  for (let y = Math.floor(c.y - c.r); y <= c.y + c.r; y++) {
    for (let x = Math.floor(c.x - c.r); x <= c.x + c.r; x++) {
      if (x < 0 || y < 0 || x >= COLS || y >= ROWS) continue;
      if ((x - c.x) ** 2 + (y - c.y) ** 2 > r2) continue;
      const i = y * COLS + x;
      const owner = owners[i];
      if (owner === c.team) continue;
      capturePixel(i, c.team);
      cost += owner === EMPTY ? 0.35 : 1;
    }
  }
  return cost;
}

function updateCircles(dt) {
  for (const c of circles) {
    c.life -= dt;
    const steps = Math.max(1, Math.ceil(Math.hypot(c.vx, c.vy) * dt));
    for (let s = 0; s < steps && c.energy > 0; s++) {
      c.x += (c.vx * dt) / steps;
      c.y += (c.vy * dt) / steps;
      if (c.x < c.r) { c.x = c.r; c.vx = Math.abs(c.vx); }
      else if (c.x > COLS - c.r) { c.x = COLS - c.r; c.vx = -Math.abs(c.vx); }
      if (c.y < c.r) { c.y = c.r; c.vy = Math.abs(c.vy); }
      else if (c.y > ROWS - c.r) { c.y = ROWS - c.r; c.vy = -Math.abs(c.vy); }

      for (const t of towers) {
        if (!t.alive || t.team === c.team) continue;
        const dx = c.x - t.x, dy = c.y - t.y;
        const d = Math.hypot(dx, dy);
        const reach = c.r + TOWER_R * 0.9;
        if (d <= reach) {
          // Dano = pixels do círculo que colidiram com o escudo
          const hit = Math.min(c.energy, Math.max(1, Math.round(Math.PI * c.r * c.r)));
          t.shield = Math.max(0, t.shield - hit);
          c.energy -= hit;
          if (t.shield === 0) destroyTower(t, c.team);
          // Ricocheteia no escudo
          const nx = d ? dx / d : 1, ny = d ? dy / d : 0;
          c.x = t.x + nx * (reach + 0.5);
          c.y = t.y + ny * (reach + 0.5);
          const vn = c.vx * nx + c.vy * ny;
          if (vn < 0) { c.vx -= 2 * vn * nx; c.vy -= 2 * vn * ny; }
        }
      }
      if (c.energy > 0) c.energy -= paintCircle(c);
    }
  }
  circles = circles.filter(c => c.energy > 0 && c.life > 0 && c.r >= CIRCLE_MIN_R && towers[c.team].alive);
}

function drawCircles() {
  const { x, y, cell } = layout.board;
  for (const c of circles) {
    ctx.beginPath();
    ctx.fillStyle = teams[c.team].shot;
    ctx.strokeStyle = teams[c.team].glow;
    ctx.lineWidth = Math.max(1.5, cell * 1.5);
    ctx.arc(x + c.x * cell, y + c.y * cell, c.r * cell, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

// Torre destruída: some do mapa e o atacante conquista todo o território dela
function destroyTower(t, attacker) {
  if (!t.alive) return;
  t.alive = false;
  t.shield = 0;
  t.burstQueue = t.prepaidBurstQueue = t.giantQueue = 0;
  for (let i = 0; i < owners.length; i++) {
    if (owners[i] === t.team) capturePixel(i, attacker);
  }
  marbles = marbles.filter(mb => mb.team !== t.team);
  emitPaint(t.x, t.y, attacker, 300, 0, Math.PI * 2, PAINT_SPEED * 0.8, PAINT_ENERGY * 2);
}

function applyTerritoryBonus(team) {
  const t = towers[team];
  if (!t || !t.alive) return;
  while (counts[team] >= t.territoryMark + TERRITORY_BONUS_STEP) {
    t.territoryMark += TERRITORY_BONUS_STEP;
    addAmmo(t, Math.max(1, Math.round(t.ammo * TERRITORY_BONUS_PERCENT)));
  }
}

/* ===================== LUZES ===================== */
function spawnLight() {
  for (let a = 0; a < 30; a++) {
    const x = 20 + Math.random() * (COLS - 40);
    const y = 20 + Math.random() * (ROWS - 40);
    if (towers.some(t => Math.hypot(t.x - x, t.y - y) < TOWER_R * 2)) continue;

    lights.push({ x, y, team: Math.floor(Math.random() * teams.length), dead: false });
    if (lights.length > MAX_LIGHTS) lights.shift();
    return;
  }
}

function updateLights(dt) {
  lightTimer += dt;
  while (lightTimer >= LIGHT_INTERVAL) {
    lightTimer -= LIGHT_INTERVAL;
    spawnLight();
  }
  lights = lights.filter(l => !l.dead);
}

// Mesma cor: explode em tinta para todos os lados | Outra cor: absorve a partícula
function hitLight(p) {
  for (const l of lights) {
    if (l.dead || Math.hypot(p.x - l.x, p.y - l.y) > LIGHT_RADIUS) continue;
    if (l.team === p.team) {
      l.dead = true;
      emitPaint(l.x, l.y, p.team, 260, 0, Math.PI * 2, PAINT_SPEED * 0.8, PAINT_ENERGY * 2);
    }
    return true;
  }
  return false;
}

/* ===================== BOTS ===================== */
function angleDiff(a, b) { return Math.atan2(Math.sin(b - a), Math.cos(b - a)); }
function turnToward(a, b, max) { return a + clamp(angleDiff(a, b), -max, max); }

// Bola LIBERAR inimiga mais próxima dentro do raio de defesa
function findThreat(t) {
  let best = null, bestD = Infinity;
  for (const c of circles) {
    if (c.team === t.team) continue;
    const d = Math.hypot(c.x - t.x, c.y - t.y) - c.r;
    if (d <= DEFENSE_RANGE && d < bestD) { bestD = d; best = c; }
  }
  return best;
}

// Foca na bola e atira até ela sumir ou ser desviada
function defend(t, c, dt) {
  const lead = Math.hypot(c.x - t.x, c.y - t.y) / PAINT_SPEED; // antecipa o movimento
  const aim = Math.atan2(c.y + c.vy * lead - t.y, c.x + c.vx * lead - t.x);
  t.angle = turnToward(t.angle, aim, DEFENSE_TURN_SPEED * dt);
  t.defenseCooldown -= dt;
  if (t.defenseCooldown <= 0 && Math.abs(angleDiff(t.angle, aim)) < 0.25) {
    if (t.ammo > 0) t.ammo--;          // usa munição se tiver; senão, tiro de emergência
    fire(t);
    t.defenseCooldown = DEFENSE_FIRE_INTERVAL;
  }
}

// Analisa a linha para onde o cano aponta agora
function scanAim(t) {
  const c = Math.cos(t.angle), s = Math.sin(t.angle);
  const v = { enemy: 0, empty: 0, tower: -1, light: false };
  for (let d = TOWER_R; d < SCAN_RANGE; d += 6) {
    const x = t.x + c * d, y = t.y + s * d;
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) break;
    const o = owners[Math.floor(y) * COLS + Math.floor(x)];
    if (o === EMPTY) v.empty++;
    else if (o !== t.team) v.enemy++;
    if (lights.some(l => l.team === t.team && Math.hypot(l.x - x, l.y - y) <= LIGHT_RADIUS)) v.light = true;
    const hit = towers.find(o2 => o2.alive && o2.team !== t.team && Math.hypot(o2.x - x, o2.y - y) <= TOWER_R * 0.9);
    if (hit) { v.tower = hit.team; break; }
  }
  return v;
}

function burst(t, n) { t.burstQueue += n; t.prepaidBurstQueue += n; }

// Soma munição e registra no total ganho (usado pelas recompensas)
function addAmmo(t, n) {
  t.ammo += n;
  t.earned += n;
}

// Concede os marcos pelo total de munição ganha (gastar não reduz o progresso)
function checkRewards(t) {
  while (t.rewardsGot < REWARDS.length && t.earned >= REWARDS[t.rewardsGot].at) {
    const r = REWARDS[t.rewardsGot++];
    r.apply(t);
    popups.push({ x: 0.5, y: 0.06 + t.team * 0.05, text: `${teams[t.team].name}: ${r.text}`, team: t.team, life: 1 });
  }
}

// Gira e atira normalmente; usa especiais quando a oportunidade aparece na mira
function botThink(t) {
  const sp = t.specials;
  if (sp.p70 > 0 && t.ammo < 60) { sp.p70--; addAmmo(t, 300); }
  if (t.burstQueue > 0 || t.giantQueue > 0) return;

  const v = scanAim(t);

  if (v.tower >= 0) {                                   // torre inimiga na linha
    if (sp.mega > 0) { sp.mega--; t.giantQueue++; }
    else if (sp.b25 > 0) { sp.b25--; burst(t, 25); }
    else if (sp.b15 > 0) { sp.b15--; burst(t, 150); }
    else if (sp.lib > 0 && t.ammo >= RELEASE_MIN_AMMO && useRelease(t)) sp.lib--;
  } else if (v.light && sp.b15 > 0) {                   // explode luz da própria cor
    sp.b15--; burst(t, 150);
  } else if (v.enemy > 45 && sp.b25 > 1) {              // muito território inimigo
    sp.b25--; burst(t, 25);
  } else if (v.enemy + v.empty > 55 && sp.b15 > 2) {    // expansão
    sp.b15--; burst(t, 150);
  } else if (v.enemy > 65 && sp.mega > 1) {             // área inimiga densa
    sp.mega--; t.giantQueue++;
  }
}

/* ===================== TORRES ===================== */
function updateTowers(dt) {
  for (const t of towers) {
    if (!t.alive) continue;

    checkRewards(t);

    // Defesa prioritária: bola LIBERAR inimiga se aproximando
    const threat = findThreat(t);
    if (threat) { defend(t, threat, dt); continue; }

    // Mira travada no centro até acabar a rajada inicial; depois giro 360° + análise do bot
    if (t.holdAim && t.burstQueue === 0) t.holdAim = false;
    if (!t.holdAim) {
      t.angle = (t.angle + t.rotationSpeed * dt) % (Math.PI * 2);
      t.think -= dt;
      if (t.think <= 0) { t.think = AI_THINK; botThink(t); }
    }

    t.cooldown -= dt;
    t.burstCooldown -= dt;

    if (t.burstQueue > 0 && t.burstCooldown <= 0) {
      const pre = t.prepaidBurstQueue > 0;
      if (pre || t.ammo > 0) {
        if (pre) t.prepaidBurstQueue--;
        else t.ammo--;
        t.burstQueue--;
        fire(t);
        t.burstCooldown = BURST_INTERVAL;
      }
    } else if (t.giantQueue > 0 && t.cooldown <= 0 && t.ammo > 0) {
      t.giantQueue--;
      t.ammo--;
      fire(t, "giant");
      t.cooldown = BULLET_INTERVAL;
    } else if (t.cooldown <= 0 && t.ammo > 0) {
      t.ammo--;
      fire(t);
      t.cooldown = BULLET_INTERVAL;
    } else if (t.cooldown <= 0) {
      t.cooldown = 0.1;
    }
  }
}

/* ===================== FIM DE JOGO ===================== */
// Vence quem conquistar 100% do mapa
function checkWinner() {
  if (!towers.some(t => t.alive)) return finishGame(-1);
  const full = counts.findIndex(c => c === COLS * ROWS);
  if (full >= 0) finishGame(full);
}

function finishGame(w) {
  running = false;
  gameOver = true;
  statusLabel.textContent = "Partida encerrada";

  if (w >= 0) {
    resultTitle.textContent = `${teams[w].name} venceu!`;
    resultTitle.style.color = teams[w].color;
    resultText.textContent = "Conquistou todo o mapa!";
  } else {
    resultTitle.textContent = "Empate";
    resultTitle.style.color = "#fff";
    resultText.textContent = "Nenhuma torre sobreviveu.";
  }

  resultDialog.style.display = "block";
  renderScores();
}

/* ===================== LOOP ===================== */
function update(dt) {
  if (!running || gameOver) return;
  const sdt = dt * speedMultiplier;

  const ms = Math.max(1, Math.ceil(sdt / 0.008));
  for (let i = 0; i < ms; i++) updateMarbles(sdt / ms);

  updateTowers(sdt);
  updateLights(sdt);
  updateParticles(sdt);
  updateCircles(sdt);
  checkWinner();

  scoreTimer += sdt;
  if (scoreTimer >= 0.25) {
    scoreTimer = 0;
    renderScores();
  }
}

function frame(ts) {
  const dt = Math.min((ts - lastFrame) / 1000 || 0, 0.04);
  lastFrame = ts;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

startButton.addEventListener("click", () => {
  playMusic();
  if (gameOver) return resetGame(true);
  if (!running) {
    running = true;
    statusLabel.textContent = "Partida em andamento";
    startButton.textContent = "Em andamento";
    lastFrame = performance.now();
  }
});

pauseButton.addEventListener("click", () => {
  if (gameOver) return;
  running = !running;
  pauseButton.textContent = running ? "Pausar" : "Continuar";
  statusLabel.textContent = running ? "Partida em andamento" : "Partida pausada";
  if (running) { lastFrame = performance.now(); playMusic(); }
  else music.pause();
});

resetButton.addEventListener("click", () => { playMusic(); resetGame(true); });
playAgainButton.addEventListener("click", () => { playMusic(); resetGame(true); });
speedSelect.addEventListener("change", () => {
  speedMultiplier = Number(speedSelect.value) || 1;
});
window.addEventListener("resize", resizeCanvas);

resetGame(false);
resizeCanvas();
requestAnimationFrame(frame);
