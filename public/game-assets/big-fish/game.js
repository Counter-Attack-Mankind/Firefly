const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreText = document.getElementById("scoreText");
const bestText = document.getElementById("bestText");
const sizeText = document.getElementById("sizeText");
const lifeText = document.getElementById("lifeText");
const unlockText = document.getElementById("unlockText");
const unlockHint = document.getElementById("unlockHint");
const unlockFill = document.getElementById("unlockFill");
const fishDex = document.getElementById("fishDex");
const startOverlay = document.getElementById("startOverlay");
const gameOverOverlay = document.getElementById("gameOverOverlay");
const finalScore = document.getElementById("finalScore");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");

const bestKey = "big_fish_best_score_v1";
const keys = new Set();
const rand = (min, max) => min + Math.random() * (max - min);

const species = [
  { name: "银鳞鱼", score: 8, radius: 15, unlock: 0, color: "#b9f3ff", accent: "#6cc7d8" },
  { name: "珊瑚鱼", score: 18, radius: 21, unlock: 120, color: "#ffbd72", accent: "#ff725e" },
  { name: "蓝刺鱼", score: 38, radius: 29, unlock: 320, color: "#68a9ff", accent: "#2d68dd" },
  { name: "金枪鱼", score: 72, radius: 40, unlock: 720, color: "#f6dc69", accent: "#d89134" },
  { name: "魔鬼鱼", score: 130, radius: 54, unlock: 1300, color: "#aa8df8", accent: "#5747bf" },
  { name: "深海巨口", score: 240, radius: 70, unlock: 2300, color: "#58e0a6", accent: "#176d6f" },
];

const state = {
  running: false,
  gameOver: false,
  score: 0,
  best: Number(localStorage.getItem(bestKey) || 0),
  lives: 3,
  time: 0,
  spawnTimer: 0,
  messageTimer: 0,
  message: "",
  player: {
    x: 480,
    y: 270,
    vx: 0,
    vy: 0,
    radius: 24,
    angle: 0,
    invulnerable: 0,
  },
  fish: [],
  bubbles: [],
};

function resetGame() {
  state.running = true;
  state.gameOver = false;
  state.score = 0;
  state.lives = 3;
  state.time = 0;
  state.spawnTimer = 0;
  state.messageTimer = 0;
  state.message = "";
  state.fish = [];
  state.bubbles = [];
  state.player.x = canvas.width * 0.5;
  state.player.y = canvas.height * 0.5;
  state.player.vx = 0;
  state.player.vy = 0;
  state.player.radius = 24;
  state.player.angle = 0;
  state.player.invulnerable = 1.2;
  startOverlay.classList.remove("is-active");
  gameOverOverlay.classList.remove("is-active");
  for (let i = 0; i < 8; i += 1) {
    spawnFish(true);
  }
  updateHud();
}

function unlockedSpecies() {
  return species.filter((fish) => state.score >= fish.unlock);
}

function nextSpecies() {
  return species.find((fish) => state.score < fish.unlock);
}

function chooseSpecies() {
  const pool = unlockedSpecies();
  const roll = Math.random();
  if (roll < 0.64) return pool[Math.max(0, pool.length - 2)] || pool[0];
  if (roll < 0.9) return pool[pool.length - 1];
  return pool[Math.floor(Math.random() * pool.length)];
}

function spawnFish(initial = false) {
  const data = chooseSpecies();
  const fromLeft = Math.random() < 0.5;
  const radius = data.radius * rand(0.84, 1.22);
  const speed = rand(42, 96) * (data.radius > state.player.radius ? 0.88 : 1);
  const y = rand(radius + 24, canvas.height - radius - 24);
  state.fish.push({
    data,
    x: initial ? rand(80, canvas.width - 80) : fromLeft ? -radius - 30 : canvas.width + radius + 30,
    y,
    vx: (fromLeft ? 1 : -1) * speed,
    vy: rand(-16, 16),
    radius,
    wobble: rand(0, Math.PI * 2),
    eaten: false,
  });
}

function spawnBubble() {
  state.bubbles.push({
    x: rand(20, canvas.width - 20),
    y: canvas.height + 18,
    radius: rand(2, 7),
    speed: rand(28, 74),
    drift: rand(-12, 12),
    alpha: rand(0.25, 0.72),
  });
}

