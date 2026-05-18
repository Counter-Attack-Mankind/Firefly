function update(deltaMs) {
  if (!state.running) {
    return;
  }
  if (!hasShield() && state.shieldHits > 0) {
    consumeShield();
  }

  const dt = Math.min(deltaMs / 16.6667, 2);
  state.prevSpeed = state.speed;
  updatePets(deltaMs, dt);

  let currentGravity = gravity;
  if (state.downPressed && !player.onGround && player.vy > -1) {
    currentGravity += fastFallAccel;
  }

  player.vy += currentGravity * dt;
  const wasOnGround = player.onGround;
  player.y += player.vy * dt;

  const hb = playerHitbox();
  // 更严格：如果命中框左右任一位置在悬崖缺口内，就视为“无落脚点”。
  const leftFootX = hb.x + hb.w * 0.25;
  const rightFootX = hb.x + hb.w * 0.75;
  const groundSolidNow = isSolidGroundAt(leftFootX) && isSolidGroundAt(rightFootX);

  if (groundSolidNow) {
    if (player.y >= playerGroundY) {
      player.y = playerGroundY;
      player.vy = 0;
      player.onGround = true;
      player.jumpsUsed = 0;
      if (!wasOnGround) {
        player.landRecover = 1;
      }
    } else {
      player.onGround = false;
    }
  } else {
    player.onGround = false;
    // 掉落失败：进入悬崖缺口后，脚部下探到地面以下即判定失败
    if (player.vy > 0 && player.y >= groundY + 8) {
      state.running = false;
      playGameOverSound();
      playLoseAudio(); 
    }
  }

  const targetSlide = player.onGround && state.downPressed ? 1 : 0;
  // === 滑铲特效：灰尘拖尾、火花、地面划痕 ===
if (player.onGround && player.slideBlend > 0.45 && state.running) {
  spawnSlideDust();
  spawnSlideSparks();
  spawnSkidMark();
}

// === 灰尘粒子更新 ===
for (let i = state.particles.length - 1; i >= 0; i--) {
  const p = state.particles[i];
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.vy += 0.06 * dt;
  p.vx *= 0.98;
  p.size *= 0.985;
  p.life -= p.decay * dt;

  if (p.life <= 0 || p.size < 0.5) {
    state.particles.splice(i, 1);
  }
}

// === 火花更新 ===
for (let i = state.sparks.length - 1; i >= 0; i--) {
  const s = state.sparks[i];
  s.x += s.vx * dt;
  s.y += s.vy * dt;
  s.vy += 0.12 * dt;
  s.vx *= 0.985;
  s.size *= 0.97;
  s.life -= s.decay * dt;

  if (s.life <= 0 || s.size < 0.4) {
    state.sparks.splice(i, 1);
  }
}

// === 划痕更新 ===
for (let i = state.skidMarks.length - 1; i >= 0; i--) {
  const m = state.skidMarks[i];
  m.x -= state.speed * dt; // 地面在动，划痕也要随场景左移
  m.life -= m.decay * dt;

  if (m.life <= 0 || m.x + m.w < -20) {
    state.skidMarks.splice(i, 1);
  }
}

  if (targetSlide > player.slideBlend) {
    player.slideBlend = Math.min(1, player.slideBlend + 0.18 * dt);
  } else {
    player.slideBlend = Math.max(0, player.slideBlend - 0.14 * dt);
  }

  state.dayTime += state.dayDirection * deltaMs * 0.000015;
  if (state.dayTime > 1) {
    state.dayTime = 1;
    state.dayDirection = -1;
  } else if (state.dayTime < 0) {
    state.dayTime = 0;
    state.dayDirection = 1;
  }

  const maxSpeed = 13.5;   // ❗降低上限
  const accel = 0.00008;   // ❗减缓增长
  state.speed += accel * deltaMs * (1 - state.speed / maxSpeed);
  const sceneTransitionActive = updateSceneTransition(deltaMs, dt);
  updateScore();

  if (sceneTransitionActive) {
    player.runCycle += dt * (0.12 + state.speed * 0.01);
    if (player.landRecover > 0) {
      player.landRecover = Math.max(0, player.landRecover - 0.09 * dt);
    }
    return;
  }

    // === 每1000分(米)生成一个宠物拾取物 ===
  if (Math.floor(state.score) >= state.nextPetScore) {
    const hasPetPickupOnField = pets.some((p) => p.type === "pickup");
    const hasCompanion = hasPetCompanion();

    if (!hasPetPickupOnField && !hasCompanion) {
      addPetPickup();
    }

    state.nextPetScore += petSpawnEveryScore;
  }

  // 降低跑步肢体晃动频率（之前节奏偏快、偏剧烈）
  player.runCycle += dt * (0.09 + state.speed * 0.0085);
  if (player.landRecover > 0) {
    player.landRecover = Math.max(0, player.landRecover - 0.09 * dt);
  }

  state.obstacleTimer += deltaMs;
  if (state.obstacleTimer >= state.obstacleInterval) {
    state.obstacleTimer = 0;
    addObstacle();
    state.obstacleInterval = 860 + Math.random() * 520;
  }

  state.cliffTimer += deltaMs;
  if (state.cliffTimer >= state.cliffInterval) {
    state.cliffTimer = 0;
    addCliff();
    // 随着速度提升更密集
    state.cliffInterval = 6200 - Math.min(2200, (state.speed - 6.6) * 180) + Math.random() * 2600;
  }

  state.powerupTimer += deltaMs;
  if (state.powerupTimer >= state.powerupInterval) {
    state.powerupTimer = 0;
    addShieldPowerup();
    state.powerupInterval = 15000 + Math.random() * 9000;
  }

  // 炮弹生成：把随机结果存在 state 中，避免每帧重抽导致节奏不可控。
  state.cannonTimer += deltaMs;
  const canFireUnder1000 = state.score <= 1000 && state.cannonCountUnder1000 < 2;
  const canFireAfter1000 = state.score > 1000;
  if ((canFireUnder1000 || canFireAfter1000) && state.cannonTimer >= state.cannonInterval && cannonballs.length < 1) {
    state.cannonTimer = 0;
    addCannonball();
    if (canFireUnder1000) {
      state.cannonCountUnder1000 += 1;
    }
    state.cannonInterval = getNextCannonInterval();
  }

  for (const cloud of clouds) {
    cloud.x -= cloud.s * dt * (0.65 + state.speed * 0.03);
    if (cloud.x + cloud.w < -20) {
      cloud.x = canvas.width + Math.random() * 180;
      cloud.y = 20 + Math.random() * 130;
    }
  }
  for (const hill of hills) {
    hill.x -= dt * (0.4 + state.speed * 0.08);
    if (hill.x + hill.w < -20) {
      hill.x = canvas.width + Math.random() * 120;
      hill.w = 180 + Math.random() * 120;
      hill.h = 40 + Math.random() * 48;
    }
  }

  for (const m of farMountains) {
    m.x -= dt * (state.speed * 0.08 + 0.18) * m.p;
    if (m.x + m.w < -80) {
      m.x = canvas.width + Math.random() * 300;
      m.w = 240 + Math.random() * 180;
      m.h = 70 + Math.random() * 90;
      m.p = 0.14 + Math.random() * 0.18;
    }
  }
  for (const tree of trees) {
    tree.x -= dt * (1 + state.speed * 0.14);
    if (tree.x < -20) {
      tree.x = canvas.width + Math.random() * 100;
      tree.h = 20 + Math.random() * 34;
    }
  }

  for (let i = cliffs.length - 1; i >= 0; i -= 1) {
    const c = cliffs[i];
    c.x -= state.speed * dt;
    if (c.x + c.w < -40) {
      cliffs.splice(i, 1);
    }
  }

  for (let i = coins.length - 1; i >= 0; i -= 1) {
    const c = coins[i];
    c.x -= state.speed * dt;
    if (c.x + c.r < -20) {
      coins.splice(i, 1);
      continue;
    }
    if (isCoinInvalid(c)) {
      coins.splice(i, 1);
      continue;
    }
    if (hasPetCompanion()) {
      applyCoinMagnet(c, dt);
    }
    const hb = playerHitbox();
    const cx = c.x;
    const cy = c.y;
    const closestX = Math.max(hb.x, Math.min(cx, hb.x + hb.w));
    const closestY = Math.max(hb.y, Math.min(cy, hb.y + hb.h));
    const dx = cx - closestX;
    const dy = cy - closestY;
    if (dx * dx + dy * dy < c.r * c.r) {
      state.score += coinBonus;
      playCoinSound();
      coins.splice(i, 1);
      updateScore();
    }
  }

  for (let i = powerups.length - 1; i >= 0; i -= 1) {
    const p = powerups[i];
    p.x -= state.speed * dt;
    if (p.x + p.w < -30) {
      powerups.splice(i, 1);
      continue;
    }
    if (isColliding(playerHitbox(), p)) {
      activateShield();
      playShieldPickupSound();
      powerups.splice(i, 1);
    }
  }

  for (let i = obstacles.length - 1; i >= 0; i -= 1) {
    const o = obstacles[i];
    o.x -= state.speed * dt;
    if (o.x + o.w < -60) {
      obstacles.splice(i, 1);
      continue;
    }
        if (isObstacleColliding(o)) {
      if (hasShield()) {
        consumeShield();
        playShieldBreakSound();
        obstacles.splice(i, 1);
      } else {
        state.running = false;
        playGameOverSound();
        playLoseAudio(); 
      }
    }
  }

      // === 炮弹运动 & 碰撞 ===
for (let i = cannonballs.length - 1; i >= 0; i--) {
  const c = cannonballs[i];
  const now = performance.now();

// 预警阶段（1秒）
if (c.warning) {
  if (now - c.spawnTime > 1000) {
    c.warning = false;
  }
  continue;
}

  // 飞行
  c.x -= c.speed * dt;

  const halfW = (c.hitW || c.r * 2) / 2;
  const halfH = (c.hitH || c.r * 2) / 2;

  if (c.x + (c.w || halfW * 2) / 2 < -20) {
    cannonballs.splice(i, 1);
    continue;
  }

  // 碰撞
  const hb = playerHitbox();
  if (
    hb.x < c.x + halfW &&
    hb.x + hb.w > c.x - halfW &&
    hb.y < c.y + halfH &&
    hb.y + hb.h > c.y - halfH
  ) {
        if (hasShield()) {
      consumeShield();
      playShieldBreakSound();
      cannonballs.splice(i, 1);
    } else {
      state.running = false;
      playGameOverSound();
      playLoseAudio(); 
    }
  }
}
  state.score += (0.05 + state.speed * 0.015) * dt;

}

