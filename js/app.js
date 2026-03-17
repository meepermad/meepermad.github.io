/**
 * D&D Character Builder - Application logic
 * Handles: character CRUD, wizard flow, session view, combat, spells, leveling, DM tools, battle map
 * Depends on: data.js, monsters.js, spells.js, items.js
 */

// ========== UTILITIES ==========
/** Escape HTML to prevent XSS */
function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ========== EXPORT / IMPORT ==========
/** Export characters to CSV format */
function exportToCSV(characters) {
  if (!characters || characters.length === 0) return '';
  const headers = ['Name', 'Race', 'Subrace', 'Class', 'Subclass', 'Level', 'Background', 'Alignment',
    'Languages', 'Resistances', 'Immunities', 'Vulnerabilities', 'Weaknesses',
    'Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma',
    'Skills', 'Equipment', 'Notes'];
  const rows = characters.map(char => [
    char.name || '', char.race || '', char.subrace || '', char.class || '', char.subclass || '',
    char.level || 1, char.background || '', char.alignment || '',
    (char.languages || []).join('; '), (char.resistances || []).join('; '),
    (char.immunities || []).join('; '), (char.vulnerabilities || []).join('; '),
    (char.weaknesses || []).join('; '),
    char.stats?.strength || 10, char.stats?.dexterity || 10, char.stats?.constitution || 10,
    char.stats?.intelligence || 10, char.stats?.wisdom || 10, char.stats?.charisma || 10,
    (char.skills || []).join('; '), (char.equipment || []).join('; '), char.notes || ''
  ]);
  return [headers.join(','), ...rows.map(r => r.map(c => {
    const str = String(c);
    if (str.includes(',') || str.includes('"') || str.includes('\n'))
      return `"${str.replace(/"/g, '""')}"`;
    return str;
  }).join(','))].join('\n');
}

function exportToJSON(characters) {
  return JSON.stringify(characters, null, 2);
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Render quick reference search results (monsters, spells, items) */
function renderQuickReference(q) {
  const results = document.getElementById('quick-ref-results');
  const filter = document.getElementById('quick-ref-filter')?.value || '';
  if (!results) return;
  const query = (q || '').toLowerCase().trim();
  const matches = [];
  if ((!filter || filter === 'monsters') && typeof SRD_MONSTERS !== 'undefined') {
    SRD_MONSTERS.forEach(m => {
      if (!query || m.name.toLowerCase().includes(query) || (m.type || '').toLowerCase().includes(query) || String(m.cr).includes(query)) {
        matches.push({ type: 'monster', name: m.name, data: m });
      }
    });
  }
  if ((!filter || filter === 'spells') && typeof SPELLS !== 'undefined') {
    SPELLS.forEach(s => {
      if (!query || (s.name || '').toLowerCase().includes(query) || (s.school || '').toLowerCase().includes(query) || String(s.level).includes(query)) {
        matches.push({ type: 'spell', name: s.name, data: s });
      }
    });
  }
  if ((!filter || filter === 'items') && typeof getAllItems === 'function') {
    (getAllItems() || []).forEach(i => {
      if (!query || String(i).toLowerCase().includes(query)) {
        matches.push({ type: 'item', name: i, data: i });
      }
    });
  }
  matches.sort((a, b) => a.name.localeCompare(b.name));
  const limit = 50;
  const slice = matches.slice(0, limit);
  results.innerHTML = slice.map((m, idx) => {
    if (m.type === 'monster') {
      const d = m.data;
      return `<div class="quick-ref-item quick-ref-monster" data-idx="${idx}" role="button" tabindex="0" aria-label="View ${esc(d.name)} stats">
        <strong>${esc(d.name)}</strong> — ${d.type || ''} · CR ${d.cr} · AC ${d.ac} · HP ${d.hp || '?'}
      </div>`;
    }
    if (m.type === 'spell') {
      const d = m.data;
      const level = d.level === 0 ? 'Cantrip' : `Level ${d.level}`;
      return `<div class="quick-ref-item quick-ref-spell" data-idx="${idx}" role="button" tabindex="0" aria-label="View ${esc(d.name)} details">
        <strong>${esc(d.name)}</strong> — ${level} · ${d.school || ''} · ${(d.description || '').slice(0, 80)}…
      </div>`;
    }
    return `<div class="quick-ref-item quick-ref-item-name" data-idx="${idx}" role="button" tabindex="0"><strong>${esc(m.name)}</strong></div>`;
  }).join('') + (matches.length > limit ? `<p class="quick-ref-more">Showing ${limit} of ${matches.length}. Refine search.</p>` : '');
  if (matches.length === 0) results.innerHTML = '<p class="quick-ref-empty">No matches. Try a different search or filter.</p>';
  else {
    results._quickRefMatches = slice;
    results.querySelectorAll('.quick-ref-item').forEach(el => {
      const idx = parseInt(el.dataset.idx);
      const match = slice[idx];
      if (!match) return;
      el.addEventListener('click', () => handleQuickRefClick(match));
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleQuickRefClick(match); } });
    });
  }
}

function handleQuickRefClick(match) {
  const results = document.getElementById('quick-ref-results');
  if (!results) return;
  if (match.type === 'monster') {
    const m = match.data;
    const diff = typeof getCrDifficulty === 'function' ? getCrDifficulty(m.cr) : '';
    const stats = [];
    if (m.str != null) stats.push(`STR ${m.str}`);
    if (m.dex != null) stats.push(`DEX ${m.dex}`);
    if (m.con != null) stats.push(`CON ${m.con}`);
    if (m.int != null) stats.push(`INT ${m.int}`);
    if (m.wis != null) stats.push(`WIS ${m.wis}`);
    if (m.cha != null) stats.push(`CHA ${m.cha}`);
    let html = `<div class="spell-card monster-quick-ref"><h4>${esc(m.name)}</h4>`;
    html += `<p><strong>${m.type || ''}</strong> · CR ${m.cr} (${diff}) · ${m.xp || ''} XP</p>`;
    html += `<p>AC ${m.ac ?? '?'} · HP ${m.hp || '?'} · Speed ${m.speed || '?'}</p>`;
    if (stats.length) html += `<p><strong>Ability Scores:</strong> ${stats.join(', ')}</p>`;
    if (m.saves) html += `<p><strong>Saving Throws:</strong> ${m.saves}</p>`;
    if (m.skills) html += `<p><strong>Skills:</strong> ${m.skills}</p>`;
    if (m.senses) html += `<p><strong>Senses:</strong> ${m.senses}</p>`;
    if (m.languages) html += `<p><strong>Languages:</strong> ${m.languages}</p>`;
    if (m.vulnerabilities) html += `<p><strong>Vulnerabilities:</strong> ${m.vulnerabilities}</p>`;
    if (m.immunities) html += `<p><strong>Immunities:</strong> ${m.immunities}</p>`;
    if (m.traits) html += `<p><strong>Traits:</strong> ${m.traits}</p>`;
    if (m.actions) html += `<p><strong>Actions:</strong> ${m.actions}</p>`;
    html += `</div><button type="button" class="btn btn-ghost btn-sm" id="quick-ref-back">← Back to search</button>`;
    results.innerHTML = html;
    document.getElementById('quick-ref-back')?.addEventListener('click', () => {
      const q = document.getElementById('quick-ref-search')?.value || '';
      if (typeof renderQuickReference === 'function') renderQuickReference(q);
    });
  } else if (match.type === 'spell') {
    const d = match.data;
    const higherNote = d.higherLevel ? `<p class="spell-preview-higher"><strong>At higher levels:</strong> ${esc(d.higherLevel)}</p>` : '';
    results.innerHTML = `<div class="spell-card" style="margin-top:0">
      <strong>${esc(d.name)}</strong> — ${d.level === 0 ? 'Cantrip' : `Level ${d.level}`} ${d.school || ''}
      <p class="spell-desc">${esc(d.description || '')}</p>${higherNote}
      <small>${esc(d.castTime || '')} · ${esc(d.range || '')} · ${esc(d.duration || '')}</small>
    </div><button type="button" class="btn btn-ghost btn-sm" id="quick-ref-back">← Back to search</button>`;
    document.getElementById('quick-ref-back')?.addEventListener('click', () => {
      const q = document.getElementById('quick-ref-search')?.value || '';
      if (typeof renderQuickReference === 'function') renderQuickReference(q);
    });
  } else if (match.type === 'item') {
    results.innerHTML = `<div class="spell-card"><strong>${esc(match.name)}</strong><p>Item — no details available.</p></div><button type="button" class="btn btn-ghost btn-sm" id="quick-ref-back">← Back to search</button>`;
    document.getElementById('quick-ref-back')?.addEventListener('click', () => {
      const q = document.getElementById('quick-ref-search')?.value || '';
      if (typeof renderQuickReference === 'function') renderQuickReference(q);
    });
  }
}

// ========== COMBAT / RULES HELPERS ==========
/** Compute debuff effects from conditions and exhaustion (D&D 5e) */
function getDebuffEffects(c) {
  const conds = (c.conditions || []).map(s => String(s).toLowerCase());
  const exh = c.exhaustion ?? 0;
  const abilityChecksDisadvantage = exh >= 1 || conds.includes('poisoned') || conds.includes('frightened');
  const savesDisadvantage = exh >= 3;
  const attackRollsDisadvantage = exh >= 3;
  let speedMultiplier = 1;
  if (exh >= 5) speedMultiplier = 0;
  else if (exh >= 2) speedMultiplier = 0.5;
  const hpMaxMultiplier = exh >= 4 ? 0.5 : 1;
  return { abilityChecksDisadvantage, savesDisadvantage, speedMultiplier, hpMaxMultiplier };
}

// Calculate AC from equipped armor and Dexterity (D&D 5e rules)
function calculateAC(c) {
  const armorAC = typeof ITEMS !== 'undefined' && ITEMS?.armorAC ? ITEMS.armorAC : {};
  const dex = c.stats?.dexterity ?? 10;
  const dexMod = Math.floor((dex - 10) / 2);
  const items = [...(c.equipment || []), ...(c.inventory || [])].map(s => String(s).trim()).filter(Boolean);
  const hasItem = (name) => items.some(s => s.toLowerCase().includes(name.toLowerCase()));
  const shieldBonus = hasItem('Shield') ? (armorAC['Shield']?.bonus ?? 2) : 0;
  let base = 10, dexAdd = dexMod;
  for (const [name, data] of Object.entries(armorAC)) {
    if (name === 'Shield' || data.bonus) continue;
    if (!hasItem(name)) continue;
    base = data.base ?? 10;
    dexAdd = data.dexCap === null ? dexMod : (data.dexCap === 2 ? Math.min(dexMod, 2) : 0);
    break;
  }
  return base + dexAdd + shieldBonus;
}

// ========== APP STATE ==========
let characters = [];
let editingCharacter = null;
let currentChar = null;
let sessionCharacter = null; // character being played (from characters array)
let currentStep = 1;
const TOTAL_STEPS = 10;

// DOM refs (cached for performance)
const listView = document.getElementById('list-view');
const builderView = document.getElementById('builder-view');
const sessionView = document.getElementById('session-view');
const battleMapView = document.getElementById('battle-map-view');
const characterGrid = document.getElementById('character-grid');
const emptyState = document.getElementById('empty-state');
const progressBar = document.getElementById('progress-bar');
const stepIndicators = document.getElementById('step-indicators');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const saveBtn = document.getElementById('save-btn');
const cancelBtn = document.getElementById('cancel-btn');
const characterPreview = document.getElementById('character-preview');

// ========== PERSISTENCE ==========
/** Load characters from localStorage, migrate legacy fields */
function loadCharacters() {
  try {
    const saved = localStorage.getItem('dnd_characters');
    characters = saved ? JSON.parse(saved) : [];
    characters.forEach(c => migrateCharacter(c));
  } catch (e) {
    characters = [];
  }
}

/** Ensure character has all expected fields (handles old saves) */
function migrateCharacter(c) {
  const def = createEmptyCharacter();
  if (c.hp === undefined) c.hp = c.maxHp ?? null;
  if (c.maxHp === undefined) c.maxHp = null;
  if (c.tempHp === undefined) c.tempHp = 0;
  if (c.ac === undefined) c.ac = null;
  if (c.initiative === undefined) c.initiative = null;
  if (c.speed === undefined) c.speed = null;
  if (c.levelingMode === undefined) c.levelingMode = getCampaignLevelingMode();
  if (c.xp === undefined) c.xp = 0;
  if (!c.spellSlotsUsed) c.spellSlotsUsed = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  if (!c.knownSpells) c.knownSpells = [];
  if (!c.conditions) c.conditions = [];
  if (c.inspiration === undefined) c.inspiration = false;
  if (c.hitDiceTotal === undefined) c.hitDiceTotal = null;
  if (c.hitDiceUsed === undefined) c.hitDiceUsed = 0;
  if (c.deathSaveSuccesses === undefined) c.deathSaveSuccesses = 0;
  if (c.deathSaveFailures === undefined) c.deathSaveFailures = 0;
  if (c.exhaustion === undefined) c.exhaustion = 0;
  if (!c.currency) c.currency = { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 };
  if (!c.attacks) c.attacks = [];
  if (!c.multiclass) c.multiclass = [];
  if (!c.weaponProficiencies) c.weaponProficiencies = [];
  if (!c.armorProficiencies) c.armorProficiencies = [];
  if (!c.toolProficiencies) c.toolProficiencies = [];
  if (!c.sectionOrder) c.sectionOrder = [];
  if (!c.sheetLayout) c.sheetLayout = { overall: 'single', sections: {} };
  if (c.sheetLayout.sections) {
    const legacy = { block: 'full', skinny: 'compact', column: 'half' };
    Object.keys(c.sheetLayout.sections).forEach(k => {
      const v = c.sheetLayout.sections[k];
      if (legacy[v]) c.sheetLayout.sections[k] = legacy[v];
    });
  }
  if (!c.inventory) c.inventory = [];
  if (c.personalityTraits === undefined) c.personalityTraits = '';
  if (c.ideals === undefined) c.ideals = '';
  if (c.bonds === undefined) c.bonds = '';
  if (c.flaws === undefined) c.flaws = '';
  if (c.physicalAppearance === undefined) c.physicalAppearance = '';
  return c;
}

function getCampaignLevelingMode() {
  return localStorage.getItem('dnd_leveling_mode') || 'xp';
}

function setCampaignLevelingMode(mode) {
  localStorage.setItem('dnd_leveling_mode', mode);
}

function saveCharacters() {
  localStorage.setItem('dnd_characters', JSON.stringify(characters));
}

// ========== CHARACTER BUILDING HELPERS ==========
/** Apply race/subrace ability bonuses to base 10s */
function getBaseStatsWithRaceBonuses() {
  const base = { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 };
  const race = getMergedRaces().find(r => r.name === currentChar.race);
  if (!race) return base;
  const subrace = race.subraces?.find(s => s.name === currentChar.subrace);
  const raceBonus = race.abilityScore || {};
  const subBonus = subrace?.abilityScore || {};
  const apply = (stats, bonus) => {
    Object.entries(bonus).forEach(([key, val]) => {
      if (key === 'any') return;
      if (stats[key] !== undefined) stats[key] += val;
    });
  };
  apply(base, raceBonus);
  apply(base, subBonus);
  return base;
}

function applyRaceBonusesToStats(stats) {
  const race = getMergedRaces().find(r => r.name === currentChar.race);
  if (!race) return stats;
  const subrace = race.subraces?.find(s => s.name === currentChar.subrace);
  const raceBonus = race.abilityScore || {};
  const subBonus = subrace?.abilityScore || {};
  const apply = (s, bonus) => {
    Object.entries(bonus).forEach(([key, val]) => {
      if (key === 'any') return;
      if (s[key] !== undefined) s[key] += val;
    });
  };
  apply(stats, raceBonus);
  apply(stats, subBonus);
  return stats;
}

/** Validate current step before advancing; returns false + alert if invalid */
function canAdvanceStep(step) {
  if (!currentChar) return false;
  switch (step) {
    case 1:
      if (!document.getElementById('char-name')?.value?.trim()) {
        alert('Please enter a character name.');
        return false;
      }
      return true;
    case 2:
      if (!currentChar.race) {
        alert('Please select a race.');
        return false;
      }
      return true;
    case 3: {
      const race = getMergedRaces().find(r => r.name === currentChar.race);
      if (race?.subraces?.length && !currentChar.subrace) {
        alert('Please select a subrace.');
        return false;
      }
      return true;
    }
    case 4: {
      const levelEl = document.getElementById('starting-level-step4');
      if (levelEl) currentChar.level = parseInt(levelEl.value) || 1;
      if (!currentChar.class) {
        alert('Please select a class.');
        return false;
      }
      return true;
    }
    case 5: {
      const cls = getMergedClasses().find(c => c.name === currentChar.class);
      const charLevel = currentChar.level || 1;
      const availableSubclasses = (cls?.subclasses || []).filter(s => (s.level || 1) <= charLevel);
      if (availableSubclasses.length > 0 && !currentChar.subclass) {
        alert('Please select a subclass.');
        return false;
      }
      return true;
    }
    case 6:
      if (!currentChar.background) {
        alert('Please select a background.');
        return false;
      }
      return true;
    case 7:
      if (!currentChar.alignment) {
        alert('Please select an alignment.');
        return false;
      }
      return true;
    case 8:
      if (!currentChar.stats || Object.values(currentChar.stats).some(v => v == null || v === '')) {
        alert('Please set all ability scores.');
        return false;
      }
      return true;
    case 9: {
      if (typeof isSpellcastingClass === 'function' && isSpellcastingClass(currentChar.class, currentChar.subclass)) {
        const cfg = typeof getSpellsForClassLevel === 'function' ? getSpellsForClassLevel(currentChar.class, currentChar.level || 1, currentChar.subclass) : null;
        if (cfg) {
          const known = currentChar.knownSpells || [];
          const cantrips = known.filter(n => (SPELLS || []).find(s => s.name === n && s.level === 0));
          const spells = known.filter(n => (SPELLS || []).find(s => s.name === n && s.level > 0));
          const needCantrips = typeof cfg.cantrips === 'number' ? cfg.cantrips : 0;
          const needSpells = cfg.spells === 'prepare' ? 0 : (typeof cfg.spells === 'number' ? cfg.spells : 0);
          if (cantrips.length < needCantrips) {
            alert(`Please select ${needCantrips} cantrips. You have ${cantrips.length}.`);
            return false;
          }
          if (needSpells > 0 && spells.length < needSpells) {
            alert(`Please select ${needSpells} spells. You have ${spells.length}.`);
            return false;
          }
        }
      }
      return true;
    }
    default:
      return true;
  }
}

let lastRolledValues = [];
function roll6d20() {
  lastRolledValues = [1, 2, 3, 4, 5, 6].map(() => Math.floor(Math.random() * 20) + 1);
  const ui = document.getElementById('roll-assign-ui');
  const grid = document.getElementById('roll-assign-grid');
  const rolledEl = document.getElementById('roll-assign-rolled');
  if (!ui || !grid) return;
  if (rolledEl) rolledEl.textContent = 'You rolled: ' + lastRolledValues.join(', ');
  const statOrder = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
  const statLabels = { strength: 'STR', dexterity: 'DEX', constitution: 'CON', intelligence: 'INT', wisdom: 'WIS', charisma: 'CHA' };
  grid.innerHTML = statOrder.map(stat => `
    <div class="roll-assign-row">
      <span class="roll-stat-label">${statLabels[stat]}</span>
      <select class="roll-assign-select" data-stat="${stat}">
        <option value="">— Choose —</option>
        ${lastRolledValues.map((v, i) => `<option value="${i}">Roll ${i + 1}: ${v}</option>`).join('')}
      </select>
    </div>
  `).join('');
  grid.querySelectorAll('.roll-assign-select').forEach(sel => {
    sel.addEventListener('change', () => updateRollAssignOptions());
  });
  ui.hidden = false;
}
function updateRollAssignOptions() {
  const grid = document.getElementById('roll-assign-grid');
  if (!grid) return;
  const used = new Set();
  grid.querySelectorAll('.roll-assign-select').forEach(sel => {
    const v = sel.value;
    if (v !== '') used.add(parseInt(v));
  });
  grid.querySelectorAll('.roll-assign-select').forEach(sel => {
    Array.from(sel.options).forEach((opt, i) => {
      if (i === 0) return;
      const idx = parseInt(opt.value);
      opt.disabled = used.has(idx) && sel.value !== String(idx);
    });
  });
}
function applyRollAssignments() {
  const grid = document.getElementById('roll-assign-grid');
  if (!grid) return;
  const base = {};
  const used = new Set();
  grid.querySelectorAll('.roll-assign-select').forEach(sel => {
    const stat = sel.dataset.stat;
    const idx = parseInt(sel.value);
    if (sel.value !== '' && idx >= 0 && idx < lastRolledValues.length && !used.has(idx)) {
      base[stat] = lastRolledValues[idx];
      used.add(idx);
    }
  });
  if (Object.keys(base).length !== 6) {
    alert('Assign each roll to exactly one stat. Each roll can only be used once.');
    return;
  }
  currentChar.stats = applyRaceBonusesToStats({ ...base });
  Object.keys(currentChar.stats).forEach(k => {
    currentChar.stats[k] = Math.max(1, Math.min(30, currentChar.stats[k]));
  });
  document.getElementById('roll-assign-ui').hidden = true;
  renderStatsStep(true);
  updatePreview();
}

// ========== WIZARD NAVIGATION ==========
/** Switch to step N, update UI, run step-specific render */
function goToStep(step) {
  step = Math.max(1, Math.min(step, TOTAL_STEPS));
  document.querySelectorAll('.wizard-pane').forEach(p => p.classList.remove('active'));
  const pane = document.querySelector(`.wizard-pane[data-step="${step}"]`);
  if (pane) pane.classList.add('active');

  currentStep = step;
  if (progressBar) progressBar.style.width = `${(step / TOTAL_STEPS) * 100}%`;
  document.querySelectorAll('.step-dot').forEach((d, i) => {
    d.classList.toggle('active', i + 1 <= step);
    d.classList.toggle('current', i + 1 === step);
  });

  if (prevBtn) prevBtn.disabled = step === 1;
  if (nextBtn) nextBtn.hidden = step === TOTAL_STEPS;
  if (saveBtn) saveBtn.hidden = step !== TOTAL_STEPS;

  if (step === 3) renderSubraceStep();
  else if (step === 4) renderClassStep();
  else if (step === 5) renderSubclassStep();
  else if (step === 8) renderStatsStep();
  else if (step === 9) applyRaceTraitsAndRenderStep9();
  else if (step === 10) renderSummaryStep();

  updatePreview();
}

function renderStepIndicators() {
  if (!stepIndicators) return;
  const labels = ['Name', 'Race', 'Subrace', 'Class', 'Subclass', 'Background', 'Alignment', 'Stats', 'Details', 'Done'];
  stepIndicators.innerHTML = labels.map((l, i) =>
    `<span class="step-dot" data-step="${i + 1}" title="${l}">${i + 1}</span>`
  ).join('');
  stepIndicators.querySelectorAll('.step-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      if (!currentChar) return;
      const s = parseInt(dot.dataset.step);
      if (s > currentStep) return;
      if (s === 3 && getMergedRaces().find(r => r.name === currentChar.race)?.subraces?.length && !currentChar.subrace) return;
      goToStep(s);
    });
  });
}

// ========== STEP RENDERERS ==========
function renderRaceStep() {
  const container = document.getElementById('race-choices');
  const infoPanel = document.getElementById('race-info');
  container.innerHTML = getMergedRaces().map(r => `
    <button class="choice-card" data-race="${r.name}">
      <span class="choice-title">${r.name}</span>
      <span class="choice-meta">Speed ${r.speed} ft · ${r.traits?.join(', ') || ''}</span>
    </button>
  `).join('');
  container.querySelectorAll('.choice-card').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.choice-card').forEach(c => c.classList.remove('selected'));
      btn.classList.add('selected');
      currentChar.race = btn.dataset.race;
      currentChar.subrace = '';
      const race = getMergedRaces().find(r => r.name === currentChar.race);
      infoPanel.innerHTML = race ? `
        <h4>${race.name}</h4>
        <p>${race.description}</p>
        <p><strong>Ability Score:</strong> ${Object.entries(race.abilityScore || {}).map(([k,v]) => k === 'any' ? `+1 to any` : `${k} +${v}`).join(', ')}</p>
        <p><strong>Traits:</strong> ${(race.traits || []).join(', ')}</p>
      ` : '';
    });
  });
  const selected = getMergedRaces().find(r => r.name === currentChar.race);
  if (selected) {
    const btn = container.querySelector(`[data-race="${selected.name}"]`);
    if (btn) btn.classList.add('selected');
    infoPanel.innerHTML = `
      <h4>${selected.name}</h4>
      <p>${selected.description}</p>
      <p><strong>Traits:</strong> ${(selected.traits || []).join(', ')}</p>
    `;
  }
}

