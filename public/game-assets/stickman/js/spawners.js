function getSafeDistance() {
  // 玩家反应时间（秒）
  const reactionTime = 0.9;
  const dynamicDist = state.speed * reactionTime * 60;

  return Math.max(lowbarCliffMinDistance, dynamicDist);
}

function addObstacle() {
  if (state.sceneWorldFrozen) {
    return;
  }
  const r = Math.random();
  const spawnX = getObstacleSpawnX();
  if (r < 0.18 && addSceneSpecialObstacle(spawnX)) {
    return;
  }
  if (r < 0.38) {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const theme = getCurrentSceneTheme();
      const x = getObstacleSpawnX();
      const w = lowbarVisualWidth + Math.random() * 28;
      const h = lowbarVisualHeight;
      const y = 0;
      if (isNearTunnelRange(x, x + w)) continue;
      if (hasCliffNearRange(x, x + w, getSafeDistance())) continue;
      if (hasJumpObstacleNearRange(x, x + w, lowbarJumpMinDistance)) continue;
      if (hasLowCannonballThreatNearRange(x, x + w, 900)) continue;
      addPlannedObstacle({ type: "lowbar", sceneId: theme.id, x, y, w, h });
      return;
    }
  }
  addJumpObstacleForScene(spawnX);
}

function addSceneSpecialObstacle(spawnX) {
  if (state.sceneWorldFrozen || isNearTunnelRange(spawnX, spawnX + 170)) {
    return false;
  }
  const theme = getCurrentSceneTheme();
  let obstacle = null;

  if (theme.id === "city") {
    if (Math.random() < 0.5) {
      const w = 62;
      const h = 72;
      obstacle = {
        type: "trafficGate",
        x: spawnX,
        y: groundY + 1 - h,
        w,
        h,
        lightPhase: Math.random() < 0.5 ? "red" : "green"
      };
    } else {
      const w = 116;
      const h = 156;
      obstacle = {
        type: "spikedMace",
        x: spawnX,
        y: 0,
        w,
        h,
        swingRange: 56,
        phase: Math.random() * Math.PI * 2
      };
    }
  } else if (theme.id === "desert") {
    const w = 118 + Math.random() * 34;
    obstacle = {
      type: "sandstorm",
      x: spawnX,
      y: groundY - 150,
      w,
      h: 92,
      phase: Math.random() * Math.PI * 2
    };
  } else if (theme.id === "maze") {
    if (Math.random() < 0.5) {
      const w = 132 + Math.random() * 26;
      obstacle = {
        type: "palaceGate",
        x: spawnX,
        y: 0,
        w,
        h: groundY - lowbarGroundClearance
      };
    } else {
      const w = 96;
      const h = 116;
      obstacle = {
        type: "lanternSwing",
        x: spawnX,
        y: 0,
        w,
        h,
        swingRange: 58,
        phase: Math.random() * Math.PI * 2
      };
    }
  }

  if (!obstacle) {
    return false;
  }

  if (isSlideRequiredObstacle(obstacle) && hasLowCannonballThreatNearRange(obstacle.x, obstacle.x + obstacle.w, 900)) {
    return false;
  }

  const padding = obstacle.type === "spikedMace" ? 180 : lowbarJumpMinDistance;
  if (hasCliffNearRange(obstacle.x, obstacle.x + obstacle.w, getSafeDistance())) return false;
  if (hasLowbarNearRange(obstacle.x, obstacle.x + obstacle.w, padding)) return false;
  if (hasJumpObstacleNearRange(obstacle.x, obstacle.x + obstacle.w, jumpObstacleMinDistance)) return false;

  addPlannedObstacle(obstacle);
  return true;
}

function getObstacleSpawnX() {
  return canvas.width + obstacleSpawnLeadMin + Math.random() * obstacleSpawnLeadRange;
}

function addPlannedObstacle(obstacle) {
  obstacles.push(obstacle);
  planCoinsForObstacle(obstacle);
}

