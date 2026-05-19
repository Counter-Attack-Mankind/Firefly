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
  updateScore();
}

function addSecretCharge(amount) {
  if (state.inSecretRealm) {
    return;
  }
  const skill = getCurrentCharacterConfig();
  state.secretCharge = Math.min(skill.chargeMax, state.secretCharge + amount);
  state.secretReady = state.secretCharge >= skill.chargeMax;
  if (typeof updateSecretProgressBar === "function") {
    updateSecretProgressBar();
  }
}

function useChargedSkill() {
  const skill = getCurrentCharacterConfig();
  if (skill.skillType === "shield") {
    activateChargedShield();
    return;
  }
  enterSecretRealm();
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
  activateShield();
  if (typeof updateSecretProgressBar === "function") {
    updateSecretProgressBar();
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
}

function activateShield() {
  state.shieldHits = 1;
  state.shieldUntil = performance.now() + shieldDurationMs;
  playShieldAudio();
}

function jump() {
  if (!state.running || state.paused || player.jumpsUsed >= maxJumps) {
    return;
  }
  const doubleJump = player.jumpsUsed === 1;
  player.vy = doubleJump ? doubleJumpPower : jumpPower;
  player.onGround = false;
  player.jumpsUsed += 1;
  playJumpSound(doubleJump);
}

