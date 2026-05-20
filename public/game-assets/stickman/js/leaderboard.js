const leaderboardListEl = document.getElementById("leaderboardList");
const leaderboardStatusEl = document.getElementById("leaderboardStatus");
const playerNameEl = document.getElementById("playerName");
const settlementOverlayEl = document.getElementById("settlementOverlay");
const settlementScoreEl = document.getElementById("settlementScore");
const settlementMessageEl = document.getElementById("settlementMessage");
const settlementFormEl = document.getElementById("settlementForm");
const settlementNameInputEl = document.getElementById("settlementNameInput");
const settlementSubmitButtonEl = document.getElementById("settlementSubmitButton");
const settlementRestartButtonEl = document.getElementById("settlementRestartButton");
const leaderboardNameKey = "stickman_runner_player_name_v1";
const leaderboardApi = "/api/stickman-leaderboard";

let leaderboardSubmittedForRun = false;
let leaderboardEntries = [];
let pendingSettlementScore = 0;

function sanitizePlayerName(name) {
  const cleaned = String(name || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 16);
  return cleaned || "路过的玩家";
}

function getPlayerName() {
  const storedName = localStorage.getItem(leaderboardNameKey) || "";
  const name = sanitizePlayerName(settlementNameInputEl?.value || playerNameEl?.value || storedName);
  if (playerNameEl) {
    playerNameEl.value = name;
  }
  if (settlementNameInputEl) {
    settlementNameInputEl.value = name;
  }
  localStorage.setItem(leaderboardNameKey, name);
  return name;
}

function setLeaderboardStatus(text) {
  if (leaderboardStatusEl) {
    leaderboardStatusEl.textContent = text || "";
  }
}

function renderLeaderboard(entries) {
  const topEntries = (entries || []).slice(0, 10);
  leaderboardEntries = topEntries;
  state.leaderboardTopScore = Math.max(0, Math.floor(Number(topEntries[0]?.score || 0)));
  if (typeof updateScore === "function") {
    updateScore();
  }
  window.parent?.postMessage(
    { type: "stickman:leaderboard", entries: topEntries },
    window.location.origin
  );
  if (!leaderboardListEl) {
    return;
  }
  if (topEntries.length === 0) {
    leaderboardListEl.innerHTML = '<li class="leaderboard-empty">还没有分数，来拿第一个第一名。</li>';
    return;
  }
  leaderboardListEl.innerHTML = topEntries
    .map((entry, index) => {
      const name = sanitizePlayerName(entry.name);
      const score = Number(entry.score || 0).toLocaleString();
      return `<li><span class="leaderboard-row"><span class="leaderboard-rank">${index + 1}</span><span class="leaderboard-name">${name}</span><span class="leaderboard-score">${score}</span></span></li>`;
    })
    .join("");
}

function getTenthScore() {
  if (leaderboardEntries.length < 10) {
    return 0;
  }
  return Math.floor(Number(leaderboardEntries[9]?.score || 0));
}

function getRankForScore(score, entries = leaderboardEntries) {
  const finalScore = Math.floor(Number(score || 0));
  return (entries || []).filter((entry) => Number(entry.score || 0) > finalScore).length + 1;
}

function setSettlementVisible(visible) {
  if (!settlementOverlayEl) {
    return;
  }
  settlementOverlayEl.classList.toggle("is-active", visible);
  settlementOverlayEl.setAttribute("aria-hidden", visible ? "false" : "true");
}

function setSettlementMessage(text) {
  if (settlementMessageEl) {
    settlementMessageEl.textContent = text || "";
  }
}

function setSettlementFormVisible(visible) {
  settlementFormEl?.classList.toggle("is-active", visible);
}

