function resetGame() {
  state.started = true;
  state.running = true;
  state.paused = false;
  state.lastTime = 0;
  state.speed = 6.6;
  state.prevSpeed = 6.6;
  state.score = 0;
  state.distance = 0;
  state.secretCharge = 0;
  state.secretReady = false;
  state.inSecretRealm = false;
  state.secretDistance = 0;
  state.secretSavedSceneIndex = sceneOrder[0];
  state.secretCoinTimer = 0;
  state.doubleScoreUntil = 0;
  state.wdFanActive = false;
  state.wdSkillUsed = false;
  state.wdReviveUsed = false;
  state.wdSkillUseCount = 0;
  state.wdReviveInvincibleUntil = 0;
  state.ljwDashActive = false;
  state.ljwDashDistance = 0;
  state.ljwDashStartY = playerGroundY;
  state.ljwDashSavedSpeed = 6.6;
  state.ljwLandingInvincibleUntil = 0;
  state.scoreSubmitted = false;
  state.lockReleasedForRun = false;
  if (typeof leaderboardResetRun === "function") {
    leaderboardResetRun();
  }
  state.obstacleTimer = 0;
  state.obstacleInterval = 1060;
  state.powerupTimer = 0;
  state.powerupInterval = 15000;
  state.coinTimer = 0;
  state.coinInterval = 900;
  state.sceneIndex = sceneOrder[0];
  state.nextSceneScore = sceneSwitchEveryScore;
  state.nextSceneIndex = pickNextSceneIndex(state.sceneIndex);
  state.lastSceneSwitchScore = -sceneTunnelFadeScore;
  state.sceneTransitionPhase = "none";
  state.sceneTransitionTimer = 0;
  state.sceneWorldFrozen = false;
  state.sceneTransitionDarkness = 0;
  state.sceneTunnelVisible = false;
  state.sceneTunnelX = sceneTunnelSpawnX;
  state.sceneExitSafeUntil = 0;
  state.cliffTimer = 0;
  state.cliffInterval = 7800;
  state.shieldHits = 0;
  state.shieldUntil = 0;

  state.cannonTimer = 0;
  state.cannonInterval = 14000;
  state.cannonCountUnder1000 = 0;
  state.nextCannonHigh = false;

  obstacles.length = 0;
  cliffs.length = 0;
  powerups.length = 0;
  coins.length = 0;
  cannonballs.length = 0;
  pets.length = 0;
  state.particles.length = 0;
  state.sparks.length = 0;
  state.skidMarks.length = 0;
  state.nextPetScore = petSpawnEveryScore;

  player.y = playerGroundY;
  player.x = playerRunX;
  player.vy = 0;
  player.onGround = true;
  player.jumpsUsed = 0;
  player.runCycle = 0;
  player.landRecover = 0;
  player.slideBlend = 0;

  losePlayed = false;
  playBgm(true);
  updateScore();
}

function addSecretCharge(amount) {
  if (state.inSecretRealm) {
    return;
  }
  const skill = getCurrentCharacterConfig();
  if (skill.skillType === "passive") {
    return;
  }
  state.secretCharge = Math.min(skill.chargeMax, state.secretCharge + amount);
  state.secretReady = state.secretCharge >= skill.chargeMax;
  if (typeof updateSecretProgressBar === "function") {
    updateSecretProgressBar();
  }
}

function useChargedSkill() {
  const skill = getCurrentCharacterConfig();
  if (skill.skillType === "passive") {
    return;
  }
  if (skill.skillType === "shield") {
    activateChargedShield();
    return;
  }
  if (skill.skillType === "doubleScore") {
    activateDoubleScore();
    return;
  }
  if (skill.skillType === "revive") {
    activateReviveFan();
    return;
  }
  if (skill.skillType === "dash") {
    activateLjwDash();
    return;
  }
  enterSecretRealm();
}

function hasDoubleScore() {
  return performance.now() < state.doubleScoreUntil;
}

function getScoreMultiplier() {
  return (hasDoubleScore() ? 2 : 1) * getWdSkillScoreMultiplier();
}

function getWdSkillScoreMultiplier() {
  if (state.characterId !== "wd") {
    return 1;
  }
  const index = Math.min(state.wdSkillUseCount, wdSkillScoreMultipliers.length - 1);
  return wdSkillScoreMultipliers[index] ?? 0;
}