function renderSubraceStep() {
  const container = document.getElementById('subrace-choices');
  const infoPanel = document.getElementById('subrace-info');
  const race = getMergedRaces().find(r => r.name === currentChar.race);
  const subraces = race?.subraces || [];
  if (subraces.length === 0) {
    container.innerHTML = '<p class="no-subraces">This race has no subraces. Continue to the next step.</p>';
    infoPanel.innerHTML = '';
    return;
  }
  container.innerHTML = subraces.map(s => `
    <button class="choice-card" data-subrace="${s.name}">
      <span class="choice-title">${s.name}</span>
      <span class="choice-meta">${Object.entries(s.abilityScore || {}).map(([k,v]) => k === 'any' ? '+1 any' : `${k} +${v}`).join(', ')}</span>
    </button>
  `).join('');
  container.querySelectorAll('.choice-card').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.choice-card').forEach(c => c.classList.remove('selected'));
      btn.classList.add('selected');
      currentChar.subrace = btn.dataset.subrace;
      const sub = subraces.find(s => s.name === currentChar.subrace);
      infoPanel.innerHTML = sub ? `
        <h4>${sub.name}</h4>
        <p><strong>Traits:</strong> ${(sub.traits || []).join(', ')}</p>
      ` : '';
    });
  });
  const sel = subraces.find(s => s.name === currentChar.subrace);
  if (sel) {
    const btn = container.querySelector(`[data-subrace="${sel.name}"]`);
    if (btn) btn.classList.add('selected');
  }
}

function renderClassStep() {
  const levelEl = document.getElementById('starting-level-step4');
  if (levelEl) {
    levelEl.value = String(currentChar.level || 1);
    levelEl.onchange = () => {
      currentChar.level = parseInt(levelEl.value) || 1;
      updatePreview();
    };
  }
  const container = document.getElementById('class-choices');
  const infoPanel = document.getElementById('class-info');
  const classIcon = (name) => (typeof CLASS_ICONS !== 'undefined' && CLASS_ICONS[name]) ? CLASS_ICONS[name] + ' ' : '';
  container.innerHTML = getMergedClasses().map(c => `
    <button class="choice-card" data-class="${c.name}">
      <span class="choice-icon">${classIcon(c.name)}</span>
      <span class="choice-title">${c.name}</span>
      <span class="choice-meta">d${c.hitDie} hit die · ${(c.primaryAbility || []).join(', ')}</span>
    </button>
  `).join('');
  const renderClassInfo = (cls) => {
    if (!cls) return '';
    const features = typeof CLASS_FEATURES_BY_LEVEL !== 'undefined' ? CLASS_FEATURES_BY_LEVEL[cls.name] : null;
    let featuresHtml = '';
    if (features) {
      const rows = Object.entries(features).map(([lvl, feat]) => `<tr><td>${lvl}</td><td>${feat}</td></tr>`).join('');
      featuresHtml = `<div class="class-features-table-wrap"><h5>Features by Level</h5><table class="class-features-table"><thead><tr><th>Lvl</th><th>Feature</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }
    const icon = typeof CLASS_ICONS !== 'undefined' && CLASS_ICONS[cls.name] ? CLASS_ICONS[cls.name] + ' ' : '';
    return `
      <h4>${icon}${cls.name}</h4>
      <p>${cls.description}</p>
      <p><strong>Hit Die:</strong> d${cls.hitDie}</p>
      <p><strong>Primary Ability:</strong> ${(cls.primaryAbility || []).join(', ')}</p>
      <p><strong>Saving Throws:</strong> ${(cls.savingThrows || []).join(', ')}</p>
      ${featuresHtml}
    `;
  };
  container.querySelectorAll('.choice-card').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.choice-card').forEach(c => c.classList.remove('selected'));
      btn.classList.add('selected');
      currentChar.class = btn.dataset.class;
      currentChar.subclass = '';
      const cls = getMergedClasses().find(c => c.name === currentChar.class);
      infoPanel.innerHTML = renderClassInfo(cls);
    });
  });
  const selected = getMergedClasses().find(c => c.name === currentChar.class);
  if (selected) {
    const btn = container.querySelector(`[data-class="${selected.name}"]`);
    if (btn) btn.classList.add('selected');
    infoPanel.innerHTML = renderClassInfo(selected);
  }
}

function renderSubclassStep() {
  const container = document.getElementById('subclass-choices');
  const infoPanel = document.getElementById('subclass-info');
  const cls = getMergedClasses().find(c => c.name === currentChar.class);
  const charLevel = currentChar.level || 1;
  const subclasses = (cls?.subclasses || []).filter(s => (s.level || 1) <= charLevel);
  if (subclasses.length === 0) {
    const allSubs = cls?.subclasses || [];
    const minLevel = allSubs.length ? Math.min(...allSubs.map(s => s.level || 1)) : 1;
    container.innerHTML = `<p class="subclass-hint">No subclasses available at level ${charLevel}. ${minLevel > charLevel ? `Choose subclass at level ${minLevel} or higher.` : 'This class has no subclasses.'}</p>`;
    if (infoPanel) infoPanel.innerHTML = '';
    currentChar.subclass = '';
  } else {
  container.innerHTML = subclasses.map(s => `
    <button class="choice-card" data-subclass="${s.name}">
      <span class="choice-title">${s.name}</span>
      <span class="choice-meta">Level ${s.level}</span>
    </button>
  `).join('');
  const renderSubclassInfo = (sub) => {
    if (!sub) return '';
    const key = `${currentChar.class}|${sub.name}`;
    const features = typeof SUBCLASS_FEATURES_BY_LEVEL !== 'undefined' ? SUBCLASS_FEATURES_BY_LEVEL[key] : null;
    let html = `<h4>${sub.name}</h4><p>${sub.description}</p>`;
    if (features && Object.keys(features).length) {
      const levels = Object.keys(features).map(Number).sort((a, b) => a - b);
      html += `<div class="subclass-progression"><h5>Features by level</h5><ul class="feature-list">`;
      levels.forEach(lvl => {
        html += `<li><strong>Level ${lvl}:</strong> ${features[lvl]}</li>`;
      });
      html += `</ul></div>`;
    }
    return html;
  };
  container.querySelectorAll('.choice-card').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.choice-card').forEach(c => c.classList.remove('selected'));
      btn.classList.add('selected');
      currentChar.subclass = btn.dataset.subclass;
      const sub = subclasses.find(s => s.name === currentChar.subclass);
      infoPanel.innerHTML = renderSubclassInfo(sub);
    });
  });
  const sel = subclasses.find(s => s.name === currentChar.subclass);
  if (sel) {
    const btn = container.querySelector(`[data-subclass="${sel.name}"]`);
    if (btn) btn.classList.add('selected');
    infoPanel.innerHTML = renderSubclassInfo(sel);
  } else if (currentChar.subclass) {
    currentChar.subclass = '';
  }
  }
  const multiSection = document.getElementById('multiclass-section');
  const addMultiBtn = document.getElementById('add-multiclass-btn');
  const canMulticlass = (currentChar.level || 1) >= 2;
  if (multiSection) multiSection.hidden = !canMulticlass;
  if (addMultiBtn) addMultiBtn.hidden = !canMulticlass;
  if (!canMulticlass && currentChar.multiclass?.length) {
    currentChar.multiclass = [];
  }
  renderMulticlassList();
}

function renderMulticlassList() {
  const container = document.getElementById('multiclass-list');
  if (!container) return;
  const list = currentChar.multiclass || [];
  container.innerHTML = list.map((m, i) => `
    <div class="multiclass-row">
      <select class="multiclass-class" data-idx="${i}">
        ${getMergedClasses().filter(c => c.name !== currentChar.class).map(c => `<option value="${c.name}" ${c.name === m.name ? 'selected' : ''}>${c.name}</option>`).join('')}
      </select>
      <select class="multiclass-level" data-idx="${i}">
        ${[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19].map(l => `<option value="${l}" ${m.level === l ? 'selected' : ''}>${l}</option>`).join('')}
      </select>
      <button type="button" class="remove-item" data-idx="${i}">×</button>
    </div>
  `).join('');
  container.querySelectorAll('.multiclass-class').forEach(sel => {
    sel.onchange = () => {
      currentChar.multiclass[parseInt(sel.dataset.idx)].name = sel.value;
      renderMulticlassList();
    };
  });
  container.querySelectorAll('.multiclass-level').forEach(sel => {
    sel.onchange = () => {
      currentChar.multiclass[parseInt(sel.dataset.idx)].level = parseInt(sel.value);
      renderMulticlassList();
    };
  });
  container.querySelectorAll('.remove-item').forEach(btn => {
    btn.onclick = () => {
      currentChar.multiclass.splice(parseInt(btn.dataset.idx), 1);
      renderMulticlassList();
      updatePreview();
    };
  });
}

function renderBackgroundStep() {
  const container = document.getElementById('background-choices');
  const infoPanel = document.getElementById('background-info');
  container.innerHTML = getMergedBackgrounds().map(b => `
    <button class="choice-card" data-background="${b.name}">
      <span class="choice-title">${b.name}</span>
      <span class="choice-meta">${(b.skillProficiencies || []).join(', ')}</span>
    </button>
  `).join('');
  container.querySelectorAll('.choice-card').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.choice-card').forEach(c => c.classList.remove('selected'));
      btn.classList.add('selected');
      currentChar.background = btn.dataset.background;
      const bg = getMergedBackgrounds().find(b => b.name === currentChar.background);
      infoPanel.innerHTML = bg ? `<h4>${bg.name}</h4><p>${bg.description}</p><p><strong>Skills:</strong> ${(bg.skillProficiencies || []).join(', ')}</p>` : '';
    });
  });
  const sel = getMergedBackgrounds().find(b => b.name === currentChar.background);
  if (sel) {
    const btn = container.querySelector(`[data-background="${sel.name}"]`);
    if (btn) btn.classList.add('selected');
    infoPanel.innerHTML = `<h4>${sel.name}</h4><p>${sel.description}</p>`;
  }
}

function renderAlignmentStep() {
  const container = document.getElementById('alignment-choices');
  const infoPanel = document.getElementById('alignment-info');
  container.innerHTML = ALIGNMENTS.map(a => `
    <button class="choice-card choice-small" data-alignment="${a.name}">
      <span class="choice-title">${a.short}</span>
      <span class="choice-sub">${a.name}</span>
    </button>
  `).join('');
  container.querySelectorAll('.choice-card').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.choice-card').forEach(c => c.classList.remove('selected'));
      btn.classList.add('selected');
      currentChar.alignment = btn.dataset.alignment;
      const align = ALIGNMENTS.find(a => a.name === currentChar.alignment);
      infoPanel.innerHTML = align ? `<h4>${align.name}</h4><p>${align.description}</p>` : '';
    });
  });
  const sel = ALIGNMENTS.find(a => a.name === currentChar.alignment);
  if (sel) {
    const btn = container.querySelector(`[data-alignment="${sel.name}"]`);
    if (btn) btn.classList.add('selected');
    infoPanel.innerHTML = `<h4>${sel.name}</h4><p>${sel.description}</p>`;
  }
}

function renderStatsStep(preserveStats = false) {
  const statsToUse = preserveStats && currentChar.stats ? { ...currentChar.stats } : getBaseStatsWithRaceBonuses();
  if (!preserveStats) currentChar.stats = { ...statsToUse };
  const grid = document.getElementById('stats-grid');
  grid.innerHTML = '';
  Object.entries(statsToUse).forEach(([stat, value]) => {
    const block = document.createElement('div');
    block.className = 'stat-block';
    const label = stat.charAt(0).toUpperCase() + stat.slice(1);
    const mod = Math.floor((value - 10) / 2);
    const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
    block.innerHTML = `
      <label class="stat-label">${label}</label>
      <div class="stat-input-group">
        <input type="number" min="1" max="30" class="stat-input" data-stat="${stat}" value="${value}">
        <div class="stat-modifier">${modStr}</div>
      </div>
    `;
    const input = block.querySelector('input');
    input.addEventListener('input', () => {
      const v = Math.max(1, Math.min(30, parseInt(input.value) || 10));
      currentChar.stats[stat] = v;
      block.querySelector('.stat-modifier').textContent = (v - 10) / 2 >= 0 ? `+${Math.floor((v - 10) / 2)}` : Math.floor((v - 10) / 2);
      updatePreview();
    });
    grid.appendChild(block);
  });
}

function renderSummaryStep() {
  const nameInput = document.getElementById('char-name');
  if (nameInput) currentChar.name = nameInput.value?.trim() || currentChar.name;
  const container = document.getElementById('character-summary');
  const char = currentChar;
  const formatMod = (s) => {
    const v = char.stats?.[s] || 10;
    const m = Math.floor((v - 10) / 2);
    return m >= 0 ? `+${m}` : `${m}`;
  };
  const ac = typeof calculateAC === 'function' ? calculateAC(char) : 10;
  const section = (title, items, className = 'list-item') =>
    (items || []).length ? `<div class="display-section"><h4>${title}</h4><div class="list-items">${items.map(x => `<span class="${className}">${esc(x)}</span>`).join('')}</div></div>` : '';
  const statsHtml = Object.entries(char.stats || {}).map(([s, v]) => `
    <div class="stat-display-item">
      <div class="stat-name">${s.slice(0, 3).toUpperCase()}</div>
      <div class="stat-value">${v}</div>
      <div class="stat-mod">${formatMod(s)}</div>
    </div>
  `).join('');
  container.innerHTML = `
    <div class="character-display">
      <div class="display-header"><h3>${char.name || 'Unnamed Character'}</h3></div>
      <div class="display-content">
        <div class="display-section">
          <h4>Basic Information</h4>
          <div class="info-grid">
            <div class="info-item"><span class="info-label">AC:</span><span class="info-value">${ac}</span></div>
            ${char.race ? `<div class="info-item"><span class="info-label">Race:</span><span class="info-value">${char.race}${char.subrace ? ` (${char.subrace})` : ''}</span></div>` : ''}
            ${char.class ? `<div class="info-item"><span class="info-label">Class:</span><span class="info-value">${char.class}${char.subclass ? ` — ${char.subclass}` : ''}</span></div>` : ''}
            <div class="info-item"><span class="info-label">Level:</span><span class="info-value">${char.level || 1}</span></div>
            ${char.background ? `<div class="info-item"><span class="info-label">Background:</span><span class="info-value">${char.background}</span></div>` : ''}
            ${char.alignment ? `<div class="info-item"><span class="info-label">Alignment:</span><span class="info-value">${char.alignment}</span></div>` : ''}
          </div>
        </div>
        <div class="display-section">
          <h4>Ability Scores</h4>
          <div class="stats-display">${statsHtml}</div>
        </div>
        ${section('Languages', char.languages)}
        ${section('Damage Resistances', char.resistances, 'list-item list-item-resist')}
        ${section('Damage Immunities', char.immunities, 'list-item list-item-immune')}
        ${section('Damage Vulnerabilities', char.vulnerabilities, 'list-item list-item-vuln')}
        ${section('Weaknesses', char.weaknesses, 'list-item list-item-weak')}
        ${section('Skills', char.skills)}
        ${section('Equipment', char.equipment)}
        ${char.notes ? `<div class="display-section"><h4>Notes</h4><div class="notes-content">${char.notes}</div></div>` : ''}
      </div>
    </div>
  `;
}

// ========== ARRAY ITEM HELPERS ==========
/** Render a list of items (equipment, conditions, etc.) with remove buttons */
function renderArrayList(containerId, items, arrayName, displayFormatter) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const fmt = displayFormatter || ((x) => esc(x));
  container.innerHTML = '';
  (items || []).forEach((item, idx) => {
    const span = document.createElement('span');
    span.className = 'array-item';
    span.innerHTML = `${typeof fmt === 'function' ? fmt(item) : esc(item)} <button type="button" class="remove-item" data-idx="${idx}">×</button>`;
    container.appendChild(span);
  });
  container.querySelectorAll('.remove-item').forEach(btn => {
    btn.addEventListener('click', () => {
      currentChar[arrayName].splice(parseInt(btn.dataset.idx), 1);
      renderArrayList(containerId, currentChar[arrayName], arrayName);
      updatePreview();
    });
  });
}

function addArrayItem(inputId, listId, arrayName) {
  const input = document.getElementById(inputId);
  const val = input?.value?.trim();
  if (!val) return;
  if (!currentChar[arrayName]) currentChar[arrayName] = [];
  currentChar[arrayName].push(val);
  input.value = '';
  renderArrayList(listId, currentChar[arrayName], arrayName);
  updatePreview();
}

// ========== PREVIEW ==========
/** Format ability modifier as +N or -N */
function formatModifier(stat) {
  const mod = Math.floor((stat - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

function updatePreview() {
  if (!currentChar) return;
  const nameInput = document.getElementById('char-name');
  if (nameInput) currentChar.name = nameInput.value?.trim() || currentChar.name;
  const char = currentChar;
  const stats = char.stats || {};
  const statsHtml = Object.entries(stats).map(([stat, val]) => `
    <div class="stat-display-item">
      <div class="stat-name">${stat.slice(0, 3).toUpperCase()}</div>
      <div class="stat-value">${val}</div>
      <div class="stat-mod">${formatModifier(val)}</div>
    </div>
  `).join('');
  const ac = typeof calculateAC === 'function' ? calculateAC(char) : 10;
  const infoItems = [];
  infoItems.push(`<div class="info-item"><span class="info-label">AC:</span><span class="info-value">${ac}</span></div>`);
  if (char.race) infoItems.push(`<div class="info-item"><span class="info-label">Race:</span><span class="info-value">${char.race}${char.subrace ? ` (${char.subrace})` : ''}</span></div>`);
  if (char.class) infoItems.push(`<div class="info-item"><span class="info-label">Class:</span><span class="info-value">${char.class}</span></div>`);
  infoItems.push(`<div class="info-item"><span class="info-label">Level:</span><span class="info-value">${char.level || 1}</span></div>`);
  if (char.background) infoItems.push(`<div class="info-item"><span class="info-label">Background:</span><span class="info-value">${char.background}</span></div>`);
  const prevSection = (title, items, cls = 'list-item') =>
    (items || []).length ? `<div class="display-section"><h4>${title}</h4><div class="list-items">${items.map(x => `<span class="${cls}">${x}</span>`).join('')}</div></div>` : '';
  characterPreview.innerHTML = `
    <div class="character-display">
      <div class="display-header"><h3>${char.name || 'Unnamed'}</h3></div>
      <div class="display-content">
        <div class="display-section">
          <h4>Basic Info</h4>
          <div class="info-grid">${infoItems.join('')}</div>
        </div>
        <div class="display-section">
          <h4>Ability Scores</h4>
          <div class="stats-display">${statsHtml}</div>
        </div>
        ${prevSection('Languages', char.languages)}
        ${prevSection('Resistances', char.resistances, 'list-item list-item-resist')}
        ${prevSection('Immunities', char.immunities, 'list-item list-item-immune')}
        ${prevSection('Vulnerabilities', char.vulnerabilities, 'list-item list-item-vuln')}
        ${prevSection('Weaknesses', char.weaknesses, 'list-item list-item-weak')}
      </div>
    </div>
  `;
  if (currentStep === 9 && typeof updateStep9AcHint === 'function') updateStep9AcHint();
}

/** Apply race traits (languages, skills) when first entering step 9 if not yet set */
function applyRaceTraitsAndRenderStep9() {
  if (currentChar.race && typeof getRaceTraits === 'function') {
    const traits = getRaceTraits(currentChar.race, currentChar.subrace);
    if ((!currentChar.languages || currentChar.languages.length === 0) && traits.languages?.length) {
      currentChar.languages = [...traits.languages];
    }
    if ((!currentChar.resistances || currentChar.resistances.length === 0) && traits.resistances?.length) {
      currentChar.resistances = [...traits.resistances];
    }
    if ((!currentChar.immunities || currentChar.immunities.length === 0) && traits.immunities?.length) {
      currentChar.immunities = [...traits.immunities];
    }
    if ((!currentChar.vulnerabilities || currentChar.vulnerabilities.length === 0) && traits.vulnerabilities?.length) {
      currentChar.vulnerabilities = [...traits.vulnerabilities];
    }
    if ((!currentChar.weaknesses || currentChar.weaknesses.length === 0) && traits.weaknesses?.length) {
      currentChar.weaknesses = [...traits.weaknesses];
    }
  }
  if (currentChar.class && typeof CLASS_PROFICIENCIES !== 'undefined') {
    const profs = CLASS_PROFICIENCIES[currentChar.class];
    if (profs) {
      if (!currentChar.weaponProficiencies?.length) currentChar.weaponProficiencies = [...(profs.weapons || [])];
      if (!currentChar.armorProficiencies?.length) currentChar.armorProficiencies = [...(profs.armor || [])];
      if (!currentChar.toolProficiencies?.length) currentChar.toolProficiencies = [...(profs.tools || [])];
    }
  }
  /* Level is set in Step 4 (Class) */
  populateStep9Selects();
  renderSpellSelectionStep9();
  renderStep9Arrays();
  updateStep9AcHint();
  const isCaster = typeof isSpellcastingClass === 'function' && isSpellcastingClass(currentChar.class, currentChar.subclass);
  if (isCaster) {
    document.querySelectorAll('.step9-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.step9-tab-pane').forEach(p => p.classList.remove('active'));
    const spellsTab = document.querySelector('.step9-tab[data-tab="spells"]');
    const spellsPane = document.querySelector('.step9-tab-pane[data-pane="spells"]');
    if (spellsTab) spellsTab.classList.add('active');
    if (spellsPane) spellsPane.classList.add('active');
  }
}
function updateStep9AcHint() {
  const el = document.getElementById('step9-ac-hint');
  if (!el || !currentChar) return;
  const ac = typeof calculateAC === 'function' ? calculateAC(currentChar) : 10;
  el.textContent = `AC: ${ac} (from armor + Dex). Add armor/gear below to change.`;
}

function getMaxSpellLevel(charLevel) {
  if (charLevel < 1) return 0;
  return Math.min(9, Math.floor((charLevel + 1) / 2));
}

function renderSpellSelectionStep9() {
  const section = document.getElementById('spell-selection-section');
  const hint = document.getElementById('spell-selection-hint');
  const cantripSel = document.getElementById('cantrip-select');
  const slotsSummary = document.getElementById('spell-slots-summary');
  const pickRowsContainer = document.getElementById('spell-pick-rows-container');
  const cantripsChosen = document.getElementById('cantrips-chosen');
  if (!section || !cantripSel || !pickRowsContainer) return;

  const cfg = typeof getSpellsForClassLevel === 'function' ? getSpellsForClassLevel(currentChar.class, currentChar.level || 1, currentChar.subclass) : null;
  const isKnownCaster = cfg && (cfg.cantrips > 0 || (cfg.spells !== 'prepare' && cfg.spells > 0));
  const isPrepareCaster = cfg && cfg.spells === 'prepare';
  section.hidden = !isKnownCaster;
  const noCasterEl = document.getElementById('spell-no-caster');
  if (noCasterEl) noCasterEl.hidden = isKnownCaster;

  if (!isKnownCaster) return;

  const charLevel = currentChar.level || 1;
  const maxSpellLevel = getMaxSpellLevel(charLevel);
  const slots = typeof getSpellSlotsForLevel === 'function' ? getSpellSlotsForLevel(charLevel) : [0,0,0,0,0,0,0,0,0];
  const slotLabels = slots.map((n, i) => n > 0 ? `${i + 1}st: ${n}` : null).filter(Boolean);
  if (slotsSummary) {
    slotsSummary.innerHTML = slotLabels.length ? `<p class="spell-slots-hint"><strong>Spell slots at level ${charLevel}:</strong> ${slotLabels.join(', ')}. Some spells can be cast at higher levels for stronger effects.</p>` : '';
  }

  const classSpells = typeof getSpellsForClass === 'function' ? getSpellsForClass(currentChar.class, currentChar.subclass) : (typeof SPELLS !== 'undefined' ? SPELLS : []);
  const cantrips = classSpells.filter(s => s.level === 0);
  const known = currentChar.knownSpells || [];
  const chosenCantrips = known.filter(n => cantrips.find(s => s.name === n));
  const chosenSpells = known.filter(n => classSpells.find(s => s.name === n && s.level > 0));
  const needSpells = cfg?.spells === 'prepare' ? 0 : (typeof cfg?.spells === 'number' ? cfg.spells : 0);

  const levelRange = maxSpellLevel <= 1 ? '1st level' : `1st–${maxSpellLevel}${maxSpellLevel === 2 ? 'nd' : maxSpellLevel === 3 ? 'rd' : 'th'} level`;
  hint.textContent = cfg ? (isPrepareCaster ? `Choose ${cfg.cantrips || 0} cantrips. You prepare spells from your spell list each day.` : `Choose ${cfg.cantrips || 0} cantrips and ${needSpells} leveled spells (any combination of ${levelRange}).`) : '';

  cantripSel.innerHTML = '<option value="">— Choose cantrip —</option>' + cantrips.map(s => `<option value="${s.name}">${s.name}</option>`).join('');

  const leveledSpellsByLvl = {};
  for (let l = 1; l <= maxSpellLevel; l++) leveledSpellsByLvl[l] = classSpells.filter(s => s.level === l);

  let pickRowsHtml = '';
  for (let lvl = 1; lvl <= maxSpellLevel; lvl++) {
    const spellsAtLvl = leveledSpellsByLvl[lvl] || [];
    const ord = lvl === 1 ? 'st' : lvl === 2 ? 'nd' : lvl === 3 ? 'rd' : 'th';
    pickRowsHtml += `
      <div class="spell-pick-row spell-pick-row-lvl" data-level="${lvl}">
        <label>${lvl}${ord}-level spells:</label>
        <select class="spell-level-select" data-level="${lvl}">
          <option value="">— Choose spell —</option>
          ${spellsAtLvl.map(s => `<option value="${s.name}">${s.name}${s.higherLevel ? ' (↑ upcast)' : ''}</option>`).join('')}
        </select>
        <button type="button" class="btn btn-secondary btn-sm spell-level-add-btn" data-level="${lvl}">Add</button>
        <div class="array-items spell-level-chosen" data-level="${lvl}"></div>
      </div>`;
  }
  pickRowsContainer.innerHTML = isPrepareCaster ? '' : pickRowsHtml;

  const allLeveledSpells = classSpells.filter(s => s.level > 0 && s.level <= maxSpellLevel);
  const previewPanel = document.getElementById('spell-preview-panel');
  if (previewPanel) previewPanel.hidden = true;
  const showSpellPreview = (spellName) => {
    if (!previewPanel) return;
    const spell = spellName ? [...cantrips, ...allLeveledSpells].find(s => s.name === spellName) : null;
    if (!spell) {
      previewPanel.innerHTML = '';
      previewPanel.hidden = true;
      return;
    }
    previewPanel.hidden = false;
    const higherNote = spell.higherLevel ? `<p class="spell-preview-higher"><strong>At higher levels:</strong> ${esc(spell.higherLevel)}</p>` : '';
    previewPanel.innerHTML = `<div class="spell-preview-card"><strong>${esc(spell.name)}</strong> — ${spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`} ${spell.school}<p class="spell-preview-desc">${esc(spell.description)}</p>${higherNote}<small>${esc(spell.castTime)} · ${esc(spell.range)} · ${esc(spell.duration)}</small></div>`;
  };

  cantripSel.onfocus = () => { const v = cantripSel.value; if (v) showSpellPreview(v); };
  cantripSel.onchange = () => showSpellPreview(cantripSel.value || null);

  const renderChosen = (containerId, items, type) => {
    const c = document.getElementById(containerId);
    if (!c) return;
    c.innerHTML = items.map((name, idx) => `<span class="array-item">${name} <button type="button" class="remove-item" data-type="${type}" data-idx="${idx}">×</button></span>`).join('');
    c.querySelectorAll('.remove-item').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!currentChar.knownSpells) currentChar.knownSpells = [];
        const idx = parseInt(btn.dataset.idx);
        const arr = type === 'cantrip' ? chosenCantrips : chosenSpells;
        const name = arr[idx];
        currentChar.knownSpells = currentChar.knownSpells.filter(n => n !== name);
        renderSpellSelectionStep9();
        updatePreview();
      });
    });
  };
  renderChosen('cantrips-chosen', chosenCantrips, 'cantrip');

  const chosenByLevel = {};
  for (let l = 1; l <= maxSpellLevel; l++) chosenByLevel[l] = chosenSpells.filter(n => classSpells.find(s => s.name === n && s.level === l));

  pickRowsContainer.querySelectorAll('.spell-level-chosen').forEach(cont => {
    const lvl = parseInt(cont.dataset.level);
    const items = chosenByLevel[lvl] || [];
    cont.innerHTML = items.map((name, idx) => `<span class="array-item">${name} <button type="button" class="remove-item" data-level="${lvl}" data-idx="${idx}">×</button></span>`).join('');
    cont.querySelectorAll('.remove-item').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!currentChar.knownSpells) currentChar.knownSpells = [];
        const idx = parseInt(btn.dataset.idx);
        const arr = chosenByLevel[lvl] || [];
        const name = arr[idx];
        currentChar.knownSpells = currentChar.knownSpells.filter(n => n !== name);
        renderSpellSelectionStep9();
        updatePreview();
      });
    });
  });

  pickRowsContainer.querySelectorAll('.spell-level-select').forEach(sel => {
    sel.onfocus = () => { const v = sel.value; if (v) showSpellPreview(v); };
    sel.onchange = () => showSpellPreview(sel.value || null);
  });

  const addSpell = (sel, type, maxCount) => {
    const val = sel?.value?.trim();
    if (!val) return;
    const chosen = type === 'cantrip' ? chosenCantrips : chosenSpells;
    if (type !== 'cantrip' && chosen.length >= needSpells) return;
    if (type === 'cantrip' && chosen.length >= maxCount) return;
    if (!currentChar.knownSpells) currentChar.knownSpells = [];
    currentChar.knownSpells.push(val);
    if (sel) sel.value = '';
    renderSpellSelectionStep9();
    updatePreview();
  };

  const maxCantrips = cfg?.cantrips || 0;

  const cantripAddBtn = document.getElementById('cantrip-add-btn');
  if (cantripAddBtn) cantripAddBtn.onclick = () => { const v = cantripSel.value; if (v) showSpellPreview(v); addSpell(cantripSel, 'cantrip', maxCantrips); };

  pickRowsContainer.querySelectorAll('.spell-level-add-btn').forEach(btn => {
    const lvl = parseInt(btn.dataset.level);
    const sel = pickRowsContainer.querySelector(`.spell-level-select[data-level="${lvl}"]`);
    btn.onclick = () => {
      if (sel?.value) showSpellPreview(sel.value);
      addSpell(sel, 'spell', needSpells);
    };
  });
}

