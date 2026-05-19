function updateScore() {
  const score = Math.floor(state.score);
  const distance = Math.floor(state.distance);
  const leaderboardTopScore = Math.max(0, Math.floor(Number(state.leaderboardTopScore || 0)));
  const shieldText = hasShield() ? " | 护盾: 1" : "";
  const doubleText = hasDoubleScore() ? " | 双倍: 1" : "";
  const petText = hasPetCompanion() ? " | 磁铁: 1" : "";
  const sceneText = ` | 场景: ${getCurrentSceneTheme().name}`;
  scoreEl.textContent = `分数: ${score} | 距离: ${distance}m | 第一名: ${leaderboardTopScore}${sceneText}${shieldText}${doubleText}${petText}`;
}

function updatePauseButton() {
  const pauseButton = document.getElementById("pauseButton");
  if (!pauseButton) {
    return;
  }
  const canPause = state.started && state.running;
  pauseButton.hidden = !canPause;
  pauseButton.setAttribute("aria-label", state.paused ? "继续游戏" : "暂停游戏");
  pauseButton.setAttribute("title", state.paused ? "继续游戏" : "暂停游戏");
  pauseButton.innerHTML = state.paused
    ? '<span class="pause-icon pause-icon-play" aria-hidden="true"></span>'
    : '<span class="pause-icon pause-icon-pause" aria-hidden="true"></span>';
}

function updateDebugDistanceButton() {
  const debugButton = document.getElementById("debugDistanceButton");
  if (!debugButton) {
    return;
  }
  debugButton.classList.toggle("is-active", state.debugDistances);
  debugButton.setAttribute("aria-pressed", state.debugDistances ? "true" : "false");
}

function updateMobileControlsButton() {
  const mobileButton = document.getElementById("mobileControlsButton");
  const mobileControls = document.getElementById("mobileControls");
  if (!mobileButton || !mobileControls) {
    return;
  }
  mobileButton.classList.toggle("is-active", state.mobileControls);
  mobileButton.setAttribute("aria-pressed", state.mobileControls ? "true" : "false");
  mobileButton.textContent = state.mobileControls ? "退出手机端" : "手机端";
  mobileControls.classList.toggle("is-active", state.mobileControls);
  mobileControls.setAttribute("aria-hidden", state.mobileControls ? "false" : "true");
  document.body.classList.toggle("mobile-play-mode", state.mobileControls);
}

async function setMobilePlayMode(enabled) {
  state.mobileControls = enabled;
  state.downPressed = false;
  updateMobileControlsButton();

  if (enabled) {
    const fullscreenTarget = document.querySelector(".game-stage") || document.documentElement;
    try {
      await fullscreenTarget.requestFullscreen?.();
    } catch (_fullscreenError) {
      // CSS full-screen mode remains active when native fullscreen is unavailable.
    }
    try {
      await screen.orientation?.lock?.("landscape");
    } catch (_orientationError) {
      // CSS rotation keeps the game playable when orientation lock is unavailable.
    }
    return;
  }

  try {
      screen.orientation?.unlock?.();
      if (document.fullscreenElement) {
        await document.exitFullscreen?.();
      }
  } catch (_error) {
    // Exiting native fullscreen can be unavailable on some browsers.
  }
}

function restartRun() {
  unlockAudio();
  playStartSound();
  resetGame();
}

