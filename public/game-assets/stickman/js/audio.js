let losePlayed = false; // 防止一帧内多次触发
function playLoseAudio() {
  if (losePlayed) return;
  losePlayed = true;

  try {
    loseAudio.currentTime = 0;
    loseAudio.play().catch(() => {});
  } catch (e) {
    console.warn("失败音效播放失败:", e);
  }
}
function playStartSound() {
  try {
    startAudio.currentTime = 0; // 每次从头播放
    startAudio.play();
  } catch (e) {
    console.warn("启动音效播放失败:", e);
  }
}
function playShieldAudio() {
  try {
    shieldAudio.currentTime = 0; // 防止重复播放卡住
    shieldAudio.play().catch(() => {});
  } catch (e) {
    console.warn("护盾音效播放失败:", e);
  }
}

function ensureAudio() {
  if (audioCtx) {
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) {
    return;
  }
  audioCtx = new AC();
}

function unlockAudio() {
  ensureAudio();
  if (!audioCtx || audioUnlocked) {
    return;
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  audioUnlocked = true;
}

function playTone(freq, durationMs, type = "sine", volume = 0.08, slideTo = null) {
  if (!audioCtx || !audioUnlocked) {
    return;
  }
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (slideTo) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + durationMs / 1000);
  }
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + durationMs / 1000 + 0.02);
}

function playJumpSound(doubleJump) {
  if (doubleJump) {
    playTone(430, 120, "triangle", 0.09, 700);
  } else {
    playTone(300, 130, "triangle", 0.08, 470);
  }
}

function playShieldPickupSound() {
  playTone(520, 90, "sine", 0.06, 700);
  setTimeout(() => playTone(760, 120, "sine", 0.07, 940), 45);
}

function playShieldBreakSound() {
  playTone(280, 120, "square", 0.06, 220);
  setTimeout(() => playTone(190, 140, "triangle", 0.06, 140), 35);
}

function playGameOverSound() {
  playTone(260, 180, "sawtooth", 0.07, 180);
  setTimeout(() => playTone(180, 240, "sawtooth", 0.07, 90), 85);
}

function playCoinSound() {
  playTone(640, 70, "square", 0.05, 840);
  setTimeout(() => playTone(980, 90, "triangle", 0.06, 1220), 40);
}

function playCannonWarningSound() {
  try {
    alarmAudio.currentTime = 0;
    alarmAudio.play().catch(() => {});
  } catch (e) {
    console.warn("炮弹预警音播放失败:", e);
  }
}

function playDreamAudio() {
  try {
    dreamAudio.currentTime = 0;
    dreamAudio.play().catch(() => {});
  } catch (e) {
    console.warn("秘境音效播放失败:", e);
  }
}