function addJumpObstacleForScene(spawnX) {
  if (state.sceneWorldFrozen || isNearTunnelRange(spawnX, spawnX + 80)) {
    return;
  }
  const theme = getCurrentSceneTheme();
  let w;
  let h;

  if (theme.obstacleType === "pillar") {
    h = 70 + Math.random() * 40;
    w = 42 + Math.random() * 14;
  } else if (theme.obstacleType === "block") {
    h = 42 + Math.random() * 22;
    w = 44 + Math.random() * 18;
  } else {
    h = 34 + Math.random() * 30;
    w = 42 + Math.random() * 26;
  }

  if (hasLowbarNearRange(spawnX, spawnX + w, lowbarJumpMinDistance)) {
    return;
  }
  if (hasJumpObstacleNearRange(spawnX, spawnX + w, jumpObstacleMinDistance)) {
    return;
  }
  if (hasCliffNearRange(spawnX, spawnX + w, collectibleCliffPadding + 100)) {
    return;
  }

  addPlannedObstacle({
    type: theme.obstacleType,
    x: spawnX,
    y: groundY + 1 - h,
    w,
    h
  });
}
function addCannonball() {
  const spawnX = canvas.width + 200;

  const lowY = groundY - 18;
  const highY = groundY - 120;
  const speed = state.speed + 10;

  const wantHigh = state.nextCannonHigh;

  let y = wantHigh ? highY : lowY;

  if (!wantHigh && hasLowbarCannonTimingConflict(spawnX, speed)) {
    y = highY;
  }

  cannonballs.push({
    x: spawnX,
    y,
    r: 14,
    w: rpgDrawWidth,
    h: rpgDrawHeight,
    hitW: rpgHitWidth,
    hitH: rpgHitHeight,
    speed,
    spawnTime: performance.now(),
    warning: true
  });

  playCannonWarningSound();

  // 高低炮弹交替
  state.nextCannonHigh = !state.nextCannonHigh;
}

function hasLowbarCannonTimingConflict(spawnX, cannonSpeed) {
  const obstacleSpeed = Math.max(1, state.speed);
  const missileArrivalFrames = 60 + Math.max(0, spawnX - player.x) / Math.max(1, cannonSpeed);

  for (const obstacle of obstacles) {
    if (!isSlideRequiredObstacle(obstacle)) continue;

    if (obstacle.x < canvas.width + 520 && obstacle.x + obstacle.w > player.x - 160) {
      return true;
    }

    const slideFrontX = player.x + 98;
    const slideBackX = player.x - 44;
    const lowbarStartFrames = (obstacle.x - slideFrontX) / obstacleSpeed;
    const lowbarEndFrames = (obstacle.x + obstacle.w - slideBackX) / obstacleSpeed;
    if (
      missileArrivalFrames >= lowbarStartFrames - lowbarCannonConflictEnterBufferFrames &&
      missileArrivalFrames <= lowbarEndFrames + lowbarCannonConflictExitBufferFrames
    ) {
      return true;
    }
  }

  return hasSlideRequiredObstacleNearX(spawnX, 420);
}

function isSlideRequiredObstacle(obstacle) {
  return (
    obstacle.type === "lowbar" ||
    obstacle.type === "palaceGate" ||
    obstacle.type === "spikedMace" ||
    obstacle.type === "lanternSwing"
  );
}

function hasSlideRequiredObstacleNearX(x, padding = 1000) {
  for (const obstacle of obstacles) {
    if (!isSlideRequiredObstacle(obstacle)) continue;
    if (x + padding > obstacle.x && x - padding < obstacle.x + obstacle.w) {
      return true;
    }
  }
  return false;
}

function hasLowCannonballThreatNearRange(startX, endX, padding = 680) {
  for (const cannonball of cannonballs) {
    if (cannonball.y < groundY - 60) continue;
    const halfW = (cannonball.hitW || cannonball.r * 2) / 2;
    const left = cannonball.x - halfW;
    const right = cannonball.x + halfW;
    if (endX + padding > left && startX - padding < right) {
      return true;
    }
  }
  return false;
}

function addCliff() {
  if (state.sceneWorldFrozen) {
    return;
  }
  // 悬崖：地面缺口，必须跳跃跨过；否则会“掉落失败”。
  const w = 90 + Math.random() * 110;
  for (let attempt = 0; attempt < 18; attempt += 1) {
    const x = canvas.width + 220 + Math.random() * 220;
    if (isNearTunnelRange(x, x + w)) continue;
    if (hasLowbarNearRange(x, x + w, getSafeDistance())) continue;
    if (hasJumpObstacleNearRange(x, x + w, collectibleCliffPadding + 100)) continue;
    
    cliffs.push({ x, w });
    return;
  }
}

function isNearTunnelRange(startX, endX) {
  if (!state.sceneTunnelVisible && state.sceneTransitionPhase === "none") {
    return false;
  }
  const left = state.sceneTunnelX - sceneTunnelClearRadius;
  const right = state.sceneTunnelX + sceneTunnelWidth + sceneTunnelClearRadius;
  return endX > left && startX < right;
}

