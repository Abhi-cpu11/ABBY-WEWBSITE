let teams = [];
let selectedTeamA = null;
let selectedTeamB = null;
let currentPage = "dashboard";
let searchTerm = "";
let favoriteTeamIds = JSON.parse(localStorage.getItem("favoriteTeamIds") || "[]");

async function loadTeams() {
  try {
    const response = await fetch("./data.json");
    if (!response.ok) {
      throw new Error("Could not load team data.");
    }

    const data = await response.json();
    teams = data.teams || [];
    renderTeams();
  } catch (error) {
    console.error(error);
    document.getElementById("teamGrid").innerHTML = `
      <div class="card">
        <div class="panel-title">Data could not be loaded</div>
        <div class="muted">
          Open this project with a local server so script.js can read data.json.
        </div>
      </div>
    `;
  }
}

function saveFavorites() {
  localStorage.setItem("favoriteTeamIds", JSON.stringify(favoriteTeamIds));
}

function isFavorite(teamId) {
  return favoriteTeamIds.includes(teamId);
}

function toggleFavorite(teamId) {
  if (isFavorite(teamId)) {
    favoriteTeamIds = favoriteTeamIds.filter(id => id !== teamId);
  } else {
    favoriteTeamIds.push(teamId);
  }

  saveFavorites();
  renderTeams();
}

function offenseRating(team) {
  return Math.round((team.ppg * 0.4) + (team.apg * 1.2) + (team.fg_pct * 0.6) + (team.three_pt_pct * 0.5));
}

function defenseRating(team) {
  return Math.round((team.rpg * 0.5) + (team.spg * 2) + (team.bpg * 2) - (team.plus_minus * -0.1) + 35);
}

function controlRating(team) {
  return Math.round((team.apg * 1.5) - (team.spg * 0.2) + (team.ft_pct * 0.2) + 35);
}

function shootingRating(team) {
  return Math.round((team.fg_pct * 0.6) + (team.three_pt_pct * 0.7) + (team.ts_pct * 0.3));
}