function playerHitbox() {
  if (player.slideBlend > 0.45) {
    return {
      x: player.x - 22,
      y: player.y - 38,
      w: 46,
      h: 38
    };
  }
  const bodyTop = player.y - player.bodyHeight;
  return {
    x: player.x - 18,
    y: bodyTop - player.headSize,
    w: 36,
    h: player.bodyHeight + player.headSize
  };
}

function isObstacleColliding(obstacle) {
  if (obstacle.type === "spike") {
    const box = {
      x: obstacle.x + 4,
      y: obstacle.y + 10,
      w: Math.max(8, obstacle.w - 8),
      h: Math.max(8, obstacle.h - 10)
    };
    return isColliding(playerHitbox(), box);
  }
  return isColliding(playerHitbox(), obstacle);
}

function updateSceneTransition(deltaMs, dt) {
  if (
    state.sceneTransitionPhase === "none" &&
    state.score >= state.nextSceneScore - sceneTunnelLeadScore
  ) {
    beginSceneGate();
  }

  if (state.sceneTransitionPhase === "none") {
    return false;
  }

  state.sceneTunnelVisible = true;

  if (state.sceneTransitionPhase === "gate") {
    state.sceneWorldFrozen = false;
    state.sceneTunnelX -= state.speed * dt;
    removeEntitiesNearTunnel(70);
    const readyDistance = state.sceneTunnelX - (player.x + player.headSize * 0.5);
    if (readyDistance <= sceneTunnelEnterDistance && isPathToTunnelClear()) {
      beginSceneApproach();
      return true;
    }
    state.sceneTransitionDarkness = 0;
    return false;
  }

  state.sceneWorldFrozen = true;
  player.vy = 0;
  player.y = playerGroundY;
  player.onGround = true;
  player.jumpsUsed = 0;
  player.slideBlend = Math.max(0, player.slideBlend - 0.22 * dt);

  if (state.sceneTransitionPhase === "approach") {
    const targetX = state.sceneTunnelX + sceneTunnelWidth * 0.5;
    player.x = Math.min(targetX, player.x + sceneApproachSpeed * dt);
    const progress = Math.max(0, Math.min(1, (player.x - playerRunX) / (targetX - playerRunX)));
    state.sceneTransitionDarkness = Math.pow(progress, 2) * 0.75;

    if (player.x >= targetX - 2) {
      state.sceneTransitionPhase = "dark";
      state.sceneTransitionTimer = 0;
    }
    return true;
  }

  if (state.sceneTransitionPhase === "dark") {
    state.sceneTransitionTimer += deltaMs;
    const t = Math.min(1, state.sceneTransitionTimer / sceneDarkenMs);
    state.sceneTransitionDarkness = 0.75 + t * 0.2;

    if (t >= 1) {
      completeSceneSwitch();
    }
    return true;
  }

  if (state.sceneTransitionPhase === "brighten") {
    state.sceneTransitionTimer += deltaMs;
    const t = Math.min(1, state.sceneTransitionTimer / sceneBrightenMs);
    state.sceneTransitionDarkness = Math.max(0, (1 - t) * 0.95);
    player.x = playerRunX;
    player.y = playerGroundY;

    if (t >= 1) {
      state.sceneTransitionPhase = "none";
      state.sceneWorldFrozen = false;
      state.sceneTunnelVisible = false;
      state.sceneTransitionDarkness = 0;
    }
    return true;
  }

  if (state.sceneTransitionPhase === "exit") {
    state.sceneTransitionTimer += deltaMs;
    const t = Math.min(1, state.sceneTransitionTimer / sceneBrightenMs);
    const startX = state.sceneTunnelX + sceneTunnelWidth * 0.5;
    player.x = startX + (playerRunX - startX) * t;
    player.y = playerGroundY;
    player.vy = 0;
    player.onGround = true;
    state.sceneTransitionDarkness = Math.max(0, (1 - t) * 0.95);

    if (t >= 1) {
      state.sceneTransitionPhase = "none";
      state.sceneWorldFrozen = false;
      state.sceneTunnelVisible = false;
      state.sceneTransitionDarkness = 0;
    }
    return true;
  }

  return true;
}

