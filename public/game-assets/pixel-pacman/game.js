const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreText = document.getElementById("scoreText");
const bestText = document.getElementById("bestText");
const lifeText = document.getElementById("lifeText");
const dotText = document.getElementById("dotText");
const levelText = document.getElementById("levelText");
const startOverlay = document.getElementById("startOverlay");
const tutorialOverlay = document.getElementById("tutorialOverlay");
const endOverlay = document.getElementById("endOverlay");
const endKicker = document.getElementById("endKicker");
const endScore = document.getElementById("endScore");
const storyButton = document.getElementById("storyButton");
const endlessButton = document.getElementById("endlessButton");
const tutorialButton = document.getElementById("tutorialButton");
const skipTutorialButton = document.getElementById("skipTutorialButton");
const tutorialStoryButton = document.getElementById("tutorialStoryButton");
const tutorialEndlessButton = document.getElementById("tutorialEndlessButton");
const tutorialBackButton = document.getElementById("tutorialBackButton");
const restartButton = document.getElementById("restartButton");

const tile = 24;
const bestKey = "pixel_pacman_best_v2";
const keyToDir = {
  KeyW: "up",
  KeyA: "left",
  KeyS: "down",
  KeyD: "right",
  ArrowUp: "up",
  ArrowLeft: "left",
  ArrowDown: "down",
  ArrowRight: "right",
};
const pressedCodes = new Set();
let desiredDir = "right";
const startTile = { x: 1, y: 21 };
const exitTile = { x: 26, y: 1 };
const gateTiles = [
  { x: 13, y: 10 },
  { x: 14, y: 10 },
];

const rawMap = [
  "############################",
  "#............##............#",
  "#.####.#####.##.#####.####.#",
  "#o####.#####.##.#####.####o#",
  "#.####.#####.##.#####.####.#",
  "#..........................#",
  "#.####.##.########.##.####.#",
  "#......##....##....##......#",
  "######.##### ## #####.######",
  "     #.##          ##.#     ",
  "######.## ###--### ##.######",
  "      .   #      #   .      ",
  "######.## ######## ##.######",
  "     #.##          ##.#     ",
  "######.## ######## ##.######",
  "#............##............#",
  "#.####.#####.##.#####.####.#",
  "#o..##................##..o#",
  "###.##.##.########.##.##.###",
  "#......##....##....##......#",
  "#.##########.##.##########.#",
  "#..........................#",
  "############################",
];

const dirs = {
  left: { x: -1, y: 0, angle: Math.PI },
  right: { x: 1, y: 0, angle: 0 },
  up: { x: 0, y: -1, angle: -Math.PI / 2 },
  down: { x: 0, y: 1, angle: Math.PI / 2 },
};

const ghostSeed = [
  { x: 13, y: 11, color: "#ff4b70", scatter: { x: 1, y: 1 } },
  { x: 14, y: 11, color: "#5df5ff", scatter: { x: 26, y: 1 } },
  { x: 12, y: 11, color: "#ff9dde", scatter: { x: 1, y: 21 } },
  { x: 15, y: 11, color: "#ffb24b", scatter: { x: 26, y: 21 } },
  { x: 13, y: 12, color: "#9dff57", scatter: { x: 3, y: 12 } },
  { x: 14, y: 12, color: "#ffffff", scatter: { x: 24, y: 12 } },
];

const state = {
  running: false,
  ended: false,
  score: 0,
  best: Number(localStorage.getItem(bestKey) || 0),
  lives: 3,
  level: 1,
  mode: "story",
  nextEndlessGhostScore: 1000,
  fright: 0,
  gateOpen: false,
  dotsLeft: 0,
  map: [],
  pac: null,
  ghosts: [],
};

const audio = {
  ctx: null,
  enabled: false,
};

function ensureAudio() {
  if (!audio.ctx) {
    audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audio.ctx.state === "suspended") {
    audio.ctx.resume();
  }
  audio.enabled = true;
}