function populateStep9Selects() {
  const opts = (id, items, useIcons) => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const fmt = useIcons && typeof DAMAGE_TYPE_ICONS !== 'undefined' ? (x) => (DAMAGE_TYPE_ICONS[x] || '') + ' ' + x : (x) => x;
    sel.innerHTML = '<option value="">— Choose —</option>' + (items || []).map(x => `<option value="${esc(x)}">${fmt(x)}</option>`).join('');
  };
  opts('language-select', typeof LANGUAGES !== 'undefined' ? LANGUAGES : []);
  opts('resistance-select', typeof DAMAGE_TYPES !== 'undefined' ? DAMAGE_TYPES : [], true);
  opts('immunity-select', typeof DAMAGE_TYPES !== 'undefined' ? DAMAGE_TYPES : [], true);
  opts('vulnerability-select', typeof DAMAGE_TYPES !== 'undefined' ? DAMAGE_TYPES : [], true);
  opts('weakness-select', typeof COMMON_CONDITIONS !== 'undefined' ? COMMON_CONDITIONS : []);
  opts('skill-select', typeof SKILLS !== 'undefined' ? SKILLS : []);
  opts('equipment-select', (typeof getAllItems === 'function' ? getAllItems() : null) || (typeof COMMON_EQUIPMENT !== 'undefined' ? COMMON_EQUIPMENT : []));
  const weaponProfOpts = [...(typeof WEAPON_PROFICIENCY_CATEGORIES !== 'undefined' ? WEAPON_PROFICIENCY_CATEGORIES : []), 'Clubs', 'Daggers', 'Darts', 'Hand crossbows', 'Longswords', 'Rapiers', 'Shortswords', 'Quarterstaffs', 'Crossbows, light', 'Slings'];
  opts('weapon-prof-select', weaponProfOpts);
  opts('armor-prof-select', typeof ARMOR_PROFICIENCIES !== 'undefined' ? ARMOR_PROFICIENCIES : []);
  opts('tool-prof-select', typeof TOOL_PROFICIENCIES !== 'undefined' ? TOOL_PROFICIENCIES : []);
}

function renderStep9Arrays() {
  const dmgFmt = (x) => (typeof DAMAGE_TYPE_ICONS !== 'undefined' && DAMAGE_TYPE_ICONS[x] ? DAMAGE_TYPE_ICONS[x] + ' ' : '') + esc(x);
  renderArrayList('languages-list-items', currentChar?.languages, 'languages');
  renderArrayList('resistances-list', currentChar?.resistances, 'resistances', dmgFmt);
  renderArrayList('immunities-list', currentChar?.immunities, 'immunities', dmgFmt);
  renderArrayList('vulnerabilities-list', currentChar?.vulnerabilities, 'vulnerabilities', dmgFmt);
  renderArrayList('weaknesses-list', currentChar?.weaknesses, 'weaknesses');
  renderArrayList('skills-list', currentChar?.skills, 'skills');
  renderArrayList('equipment-list', currentChar?.equipment, 'equipment');
  renderArrayList('weapon-profs-list', currentChar?.weaponProficiencies, 'weaponProficiencies');
  renderArrayList('armor-profs-list', currentChar?.armorProficiencies, 'armorProficiencies');
  renderArrayList('tool-profs-list', currentChar?.toolProficiencies, 'toolProficiencies');
}

/** Copy step 9 form values into currentChar */
function syncDetailsFromForm() {
  const notesEl = document.getElementById('char-notes');
  if (notesEl) currentChar.notes = notesEl.value;
  /* Level is set in Step 4 */
  const physEl = document.getElementById('physical-appearance');
  if (physEl) currentChar.physicalAppearance = physEl.value;
  const ptEl = document.getElementById('personality-traits');
  if (ptEl) currentChar.personalityTraits = ptEl.value;
  const idealsEl = document.getElementById('ideals');
  if (idealsEl) currentChar.ideals = idealsEl.value;
  const bondsEl = document.getElementById('bonds');
  if (bondsEl) currentChar.bonds = bondsEl.value;
  const flawsEl = document.getElementById('flaws');
  if (flawsEl) currentChar.flaws = flawsEl.value;
}

// ========== VIEW SWITCHING ==========
function showListView() {
  const mainPlayer = document.getElementById('main-player-content');
  const dmPanel = document.getElementById('dm-panel');
  if (mainPlayer) mainPlayer.hidden = false;
  if (dmPanel) dmPanel.hidden = true;
  if (listView) listView.style.display = 'block';
  if (builderView) builderView.hidden = true;
  if (sessionView) sessionView.hidden = true;
  if (battleMapView) battleMapView.hidden = true;
  renderCharacterList();
}

function suggestMaxHp(char) {
  if (char.maxHp != null) return;
  const totalLevel = getTotalLevel(char);
  const conMod = Math.floor(((char.stats?.constitution || 10) - 10) / 2);
  let total = 0;
  const primary = getMergedClasses().find(x => x.name === char.class);
  if (primary?.hitDie) {
    const avgPerLevel = (primary.hitDie + 1) / 2;
    const primaryLevel = char.level || 1;
    total = primary.hitDie + conMod + (primaryLevel - 1) * (avgPerLevel + conMod);
  }
  (char.multiclass || []).forEach(m => {
    const cls = getMergedClasses().find(x => x.name === m.name);
    if (cls?.hitDie) {
      const avgPerLevel = (cls.hitDie + 1) / 2;
      total += m.level * (avgPerLevel + conMod);
    }
  });
  char.maxHp = Math.max(1, total);
  char.hp = char.maxHp;
}

function showSessionView(char) {
  sessionCharacter = characters.find(c => c.id === char.id) || char;
  suggestMaxHp(sessionCharacter);
  const mainPlayer = document.getElementById('main-player-content');
  const dmPanel = document.getElementById('dm-panel');
  if (mainPlayer) mainPlayer.hidden = false;
  if (dmPanel) dmPanel.hidden = true;
  listView.style.display = 'none';
  builderView.hidden = true;
  sessionView.hidden = false;
  battleMapView.hidden = true;

  document.getElementById('session-char-name').textContent = sessionCharacter.name || 'Unnamed';
  renderSessionOverview();
  renderSessionCombat();
  renderSessionAttacks();
  renderSessionSpells();
  renderSessionInventory();
  renderSessionLeveling();
  switchSessionTab('character');
}

function getTotalLevel(c) {
  if (!c) return 1;
  const primary = c.level || 1;
  const multi = (c.multiclass || []).reduce((s, m) => s + (m.level || 0), 0);
  return Math.min(20, primary + multi);
}

function getPrimaryClass(c) {
  if (!c) return '';
  return c.class || (c.multiclass?.[0]?.name) || '';
}

function switchSessionTab(tabId) {
  document.querySelectorAll('.session-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.session-pane').forEach(p => p.classList.remove('active'));
  const tab = document.querySelector(`.session-tab[data-tab="${tabId}"]`);
  const pane = document.getElementById(`pane-${tabId}`);
  if (tab) tab.classList.add('active');
  if (pane) pane.classList.add('active');
}

function applyOverviewSectionOrder(className) {
  const container = document.getElementById('overview-sections');
  if (!container) return;
  const customOrder = sessionCharacter?.sectionOrder;
  const defaultOrder = (typeof SECTION_ORDER_BY_CLASS !== 'undefined' ? SECTION_ORDER_BY_CLASS[className] : null) || (typeof SECTION_ORDER_DEFAULT !== 'undefined' ? SECTION_ORDER_DEFAULT : ['saves', 'ability-checks', 'senses', 'skills', 'about', 'defenses', 'conditions']);
  const order = (customOrder && customOrder.length > 0) ? customOrder : defaultOrder;
  const sections = Array.from(container.querySelectorAll('.collapsible-section'));
  sections.forEach((el, i) => {
    const id = el.dataset.section;
    const idx = order.indexOf(id);
    el.style.order = idx >= 0 ? idx : 999;
    el.draggable = true;
    el.dataset.sectionId = id;
  });
  initSectionDragDrop();
}