function handleInput(dt) {
  const p = state.player;
  let ax = 0;
  let ay = 0;
  if (keys.has("KeyA")) ax -= 1;
  if (keys.has("KeyD")) ax += 1;
  if (keys.has("KeyW")) ay -= 1;
  if (keys.has("KeyS")) ay += 1;
  if (ax !== 0 && ay !== 0) {
    ax *= Math.SQRT1_2;
    ay *= Math.SQRT1_2;
  }
  const maxSpeed = Math.max(140, 260 - p.radius * 1.45);
  p.vx += ax * 680 * dt;
  p.vy += ay * 680 * dt;
  p.vx *= 1 - Math.min(0.12, dt * 5.5);
  p.vy *= 1 - Math.min(0.12, dt * 5.5);
  const speed = Math.hypot(p.vx, p.vy);
  if (speed > maxSpeed) {
    p.vx = (p.vx / speed) * maxSpeed;
    p.vy = (p.vy / speed) * maxSpeed;
  }
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.x = Math.max(p.radius + 8, Math.min(canvas.width - p.radius - 8, p.x));
  p.y = Math.max(p.radius + 8, Math.min(canvas.height - p.radius - 8, p.y));
  if (speed > 6) {
    p.angle = Math.atan2(p.vy, p.vx);
  }
}

function updateFish(dt) {
  for (const fish of state.fish) {
    fish.wobble += dt * 4.2;
    fish.x += fish.vx * dt;
    fish.y += (fish.vy + Math.sin(fish.wobble) * 22) * dt;
    if (fish.y < fish.radius + 10 || fish.y > canvas.height - fish.radius - 10) {
      fish.vy *= -1;
    }
  }
  state.fish = state.fish.filter((fish) => fish.x > -140 && fish.x < canvas.width + 140 && !fish.eaten);
}

function collide() {
  const p = state.player;
  for (const fish of state.fish) {
    const dist = Math.hypot(p.x - fish.x, p.y - fish.y);
    if (dist > p.radius * 0.7 + fish.radius * 0.82) continue;
    if (p.radius >= fish.radius * 0.9) {
      fish.eaten = true;
      state.score += Math.round(fish.data.score * (fish.radius / fish.data.radius));
      const before = unlockedSpecies().length;
      p.radius = Math.min(86, p.radius + fish.radius * 0.045);
      if (unlockedSpecies().length > before) {
        const unlocked = unlockedSpecies().at(-1);
        state.message = `${unlocked.name} 已解锁`;
        state.messageTimer = 2.4;
      }
      continue;
    }
    if (p.invulnerable <= 0) {
      state.lives -= 1;
      p.invulnerable = 1.6;
      p.vx += (p.x < fish.x ? -1 : 1) * 210;
      p.vy += (p.y < fish.y ? -1 : 1) * 130;
      state.message = "被更大的鱼撞到了";
      state.messageTimer = 1.8;
      if (state.lives <= 0) {
        endGame();
        break;
      }
    }
  }
}

function endGame() {
  state.running = false;
  state.gameOver = true;
  state.best = Math.max(state.best, state.score);
  localStorage.setItem(bestKey, String(state.best));
  finalScore.textContent = `${Math.floor(state.score)} 分`;
  gameOverOverlay.classList.add("is-active");
  updateHud();
}

function updateWorld(dt) {
  state.time += dt;
  state.spawnTimer -= dt;
  state.player.invulnerable = Math.max(0, state.player.invulnerable - dt);
  state.messageTimer = Math.max(0, state.messageTimer - dt);
  if (state.spawnTimer <= 0) {
    spawnFish();
    state.spawnTimer = Math.max(0.34, 1.08 - state.score / 4200);
  }
  if (Math.random() < dt * 5) {
    spawnBubble();
  }
  for (const bubble of state.bubbles) {
    bubble.y -= bubble.speed * dt;
    bubble.x += bubble.drift * dt + Math.sin(state.time * 2 + bubble.radius) * 5 * dt;
  }
  state.bubbles = state.bubbles.filter((bubble) => bubble.y > -20);
  handleInput(dt);
  updateFish(dt);
  collide();
  updateHud();
}

function updateHud() {
  state.best = Math.max(state.best, state.score);
  scoreText.textContent = String(Math.floor(state.score));
  bestText.textContent = String(Math.floor(state.best));
  sizeText.textContent = `${(state.player.radius / 24).toFixed(1)}x`;
  lifeText.textContent = String(state.lives);
  const next = nextSpecies();
  renderDex();
  if (!next) {
    unlockText.textContent = "全部解锁";
    unlockHint.textContent = "所有鱼类都已进入海域。";
    unlockFill.style.width = "100%";
    return;
  }
  const previousUnlock = species[Math.max(0, species.indexOf(next) - 1)].unlock;
  const progress = (state.score - previousUnlock) / Math.max(1, next.unlock - previousUnlock);
  unlockText.textContent = next.name;
  unlockHint.textContent = `${next.unlock - Math.floor(state.score)} 分后解锁`;
  unlockFill.style.width = `${Math.max(0, Math.min(1, progress)) * 100}%`;
}