function playTone(freq, duration = 0.08, type = "square", gainValue = 0.1) {
  if (!audio.enabled || !audio.ctx) return;
  const now = audio.ctx.currentTime;
  const osc = audio.ctx.createOscillator();
  const gain = audio.ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(gainValue, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain);
  gain.connect(audio.ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

function playSound(name) {
  if (name === "dot") playTone(520, 0.045, "square", 0.075);
  if (name === "power") {
    playTone(420, 0.1, "sawtooth", 0.11);
    setTimeout(() => playTone(760, 0.12, "sawtooth", 0.11), 70);
  }
  if (name === "eatGhost") {
    playTone(920, 0.08, "square", 0.12);
    setTimeout(() => playTone(1180, 0.12, "square", 0.12), 70);
  }
  if (name === "hit") {
    playTone(170, 0.16, "sawtooth", 0.14);
    setTimeout(() => playTone(110, 0.2, "sawtooth", 0.12), 90);
  }
  if (name === "door") {
    playTone(620, 0.08, "triangle", 0.12);
    setTimeout(() => playTone(860, 0.12, "triangle", 0.12), 90);
  }
  if (name === "level") {
    [520, 660, 820, 1040].forEach((freq, index) => {
      setTimeout(() => playTone(freq, 0.08, "square", 0.11), index * 80);
    });
  }
}

function pixel(tilePos) {
  return tilePos * tile + tile / 2;
}

function resetLevel(keepProgress = true) {
  state.map = rawMap.map((row) => row.split(""));
  state.map[startTile.y][startTile.x] = " ";
  state.map[exitTile.y][exitTile.x] = " ";
  state.dotsLeft = 0;
  for (const row of state.map) {
    for (const cell of row) {
      if (cell === "." || cell === "o") state.dotsLeft += 1;
    }
  }
  state.fright = 0;
  state.gateOpen = true;
  state.pac = createMover(startTile.x, startTile.y, "right", playerSpeed());
  state.pac.mouth = 0;
  const activeGhosts =
    state.mode === "endless"
      ? Math.min(1 + Math.floor(state.score / 1000), ghostSeed.length)
      : Math.min(state.level, ghostSeed.length);
  state.ghosts = ghostSeed.slice(0, activeGhosts).map((seed, index) => ({
    ...createMover(seed.x, seed.y, index % 2 ? "right" : "left", ghostSpeed()),
    color: seed.color,
    scatter: seed.scatter,
    eaten: false,
    release: 0.35 + index * 1.2,
    kind: "ghost",
  }));
  if (!keepProgress) {
    state.score = 0;
    state.level = 1;
    state.lives = 3;
  }
}

function createMover(x, y, dir, speed) {
  return {
    tileX: x,
    tileY: y,
    x: pixel(x),
    y: pixel(y),
    targetX: pixel(x),
    targetY: pixel(y),
    dir,
    moving: false,
    speed,
  };
}

function playerSpeed() {
  return 150 + (state.level - 1) * 8;
}

function ghostSpeed() {
  return playerSpeed() * 0.8;
}

function startGame(mode = "story") {
  ensureAudio();
  pressedCodes.clear();
  desiredDir = "right";
  state.running = true;
  state.ended = false;
  state.mode = mode;
  state.score = 0;
  state.level = 1;
  state.lives = 3;
  state.nextEndlessGhostScore = 1000;
  resetLevel(true);
  startOverlay.classList.remove("is-active");
  tutorialOverlay.classList.remove("is-active");
  endOverlay.classList.remove("is-active");
  updateHud();
}

function isGate(tx, ty) {
  return gateTiles.some((gate) => gate.x === tx && gate.y === ty);
}

function isBlocked(tx, ty, mover) {
  if (ty < 0 || ty >= state.map.length || tx < 0 || tx >= state.map[0].length) return true;
  const cell = state.map[ty][tx];
  if (cell === "#") return true;
  if (cell === "-") return mover?.kind !== "ghost" || !state.gateOpen;
  if (tx === exitTile.x && ty === exitTile.y && state.dotsLeft > 0) return true;
  return false;
}

function tryStep(mover, dirName) {
  if (!mover || mover.moving) return false;
  const dir = dirs[dirName];
  if (!dir) return false;
  const nextX = mover.tileX + dir.x;
  const nextY = mover.tileY + dir.y;
  if (isBlocked(nextX, nextY, mover)) return false;
  mover.dir = dirName;
  mover.tileX = nextX;
  mover.tileY = nextY;
  mover.targetX = pixel(nextX);
  mover.targetY = pixel(nextY);
  mover.moving = true;
  return true;
}

function advanceMover(mover, dt) {
  if (!mover.moving) return false;
  const dx = mover.targetX - mover.x;
  const dy = mover.targetY - mover.y;
  const distance = Math.hypot(dx, dy);
  const step = mover.speed * dt;
  if (distance <= step) {
    mover.x = mover.targetX;
    mover.y = mover.targetY;
    mover.moving = false;
    return true;
  }
  mover.x += (dx / distance) * step;
  mover.y += (dy / distance) * step;
  return false;
}

function updatePac(dt) {
  const arrived = advanceMover(state.pac, dt);
  state.pac.mouth += dt * 12;
  if (arrived) {
    eatDot();
    checkExitDoor();
  }
  if (!state.pac.moving) {
    continueFromHeldInput();
  }
}

function isDirHeld(dir) {
  for (const code of pressedCodes) {
    if (keyToDir[code] === dir) return true;
  }
  return false;
}

function continueFromHeldInput() {
  if (desiredDir && isDirHeld(desiredDir) && tryStep(state.pac, desiredDir)) return;
  if (state.pac.dir && isDirHeld(state.pac.dir)) {
    tryStep(state.pac, state.pac.dir);
  }
}

function handleKeyDownCode(code) {
  const dir = keyToDir[code];
  if (!dir) return false;
  if (tutorialOverlay.classList.contains("is-active") || startOverlay.classList.contains("is-active")) return true;
  if (!state.running || !state.pac) return true;
  pressedCodes.add(code);
  desiredDir = dir;
  if (!state.pac.moving) {
    continueFromHeldInput();
  }
  return true;
}

function handleKeyUpCode(code) {
  if (!keyToDir[code]) return false;
  pressedCodes.delete(code);
  return true;
}

function eatDot() {
  const cell = state.map[state.pac.tileY]?.[state.pac.tileX];
  if (cell !== "." && cell !== "o") return;
  state.map[state.pac.tileY][state.pac.tileX] = " ";
  state.dotsLeft -= 1;
  state.score += cell === "o" ? 50 : 10;
  playSound(cell === "o" ? "power" : "dot");
  if (cell === "o") {
    state.fright = 7;
    for (const ghost of state.ghosts) ghost.eaten = false;
  }
  updateEndlessGhosts();
}

function checkExitDoor() {
  if (state.mode === "endless" && state.dotsLeft <= 0) {
    resetEndlessCoins();
    return;
  }
  if (state.dotsLeft > 0) return;
  if (state.pac.tileX !== exitTile.x || state.pac.tileY !== exitTile.y) return;
  playSound("door");
  nextLevel();
}

function resetEndlessCoins() {
  const currentScore = state.score;
  const currentLives = state.lives;
  const currentGhostCount = state.ghosts.length;
  resetLevel(true);
  state.score = currentScore + 300;
  state.lives = currentLives;
  while (state.ghosts.length < currentGhostCount) {
    addEndlessGhost();
  }
  updateEndlessGhosts();
  playSound("level");
}

function updateEndlessGhosts() {
  if (state.mode !== "endless") return;
  while (state.score >= state.nextEndlessGhostScore && state.ghosts.length < ghostSeed.length) {
    addEndlessGhost();
    state.nextEndlessGhostScore += 1000;
  }
}

function addEndlessGhost() {
  const seed = ghostSeed[state.ghosts.length % ghostSeed.length];
  const ghost = {
    ...createMover(seed.x, seed.y, state.ghosts.length % 2 ? "right" : "left", ghostSpeed()),
    color: seed.color,
    scatter: seed.scatter,
    eaten: false,
    release: 1.2,
    kind: "ghost",
  };
  state.ghosts.push(ghost);
}

function nextLevel() {
  playSound("level");
  state.level += 1;
  state.score += 500;
  resetLevel(true);
}

function updateGhosts(dt) {
  state.fright = Math.max(0, state.fright - dt);
  state.ghosts.forEach((ghost, index) => {
    ghost.release = Math.max(0, ghost.release - dt);
    if (ghost.release > 0) return;
    const arrived = advanceMover(ghost, dt);
    if (!ghost.moving && arrived !== false) {
      tryStep(ghost, chooseGhostDir(ghost, index));
    } else if (!ghost.moving) {
      tryStep(ghost, chooseGhostDir(ghost, index));
    }
    if (ghost.eaten && ghost.tileX === 13 && ghost.tileY === 11) {
      ghost.eaten = false;
      ghost.release = 0.8;
    }
  });
}

function ghostTarget(ghost, index) {
  if (ghost.eaten) return { x: 13, y: 11 };
  if (state.fright > 0) return ghost.scatter;
  if ((Math.floor(performance.now() / 4300) + index) % 5 === 0) return ghost.scatter;
  return { x: state.pac.tileX, y: state.pac.tileY };
}

function chooseGhostDir(ghost, index) {
  if (!ghost.eaten && ghost.tileY >= 11 && ghost.tileY <= 12 && ghost.tileX >= 11 && ghost.tileX <= 16) {
    if (!isBlocked(ghost.tileX, ghost.tileY - 1, ghost)) return "up";
  }
  const target = ghostTarget(ghost, index);
  const pathDir = findPathDirection(ghost, target, ghost.eaten);
  if (pathDir) return pathDir;
  return chooseFallbackGhostDir(ghost);
}

function chooseFallbackGhostDir(ghost) {
  const opposite = { left: "right", right: "left", up: "down", down: "up" }[ghost.dir];
  const options = Object.keys(dirs).filter((dirName) => {
    if (dirName === opposite && !ghost.eaten) return false;
    const dir = dirs[dirName];
    return !isBlocked(ghost.tileX + dir.x, ghost.tileY + dir.y, ghost);
  });
  if (options.length === 0) return opposite || "left";
  return options[Math.floor(Math.random() * options.length)];
}

function findPathDirection(ghost, target, allowReverse) {
  const startKey = `${ghost.tileX},${ghost.tileY}`;
  const targetX = Math.round(target.x);
  const targetY = Math.round(target.y);
  const targetKey = `${targetX},${targetY}`;
  const opposite = { left: "right", right: "left", up: "down", down: "up" }[ghost.dir];
  const open = [{ x: ghost.tileX, y: ghost.tileY, first: null, g: 0, f: 0 }];
  const visited = new Set([startKey]);
  while (open.length > 0) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift();
    if (`${current.x},${current.y}` === targetKey) {
      return current.first;
    }
    for (const dirName of Object.keys(dirs)) {
      if (!allowReverse && current.g === 0 && dirName === opposite) continue;
      const dir = dirs[dirName];
      const x = current.x + dir.x;
      const y = current.y + dir.y;
      const key = `${x},${y}`;
      if (visited.has(key) || isBlocked(x, y, ghost)) continue;
      visited.add(key);
      const g = current.g + 1;
      const h = Math.abs(x - targetX) + Math.abs(y - targetY);
      open.push({ x, y, first: current.first || dirName, g, f: g + h });
    }
  }
  return null;
}

function handleCollisions() {
  for (const ghost of state.ghosts) {
    if (ghost.release > 0) continue;
    const dist = Math.hypot(state.pac.x - ghost.x, state.pac.y - ghost.y);
    if (dist > tile * 0.55) continue;
    if (state.fright > 0 && !ghost.eaten) {
      banishGhost(ghost, 2.2);
      state.score += 200;
      updateEndlessGhosts();
      playSound("eatGhost");
      continue;
    }
    if (!ghost.eaten) {
      state.lives -= 1;
      playSound("hit");
      if (state.lives <= 0) {
        endGame(false);
        return;
      }
      resetPositionsAfterHit();
      return;
    }
  }
}

function banishGhost(ghost, release = 2) {
  const seed = ghostSeed[state.ghosts.indexOf(ghost) % ghostSeed.length] || ghostSeed[0];
  Object.assign(ghost, createMover(seed.x, seed.y, "up", ghostSpeed()));
  ghost.color = seed.color;
  ghost.scatter = seed.scatter;
  ghost.eaten = false;
  ghost.release = release;
  ghost.kind = "ghost";
}

function resetPositionsAfterHit() {
  const score = state.score;
  const level = state.level;
  const lives = state.lives;
  const currentMap = state.map.map((row) => [...row]);
  const dotsLeft = state.dotsLeft;
  resetLevel(true);
  state.map = currentMap;
  state.dotsLeft = dotsLeft;
  state.score = score;
  state.level = level;
  state.lives = lives;
}

function endGame(won) {
  state.running = false;
  state.ended = true;
  state.best = Math.max(state.best, state.score);
  localStorage.setItem(bestKey, String(state.best));
  endKicker.textContent = won ? "You Win" : "Game Over";
  endScore.textContent = `${state.score} 分`;
  endOverlay.classList.add("is-active");
  updateHud();
}

function updateHud() {
  state.best = Math.max(state.best, state.score);
  scoreText.textContent = String(state.score);
  bestText.textContent = String(state.best);
  lifeText.textContent = String(state.lives);
  dotText.textContent = state.dotsLeft > 0 ? String(state.dotsLeft) : state.mode === "endless" ? "刷新" : "门开";
  levelText.textContent =
    state.mode === "endless"
      ? `ENDLESS / ${state.ghosts.length} GHOST`
      : `LEVEL ${state.level} / ${state.ghosts.length} GHOST`;
}

function drawMap() {
  ctx.fillStyle = "#040511";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < state.map.length; y += 1) {
    for (let x = 0; x < state.map[y].length; x += 1) {
      const cell = state.map[y][x];
      const px = x * tile;
      const py = y * tile;
      if (cell === "#") {
        ctx.fillStyle = "#1f2ef2";
        ctx.fillRect(px + 2, py + 2, tile - 4, tile - 4);
        ctx.fillStyle = "#1bd7ff";
        ctx.fillRect(px + 5, py + 5, tile - 10, 3);
      } else if (cell === "-") {
        ctx.fillStyle = state.gateOpen ? "#39ffb6" : "#ff87d7";
        ctx.fillRect(px + 2, py + tile / 2 - 2, tile - 4, 4);
      } else if (cell === ".") {
        drawCoin(px + tile / 2, py + tile / 2, 4);
      } else if (cell === "o") {
        const blink = Math.floor(performance.now() / 180) % 2 === 0;
        drawCoin(px + tile / 2, py + tile / 2, blink ? 8 : 7);
      }
    }
  }
  drawStartAndExit();
}