function activateDoubleScore() {
  if (
    !state.started ||
    !state.running ||
    state.paused ||
    !state.secretReady ||
    state.inSecretRealm
  ) {
    return;
  }

  state.secretReady = false;
  state.secretCharge = 0;
  state.doubleScoreUntil = performance.now() + doubleScoreDurationMs;
  if (typeof updateSecretProgressBar === "function") {
    updateSecretProgressBar();
  }
}

function activateChargedShield() {
  if (
    !state.started ||
    !state.running ||
    state.paused ||
    !state.secretReady ||
    state.inSecretRealm
  ) {
    return;
  }

  state.secretReady = false;
  state.secretCharge = 0;
  activateShield(shieldDurationMs * 2, "pdh", "skill");
  if (typeof updateSecretProgressBar === "function") {
    updateSecretProgressBar();
  }
}

function activateReviveFan() {
  if (
    !state.started ||
    !state.running ||
    state.paused ||
    !state.secretReady ||
    state.inSecretRealm ||
    state.wdFanActive
  ) {
    return;
  }

  state.secretReady = false;
  state.secretCharge = 0;
  state.wdSkillUsed = true;
  state.wdSkillUseCount += 1;
  state.wdFanActive = true;
  state.wdReviveUsed = false;
  playSkillAudio();
  if (typeof updateSecretProgressBar === "function") {
    updateSecretProgressBar();
  }
}

function tryUseReviveFan() {
  if (
    state.characterId !== "wd" ||
    !state.wdFanActive ||
    state.wdReviveUsed
  ) {
    return false;
  }

  state.wdFanActive = false;
  state.wdReviveUsed = true;
  state.wdReviveInvincibleUntil = performance.now() + wdReviveInvincibleMs;
  state.downPressed = false;
  player.x = playerRunX;
  player.y = playerGroundY;
  player.vy = 0;
  player.onGround = true;
  player.jumpsUsed = 0;
  player.slideBlend = 0;
  clearReviveDangerZone();
  playShieldBreakSound();
  updateScore();
  if (typeof updateSecretProgressBar === "function") {
    updateSecretProgressBar();
  }
  return true;
}

function hasReviveInvincible() {
  const now = performance.now();
  return now < state.wdReviveInvincibleUntil || now < state.ljwLandingInvincibleUntil;
}

function hasLjwDash() {
  return state.ljwDashActive;
}

function activateLjwDash() {
  if (
    !state.started ||
    !state.running ||
    state.paused ||
    !state.secretReady ||
    state.inSecretRealm ||
    state.sceneTransitionPhase !== "none"
  ) {
    return;
  }

  state.secretReady = false;
  state.secretCharge = 0;
  state.ljwDashActive = true;
  state.ljwDashDistance = 0;
  state.ljwDashStartY = player.y;
  state.ljwDashSavedSpeed = state.speed;
  state.downPressed = false;
  player.vy = 0;
  player.y = ljwDashFlyY;
  player.onGround = false;
  player.jumpsUsed = 0;
  player.slideBlend = 0;
  playSkillAudio();
  if (typeof updateSecretProgressBar === "function") {
    updateSecretProgressBar();
  }
}

function finishLjwDash() {
  if (!state.ljwDashActive) {
    return;
  }
  state.ljwDashActive = false;
  state.ljwDashDistance = 0;
  state.speed = state.ljwDashSavedSpeed;
  state.prevSpeed = state.speed;
  state.ljwLandingInvincibleUntil = performance.now() + ljwLandingInvincibleMs;
  player.y = playerGroundY;
  player.vy = 0;
  player.onGround = true;
  player.jumpsUsed = 0;
  player.slideBlend = 0;
  clearLjwDashLandingZone();
  playShieldBreakSound();
  if (typeof updateSecretProgressBar === "function") {
    updateSecretProgressBar();
  }
}

function clearLjwDashLandingZone() {
  const hb = playerHitbox();
  const centerX = hb.x + hb.w * 0.5;
  const centerY = hb.y + hb.h * 0.5;
  removeDangerItemsNearPoint(obstacles, centerX, centerY, ljwDashClearRadius);
  removeDangerItemsNearPoint(cliffs, centerX, groundY, ljwDashClearRadius);
  removeDangerItemsNearPoint(cannonballs, centerX, centerY, ljwDashClearRadius);
}

