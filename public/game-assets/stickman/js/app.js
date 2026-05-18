function updateScore() {
  const score = Math.floor(state.score);
  if (score > state.highScore) {
    state.highScore = score;
    saveHighScore(score);
  }
  const shieldText = hasShield() ? " | 护盾: 1" : "";
  const petText = hasPetCompanion() ? " | 磁铁: 1" : "";
  const sceneText = ` | 场景: ${getCurrentSceneTheme().name}`;
  scoreEl.textContent = `分数: ${score} | 最高分: ${state.highScore}${sceneText}${shieldText}${petText}`;
}

function loop(timestamp) {
  if (!state.lastTime) {
    state.lastTime = timestamp;
  }
  const deltaMs = timestamp - state.lastTime;
  state.lastTime = timestamp;

  update(deltaMs);
  draw();
  requestAnimationFrame(loop);
}

function startGame() {
  if (state.started) {
    return;
  }
  window.parent?.postMessage({ type: "stickman:start" }, window.location.origin);
  unlockAudio();
  playStartSound();
  resetGame();
}

function buildHeadMaskFromBackground() {
  const size = 128;
  const off = document.createElement("canvas");
  off.width = size;
  off.height = size;
  const octx = off.getContext("2d", { willReadFrequently: true });
  octx.drawImage(headImage, 0, 0, size, size);
  const img = octx.getImageData(0, 0, size, size);
  const data = img.data;

  const corners = [
    getPixelRgb(data, size, 0, 0),
    getPixelRgb(data, size, size - 1, 0),
    getPixelRgb(data, size, 0, size - 1),
    getPixelRgb(data, size, size - 1, size - 1)
  ];
  const bg = corners.reduce(
    (acc, c) => ({
      r: acc.r + c.r / corners.length,
      g: acc.g + c.g / corners.length,
      b: acc.b + c.b / corners.length
    }),
    { r: 0, g: 0, b: 0 }
  );

  const threshold = 78;
  const softEdgeThreshold = 106;
  const whiteCutoff = 228;
  const whiteDiffLimit = 30;
  const seen = new Uint8Array(size * size);
  const queue = [];
  let qIndex = 0;

  function isNearWhite(r, g, b) {
    const maxV = Math.max(r, g, b);
    const minV = Math.min(r, g, b);
    return maxV >= whiteCutoff && maxV - minV <= whiteDiffLimit;
  }

  function isBackgroundLike(x, y) {
    const p = getPixelRgb(data, size, x, y);
    const dr = p.r - bg.r;
    const dg = p.g - bg.g;
    const db = p.b - bg.b;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    if (dist <= threshold) {
      return true;
    }
    if (isNearWhite(p.r, p.g, p.b)) {
      return true;
    }
    return false;
  }

  function pushIfBackground(x, y) {
    if (x < 0 || y < 0 || x >= size || y >= size) {
      return;
    }
    const idx = y * size + x;
    if (seen[idx]) {
      return;
    }
    if (!isBackgroundLike(x, y)) {
      return;
    }
    seen[idx] = 1;
    queue.push(idx);
  }

  for (let x = 0; x < size; x += 1) {
    pushIfBackground(x, 0);
    pushIfBackground(x, size - 1);
  }
  for (let y = 1; y < size - 1; y += 1) {
    pushIfBackground(0, y);
    pushIfBackground(size - 1, y);
  }
  while (qIndex < queue.length) {
    const idx = queue[qIndex];
    qIndex += 1;
    const x = idx % size;
    const y = Math.floor(idx / size);
    pushIfBackground(x + 1, y);
    pushIfBackground(x - 1, y);
    pushIfBackground(x, y + 1);
    pushIfBackground(x, y - 1);
  }

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const idx = y * size + x;
      if (!seen[idx]) {
        continue;
      }
      const i = idx * 4;
      data[i + 3] = 0;
    }
  }

  // Remove remaining near-white isolated paper/background pixels.
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      if (data[i + 3] === 0) {
        continue;
      }
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const maxV = Math.max(r, g, b);
      const minV = Math.min(r, g, b);
      if (maxV >= whiteCutoff && maxV - minV <= whiteDiffLimit) {
        data[i + 3] = 0;
      }
    }
  }

  // Keep only largest connected opaque region to preserve head silhouette.
  const kept = new Uint8Array(size * size);
  const visited = new Uint8Array(size * size);
  let bestCount = 0;
  let bestPixels = [];
  const neighbors = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const idx = y * size + x;
      if (visited[idx]) {
        continue;
      }
      const i = idx * 4;
      if (data[i + 3] === 0) {
        continue;
      }
      const comp = [];
      const q = [idx];
      visited[idx] = 1;
      for (let qi = 0; qi < q.length; qi += 1) {
        const cur = q[qi];
        comp.push(cur);
        const cx = cur % size;
        const cy = Math.floor(cur / size);
        for (const n of neighbors) {
          const nx = cx + n[0];
          const ny = cy + n[1];
          if (nx < 0 || ny < 0 || nx >= size || ny >= size) {
            continue;
          }
          const nidx = ny * size + nx;
          if (visited[nidx]) {
            continue;
          }
          const ni = nidx * 4;
          if (data[ni + 3] === 0) {
            continue;
          }
          visited[nidx] = 1;
          q.push(nidx);
        }
      }
      if (comp.length > bestCount) {
        bestCount = comp.length;
        bestPixels = comp;
      }
    }
  }
  for (const idx of bestPixels) {
    kept[idx] = 1;
  }
  for (let idx = 0; idx < size * size; idx += 1) {
    if (kept[idx]) {
      continue;
    }
    const i = idx * 4;
    data[i + 3] = 0;
  }

  for (let y = 1; y < size - 1; y += 1) {
    for (let x = 1; x < size - 1; x += 1) {
      const idx = y * size + x;
      const i = idx * 4;
      if (data[i + 3] === 0) {
        continue;
      }
      const dr = data[i] - bg.r;
      const dg = data[i + 1] - bg.g;
      const db = data[i + 2] - bg.b;
      const dist = Math.sqrt(dr * dr + dg * dg + db * db);
      if (dist < softEdgeThreshold) {
        const keepAlpha = Math.min(1, (dist - threshold) / (softEdgeThreshold - threshold));
        data[i + 3] = Math.round(255 * keepAlpha);
      }
    }
  }

  octx.putImageData(img, 0, 0);
  headMaskCanvas = off;
}