function drawCoin(x, y, radius) {
  ctx.fillStyle = "#f7c948";
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  ctx.fillStyle = "#fff19b";
  ctx.fillRect(x - radius + 2, y - radius + 2, Math.max(2, radius - 1), 2);
  ctx.fillStyle = "#b87514";
  ctx.fillRect(x - 1, y - radius + 2, 2, radius * 2 - 4);
}

function drawStartAndExit() {
  drawTileLabel(startTile.x, startTile.y, "#7dfdff", "S");
  const open = state.dotsLeft <= 0;
  drawTileLabel(exitTile.x, exitTile.y, open ? "#39ff74" : "#ff4b70", open ? "门" : "锁");
}

function drawTileLabel(x, y, color, text) {
  const px = x * tile;
  const py = y * tile;
  ctx.fillStyle = color;
  ctx.fillRect(px + 3, py + 3, tile - 6, tile - 6);
  ctx.fillStyle = "#040511";
  ctx.font = "700 12px Courier New, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, px + tile / 2, py + tile / 2 + 1);
}

function drawPac() {
  const pac = state.pac;
  const dir = dirs[pac.dir];
  const angle = dir.angle;
  const open = 0.16 + Math.abs(Math.sin(pac.mouth)) * 0.18;
  ctx.fillStyle = "#ffe95b";
  ctx.beginPath();
  ctx.moveTo(pac.x, pac.y);
  ctx.arc(pac.x, pac.y, tile * 0.44, angle + open, angle + Math.PI * 2 - open);
  ctx.closePath();
  ctx.fill();

  const eyeOffsets = {
    right: { x: 4, y: -5 },
    left: { x: -4, y: 5 },
    up: { x: 5, y: -4 },
    down: { x: -5, y: 4 },
  };
  const eye = eyeOffsets[pac.dir] || eyeOffsets.right;
  ctx.fillStyle = "#10101f";
  ctx.beginPath();
  ctx.arc(pac.x + eye.x, pac.y + eye.y, 2.7, 0, Math.PI * 2);
  ctx.fill();
}