function addShieldPowerup() {
  const w = 28;
  const h = 28;
  // 生成点尽量靠右，并尝试避开当前障碍物与悬崖空洞
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const x = canvas.width + 170 + Math.random() * 240; // 顶点偏右，减少与障碍“同时生成重叠”
    const y = groundY - 76 - Math.random() * 104; // 悬浮高度
    if (!canSpawnCollectibleRect(x, y, w, h, 36)) continue;
    if (isRectTooCloseToPets(x, y, w, h, 80)) continue;
    powerups.push({ type: "shield", x, y, w, h });
    return;
  }
}

function isRectTooCloseToPets(x, y, w, h, padding = 0) {
  for (const p of pets) {
    if (p.type !== "pickup") continue;
    if (rectsOverlap(x - padding, y - padding, w + padding * 2, h + padding * 2, p.x, p.y, p.w, p.h)) {
      return true;
    }
  }
  return false;
}

function isRectTooCloseToPowerups(x, y, w, h, padding = 0) {
  for (const p of powerups) {
    if (rectsOverlap(x - padding, y - padding, w + padding * 2, h + padding * 2, p.x, p.y, p.w, p.h)) {
      return true;
    }
  }
  return false;
}

function isRectTooCloseToObstacles(x, y, w, h, extraPadding = 0) {
  for (const o of obstacles) {
    let padding = 20;

    if (o.type === "lowbar") padding = 36;   // 滑铲空间要更大
    if (o.type === "pillar") padding = 28;
    if (o.type === "spike") padding = 18;
    padding = Math.max(0, padding + extraPadding);

    if (
      rectsOverlap(
        x - padding,
        y - padding,
        w + padding * 2,
        h + padding * 2,
        o.x,
        o.y,
        o.w,
        o.h
      )
    ) {
      return true;
    }
  }
  return false;
}

function addCoin() {
  const r = 10;
  const jumpPair = findObstacleGapForCoins();
  const nearestSlide = findNextLowbar();
  if (nearestSlide && (!jumpPair || nearestSlide.x < jumpPair[0].x)) {
    if (tryAddCoinPattern(buildSlideCoinLine(r, nearestSlide), r)) {
      return;
    }
  }
  if (jumpPair) {
    const addedArc = Math.random() < jumpCoinArcChance
      ? tryAddCoinPattern(buildJumpCoinArc(r, jumpPair[0]), r)
      : false;
    const addedLine = Math.random() < betweenJumpCoinChance
      ? tryAddCoinPattern(buildBetweenObstacleCoinLine(r, jumpPair), r)
      : false;
    if (addedArc || addedLine) {
      return;
    }
  }

  const builders = [
    buildBetweenObstacleCoinLine,
    buildJumpCoinArc
  ];

  for (const build of builders) {
    const points = build(r);
    if (tryAddCoinPattern(points, r)) {
      return;
    }
  }
}

function planCoinsForObstacle(obstacle) {
  const r = 10;

  if (
    obstacle.type === "palaceGate" ||
    obstacle.type === "sandstorm" ||
    obstacle.type === "spikedMace" ||
    obstacle.type === "lanternSwing"
  ) {
    return;
  }

  if (obstacle.type === "lowbar") {
    tryAddCoinPattern(buildSlideCoinLine(r, obstacle), r, true);
    return;
  }

  if (Math.random() < jumpCoinArcChance) {
    tryAddCoinPattern(buildJumpCoinArc(r, obstacle), r, true);
  }

  const pair = findPreviousJumpPair(obstacle);
  if (pair && Math.random() < betweenJumpCoinChance) {
    tryAddCoinPattern(buildBetweenObstacleCoinLine(r, pair), r, true);
  }
}

function buildNearestSlideCoinLine(r) {
  const lowbar = findNextLowbar();
  if (!lowbar) {
    return null;
  }
  const nextObstacle = findNextObstacle();
  if (nextObstacle && nextObstacle !== lowbar && nextObstacle.x < lowbar.x) {
    return null;
  }
  return buildSlideCoinLine(r, lowbar);
}