function getPixelRgb(data, size, x, y) {
  const i = (y * size + x) * 4;
  return { r: data[i], g: data[i + 1], b: data[i + 2] };
}

function handleJumpInput() {
  if (!state.started) {
    startGame();
    return;
  }
  unlockAudio();
  jump();
}

window.addEventListener("keydown", (e) => {
  if (!state.started) {
    e.preventDefault();
    startGame();
    return;
  }
  if (e.code === "Space" || e.code === "ArrowUp") {
    e.preventDefault();
    handleJumpInput();
  } else if (e.code === "ArrowDown") {
    state.downPressed = true;
  } else if (e.key.toLowerCase() === "r") {
    unlockAudio();
    playStartSound(); 
    resetGame();
  }
});

window.addEventListener("keyup", (e) => {
  if (e.code === "ArrowDown") {
    state.downPressed = false;
  }
});

canvas.addEventListener("pointerdown", () => {
  if (!state.started) {
    startGame();
    return;
  }
  handleJumpInput();
});

headImage.addEventListener("load", () => {
  buildHeadMaskFromBackground();
});

headImage.addEventListener("error", () => {
  console.warn("无法加载 character_move/lsj.(jpg|png)，使用默认灰色头部。");
});

state.nextSceneIndex = pickNextSceneIndex(state.sceneIndex);
updateScore();
requestAnimationFrame(loop);