function drawGhost(ghost) {
  const frightened = state.fright > 0 && !ghost.eaten;
  ctx.fillStyle = ghost.eaten
    ? "#cfefff"
    : frightened
      ? Math.floor(performance.now() / 180) % 2
        ? "#2d5dff"
        : "#fff8d8"
      : ghost.color;
  const x = ghost.x;
  const y = ghost.y;
  const r = tile * 0.42;
  ctx.fillRect(x - r, y - r * 0.25, r * 2, r * 1.15);
  ctx.beginPath();
  ctx.arc(x, y - r * 0.25, r, Math.PI, Math.PI * 2);
  ctx.fill();
  for (let i = -1; i <= 1; i += 1) {
    ctx.fillRect(x + i * r * 0.66 - r * 0.22, y + r * 0.75, r * 0.44, r * 0.32);
  }
  ctx.fillStyle = "#fff";
  ctx.fillRect(x - r * 0.48, y - r * 0.18, 5, 6);
  ctx.fillRect(x + r * 0.18, y - r * 0.18, 5, 6);
  ctx.fillStyle = "#111";
  ctx.fillRect(x - r * 0.44, y - r * 0.15, 2, 3);
  ctx.fillRect(x + r * 0.22, y - r * 0.15, 2, 3);
}

function draw() {
  drawMap();
  for (const ghost of state.ghosts) drawGhost(ghost);
  drawPac();
}