function renderDex() {
  fishDex.innerHTML = species
    .map((fish) => {
      const unlocked = state.score >= fish.unlock;
      return `
        <li class="${unlocked ? "" : "fish-locked"}">
          <span class="fish-token" style="background:${fish.color}"></span>
          <span class="fish-name">${unlocked ? fish.name : "未发现"}</span>
          <span class="fish-points">${unlocked ? `+${fish.score}` : fish.unlock}</span>
        </li>
      `;
    })
    .join("");
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#0b86a2");
  gradient.addColorStop(0.58, "#0d677f");
  gradient.addColorStop(1, "#064557");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(210, 255, 255, 0.13)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i += 1) {
    const y = 62 + i * 68 + Math.sin(state.time * 0.7 + i) * 12;
    ctx.beginPath();
    for (let x = -40; x <= canvas.width + 40; x += 40) {
      const waveY = y + Math.sin(x * 0.012 + state.time * 1.2 + i) * 8;
      if (x === -40) ctx.moveTo(x, waveY);
      else ctx.lineTo(x, waveY);
    }
    ctx.stroke();
  }

  for (const bubble of state.bubbles) {
    ctx.globalAlpha = bubble.alpha;
    ctx.strokeStyle = "#d6ffff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawFish(fishLike, data, isPlayer = false) {
  const direction = Math.cos(fishLike.angle ?? (fishLike.vx < 0 ? Math.PI : 0)) < 0 ? -1 : 1;
  const angle = isPlayer ? fishLike.angle : fishLike.vx < 0 ? Math.PI : 0;
  const r = fishLike.radius;
  ctx.save();
  ctx.translate(fishLike.x, fishLike.y);
  ctx.rotate(angle);
  const flash = isPlayer && fishLike.invulnerable > 0 && Math.floor(state.time * 16) % 2 === 0;
  ctx.globalAlpha = flash ? 0.46 : 1;

  ctx.fillStyle = data.accent;
  ctx.beginPath();
  ctx.moveTo(-r * 0.95, 0);
  ctx.lineTo(-r * 1.55, -r * 0.52);
  ctx.lineTo(-r * 1.44, r * 0.52);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = data.color;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.18, r * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = data.accent;
  ctx.beginPath();
  ctx.moveTo(-r * 0.08, -r * 0.64);
  ctx.lineTo(-r * 0.42, -r * 1.03);
  ctx.lineTo(r * 0.26, -r * 0.5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.beginPath();
  ctx.ellipse(r * 0.18, -r * 0.18, r * 0.55, r * 0.18, -0.18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(r * 0.7, -r * 0.18, Math.max(3, r * 0.13), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#12212a";
  ctx.beginPath();
  ctx.arc(r * 0.74, -r * 0.17, Math.max(1.5, r * 0.06), 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(9, 39, 54, 0.42)";
  ctx.lineWidth = Math.max(1, r * 0.045);
  ctx.beginPath();
  ctx.moveTo(r * 0.86, r * 0.18);
  ctx.quadraticCurveTo(r * 0.68, r * 0.33, r * 0.42, r * 0.28);
  ctx.stroke();
  ctx.restore();

  if (!isPlayer && direction < 0) {
    return;
  }
}

function drawHudMessage() {
  if (state.messageTimer <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, state.messageTimer);
  ctx.fillStyle = "rgba(2, 28, 42, 0.7)";
  ctx.strokeStyle = "rgba(218, 255, 255, 0.34)";
  ctx.lineWidth = 1;
  roundRect(canvas.width / 2 - 150, 22, 300, 42, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#fce47f";
  ctx.font = "700 18px Microsoft YaHei, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(state.message, canvas.width / 2, 43);
  ctx.restore();
}

function roundRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function draw() {
  drawBackground();
  const sortedFish = [...state.fish].sort((a, b) => a.radius - b.radius);
  for (const fish of sortedFish) {
    drawFish(fish, fish.data);
  }
  drawFish(state.player, {
    color: "#fff0a8",
    accent: "#ff895c",
  }, true);
  drawHudMessage();
}

let lastTime = performance.now();
function loop(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;
  if (state.running) {
    updateWorld(dt);
  }
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  if (["KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code)) {
    event.preventDefault();
    keys.add(event.code);
    if (!state.running && !state.gameOver) resetGame();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

startButton.addEventListener("click", resetGame);
restartButton.addEventListener("click", resetGame);

updateHud();
draw();
requestAnimationFrame(loop);