function beginSceneGate() {
  state.sceneTransitionPhase = "gate";
  state.sceneTransitionTimer = 0;
  state.sceneWorldFrozen = false;
  state.sceneTunnelVisible = true;
  state.sceneTunnelX = sceneTunnelSpawnX;
  state.sceneTransitionDarkness = 0;
  removeEntitiesNearTunnel();
}

function beginSceneApproach() {
  state.sceneTransitionPhase = "approach";
  state.sceneTransitionTimer = 0;
  state.sceneWorldFrozen = true;
  state.sceneTransitionDarkness = 0;
  removeEntitiesNearTunnel();
}

function completeSceneSwitch() {
  state.score = Math.max(state.score, state.nextSceneScore);
  state.sceneIndex = state.nextSceneIndex;
  state.lastSceneSwitchScore = state.score;
  state.nextSceneScore += sceneSwitchEveryScore;
  state.nextSceneIndex = pickNextSceneIndex(state.sceneIndex);
  state.sceneTransitionPhase = "exit";
  state.sceneTransitionTimer = 0;
  state.sceneTunnelVisible = true;
  state.sceneTunnelX = sceneTunnelExitX;
  player.x = state.sceneTunnelX + sceneTunnelWidth * 0.5;
  player.y = playerGroundY;
  state.sceneExitSafeUntil = state.score + sceneExitSafeScore;
  removeEntitiesNearTunnel();
}