function removeDangerItemsNearPoint(items, centerX, centerY, radius) {
  const radiusSq = radius * radius;
  for (let i = items.length - 1; i >= 0; i -= 1) {
    const item = items[i];
    const itemCenterX = item.x + (item.w || item.r * 2 || 0) * 0.5;
    const itemCenterY = item.y + (item.h || item.r * 2 || 0) * 0.5;
    const dx = itemCenterX - centerX;
    const dy = itemCenterY - centerY;
    if (dx * dx + dy * dy <= radiusSq) {
      items.splice(i, 1);
    }
  }
}

function clearReviveDangerZone() {
  const left = player.x - 120;
  const right = player.x + 520;
  removeDangerItemsInRange(obstacles, left, right);
  removeDangerItemsInRange(cliffs, left, right);
  removeDangerItemsInRange(cannonballs, left, right);
}

function removeDangerItemsInRange(items, left, right) {
  for (let i = items.length - 1; i >= 0; i -= 1) {
    const item = items[i];
    const itemLeft = item.x - (item.r || 0);
    const itemRight = item.x + (item.w || item.r * 2 || 0);
    if (itemRight > left && itemLeft < right) {
      items.splice(i, 1);
    }
  }
}

function enterSecretRealm() {
  const skill = getCurrentCharacterConfig();
  if (
    !state.started ||
    !state.running ||
    state.paused ||
    !state.secretReady ||
    state.inSecretRealm ||
    skill.skillType !== "dream" ||
    state.sceneTransitionPhase !== "none"
  ) {
    return;
  }

  state.inSecretRealm = true;
  state.secretReady = false;
  state.secretCharge = 0;
  state.secretDistance = 0;
  state.secretCoinTimer = 0;
  state.secretSavedSceneIndex = state.sceneIndex;
  state.sceneIndex = secretSceneIndex >= 0 ? secretSceneIndex : state.sceneIndex;
  state.sceneTransitionPhase = "none";
  state.sceneWorldFrozen = false;
  state.sceneTunnelVisible = false;
  state.sceneTransitionDarkness = 0;
  obstacles.length = 0;
  cliffs.length = 0;
  powerups.length = 0;
  cannonballs.length = 0;
  coins.length = 0;
  pets.length = 0;
  state.shieldHits = 0;
  state.shieldUntil = 0;
  state.shieldVisual = "ring";
  if (typeof addSecretCoinColumn === "function") {
    for (let i = 0; i < 8; i += 1) {
      addSecretCoinColumn(canvas.width + 40 + i * secretCoinSpacing);
    }
  }
  playDreamAudio();
  updateScore();
  if (typeof updateSecretProgressBar === "function") {
    updateSecretProgressBar();
  }
}

function exitSecretRealm() {
  if (!state.inSecretRealm) {
    return;
  }
  state.inSecretRealm = false;
  state.secretDistance = 0;
  state.secretCoinTimer = 0;
  state.sceneIndex = state.secretSavedSceneIndex;
  state.nextSceneScore = Math.max(
    state.nextSceneScore,
    Math.floor(state.distance / sceneSwitchEveryScore) * sceneSwitchEveryScore + sceneSwitchEveryScore
  );
  coins.length = 0;
  updateScore();
  if (typeof updateSecretProgressBar === "function") {
    updateSecretProgressBar();
  }
}

function hasShield() {
  return state.shieldHits > 0 && performance.now() < state.shieldUntil;
}

function consumeShield() {
  state.shieldHits = 0;
  state.shieldUntil = 0;
  state.shieldVisual = "ring";
}

function activateShield(durationMs = shieldDurationMs, visual = "ring", soundType = "protect") {
  const shieldDuration = state.characterId === "csy" ? durationMs + csyPowerupBonusMs : durationMs;
  if (hasShield() && state.shieldVisual === "pdh" && visual !== "pdh") {
    state.shieldUntil += activeShieldPickupBonusMs;
    playShieldAudio();
    return;
  }
  state.shieldHits = 1;
  state.shieldUntil = performance.now() + shieldDuration;
  state.shieldVisual = visual;
  if (soundType === "skill") {
    playSkillAudio();
    return;
  }
  playShieldAudio();
}

function getCurrentMaxJumps() {
  return state.characterId === "csy" ? 3 : maxJumps;
}

function jump() {
  if (!state.running || state.paused || player.jumpsUsed >= getCurrentMaxJumps()) {
    return;
  }
  const airborneJump = player.jumpsUsed > 0;
  player.vy = airborneJump ? doubleJumpPower : jumpPower;
  player.onGround = false;
  player.jumpsUsed += 1;
  playJumpSound(airborneJump);
}

