let teams = [];
let selectedTeamA = null;
let selectedTeamB = null;
let searchTerm = "";
let favoriteTeamIds = JSON.parse(
  localStorage.getItem("favoriteTeamIds") || "[]",
);

async function loadTeams() {
  try {
    const response = await fetch("./data.json");
    if (!response.ok) throw new Error("Could not load team data.");

    const data = await response.json();
    const regions = data.ncaa_d1_basketball_stats?.conference || [];

    teams = regions.flatMap((region) =>
      (region.team || []).map((team) => ({
        id: makeId(team.name),
        name: team.name || "Unknown Team",
        region: region._name || "Unknown",
        conference: team.conference || team._conference || "Unknown",
        ppg: toNumber(team.ppg),
        rpg: toNumber(team.rpg),
        apg: toNumber(team.apg),
        bpg: toNumber(team.bpg),
        spg: toNumber(team.spg),
        plus_minus: toNumber(team.plus_minus),
        fg_pct: toNumber(team.fg_pct),
        three_pt_pct: toNumber(team.three_pt_pct),
        ft_pct: toNumber(team.ft_pct),
        ts_pct: toNumber(team.ts_pct),
        offstat: toNumber(team.offstat),
        defstat: toNumber(team.defstat),
        image: team.image || "",
      })),
    );

    renderTeams();
  } catch (error) {
    console.error(error);
    document.getElementById("teamGrid").innerHTML = `
      <div class="card">
        <div class="panel-title">Data could not be loaded</div>
        <div class="muted">Make sure your file is named data.json and you are using Live Server.</div>
      </div>
    `;
  }
}

function toNumber(value) {
  return Number(String(value || "0").replace("+", ""));
}

function makeId(name) {
  return String(name || "")
    .toLowerCase()
    .replaceAll("&", "and")
    .replaceAll("(", "")
    .replaceAll(")", "")
    .replaceAll(".", "")
    .replaceAll(" ", "-");
}

function saveFavorites() {
  localStorage.setItem("favoriteTeamIds", JSON.stringify(favoriteTeamIds));
}

function isFavorite(teamId) {
  return favoriteTeamIds.includes(teamId);
}

function toggleFavorite(teamId) {
  if (isFavorite(teamId)) {
    favoriteTeamIds = favoriteTeamIds.filter((id) => id !== teamId);
  } else {
    favoriteTeamIds.push(teamId);
  }
  saveFavorites();
  renderTeams();
}

// Offense rating uses offstat from data.json directly
function offenseRating(team) {
  return Math.round(team.offstat || 0);
}

// Defense rating uses defstat from data.json directly
function defenseRating(team) {
  return Math.round(team.defstat || 0);
}

// Control = blend of assists, steals, and free throw % — measures ball control
function controlRating(team) {
  return Math.round(team.apg * 1.5 - team.spg * 0.2 + team.ft_pct * 0.2 + 35);
}

// Shooting = weighted blend of FG%, 3P%, and TS%
function shootingRating(team) {
  return Math.round(team.fg_pct * 0.6 + team.three_pt_pct * 0.7 + team.ts_pct * 0.3);
}

// Tempo = PPG used as a pace proxy (more points = faster pace)
// The JSON has no raw possession count, so PPG is the best available estimate
function tempoRating(team) {
  return Math.min(100, team.ppg);
}

function updateMatchupBar() {
  const matchupBar   = document.getElementById("matchupBar");
  const matchupTeamA = document.getElementById("matchupTeamA");
  const matchupTeamB = document.getElementById("matchupTeamB");
  const matchupSub   = document.getElementById("matchupSub");
  const analyzeBtn   = document.getElementById("analyzeBtn");

  if (selectedTeamA || selectedTeamB) {
    matchupBar.classList.remove("hidden");
    matchupTeamA.textContent = selectedTeamA ? selectedTeamA.name : "Select Team";
    matchupTeamB.textContent = selectedTeamB ? selectedTeamB.name : "Select Team";

    if (selectedTeamA && selectedTeamB) {
      matchupSub.textContent = "Ready for analysis";
      analyzeBtn.disabled = false;
    } else {
      matchupSub.textContent = "Select another team";
      analyzeBtn.disabled = true;
    }
  } else {
    matchupBar.classList.add("hidden");
    analyzeBtn.disabled = true;
  }
}