function initSectionDragDrop() {
  const container = document.getElementById('overview-sections');
  if (!container) return;
  let dragged = null;
  container.querySelectorAll('.collapsible-section').forEach(section => {
    section.ondragstart = (e) => { dragged = section; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', section.dataset.sectionId); section.classList.add('dragging'); };
    section.ondragend = () => { section.classList.remove('dragging'); dragged = null; };
    section.ondragover = (e) => { e.preventDefault(); if (dragged && dragged !== section) section.classList.add('drag-over'); };
    section.ondragleave = () => section.classList.remove('drag-over');
    section.ondrop = (e) => {
      e.preventDefault();
      section.classList.remove('drag-over');
      if (!dragged || dragged === section || !sessionCharacter) return;
      const order = Array.from(container.querySelectorAll('.collapsible-section')).map(s => s.dataset.sectionId);
      const fromIdx = order.indexOf(dragged.dataset.sectionId);
      const toIdx = order.indexOf(section.dataset.sectionId);
      if (fromIdx < 0 || toIdx < 0) return;
      order.splice(fromIdx, 1);
      order.splice(toIdx, 0, dragged.dataset.sectionId);
      sessionCharacter.sectionOrder = order;
      saveCharacters();
      applyOverviewSectionOrder(getPrimaryClass(sessionCharacter));
    };
  });
}

const SECTION_DISPLAY_LEGACY = { block: 'full', skinny: 'compact', column: 'half' };

function applySheetLayout() {
  const container = document.getElementById('overview-sections');
  if (!container || !sessionCharacter) return;
  const layout = sessionCharacter.sheetLayout || { overall: 'single', sections: {} };
  container.classList.toggle('layout-columns', layout.overall === 'columns');
  container.querySelectorAll('.collapsible-section').forEach(section => {
    const id = section.dataset.section;
    let mode = layout.sections?.[id] || 'full';
    if (SECTION_DISPLAY_LEGACY[mode]) mode = SECTION_DISPLAY_LEGACY[mode];
    section.classList.remove('section-full', 'section-compact', 'section-half');
    section.classList.add('section-' + mode);
  });
}

function initCollapsibleSections() {
  document.querySelectorAll('.collapsible-section .section-toggle').forEach(btn => {
    btn.onclick = () => {
      const section = btn.closest('.collapsible-section');
      const icon = btn.querySelector('.toggle-icon');
      const expanded = section?.classList.toggle('collapsed');
      if (icon) icon.textContent = expanded ? '▶' : '▼';
      btn.setAttribute('aria-expanded', !expanded);
      const key = 'dnd_section_' + (section?.dataset.section || '');
      try { localStorage.setItem(key, expanded ? '1' : '0'); } catch (e) {}
    };
  });
  document.querySelectorAll('.collapsible-section').forEach(section => {
    const key = 'dnd_section_' + (section.dataset.section || '');
    try {
      const saved = localStorage.getItem(key);
      if (saved === '1') {
        section.classList.add('collapsed');
        const icon = section.querySelector('.toggle-icon');
        if (icon) icon.textContent = '▶';
        section.querySelector('.section-toggle')?.setAttribute('aria-expanded', 'false');
      }
    } catch (e) {}
  });
}

function getStatBreakdown(c, stat) {
  const total = c.stats?.[stat] ?? 10;
  const race = getMergedRaces().find(r => r.name === c.race);
  const subrace = race?.subraces?.find(s => s.name === c.subrace);
  let raceBonus = 0;
  [race?.abilityScore, subrace?.abilityScore].forEach(bonus => {
    if (!bonus) return;
    const val = bonus[stat];
    if (val != null) raceBonus += val;
  });
  const base = Math.max(1, total - raceBonus);
  const mod = Math.floor((total - 10) / 2);
  const parts = [];
  if (raceBonus !== 0) parts.push(`Base ${base} + Race ${raceBonus >= 0 ? '+' : ''}${raceBonus}`);
  else parts.push(`Base ${base}`);
  parts.push(`= ${total}`);
  return { base, raceBonus, total, mod, parts };
}

function renderSessionOverview() {
  const c = sessionCharacter;
  const cls = getMergedClasses().find(x => x.name === c.class);
  const race = getMergedRaces().find(r => r.name === c.race);
  const speed = c.speed ?? race?.speed ?? 30;
  const dexMod = Math.floor(((c.stats?.dexterity || 10) - 10) / 2);
  const init = c.initiative ?? (dexMod >= 0 ? `+${dexMod}` : `${dexMod}`);

  const profBonus = Math.floor(getTotalLevel(c) / 4) + 2;
  document.getElementById('qs-name').textContent = c.name || 'Unnamed';
  const classStr = c.class ? (c.class + (c.subclass ? ` ${c.subclass}` : '')) : '—';
  const multiStr = (c.multiclass || []).length ? ' / ' + (c.multiclass || []).map(m => `${m.name} ${m.level}`).join(', ') : '';
  const totalLvl = getTotalLevel(c);
  document.getElementById('qs-identity').textContent = `${c.race || '—'}${c.subrace ? ` (${c.subrace})` : ''} · ${classStr}${multiStr} · Level ${totalLvl}${c.background ? ` · ${c.background}` : ''}`;
  const qsProf = document.getElementById('qs-prof');
  if (qsProf) qsProf.textContent = profBonus >= 0 ? `+${profBonus}` : `${profBonus}`;
  const ac = calculateAC(c);
  document.getElementById('qs-ac').textContent = ac;
  document.getElementById('qs-ac').title = `Armor Class (calculated from equipment)`;
  const debuff = getDebuffEffects(c);
  const effectiveMaxHp = c.maxHp != null ? Math.floor((c.maxHp ?? 0) * debuff.hpMaxMultiplier) : null;
  const effectiveSpeed = Math.floor(speed * debuff.speedMultiplier);
  document.getElementById('qs-hp').textContent = c.maxHp != null
    ? `${c.hp ?? c.maxHp}/${effectiveMaxHp ?? c.maxHp}${debuff.hpMaxMultiplier < 1 ? ' (max halved)' : ''}${c.tempHp ? ` (+${c.tempHp} temp)` : ''}`
    : '—';
  document.getElementById('qs-speed').textContent = `${effectiveSpeed} ft${debuff.speedMultiplier < 1 ? ' (reduced)' : ''}`;
  document.getElementById('qs-init').textContent = init;
  const saveProfs = (cls?.savingThrows || []).map(s => s.toLowerCase().slice(0, 3));
  const statToSave = { strength: 'str', dexterity: 'dex', constitution: 'con', intelligence: 'int', wisdom: 'wis', charisma: 'cha' };
  const savesDisadv = debuff.savesDisadvantage;
  const savesHtml = Object.entries(c.stats || {}).map(([stat, val]) => {
    const mod = Math.floor((val - 10) / 2);
    const isProf = saveProfs.includes(statToSave[stat] || stat.slice(0, 3));
    const total = mod + (isProf ? profBonus : 0);
    const totalStr = total >= 0 ? `+${total}` : `${total}`;
    const label = (stat.charAt(0).toUpperCase() + stat.slice(1)).slice(0, 3);
    const bd = getStatBreakdown(c, stat);
    const breakdownTip = bd.parts.join(' = ') + ` → Mod ${bd.mod >= 0 ? '+' : ''}${bd.mod}` + (savesDisadv ? ' (disadvantage)' : '');
    const disadvBadge = savesDisadv ? '<span class="debuff-badge" title="Saving throws at disadvantage">dis adv</span>' : '';
    return `<div class="stat-display-item stat-rollable ${savesDisadv ? 'has-disadvantage' : ''}" title="${breakdownTip}"><div class="stat-name">${label}</div><div class="stat-mod">${totalStr}</div>${disadvBadge}<button type="button" class="btn btn-sm btn-roll" data-ability="${stat}" data-save="1">Roll</button></div>`;
  }).join('');
  const savesEl = document.getElementById('session-saves-display');
  if (savesEl) {
    savesEl.innerHTML = savesHtml;
    savesEl.querySelectorAll('.btn-roll').forEach(btn => {
      btn.addEventListener('click', () => {
        const c2 = sessionCharacter;
        const mod = Math.floor(((c2.stats?.[btn.dataset.ability] || 10) - 10) / 2);
        const ab = btn.dataset.ability;
        const abCap = ab ? ab.charAt(0).toUpperCase() + ab.slice(1) : '';
        const isProf = (getMergedClasses().find(x => x.name === c2.class)?.savingThrows || []).includes(abCap);
        const totalMod = mod + (isProf ? profBonus : 0);
        const debuff = getDebuffEffects(c2);
        showDiceRoll(btn.dataset.ability, 'ability', null, totalMod, debuff.savesDisadvantage);
      });
    });
  }

  const getPassive = (skill) => {
    const ability = typeof SKILL_ABILITY_MAP !== 'undefined' ? (SKILL_ABILITY_MAP[skill] || 'wisdom') : 'wisdom';
    const mod = Math.floor(((c.stats?.[ability] || 10) - 10) / 2);
    const isProf = (c.skills || []).includes(skill) || (c.proficiencies || []).includes(skill);
    return 10 + mod + (isProf ? profBonus : 0);
  };
  const ppEl = document.getElementById('passive-perception');
  if (ppEl) ppEl.textContent = getPassive('Perception');
  const piEl = document.getElementById('passive-investigation');
  if (piEl) piEl.textContent = getPassive('Investigation');
  const pinsEl = document.getElementById('passive-insight');
  if (pinsEl) pinsEl.textContent = getPassive('Insight');

  const statNames = { strength: 'STR', dexterity: 'DEX', constitution: 'CON', intelligence: 'INT', wisdom: 'WIS', charisma: 'CHA' };
  const abilityDisadv = debuff.abilityChecksDisadvantage;
  const statsHtml = Object.entries(c.stats || {}).map(([stat, val]) => {
    const bd = getStatBreakdown(c, stat);
    const modStr = bd.mod >= 0 ? `+${bd.mod}` : `${bd.mod}`;
    const label = statNames[stat] || stat.slice(0, 3).toUpperCase();
    const breakdownTip = bd.parts.join(' = ') + ` → Mod ${bd.mod >= 0 ? '+' : ''}${bd.mod}` + (abilityDisadv ? ' (disadvantage)' : '');
    const disadvBadge = abilityDisadv ? '<span class="debuff-badge" title="Ability checks at disadvantage">dis adv</span>' : '';
    return `<div class="stat-display-item stat-rollable stat-with-breakdown ${abilityDisadv ? 'has-disadvantage' : ''}" title="${breakdownTip}"><div class="stat-name">${label}</div><div class="stat-value">${val}</div><div class="stat-mod">${modStr}</div>${disadvBadge}<div class="stat-breakdown">${bd.parts.join(' = ')}</div><button type="button" class="btn btn-sm btn-roll" data-ability="${stat}">Roll</button></div>`;
  }).join('');
  const statsEl = document.getElementById('session-stats-display');
  if (statsEl) {
    statsEl.innerHTML = statsHtml;
    statsEl.querySelectorAll('.btn-roll').forEach(btn => {
      btn.addEventListener('click', () => {
        const debuff = getDebuffEffects(c);
        showDiceRoll(btn.dataset.ability, 'ability', null, undefined, debuff.abilityChecksDisadvantage);
      });
    });
  }

  applyOverviewSectionOrder(getPrimaryClass(c));
  const layoutSel = document.getElementById('sheet-layout-overall');
  if (layoutSel) layoutSel.value = (c.sheetLayout?.overall || 'single');
  applySheetLayout();
  initCollapsibleSections();

  const skillsToShow = typeof SKILLS !== 'undefined' ? SKILLS : [];
  const skillsRollHtml = skillsToShow.map(skill => {
    const ability = typeof SKILL_ABILITY_MAP !== 'undefined' ? (SKILL_ABILITY_MAP[skill] || 'strength') : 'strength';
    return `<button type="button" class="btn btn-sm btn-skill-roll" data-skill="${skill}" data-ability="${ability}">${skill}</button>`;
  }).join('');
  const skillsRollEl = document.getElementById('session-skills-roll');
  if (skillsRollEl) {
    skillsRollEl.innerHTML = skillsRollHtml;
    skillsRollEl.querySelectorAll('.btn-skill-roll').forEach(btn => {
      btn.addEventListener('click', () => {
        const debuff = getDebuffEffects(c);
        showDiceRoll(btn.dataset.skill, 'skill', btn.dataset.ability, undefined, debuff.abilityChecksDisadvantage);
      });
    });
  }

  const skillsToDisplay = typeof SKILLS !== 'undefined' ? SKILLS : [];
  const skillsDisplay = document.getElementById('session-skills-display');
  if (skillsDisplay) {
    skillsDisplay.innerHTML = skillsToDisplay.length ? skillsToDisplay.map(skill => {
      const ability = typeof SKILL_ABILITY_MAP !== 'undefined' ? (SKILL_ABILITY_MAP[skill] || 'strength') : 'strength';
      const mod = Math.floor(((c.stats?.[ability] || 10) - 10) / 2);
      const isProf = (c.skills || []).includes(skill) || (c.proficiencies || []).includes(skill);
      const total = mod + (isProf ? profBonus : 0);
      const totalStr = total >= 0 ? `+${total}` : `${total}`;
      return `<span class="skill-item ${isProf ? 'proficient' : ''}" title="${skill}: ${totalStr}${isProf ? ' (proficient)' : ''}">${skill} ${totalStr}</span>`;
    }).join('') : '<span class="list-item muted">None</span>';
  }

  const aboutParts = [];
  if (c.physicalAppearance) aboutParts.push(`<p><strong>Appearance:</strong> ${esc(c.physicalAppearance)}</p>`);
  if (c.personalityTraits) aboutParts.push(`<p><strong>Personality:</strong> ${esc(c.personalityTraits)}</p>`);
  if (c.ideals) aboutParts.push(`<p><strong>Ideals:</strong> ${esc(c.ideals)}</p>`);
  if (c.bonds) aboutParts.push(`<p><strong>Bonds:</strong> ${esc(c.bonds)}</p>`);
  if (c.flaws) aboutParts.push(`<p><strong>Flaws:</strong> ${esc(c.flaws)}</p>`);
  const aboutEl = document.getElementById('session-about-display');
  if (aboutEl) aboutEl.innerHTML = aboutParts.length ? aboutParts.join('') : '<span class="list-item muted">None added</span>';

  const res = c.resistances || [];
  const imm = c.immunities || [];
  const vuln = c.vulnerabilities || [];
  const weak = c.weaknesses || [];
  const defenses = [
    ...res.map(r => `<span class="list-item list-item-resist">Resist: ${esc(r)}</span>`),
    ...imm.map(i => `<span class="list-item list-item-immune">Immune: ${esc(i)}</span>`),
    ...vuln.map(v => `<span class="list-item list-item-vuln">Vulnerable: ${esc(v)}</span>`),
    ...weak.map(w => `<span class="list-item list-item-weak">${esc(w)}</span>`)
  ];
  const defensesEl = document.getElementById('session-defenses-display');
  if (defensesEl) defensesEl.innerHTML = defenses.length ? defenses.join('') : '<span class="list-item muted">None</span>';

  const conds = c.conditions || [];
  const condsEl = document.getElementById('session-conditions-display');
  if (condsEl) condsEl.innerHTML = conds.length
    ? conds.map(x => `<span class="list-item">${esc(x)}</span>`).join('')
    : '<span class="list-item muted">None</span>';

  const featuresEl = document.getElementById('session-features-display');
  if (featuresEl) {
    const totalLevel = getTotalLevel(c);
    const primaryClass = c.class || '';
    const featuresByLevel = typeof CLASS_FEATURES_BY_LEVEL !== 'undefined' ? CLASS_FEATURES_BY_LEVEL[primaryClass] : null;
    const subclassKey = c.subclass ? `${primaryClass}|${c.subclass}` : null;
    const subclassFeatures = (c.subclass && typeof SUBCLASS_FEATURES_BY_LEVEL !== 'undefined') ? SUBCLASS_FEATURES_BY_LEVEL[subclassKey] : null;
    const race = getMergedRaces().find(r => r.name === c.race);
    const raceTraits = (race?.traits || []).map(t => `<span class="feature-item">${t}</span>`);
    let classFeatures = [];
    if (featuresByLevel) {
      for (let lvl = 1; lvl <= totalLevel; lvl++) {
        const feat = featuresByLevel[lvl];
        if (feat) classFeatures.push(`<span class="feature-item"><strong>Lvl ${lvl}:</strong> ${feat}</span>`);
      }
    }
    let subFeatures = [];
    if (subclassFeatures) {
      for (let lvl = 1; lvl <= totalLevel; lvl++) {
        const feat = subclassFeatures[lvl];
        if (feat) subFeatures.push(`<span class="feature-item feature-item-subclass"><strong>Lvl ${lvl} (${c.subclass}):</strong> ${feat}</span>`);
      }
    }
    const all = [...raceTraits, ...classFeatures, ...subFeatures];
    featuresEl.innerHTML = all.length ? all.join('') : '<span class="list-item muted">None</span>';
  }
}

/** Show dice roll overlay with d20 animation; supports ability checks, saves, initiative */
function showDiceRoll(label, type, abilityKey, overrideMod, disadvantage) {
  const c = sessionCharacter;
  const overlay = document.getElementById('dice-roll-overlay');
  const labelEl = document.getElementById('dice-result-label');
  const faceEl = document.getElementById('dice-face');
  const textEl = document.getElementById('dice-result-text');
  if (!overlay || !labelEl || !faceEl || !textEl) return;

  const debuff = typeof getDebuffEffects === 'function' ? getDebuffEffects(c) : {};
  const useDisadvantage = !!disadvantage || (type === 'ability' && debuff.abilityChecksDisadvantage) ||
    (label && String(label).toLowerCase().includes('save') && debuff.savesDisadvantage);

  let mod = 0;
  if (overrideMod !== undefined && overrideMod !== null) {
    mod = overrideMod;
    labelEl.textContent = (label.charAt(0).toUpperCase() + label.slice(1)) + ' Save';
  } else if (type === 'ability') {
    const val = c.stats?.[label] || 10;
    mod = Math.floor((val - 10) / 2);
    labelEl.textContent = (label.charAt(0).toUpperCase() + label.slice(1)) + ' Check';
  } else {
    const ability = abilityKey || (typeof SKILL_ABILITY_MAP !== 'undefined' ? SKILL_ABILITY_MAP[label] : 'strength');
    const val = c.stats?.[ability] || 10;
    mod = Math.floor((val - 10) / 2);
    const profBonus = Math.floor((typeof getTotalLevel === 'function' ? getTotalLevel(c) : (c.level || 1)) / 4) + 2;
    const isProficient = (c.skills || []).includes(label) || (c.proficiencies || []).includes(label);
    if (isProficient) mod += profBonus;
    labelEl.textContent = label + ' Check';
  }

  overlay.hidden = false;
  overlay.style.display = 'flex';
  faceEl.textContent = '?';
  textEl.textContent = useDisadvantage ? 'Rolling (disadvantage)...' : 'Rolling...';

  const roll = () => Math.floor(Math.random() * 20) + 1;
  let natural, total;
  if (useDisadvantage) {
    const r1 = roll();
    const r2 = roll();
    natural = Math.min(r1, r2);
    total = natural + mod;
  } else {
    natural = roll();
    total = natural + mod;
  }

  let frame = 0;
  const animate = () => {
    frame++;
    faceEl.textContent = Math.floor(Math.random() * 20) + 1;
    if (frame < 24) requestAnimationFrame(animate);
    else {
      faceEl.textContent = natural;
      const disLabel = useDisadvantage ? ' (disadv)' : '';
      textEl.textContent = `d20${disLabel}: ${natural} ${mod >= 0 ? '+' : ''}${mod} = ${total}`;
    }
  };
  requestAnimationFrame(animate);

  const closeOverlay = () => {
    overlay.hidden = true;
    overlay.style.display = 'none';
    overlay.onclick = null;
    document.removeEventListener('keydown', onEscape);
  };
  const onEscape = (e) => { if (e.key === 'Escape') closeOverlay(); };
  overlay.onclick = closeOverlay;
  document.addEventListener('keydown', onEscape);
}

/** Parse dice expression (e.g. 2d6+3), roll, show result; optionally log to spell panel */
function showDamageRoll(label, diceExpr, addMod, isHealing, spellNameForLog) {
  const c = sessionCharacter;
  const overlay = document.getElementById('dice-roll-overlay');
  const labelEl = document.getElementById('dice-result-label');
  const faceEl = document.getElementById('dice-face');
  const textEl = document.getElementById('dice-result-text');
  if (!overlay || !labelEl || !faceEl || !textEl) return;

  const m = (diceExpr || '').match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!m) return;

  const num = parseInt(m[1], 10);
  const sides = parseInt(m[2], 10);
  const flat = m[3] ? parseInt(m[3], 10) : 0;

  let mod = 0;
  if (addMod && c) {
    const cls = (c.class || '').toLowerCase();
    const ability = cls === 'wizard' || cls === 'artificer' ? 'intelligence' :
      cls === 'cleric' || cls === 'druid' || cls === 'ranger' ? 'wisdom' :
      cls === 'bard' || cls === 'sorcerer' || cls === 'warlock' || cls === 'paladin' ? 'charisma' : 'wisdom';
    const val = c.stats?.[ability] ?? 10;
    mod = Math.floor((val - 10) / 2);
  }

  labelEl.textContent = label || (isHealing ? 'Healing' : 'Damage');
  overlay.hidden = false;
  overlay.style.display = 'flex';
  faceEl.textContent = '?';
  textEl.textContent = 'Rolling...';

  let total = flat + mod;
  const rolls = [];
  for (let i = 0; i < num; i++) {
    const r = Math.floor(Math.random() * sides) + 1;
    rolls.push(r);
    total += r;
  }

  let frame = 0;
  const animate = () => {
    frame++;
    faceEl.textContent = Math.floor(Math.random() * sides) + 1;
    if (frame < 20) requestAnimationFrame(animate);
    else {
      faceEl.textContent = total;
      const rollStr = rolls.join(' + ');
      let detail = `${diceExpr}: (${rollStr})`;
      if (flat) detail += ` + ${flat}`;
      if (mod) detail += ` ${mod >= 0 ? '+' : ''}${mod} mod`;
      detail += ` = ${total}`;
      textEl.textContent = detail;
      if (spellNameForLog) {
        const logEl = document.getElementById('spell-last-roll');
        if (logEl) {
          const spellLabel = spellNameForLog ? `${spellNameForLog} — ` : '';
          logEl.innerHTML = `<div class="spell-roll-log-entry"><strong>${spellLabel}${label || (isHealing ? 'Healing' : 'Damage')}</strong><br>${detail}</div>`;
          logEl.hidden = false;
        }
      }
    }
  };
  requestAnimationFrame(animate);

  const closeOverlay = () => {
    overlay.hidden = true;
    overlay.style.display = 'none';
    overlay.onclick = null;
    document.removeEventListener('keydown', onEscape);
  };
  const onEscape = (e) => { if (e.key === 'Escape') closeOverlay(); };
  overlay.onclick = closeOverlay;
  document.addEventListener('keydown', onEscape);
}

function renderSessionCombat() {
  const c = sessionCharacter;
  const totalLevel = getTotalLevel(c);
  const profBonus = Math.floor(totalLevel / 4) + 2;
  document.getElementById('prof-bonus').textContent = `+${profBonus}`;
  document.getElementById('inspiration-check').checked = !!c.inspiration;
  document.getElementById('inspiration-check').onchange = () => {
    sessionCharacter.inspiration = document.getElementById('inspiration-check').checked;
    saveCharacters();
  };

  const exhaustionEl = document.getElementById('exhaustion-level');
  if (exhaustionEl) {
    exhaustionEl.value = String(c.exhaustion ?? 0);
    exhaustionEl.onchange = () => {
      sessionCharacter.exhaustion = parseInt(exhaustionEl.value) || 0;
      saveCharacters();
      renderSessionOverview();
    };
  }

  const dexMod = Math.floor(((c.stats?.dexterity || 10) - 10) / 2);
  const initVal = c.initiative ?? dexMod;
  const initEl = document.getElementById('combat-init-value');
  if (initEl) initEl.textContent = (initVal >= 0 ? '+' : '') + initVal;
  const rollInitBtn = document.getElementById('roll-initiative-btn');
  if (rollInitBtn) rollInitBtn.onclick = () => {
    const roll = Math.floor(Math.random() * 20) + 1;
    const total = roll + dexMod;
    sessionCharacter.initiative = total;
    saveCharacters();
    renderSessionCombat();
    renderSessionOverview();
    const debuff = getDebuffEffects(sessionCharacter);
    showDiceRoll('Initiative', 'ability', 'dexterity', dexMod, debuff.abilityChecksDisadvantage);
  };

  const hpCur = document.getElementById('hp-current');
  const hpMax = document.getElementById('hp-max');
  const hpTemp = document.getElementById('hp-temp');
  hpCur.value = c.hp ?? '';
  hpMax.value = c.maxHp ?? '';
  hpTemp.value = c.tempHp ?? 0;
  const saveHp = () => {
    sessionCharacter.hp = parseInt(hpCur.value);
    sessionCharacter.maxHp = parseInt(hpMax.value);
    sessionCharacter.tempHp = parseInt(hpTemp.value) || 0;
    saveCharacters();
    renderSessionOverview();
  };
  hpCur.onchange = saveHp;
  hpMax.onchange = saveHp;
  hpTemp.onchange = saveHp;

  const cls = getMergedClasses().find(x => x.name === c.class);
  const primaryLevel = c.level || 1;
  let hdStr = cls?.hitDie ? `${primaryLevel}d${cls.hitDie}` : null;
  if (hdStr && (c.multiclass || []).length) {
    const multiHd = (c.multiclass || []).map(m => {
      const mc = getMergedClasses().find(x => x.name === m.name);
      return mc?.hitDie ? `${m.level || 0}d${mc.hitDie}` : '';
    }).filter(Boolean);
    if (multiHd.length) hdStr += ' + ' + multiHd.join(' + ');
  }
  const hdTotal = c.hitDiceTotal ?? hdStr;
  document.getElementById('hd-total').textContent = hdTotal || '—';
  const hdUsed = document.getElementById('hd-used');
  hdUsed.value = c.hitDiceUsed ?? 0;
  hdUsed.onchange = () => {
    sessionCharacter.hitDiceUsed = Math.max(0, parseInt(hdUsed.value) || 0);
    saveCharacters();
  };

  const dsSuccess = document.getElementById('ds-success');
  const dsFail = document.getElementById('ds-fail');
  const succ = c.deathSaveSuccesses ?? 0;
  const fail = c.deathSaveFailures ?? 0;
  dsSuccess.textContent = ['○', '○', '○'].map((_, i) => i < succ ? '●' : '○').join(' ');
  dsFail.textContent = ['○', '○', '○'].map((_, i) => i < fail ? '●' : '○').join(' ');
  dsSuccess.onclick = () => {
    sessionCharacter.deathSaveSuccesses = Math.min(3, (sessionCharacter.deathSaveSuccesses ?? 0) + 1);
    saveCharacters();
    renderSessionCombat();
  };
  dsFail.onclick = () => {
    sessionCharacter.deathSaveFailures = Math.min(3, (sessionCharacter.deathSaveFailures ?? 0) + 1);
    saveCharacters();
    renderSessionCombat();
  };
  const dsReset = document.getElementById('ds-reset');
  if (dsReset) dsReset.onclick = () => {
    if (sessionCharacter) {
      sessionCharacter.deathSaveSuccesses = 0;
      sessionCharacter.deathSaveFailures = 0;
      saveCharacters();
      renderSessionCombat();
    }
  };

  const container = document.getElementById('conditions-list');
  if (!container) return;
  container.innerHTML = '';
  (c.conditions || []).forEach((cond, i) => {
    const span = document.createElement('span');
    span.className = 'array-item';
    span.innerHTML = `${esc(cond)} <button type="button" class="remove-item" data-idx="${i}">×</button>`;
    container.appendChild(span);
  });
  container.querySelectorAll('.remove-item').forEach(btn => {
    btn.addEventListener('click', () => {
      sessionCharacter.conditions.splice(parseInt(btn.dataset.idx), 1);
      saveCharacters();
      renderSessionCombat();
      renderSessionOverview();
    });
  });
}

function saveSessionCombat() {
  if (!sessionCharacter) return;
  const hpCurEl = document.getElementById('hp-current');
  const hpMaxEl = document.getElementById('hp-max');
  const hpTempEl = document.getElementById('hp-temp');
  const hpCur = hpCurEl ? parseInt(hpCurEl.value) : NaN;
  const hpMax = hpMaxEl ? parseInt(hpMaxEl.value) : NaN;
  const hpTemp = hpTempEl ? parseInt(hpTempEl.value) : NaN;
  sessionCharacter.hp = isNaN(hpCur) ? sessionCharacter.hp : hpCur;
  sessionCharacter.maxHp = isNaN(hpMax) ? sessionCharacter.maxHp : hpMax;
  sessionCharacter.tempHp = isNaN(hpTemp) ? 0 : hpTemp;
  saveCharacters();
  renderSessionOverview();
}

function renderSessionAttacks() {
  const c = sessionCharacter;
  const attacks = c.attacks || [];
  const weapons = typeof WEAPONS !== 'undefined' ? WEAPONS : [];
  const profBonus = Math.floor(getTotalLevel(c) / 4) + 2;
  const strMod = Math.floor(((c.stats?.strength || 10) - 10) / 2);
  const dexMod = Math.floor(((c.stats?.dexterity || 10) - 10) / 2);

  const weaponSel = document.getElementById('attack-weapon-select');
  if (weaponSel) {
    weaponSel.innerHTML = '<option value="">— Add weapon —</option>' + weapons.map(w => `<option value="${w.name}">${w.name} (${w.damage} ${w.damageType})</option>`).join('');
  }

  const listEl = document.getElementById('attacks-list');
  if (listEl) {
    listEl.innerHTML = attacks.map((a, i) => {
      const w = weapons.find(x => x.name === a.name) || a;
      const baseMod = (w.type === 'ranged' || (w.properties || '').includes('Finesse')) ? Math.max(strMod, dexMod) : (w.type === 'ranged' ? dexMod : strMod);
      const customMod = parseInt(a.toHitModifier) || 0;
      const toHit = baseMod + (a.proficient ? profBonus : 0) + customMod;
      const toHitStr = toHit >= 0 ? `+${toHit}` : `${toHit}`;
      return `
        <div class="attack-card" data-idx="${i}">
          <div class="attack-header">
            <strong>${a.name || 'Attack'}</strong>
            <button type="button" class="remove-item" data-idx="${i}">×</button>
          </div>
          <div class="attack-details">
            <span>${w.type || 'melee'} · ${w.range || a.range || '5 ft'}</span>
            <span>To hit: ${toHitStr}</span>
            <span>${w.damage || a.damage || '?'} ${w.damageType || a.damageType || ''}</span>
            ${(w.properties || a.notes) ? `<span class="attack-props">${w.properties || a.notes}</span>` : ''}
          </div>
          <div class="attack-mod-row">
            <label>Modifier:</label>
            <input type="number" class="attack-mod-input" data-idx="${i}" value="${a.toHitModifier ?? ''}" placeholder="+0" title="Bonus/penalty to hit (e.g. +2 magic weapon)">
          </div>
          <button type="button" class="btn btn-sm btn-roll" data-idx="${i}">Roll Attack</button>
        </div>
      `;
    }).join('');
    listEl.querySelectorAll('.remove-item').forEach(btn => {
      btn.addEventListener('click', () => {
        sessionCharacter.attacks.splice(parseInt(btn.dataset.idx), 1);
        saveCharacters();
        renderSessionAttacks();
      });
    });
    listEl.querySelectorAll('.attack-mod-input').forEach(inp => {
      inp.onchange = () => {
        const idx = parseInt(inp.dataset.idx);
        const val = inp.value.trim();
        if (sessionCharacter.attacks[idx]) {
          sessionCharacter.attacks[idx].toHitModifier = val === '' ? undefined : val;
          saveCharacters();
          renderSessionAttacks();
        }
      };
    });
    listEl.querySelectorAll('.btn-roll').forEach(btn => {
      btn.addEventListener('click', () => {
        const a = sessionCharacter.attacks[parseInt(btn.dataset.idx)];
        const w = weapons.find(x => x.name === a?.name) || a;
        const baseMod = (w?.type === 'ranged' || (w?.properties || '').includes('Finesse')) ? Math.max(strMod, dexMod) : (w?.type === 'ranged' ? dexMod : strMod);
        const customMod = parseInt(a?.toHitModifier) || 0;
        const toHit = baseMod + (a?.proficient ? profBonus : 0) + customMod;
        const debuff = getDebuffEffects(sessionCharacter);
        showDiceRoll(a?.name || 'Attack', 'ability', null, toHit, debuff.attackRollsDisadvantage);
      });
    });
  }

  const actions = typeof CLASS_ACTIONS !== 'undefined' ? CLASS_ACTIONS : {};
  const common = actions._common || [];
  const primaryClass = getPrimaryClass(c);
  const classActions = (actions[primaryClass] || []);
  const allActions = [...common, ...classActions];
  (c.multiclass || []).forEach(m => {
    (actions[m.name] || []).forEach(act => {
      if (!allActions.includes(act)) allActions.push(act);
    });
  });
  const actionsEl = document.getElementById('class-actions-display');
  if (actionsEl) {
    actionsEl.innerHTML = allActions.map(a => `<span class="action-chip">${a}</span>`).join('');
  }

  const addBtn = document.getElementById('add-attack-btn');
  if (addBtn) addBtn.onclick = () => {
    const sel = document.getElementById('attack-weapon-select');
    const val = sel?.value?.trim();
    if (!val) return;
    const w = (typeof WEAPONS !== 'undefined' ? WEAPONS : []).find(x => x.name === val);
    sessionCharacter.attacks = sessionCharacter.attacks || [];
    sessionCharacter.attacks.push(w ? { ...w, proficient: true } : { name: val, type: 'melee', damage: '?', damageType: '', range: '5 ft', proficient: true });
    sel.value = '';
    saveCharacters();
    renderSessionAttacks();
  };
}