function updateSecretProgressBar() {
  const progressFill = document.getElementById("secretProgressFill");
  const progressText = document.getElementById("secretProgressText");
  const progressHint = document.getElementById("secretProgressHint");
  const progressRoot = document.querySelector(".secret-progress");
  const skillName = document.querySelector(".secret-progress-topline span:first-child");
  const skillOrb = document.querySelector(".secret-progress-orb span");
  const mobileSkillButton = document.getElementById("mobileSkillButton");
  const skill = getCurrentCharacterConfig();
  const progress = state.inSecretRealm
    ? Math.min(100, Math.floor((state.secretDistance / secretRealmDistance) * 100))
    : Math.min(100, Math.floor((state.secretCharge / skill.chargeMax) * 100));

  if (progressFill) {
    progressFill.style.width = `${progress}%`;
  }
  if (skillName) {
    skillName.textContent = skill.skillName;
  }
  if (skillOrb) {
    skillOrb.textContent = skill.skillOrb;
  }
  if (progressText) {
    progressText.textContent = state.inSecretRealm
      ? `${Math.floor(state.secretDistance)} / ${secretRealmDistance}m`
      : `${Math.floor(state.secretCharge)} / ${skill.chargeMax}`;
  }
  if (progressHint) {
    progressHint.textContent = state.inSecretRealm
      ? "秘境奔跑中"
      : hasDoubleScore()
        ? `双倍得分 ${Math.ceil((state.doubleScoreUntil - performance.now()) / 1000)}s`
      : state.secretReady
        ? skill.readyText
        : skill.chargingText;
  }
  progressRoot?.classList.toggle("is-ready", state.secretReady && !state.inSecretRealm);
  progressRoot?.classList.toggle("is-active", state.inSecretRealm);
  if (mobileSkillButton) {
    mobileSkillButton.style.setProperty("--skill-progress", progress);
    mobileSkillButton.classList.toggle("is-ready", state.secretReady && !state.inSecretRealm);
    mobileSkillButton.classList.toggle("is-active", state.inSecretRealm);
  }
}

function getCurrentCharacterConfig() {
  return characterConfigs[state.characterId] || characterConfigs.lsj;
}

function setCharacter(characterId) {
  if (state.started && state.running) {
    return;
  }
  const character = characterConfigs[characterId] || characterConfigs.lsj;
  state.characterId = character.id;
  state.secretCharge = 0;
  state.secretReady = false;
  headImage.src = character.headSrc;
  if (character.shieldSkillImageSrc) {
    pdhSkillImage.src = character.shieldSkillImageSrc;
  }

  document.querySelectorAll(".character-card").forEach((card) => {
    card.classList.toggle("is-active", card.getAttribute("data-character-id") === character.id);
  });
  updateSecretProgressBar();
}

function updateCharacterSelectState() {
  const locked = state.started && state.running;
  document.querySelectorAll(".character-card").forEach((card) => {
    card.disabled = locked;
  });
  const startButton = document.getElementById("characterStartButton");
  if (startButton) {
    startButton.disabled = locked;
    startButton.textContent = state.started && !state.running ? "再来一局" : "开始游戏";
  }
}

function togglePause() {
  if (!state.started || !state.running) {
    return;
  }
  state.paused = !state.paused;
  state.downPressed = false;
  state.lastTime = 0;
  updatePauseButton();
}

function loop(timestamp) {
  if (!state.lastTime) {
    state.lastTime = timestamp;
  }
  const deltaMs = timestamp - state.lastTime;
  state.lastTime = timestamp;

  if (!state.paused) {
    update(deltaMs);
  }
  updateSecretProgressBar();
  if (state.started && !state.running) {
    releaseGamePageLock();
  }
  if (typeof leaderboardTrackGameOver === "function") {
    leaderboardTrackGameOver();
  }
  draw();
  updatePauseButton();
  updateMobileControlsButton();
  updateCharacterSelectState();
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

function releaseGamePageLock() {
  if (state.lockReleasedForRun) {
    return;
  }
  state.lockReleasedForRun = true;
  window.parent?.postMessage(
    { type: "stickman:game-over", score: Math.floor(state.score) },
    window.location.origin
  );
}

function handleJumpInput() {
  if (!state.started) {
    startGame();
    return;
  }
  if (state.paused) {
    return;
  }
  unlockAudio();
  jump();
}

window.addEventListener("keydown", (e) => {
  const target = e.target;
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target?.isContentEditable
  ) {
    return;
  }
  if (!state.started) {
    e.preventDefault();
    if (e.key === "Enter") {
      startGame();
    }
    return;
  }
  if (e.key.toLowerCase() === "p") {
    e.preventDefault();
    togglePause();
    return;
  }
  if (e.key.toLowerCase() === "e") {
    e.preventDefault();
    useChargedSkill();
    return;
  }
  if (e.key.toLowerCase() === "r") {
    e.preventDefault();
    restartRun();
    return;
  }
  if (state.paused) {
    e.preventDefault();
    return;
  }
  if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
    e.preventDefault();
    handleJumpInput();
  } else if (e.code === "ArrowDown" || e.code === "KeyS") {
    e.preventDefault();
    state.downPressed = true;
  }
});