function update(dt) {
  updatePac(dt);
  updateGhosts(dt);
  handleCollisions();
  updateHud();
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.034, (now - last) / 1000);
  last = now;
  if (state.running) update(dt);
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  if (!handleKeyDownCode(event.code)) return;
  event.preventDefault();
});

window.addEventListener("keyup", (event) => {
  if (!handleKeyUpCode(event.code)) return;
  event.preventDefault();
});

window.addEventListener("message", (event) => {
  if (event.origin !== window.location.origin) return;
  if (event.data?.type === "pixel-pacman:keydown") {
    handleKeyDownCode(event.data.code);
  }
  if (event.data?.type === "pixel-pacman:keyup") {
    handleKeyUpCode(event.data.code);
  }
});

storyButton.addEventListener("click", () => startGame("story"));
endlessButton.addEventListener("click", () => startGame("endless"));
skipTutorialButton.addEventListener("click", () => startGame("story"));
tutorialButton.addEventListener("click", () => {
  startOverlay.classList.remove("is-active");
  tutorialOverlay.classList.add("is-active");
});
tutorialStoryButton.addEventListener("click", () => startGame("story"));
tutorialEndlessButton.addEventListener("click", () => startGame("endless"));
tutorialBackButton.addEventListener("click", () => {
  tutorialOverlay.classList.remove("is-active");
  startOverlay.classList.add("is-active");
});
restartButton.addEventListener("click", () => startGame(state.mode));

resetLevel(false);
updateHud();
draw();
requestAnimationFrame(loop);