function renderSessionSpells() {
  const c = sessionCharacter;
  const totalLevel = getTotalLevel(c);
  const isCaster = typeof isSpellcastingClass === 'function'
    ? (isSpellcastingClass(c.class, c.subclass) || (c.multiclass || []).some(m => isSpellcastingClass(m.name, m.subclass)))
    : (typeof SPELLCASTING_CLASSES !== 'undefined' && (SPELLCASTING_CLASSES.includes(c.class) || (c.multiclass || []).some(m => SPELLCASTING_CLASSES.includes(m.name))));
  const slots = typeof getSpellSlotsForLevel === 'function' ? getSpellSlotsForLevel(totalLevel) : [0, 0, 0, 0, 0, 0, 0, 0, 0];
  const used = c.spellSlotsUsed || [0, 0, 0, 0, 0, 0, 0, 0, 0];

  const grid = document.getElementById('spell-slots-grid');
  if (!isCaster || slots.every(s => s === 0)) {
    grid.innerHTML = '<p class="muted">This class does not use spell slots.</p>';
  } else {
    grid.innerHTML = slots.map((total, i) => {
      if (total === 0) return '';
      const u = used[i] || 0;
      const left = total - u;
      return `<div class="spell-slot-row"><span class="slot-level">Level ${i + 1}</span><span class="slot-count">${left}/${total}</span><button class="btn btn-sm btn-secondary use-slot" data-level="${i}">Use</button></div>`;
    }).filter(Boolean).join('');
  }

  grid.querySelectorAll('.use-slot').forEach(btn => {
    btn.addEventListener('click', () => {
      const lvl = parseInt(btn.dataset.level);
      sessionCharacter.spellSlotsUsed[lvl] = (sessionCharacter.spellSlotsUsed[lvl] || 0) + 1;
      saveCharacters();
      renderSessionSpells();
    });
  });

  const resetBtn = document.getElementById('reset-spell-slots');
  if (resetBtn) resetBtn.onclick = () => {
    if (sessionCharacter) {
      sessionCharacter.spellSlotsUsed = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      saveCharacters();
      renderSessionSpells();
    }
  };

  const knownList = document.getElementById('known-spells-list');
  if (knownList) {
  knownList.innerHTML = '';
  const allSpells = typeof SPELLS !== 'undefined' ? SPELLS : [];
  const used = c.spellSlotsUsed || [0,0,0,0,0,0,0,0,0];
  const byLevel = {};
  (c.knownSpells || []).forEach((name, i) => {
    const spell = allSpells.find(s => s.name === name);
    const lvl = spell?.level ?? 0;
    if (!byLevel[lvl]) byLevel[lvl] = [];
    byLevel[lvl].push({ name, spell });
  });
  const levels = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(l => byLevel[l]?.length);
  levels.forEach(lvl => {
    const label = lvl === 0 ? 'Cantrips' : `Level ${lvl} Spells`;
    const group = document.createElement('div');
    group.className = 'spell-level-group';
    group.innerHTML = `<h5>${label}</h5><div class="spell-level-items"></div>`;
    const items = group.querySelector('.spell-level-items');
    (byLevel[lvl] || []).forEach(({ name, spell }) => {
      const isCantrip = lvl === 0;
      let castHtml = '';
      if (isCantrip) {
        castHtml = ` <button type="button" class="btn btn-sm btn-secondary cast-spell cast-cantrip" data-name="${esc(name)}" data-level="0">Cast</button>`;
      } else {
        const slotOptions = [];
        for (let s = lvl - 1; s <= 8; s++) {
          const slotTotal = slots[s] || 0;
          const slotLeft = slotTotal - (used[s] || 0);
          if (slotTotal > 0 && slotLeft > 0) {
            const n = s + 1;
            const ord = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th';
            slotOptions.push(`<option value="${s}">${n}${ord}</option>`);
          }
        }
        castHtml = slotOptions.length ? ` <select class="cast-slot-select" data-name="${esc(name)}" title="Slot level">${slotOptions.join('')}</select> <button type="button" class="btn btn-sm btn-secondary cast-spell" data-name="${esc(name)}" data-level="${lvl}">Cast</button>` : '';
      }
      const span = document.createElement('span');
      span.className = 'array-item spell-item';
      const viewBtn = ` <button type="button" class="btn btn-sm btn-ghost spell-view-btn" data-name="${esc(name)}" title="View spell">View</button>`;
      span.innerHTML = `<span class="spell-name-clickable" data-name="${esc(name)}" role="button" tabindex="0">${esc(name)}</span> ${isCantrip ? '<span class="cantrip-badge">Cantrip</span>' : `(Lv${lvl})`}${viewBtn}${castHtml} <button type="button" class="remove-item" data-name="${esc(name)}">×</button>`;
      items.appendChild(span);
    });
    knownList.appendChild(group);
  });
  const showSpellPreview = (spellName) => {
    if (!spellName || typeof SPELLS === 'undefined') return;
    const spell = SPELLS.find(s => s.name === spellName);
    const sessionPreview = document.getElementById('spell-session-preview');
    if (spell && sessionPreview) {
      const higherNote = spell.higherLevel ? `<p class="spell-preview-higher"><strong>At higher levels:</strong> ${esc(spell.higherLevel)}</p>` : '';
      sessionPreview.innerHTML = `<div class="spell-preview-card"><strong>${esc(spell.name)}</strong> — ${spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`} ${spell.school || ''}<p class="spell-preview-desc">${esc(spell.description || '')}</p>${higherNote}<small>${esc(spell.castTime || '')} · ${esc(spell.range || '')} · ${esc(spell.duration || '')}</small></div>`;
      sessionPreview.hidden = false;
    }
  };
  knownList.querySelectorAll('.spell-name-clickable, .spell-view-btn').forEach(el => {
    el.addEventListener('click', () => showSpellPreview(el.dataset.name));
  });
  knownList.querySelectorAll('.spell-name-clickable').forEach(el => {
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showSpellPreview(el.dataset.name); } });
  });
  knownList.querySelectorAll('.cast-spell').forEach(btn => {
    btn.addEventListener('click', () => {
      const spellName = btn.dataset.name;
      const isCantrip = btn.classList.contains('cast-cantrip');
      const sel = btn.previousElementSibling;
      const slotLvl = sel && sel.classList.contains('cast-slot-select') ? parseInt(sel.value) : (parseInt(btn.dataset.level) ?? 0);
      const showOnCast = document.getElementById('show-spell-on-cast')?.checked;
      if (showOnCast) showSpellPreview(spellName);
      if (!isCantrip) {
        if (!sessionCharacter.spellSlotsUsed) sessionCharacter.spellSlotsUsed = [0,0,0,0,0,0,0,0,0];
        sessionCharacter.spellSlotsUsed[slotLvl] = (sessionCharacter.spellSlotsUsed[slotLvl] || 0) + 1;
        saveCharacters();
      }
      renderSessionSpells();
      const rollOnCast = document.getElementById('roll-damage-on-cast')?.checked;
      const rollInfo = rollOnCast && typeof getSpellRollForSlot === 'function' ? getSpellRollForSlot(spellName, slotLvl) : null;
      if (rollInfo && typeof showDamageRoll === 'function') {
        showDamageRoll(rollInfo.label, rollInfo.dice, rollInfo.addMod, rollInfo.type === 'healing', spellName);
      }
    });
  });
  knownList.querySelectorAll('.remove-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.name;
      if (name) {
        sessionCharacter.knownSpells = (sessionCharacter.knownSpells || []).filter(n => n !== name);
        saveCharacters();
        renderSessionSpells();
      }
    });
  });
  }

  if (typeof SPELLS !== 'undefined') {
    const cfg = typeof getSpellsForClassLevel === 'function' ? getSpellsForClassLevel(c.class, c.level || 1, c.subclass) : null;
    const isPrepareCaster = cfg && cfg.spells === 'prepare';
    const preparedLimit = isPrepareCaster && typeof getPreparedSpellLimit === 'function' ? getPreparedSpellLimit(c) : 0;
    const leveledCount = (c.knownSpells || []).filter(n => {
      const s = (typeof SPELLS !== 'undefined' ? SPELLS : []).find(sp => sp.name === n);
      return s && s.level > 0;
    }).length;
    const atPreparedLimit = isPrepareCaster && leveledCount >= preparedLimit;
    const knownSpellsLabel = document.querySelector('.form-group label[for="known-spell-select"], .form-group:has(#known-spell-select) label');
    const prepareHint = document.getElementById('prepare-spells-hint');
    if (prepareHint) {
      prepareHint.textContent = isPrepareCaster ? `Prepare up to ${preparedLimit} spells (level + modifier). You have ${leveledCount}/${preparedLimit}.` : '';
      prepareHint.hidden = !isPrepareCaster;
    }
    const spellAddBtn = document.getElementById('known-spell-add-btn');
    if (spellAddBtn) spellAddBtn.disabled = isPrepareCaster && atPreparedLimit;
    const classSpells = typeof getSpellsForClass === 'function' ? getSpellsForClass(c.class, c.subclass) : SPELLS;
    const datalist = document.getElementById('spells-datalist');
    if (datalist) datalist.innerHTML = classSpells.map(s => `<option value="${s.name}">`).join('');
    const spellSel = document.getElementById('known-spell-select');
    const sessionPreview = document.getElementById('spell-session-preview');
    if (spellSel) {
      const knownSet = new Set(c.knownSpells || []);
      const available = classSpells.filter(s => !knownSet.has(s.name));
      spellSel.innerHTML = '<option value="">— Add spell —</option>' + available.map(s => `<option value="${s.name}">${s.name} (${s.level === 0 ? 'Cantrip' : 'Lv' + s.level})</option>`).join('');
      const showSessionSpellPreview = (spellName) => {
        if (!sessionPreview) return;
        const spell = classSpells.find(s => s.name === spellName);
        if (!spell) { sessionPreview.innerHTML = ''; sessionPreview.hidden = true; return; }
        sessionPreview.hidden = false;
        sessionPreview.innerHTML = `<div class="spell-preview-card"><strong>${esc(spell.name)}</strong> — ${spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`} ${spell.school}<p class="spell-preview-desc">${esc(spell.description)}</p><small>${esc(spell.castTime)} · ${esc(spell.range)} · ${esc(spell.duration)}</small></div>`;
      };
      spellSel.onfocus = () => { const v = spellSel.value?.trim(); if (v) showSessionSpellPreview(v); };
      spellSel.onchange = () => showSessionSpellPreview(spellSel.value?.trim() || null);
    }
  }
  const spellAddBtn = document.getElementById('known-spell-add-btn');
  if (spellAddBtn) spellAddBtn.onclick = () => {
    const selVal = document.getElementById('known-spell-select')?.value?.trim();
    const inputVal = document.getElementById('known-spell-input')?.value?.trim();
    const val = selVal || inputVal;
    if (!val) return;
    const spell = (typeof SPELLS !== 'undefined' ? SPELLS : []).find(s => s.name === val);
    const cfg = typeof getSpellsForClassLevel === 'function' ? getSpellsForClassLevel(sessionCharacter.class, sessionCharacter.level || 1, sessionCharacter.subclass) : null;
    const isPrepareCaster = cfg && cfg.spells === 'prepare';
    if (isPrepareCaster && spell && spell.level > 0 && typeof getPreparedSpellLimit === 'function') {
      const limit = getPreparedSpellLimit(sessionCharacter);
      const leveledCount = (sessionCharacter.knownSpells || []).filter(n => {
        const s = (typeof SPELLS !== 'undefined' ? SPELLS : []).find(sp => sp.name === n);
        return s && s.level > 0;
      }).length;
      if (leveledCount >= limit) {
        alert(`You can only prepare ${limit} spells. Remove one to add another.`);
        return;
      }
    }
    sessionCharacter.knownSpells = sessionCharacter.knownSpells || [];
    sessionCharacter.knownSpells.push(val);
    if (document.getElementById('known-spell-select')) document.getElementById('known-spell-select').value = '';
    if (document.getElementById('known-spell-input')) document.getElementById('known-spell-input').value = '';
    saveCharacters();
    renderSessionSpells();
  };

  const searchEl = document.getElementById('spell-search');
  if (searchEl) {
    searchEl.oninput = () => {
      const q = searchEl.value.trim().toLowerCase();
      const results = document.getElementById('spell-lookup-results');
      if (!q || typeof SPELLS === 'undefined') {
        results.innerHTML = '';
        return;
      }
      const allSpells = SPELLS;
      const matches = allSpells.filter(s => {
        const inName = (s.name || '').toLowerCase().includes(q);
        const inSchool = (s.school || '').toLowerCase().includes(q);
        const inDesc = (s.description || '').toLowerCase().includes(q);
        const inClasses = (s.classes || []).some(cl => String(cl).toLowerCase().includes(q));
        return inName || inSchool || inDesc || inClasses;
      }).slice(0, 15);
      results.innerHTML = matches.length ? matches.map(s => {
        const higherNote = s.higherLevel ? `<p class="spell-preview-higher"><strong>At higher levels:</strong> ${esc(s.higherLevel)}</p>` : '';
        return `<div class="spell-card">
          <strong>${esc(s.name)}</strong> — ${s.level === 0 ? 'Cantrip' : `Level ${s.level}`} ${s.school || ''}
          <p class="spell-desc">${esc(s.description || '')}</p>
          ${higherNote}
          <small>${esc(s.castTime || '')} · ${esc(s.range || '')} · ${esc(s.duration || '')}</small>
        </div>`;
      }).join('') : '<p class="spell-lookup-empty">No spells match. Try name, school, or description.</p>';
    };
  }
}

function addKnownSpell() {
  if (!sessionCharacter) return;
  const input = document.getElementById('known-spell-input');
  const val = input?.value?.trim();
  if (!val) return;
  const spell = (typeof SPELLS !== 'undefined' ? SPELLS : []).find(s => s.name === val);
  const cfg = typeof getSpellsForClassLevel === 'function' ? getSpellsForClassLevel(sessionCharacter.class, sessionCharacter.level || 1, sessionCharacter.subclass) : null;
  const isPrepareCaster = cfg && cfg.spells === 'prepare';
  if (isPrepareCaster && spell && spell.level > 0 && typeof getPreparedSpellLimit === 'function') {
    const limit = getPreparedSpellLimit(sessionCharacter);
    const leveledCount = (sessionCharacter.knownSpells || []).filter(n => {
      const s = (typeof SPELLS !== 'undefined' ? SPELLS : []).find(sp => sp.name === n);
      return s && s.level > 0;
    }).length;
    if (leveledCount >= limit) {
      alert(`You can only prepare ${limit} spells. Remove one to add another.`);
      return;
    }
  }
  if (!sessionCharacter.knownSpells) sessionCharacter.knownSpells = [];
  sessionCharacter.knownSpells.push(val);
  input.value = '';
  saveCharacters();
  renderSessionSpells();
}

function renderSessionInventory() {
  const c = sessionCharacter;
  if (!c.inventory || (c.inventory.length === 0 && (c.equipment || []).length > 0)) {
    sessionCharacter.inventory = [...(c.equipment || [])];
  }

  const curr = c.currency || { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 };
  ['pp', 'gp', 'ep', 'sp', 'cp'].forEach(coin => {
    const el = document.getElementById(`curr-${coin}`);
    if (el) {
      el.value = curr[coin] ?? 0;
      el.onchange = () => {
        sessionCharacter.currency = sessionCharacter.currency || {};
        sessionCharacter.currency[coin] = Math.max(0, parseInt(el.value) || 0);
        saveCharacters();
      };
    }
  });

  const sel = document.getElementById('inventory-select');
  if (sel) {
    const items = (typeof getAllItems === 'function' ? getAllItems() : (typeof COMMON_EQUIPMENT !== 'undefined' ? COMMON_EQUIPMENT : []));
    sel.innerHTML = '<option value="">— Choose item —</option>' + items.map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join('');
  }

  const invContainer = document.getElementById('inventory-list');
  if (invContainer) {
  invContainer.innerHTML = '';
  (sessionCharacter.inventory || []).forEach((item, i) => {
    const span = document.createElement('span');
    span.className = 'array-item';
    span.innerHTML = `${esc(item)} <button type="button" class="remove-item" data-idx="${i}">×</button>`;
    invContainer.appendChild(span);
  });
  invContainer.querySelectorAll('.remove-item').forEach(btn => {
    btn.addEventListener('click', () => {
      sessionCharacter.inventory.splice(parseInt(btn.dataset.idx), 1);
      saveCharacters();
      renderSessionInventory();
    });
  });
  }

  const addBtn = document.getElementById('inventory-add-btn');
  if (addBtn) addBtn.onclick = () => {
    const selVal = document.getElementById('inventory-select')?.value?.trim();
    const inputVal = document.getElementById('inventory-input')?.value?.trim();
    const val = selVal || inputVal;
    if (!val) return;
    sessionCharacter.inventory = sessionCharacter.inventory || [];
    sessionCharacter.inventory.push(val);
    document.getElementById('inventory-select').value = '';
    document.getElementById('inventory-input').value = '';
    saveCharacters();
    renderSessionInventory();
  };
  document.getElementById('inventory-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('inventory-add-btn')?.click();
    }
  });
}

/** ASI levels for a class (Fighter/Rogue get extra at 6/10) */
function getAsiLevelsForClass(className) {
  return (typeof ASI_LEVELS_BY_CLASS !== 'undefined' && ASI_LEVELS_BY_CLASS[className]) || [];
}

/** Bonus proficiencies from subclass at given level (e.g. Lore Bard 3 skills at 3) */
function getBonusProficienciesForLevel(className, subclassName, level) {
  if (typeof BONUS_PROFICIENCIES_ON_LEVEL === 'undefined') return null;
  const key = subclassName ? `${className}|${subclassName}` : null;
  if (!key) return null;
  const byLevel = BONUS_PROFICIENCIES_ON_LEVEL[key];
  return byLevel ? byLevel[level] : null;
}

/** Show level-up modal with ASI and bonus proficiency choices */
function showLevelUpModal(c, newLevel, onConfirm) {
  const modal = document.getElementById('level-up-modal');
  const body = document.getElementById('level-up-modal-body');
  const targetEl = document.getElementById('level-up-target');
  const asiSection = document.getElementById('level-up-asi-section');
  const profsSection = document.getElementById('level-up-profs-section');
  const noChoicesSection = document.getElementById('level-up-no-choices');
  const profsPicker = document.getElementById('level-up-profs-picker');
  if (!modal || !body) return;

  const asiLevels = getAsiLevelsForClass(c.class || '');
  const hasAsi = asiLevels.includes(newLevel);
  const bonusProfs = getBonusProficienciesForLevel(c.class, c.subclass, newLevel);
  const hasProfs = !!bonusProfs;

  targetEl.textContent = newLevel;
  asiSection.hidden = !hasAsi;
  profsSection.hidden = !hasProfs;
  noChoicesSection.hidden = hasAsi || hasProfs;

  if (hasAsi) {
    document.querySelector('input[name="asi-mode"][value="dual"]').checked = true;
    document.getElementById('level-up-asi-single').hidden = true;
    document.getElementById('level-up-asi-dual').hidden = false;
    ['asi-dual-1', 'asi-dual-2', 'asi-single-select'].forEach(id => {
      const sel = document.getElementById(id);
      if (sel) sel.value = 'strength';
    });
  }

  if (hasProfs && bonusProfs) {
    const desc = document.getElementById('level-up-profs-desc');
    if (bonusProfs.type === 'skills' && bonusProfs.count) {
      desc.textContent = `Choose ${bonusProfs.count} additional skill(s).`;
      const currentSkills = new Set(c.skills || []);
      const options = (typeof SKILLS !== 'undefined' ? SKILLS : []).filter(s => !currentSkills.has(s));
      profsPicker.innerHTML = Array.from({ length: bonusProfs.count }, (_, i) => {
        const opts = options.map(s => `<option value="${s}">${s}</option>`).join('');
        return `<div class="form-group"><label>Skill ${i + 1}:</label><select class="level-up-skill-select" data-idx="${i}"><option value="">— Choose —</option>${opts}</select></div>`;
      }).join('');
    } else if (bonusProfs.items && bonusProfs.items.length) {
      desc.textContent = `You gain proficiency with: ${bonusProfs.items.join(', ')}.`;
      profsPicker.innerHTML = '<p class="muted">These will be added automatically.</p>';
    } else {
      profsPicker.innerHTML = '';
    }
  }

  const closeModal = () => {
    modal.hidden = true;
  };

  const doConfirm = () => {
    const choices = {};
    if (hasAsi) {
      const mode = document.querySelector('input[name="asi-mode"]:checked')?.value || 'dual';
      if (mode === 'single') {
        const ab = document.getElementById('asi-single-select')?.value;
        if (ab) choices.asi = { [ab]: 2 };
      } else {
        const a1 = document.getElementById('asi-dual-1')?.value;
        const a2 = document.getElementById('asi-dual-2')?.value;
        if (a1 && a2) {
          choices.asi = {};
          choices.asi[a1] = (choices.asi[a1] || 0) + 1;
          choices.asi[a2] = (choices.asi[a2] || 0) + 1;
        }
      }
      if (!choices.asi || Object.keys(choices.asi).length === 0) {
        alert('Please select ability score(s) to improve.');
        return;
      }
    }
    if (hasProfs && bonusProfs) {
      if (bonusProfs.type === 'skills' && bonusProfs.count) {
        const selected = [];
        profsPicker.querySelectorAll('.level-up-skill-select').forEach(sel => {
          const v = sel.value?.trim();
          if (v) selected.push(v);
        });
        if (selected.length < bonusProfs.count) {
          alert(`Please choose ${bonusProfs.count} skill(s).`);
          return;
        }
        choices.skills = selected.slice(0, bonusProfs.count);
      } else if (bonusProfs.items) {
        choices.proficiencies = bonusProfs.items;
      }
    }
    closeModal();
    if (typeof onConfirm === 'function') onConfirm(choices);
  };

  const closeBtn = document.getElementById('level-up-modal-close');
  const backdrop = document.getElementById('level-up-modal-backdrop');
  const cancelBtn = document.getElementById('level-up-modal-cancel');
  const confirmBtn = document.getElementById('level-up-modal-confirm');
  if (closeBtn) closeBtn.onclick = closeModal;
  if (backdrop) backdrop.onclick = closeModal;
  if (cancelBtn) cancelBtn.onclick = closeModal;
  if (confirmBtn) confirmBtn.onclick = doConfirm;

  document.querySelectorAll('input[name="asi-mode"]').forEach(r => {
    r.onchange = () => {
      const single = document.getElementById('level-up-asi-single');
      const dual = document.getElementById('level-up-asi-dual');
      if (r.value === 'single') {
        if (single) single.hidden = false;
        if (dual) dual.hidden = true;
      } else {
        if (single) single.hidden = true;
        if (dual) dual.hidden = false;
      }
    };
  });

  modal.hidden = false;
}

function applyLevelUpChoices(c, choices) {
  if (!c || !choices) return;
  if (choices.asi) {
    if (!c.stats) c.stats = { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 };
    Object.entries(choices.asi).forEach(([abil, delta]) => {
      const key = abil.toLowerCase();
      if (c.stats[key] !== undefined) {
        c.stats[key] = Math.min(20, Math.max(1, (c.stats[key] || 10) + delta));
      }
    });
  }
    if (choices.skills && choices.skills.length) {
    c.skills = [...(c.skills || []), ...choices.skills];
    c.skills = [...new Set(c.skills)];
  }
  if (choices.proficiencies && choices.proficiencies.length) {
    c.proficiencies = [...(c.proficiencies || []), ...choices.proficiencies];
  }
}

function performLevelUp(c, fromLevel, toLevel, opts) {
  const onDone = typeof opts === 'function' ? opts : (opts && opts.onDone);
  const newXp = opts && opts.newXp;
  if (!c || fromLevel >= toLevel) {
    if (typeof onDone === 'function') onDone();
    return;
  }
  const nextLevel = fromLevel + 1;
  showLevelUpModal(c, nextLevel, (choices) => {
    if (newXp != null && fromLevel === (c.level || 1)) c.xp = newXp;
    applyLevelUpChoices(c, choices);
    c.level = nextLevel;
    saveCharacters();
    renderSessionLeveling();
    renderSessionSpells();
    if (typeof renderSessionView === 'function') renderSessionView();
    if (nextLevel < toLevel) {
      performLevelUp(c, nextLevel, toLevel, { onDone });
    } else {
      if (typeof onDone === 'function') onDone();
    }
  });
}

