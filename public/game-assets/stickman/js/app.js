function updateScore() {
  const score = Math.floor(state.score);
  const distance = Math.floor(state.distance);
  const now = performance.now();
  const shieldText = hasShield() ? ` | 护盾: ${Math.ceil((state.shieldUntil - now) / 1000)}s` : "";
  const magnetMs = typeof getPetCompanionRemainingMs === "function" ? getPetCompanionRemainingMs() : 0;
  const magnetText = magnetMs > 0 ? ` | 磁铁: ${Math.ceil(magnetMs / 1000)}s` : "";
  scoreEl.textContent = `分数: ${score} | 距离: ${distance}m${shieldText}${magnetText}`;
  scoreEl.classList.toggle("is-double-score", hasDoubleScore() && state.characterId === "js");
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
}

function setMobileControlsEnabled(enabled) {
  state.mobileControls = enabled;
  state.downPressed = false;
  updateMobileControlsButton();
}

function enterCharacterSelectPage() {
  document.getElementById("entryPrompt")?.classList.add("is-hidden");
  updateCharacterSelectState();
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
  const wdUsesLeft = state.characterId === "wd" ? Math.max(0, wdSkillMaxUses - state.wdSkillUseCount) : null;
  const wdLocked = state.characterId === "wd" && wdUsesLeft <= 0;
  const progress = state.inSecretRealm
    ? Math.min(100, Math.floor((state.secretDistance / secretRealmDistance) * 100))
    : hasLjwDash()
      ? Math.min(100, Math.floor((state.ljwDashDistance / ljwDashDistance) * 100))
    : skill.skillType === "passive"
      ? 100
    : skill.skillType === "slideCharge"
      ? Math.min(100, Math.floor((state.secretCharge / skill.chargeMax) * 100))
    : wdLocked
      ? 0
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
      : hasLjwDash()
        ? `${Math.floor(state.ljwDashDistance)} / ${ljwDashDistance}m`
      : wdLocked
        ? `剩余 0 / ${wdSkillMaxUses}`
      : state.characterId === "wd"
        ? `${Math.floor(state.secretCharge)} / ${skill.chargeMax} | 剩余 ${wdUsesLeft} / ${wdSkillMaxUses}`
      : skill.skillType === "passive"
        ? "被动"
      : skill.skillType === "slideCharge"
        ? `${Math.floor(state.secretCharge)} / ${skill.chargeMax}`
      : `${Math.floor(state.secretCharge)} / ${skill.chargeMax}`;
  }
  if (progressHint) {
    progressHint.textContent = state.inSecretRealm
      ? "秘境奔跑中"
      : hasLjwDash()
        ? "飞行冲刺中"
      : wdLocked
        ? "复活扇次数已用完"
      : state.characterId === "wd" && state.secretReady
        ? `${skill.readyText}（剩余 ${wdUsesLeft} 次）`
      : state.characterId === "wd"
        ? `${skill.chargingText}（剩余 ${wdUsesLeft} 次）`
      : skill.skillType === "passive"
        ? skill.chargingText
      : skill.skillType === "slideCharge"
        ? state.secretReady
          ? skill.readyText
          : skill.chargingText
      : hasDoubleScore()
        ? `双倍得分 ${Math.ceil((state.doubleScoreUntil - performance.now()) / 1000)}s`
      : state.secretReady
        ? skill.readyText
        : skill.chargingText;
  }
  progressRoot?.classList.toggle("is-csy-charge", skill.skillType === "slideCharge");
  progressRoot?.classList.toggle("is-ready", state.secretReady && !state.inSecretRealm && !wdLocked);
  progressRoot?.classList.toggle("is-active", state.inSecretRealm || hasLjwDash());
  if (mobileSkillButton) {
    mobileSkillButton.style.setProperty("--skill-progress", progress);
    mobileSkillButton.classList.toggle("is-csy-charge", skill.skillType === "slideCharge");
    mobileSkillButton.classList.toggle("is-ready", state.secretReady && !state.inSecretRealm && !wdLocked);
    mobileSkillButton.classList.toggle("is-active", state.inSecretRealm || hasLjwDash());
  }
}

function getCurrentCharacterConfig() {
  return characterConfigs[state.characterId] || characterConfigs.lsj;
}

const characterPageSize = 4;
let characterPageIndex = 0;

function getCharacterList() {
  return Object.values(characterConfigs);
}

function getCharacterPageCount() {
  return Math.max(1, Math.ceil(getCharacterList().length / characterPageSize));
}

function getCharacterPageItems() {
  const start = characterPageIndex * characterPageSize;
  return getCharacterList().slice(start, start + characterPageSize);
}

function updateCharacterCardsActive() {
  const locked = state.started && state.running;
  document.querySelectorAll(".character-card").forEach((card) => {
    const active = card.getAttribute("data-character-id") === state.characterId;
    card.classList.toggle("is-active", active);
    card.disabled = locked;
  });
}

function updateCharacterPreview() {
  const character = getCurrentCharacterConfig();
  const characterSelect = document.getElementById("characterSelect");
  const previewImage = document.getElementById("characterPreviewImage");
  const previewName = document.getElementById("characterPreviewName");
  const previewIntro = document.getElementById("characterPreviewIntro");
  const skillTitle = document.getElementById("characterSkillTitle");
  const skillDescription = document.getElementById("characterSkillDescription");
  if (previewImage) {
    previewImage.src = character.headSrc;
  }
  if (previewName) {
    previewName.textContent = character.name;
  }
  if (previewIntro) {
    previewIntro.textContent = character.intro || "";
  }
  if (skillTitle) {
    skillTitle.textContent = character.skillName;
  }
  if (skillDescription) {
    skillDescription.textContent = character.skillDescription || character.readyText;
  }
  if (characterSelect) {
    characterSelect.dataset.characterId = character.id;
  }
}