function updateMatchupBar() {
  const matchupBar = document.getElementById("matchupBar");
  const matchupTeamA = document.getElementById("matchupTeamA");
  const matchupTeamB = document.getElementById("matchupTeamB");
  const matchupSub = document.getElementById("matchupSub");
  const analyzeBtn = document.getElementById("analyzeBtn");

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
    filtered = teams.filter(team =>
      team.name.toLowerCase().includes(normalized) ||
      team.conference.toLowerCase().includes(normalized) ||
      team.region.toLowerCase().includes(normalized)
    );
  }

  return [...filtered].sort((a, b) => {
    const aFav = isFavorite(a.id) ? 1 : 0;
    const bFav = isFavorite(b.id) ? 1 : 0;

    if (bFav !== aFav) {
      return bFav - aFav;
    }

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

  filteredTeams.forEach(team => {
    const isSelectedA = selectedTeamA && selectedTeamA.id === team.id;
    const isSelectedB = selectedTeamB && selectedTeamB.id === team.id;
    const isSelected = isSelectedA || isSelectedB;
    const slotLabel = isSelectedA ? "Team A Selected" : isSelectedB ? "Team B Selected" : "Select Team";
    const otherSelectedTeamId = isSelectedA
      ? selectedTeamB?.id
      : isSelectedB
        ? selectedTeamA?.id
        : (selectedTeamA?.id || selectedTeamB?.id);

    const isBlockedDuplicate = otherSelectedTeamId === team.id && !isSelected;
    const note = isBlockedDuplicate
      ? `<div class="selection-note">You cannot compare the same team against itself.</div>`
      : "";

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <div class="team-color" style="background:${team.color}"></div>

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

      <button class="select-btn ${isSelected ? "selected" : ""}" ${isBlockedDuplicate ? "disabled" : ""}>
        ${slotLabel}
      </button>
      ${note}
    `;

    card.querySelector(".select-btn").onclick = () => selectTeam(team);

    card.querySelector(".favorite-btn").onclick = (event) => {
      event.stopPropagation();
      toggleFavorite(team.id);
    };

    grid.appendChild(card);
  });

  updateMatchupBar();
}

function selectTeam(team) {
  if (selectedTeamA && selectedTeamA.id === team.id) {
    selectedTeamA = null;
    renderTeams();
    return;
  }

  if (selectedTeamB && selectedTeamB.id === team.id) {
    selectedTeamB = null;
    renderTeams();
    return;
  }

  if (!selectedTeamA) {
    selectedTeamA = team;
    renderTeams();
    return;
  }

  if (!selectedTeamB) {
    if (selectedTeamA.id === team.id) {
      return;
    }
    selectedTeamB = team;
    renderTeams();
    return;
  }

  if (selectedTeamA.id !== team.id) {
    selectedTeamA = team;
  }
  selectedTeamB = null;

  renderTeams();
}

function pushStrategy(strategies, teamKey, teamName, type, title, text) {
  strategies.push({
    team: teamKey,
    teamName,
    type,
    title,
    text
  });
}

function generateStrategies(a, b) {
  const strategies = [];

  if (a.three_pt_pct > b.three_pt_pct) {
    pushStrategy(
      strategies,
      "A",
      a.name,
      "Offense",
      "Create perimeter looks",
      `${a.name} has the stronger three-point shooting profile. Use drive-and-kick actions and extra passing to generate open perimeter shots.`
    );
  } else if (b.three_pt_pct > a.three_pt_pct) {
    pushStrategy(
      strategies,
      "B",
      b.name,
      "Offense",
      "Create perimeter looks",
      `${b.name} has the stronger three-point shooting profile. Use drive-and-kick actions and extra passing to generate open perimeter shots.`
    );
  }

  if (a.bpg < b.bpg) {
    pushStrategy(
      strategies,
      "A",
      a.name,
      "Defense",
      "Avoid attacking into shot blockers",
      `${b.name} protects the rim better. Use ball movement, mid-range pull-ups, and kick-outs instead of forcing contested finishes inside.`
    );
  } else if (b.bpg < a.bpg) {
    pushStrategy(
      strategies,
      "B",
      b.name,
      "Defense",
      "Avoid attacking into shot blockers",
      `${a.name} protects the rim better. Use ball movement, mid-range pull-ups, and kick-outs instead of forcing contested finishes inside.`
    );
  }

  if (a.plus_minus < b.plus_minus) {
    pushStrategy(
      strategies,
      "A",
      a.name,
      "Composure",
      "Control momentum swings",
      `${b.name} carries the stronger scoring margin. ${a.name} should value possessions and slow scoring runs with disciplined half-court execution.`
    );
  } else if (b.plus_minus < a.plus_minus) {
    pushStrategy(
      strategies,
      "B",
      b.name,
      "Composure",
      "Control momentum swings",
      `${a.name} carries the stronger scoring margin. ${b.name} should value possessions and slow scoring runs with disciplined half-court execution.`
    );
  }

  if (a.rpg > b.rpg) {
    pushStrategy(
      strategies,
      "A",
      a.name,
      "Rebounding",
      "Crash the glass",
      `${a.name} has a rebounding edge. Attack second-chance points and make offensive rebounding part of the game plan.`
    );
  } else if (b.rpg > a.rpg) {
    pushStrategy(
      strategies,
      "B",
      b.name,
      "Rebounding",
      "Crash the glass",
      `${b.name} has a rebounding edge. Attack second-chance points and make offensive rebounding part of the game plan.`
    );
  }

  if (strategies.length === 0) {
    pushStrategy(
      strategies,
      "A",
      a.name,
      "General",
      "Play a balanced game",
      "This matchup is statistically close. Focus on execution, transition defense, and limiting empty possessions."
    );
    pushStrategy(
      strategies,
      "B",
      b.name,
      "General",
      "Play a balanced game",
      "This matchup is statistically close. Focus on execution, transition defense, and limiting empty possessions."
    );
  }

  return strategies;
}

function radarPoints(values, cx, cy, radius) {
  const labels = values.length;
  return values.map((value, i) => {
    const angle = (-Math.PI / 2) + ((2 * Math.PI * i) / labels);
    const r = radius * (value / 100);
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    return `${x},${y}`;
  }).join(" ");
}

function renderRadar(a, b) {
  const aValues = [
    offenseRating(a),
    defenseRating(a),
    shootingRating(a),
    Math.min(100, a.rpg * 2),
    Math.min(100, controlRating(a)),
    Math.min(100, a.ppg)
  ];

  const bValues = [
    offenseRating(b),
    defenseRating(b),
    shootingRating(b),
    Math.min(100, b.rpg * 2),
    Math.min(100, controlRating(b)),
    Math.min(100, b.ppg)
  ];

  const labels = [
    ["Offense", 200, 20],
    ["Defense", 335, 95],
    ["Shooting", 335, 245],
    ["Rebounding", 200, 320],
    ["Control", 55, 245],
    ["Tempo", 55, 95]
  ];

  return `
    <div class="card">
      <div class="panel-title">Radar Chart</div>
      <div class="radar-wrap">
        <svg width="400" height="340" viewBox="0 0 400 340">
          <polygon points="200,50 312,110 312,230 200,290 88,230 88,110" fill="none" stroke="#334155"/>
          <polygon points="200,90 276,130 276,210 200,250 124,210 124,130" fill="none" stroke="#334155"/>
          <polygon points="200,130 240,150 240,190 200,210 160,190 160,150" fill="none" stroke="#334155"/>
          <polygon points="${radarPoints(aValues, 200, 170, 120)}" fill="rgba(249,115,22,0.35)" stroke="#f97316" stroke-width="2"/>
          <polygon points="${radarPoints(bValues, 200, 170, 120)}" fill="rgba(56,189,248,0.30)" stroke="#38bdf8" stroke-width="2"/>
          ${labels.map(([text, x, y]) => `<text x="${x}" y="${y}" text-anchor="middle">${text}</text>`).join("")}
        </svg>
      </div>
    </div>
  `;
}

function renderComparison() {
  const container = document.getElementById("comparisonContent");

  if (!selectedTeamA || !selectedTeamB) {
    container.innerHTML = `
      <div class="card">
        <div class="panel-title">No matchup selected</div>
        <div class="muted">Select two different teams from the dashboard first.</div>
      </div>
    `;
    return;
  }

  if (selectedTeamA.id === selectedTeamB.id) {
    container.innerHTML = `
      <div class="card">
        <div class="panel-title">Invalid matchup</div>
        <div class="muted">You cannot compare the same team against itself.</div>
      </div>
    `;
    return;
  }

  const a = selectedTeamA;
  const b = selectedTeamB;
  const strategies = generateStrategies(a, b);

  const bars = [
    ["PPG", a.ppg, b.ppg, 100],
    ["FG%", a.fg_pct, b.fg_pct, 100],
    ["3P%", a.three_pt_pct, b.three_pt_pct, 100],
    ["REB", a.rpg, b.rpg, 60],
    ["APG", a.apg, b.apg, 30],
    ["TS%", a.ts_pct, b.ts_pct, 100]
  ];

  container.innerHTML = `
    <div class="comparison-layout">
      <div>
        <div class="card">
          <div class="panel-title">Head-to-Head Comparison</div>
          <div class="compare-head">
            <div class="mini-team">
              <div class="team-tag team-a">Team A</div>
              <div class="team-name">${a.name}</div>
              <div class="team-conf">${a.conference} • ${a.region}</div>
              <div>Offense: <strong>${offenseRating(a)}</strong></div>
              <div>Defense: <strong>${defenseRating(a)}</strong></div>
            </div>
            <div class="vs">VS</div>
            <div class="mini-team">
              <div class="team-tag team-b">Team B</div>
              <div class="team-name">${b.name}</div>
              <div class="team-conf">${b.conference} • ${b.region}</div>
              <div>Offense: <strong>${offenseRating(b)}</strong></div>
              <div>Defense: <strong>${defenseRating(b)}</strong></div>
            </div>
          </div>

          ${bars.map(([label, av, bv, max]) => `
            <div class="bar-row">
              <div class="bar-label">
                <span>${label}</span>
                <span>${a.name}: ${av} | ${b.name}: ${bv}</span>
              </div>
              <div class="bar-track">
                <div class="bar-fill-a" style="width:${(av / max) * 100}%"></div>
                <div class="bar-fill-b" style="width:${(bv / max) * 100}%"></div>
              </div>
            </div>
          `).join("")}
        </div>

        ${renderRadar(a, b)}
      </div>

      <div>
        <div class="card">
          <div class="panel-title">Strategy Recommendations</div>
          <div class="strategy-list">
            ${strategies.map(s => `
              <div class="strategy-item ${s.team === "A" ? "team-a" : "team-b"}">
                <div class="strategy-type">${s.teamName} • ${s.type}</div>
                <div class="strategy-title">${s.title}</div>
                <div>${s.text}</div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    </div>
  `;
}

function showPage(page) {
  currentPage = page;
  document.getElementById("dashboardPage").classList.toggle("hidden", page !== "dashboard");
  document.getElementById("comparisonPage").classList.toggle("hidden", page !== "comparison");

  const buttons = document.querySelectorAll(".nav button");
  buttons.forEach(btn => btn.classList.remove("active"));

  if (page === "dashboard") buttons[0].classList.add("active");
  if (page === "comparison") buttons[1].classList.add("active");

  if (page === "comparison") {
    renderComparison();
  }
}

function goToComparison() {
  if (!selectedTeamA || !selectedTeamB || selectedTeamA.id === selectedTeamB.id) {
    return;
  }
  showPage("comparison");
}

document.getElementById("teamSearch").addEventListener("input", event => {
  searchTerm = event.target.value;
  renderTeams();
});

loadTeams();