function renderSessionLeveling() {
  const c = sessionCharacter;
  const mode = c.levelingMode || getCampaignLevelingMode();
  document.querySelectorAll('input[name="leveling-mode"]').forEach(r => {
    r.checked = r.value === mode;
  });

  const xpSection = document.getElementById('xp-section');
  const milestoneSection = document.getElementById('milestone-section');
  xpSection.hidden = mode === 'milestone';
  milestoneSection.hidden = mode !== 'milestone';
  const levelUpBtn = document.getElementById('level-up-btn');
  const charLevel = c.level || 1;
  if (levelUpBtn) levelUpBtn.disabled = charLevel >= 20;

  const xpEl = document.getElementById('xp-current');
  xpEl.value = c.xp ?? 0;
  const xp = parseInt(xpEl.value) || 0;
  const level = typeof getLevelFromXp === 'function' ? getLevelFromXp(xp) : getTotalLevel(c);
  const nextXp = typeof getXpForLevel === 'function' ? getXpForLevel(level + 1) : 0;
  document.getElementById('xp-to-next').textContent = level >= 20 ? '(Max level)' : `→ Level ${level + 1} at ${nextXp} XP`;

  const spellSwapSection = document.getElementById('level-up-spells-section');
  const isCaster = typeof isSpellcastingClass === 'function' ? isSpellcastingClass(c.class, c.subclass) : (typeof SPELLCASTING_CLASSES !== 'undefined' && SPELLCASTING_CLASSES.includes(c.class));
  if (spellSwapSection) {
    spellSwapSection.hidden = !isCaster;
    if (isCaster && typeof SPELLS !== 'undefined') {
      const swapOut = document.getElementById('spell-swap-out');
      const swapIn = document.getElementById('spell-swap-in');
      swapOut.innerHTML = '<option value="">— Remove spell —</option>' + (c.knownSpells || []).map(s => `<option value="${s}">${s}</option>`).join('');
      const classSpells = typeof getSpellsForClass === 'function' ? getSpellsForClass(c.class, c.subclass) : SPELLS;
      const knownSet = new Set(c.knownSpells || []);
      const available = classSpells.filter(s => !knownSet.has(s.name)).map(s => s.name);
      swapIn.innerHTML = '<option value="">— Add spell —</option>' + available.map(s => `<option value="${s}">${s}</option>`).join('');
    }
  }
}

function saveSessionLeveling() {
  const mode = document.querySelector('input[name="leveling-mode"]:checked')?.value;
  if (mode) sessionCharacter.levelingMode = mode;
  const xpEl = document.getElementById('xp-current');
  if (xpEl) sessionCharacter.xp = parseInt(xpEl.value) || 0;
  saveCharacters();
}

function showRuleBooksModalForNewCharacter() {
  const modal = document.getElementById('rule-books-modal');
  const optionsEl = document.getElementById('rule-books-modal-options');
  const infoEl = document.getElementById('rule-books-modal-info');
  if (!modal || !optionsEl) return;

  const enabledRulesets = typeof getEnabledRulesets === 'function' ? getEnabledRulesets() : ['phb'];
  const enabledAdditional = typeof getEnabledAdditionalBooks === 'function' ? getEnabledAdditionalBooks() : [];
  const rulesets = typeof RULESETS !== 'undefined' ? Object.values(RULESETS) : [];
  const additionalBooks = typeof ADDITIONAL_BOOKS !== 'undefined' ? ADDITIONAL_BOOKS : [];

  let html = '';
  if (rulesets.length) {
    html += '<div class="rule-books-group"><h4>Core Rules</h4>';
    html += rulesets.map(rs => `
      <label class="ruleset-option ${enabledRulesets.includes(rs.id) ? 'selected' : ''}">
        <input type="checkbox" name="rule-books-ruleset" value="${rs.id}" ${enabledRulesets.includes(rs.id) ? 'checked' : ''}>
        <span class="ruleset-name">${rs.name}</span>
      </label>
    `).join('') + '</div>';
  }
  if (additionalBooks.length) {
    html += '<div class="rule-books-group"><h4>Additional Books</h4>';
    html += additionalBooks.map(b => `
      <label class="ruleset-option ${enabledAdditional.includes(b.id) ? 'selected' : ''}">
        <input type="checkbox" name="rule-books-additional" value="${b.id}" ${enabledAdditional.includes(b.id) ? 'checked' : ''}>
        <span class="ruleset-name">${b.name}</span>
      </label>
    `).join('') + '</div>';
  }
  optionsEl.innerHTML = html || '<p>No books configured.</p>';

  const updateInfo = () => {
    const rulesetChecked = Array.from(document.querySelectorAll('input[name="rule-books-ruleset"]:checked')).map(x => x.value);
    const additionalChecked = Array.from(document.querySelectorAll('input[name="rule-books-additional"]:checked')).map(x => x.value);
    const enabledList = rulesets.filter(r => rulesetChecked.includes(r.id));
    const addList = additionalBooks.filter(b => additionalChecked.includes(b.id));
    if (infoEl) infoEl.innerHTML = [
      ...enabledList.map(rs => rs.link ? `<p><a href="${rs.link}" target="_blank" rel="noopener">${rs.name}</a>: ${rs.description}</p>` : `<p><strong>${rs.name}</strong>: ${rs.description}</p>`),
      ...addList.map(b => `<p><strong>${b.name}</strong></p>`)
    ].join('') || '<p>Select at least one rule book.</p>';
  };
  updateInfo();

  optionsEl.querySelectorAll('input').forEach(cb => {
    cb.onchange = () => {
      const rulesetChecked = Array.from(document.querySelectorAll('input[name="rule-books-ruleset"]:checked')).map(x => x.value);
      if (rulesetChecked.length === 0 && cb.name === 'rule-books-ruleset') { cb.checked = true; return; }
      optionsEl.querySelectorAll('.ruleset-option').forEach(o => o.classList.remove('selected'));
      optionsEl.querySelectorAll('input[name="rule-books-ruleset"]:checked, input[name="rule-books-additional"]:checked').forEach(x => x.closest('.ruleset-option')?.classList.add('selected'));
      updateInfo();
    };
  });

  modal.hidden = false;
}

function showBuilderView(char) {
  editingCharacter = char;
  currentChar = char ? JSON.parse(JSON.stringify(char)) : createEmptyCharacter();
  if (!char) currentChar.levelingMode = getCampaignLevelingMode();
  if (!currentChar.stats) currentChar.stats = createEmptyCharacter().stats;
  if (!currentChar.skills) currentChar.skills = [];
  if (!currentChar.equipment) currentChar.equipment = [];
  if (!currentChar.languages) currentChar.languages = [];
  if (!currentChar.resistances) currentChar.resistances = [];
  if (!currentChar.immunities) currentChar.immunities = [];
  if (!currentChar.vulnerabilities) currentChar.vulnerabilities = [];
  if (!currentChar.weaknesses) currentChar.weaknesses = [];

  listView.style.display = 'none';
  builderView.hidden = false;

  renderRaceStep();
  renderClassStep();
  renderBackgroundStep();
  renderAlignmentStep();
  renderStepIndicators();

  if (char) {
    currentChar.race = char.race || '';
    currentChar.subrace = char.subrace || '';
    currentChar.class = char.class || '';
    currentChar.subclass = char.subclass || '';
    currentChar.background = char.background || '';
    currentChar.alignment = char.alignment || '';
    document.getElementById('char-name').value = char.name || '';
    document.getElementById('char-notes').value = char.notes || '';
    /* Level is set in Step 4 via renderClassStep */
    const physEl = document.getElementById('physical-appearance');
    if (physEl) physEl.value = char.physicalAppearance || '';
    const ptEl = document.getElementById('personality-traits');
    if (ptEl) ptEl.value = char.personalityTraits || '';
    const idealsEl = document.getElementById('ideals');
    if (idealsEl) idealsEl.value = char.ideals || '';
    const bondsEl = document.getElementById('bonds');
    if (bondsEl) bondsEl.value = char.bonds || '';
    const flawsEl = document.getElementById('flaws');
    if (flawsEl) flawsEl.value = char.flaws || '';
    renderArrayList('languages-list-items', char.languages, 'languages');
    renderArrayList('resistances-list', char.resistances, 'resistances');
    renderArrayList('immunities-list', char.immunities, 'immunities');
    renderArrayList('vulnerabilities-list', char.vulnerabilities, 'vulnerabilities');
    renderArrayList('weaknesses-list', char.weaknesses, 'weaknesses');
    renderArrayList('skills-list', char.skills, 'skills');
    renderArrayList('equipment-list', char.equipment, 'equipment');
    renderArrayList('weapon-profs-list', char.weaponProficiencies, 'weaponProficiencies');
    renderArrayList('armor-profs-list', char.armorProficiencies, 'armorProficiencies');
    renderArrayList('tool-profs-list', char.toolProficiencies, 'toolProficiencies');
    if (char.multiclass?.length) renderMulticlassList();
  }

  const nameEl = document.getElementById('char-name');
  if (nameEl) nameEl.oninput = () => { currentChar.name = nameEl.value?.trim() || ''; updatePreview(); };
  goToStep(1);
}

function renderCharacterList() {
  if (!characterGrid) return;
  if (characters.length === 0) {
    if (emptyState) emptyState.classList.remove('hidden');
    characterGrid.classList.add('empty');
    characterGrid.innerHTML = '';
    return;
  }
  if (emptyState) emptyState.classList.add('hidden');
  characterGrid.classList.remove('empty');
  characterGrid.innerHTML = characters.map(c => {
    const totalLvl = (c.level || 1) + (c.multiclass || []).reduce((s, m) => s + (m.level || 0), 0);
    const classStr = c.class ? (c.class + (c.subclass ? ` — ${c.subclass}` : '')) : '—';
    const multiStr = (c.multiclass || []).length ? ' / ' + (c.multiclass || []).map(m => `${m.name} ${m.level}`).join(', ') : '';
    return `
    <div class="character-card" data-id="${c.id}">
      <div class="character-card-header">
        <h3>${esc(c.name || 'Unnamed Character')}</h3>
        <div class="character-card-actions">
          <button class="btn-icon btn-play" data-id="${c.id}">Play</button>
          <button class="btn-icon btn-edit" data-id="${c.id}">Edit</button>
          <button class="btn-icon btn-danger btn-delete" data-id="${c.id}">Delete</button>
        </div>
      </div>
      <div class="character-card-body">
        <div class="character-info-row"><span class="info-label">Race:</span><span>${esc(c.race || '—')}${c.subrace ? ` (${esc(c.subrace)})` : ''}</span></div>
        <div class="character-info-row"><span class="info-label">Class:</span><span>${esc(classStr + multiStr)}</span></div>
        <div class="character-info-row"><span class="info-label">Level:</span><span>${totalLvl}</span></div>
        ${c.background ? `<div class="character-info-row"><span class="info-label">Background:</span><span>${esc(c.background)}</span></div>` : ''}
      </div>
    </div>
  `;
  }).join('');
  characterGrid.querySelectorAll('.btn-play').forEach(btn => {
    btn.addEventListener('click', () => {
      const c = characters.find(x => x.id === btn.dataset.id);
      if (c) showSessionView(c);
    });
  });
  characterGrid.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const c = characters.find(x => x.id === btn.dataset.id);
      if (c) showBuilderView(c);
    });
  });
  characterGrid.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Delete this character?')) {
        characters = characters.filter(c => c.id !== btn.dataset.id);
        saveCharacters();
        renderCharacterList();
      }
    });
  });
}

function saveCharacter() {
  currentChar.name = document.getElementById('char-name')?.value?.trim() || currentChar.name;
  syncDetailsFromForm();
  if (!currentChar.name) {
    alert('Please enter a character name');
    return;
  }
  let savedChar;
  if (editingCharacter) {
    const idx = characters.findIndex(c => c.id === editingCharacter.id);
    if (idx >= 0) {
      characters[idx] = { ...currentChar, id: editingCharacter.id };
      savedChar = characters[idx];
    }
  } else {
    savedChar = { ...currentChar, id: Date.now().toString() };
    characters.push(savedChar);
  }
  saveCharacters();
  showListView();
  if (savedChar) renderCharacterList();
}

// ========== INITIALIZATION ==========
/** Bootstrap app: load data, bind events, render initial view */
function init() {
  try {
    loadCharacters();
  } catch (e) {
    console.error('Load error:', e);
    characters = [];
  }
  renderStepIndicators();

  document.getElementById('new-character-btn')?.addEventListener('click', () => showRuleBooksModalForNewCharacter());
  document.getElementById('empty-new-btn')?.addEventListener('click', () => showRuleBooksModalForNewCharacter());
  cancelBtn?.addEventListener('click', showListView);
  saveBtn?.addEventListener('click', saveCharacter);

  prevBtn?.addEventListener('click', () => goToStep(currentStep - 1));
  nextBtn?.addEventListener('click', () => {
    if (currentStep >= TOTAL_STEPS) return;
    if (!canAdvanceStep(currentStep)) return;
    if (currentStep === 9) syncDetailsFromForm();
    goToStep(Math.min(currentStep + 1, TOTAL_STEPS));
  });

  document.getElementById('roll-6d20-btn')?.addEventListener('click', () => {
    if (currentChar) roll6d20();
  });
  document.getElementById('roll-assign-done')?.addEventListener('click', applyRollAssignments);

  document.getElementById('export-btn')?.addEventListener('click', () => {
    document.getElementById('export-menu')?.classList.toggle('show');
  });
  document.addEventListener('click', (e) => {
    const menu = document.getElementById('export-menu');
    const btn = document.getElementById('export-btn');
    if (menu && btn && !btn.contains(e.target) && !menu.contains(e.target))
      menu.classList.remove('show');
  });

  document.addEventListener('click', (e) => {
    const tab = e.target.closest('.step9-tab');
    if (!tab) return;
    const tabId = tab.dataset.tab;
    if (!tabId) return;
    const container = tab.closest('.step-body');
    if (!container) return;
    container.querySelectorAll('.step9-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    container.querySelectorAll('.step9-tab-pane').forEach(p => {
      p.classList.toggle('active', p.dataset.pane === tabId);
    });
  });
  document.querySelector('[data-export="csv"]')?.addEventListener('click', () => {
    downloadFile(exportToCSV(characters), 'dnd_characters.csv', 'text/csv');
    document.getElementById('export-menu')?.classList.remove('show');
  });
  document.querySelector('[data-export="json"]')?.addEventListener('click', () => {
    downloadFile(exportToJSON(characters), 'dnd_characters.json', 'application/json');
    document.getElementById('export-menu')?.classList.remove('show');
  });

  document.getElementById('import-input')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        const toAdd = Array.isArray(imported) ? imported : (imported && typeof imported === 'object' ? [imported] : []);
        if (toAdd.length === 0) {
          alert('No valid character data found. Expected a character object or array of characters.');
          return;
        }
        toAdd.forEach(c => { if (c && !c.id) c.id = Date.now().toString() + Math.random().toString(36).slice(2); migrateCharacter(c); });
        characters = [...characters, ...toAdd];
        saveCharacters();
        renderCharacterList();
      } catch (err) {
        alert('Failed to import: invalid JSON. Please check the file format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  document.getElementById('add-multiclass-btn')?.addEventListener('click', () => {
    if (!currentChar) return;
    if ((currentChar.level || 1) < 2) { alert('Multiclassing requires level 2 or higher.'); return; }
    const total = (currentChar.level || 1) + (currentChar.multiclass || []).reduce((s, m) => s + (m.level || 0), 0);
    if (total >= 20) { alert('Total level cannot exceed 20.'); return; }
    currentChar.multiclass = currentChar.multiclass || [];
    const used = new Set([currentChar.class, ...(currentChar.multiclass || []).map(m => m.name)]);
    const available = getMergedClasses().filter(c => !used.has(c.name))[0];
    if (!available) { alert('No other classes available to add.'); return; }
    currentChar.multiclass.push({ name: available.name, subclass: '', level: 1 });
    renderMulticlassList();
    updatePreview();
  });

  [
    ['language-select', 'language-add-btn', 'language-input', 'languages-list-items', 'languages'],
    ['resistance-select', 'resistance-add-btn', 'resistance-input', 'resistances-list', 'resistances'],
    ['immunity-select', 'immunity-add-btn', 'immunity-input', 'immunities-list', 'immunities'],
    ['vulnerability-select', 'vulnerability-add-btn', 'vulnerability-input', 'vulnerabilities-list', 'vulnerabilities'],
    ['weakness-select', 'weakness-add-btn', 'weakness-input', 'weaknesses-list', 'weaknesses'],
    ['skill-select', 'skill-add-btn', 'skill-input', 'skills-list', 'skills'],
    ['equipment-select', 'equipment-add-btn', 'equipment-input', 'equipment-list', 'equipment'],
    ['weapon-prof-select', 'weapon-prof-add', null, 'weapon-profs-list', 'weaponProficiencies'],
    ['armor-prof-select', 'armor-prof-add', null, 'armor-profs-list', 'armorProficiencies'],
    ['tool-prof-select', 'tool-prof-add', null, 'tool-profs-list', 'toolProficiencies']
  ].forEach(([selectId, btnId, inputId, listId, arrayName]) => {
    document.getElementById(btnId)?.addEventListener('click', () => {
      const sel = document.getElementById(selectId);
      const val = sel?.value?.trim();
      if (val) {
        if (!currentChar[arrayName]) currentChar[arrayName] = [];
        if (!currentChar[arrayName].includes(val)) {
          currentChar[arrayName].push(val);
          renderArrayList(listId, currentChar[arrayName], arrayName);
          updatePreview();
          sel.value = '';
        }
      } else if (inputId) {
        addArrayItem(inputId, listId, arrayName);
      }
    });
    if (inputId) {
      document.getElementById(inputId)?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addArrayItem(inputId, listId, arrayName);
        }
      });
    }
  });

  // Rules & Reference modal
  initRulesModal();

  // Rule books modal (before new character)
  const ruleBooksModal = document.getElementById('rule-books-modal');
  const closeRuleBooksModal = () => { if (ruleBooksModal) ruleBooksModal.hidden = true; };
  document.getElementById('rule-books-modal-close')?.addEventListener('click', closeRuleBooksModal);
  document.getElementById('rule-books-modal-backdrop')?.addEventListener('click', closeRuleBooksModal);
  document.getElementById('rule-books-modal-cancel')?.addEventListener('click', closeRuleBooksModal);
  const monsterStatModal = document.getElementById('monster-stat-modal');
  const closeMonsterStatModal = () => { if (monsterStatModal) monsterStatModal.hidden = true; };
  document.getElementById('monster-stat-close')?.addEventListener('click', closeMonsterStatModal);
  document.getElementById('monster-stat-backdrop')?.addEventListener('click', closeMonsterStatModal);
  document.getElementById('rule-books-modal-continue')?.addEventListener('click', () => {
    const rulesetChecked = Array.from(document.querySelectorAll('input[name="rule-books-ruleset"]:checked')).map(x => x.value);
    const additionalChecked = Array.from(document.querySelectorAll('input[name="rule-books-additional"]:checked')).map(x => x.value);
    if (rulesetChecked.length === 0) { alert('Please select at least one core rule book.'); return; }
    if (typeof setEnabledRulesets === 'function') setEnabledRulesets(rulesetChecked);
    if (typeof setEnabledAdditionalBooks === 'function') setEnabledAdditionalBooks(additionalChecked);
    if (typeof updateRulesetBadge === 'function') updateRulesetBadge();
    closeRuleBooksModal();
    showBuilderView(null);
  });

  // Spell cast description toggle
  const showSpellOnCastEl = document.getElementById('show-spell-on-cast');
  if (showSpellOnCastEl) {
    try {
      const saved = localStorage.getItem('dnd_show_spell_on_cast');
      showSpellOnCastEl.checked = saved !== 'false';
    } catch (e) {}
    showSpellOnCastEl.addEventListener('change', () => {
      try { localStorage.setItem('dnd_show_spell_on_cast', showSpellOnCastEl.checked); } catch (e) {}
    });
  }
  // Spell cast damage roll toggle
  const rollDamageOnCastEl = document.getElementById('roll-damage-on-cast');
  if (rollDamageOnCastEl) {
    try {
      const saved = localStorage.getItem('dnd_roll_damage_on_cast');
      rollDamageOnCastEl.checked = saved !== 'false';
    } catch (e) {}
    rollDamageOnCastEl.addEventListener('change', () => {
      try { localStorage.setItem('dnd_roll_damage_on_cast', rollDamageOnCastEl.checked); } catch (e) {}
    });
  }

  // Session view
  document.getElementById('session-back-btn')?.addEventListener('click', showListView);
  document.getElementById('session-edit-btn')?.addEventListener('click', () => {
    if (sessionCharacter) showBuilderView(sessionCharacter);
  });
  document.getElementById('sheet-layout-overall')?.addEventListener('change', (e) => {
    if (!sessionCharacter) return;
    sessionCharacter.sheetLayout = sessionCharacter.sheetLayout || { overall: 'single', sections: {} };
    sessionCharacter.sheetLayout.overall = e.target.value;
    saveCharacters();
    applySheetLayout();
  });
  document.getElementById('sheet-layout-customize')?.addEventListener('click', () => {
    if (!sessionCharacter) return;
    const modal = document.getElementById('sheet-section-display-modal');
    const optionsEl = document.getElementById('sheet-section-display-options');
    const layout = sessionCharacter.sheetLayout || { overall: 'single', sections: {} };
    sessionCharacter.sheetLayout = layout;
    if (!layout.sections) layout.sections = {};
    const sectionLabels = { saves: 'Saving Throws', 'ability-checks': 'Ability Checks', about: 'About', senses: 'Senses', skills: 'Skills & Proficiencies', defenses: 'Defenses', conditions: 'Conditions', features: 'Features & Traits' };
    const getMode = (id) => {
      let m = layout.sections[id] || 'full';
      if (SECTION_DISPLAY_LEGACY[m]) m = SECTION_DISPLAY_LEGACY[m];
      return m;
    };
    optionsEl.innerHTML = Object.entries(sectionLabels).map(([id, label]) => `
      <div class="row"><label>${label}</label>
      <select data-section="${id}">
        <option value="full" ${getMode(id) === 'full' ? 'selected' : ''}>Full width</option>
        <option value="compact" ${getMode(id) === 'compact' ? 'selected' : ''}>Compact</option>
        <option value="half" ${getMode(id) === 'half' ? 'selected' : ''}>Half (one column)</option>
      </select></div>`).join('');
    optionsEl.querySelectorAll('select').forEach(sel => {
      sel.onchange = () => {
        layout.sections[sel.dataset.section] = sel.value;
        saveCharacters();
        applySheetLayout();
      };
    });
    modal.hidden = false;
  });
  document.getElementById('sheet-display-close')?.addEventListener('click', () => {
    document.getElementById('sheet-section-display-modal').hidden = true;
  });
  document.querySelectorAll('.session-tab').forEach(tab => {
    tab.addEventListener('click', () => switchSessionTab(tab.dataset.tab));
  });
  document.getElementById('hp-minus')?.addEventListener('click', () => {
    if (!sessionCharacter) return;
    const el = document.getElementById('hp-current');
    const v = Math.max(0, (parseInt(el.value) || sessionCharacter.maxHp || 0) - 1);
    el.value = v;
    sessionCharacter.hp = v;
    saveCharacters();
    renderSessionOverview();
  });
  document.getElementById('hp-plus')?.addEventListener('click', () => {
    if (!sessionCharacter) return;
    const el = document.getElementById('hp-current');
    const max = sessionCharacter.maxHp || 999;
    const v = Math.min(max, (parseInt(el.value) || 0) + 1);
    el.value = v;
    sessionCharacter.hp = v;
    saveCharacters();
    renderSessionOverview();
  });
  const applyHpDelta = (delta) => {
    if (!sessionCharacter) return;
    const el = document.getElementById('hp-current');
    const max = sessionCharacter.maxHp || 999;
    const current = parseInt(el.value) || 0;
    const v = Math.max(0, Math.min(max, current + delta));
    el.value = v;
    sessionCharacter.hp = v;
    saveCharacters();
    renderSessionOverview();
  };
  document.getElementById('hp-damage-1')?.addEventListener('click', () => applyHpDelta(-1));
  document.getElementById('hp-damage-5')?.addEventListener('click', () => applyHpDelta(-5));
  document.getElementById('hp-heal-1')?.addEventListener('click', () => applyHpDelta(1));
  document.getElementById('hp-heal-5')?.addEventListener('click', () => applyHpDelta(5));
  document.getElementById('short-rest-btn')?.addEventListener('click', () => {
    if (!sessionCharacter) return;
    if (confirm('Take a short rest? You may spend Hit Dice to heal. Warlocks regain pact magic slots.')) {
      const hdUsed = parseInt(document.getElementById('hd-used').value) || 0;
      sessionCharacter.hitDiceUsed = hdUsed;
      if (sessionCharacter.class === 'Warlock' && typeof sessionCharacter.spellSlotsUsed !== 'undefined') {
        sessionCharacter.spellSlotsUsed = sessionCharacter.spellSlotsUsed.map(() => 0);
      }
      saveCharacters();
      renderSessionCombat();
      renderSessionSpells();
      renderSessionOverview();
    }
  });
  document.getElementById('long-rest-btn')?.addEventListener('click', () => {
    if (!sessionCharacter) return;
    if (confirm('Take a long rest? Restore all HP, half Hit Dice, all spell slots. Exhaustion decreases by 1.')) {
      sessionCharacter.hp = sessionCharacter.maxHp ?? sessionCharacter.hp;
      document.getElementById('hp-current').value = sessionCharacter.hp;
      const level = sessionCharacter.level || 1;
      const regain = Math.floor(level / 2);
      sessionCharacter.hitDiceUsed = Math.max(0, (sessionCharacter.hitDiceUsed || 0) - regain);
      document.getElementById('hd-used').value = sessionCharacter.hitDiceUsed;
      sessionCharacter.spellSlotsUsed = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      if ((sessionCharacter.exhaustion || 0) > 0) sessionCharacter.exhaustion--;
      saveCharacters();
      renderSessionCombat();
      renderSessionSpells();
      renderSessionOverview();
    }
  });
  ['hp-current', 'hp-max', 'hp-temp'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', saveSessionCombat);
  });
  document.getElementById('condition-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = document.getElementById('condition-input')?.value?.trim();
      if (val && sessionCharacter) {
        sessionCharacter.conditions = sessionCharacter.conditions || [];
        sessionCharacter.conditions.push(val);
        document.getElementById('condition-input').value = '';
        saveCharacters();
        renderSessionCombat();
        renderSessionOverview();
      }
    }
  });
  document.getElementById('known-spell-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKnownSpell();
    }
  });
  document.getElementById('xp-add-btn')?.addEventListener('click', () => {
    if (!sessionCharacter) return;
    const add = prompt('Add how much XP?');
    if (add != null && !isNaN(parseInt(add))) {
      const newXp = (sessionCharacter.xp || 0) + parseInt(add);
      const newLevel = typeof getLevelFromXp === 'function' ? getLevelFromXp(newXp) : 1;
      const currentLevel = sessionCharacter.level || 1;
      if (newLevel > currentLevel) {
        performLevelUp(sessionCharacter, currentLevel, newLevel, {
          newXp,
          onDone: () => {
            saveCharacters();
            renderSessionLeveling();
            if (typeof renderSessionView === 'function') renderSessionView();
            alert(`Level up! Now level ${sessionCharacter.level}.`);
          }
        });
      } else {
        sessionCharacter.xp = newXp;
        saveCharacters();
        renderSessionLeveling();
      }
    }
  });
  document.getElementById('level-up-btn')?.addEventListener('click', () => {
    if (!sessionCharacter) return;
    const currentLevel = sessionCharacter.level || 1;
    const newLevel = Math.min(20, currentLevel + 1);
    if (newLevel <= currentLevel) return;
    performLevelUp(sessionCharacter, currentLevel, newLevel, {
      onDone: () => {
        saveCharacters();
        renderSessionLeveling();
        renderSessionSpells();
        if (typeof renderSessionView === 'function') renderSessionView();
        alert(`Level up! Now level ${sessionCharacter.level}.`);
      }
    });
  });
  document.getElementById('spell-swap-btn')?.addEventListener('click', () => {
    if (!sessionCharacter) return;
    const out = document.getElementById('spell-swap-out')?.value?.trim();
    const inn = document.getElementById('spell-swap-in')?.value?.trim();
    if (!out || !inn || !sessionCharacter.knownSpells) return;
    const idx = sessionCharacter.knownSpells.indexOf(out);
    if (idx >= 0) {
      sessionCharacter.knownSpells[idx] = inn;
      saveCharacters();
      renderSessionLeveling();
      renderSessionSpells();
    }
  });
  document.querySelectorAll('input[name="leveling-mode"]').forEach(r => {
    r.addEventListener('change', () => {
      if (!sessionCharacter) return;
      sessionCharacter.levelingMode = r.value;
      saveCharacters();
      renderSessionLeveling();
    });
  });

  // Role toggle (Player / DM)
  const rolePlayer = document.getElementById('role-player');
  const roleDm = document.getElementById('role-dm');
  const dmPanel = document.getElementById('dm-panel');
  const mainPlayer = document.getElementById('main-player-content');
  const setRole = (role) => {
    localStorage.setItem('dnd_role', role);
    rolePlayer?.classList.toggle('active', role === 'player');
    roleDm?.classList.toggle('active', role === 'dm');
    if (dmPanel) dmPanel.hidden = role !== 'dm';
    if (mainPlayer) mainPlayer.hidden = role === 'dm';
    if (role === 'dm') { renderDMMonsters(); renderDMNPCs(); renderDMMaps(); }
  };
  rolePlayer?.addEventListener('click', () => setRole('player'));
  roleDm?.addEventListener('click', () => setRole('dm'));
  setRole(localStorage.getItem('dnd_role') || 'player');

  // Tools dropdown
  const toolsBtn = document.getElementById('tools-menu-btn');
  const toolsDropdown = document.getElementById('tools-dropdown');
  toolsBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    toolsDropdown.hidden = !toolsDropdown.hidden;
  });
  document.addEventListener('click', () => { if (toolsDropdown) toolsDropdown.hidden = true; });
  toolsDropdown?.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const tool = btn.dataset.tool;
      if (tool === 'rules') { document.getElementById('rules-btn')?.click(); }
      if (tool === 'quick-rules') {
        const modal = document.getElementById('quick-rules-modal');
        if (modal) { modal.hidden = false; }
      }
      if (tool === 'quick-reference') {
        const modal = document.getElementById('quick-reference-modal');
        if (modal) { modal.hidden = false; document.getElementById('quick-ref-search')?.focus(); }
        if (typeof renderQuickReference === 'function') renderQuickReference('');
      }
      if (tool === 'battle-map') showBattleMapView();
      toolsDropdown.hidden = true;
    });
  });

  // Quick Rules modal
  document.getElementById('quick-rules-btn')?.addEventListener('click', () => {
    const modal = document.getElementById('quick-rules-modal');
    if (modal) { modal.hidden = false; }
  });
  document.getElementById('quick-rules-close')?.addEventListener('click', () => {
    const modal = document.getElementById('quick-rules-modal');
    if (modal) { modal.hidden = true; modal.style.display = 'none'; }
  });
  document.getElementById('quick-rules-backdrop')?.addEventListener('click', () => {
    const modal = document.getElementById('quick-rules-modal');
    if (modal) { modal.hidden = true; }
  });

  document.getElementById('quick-reference-close')?.addEventListener('click', () => { document.getElementById('quick-reference-modal').hidden = true; });
  document.getElementById('quick-reference-backdrop')?.addEventListener('click', () => { document.getElementById('quick-reference-modal').hidden = true; });
  document.getElementById('quick-ref-search')?.addEventListener('input', (e) => { if (typeof renderQuickReference === 'function') renderQuickReference(e.target.value); });
  document.getElementById('quick-ref-search')?.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.getElementById('quick-reference-modal').hidden = true; });
  document.getElementById('quick-ref-filter')?.addEventListener('change', () => { if (typeof renderQuickReference === 'function') renderQuickReference(document.getElementById('quick-ref-search')?.value || ''); });

  // DM Panel tabs
  document.querySelectorAll('.dm-panel-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.dm-panel-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('#dm-panel .dm-pane').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const pane = document.getElementById(`dm-pane-${tab.dataset.dmTab}`);
      if (pane) pane.classList.add('active');
      if (tab.dataset.dmTab === 'monsters') renderDMMonsters();
      if (tab.dataset.dmTab === 'npcs') renderDMNPCs();
      if (tab.dataset.dmTab === 'maps') renderDMMaps();
    });
  });
  document.getElementById('dm-save-current-map')?.addEventListener('click', saveCurrentMapToDM);
  document.getElementById('monster-search')?.addEventListener('input', () => renderDMMonsters());
  document.getElementById('monster-cr-filter')?.addEventListener('change', () => renderDMMonsters());
  document.getElementById('monster-type-filter')?.addEventListener('change', () => renderDMMonsters());
  document.getElementById('monster-sort')?.addEventListener('change', () => renderDMMonsters());

  // Custom race
  document.getElementById('add-custom-race-btn')?.addEventListener('click', () => {
    document.getElementById('custom-race-name').value = '';
    document.getElementById('custom-race-desc').value = '';
    document.getElementById('custom-race-speed').value = '30';
    document.getElementById('custom-race-ability').value = '';
    document.getElementById('custom-race-traits').value = '';
    document.getElementById('custom-race-langs').value = 'Common';
    document.getElementById('custom-race-modal').hidden = false;
  });
  document.getElementById('custom-race-close')?.addEventListener('click', () => { document.getElementById('custom-race-modal').hidden = true; });
  document.getElementById('custom-race-backdrop')?.addEventListener('click', () => { document.getElementById('custom-race-modal').hidden = true; });
  document.getElementById('custom-race-save')?.addEventListener('click', () => {
    const name = document.getElementById('custom-race-name')?.value?.trim();
    if (!name) { alert('Enter a race name.'); return; }
    const abilityStr = document.getElementById('custom-race-ability')?.value?.trim() || '';
    const abilityScore = {};
    abilityStr.split(',').forEach(p => {
      const [k, v] = p.split(':').map(s => s?.trim());
      if (k && v) abilityScore[k.toLowerCase()] = parseInt(v) || 1;
    });
    if (typeof addCustomRace === 'function' && addCustomRace({
      name,
      description: document.getElementById('custom-race-desc')?.value || '',
      speed: parseInt(document.getElementById('custom-race-speed')?.value) || 30,
      abilityScore: Object.keys(abilityScore).length ? abilityScore : { any: 1 },
      traits: (document.getElementById('custom-race-traits')?.value || '').split(',').map(s => s.trim()).filter(Boolean),
      languages: (document.getElementById('custom-race-langs')?.value || 'Common').split(',').map(s => s.trim()).filter(Boolean),
      languagesExtra: 0
    })) {
      document.getElementById('custom-race-modal').hidden = true;
      if (currentStep === 2) renderRaceStep();
    }
  });

  // Custom background
  document.getElementById('add-custom-background-btn')?.addEventListener('click', () => {
    document.getElementById('custom-bg-name').value = '';
    document.getElementById('custom-bg-desc').value = '';
    document.getElementById('custom-bg-skills').value = '';
    document.getElementById('custom-background-modal').hidden = false;
  });
  document.getElementById('custom-background-close')?.addEventListener('click', () => { document.getElementById('custom-background-modal').hidden = true; });
  document.getElementById('custom-background-backdrop')?.addEventListener('click', () => { document.getElementById('custom-background-modal').hidden = true; });
  document.getElementById('custom-bg-save')?.addEventListener('click', () => {
    const name = document.getElementById('custom-bg-name')?.value?.trim();
    if (!name) { alert('Enter a background name.'); return; }
    if (typeof addCustomBackground === 'function' && addCustomBackground({
      name,
      description: document.getElementById('custom-bg-desc')?.value || '',
      skillProficiencies: (document.getElementById('custom-bg-skills')?.value || '').split(',').map(s => s.trim()).filter(Boolean)
    })) {
      document.getElementById('custom-background-modal').hidden = true;
      if (currentStep === 6) renderBackgroundStep();
    }
  });

  // DM NPCs
  document.getElementById('dm-add-npc-btn')?.addEventListener('click', () => openNPCModal());
  document.getElementById('npc-modal-close')?.addEventListener('click', () => { document.getElementById('npc-modal').hidden = true; });
  document.getElementById('npc-modal-backdrop')?.addEventListener('click', () => { document.getElementById('npc-modal').hidden = true; });
  document.getElementById('npc-save-btn')?.addEventListener('click', () => saveNPCModal(false));
  document.getElementById('npc-add-to-map-btn')?.addEventListener('click', () => saveNPCModal(true));

  // Battle map
  document.getElementById('battle-map-btn')?.addEventListener('click', showBattleMapView);
  document.getElementById('battle-map-back-btn')?.addEventListener('click', () => {
    if (sessionCharacter) showSessionView(sessionCharacter);
    else showListView();
  });
  document.getElementById('battle-map-character-btn')?.addEventListener('click', () => {
    if (sessionCharacter) showSessionView(sessionCharacter);
  });
  document.getElementById('session-battle-map-btn')?.addEventListener('click', showBattleMapView);
  initBattleMap();

  if (typeof updateRulesetBadge === 'function') updateRulesetBadge();

  renderCharacterList();
}