function tryAddCoinPattern(points, r, requirePreload = false) {
  if (!points || points.length === 0) {
    return false;
  }
  if (requirePreload && !isCoinPatternPreloaded(points)) {
    return false;
  }

  const validPoints = points.filter((point) => canPlaceCoin(point.x, point.y, r, point.padding ?? 18));
  if (validPoints.length !== points.length) {
    return false;
  }

  validPoints.forEach((point) => coins.push({ x: point.x, y: point.y, r, padding: point.padding ?? 18 }));
  return true;
}

function isCoinPatternPreloaded(points) {
  return points.every((point) => point.x - 10 > canvas.width + coinPreloadBuffer);
}

function buildBetweenObstacleCoinLine(r, pair = null) {
  pair = pair || findObstacleGapForCoins();
  if (!pair) {
    return null;
  }

  const [left, right] = pair;
  const leftArc = buildJumpCoinArc(r, left);
  const rightArc = buildJumpCoinArc(r, right);
  if (!leftArc || !rightArc) {
    return null;
  }

  const leftBoundaryCoin = leftArc[leftArc.length - 1];
  const rightBoundaryCoin = rightArc[0];
  const leftCenterLimit = leftBoundaryCoin.x + r * 2;
  const rightCenterLimit = rightBoundaryCoin.x - r * 2;
  const centerSpan = rightCenterLimit - leftCenterLimit;
  const spacing = 100;
  if (centerSpan < spacing) {
    return null;
  }

  const count = Math.min(5, Math.floor(centerSpan / spacing) + 1);
  const centerX = (leftCenterLimit + rightCenterLimit) * 0.5;
  const y = groundY - player.bodyHeight * 0.5;
  const startX = centerX - ((count - 1) * spacing) * 0.5;

  return Array.from({ length: count }, (_, i) => ({
    x: startX + i * spacing,
    y,
    padding: -10
  }));
}

function buildJumpCoinArc(r, obstacle = null) {
  const o = obstacle || findNextJumpObstacle();
  if (!o) {
    return null;
  }

  const centerX = o.x + o.w * 0.5;
  const spacing = 48 + Math.min(14, state.speed * 0.95);
  const baseY = Math.min(groundY - 72, o.y - 30);
  const peakY = Math.min(groundY - 188, o.y - 88 - Math.min(38, state.speed * 2.2));

  return Array.from({ length: 5 }, (_, i) => {
    const offset = i - 2;
    const t = Math.abs(offset) / 2;
    const y = peakY + (baseY - peakY) * t * t;
    return {
      x: centerX + offset * spacing,
      y,
      padding: 16
    };
  });
}

function buildSlideCoinLine(r, obstacle = null) {
  const o = obstacle || findNextLowbar();
  if (!o) {
    return null;
  }

  const centerX = o.x + o.w * 0.5;
  const y = groundY - r - 5;

  return Array.from({ length: 4 }, (_, i) => ({
    x: centerX + (i - 1.5) * slideCoinSpacing,
    y,
    padding: -30
  }));
}

function findNextJumpObstacle() {
  const minX = player.x + 180;
  const maxX = canvas.width + 760 + state.speed * 22;
  return obstacles
    .filter((o) => o.type !== "lowbar" && o.x > minX && o.x < maxX)
    .sort((a, b) => a.x - b.x)[0] || null;
}

function findNextLowbar() {
  const minX = player.x + 180;
  const maxX = canvas.width + 760 + state.speed * 22;
  return obstacles
    .filter((o) => o.type === "lowbar" && o.x > minX && o.x < maxX)
    .sort((a, b) => a.x - b.x)[0] || null;
}

function findNextObstacle() {
  const minX = player.x + 180;
  const maxX = canvas.width + 760 + state.speed * 22;
  return obstacles
    .filter((o) => o.x > minX && o.x < maxX)
    .sort((a, b) => a.x - b.x)[0] || null;
}

function findObstacleGapForCoins() {
  const candidates = obstacles
    .filter((o) => o.type !== "lowbar" && o.x > player.x + 180 && o.x < canvas.width + 920)
    .sort((a, b) => a.x - b.x);

  for (let i = 0; i < candidates.length - 1; i += 1) {
    const left = candidates[i];
    const right = candidates[i + 1];
    const gapStart = left.x + left.w;
    const gapEnd = right.x;
    if (gapEnd - gapStart < 150) {
      continue;
    }
    if (hasCliffNearRange(gapStart, gapEnd, collectibleCliffPadding)) {
      continue;
    }
    return [left, right];
  }
  return null;
}