function getFilteredTeams() {
  const normalized = searchTerm.trim().toLowerCase();
  let filtered = teams;

  if (normalized) {
    filtered = teams.filter((team) =>
      team.name.toLowerCase().includes(normalized) ||
      team.conference.toLowerCase().includes(normalized) ||
      team.region.toLowerCase().includes(normalized),
    );
  }

  return [...filtered].sort((a, b) => {
    const aFav = isFavorite(a.id) ? 1 : 0;
    const bFav = isFavorite(b.id) ? 1 : 0;
    if (bFav !== aFav) return bFav - aFav;
    return a.name.localeCompare(b.name);
  });
}

function renderTeams() {
  const grid = document.getElementById("teamGrid");
  const filteredTeams = getFilteredTeams();
  grid.innerHTML = "";

  if (filteredTeams.length === 0) {
    grid.innerHTML = `
      <div class="card">
        <div class="panel-title">No teams found</div>
        <div class="muted">Try another search.</div>
      </div>
    `;
    updateMatchupBar();
    return;
  }

  filteredTeams.forEach((team) => {
    const isSelectedA = selectedTeamA && selectedTeamA.id === team.id;
    const isSelectedB = selectedTeamB && selectedTeamB.id === team.id;
    const isSelected  = isSelectedA || isSelectedB;

    const slotLabel = isSelectedA
      ? "Team A Selected"
      : isSelectedB
        ? "Team B Selected"
        : "Select Team";

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="team-color"></div>
      <div class="team-header">
        <div>
          <div class="team-name">${team.name}</div>
          <div class="team-conf">${team.conference} • ${team.region}</div>
        </div>
        <button class="favorite-btn" aria-label="Toggle favorite">
          ${isFavorite(team.id) ? "★" : "☆"}
        </button>
      </div>
      <div class="stats">
        <div class="stat-box">
          <div class="stat-label">Offense</div>
          <div class="stat-value">${offenseRating(team)}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Defense</div>
          <div class="stat-value">${defenseRating(team)}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">PPG</div>
          <div class="stat-value">${team.ppg}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">3P%</div>
          <div class="stat-value">${team.three_pt_pct}%</div>
        </div>
      </div>
      <button class="select-btn ${isSelected ? "selected" : ""}">
        ${slotLabel}
      </button>
    `;

    card.querySelector(".select-btn").onclick = () => selectTeam(team);
    card.querySelector(".favorite-btn").onclick = (e) => {
      e.stopPropagation();
      toggleFavorite(team.id);
    };

    grid.appendChild(card);
  });

  updateMatchupBar();
}

function selectTeam(team) {
  if (selectedTeamA && selectedTeamA.id === team.id) { selectedTeamA = null; renderTeams(); return; }
  if (selectedTeamB && selectedTeamB.id === team.id) { selectedTeamB = null; renderTeams(); return; }
  if (!selectedTeamA) { selectedTeamA = team; renderTeams(); return; }
  if (!selectedTeamB) { selectedTeamB = team; renderTeams(); return; }
  selectedTeamA = team;
  selectedTeamB = null;
  renderTeams();
}

// ==================================================
// TEAM COMPARER — by Valentino Simeonidis (759743)
// Powers the win probability, power ratings,
// matchup breakdown, and competitive focus tips
// ==================================================

function num(val) { return parseFloat(val) || 0; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function normalize(value, min, max) { return clamp(((value - min) / (max - min)) * 100, 0, 100); }
function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }

function balanceScore(team) {
  const stats = [team.n_fg, team.n_three, team.n_ft, team.n_apg, team.n_rpg, team.n_spg, team.n_bpg];
  const avg = stats.reduce((a, b) => a + b, 0) / stats.length;
  const variance = stats.reduce((a, val) => a + Math.pow(val - avg, 2), 0) / stats.length;
  return 100 - Math.sqrt(variance);
}

function normalizeTeam(t) {
  const fg    = num(t.fg_pct);
  const three = num(t.three_pt_pct);
  const ft    = num(t.ft_pct);
  const ppg   = num(t.ppg);
  const apg   = num(t.apg);
  const rpg   = num(t.rpg);
  const spg   = num(t.spg);
  const bpg   = num(t.bpg);

  const n_fg    = normalize(fg,    40, 55);
  const n_three = normalize(three, 28, 42);
  const n_ft    = normalize(ft,    60, 90);
  const n_ppg   = normalize(ppg,   90, 125);
  const n_apg   = normalize(apg,   15, 35);
  const n_rpg   = normalize(rpg,   35, 55);
  const n_spg   = normalize(spg,    4, 12);
  const n_bpg   = normalize(bpg,    2,  8);

  const offense     = n_fg * 0.30 + n_three * 0.23 + n_apg * 0.22 + n_ppg * 0.15 + n_ft * 0.10;
  const defense     = n_rpg * 0.42 + n_spg * 0.36 + n_bpg * 0.22;
  const consistency = n_ft * 0.35 + n_apg * 0.30 + defense * 0.35;
  const balance     = balanceScore({ n_fg, n_three, n_ft, n_apg, n_rpg, n_spg, n_bpg });
  const power       = offense * 0.56 + defense * 0.30 + consistency * 0.08 + balance * 0.06;

  return { name: t.name, fg, three, ft, ppg, apg, rpg, spg, bpg, n_fg, n_three, n_ft, n_ppg, n_apg, n_rpg, n_spg, n_bpg, offense, defense, consistency, balance, power };
}

function matchupEdge(a, b, stat, label) {
  const diff = a[stat] - b[stat];
  const abs  = Math.abs(diff);
  if (abs < 4)  return { label, edge: "Even",     winner: null };
  if (abs < 10) return { label, edge: "Slight",   winner: diff > 0 ? a.name : b.name };
  if (abs < 18) return { label, edge: "Moderate", winner: diff > 0 ? a.name : b.name };
  return             { label, edge: "Strong",    winner: diff > 0 ? a.name : b.name };
}

// FIX: takes the team being analysed (subject) and their opponent separately
// so tips are always relative to that specific team's weaknesses vs this opponent
function aiRecommendations(subject, opponent) {
  const strategies = [
    {
      gap: opponent.n_fg - subject.n_fg,
      text: `${subject.name} should improve shot selection because ${opponent.name} has the scoring efficiency advantage.`
    },
    {
      gap: opponent.n_three - subject.n_three,
      text: `${subject.name} needs tighter perimeter defense because ${opponent.name} shoots better from three.`
    },
    {
      gap: opponent.n_apg - subject.n_apg,
      text: `${subject.name} should increase ball movement to match ${opponent.name}'s playmaking ability.`
    },
    {
      gap: opponent.n_rpg - subject.n_rpg,
      text: `${subject.name} must rebound harder to stop ${opponent.name} from controlling second-chance opportunities.`
    },
    {
      gap: opponent.n_spg - subject.n_spg,
      text: `${subject.name} should protect the ball better because ${opponent.name} creates more defensive pressure.`
    },
    {
      gap: opponent.n_bpg - subject.n_bpg,
      text: `${subject.name} should avoid forcing drives inside because ${opponent.name} protects the rim better.`
    },
    {
      gap: 45 - subject.n_ft,
      text: `${subject.name} should improve free throw consistency for late-game situations.`
    }
  ];

  let tips = strategies
    .filter(item => item.gap > 3)
    .sort((a, b) => b.gap - a.gap)
    .map(item => item.text);

  const backupTips = [
    `${subject.name} should control the pace and avoid letting ${opponent.name} speed the game up.`,
    `${subject.name} should focus on transition defense and communication.`,
    `${subject.name} should minimize turnovers and force ${opponent.name} into half-court offense.`
  ];

  while (tips.length < 3) {
    tips.push(backupTips[tips.length % backupTips.length]);
  }

  return tips.slice(0, 3);
}
function runComparerAnalysis(a, b) {
  // Normalize both teams using Valentino's algorithm
  const A = normalizeTeam(a);
  const B = normalizeTeam(b);

  let differential = A.power - B.power;
  differential += (A.offense - B.defense) * 0.14;
  differential -= (B.offense - A.defense) * 0.14;
  differential += (A.n_apg - B.n_apg) * 0.035;
  differential += (A.n_ft  - B.n_ft)  * 0.025;
  differential += (A.n_rpg - B.n_rpg) * 0.03;
  differential += (A.n_spg - B.n_spg) * 0.025;
  differential += (A.balance - B.balance) * 0.02;

  if (Math.abs(differential) < 5) differential *= 0.82;
  differential = clamp(differential, -16, 16);

  let winA = sigmoid(differential / 6.8) * 100;
  winA = clamp(winA, 14, 86);
  const winB = 100 - winA;

  const winner     = winA > winB ? A.name : B.name;
  const spread     = Math.abs(winA - winB);
  const confidence = spread < 10 ? "Low" : spread < 22 ? "Medium" : "High";

  const report = [
    matchupEdge(A, B, "n_fg",    "Shooting"),
    matchupEdge(A, B, "n_three", "3PT Shooting"),
    matchupEdge(A, B, "n_apg",   "Playmaking"),
    matchupEdge(A, B, "n_rpg",   "Rebounding"),
    matchupEdge(A, B, "n_spg",   "Defense"),
    matchupEdge(A, B, "n_bpg",   "Rim Protection"),
  ];

  // FIX: A's tips = A vs B, B's tips = B vs A — keeps them distinct
  const recA = aiRecommendations(A, B);
  const recB = aiRecommendations(B, A);

  return { A, B, winA, winB, winner, confidence, report, recA, recB };
}