// ========== DM TOOLS ==========
function getDMNPCs() {
  try {
    const s = localStorage.getItem('dnd_dm_npcs');
    return s ? JSON.parse(s) : [];
  } catch (e) { return []; }
}
function setDMNPCs(arr) {
  localStorage.setItem('dnd_dm_npcs', JSON.stringify(Array.isArray(arr) ? arr : []));
}
let editingNPCIdx = null;
function openNPCModal(idx = null) {
  editingNPCIdx = idx;
  const title = document.getElementById('npc-modal-title');
  if (title) title.textContent = idx != null ? 'Edit NPC' : 'Add NPC';
  if (idx != null) {
    const npcs = getDMNPCs();
    const n = npcs[idx];
    if (n) {
      document.getElementById('npc-name').value = n.name || '';
      document.getElementById('npc-role').value = n.role || '';
      document.getElementById('npc-ac').value = n.ac ?? '';
      document.getElementById('npc-hp').value = n.hp || '';
      document.getElementById('npc-notes').value = n.notes || '';
      document.getElementById('npc-stats').value = n.stats || '';
    }
  } else {
    document.getElementById('npc-name').value = '';
    document.getElementById('npc-role').value = '';
    document.getElementById('npc-ac').value = '';
    document.getElementById('npc-hp').value = '';
    document.getElementById('npc-notes').value = '';
    document.getElementById('npc-stats').value = '';
  }
  document.getElementById('npc-modal').hidden = false;
}
function saveNPCModal(addToMap) {
  const name = document.getElementById('npc-name')?.value?.trim() || 'Unnamed NPC';
  const npc = {
    name,
    role: document.getElementById('npc-role')?.value?.trim() || '',
    ac: parseInt(document.getElementById('npc-ac')?.value) || null,
    hp: document.getElementById('npc-hp')?.value?.trim() || '',
    notes: document.getElementById('npc-notes')?.value?.trim() || '',
    stats: document.getElementById('npc-stats')?.value?.trim() || ''
  };
  const npcs = getDMNPCs();
  if (editingNPCIdx != null) {
    npcs[editingNPCIdx] = npc;
  } else {
    npcs.push(npc);
  }
  setDMNPCs(npcs);
  document.getElementById('npc-modal').hidden = true;
  renderDMNPCs();
  if (addToMap) {
    const m = { name: npc.name, ac: npc.ac ?? 10, hp: npc.hp || '1', type: 'Humanoid', cr: 0, xp: 10 };
    addMonsterToBattleMap(m, npc);
  }
}
function renderDMNPCs() {
  const list = document.getElementById('dm-npcs-list');
  if (!list) return;
  const npcs = getDMNPCs();
  list.innerHTML = npcs.length ? npcs.map((n, i) => `
    <div class="dm-list-item dm-npc-item">
      <div class="dm-npc-header">
        <strong>${esc(n.name || 'Unnamed')}</strong>
        ${n.role ? `<span class="dm-npc-role">${esc(n.role)}</span>` : ''}
      </div>
      ${n.notes ? `<p class="dm-npc-notes">${esc((n.notes || '').slice(0, 80))}${(n.notes || '').length > 80 ? '…' : ''}</p>` : ''}
      <div class="dm-npc-actions">
        <button type="button" class="btn btn-secondary btn-sm dm-npc-edit" data-idx="${i}">Edit</button>
        <button type="button" class="btn btn-primary btn-sm dm-npc-to-map" data-idx="${i}">Add to Map</button>
        <button type="button" class="btn btn-ghost btn-sm dm-npc-delete" data-idx="${i}">×</button>
      </div>
    </div>
  `).join('') : '<p class="dm-empty">No NPCs. Click "Add NPC" to create one.</p>';
  list.querySelectorAll('.dm-npc-edit').forEach(btn => {
    btn.onclick = () => openNPCModal(parseInt(btn.dataset.idx));
  });
  list.querySelectorAll('.dm-npc-to-map').forEach(btn => {
    btn.onclick = () => {
      const npcs = getDMNPCs();
      const n = npcs[parseInt(btn.dataset.idx)];
      if (n) {
        const m = { name: n.name, ac: n.ac ?? 10, hp: n.hp || '1', type: 'Humanoid', cr: 0, xp: 10 };
        addMonsterToBattleMap(m, n);
      }
    };
  });
  list.querySelectorAll('.dm-npc-delete').forEach(btn => {
    btn.onclick = () => {
      const npcs = getDMNPCs();
      npcs.splice(parseInt(btn.dataset.idx), 1);
      setDMNPCs(npcs);
      renderDMNPCs();
    };
  });
}

function renderDMMonsters() {
  const list = document.getElementById('dm-monsters-list');
  if (!list) return;
  const monsters = typeof SRD_MONSTERS !== 'undefined' ? SRD_MONSTERS : [];
  const search = (document.getElementById('monster-search')?.value || '').toLowerCase();
  const crFilter = document.getElementById('monster-cr-filter')?.value || '';
  const typeFilter = document.getElementById('monster-type-filter')?.value || '';
  const sortBy = document.getElementById('monster-sort')?.value || 'name';
  const types = [...new Set(monsters.map(m => m.type).filter(Boolean))].sort();
  const typeSel = document.getElementById('monster-type-filter');
  if (typeSel && typeSel.options.length <= 1) {
    typeSel.innerHTML = '<option value="">All types</option>' + types.map(t => `<option value="${t}">${t}</option>`).join('');
  }
  let filtered = monsters.filter(m => {
    const matchSearch = !search || m.name.toLowerCase().includes(search) ||
      String(m.cr).includes(search) || (m.type || '').toLowerCase().includes(search);
    const diff = typeof getCrDifficulty === 'function' ? getCrDifficulty(m.cr).toLowerCase() : '';
    const matchCr = !crFilter || diff === crFilter;
    const matchType = !typeFilter || (m.type || '') === typeFilter;
    return matchSearch && matchCr && matchType;
  });
  filtered.sort((a, b) => {
    if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
    if (sortBy === 'cr') return (a.cr ?? 0) - (b.cr ?? 0);
    if (sortBy === 'type') return (a.type || '').localeCompare(b.type || '');
    return 0;
  });
  list.innerHTML = filtered.length ? filtered.map((m, idx) => {
    const diff = typeof getCrDifficulty === 'function' ? getCrDifficulty(m.cr) : '';
    return `<div class="dm-monster-card" data-idx="${idx}" role="button" tabindex="0">
      <strong>${esc(m.name)}</strong>
      <span class="dm-monster-meta">${m.type || ''} · CR ${m.cr} (${diff})</span>
      <span class="dm-monster-stats">AC ${m.ac} · HP ${m.hp || '?'} · ${m.xp || ''} XP</span>
      <span class="dm-monster-hint">Click for full stats · Add to map</span>
    </div>`;
  }).join('') : '<p class="dm-empty">No monsters match your search. Try a different filter.</p>';
  list.querySelectorAll('.dm-monster-card').forEach((card, idx) => {
    const m = filtered[idx];
    const openModal = () => showMonsterStatModal(m);
    card.addEventListener('click', openModal);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(); }
    });
  });
}
function parseMonsterMaxHp(hp) {
  if (hp == null) return null;
  const s = String(hp).trim();
  const m = s.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}
function showMonsterStatModal(m, token) {
  const modal = document.getElementById('monster-stat-modal');
  const title = document.getElementById('monster-stat-title');
  const body = document.getElementById('monster-stat-body');
  const addBtn = document.getElementById('monster-add-to-map-btn');
  const hpControls = document.getElementById('monster-hp-controls');
  const hpDisplay = document.getElementById('monster-hp-display');
  const hpInput = document.getElementById('monster-hp-input');
  const hpMinus = document.getElementById('monster-hp-minus');
  const hpPlus = document.getElementById('monster-hp-plus');
  if (!modal || !title || !body) return;
  const diff = typeof getCrDifficulty === 'function' ? getCrDifficulty(m.cr) : '';
  const stats = [];
  if (m.str != null) stats.push(`STR ${m.str}`);
  if (m.dex != null) stats.push(`DEX ${m.dex}`);
  if (m.con != null) stats.push(`CON ${m.con}`);
  if (m.int != null) stats.push(`INT ${m.int}`);
  if (m.wis != null) stats.push(`WIS ${m.wis}`);
  if (m.cha != null) stats.push(`CHA ${m.cha}`);
  const npcData = token?.npcData;
  let html = npcData ? `<p class="monster-stat-meta"><strong>NPC</strong> · ${npcData.role || '—'}</p>` : `<p class="monster-stat-meta"><strong>${m.type || ''}</strong> · Challenge ${m.cr} (${diff}) · ${m.xp || ''} XP</p>`;
  html += `<div class="monster-stat-grid"><span>AC ${m.ac ?? '?'}</span><span>HP ${m.hp || '?'}</span><span>Speed ${m.speed || '?'}</span></div>`;
  if (npcData?.notes) html += `<p><strong>Notes:</strong> ${esc(npcData.notes)}</p>`;
  if (npcData?.stats) html += `<p><strong>Stats:</strong> ${esc(npcData.stats)}</p>`;
  if (stats.length) html += `<p><strong>Ability Scores:</strong> ${stats.join(', ')}</p>`;
  if (m.saves) html += `<p><strong>Saving Throws:</strong> ${m.saves}</p>`;
  if (m.skills) html += `<p><strong>Skills:</strong> ${m.skills}</p>`;
  if (m.senses) html += `<p><strong>Senses:</strong> ${m.senses}</p>`;
  if (m.languages) html += `<p><strong>Languages:</strong> ${m.languages}</p>`;
  if (m.vulnerabilities) html += `<p><strong>Vulnerabilities:</strong> ${m.vulnerabilities}</p>`;
  if (m.immunities) html += `<p><strong>Immunities:</strong> ${m.immunities}</p>`;
  if (m.traits) html += `<p><strong>Traits:</strong> ${m.traits}</p>`;
  if (m.actions) html += `<p><strong>Actions:</strong> ${m.actions}</p>`;
  title.textContent = m.name;
  body.innerHTML = html;
  addBtn.hidden = !!token;
  hpControls.hidden = !token;
  if (token) {
    const maxHp = token.maxHp ?? parseMonsterMaxHp(m.hp);
    const cur = token.currentHp ?? maxHp ?? 0;
    hpDisplay.textContent = `${cur}/${maxHp ?? '?'}`;
    hpInput.value = '';
    hpInput.placeholder = 'Set';
    const updateHp = (delta) => {
      const newVal = Math.max(0, (token.currentHp ?? maxHp ?? cur) + delta);
      token.currentHp = newVal;
      if (token.maxHp == null && maxHp != null) token.maxHp = maxHp;
      hpDisplay.textContent = `${token.currentHp}/${token.maxHp ?? '?'}`;
      saveAndRenderBattleMap();
    };
    hpMinus.onclick = () => updateHp(-1);
    hpPlus.onclick = () => updateHp(1);
    hpInput.onchange = () => {
      const v = parseInt(hpInput.value, 10);
      if (!isNaN(v) && v >= 0) { token.currentHp = v; token.maxHp = maxHp ?? Math.max(v, token.maxHp ?? 0); hpDisplay.textContent = `${token.currentHp}/${token.maxHp ?? '?'}`; saveAndRenderBattleMap(); }
      hpInput.value = '';
    };
  }
  addBtn.onclick = () => {
    if (m) {
      const label = prompt('Display label on map (e.g. G1, or leave blank for auto):', '');
      addMonsterToBattleMap(m, m.npcData || null, label?.trim() || null);
    }
    modal.hidden = true;
  };
  modal.hidden = false;
}
function addMonsterToBattleMap(m, npcData = null, label = null) {
  const name = (m.name || 'Token').slice(0, 20);
  const color = BATTLE_MAP_COLORS[battleMapTokens.length % BATTLE_MAP_COLORS.length];
  const cols = parseInt(document.getElementById('grid-cols')?.value) || 10;
  const rows = parseInt(document.getElementById('grid-rows')?.value) || 10;
  const used = new Set(battleMapTokens.map(t => `${t.x},${t.y}`));
  let x = 0, y = 0;
  outer: for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = `${c},${r}`;
      if (!used.has(key) && battleMapCells[key]?.type !== 'wall') { x = c; y = r; break outer; }
    }
  }
  const maxHp = parseMonsterMaxHp(m.hp);
  const token = { id: Date.now(), name, x, y, color, monsterData: m, npcData: npcData || m.npcData, maxHp, currentHp: maxHp };
  if (label) token.label = label;
  battleMapTokens.push(token);
  saveAndRenderBattleMap();
  showBattleMapView();
}
function renderDMMaps() {
  const list = document.getElementById('dm-maps-list');
  if (!list) return;
  const maps = JSON.parse(localStorage.getItem('dnd_dm_maps') || '[]');
  list.innerHTML = maps.length ? maps.map((m, i) => `
    <div class="dm-list-item">
      <strong>${esc(m.name || 'Map')}</strong> — ${m.cols || 10}×${m.rows || 10}, ${(m.tokens || []).length} tokens
      <button type="button" class="btn btn-secondary btn-sm dm-load-map" data-idx="${i}">Load</button>
      <button type="button" class="btn btn-ghost btn-sm dm-remove-map" data-idx="${i}">Remove</button>
    </div>
  `).join('') : '<p class="dm-empty">No maps saved. Create a battle map and click "Save Current Map" to store it.</p>';
  list.querySelectorAll('.dm-load-map').forEach(btn => {
    btn.addEventListener('click', () => {
      const maps = JSON.parse(localStorage.getItem('dnd_dm_maps') || '[]');
      const m = maps[parseInt(btn.dataset.idx)];
      if (m) {
        battleMapTokens = (m.tokens || []).map(t => ({ ...t, color: t.color || BATTLE_MAP_COLORS[0] }));
        battleMapCells = m.cells || {};
        const colsEl = document.getElementById('grid-cols');
        const rowsEl = document.getElementById('grid-rows');
        if (colsEl) colsEl.value = m.cols || 10;
        if (rowsEl) rowsEl.value = m.rows || 10;
        saveAndRenderBattleMap();
        showBattleMapView();
      }
    });
  });
  list.querySelectorAll('.dm-remove-map').forEach(removeBtn => {
    removeBtn.addEventListener('click', () => {
      const idx = parseInt(removeBtn.dataset.idx);
      const maps = JSON.parse(localStorage.getItem('dnd_dm_maps') || '[]');
      maps.splice(idx, 1);
      localStorage.setItem('dnd_dm_maps', JSON.stringify(maps));
      renderDMMaps();
    });
  });
}
function saveCurrentMapToDM() {
  const name = prompt('Map name?') || 'Map ' + (Date.now() % 10000);
  const cols = parseInt(document.getElementById('grid-cols')?.value) || 10;
  const rows = parseInt(document.getElementById('grid-rows')?.value) || 10;
  const maps = JSON.parse(localStorage.getItem('dnd_dm_maps') || '[]');
  maps.push({ name, cols, rows, tokens: [...battleMapTokens], cells: { ...battleMapCells } });
  localStorage.setItem('dnd_dm_maps', JSON.stringify(maps));
  renderDMMaps();
  alert('Map saved!');
}

