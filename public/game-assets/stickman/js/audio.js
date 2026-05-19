let losePlayed = false; // 防止一帧内多次触发
function getCharacterAudioSrc(fileName) {
  const character = getCurrentCharacterConfig();
  return character.assetBase ? `${character.assetBase}/${fileName}` : "";
}

function getCharacterAudioSources(baseName, fallbackSrc) {
  return [
    getCharacterAudioSrc(`${baseName}.m4a`),
    getCharacterAudioSrc(`${baseName}.mp3`),
    fallbackSrc
  ];
}

function playAudioWithFallback(sources, volume, label) {
  const queue = sources.filter(Boolean);

  function tryPlay(index) {
    if (index >= queue.length) {
      return;
    }
    const audio = new Audio(queue[index]);
    audio.preload = "auto";
    audio.volume = volume;
    audio.addEventListener("error", () => tryPlay(index + 1), { once: true });
    audio.currentTime = 0;
    audio.play().catch(() => tryPlay(index + 1));
  }

  try {
    tryPlay(0);
  } catch (e) {
    console.warn(`${label}播放失败:`, e);
  }
}

function playLoseAudio() {
  if (losePlayed) return;
  losePlayed = true;

  playAudioWithFallback(getCharacterAudioSources("die", "audio/lose.mp3"), 0.7, "失败音效");
}
function playStartSound() {
  playAudioWithFallback(getCharacterAudioSources("begin", "audio/begin.m4a"), 0.6, "启动音效");
}
function playShieldAudio() {
  playAudioWithFallback(getCharacterAudioSources("protect", "audio/protect.m4a"), 0.7, "护盾音效");
}
function playSkillAudio() {
  playAudioWithFallback(getCharacterAudioSources("skill", "audio/protect.m4a"), 0.7, "技能音效");
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