function renderCharacterCards() {
  const options = document.getElementById("characterOptions");
  if (!options) {
    return;
  }
  const pageItems = getCharacterPageItems();
  options.innerHTML = pageItems
    .map((character) => {
      const activeClass = character.id === state.characterId ? " is-active" : "";
      const chargeText = character.skillType === "passive"
        ? "被动能力"
        : character.skillType === "slideCharge"
          ? "下铲充能"
          : `${character.chargeMax} 金币充能`;
      return `
        <button class="character-card${activeClass}" type="button" data-character-id="${character.id}">
          <img src="${character.headSrc}" alt="" />
          <span>${character.name}</span>
          <small>${character.readyText}</small>
          <em>${chargeText}</em>
        </button>
      `;
    })
    .join("");
  updateCharacterCardsActive();
  const pageCount = getCharacterPageCount();
  const prevButton = document.getElementById("characterPrevPageButton");
  const nextButton = document.getElementById("characterNextPageButton");
  const pageText = document.getElementById("characterPageText");
  if (prevButton) {
    prevButton.disabled = characterPageIndex <= 0;
  }
  if (nextButton) {
    nextButton.disabled = characterPageIndex >= pageCount - 1;
  }
  if (pageText) {
    pageText.textContent = `${characterPageIndex + 1} / ${pageCount}`;
  }
}

function setCharacterPage(nextPageIndex) {
  const pageCount = getCharacterPageCount();
  characterPageIndex = Math.min(pageCount - 1, Math.max(0, nextPageIndex));
  renderCharacterCards();
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
  if (character.fanSkillImageSrc) {
    wdSkillImage.src = character.fanSkillImageSrc;
  }

  const characterIndex = getCharacterList().findIndex((item) => item.id === character.id);
  if (characterIndex >= 0) {
    const nextPageIndex = Math.floor(characterIndex / characterPageSize);
    if (nextPageIndex !== characterPageIndex) {
      characterPageIndex = nextPageIndex;
      renderCharacterCards();
    }
  }
  updateCharacterCardsActive();
  updateCharacterPreview();
  updateSecretProgressBar();
}

function updateCharacterSelectState() {
  const locked = state.started && state.running;
  const characterSelect = document.getElementById("characterSelect");
  const entryActive = !document.getElementById("entryPrompt")?.classList.contains("is-hidden");
  const canChooseCharacter =
    !state.started ||
    (state.started && !state.running && state.scoreSubmitted && !state.settlementVisible);
  const visible = !locked && !entryActive && !state.deathReviewActive && canChooseCharacter;
  characterSelect?.classList.toggle("is-active", visible);
  characterSelect?.setAttribute("aria-hidden", visible ? "false" : "true");
  document.querySelectorAll(".character-card").forEach((card) => {
    card.disabled = locked;
  });
  const startButton = document.getElementById("characterStartButton");
  if (startButton) {
    startButton.disabled = locked;
    startButton.textContent = "进入游戏";
  }
}

function returnToEntryPrompt() {
  if (state.started && state.running) {
    return;
  }
  document.getElementById("entryPrompt")?.classList.remove("is-hidden");
  updateCharacterSelectState();
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
  if (state.started && !state.running && !state.deathReviewActive) {
    releaseGamePageLock();
  }
  if (typeof leaderboardTrackGameOver === "function") {
    leaderboardTrackGameOver();
  }
  draw();
  if (typeof drawCharacterPreview === "function") {
    drawCharacterPreview();
  }
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
  if (!state.running && state.deathReviewActive) {
    e.preventDefault();
    if (e.repeat) {
      return;
    }
    dismissDeathReview();
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
  const active = Boolean(event.data.active);
  document.body.classList.toggle("parent-fullscreen-mode", active);
  if (active) {
    setMobileControlsEnabled(true);
  }
});

canvas.addEventListener("pointerdown", () => {
  if (state.started && !state.running && state.deathReviewActive) {
    dismissDeathReview();
    return;
  }
  if (state.started && !state.running) {
    updateCharacterSelectState();
    return;
  }
  if (!state.started) {
    updateCharacterSelectState();
  }
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
  setMobileControlsEnabled(!state.mobileControls);
});

document.getElementById("entryFullscreenButton")?.addEventListener("click", (event) => {
  event.preventDefault();
  window.parent?.postMessage({ type: "stickman:request-fullscreen" }, window.location.origin);
  enterCharacterSelectPage();
});

document.getElementById("entryIgnoreButton")?.addEventListener("click", (event) => {
  event.preventDefault();
  enterCharacterSelectPage();
});

document.getElementById("exitMobileButton")?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  event.stopPropagation();
  setMobileControlsEnabled(false);
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

document.getElementById("characterOptions")?.addEventListener("click", (event) => {
  const target = event.target;
  const card = target instanceof Element ? target.closest(".character-card") : null;
  if (!card) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  setCharacter(card.getAttribute("data-character-id") || "lsj");
});

document.getElementById("characterPrevPageButton")?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  setCharacterPage(characterPageIndex - 1);
});

document.getElementById("characterNextPageButton")?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  setCharacterPage(characterPageIndex + 1);
});

document.getElementById("characterBackButton")?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  returnToEntryPrompt();
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

wdSkillImage.addEventListener("error", () => {
  wdSkillImage.src = "";
});

renderCharacterCards();
setCharacter(state.characterId);
state.nextSceneIndex = pickNextSceneIndex(state.sceneIndex);
updateScore();
updatePauseButton();
updateDebugDistanceButton();
updateMobileControlsButton();
updateSecretProgressBar();
updateCharacterSelectState();
requestAnimationFrame(loop);