function showBattleMapView() {
  const mainPlayer = document.getElementById('main-player-content');
  const dmPanel = document.getElementById('dm-panel');
  if (mainPlayer) mainPlayer.hidden = false;
  if (dmPanel) dmPanel.hidden = true;
  listView.style.display = 'none';
  builderView.hidden = true;
  sessionView.hidden = true;
  battleMapView.hidden = false;
  const backBtn = document.getElementById('battle-map-back-btn');
  const charBtn = document.getElementById('battle-map-character-btn');
  if (backBtn) backBtn.textContent = sessionCharacter ? '← Back to Character' : '← Back';
  if (charBtn) charBtn.hidden = !sessionCharacter;
  renderBattleMapGrid();
}

const BATTLE_MAP_COLORS = ['#6b2d3c', '#2d4a2d', '#1a5276', '#6c3483', '#b8860b', '#c0392b', '#27ae60', '#2980b9'];

let battleMapTokens = [];
let battleMapCells = {};
function initBattleMap() {
  try {
    const saved = localStorage.getItem('dnd_battle_map');
    if (saved) {
      const data = JSON.parse(saved);
      battleMapTokens = (data.tokens || []).map(t => ({ ...t, color: t.color || BATTLE_MAP_COLORS[0] }));
      battleMapCells = data.cells || {};
      const cols = document.getElementById('grid-cols');
      const rows = document.getElementById('grid-rows');
      if (cols && data.cols) cols.value = data.cols;
      if (rows && data.rows) rows.value = data.rows;
      const zoom = document.getElementById('battle-map-zoom');
      if (zoom && data.zoom) zoom.value = String(data.zoom);
      const gridLines = document.getElementById('grid-lines-toggle');
      if (gridLines && data.gridLines !== undefined) gridLines.checked = data.gridLines;
    }
  } catch (e) {}
  document.getElementById('monster-stats-toggle')?.addEventListener('click', toggleMonsterStatsPanel);
  document.getElementById('grid-cols')?.addEventListener('change', saveAndRenderBattleMap);
  document.getElementById('grid-rows')?.addEventListener('change', saveAndRenderBattleMap);
  document.getElementById('grid-lines-toggle')?.addEventListener('change', saveAndRenderBattleMap);
  document.getElementById('battle-map-zoom')?.addEventListener('change', saveAndRenderBattleMap);
  document.getElementById('add-token-btn')?.addEventListener('click', () => {
    const name = prompt('Token name?') || 'Token';
    const label = prompt('Display label on map (short, e.g. G1, or leave blank for first 4 letters):', '');
    const color = BATTLE_MAP_COLORS[battleMapTokens.length % BATTLE_MAP_COLORS.length];
    const token = { id: Date.now(), name, x: 0, y: 0, color };
    if (label && label.trim()) token.label = label.trim();
    battleMapTokens.push(token);
    saveAndRenderBattleMap();
  });
  document.getElementById('clear-tokens-btn')?.addEventListener('click', () => {
    if (battleMapTokens.length && confirm('Remove all tokens?')) {
      battleMapTokens = [];
      saveAndRenderBattleMap();
    }
  });
}

function saveAndRenderBattleMap() {
  const cols = parseInt(document.getElementById('grid-cols')?.value) || 10;
  const rows = parseInt(document.getElementById('grid-rows')?.value) || 10;
  const zoom = parseFloat(document.getElementById('battle-map-zoom')?.value) || 1;
  const gridLines = document.getElementById('grid-lines-toggle')?.checked !== false;
  localStorage.setItem('dnd_battle_map', JSON.stringify({ cols, rows, tokens: battleMapTokens, cells: battleMapCells, zoom, gridLines }));
  renderBattleMapGrid();
}

function toggleMonsterStatsPanel() {
  const btn = document.getElementById('monster-stats-toggle');
  const list = document.getElementById('monster-stats-list');
  if (!btn || !list) return;
  const expanded = list.hidden;
  list.hidden = !expanded;
  btn.setAttribute('aria-expanded', expanded);
  btn.querySelector('.toggle-icon').textContent = expanded ? '▼' : '▶';
}

function renderBattleMapGrid() {
  const grid = document.getElementById('battle-map-grid');
  const container = document.getElementById('battle-map-container');
  const tokenList = document.getElementById('battle-map-token-list');
  if (!grid) return;
  const cols = parseInt(document.getElementById('grid-cols')?.value) || 10;
  const rows = parseInt(document.getElementById('grid-rows')?.value) || 10;
  const zoom = parseFloat(document.getElementById('battle-map-zoom')?.value) || 1;
  const gridLines = document.getElementById('grid-lines-toggle')?.checked !== false;

  if (container) container.style.zoom = zoom;
  grid.classList.toggle('grid-no-lines', !gridLines);

  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  grid.innerHTML = '';
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const key = `${x},${y}`;
      const cellData = battleMapCells[key] || {};
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      if (cellData.type === 'difficult') cell.classList.add('grid-cell--difficult');
      else if (cellData.type === 'wall') cell.classList.add('grid-cell--wall');
      else if (cellData.type === 'elevation' && cellData.elevation > 0) {
        cell.classList.add(cellData.elevation >= 2 ? 'grid-cell--elevation2' : 'grid-cell--elevation');
        cell.dataset.elevation = cellData.elevation;
      } else if (cellData.type === 'elevation' && cellData.elevation < 0) {
        cell.classList.add('grid-cell--elevation-low');
        cell.dataset.elevation = cellData.elevation;
      }
      cell.dataset.x = x;
      cell.dataset.y = y;
      const token = battleMapTokens.find(t => t.x === x && t.y === y);
      if (token) {
        const tok = document.createElement('div');
        tok.className = 'map-token';
        const maxHp = token.maxHp ?? (token.monsterData ? parseMonsterMaxHp(token.monsterData.hp) : null);
        const curHp = token.currentHp ?? maxHp;
        const displayLabel = token.label || (token.name.length <= 4 ? token.name : token.name.slice(0, 4));
        tok.textContent = displayLabel;
        tok.title = token.monsterData ? `${token.name} HP ${curHp}/${maxHp ?? '?'} (${x},${y}) — click for stats, double-click to edit label` : `${token.name} (${x},${y}) — double-click to edit`;
        if (token.monsterData && (maxHp != null || curHp != null)) {
          const badge = document.createElement('span');
          badge.className = 'map-token-hp';
          badge.textContent = curHp ?? '?';
          tok.appendChild(badge);
        }
        tok.style.backgroundColor = token.color || BATTLE_MAP_COLORS[0];
        tok.draggable = true;
        tok.dataset.id = token.id;
        tok.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('tokenId', token.id);
        });
        tok.addEventListener('click', (e) => {
          e.stopPropagation();
          if (e.detail === 1 && token.monsterData) showMonsterStatModal(token.monsterData, token);
        });
        tok.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          const label = prompt('Display label on map (short, e.g. G1 or full name):', token.label || token.name);
          if (label != null) {
            if (label.trim()) token.label = label.trim();
            else delete token.label;
            saveAndRenderBattleMap();
          }
        });
        tok.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          const color = prompt('Token color (hex, e.g. #ff0000):', token.color);
          if (color && /^#[0-9a-fA-F]{6}$/.test(color)) { token.color = color; saveAndRenderBattleMap(); }
        });
        cell.appendChild(tok);
      }
      cell.addEventListener('dragover', (e) => e.preventDefault());
      cell.addEventListener('drop', (e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('tokenId');
        if (id) {
          const ck = `${cell.dataset.x},${cell.dataset.y}`;
          if (battleMapCells[ck]?.type === 'wall') return;
          const t = battleMapTokens.find(x => x.id == id);
          if (t) {
            t.x = parseInt(cell.dataset.x);
            t.y = parseInt(cell.dataset.y);
            saveAndRenderBattleMap();
          }
        }
      });
      cell.addEventListener('click', () => {
        const tool = document.getElementById('terrain-paint-tool')?.value;
        if (!tool) return;
        const type = tool;
        if (type === 'normal') delete battleMapCells[key];
        else if (type === 'elevation') battleMapCells[key] = { type: 'elevation', elevation: 1 };
        else if (type === 'elevation2') battleMapCells[key] = { type: 'elevation', elevation: 2 };
        else if (type === 'elevation-1') battleMapCells[key] = { type: 'elevation', elevation: -1 };
        else battleMapCells[key] = { type };
        saveAndRenderBattleMap();
      });
      grid.appendChild(cell);
    }
  }

  if (tokenList) {
    tokenList.innerHTML = battleMapTokens.length ? battleMapTokens.map(t => {
      const maxHp = t.maxHp ?? (t.monsterData ? parseMonsterMaxHp(t.monsterData.hp) : null);
      const curHp = t.currentHp ?? maxHp;
      const hpStr = t.monsterData && maxHp != null ? `${curHp}/${maxHp}` : '';
      return `<div class="token-list-item" data-id="${t.id}">
        <span class="token-color" style="background:${t.color || BATTLE_MAP_COLORS[0]}"></span>
        <span class="token-name">${t.name}</span>
        ${hpStr ? `<span class="token-hp">${hpStr}</span>` : ''}
        <span class="token-pos">(${t.x},${t.y})</span>
        ${t.monsterData ? `<div class="token-hp-btns"><button type="button" class="hp-btn" title="Damage">−</button><button type="button" class="hp-btn" title="Heal">+</button></div><button type="button" class="token-stats-btn" title="View stats">📋</button>` : ''}
        <button type="button" class="token-edit-btn" title="Edit">✎</button>
        <button type="button" class="token-delete-btn" title="Delete">×</button>
      </div>`;
    }).join('') : '<p class="token-list-empty">No tokens. Click Add Token.</p>';
    tokenList.querySelectorAll('.token-stats-btn').forEach(btn => {
      btn.onclick = () => {
        const t = battleMapTokens.find(x => x.id == btn.closest('.token-list-item').dataset.id);
        if (t?.monsterData) showMonsterStatModal(t.monsterData, t);
      };
    });
    tokenList.querySelectorAll('.token-hp-btns').forEach(btns => {
      const t = battleMapTokens.find(x => x.id == btns.closest('.token-list-item').dataset.id);
      if (!t?.monsterData) return;
      const maxHp = t.maxHp ?? parseMonsterMaxHp(t.monsterData.hp);
      const [minusBtn, plusBtn] = btns.querySelectorAll('.hp-btn');
      minusBtn.onclick = () => { t.currentHp = Math.max(0, (t.currentHp ?? maxHp ?? 0) - 1); t.maxHp = t.maxHp ?? maxHp; saveAndRenderBattleMap(); };
      plusBtn.onclick = () => { t.currentHp = Math.min(t.maxHp ?? 999, (t.currentHp ?? maxHp ?? 0) + 1); t.maxHp = t.maxHp ?? maxHp; saveAndRenderBattleMap(); };
    });
    tokenList.querySelectorAll('.token-edit-btn').forEach(btn => {
      btn.onclick = () => {
        const t = battleMapTokens.find(x => x.id == btn.closest('.token-list-item').dataset.id);
        if (t) {
          const label = prompt('Display label on map:', t.label || t.name);
          if (label != null) {
            if (label.trim()) t.label = label.trim();
            else delete t.label;
            saveAndRenderBattleMap();
          }
        }
      };
    });
    tokenList.querySelectorAll('.token-delete-btn').forEach(btn => {
      btn.onclick = () => {
        const id = btn.closest('.token-list-item').dataset.id;
        battleMapTokens = battleMapTokens.filter(t => t.id != id);
        saveAndRenderBattleMap();
      };
    });
  }

  const monsterStatsList = document.getElementById('monster-stats-list');
  const monsterCountEl = document.getElementById('monster-count');
  const monsters = battleMapTokens.filter(t => t.monsterData);
  if (monsterCountEl) monsterCountEl.textContent = `(${monsters.length})`;
  if (monsterStatsList) {
    monsterStatsList.innerHTML = monsters.length ? monsters.map(t => {
      const m = t.monsterData;
      const maxHp = t.maxHp ?? parseMonsterMaxHp(m.hp);
      const curHp = t.currentHp ?? maxHp;
      const hpStr = maxHp != null ? `${curHp}/${maxHp}` : (m.hp || '?');
      const diff = typeof getCrDifficulty === 'function' ? getCrDifficulty(m.cr) : '';
      return `<div class="monster-stat-row" data-id="${t.id}">
        <div class="monster-stat-row-header">
          <strong>${esc(t.name)}</strong>
          <span class="monster-stat-row-meta">${m.type || ''} · CR ${m.cr} (${diff})</span>
        </div>
        <div class="monster-stat-row-quick">AC ${m.ac} · HP ${hpStr} · ${m.speed || '?'}</div>
        <div class="monster-stat-row-hp">
          <button type="button" class="hp-btn" title="Damage">−</button>
          <button type="button" class="hp-btn" title="Heal">+</button>
        </div>
        <button type="button" class="token-stats-btn" title="Full stats">📋</button>
      </div>`;
    }).join('') : '<p class="token-list-empty">No monsters on map. Add from DM panel.</p>';
    monsterStatsList.querySelectorAll('.monster-stat-row').forEach(row => {
      const t = battleMapTokens.find(x => x.id == row.dataset.id);
      if (t?.monsterData) {
        row.querySelector('.token-stats-btn').onclick = () => showMonsterStatModal(t.monsterData, t);
        const hpBtns = row.querySelector('.monster-stat-row-hp');
        if (hpBtns) {
          const maxHp = t.maxHp ?? parseMonsterMaxHp(t.monsterData.hp);
          const [minusBtn, plusBtn] = hpBtns.querySelectorAll('.hp-btn');
          minusBtn.onclick = () => { t.currentHp = Math.max(0, (t.currentHp ?? maxHp ?? 0) - 1); t.maxHp = t.maxHp ?? maxHp; saveAndRenderBattleMap(); };
          plusBtn.onclick = () => { t.currentHp = Math.min(t.maxHp ?? 999, (t.currentHp ?? maxHp ?? 0) + 1); t.maxHp = t.maxHp ?? maxHp; saveAndRenderBattleMap(); };
        }
      }
    });
  }
}

// ========== RULES MODAL ==========
function initRulesModal() {
  const modal = document.getElementById('rules-modal');
  const rulesBtn = document.getElementById('rules-btn');
  const closeBtn = document.getElementById('rules-modal-close');
  const backdrop = document.getElementById('rules-modal-backdrop');
  const saveRulesBtn = document.getElementById('rules-save-btn');

  function openModal() {
    loadRulesIntoModal();
    if (modal) {
      modal.removeAttribute('hidden');
      modal.style.display = 'flex';
    }
  }

  function closeModal() {
    if (modal) {
      modal.setAttribute('hidden', '');
      modal.style.display = 'none';
    }
  }

  rulesBtn?.addEventListener('click', openModal);
  document.getElementById('ruleset-badge')?.addEventListener('click', () => {
    openModal();
    document.querySelectorAll('.rules-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.rules-pane').forEach(p => p.hidden = true);
    document.querySelector('.rules-tab[data-tab="ruleset"]')?.classList.add('active');
    document.getElementById('pane-ruleset').hidden = false;
    renderRulesetPane();
  });
  document.getElementById('builder-rules-link')?.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    closeModal();
  });
  backdrop?.addEventListener('click', (e) => {
    e.preventDefault();
    closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && !modal.hasAttribute('hidden')) {
      closeModal();
    }
  });

  saveRulesBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    saveRulesFromModal();
    closeModal();
  });

  // Tab switching
  document.querySelectorAll('.rules-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.rules-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.rules-pane').forEach(p => p.hidden = true);
      tab.classList.add('active');
      const pane = document.getElementById(`pane-${tab.dataset.tab}`);
      if (pane) pane.hidden = false;
      if (tab.dataset.tab === 'books') renderBooksPane();
      if (tab.dataset.tab === 'ruleset') renderRulesetPane();
      if (tab.dataset.tab === 'official-pdfs') renderOfficialPdfsPane();
    });
  });
}

function renderOfficialPdfsPane() {
  const list = document.getElementById('official-pdfs-list');
  if (!list) return;
  const links = typeof REFERENCE_LINKS !== 'undefined' ? REFERENCE_LINKS : [];
  list.innerHTML = links.length === 0
    ? '<p class="no-books">No official PDF links configured.</p>'
    : links.map(l => `
        <a href="${l.url}" target="_blank" rel="noopener" class="reference-link-item">
          <span class="reference-link-name">${l.name}</span>
          <span class="reference-link-icon">↗</span>
        </a>
      `).join('');
}

function renderRulesetPane() {
  const options = document.getElementById('ruleset-options');
  const info = document.getElementById('ruleset-info');
  if (!options || !info) return;

  const enabled = typeof getEnabledRulesets === 'function' ? getEnabledRulesets() : ['phb'];
  const rulesets = typeof RULESETS !== 'undefined' ? Object.values(RULESETS) : [];

  options.innerHTML = rulesets.map(rs => `
    <label class="ruleset-option ${enabled.includes(rs.id) ? 'selected' : ''}">
      <input type="checkbox" name="ruleset-book" value="${rs.id}" ${enabled.includes(rs.id) ? 'checked' : ''}>
      <span class="ruleset-name">${rs.name}</span>
    </label>
  `).join('');

  const enabledList = rulesets.filter(r => enabled.includes(r.id));
  info.innerHTML = enabledList.map(rs =>
    rs.link
      ? `<p><a href="${rs.link}" target="_blank" rel="noopener">${rs.name}</a>: ${rs.description}</p>`
      : `<p><strong>${rs.name}</strong>: ${rs.description}</p>`
  ).join('') || '<p>Select at least one rule book.</p>';

  options.querySelectorAll('input').forEach(cb => {
    cb.addEventListener('change', () => {
      const checked = Array.from(document.querySelectorAll('input[name="ruleset-book"]:checked')).map(x => x.value);
      if (checked.length === 0) {
        cb.checked = true;
        return;
      }
      if (typeof setEnabledRulesets === 'function') setEnabledRulesets(checked);
      options.querySelectorAll('.ruleset-option').forEach(o => o.classList.remove('selected'));
      options.querySelectorAll('input[name="ruleset-book"]:checked').forEach(x => x.closest('.ruleset-option')?.classList.add('selected'));
      const enabledList2 = rulesets.filter(r => checked.includes(r.id));
      info.innerHTML = enabledList2.map(rs =>
        rs.link ? `<p><a href="${rs.link}" target="_blank" rel="noopener">${rs.name}</a>: ${rs.description}</p>` : `<p><strong>${rs.name}</strong>: ${rs.description}</p>`
      ).join('');
      updateRulesetBadge();
      if (builderView && !builderView.hidden) {
        renderRaceStep();
        renderClassStep();
        renderBackgroundStep();
      }
    });
  });
}

function updateRulesetBadge() {
  const badge = document.getElementById('ruleset-badge');
  if (badge && typeof getEnabledRulesets === 'function') {
    const ids = getEnabledRulesets();
    const names = (typeof RULESETS !== 'undefined' ? ids.map(id => RULESETS[id]?.name).filter(Boolean) : []);
    badge.textContent = names.length > 1 ? `${names.length} books` : (names[0] || 'PHB / SRD');
    badge.title = names.join(', ') || 'Rule books';
  }
}

function loadRulesIntoModal() {
  const rulesEl = document.getElementById('custom-rules');
  const refEl = document.getElementById('custom-reference');
  if (rulesEl) rulesEl.value = localStorage.getItem('dnd_custom_rules') || '';
  if (refEl) refEl.value = localStorage.getItem('dnd_custom_reference') || '';
  const mode = getCampaignLevelingMode();
  document.querySelectorAll('input[name="campaign-leveling"]').forEach(r => {
    r.checked = r.value === mode;
  });
  renderBooksPane();
  renderRulesetPane();
}

function saveRulesFromModal() {
  const rulesEl = document.getElementById('custom-rules');
  const refEl = document.getElementById('custom-reference');
  if (rulesEl) localStorage.setItem('dnd_custom_rules', rulesEl.value);
  if (refEl) localStorage.setItem('dnd_custom_reference', refEl.value);
  const mode = document.querySelector('input[name="campaign-leveling"]:checked')?.value;
  if (mode) setCampaignLevelingMode(mode);
  const rulesetChecked = Array.from(document.querySelectorAll('input[name="ruleset-book"]:checked')).map(cb => cb.value);
  if (rulesetChecked.length > 0 && typeof setEnabledRulesets === 'function') setEnabledRulesets(rulesetChecked);
}

function renderBooksPane() {
  const booksList = document.getElementById('enabled-books-list');
  const rulesDisplay = document.getElementById('book-rules-display');
  if (!booksList || !rulesDisplay) return;

  const books = typeof getEnabledBooks === 'function' ? getEnabledBooks() : [];
  const { bookRules } = typeof getMergedRules === 'function' ? getMergedRules() : { bookRules: '' };

  if (books.length === 0) {
    booksList.innerHTML = '<p class="no-books">No additional books added yet. Edit <code>js/data.js</code> and add entries to <code>ADDITIONAL_BOOKS</code>. See CONTENT_GUIDE.md for instructions.</p>';
  } else {
    booksList.innerHTML = books.map(b => `<div class="book-badge">${b.name}</div>`).join('');
  }

  const escaped = (bookRules || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  rulesDisplay.innerHTML = bookRules
    ? `<pre class="book-rules-content">${escaped}</pre>`
    : '<p class="no-books">Add books to ADDITIONAL_BOOKS in data.js to see their rules here.</p>';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