function isPathToTunnelClear() {
  const left = player.x + 20;
  const right = state.sceneTunnelX + sceneTunnelWidth + 10;
  return (
    !hasRectInRange(obstacles, left, right) &&
    !hasRectInRange(powerups, left, right) &&
    !hasRectInRange(pets.filter((p) => p.type === "pickup"), left, right) &&
    !hasCircleInRange(coins, left, right) &&
    !hasCircleInRange(cannonballs, left, right) &&
    !hasCliffNearRange(left, right, 0)
  );
}

function hasRectInRange(items, left, right) {
  return items.some((item) => item.x + (item.w || 0) > left && item.x < right);
}

function hasCircleInRange(items, left, right) {
  return items.some((item) => item.x + (item.r || 0) > left && item.x - (item.r || 0) < right);
}

function removeEntitiesNearTunnel(radius = sceneTunnelClearRadius) {
  const left = state.sceneTunnelX - radius;
  const right = state.sceneTunnelX + sceneTunnelWidth + radius;
  removeRectsInRange(obstacles, left, right);
  removeRectsInRange(powerups, left, right);
  removeRectsInRange(pets, left, right);
  removeCirclesInRange(coins, left, right);
  removeCirclesInRange(cannonballs, left, right);
  for (let i = cliffs.length - 1; i >= 0; i -= 1) {
    const c = cliffs[i];
    if (c.x + c.w > left && c.x < right) {
      cliffs.splice(i, 1);
    }
  }
}

function removeRectsInRange(items, left, right) {
  for (let i = items.length - 1; i >= 0; i -= 1) {
    const item = items[i];
    if (item.type === "companion") continue;
    const itemLeft = item.x;
    const itemRight = item.x + (item.w || item.r * 2 || 0);
    if (itemRight > left && itemLeft < right) {
      items.splice(i, 1);
    }
  }
}

function removeCirclesInRange(items, left, right) {
  for (let i = items.length - 1; i >= 0; i -= 1) {
    const item = items[i];
    const itemLeft = item.x - (item.r || 0);
    const itemRight = item.x + (item.r || 0);
    if (itemRight > left && itemLeft < right) {
      items.splice(i, 1);
    }
  }
}