// ==================================================
// RADAR CHART WITH HOVER TOOLTIPS
// ==================================================

function radarPoints(values, cx, cy, radius) {
  return values.map((value, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / values.length;
    const r     = radius * (Math.max(0, Math.min(100, value)) / 100);
    return `${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`;
  }).join(" ");
}

function renderRadar(a, b) {
  const CA = "#3b82f6";
  const CB = "#14b8a6";

  const aValues = [
    offenseRating(a),
    defenseRating(a),
    shootingRating(a),
    Math.min(100, a.rpg * 2),
    Math.min(100, controlRating(a)),
    Math.min(100, tempoRating(a)),  // PPG-based tempo proxy
  ];

  const bValues = [
    offenseRating(b),
    defenseRating(b),
    shootingRating(b),
    Math.min(100, b.rpg * 2),
    Math.min(100, controlRating(b)),
    Math.min(100, tempoRating(b)),  // PPG-based tempo proxy
  ];

  const statLabels = ["Offense", "Defense", "Shooting", "Rebounding", "Control", "Tempo"];
  const labelPos   = [[200, 18], [342, 95], [342, 252], [200, 328], [55, 252], [55, 95]];
  const cx = 200, cy = 170, radius = 120;

  const buildDots = (values, teamName, color) =>
    values.map((value, i) => {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / 6;
      const r     = radius * (Math.max(0, Math.min(100, value)) / 100);
      return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r, label: statLabels[i], value: Math.round(value), team: teamName, color };
    });

  const allDots = [...buildDots(aValues, a.name, CA), ...buildDots(bValues, b.name, CB)];
  const dotsSVG = allDots.map((d, idx) =>
    `<circle class="radar-dot" cx="${d.x}" cy="${d.y}" r="6" fill="${d.color}" stroke="rgba(2,6,23,0.8)" stroke-width="2" data-idx="${idx}" style="cursor:pointer;"/>`
  ).join("");

  return `
    <div class="card pro-card" style="margin-top:22px;">
      <div class="radar-header">
        <div class="panel-title" style="margin-bottom:0;">Skill Profile</div>
        <div class="radar-legend">
          <span class="radar-legend-dot" style="background:${CA}"></span><span>${a.name}</span>
          <span class="radar-legend-dot" style="background:${CB};margin-left:12px;"></span><span>${b.name}</span>
        </div>
      </div>
      <div class="radar-wrap" style="position:relative;">
        <svg id="radarSvg" width="400" height="340" viewBox="0 0 400 340"
          data-dots='${JSON.stringify(allDots).replace(/'/g, "&apos;")}'>
          <polygon points="200,50 312,110 312,230 200,290 88,230 88,110"    fill="none" stroke="#1e293b"/>
          <polygon points="200,90 276,130 276,210 200,250 124,210 124,130"  fill="none" stroke="#1e293b"/>
          <polygon points="200,130 240,150 240,190 200,210 160,190 160,150" fill="none" stroke="#1e293b"/>
          <polygon points="${radarPoints(aValues, cx, cy, radius)}" fill="${CA}28" stroke="${CA}" stroke-width="2"/>
          <polygon points="${radarPoints(bValues, cx, cy, radius)}" fill="${CB}28" stroke="${CB}" stroke-width="2"/>
          ${dotsSVG}
          ${labelPos.map(([x, y], i) => `<text x="${x}" y="${y}" text-anchor="middle">${statLabels[i]}</text>`).join("")}
        </svg>
        <div id="radarTooltip" class="radar-tooltip hidden"></div>
      </div>
    </div>
  `;
}

