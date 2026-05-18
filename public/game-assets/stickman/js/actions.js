function resetGame() {
  state.started = true;
  state.running = true;
  state.lastTime = 0;
  state.speed = 6.6;
  state.prevSpeed = 6.6;
  state.score = 0;
  state.scoreSubmitted = false;
  state.lockReleasedForRun = false;
  if (typeof leaderboardResetRun === "function") {
    leaderboardResetRun();
  }
  state.obstacleTimer = 0;
  state.obstacleInterval = 1060;
  state.powerupTimer = 0;
  state.powerupInterval = 8200;
  state.coinTimer = 0;
  state.coinInterval = 900;
  state.sceneIndex = 0;
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
  if (!state.running || player.jumpsUsed >= maxJumps) {
    return;
  }
  const doubleJump = player.jumpsUsed === 1;
  player.vy = doubleJump ? doubleJumpPower : jumpPower;
  player.onGround = false;
  player.jumpsUsed += 1;
  playJumpSound(doubleJump);
}