function pickNextSceneIndex(currentIndex) {
  if (sceneThemes.length <= 1) {
    return 0;
  }
  let next = currentIndex;
  while (next === currentIndex) {
    next = Math.floor(Math.random() * sceneThemes.length);
  }
  return next;
}

function applyCoinMagnet(coin, dt) {
  const hb = playerHitbox();
  const targetX = hb.x + hb.w * 0.5;
  const targetY = hb.y + hb.h * 0.45;
  const dx = targetX - coin.x;
  const dy = targetY - coin.y;
  const distSq = dx * dx + dy * dy;
  const radiusSq = petCoinMagnetRadius * petCoinMagnetRadius;

  if (distSq > radiusSq || distSq <= 0.001) {
    return;
  }

  const dist = Math.sqrt(distSq);
  const pull = petCoinMagnetSpeed * dt * (1 - dist / petCoinMagnetRadius + 0.35);
  coin.x += dx * Math.min(1, pull);
  coin.y += dy * Math.min(1, pull);
}

function isCoinInvalid(coin) {
  const size = coin.r * 2;
  return !canSpawnCollectibleRect(
    coin.x - coin.r,
    coin.y - coin.r,
    size,
    size,
    coin.padding ?? 18
  );
}

function isColliding(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function rectsOverlap(aX, aY, aW, aH, bX, bY, bW, bH) {
  return aX < bX + bW && aX + aW > bX && aY < bY + bH && aY + aH > bY;
}

function isSolidGroundAt(x) {
  // cliffs 表示“地面缺口”，只要落在缺口内部就认为无地面可站立
  for (const c of cliffs) {
    if (x > c.x && x < c.x + c.w) {
      return false;
    }
  }
  return true;
}

function isRectOverObstacles(x, y, w, h) {
  for (const o of obstacles) {
    if (rectsOverlap(x, y, w, h, o.x, o.y, o.w, o.h)) {
      return true;
    }
  }
  return false;
}

function hasLowbarNearX(x, padding = 1000) {
  for (const o of obstacles) {
    if (o.type !== "lowbar") continue;
    if (x + padding > o.x && x - padding < o.x + o.w) {
      return true;
    }
  }
  return false;
}

function hasLowbarNearRange(startX, endX, padding = 1000) {
  for (const o of obstacles) {
    if (o.type !== "lowbar") continue;
    if (endX + padding > o.x && startX - padding < o.x + o.w) {
      return true;
    }
  }
  return false;
}

function hasJumpObstacleNearRange(startX, endX, padding = 1000) {
  for (const o of obstacles) {
    if (o.type === "lowbar") continue;
    if (endX + padding > o.x && startX - padding < o.x + o.w) {
      return true;
    }
  }
  return false;
}

function hasCliffNearX(x, padding = 1000) {
  for (const c of cliffs) {
    if (x + padding > c.x && x - padding < c.x + c.w) {
      return true;
    }
  }
  return false;
}

function hasCliffNearRange(startX, endX, padding = 1000) {
  for (const c of cliffs) {
    if (endX + padding > c.x && startX - padding < c.x + c.w) {
      return true;
    }
  }
  return false;
}

function canSpawnRect(x, y, w, h) {
  // 生成物允许在障碍“上方/周围”，但不允许与障碍相交；
  // 并且需要落在有地面的区域（避免生成在悬崖空洞中）。
  const leftX = x + w * 0.25;
  const rightX = x + w * 0.75;
  if (!isSolidGroundAt(leftX) || !isSolidGroundAt(rightX)) {
    return false;
  }
  if (isRectOverObstacles(x, y, w, h)) {
    return false;
  }
  return true;
}

function isRectNearCliff(x, y, w, h, padding = 0) {
  for (const c of cliffs) {
    if (x + w + padding > c.x && x - padding < c.x + c.w) {
      return true;
    }
  }
  return false;
}

function canSpawnCollectibleRect(x, y, w, h, padding = 0) {
  if (!canSpawnRect(x, y, w, h)) {
    return false;
  }
  if (isRectTooCloseToObstacles(x, y, w, h, padding)) {
    return false;
  }
  if (isRectNearCliff(x, y, w, h, collectibleCliffPadding + padding)) {
    return false;
  }
  return true;
}

function getNextCannonInterval() {
  if (state.score <= 1000) {
    return 12000 + Math.random() * 6000;
  }
  const base = 9000;
  const difficulty = Math.min(2500, (state.score - 1000) * 0.25);
  return base - difficulty + Math.random() * 5000;
}