function attachRadarTooltip() {
  const svg = document.getElementById("radarSvg");
  if (!svg) return;
  const tooltip  = document.getElementById("radarTooltip");
  const dotsData = JSON.parse(svg.dataset.dots);

  svg.querySelectorAll(".radar-dot").forEach((dot) => {
    const d = dotsData[parseInt(dot.dataset.idx)];
    dot.addEventListener("mouseenter", (e) => {
      tooltip.innerHTML = `<span style="color:${d.color};font-weight:900;">${d.team}</span><br>${d.label}: <strong>${d.value}</strong>`;
      tooltip.classList.remove("hidden");
      positionTooltip(e, tooltip);
    });
    dot.addEventListener("mousemove",  (e) => positionTooltip(e, tooltip));
    dot.addEventListener("mouseleave", ()  => tooltip.classList.add("hidden"));
  });
}

function positionTooltip(e, tooltip) {
  const rect = tooltip.parentElement.getBoundingClientRect();
  let x = e.clientX - rect.left + 14;
  let y = e.clientY - rect.top  - 42;
  if (x + 150 > rect.width) x = e.clientX - rect.left - 155;
  if (y < 0)                 y = e.clientY - rect.top  + 14;
  tooltip.style.left = x + "px";
  tooltip.style.top  = y + "px";
}