function showSettlement(score) {
  const finalScore = Math.floor(Number(score || 0));
  pendingSettlementScore = finalScore;
  if (settlementScoreEl) {
    settlementScoreEl.textContent = `您的得分为 ${finalScore.toLocaleString()}`;
  }

  const tenthScore = getTenthScore();
  const canRank = finalScore > 0 && (leaderboardEntries.length < 10 || finalScore > tenthScore);
  if (canRank) {
    const rank = getRankForScore(finalScore);
    setSettlementMessage(`您已进入排行榜，请输入名称。提交后预计位于第 ${rank} 名！`);
    setSettlementFormVisible(true);
    if (settlementNameInputEl) {
      settlementNameInputEl.value = sanitizePlayerName(localStorage.getItem(leaderboardNameKey) || "");
      window.setTimeout(() => settlementNameInputEl.focus(), 0);
    }
  } else {
    const diff = Math.max(1, tenthScore - finalScore);
    setSettlementMessage(`再接再厉，离第10名还差 ${diff.toLocaleString()} 分。`);
    setSettlementFormVisible(false);
  }
  setSettlementVisible(true);
}

function hideSettlement() {
  setSettlementVisible(false);
  pendingSettlementScore = 0;
  if (settlementSubmitButtonEl) {
    settlementSubmitButtonEl.disabled = false;
  }
  setSettlementFormVisible(false);
}

async function loadLeaderboard() {
  try {
    const response = await fetch(leaderboardApi, { headers: { accept: "application/json" } });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    renderLeaderboard(data.entries || []);
    setLeaderboardStatus("");
  } catch (_error) {
    renderLeaderboard([]);
    setLeaderboardStatus("排行榜服务暂不可用，分数会先保存在本机。");
  }
}

async function submitLeaderboardScore(score) {
  const finalScore = Math.floor(Number(score || 0));
  if (finalScore <= 0) {
    return null;
  }
  setLeaderboardStatus("正在提交分数...");
  if (settlementSubmitButtonEl) {
    settlementSubmitButtonEl.disabled = true;
  }
  try {
    const name = getPlayerName();
    const response = await fetch(leaderboardApi, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        name,
        score: finalScore,
      }),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    const entries = data.entries || [];
    renderLeaderboard(entries);
    setLeaderboardStatus("分数已提交。");
    const rank = getRankForScore(finalScore, entries);
    setSettlementMessage(`${name}，您现在位于第 ${rank} 名！`);
    setSettlementFormVisible(false);
    return entries;
  } catch (_error) {
    setLeaderboardStatus("提交失败：排行榜服务暂未配置或不可用。");
    setSettlementMessage("提交失败，排行榜服务暂时不可用，请稍后再试。");
    return null;
  } finally {
    if (settlementSubmitButtonEl) {
      settlementSubmitButtonEl.disabled = false;
    }
  }
}

function leaderboardResetRun() {
  leaderboardSubmittedForRun = false;
  hideSettlement();
}

function leaderboardTrackGameOver() {
  if (!state.started || state.running || leaderboardSubmittedForRun || state.scoreSubmitted) {
    return;
  }
  leaderboardSubmittedForRun = true;
  state.scoreSubmitted = true;
  showSettlement(state.score);
}

if (playerNameEl) {
  playerNameEl.value = sanitizePlayerName(localStorage.getItem(leaderboardNameKey) || "");
  playerNameEl.addEventListener("change", () => {
    localStorage.setItem(leaderboardNameKey, sanitizePlayerName(playerNameEl.value));
  });
}

if (settlementNameInputEl) {
  settlementNameInputEl.value = sanitizePlayerName(localStorage.getItem(leaderboardNameKey) || "");
  settlementNameInputEl.addEventListener("input", () => {
    localStorage.setItem(leaderboardNameKey, sanitizePlayerName(settlementNameInputEl.value));
  });
}

settlementFormEl?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (pendingSettlementScore <= 0) {
    return;
  }
  submitLeaderboardScore(pendingSettlementScore);
});

settlementRestartButtonEl?.addEventListener("click", () => {
  hideSettlement();
  if (typeof updateCharacterSelectState === "function") {
    updateCharacterSelectState();
  }
});

settlementOverlayEl?.addEventListener("pointerdown", (event) => {
  event.stopPropagation();
});

loadLeaderboard();