window.addEventListener("keyup", (e) => {
  if (e.code === "ArrowDown" || e.code === "KeyS") {
    e.preventDefault();
    state.downPressed = false;
  }
});

window.addEventListener("message", (event) => {
  if (event.origin !== window.location.origin) {
    return;
  }
  if (event.data?.type !== "stickman:parent-fullscreen") {
    return;
  }
  document.body.classList.toggle("parent-fullscreen-mode", Boolean(event.data.active));
});

canvas.addEventListener("pointerdown", () => {
  if (state.mobileControls && state.started && !state.running) {
    restartRun();
    return;
  }
  if (!state.started) {
    startGame();
    return;
  }
  if (state.paused) {
    return;
  }
  handleJumpInput();
});

document.getElementById("pauseButton")?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  event.stopPropagation();
  togglePause();
});

document.getElementById("debugDistanceButton")?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  event.stopPropagation();
  state.debugDistances = !state.debugDistances;
  updateDebugDistanceButton();
});

document.getElementById("mobileControlsButton")?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  event.stopPropagation();
  setMobilePlayMode(!state.mobileControls);
});

document.getElementById("exitMobileButton")?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  event.stopPropagation();
  setMobilePlayMode(false);
});

function bindMobileActionButton(buttonId, handlers) {
  const button = document.getElementById(buttonId);
  if (!button) {
    return;
  }
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    button.setPointerCapture?.(event.pointerId);
    button.classList.add("is-pressed");
    handlers.down?.();
  });
  const release = (event) => {
    event.preventDefault();
    event.stopPropagation();
    button.classList.remove("is-pressed");
    handlers.up?.();
  };
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", () => {
    button.classList.remove("is-pressed");
    handlers.up?.();
  });
}

bindMobileActionButton("mobileJumpButton", {
  down: () => handleJumpInput()
});

bindMobileActionButton("mobileSlideButton", {
  down: () => {
    if (!state.started) {
      startGame();
      return;
    }
    if (!state.paused) {
      state.downPressed = true;
    }
  },
  up: () => {
    state.downPressed = false;
  }
});

bindMobileActionButton("mobileSkillButton", {
  down: () => {
    if (!state.started) {
      startGame();
      return;
    }
    unlockAudio();
    useChargedSkill();
  }
});

document.getElementById("characterSelect")?.addEventListener("pointerdown", (event) => {
  event.stopPropagation();
});

document.querySelectorAll(".character-card").forEach((card) => {
  card.addEventListener("click", () => {
    setCharacter(card.getAttribute("data-character-id") || "lsj");
  });
});

document.getElementById("characterStartButton")?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  if (state.started && !state.running) {
    restartRun();
    return;
  }
  startGame();
});

headImage.addEventListener("error", () => {
  const character = getCurrentCharacterConfig();
  if (headImage.src.endsWith(character.fallbackHeadSrc)) {
    console.warn("无法加载角色头像，使用默认灰色头部。");
    return;
  }
  headImage.src = character.fallbackHeadSrc;
});

pdhSkillImage.addEventListener("error", () => {
  const character = getCurrentCharacterConfig();
  if (!character.fallbackShieldSkillImageSrc || pdhSkillImage.src.endsWith(character.fallbackShieldSkillImageSrc)) {
    return;
  }
  pdhSkillImage.src = character.fallbackShieldSkillImageSrc;
});

setCharacter(state.characterId);
state.nextSceneIndex = pickNextSceneIndex(state.sceneIndex);
updateScore();
updatePauseButton();
updateDebugDistanceButton();
updateMobileControlsButton();
updateSecretProgressBar();
updateCharacterSelectState();
requestAnimationFrame(loop);