// ==================================================
// FOCUS TAB SWITCHER
// FIX: querySelector inside the card so IDs are
// always found even after re-renders
// ==================================================

function switchFocusTab(tab) {
  const panelA = document.getElementById("focusPanelA");
  const panelB = document.getElementById("focusPanelB");
  const btnA   = document.getElementById("focusBtnA");
  const btnB   = document.getElementById("focusBtnB");

  // Guard: if elements don't exist yet, do nothing
  if (!panelA || !panelB || !btnA || !btnB) return;

  const showA = tab === "A";

  panelA.classList.toggle("hidden", !showA);
  panelB.classList.toggle("hidden",  showA);
  btnA.classList.toggle("tab-active",  showA);
  btnB.classList.toggle("tab-active", !showA);
}

// ==================================================
// EDGE BADGE
// ==================================================

function edgeBadge(edge, winner, nameA, CA, CB) {
  if (edge === "Even") return `<span class="edge-badge edge-even">Even</span>`;
  const color = winner === nameA ? CA : CB;
  return `<span class="edge-badge" style="background:${color}20;color:${color};border-color:${color}44;">${edge} — ${winner}</span>`;
}

// ==================================================
// RENDER COMPARISON
// ==================================================

function renderComparison() {
  const container = document.getElementById("comparisonContent");

  if (!selectedTeamA || !selectedTeamB) {
    container.innerHTML = `
      <div class="card">
        <div class="panel-title">No matchup selected</div>
        <div class="muted">Select two teams from the dashboard first.</div>
      </div>
    `;
    return;
  }

  const a  = selectedTeamA;
  const b  = selectedTeamB;
  const CA = "#3b82f6";
  const CB = "#14b8a6";
  const ai = runComparerAnalysis(a, b);

  const bars = [
    ["PPG", a.ppg,          b.ppg,          100],
    ["FG%", a.fg_pct,       b.fg_pct,       100],
    ["3P%", a.three_pt_pct, b.three_pt_pct, 100],
    ["REB", a.rpg,          b.rpg,          60],
    ["APG", a.apg,          b.apg,          30],
    ["TS%", a.ts_pct,       b.ts_pct,       100],
  ];

  // Build focus tip HTML separately so we can verify they differ
  const focusA = ai.recA.map(r => `<div class="focus-item" style="border-left-color:${CA};">${r}</div>`).join("");
  const focusB = ai.recB.map(r => `<div class="focus-item" style="border-left-color:${CB};">${r}</div>`).join("");

  container.innerHTML = `

    <!-- HERO -->
    <div class="matchup-hero">
      <div class="matchup-team-card" style="border-top:3px solid ${CA};">
        <div class="eyebrow" style="color:${CA};">Team A</div>
        <div class="team-name">${a.name}</div>
        <div class="team-conf">${a.conference} • ${a.region}</div>
        <div class="hero-stats">
          <div><span>Offense</span><strong style="color:${CA};">${offenseRating(a)}</strong></div>
          <div><span>Defense</span><strong style="color:${CA};">${defenseRating(a)}</strong></div>
        </div>
      </div>

      <div class="matchup-center">
        <div class="vs-pill">VS</div>
        <div class="muted small">AI-powered matchup analysis</div>
      </div>

      <div class="matchup-team-card opponent" style="border-top:3px solid ${CB};">
        <div class="eyebrow" style="color:${CB};">Team B</div>
        <div class="team-name">${b.name}</div>
        <div class="team-conf">${b.conference} • ${b.region}</div>
        <div class="hero-stats">
          <div><span>Offense</span><strong style="color:${CB};">${offenseRating(b)}</strong></div>
          <div><span>Defense</span><strong style="color:${CB};">${defenseRating(b)}</strong></div>
        </div>
      </div>
    </div>

    <!-- MAIN GRID -->
    <div class="comparison-layout">

      <!-- LEFT: stat bars + radar -->
      <div>
        <div class="card pro-card">
          <div class="panel-title">Statistical Profile</div>
          <div class="bar-legend">
            <span class="bar-legend-dot" style="background:${CA}"></span><span>${a.name}</span>
            <span class="bar-legend-dot" style="background:${CB};margin-left:14px;"></span><span>${b.name}</span>
          </div>
          ${bars.map(([label, av, bv, max]) => `
            <div class="pro-row">
              <div class="pro-row-top">
                <span>${label}</span>
                <span>
                  <span style="color:${CA};font-weight:700;">${av}</span>
                  &nbsp;/&nbsp;
                  <span style="color:${CB};font-weight:700;">${bv}</span>
                </span>
              </div>
              <div class="pro-bars">
                <div class="pro-bar" style="background:rgba(59,130,246,0.1);">
                  <div style="width:${Math.min(100,(av/max)*100)}%;background:${CA};"></div>
                </div>
                <div class="pro-bar" style="background:rgba(20,184,166,0.1);">
                  <div style="width:${Math.min(100,(bv/max)*100)}%;background:${CB};"></div>
                </div>
              </div>
            </div>
          `).join("")}
        </div>

        ${renderRadar(a, b)}
      </div>

      <!-- RIGHT: AI analysis -->
      <div>
        <div class="card pro-card">

          <!-- PREDICTED WINNER -->
          <div class="panel-title">Predicted Winner</div>
          <div class="win-block">
            <div class="win-trophy">🏆 <strong>${ai.winner}</strong></div>
            <div class="win-conf-row">
              Confidence:
              <span class="conf-pill conf-${ai.confidence.toLowerCase()}">${ai.confidence}</span>
            </div>
            <div class="win-bar-labels">
              <span style="color:${CA};font-weight:800;">${a.name}</span>
              <span style="color:${CB};font-weight:800;">${b.name}</span>
            </div>
            <div class="win-bar-track">
              <div class="win-bar-fill" style="width:${ai.winA.toFixed(1)}%;background:${CA};"></div>
            </div>
            <div class="win-bar-labels">
              <span style="color:${CA};">${ai.winA.toFixed(1)}%</span>
              <span style="color:${CB};">${ai.winB.toFixed(1)}%</span>
            </div>
            <div class="power-row">
              <div class="power-cell" style="border-color:${CA}33;">
                <div class="power-name" style="color:${CA};">${a.name}</div>
                <div class="power-line">Offense <strong>${ai.A.offense.toFixed(1)}</strong></div>
                <div class="power-line">Defense <strong>${ai.A.defense.toFixed(1)}</strong></div>
                <div class="power-line">Power   <strong>${ai.A.power.toFixed(1)}</strong></div>
              </div>
              <div class="power-cell" style="border-color:${CB}33;">
                <div class="power-name" style="color:${CB};">${b.name}</div>
                <div class="power-line">Offense <strong>${ai.B.offense.toFixed(1)}</strong></div>
                <div class="power-line">Defense <strong>${ai.B.defense.toFixed(1)}</strong></div>
                <div class="power-line">Power   <strong>${ai.B.power.toFixed(1)}</strong></div>
              </div>
            </div>
          </div>

          <!-- MATCHUP BREAKDOWN -->
          <div class="panel-title" style="margin-top:24px;">Matchup Breakdown</div>
          <div class="breakdown-table">
            ${ai.report.map(r => `
              <div class="breakdown-row">
                <span class="breakdown-label">${r.label}</span>
                ${edgeBadge(r.edge, r.winner, a.name, CA, CB)}
              </div>
            `).join("")}
          </div>

          <!-- COMPETITIVE FOCUS — tabs switch between team tips -->
          <div class="panel-title" style="margin-top:24px;">Competitive Focus</div>
          <div class="tab-bar">
            <button id="focusBtnA" class="tab-btn tab-active" onclick="switchFocusTab('A')">${a.name}</button>
            <button id="focusBtnB" class="tab-btn"            onclick="switchFocusTab('B')">${b.name}</button>
          </div>

          <!-- Panel A shown by default, Panel B hidden -->
          <div id="focusPanelA" class="focus-panel">${focusA}</div>
          <div id="focusPanelB" class="focus-panel hidden">${focusB}</div>

        </div>
      </div>
    </div>
  `;

  attachRadarTooltip();
}

function showPage(page) {
  document.getElementById("dashboardPage").classList.toggle("hidden", page !== "dashboard");
  document.getElementById("comparisonPage").classList.toggle("hidden", page !== "comparison");

  const buttons = document.querySelectorAll(".nav button");
  buttons.forEach((btn) => btn.classList.remove("active"));
  if (page === "dashboard")  buttons[0].classList.add("active");
  if (page === "comparison") buttons[1].classList.add("active");
  if (page === "comparison") renderComparison();
}

function goToComparison() {
  if (!selectedTeamA || !selectedTeamB || selectedTeamA.id === selectedTeamB.id) return;
  showPage("comparison");
}

document.getElementById("teamSearch").addEventListener("input", (e) => {
  searchTerm = e.target.value;
  renderTeams();
});

loadTeams();