function findPreviousJumpPair(obstacle) {
  if (obstacle.type === "lowbar") {
    return null;
  }

  const previous = obstacles
    .filter((o) => o !== obstacle && o.type !== "lowbar" && o.x < obstacle.x)
    .sort((a, b) => b.x - a.x)[0];

  if (!previous) {
    return null;
  }

  const gapStart = previous.x + previous.w;
  const gapEnd = obstacle.x;
  if (gapEnd - gapStart < 150) {
    return null;
  }
  if (hasCliffNearRange(gapStart, gapEnd, collectibleCliffPadding)) {
    return null;
  }
  return [previous, obstacle];
}

function canPlaceCoin(x, y, r, padding = 18) {
  const size = r * 2;
  if (!canSpawnCollectibleRect(x - r, y - r, size, size, padding)) {
    return false;
  }
  for (const c of coins) {
    const dx = c.x - x;
    const dy = c.y - y;
    if (dx * dx + dy * dy < Math.pow(c.r + r + 12, 2)) {
      return false;
    }
  }
  return true;
}

function addPetPickup() {
  const w = 34;
  const h = 34;

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const x = canvas.width + 180 + Math.random() * 180;
    const y = groundY - 95 - Math.random() * 70;

    if (!canSpawnCollectibleRect(x, y, w, h, 42)) continue;
    if (isRectTooCloseToPowerups(x, y, w, h, 80)) continue;

    pets.push({
      type: "pickup",
      x,
      y,
      w,
      h,
      angle: 0,
      bobSeed: Math.random() * Math.PI * 2
    });
    return;
  }

}

function activatePetCompanion() {
  // 删除 pickup 类型宠物
  for (let i = pets.length - 1; i >= 0; i--) {
    if (pets[i].type === "pickup") pets.splice(i, 1);
  }

  const now = performance.now();
  pets.push({
    type: "companion",
    x: player.x + petFollowOffsetX,
    y: player.y - player.bodyHeight + petFollowOffsetY, // 改：相对玩家上方
    w: 34,
    h: 34,
    angle: 0,
    followUntil: now + petFollowDurationMs + (state.characterId === "csy" ? csyPowerupBonusMs : 0),
    alive: true,             // ✅ 新增标记
    wanderX: 0,
    wanderY: 0,
    wanderTargetX: (Math.random() * 2 - 1) * petMaxWanderX,
    wanderTargetY: (Math.random() * 2 - 1) * petMaxWanderY,
    wanderTimer: 0,
    wanderInterval: 350 + Math.random() * 450
  });

  updateScore(); // 拾取后立即刷新右上角提示
}

function hasPetCompanion() {
  return pets.some(p => p.type === "companion" && p.alive);
}

function getPetCompanionRemainingMs() {
  const now = performance.now();
  return pets
    .filter((p) => p.type === "companion" && p.alive)
    .reduce((max, p) => Math.max(max, p.followUntil - now), 0);
}

function updatePets(deltaMs, dt) {
  const now = performance.now();

  for (let i = pets.length - 1; i >= 0; i--) {
    const p = pets[i];

    if (p.type === "pickup") {
      p.x -= state.speed * dt;
      p.y += Math.sin(now * 0.004 + p.bobSeed) * 0.18 * dt;

      if (p.x + p.w < -40) {
        pets.splice(i, 1);
        continue;
      }

      if (isColliding(playerHitbox(), p)) {
        activatePetCompanion();
      }
      continue;
    }

    if (p.type === "companion") {
      // 超过持续时间，标记为死
      if (now >= p.followUntil) {
        p.alive = false;
      }

      if (!p.alive) {
        pets.splice(i, 1);
        updateScore();
        continue;
      }

      // wander 随机移动逻辑
      p.wanderTimer += deltaMs;
      if (p.wanderTimer >= p.wanderInterval) {
        p.wanderTimer = 0;
        p.wanderInterval = 300 + Math.random() * 500;
        p.wanderTargetX = (Math.random() * 2 - 1) * petMaxWanderX;
        p.wanderTargetY = (Math.random() * 2 - 1) * petMaxWanderY;
      }

      p.wanderX += (p.wanderTargetX - p.wanderX) * 0.06 * dt;
      p.wanderY += (p.wanderTargetY - p.wanderY) * 0.06 * dt;

      const targetX = player.x + petFollowOffsetX + p.wanderX;
      const targetY = (player.y - player.bodyHeight) + petFollowOffsetY + p.wanderY;

      p.x += (targetX - p.x) * 0.16 * dt;
      p.y += (targetY - p.y) * 0.16 * dt;
    }
  }
}
