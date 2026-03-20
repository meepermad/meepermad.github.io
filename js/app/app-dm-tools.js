/**
 * app-dm-tools.js
 * DM tools: NPCs, monsters, battle map, tokens, initiative.
 *
 * @depends app-state, app-persistence, js/engines/battlemap-engine.js, js/data/monsters.js
 */
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
  const npcModal = document.getElementById('npc-modal');
  if (typeof ModalA11y !== 'undefined' && ModalA11y.openModal) ModalA11y.openModal(npcModal, { focusTarget: '#npc-name' });
  else npcModal.hidden = false;
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
  const npcModalEl = document.getElementById('npc-modal');
  if (typeof ModalA11y !== 'undefined' && ModalA11y.closeModal && npcModalEl) ModalA11y.closeModal(npcModalEl);
  else if (npcModalEl) npcModalEl.hidden = true;
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
  if (typeof AppRenderers !== 'undefined' && AppRenderers.renderDMNPCList) {
    AppRenderers.renderDMNPCList(list, npcs, {
      onEdit: (idx) => openNPCModal(idx),
      onAddToMap: (idx) => {
        const n = getDMNPCs()[idx];
        if (n) {
          const m = { name: n.name, ac: n.ac ?? 10, hp: n.hp || '1', type: 'Humanoid', cr: 0, xp: 10 };
          addMonsterToBattleMap(m, n);
        }
      },
      onDelete: (idx) => {
        const fresh = getDMNPCs();
        fresh.splice(idx, 1);
        setDMNPCs(fresh);
        renderDMNPCs();
      }
    });
    return;
  }
  list.replaceChildren();
}

function addMonsterToEncounter(m) {
  encounterMonsters.push(m);
  renderEncounterList();
}

function removeFromEncounter(idx) {
  encounterMonsters.splice(idx, 1);
  renderEncounterList();
}

function renderEncounterList() {
  const list = document.getElementById('encounter-list');
  const addBtn = document.getElementById('encounter-add-to-map-btn');
  if (!list) return;
  list.replaceChildren();
  if (!encounterMonsters.length) {
    const empty = document.createElement('span');
    empty.className = 'encounter-list-empty';
    empty.textContent = 'Click "+ Encounter" on monsters to build.';
    list.appendChild(empty);
    if (addBtn) addBtn.disabled = true;
    renderEncounterDifficulty();
    return;
  }
  encounterMonsters.forEach((m, i) => {
    const item = document.createElement('div');
    item.className = 'encounter-list-item';
    const span = document.createElement('span');
    span.textContent = `${m.name || '?'} (CR ${m.cr})`;
    item.appendChild(span);
    const rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'encounter-remove';
    rm.textContent = '×';
    rm.title = 'Remove from encounter';
    rm.addEventListener('click', (e) => { e.stopPropagation(); removeFromEncounter(i); });
    item.appendChild(rm);
    list.appendChild(item);
  });
  if (addBtn) addBtn.disabled = false;
  renderEncounterDifficulty();
}

function renderEncounterDifficulty() {
  const el = document.getElementById('encounter-difficulty');
  if (!el) return;
  const level = parseInt(document.getElementById('encounter-party-level')?.value, 10) || 5;
  const size = parseInt(document.getElementById('encounter-party-size')?.value, 10) || 4;
  if (!encounterMonsters.length) {
    el.textContent = '';
    el.className = 'encounter-difficulty';
    return;
  }
  let budget;
  if (typeof MonsterpediaEngine !== 'undefined' && MonsterpediaEngine.buildEncounterBudget) {
    budget = MonsterpediaEngine.buildEncounterBudget(encounterMonsters, level, size);
  } else {
    const totalXp = encounterMonsters.reduce((s, m) => s + (Number(m.xp) || 0), 0);
    const mult = 1 + Math.max(0, encounterMonsters.length - 1) * 0.15;
    const baseline = level * size * 50;
    let diff = 'Trivial';
    if (totalXp * mult > baseline * 3) diff = 'Deadly';
    else if (totalXp * mult > baseline * 2) diff = 'Hard';
    else if (totalXp * mult > baseline * 1.2) diff = 'Medium';
    else if (totalXp * mult > baseline * 0.6) diff = 'Easy';
    budget = { totalXp, adjustedXp: Math.round(totalXp * mult), difficulty: diff };
  }
  el.textContent = `${budget.totalXp} XP (adj ${budget.adjustedXp}) vs party · ${budget.difficulty}`;
  el.className = 'encounter-difficulty ' + (budget.difficulty || '').toLowerCase();
}

function addEncounterToBattleMap() {
  if (!encounterMonsters.length) return;
  encounterMonsters.forEach((m) => addMonsterToBattleMap(m, m.npcData || null, null));
  encounterMonsters = [];
  renderEncounterList();
  showBattleMapView();
}

function syncEncounterPartyFromCharacters() {
  const chars = typeof characters !== 'undefined' ? characters : [];
  if (!chars.length) return;
  const withLevel = chars.filter(c => c && (c.level || (c.multiclass || []).length));
  if (!withLevel.length) return;
  const totalLvl = withLevel.reduce((s, c) => s + ((c.level || 1) + (c.multiclass || []).reduce((sm, m) => sm + (m.level || 0), 0)), 0);
  const avg = Math.max(1, Math.round(totalLvl / withLevel.length));
  const levelEl = document.getElementById('encounter-party-level');
  const sizeEl = document.getElementById('encounter-party-size');
  if (levelEl) levelEl.value = avg;
  if (sizeEl) sizeEl.value = withLevel.length;
  renderEncounterDifficulty();
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
  if (typeSel && typeSel.options.length <= 1 && typeof AppRenderers !== 'undefined' && AppRenderers.setSelectOptions) {
    AppRenderers.setSelectOptions(typeSel, [{ value: '', label: 'All types' }, ...types.map(t => ({ value: t, label: t }))]);
  }
  let filtered = monsters.filter(m => {
    const nameLc = (m.name || '').toLowerCase();
    const matchSearch = !search || nameLc.includes(search) || String(m.cr).includes(search) || (m.type || '').toLowerCase().includes(search);
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
  if (typeof AppRenderers !== 'undefined' && AppRenderers.renderDMMonsterList) {
    AppRenderers.renderDMMonsterList(list, filtered, {
      getDifficulty: typeof getCrDifficulty === 'function' ? getCrDifficulty : () => '',
      onOpen: (m) => showMonsterStatModal(m),
      onAddToEncounter: addMonsterToEncounter
    });
    return;
  }
  list.replaceChildren();
}
function parseMonsterMaxHp(hp) {
  if (hp == null) return null;
  const s = String(hp).trim();
  const m = s.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function mountMonsterpediaOverview(body, enriched) {
  if (!enriched) return;
  const tags = enriched.combatTags;
  if (tags && (tags.boss || tags.elite || tags.swarm)) {
    const p = document.createElement('p');
    p.className = 'monster-pedia-tags';
    const s = document.createElement('strong');
    s.textContent = 'Encounter tags: ';
    p.appendChild(s);
    const bits = [];
    if (tags.boss) bits.push('Boss');
    if (tags.elite) bits.push('Elite');
    if (tags.swarm) bits.push('Swarm');
    p.appendChild(document.createTextNode(bits.join(' · ')));
    body.appendChild(p);
  }
  const rb = document.createElement('p');
  rb.className = 'monster-pedia-role-biome';
  const sr = document.createElement('strong');
  sr.textContent = 'Tactical role · terrain: ';
  rb.appendChild(sr);
  rb.appendChild(document.createTextNode(`${enriched.tacticalRole || '—'} · ${(enriched.biomes || []).join(', ')}`));
  body.appendChild(rb);
  if (enriched.encounterHints && enriched.encounterHints.length) {
    const h = document.createElement('h4');
    h.className = 'monster-stat-subhead';
    h.textContent = 'Encounter behavior';
    body.appendChild(h);
    const ul = document.createElement('ul');
    ul.className = 'monster-encounter-hints';
    enriched.encounterHints.forEach((hint) => {
      const li = document.createElement('li');
      li.textContent = hint;
      ul.appendChild(li);
    });
    body.appendChild(ul);
  }
}

function mountMonsterpediaCombatBlock(body, enriched, m, pushLabeled) {
  if (!enriched) {
    if (m.actions) pushLabeled('Actions:', m.actions);
    return;
  }
  const sc = enriched.parsedSpellcasting;
  if (sc && (sc.header || sc.cantrips || (sc.slots && sc.slots.length) || sc.prepared)) {
    const h = document.createElement('h4');
    h.className = 'monster-stat-subhead';
    h.textContent = 'Spellcasting';
    body.appendChild(h);
    if (sc.header) {
      const ph = document.createElement('p');
      ph.className = 'monster-spellcasting-header';
      ph.textContent = sc.header;
      body.appendChild(ph);
    }
    if (sc.cantrips) {
      const p = document.createElement('p');
      const st = document.createElement('strong');
      st.textContent = 'Cantrips: ';
      p.appendChild(st);
      p.appendChild(document.createTextNode(sc.cantrips));
      body.appendChild(p);
    }
    (sc.slots || []).forEach((sl) => {
      const p = document.createElement('p');
      const st = document.createElement('strong');
      const ord = sl.level === 1 ? 'st' : sl.level === 2 ? 'nd' : sl.level === 3 ? 'rd' : 'th';
      st.textContent = `${sl.level}${ord} (${sl.count} slots): `;
      p.appendChild(st);
      p.appendChild(document.createTextNode(sl.spells));
      body.appendChild(p);
    });
    if (sc.prepared) {
      const p = document.createElement('p');
      const st = document.createElement('strong');
      st.textContent = `Prepared (${sc.prepared.note}): `;
      p.appendChild(st);
      p.appendChild(document.createTextNode(sc.prepared.spells));
      body.appendChild(p);
    }
  }
  const ae = enriched.actionEntries;
  const appendEntryList = (title, entries) => {
    if (!entries || !entries.length) return;
    const sh = document.createElement('h4');
    sh.className = 'monster-stat-subhead';
    sh.textContent = title;
    body.appendChild(sh);
    const ul = document.createElement('ul');
    ul.className = 'monster-action-entry-list';
    entries.forEach((e) => {
      const li = document.createElement('li');
      const st = document.createElement('strong');
      st.textContent = e.title + (e.body ? '.' : '');
      li.appendChild(st);
      if (e.body) li.appendChild(document.createTextNode(' ' + e.body));
      ul.appendChild(li);
    });
    body.appendChild(ul);
  };
  const hasSplit =
    (ae.standard && ae.standard.length) ||
    (ae.bonus && ae.bonus.length) ||
    (ae.reaction && ae.reaction.length) ||
    (ae.legendary && ae.legendary.length) ||
    (ae.lair && ae.lair.length);
  if (hasSplit) {
    appendEntryList('Actions', ae.standard);
    appendEntryList('Bonus actions', ae.bonus);
    appendEntryList('Reactions', ae.reaction);
    appendEntryList('Legendary actions', ae.legendary);
    appendEntryList('Lair actions', ae.lair);
  } else if (m.actions) {
    pushLabeled('Actions:', m.actions);
  }
}

if (typeof window !== 'undefined') {
  window.mountMonsterpediaOverview = mountMonsterpediaOverview;
  window.mountMonsterpediaCombatBlock = mountMonsterpediaCombatBlock;
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
  const enriched = typeof MonsterpediaEngine !== 'undefined' && !npcData
    ? MonsterpediaEngine.normalizeMonster(Object.assign({}, m))
    : null;
  const d = typeof DomUtils !== 'undefined' ? DomUtils : null;
  if (d && d.clearChildren) d.clearChildren(body);
  else body.replaceChildren();
  const metaP = d ? d.createElement('p', { className: 'monster-stat-meta' }) : (() => { const p = document.createElement('p'); p.className = 'monster-stat-meta'; return p; })();
  if (npcData) {
    const strong = document.createElement('strong');
    strong.textContent = 'NPC';
    metaP.appendChild(strong);
    metaP.appendChild(document.createTextNode(' · ' + (npcData.role || '—')));
  } else {
    const strong = document.createElement('strong');
    strong.textContent = m.type || '';
    metaP.appendChild(strong);
    metaP.appendChild(document.createTextNode(` · Challenge ${m.cr ?? ''} (${diff}) · ${m.xp ?? ''} XP`));
  }
  body.appendChild(metaP);
  const grid = d ? d.createElement('div', { className: 'monster-stat-grid' }) : (() => { const g = document.createElement('div'); g.className = 'monster-stat-grid'; return g; })();
  grid.appendChild(d ? d.createElement('span', { textContent: `AC ${m.ac ?? '?'}` }) : (() => { const s = document.createElement('span'); s.textContent = `AC ${m.ac ?? '?'}`; return s; })());
  grid.appendChild(d ? d.createElement('span', { textContent: `HP ${m.hp || '?'}` }) : (() => { const s = document.createElement('span'); s.textContent = `HP ${m.hp || '?'}`; return s; })());
  grid.appendChild(d ? d.createElement('span', { textContent: `Speed ${m.speed || '?'}` }) : (() => { const s = document.createElement('span'); s.textContent = `Speed ${m.speed || '?'}`; return s; })());
  body.appendChild(grid);
  if (enriched) mountMonsterpediaOverview(body, enriched);
  const pushLabeled = (label, text) => {
    const p = document.createElement('p');
    const strong = document.createElement('strong');
    strong.textContent = label;
    p.appendChild(strong);
    p.appendChild(document.createTextNode(' ' + text));
    body.appendChild(p);
  };
  if (npcData?.notes) pushLabeled('Notes:', npcData.notes);
  if (npcData?.stats) pushLabeled('Stats:', npcData.stats);
  if (stats.length) pushLabeled('Ability Scores:', stats.join(', '));
  if (m.saves) pushLabeled('Saving Throws:', m.saves);
  if (m.skills) pushLabeled('Skills:', m.skills);
  if (m.senses) pushLabeled('Senses:', m.senses);
  if (m.languages) pushLabeled('Languages:', m.languages);
  if (m.vulnerabilities) pushLabeled('Vulnerabilities:', m.vulnerabilities);
  if (m.immunities) pushLabeled('Immunities:', m.immunities);
  const traitsForDisplay =
    enriched && typeof MonsterpediaEngine.stripSpellcastingFromTraits === 'function'
      ? MonsterpediaEngine.stripSpellcastingFromTraits(m.traits, enriched.parsedSpellcasting)
      : m.traits;
  if (traitsForDisplay) pushLabeled('Traits:', traitsForDisplay);
  mountMonsterpediaCombatBlock(body, enriched, m, pushLabeled);
  title.textContent = m.name || '';
  if (addBtn) addBtn.hidden = !!token;
  const hpOk = hpDisplay && hpInput && hpMinus && hpPlus;
  if (hpControls) hpControls.hidden = !token || !hpOk;
  if (token && hpOk) {
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
  if (addBtn) {
    addBtn.onclick = () => {
      if (m) {
        if (typeof ModalA11y !== 'undefined' && ModalA11y.closeModal) ModalA11y.closeModal(modal);
        else modal.hidden = true;
        openTokenInspector(null, m, m.npcData || null);
      }
    };
  }
  if (typeof ModalA11y !== 'undefined' && ModalA11y.openModal) ModalA11y.openModal(modal, {});
  else modal.hidden = false;
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
  const token = { id: Date.now(), name, x, y, color, monsterData: m, npcData: npcData || m.npcData, maxHp, currentHp: maxHp, conditions: [], notes: '' };
  if (label) token.label = label;
  battleMapTokens.push(token);
  saveAndRenderBattleMap();
  showBattleMapView();
}
function renderDMMaps() {
  const list = document.getElementById('dm-maps-list');
  if (!list) return;
  let maps = [];
  try {
    maps = JSON.parse(localStorage.getItem('dnd_dm_maps') || '[]');
    if (!Array.isArray(maps)) maps = [];
  } catch (e) {
    maps = [];
  }
  const dM = typeof DomUtils !== 'undefined' ? DomUtils : null;
  if (dM && dM.clearChildren) dM.clearChildren(list);
  else list.replaceChildren();
  if (!maps.length) {
    list.appendChild(dM ? dM.createElement('p', { className: 'dm-empty', textContent: 'No saved battle maps yet — lay out a grid, then Save Current Map to keep it.' }) : (() => { const p = document.createElement('p'); p.className = 'dm-empty'; p.textContent = 'No saved battle maps yet — lay out a grid, then Save Current Map to keep it.'; return p; })());
  } else {
    maps.forEach((m, i) => {
      const row = dM ? dM.createElement('div', { className: 'dm-list-item' }) : (() => { const r = document.createElement('div'); r.className = 'dm-list-item'; return r; })();
      const strong = document.createElement('strong');
      strong.textContent = m.name || 'Map';
      row.appendChild(strong);
      row.appendChild(document.createTextNode(` — ${m.cols || 10}×${m.rows || 10}, ${(m.tokens || []).length} tokens `));
      row.appendChild(dM ? dM.createElement('button', { type: 'button', className: 'btn btn-secondary btn-sm dm-load-map', dataset: { idx: String(i) }, textContent: 'Load' }) : (() => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-secondary btn-sm dm-load-map'; b.dataset.idx = String(i); b.textContent = 'Load'; return b; })());
      row.appendChild(document.createTextNode(' '));
      row.appendChild(dM ? dM.createElement('button', { type: 'button', className: 'btn btn-ghost btn-sm dm-remove-map', dataset: { idx: String(i) }, textContent: 'Remove' }) : (() => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost btn-sm dm-remove-map'; b.dataset.idx = String(i); b.textContent = 'Remove'; return b; })());
      list.appendChild(row);
    });
  }
  list.querySelectorAll('.dm-load-map').forEach(btn => {
    btn.addEventListener('click', () => {
      let mapsParsed = [];
      try {
        mapsParsed = JSON.parse(localStorage.getItem('dnd_dm_maps') || '[]');
        if (!Array.isArray(mapsParsed)) mapsParsed = [];
      } catch (e) { mapsParsed = []; }
      const m = mapsParsed[parseInt(btn.dataset.idx, 10)];
      if (m) {
        battleMapTokens = (m.tokens || []).map(migrateBattleToken);
        battleMapCells = m.cells || {};
        encounterRound = m.encounterRound ?? 1;
        encounterTurnIndex = m.encounterTurnIndex ?? 0;
        encounterActiveTokenId = m.encounterActiveTokenId != null ? m.encounterActiveTokenId : null;
        const aoe = m.aoe;
        battleMapAoE = aoe && typeof aoe.cx === 'number' && typeof aoe.cy === 'number' && typeof aoe.r === 'number'
          ? { cx: aoe.cx, cy: aoe.cy, r: aoe.r }
          : null;
        const rEl = document.getElementById('aoe-radius-sq');
        if (rEl) rEl.value = String(battleMapAoE ? battleMapAoE.r : (parseFloat(rEl.value) || 2));
        getActiveTurnIndex();
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
      const idx = parseInt(removeBtn.dataset.idx, 10);
      let maps = [];
      try {
        maps = JSON.parse(localStorage.getItem('dnd_dm_maps') || '[]');
        if (!Array.isArray(maps)) maps = [];
      } catch (e) { maps = []; }
      maps.splice(idx, 1);
      localStorage.setItem('dnd_dm_maps', JSON.stringify(maps));
      renderDMMaps();
    });
  });
}
function saveCurrentMapToDM() {
  openSaveMapModal();
}

function showBattleMapView() {
  const rp = document.getElementById('role-player');
  const rd = document.getElementById('role-dm');
  if (rp && rd) {
    rd.classList.add('active');
    rp.classList.remove('active');
    localStorage.setItem('dnd_role', 'dm');
  }
  const mainPlayer = document.getElementById('main-player-content');
  const dmPanel = document.getElementById('dm-panel');
  if (mainPlayer) mainPlayer.hidden = false;
  if (dmPanel) dmPanel.hidden = true;
  document.body.classList.add('dm-role');
  if (listView) listView.hidden = true;
  builderView.hidden = true;
  sessionView.hidden = true;
  battleMapView.hidden = false;
  document.body.classList.add('battle-map-active');
  const gridEl = document.getElementById('battle-map-grid');
  if (gridEl) gridEl.classList.toggle('paint-mode', !!battleMapActiveTool);
  const backBtn = document.getElementById('battle-map-back-btn');
  if (backBtn) backBtn.textContent = sessionCharacter ? '← Back to Character' : '← Back';
  renderBattleMapGrid();
}

const BATTLE_MAP_COLORS = ['#6b2d3c', '#2d4a2d', '#1a5276', '#6c3483', '#b8860b', '#c0392b', '#27ae60', '#2980b9'];

let battleMapTokens = [];

function migrateBattleToken(t) {
  if (!t || typeof t !== 'object') {
    return { id: Date.now(), name: 'Token', x: 0, y: 0, color: BATTLE_MAP_COLORS[0], conditions: [], notes: '' };
  }
  const out = { ...t, color: t.color || BATTLE_MAP_COLORS[0] };
  if (!Array.isArray(out.conditions)) out.conditions = [];
  else {
    out.conditions = out.conditions.map((c) => {
      if (!c || typeof c !== 'object') return null;
      const name = String(c.name || '').trim();
      if (!name) return null;
      let rounds = c.rounds;
      if (rounds === '' || rounds === undefined || rounds === null) rounds = null;
      else {
        const n = Number(rounds);
        rounds = isNaN(n) ? null : Math.max(0, Math.floor(n));
      }
      return { name, rounds };
    }).filter(Boolean);
  }
  if (typeof out.notes !== 'string') out.notes = out.notes ? String(out.notes) : '';
  return out;
}

function formatTokenConditionsShort(t) {
  const cond = t && t.conditions;
  if (!Array.isArray(cond) || !cond.length) return '';
  return cond.map((c) => (c.rounds == null ? c.name : `${c.name} (${c.rounds}r)`)).join(', ');
}

function createTokenConditionRow(c) {
  const row = document.createElement('div');
  row.className = 'token-condition-row';
  const nameIn = document.createElement('input');
  nameIn.type = 'text';
  nameIn.className = 'token-condition-name';
  nameIn.placeholder = 'e.g. Poisoned';
  nameIn.value = (c && c.name) || '';
  const roundsIn = document.createElement('input');
  roundsIn.type = 'number';
  roundsIn.className = 'token-condition-rounds';
  roundsIn.min = '0';
  roundsIn.placeholder = '∞';
  roundsIn.title = 'Rounds left (empty = manual only)';
  if (c && c.rounds != null && c.rounds !== '') roundsIn.value = String(c.rounds);
  const rm = document.createElement('button');
  rm.type = 'button';
  rm.className = 'btn btn-ghost btn-sm token-condition-remove';
  rm.setAttribute('aria-label', 'Remove condition');
  rm.textContent = '×';
  rm.addEventListener('click', () => row.remove());
  row.append(nameIn, roundsIn, rm);
  return row;
}

function renderTokenInspectorConditionRows(conditions) {
  const list = document.getElementById('token-inspector-conditions-list');
  if (!list) return;
  list.replaceChildren();
  const arr = Array.isArray(conditions) && conditions.length ? conditions : [];
  if (arr.length === 0) list.appendChild(createTokenConditionRow({ name: '', rounds: null }));
  else arr.forEach((c) => list.appendChild(createTokenConditionRow(c)));
}

function readTokenInspectorConditions() {
  const list = document.getElementById('token-inspector-conditions-list');
  if (!list) return [];
  const out = [];
  list.querySelectorAll('.token-condition-row').forEach((row) => {
    const name = row.querySelector('.token-condition-name')?.value?.trim();
    if (!name) return;
    const rRaw = row.querySelector('.token-condition-rounds')?.value;
    let rounds = null;
    if (rRaw !== '' && rRaw != null) {
      const n = parseInt(rRaw, 10);
      if (!isNaN(n)) rounds = Math.max(0, n);
    }
    out.push({ name, rounds });
  });
  return out;
}

function focusTokenOnMap(tokenId) {
  const grid = document.getElementById('battle-map-grid');
  const tok = grid?.querySelector(`.map-token[data-id="${tokenId}"]`);
  if (!tok) return;
  tok.classList.add('map-token--flash');
  setTimeout(() => tok.classList.remove('map-token--flash'), 1000);
  tok.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
}

function tickEncounterConditionsRound() {
  battleMapTokens.forEach((t) => {
    if (!Array.isArray(t.conditions) || !t.conditions.length) return;
    t.conditions = t.conditions.map((c) => {
      if (!c || typeof c !== 'object') return null;
      if (c.rounds == null) return c;
      const n = Number(c.rounds);
      if (isNaN(n) || n <= 1) return null;
      return { name: c.name, rounds: n - 1 };
    }).filter(Boolean);
  });
}

function getActiveTurnIndex() {
  const order = getInitiativeOrder();
  if (!order.length) {
    encounterTurnIndex = 0;
    encounterActiveTokenId = null;
    return -1;
  }
  if (encounterActiveTokenId != null) {
    const i = order.findIndex((t) => String(t.id) === String(encounterActiveTokenId));
    if (i >= 0) {
      encounterTurnIndex = i;
      return i;
    }
  }
  encounterTurnIndex = Math.min(Math.max(0, encounterTurnIndex), order.length - 1);
  encounterActiveTokenId = order[encounterTurnIndex].id;
  return encounterTurnIndex;
}

function resolveActiveTurnToken() {
  const order = getInitiativeOrder();
  if (!order.length) return null;
  const i = getActiveTurnIndex();
  return i >= 0 ? order[i] : null;
}

function openTokenInspector(token, monsterData, npcData) {
  const modal = document.getElementById('token-inspector-modal');
  const nameEl = document.getElementById('token-inspector-name');
  const labelEl = document.getElementById('token-inspector-label');
  const hpEl = document.getElementById('token-inspector-hp');
  const maxHpEl = document.getElementById('token-inspector-max-hp');
  const colorEl = document.getElementById('token-inspector-color');
  const initEl = document.getElementById('token-inspector-initiative');
  if (!modal || !nameEl) return;
  modal._editingToken = token;
  modal._monsterData = monsterData || null;
  modal._npcData = npcData || null;
  const notesEl = document.getElementById('token-inspector-notes');
  if (token) {
    nameEl.value = token.name || '';
    labelEl.value = token.label || '';
    const maxHp = token.maxHp ?? (token.monsterData ? parseMonsterMaxHp(token.monsterData.hp) : null);
    hpEl.value = token.currentHp ?? maxHp ?? '';
    maxHpEl.value = maxHp ?? '';
    colorEl.value = token.color || BATTLE_MAP_COLORS[0];
    if (initEl) initEl.value = token.initiative != null ? token.initiative : '';
    maxHpEl.disabled = !token.monsterData;
    if (notesEl) notesEl.value = token.notes || '';
    renderTokenInspectorConditionRows(token.conditions);
  } else if (monsterData) {
    nameEl.value = (monsterData.name || 'Token').slice(0, 20);
    labelEl.value = '';
    const maxHp = parseMonsterMaxHp(monsterData.hp);
    hpEl.value = maxHp ?? '';
    maxHpEl.value = maxHp ?? '';
    colorEl.value = BATTLE_MAP_COLORS[battleMapTokens.length % BATTLE_MAP_COLORS.length];
    if (initEl) initEl.value = '';
    maxHpEl.disabled = true;
    if (notesEl) notesEl.value = '';
    renderTokenInspectorConditionRows([]);
  } else {
    nameEl.value = 'Token';
    labelEl.value = '';
    hpEl.value = '';
    maxHpEl.value = '';
    colorEl.value = BATTLE_MAP_COLORS[battleMapTokens.length % BATTLE_MAP_COLORS.length];
    if (initEl) initEl.value = '';
    maxHpEl.disabled = false;
    if (notesEl) notesEl.value = '';
    renderTokenInspectorConditionRows([]);
  }
  if (typeof ModalA11y !== 'undefined' && ModalA11y.openModal) ModalA11y.openModal(modal, { focusTarget: '#token-inspector-name' });
  else modal.hidden = false;
}

function initTokenInspectorModal() {
  const modal = document.getElementById('token-inspector-modal');
  const closeBtn = document.getElementById('token-inspector-close');
  const backdrop = document.getElementById('token-inspector-backdrop');
  const cancelBtn = document.getElementById('token-inspector-cancel');
  const saveBtn = document.getElementById('token-inspector-save');
  const close = () => {
    if (typeof ModalA11y !== 'undefined' && ModalA11y.closeModal) ModalA11y.closeModal(modal);
    else modal.hidden = true;
  };
  closeBtn?.addEventListener('click', close);
  backdrop?.addEventListener('click', close);
  cancelBtn?.addEventListener('click', close);
  document.getElementById('token-inspector-add-condition')?.addEventListener('click', () => {
    document.getElementById('token-inspector-conditions-list')?.appendChild(createTokenConditionRow({ name: '', rounds: null }));
  });
  saveBtn?.addEventListener('click', () => {
    const token = modal._editingToken;
    const monsterData = modal._monsterData;
    const npcData = modal._npcData;
    const name = document.getElementById('token-inspector-name')?.value?.trim() || 'Token';
    const label = document.getElementById('token-inspector-label')?.value?.trim() || '';
    const hp = parseInt(document.getElementById('token-inspector-hp')?.value, 10);
    const maxHp = parseInt(document.getElementById('token-inspector-max-hp')?.value, 10);
    const color = document.getElementById('token-inspector-color')?.value?.trim();
    const initiative = parseInt(document.getElementById('token-inspector-initiative')?.value, 10);
    const notesRaw = document.getElementById('token-inspector-notes')?.value?.trim() || '';
    const conditions = readTokenInspectorConditions();
    const validColor = color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : BATTLE_MAP_COLORS[0];
    if (token) {
      token.name = name;
      if (label) token.label = label; else delete token.label;
      if (!isNaN(hp)) token.currentHp = hp;
      if (!isNaN(maxHp) && !token.monsterData) token.maxHp = maxHp;
      token.color = validColor;
      if (!isNaN(initiative)) token.initiative = initiative; else delete token.initiative;
      token.notes = notesRaw;
      token.conditions = conditions;
    } else if (monsterData) {
      addMonsterToBattleMap(monsterData, npcData || null, label || null);
      const t = battleMapTokens[battleMapTokens.length - 1];
      if (t) {
        t.color = validColor;
        if (!isNaN(initiative)) t.initiative = initiative; else delete t.initiative;
        t.notes = notesRaw;
        t.conditions = conditions;
      }
    } else {
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
      const newToken = { id: Date.now(), name, x, y, color: validColor, conditions: [], notes: '' };
      if (label) newToken.label = label;
      if (!isNaN(maxHp) && maxHp > 0) { newToken.maxHp = maxHp; newToken.currentHp = isNaN(hp) ? maxHp : hp; }
      if (!isNaN(initiative)) newToken.initiative = initiative;
      newToken.notes = notesRaw;
      newToken.conditions = conditions;
      battleMapTokens.push(newToken);
    }
    close();
    saveAndRenderBattleMap();
  });
}

function openSaveMapModal() {
  const modal = document.getElementById('save-map-modal');
  const nameEl = document.getElementById('save-map-name');
  if (!modal || !nameEl) return;
  nameEl.value = 'Map ' + (Date.now() % 10000);
  if (typeof ModalA11y !== 'undefined' && ModalA11y.openModal) ModalA11y.openModal(modal, { focusTarget: '#save-map-name' });
  else modal.hidden = false;
}

function initSaveMapModal() {
  const modal = document.getElementById('save-map-modal');
  const closeBtn = document.getElementById('save-map-modal-close');
  const backdrop = document.getElementById('save-map-modal-backdrop');
  const cancelBtn = document.getElementById('save-map-modal-cancel');
  const confirmBtn = document.getElementById('save-map-modal-confirm');
  const close = () => {
    if (typeof ModalA11y !== 'undefined' && ModalA11y.closeModal) ModalA11y.closeModal(modal);
    else modal.hidden = true;
  };
  closeBtn?.addEventListener('click', close);
  backdrop?.addEventListener('click', close);
  cancelBtn?.addEventListener('click', close);
  confirmBtn?.addEventListener('click', () => {
    const name = document.getElementById('save-map-name')?.value?.trim() || 'Map ' + (Date.now() % 10000);
    const cols = parseInt(document.getElementById('grid-cols')?.value) || 10;
    const rows = parseInt(document.getElementById('grid-rows')?.value) || 10;
    const maps = JSON.parse(localStorage.getItem('dnd_dm_maps') || '[]');
    getActiveTurnIndex();
    maps.push({ name, cols, rows, tokens: [...battleMapTokens], cells: { ...battleMapCells }, encounterRound, encounterTurnIndex, encounterActiveTokenId, aoe: battleMapAoE });
    localStorage.setItem('dnd_dm_maps', JSON.stringify(maps));
    renderDMMaps();
    close();
    showToast('Map saved!');
  });
}

function openConfirmClearTokensModal() {
  const modal = document.getElementById('confirm-clear-tokens-modal');
  if (!modal) return;
  if (typeof ModalA11y !== 'undefined' && ModalA11y.openModal) ModalA11y.openModal(modal, { focusTarget: '#confirm-clear-tokens-cancel' });
  else modal.hidden = false;
}

function initConfirmClearTokensModal() {
  const modal = document.getElementById('confirm-clear-tokens-modal');
  const closeBtn = document.getElementById('confirm-clear-tokens-close');
  const backdrop = document.getElementById('confirm-clear-tokens-backdrop');
  const cancelBtn = document.getElementById('confirm-clear-tokens-cancel');
  const confirmBtn = document.getElementById('confirm-clear-tokens-confirm');
  const close = () => {
    if (typeof ModalA11y !== 'undefined' && ModalA11y.closeModal) ModalA11y.closeModal(modal);
    else modal.hidden = true;
  };
  closeBtn?.addEventListener('click', close);
  backdrop?.addEventListener('click', close);
  cancelBtn?.addEventListener('click', close);
  confirmBtn?.addEventListener('click', () => {
    battleMapTokens = [];
    encounterActiveTokenId = null;
    encounterTurnIndex = 0;
    encounterRound = 1;
    saveAndRenderBattleMap();
    close();
  });
}

function showToast(message) {
  const existing = document.getElementById('toast-message');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'toast-message';
  toast.className = 'toast-message';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

let battleMapCells = {};
let encounterRound = 1;
let encounterTurnIndex = 0;
/** Stable reference for active combatant in initiative order (survives token list resort / index shifts) */
let encounterActiveTokenId = null;
let encounterMonsters = [];
let battleMapPaintDrag = false;
let battleMapLastPaintedKey = null;
let battleMapActiveTool = 'fog';
/** First cell for two-click ruler measurement */
let battleMapRulerStart = null;
/** { cx, cy, r } in grid squares (Euclidean radius), or null */
let battleMapAoE = null;

function compressImageDataUrl(dataUrl, maxDim, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w >= h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/jpeg', quality));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('decode'));
    img.src = dataUrl;
  });
}

async function trySetMapImage(key, dataUrl) {
  try {
    localStorage.setItem(key, dataUrl);
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      try {
        const compressed = await compressImageDataUrl(dataUrl, 1600, 0.72);
        localStorage.setItem(key, compressed);
        showToast('Image compressed to fit browser storage.');
        return;
      } catch (e2) {
        try {
          const smaller = await compressImageDataUrl(dataUrl, 1024, 0.58);
          localStorage.setItem(key, smaller);
          showToast('Image heavily compressed to fit storage.');
          return;
        } catch (e3) {
          showToast('Could not save image — storage full. Try a smaller file.');
          return;
        }
      }
    }
    showToast('Could not save map image.');
  }
}

function setMeasureReadout(text) {
  const el = document.getElementById('battle-map-measure-text');
  if (el) el.textContent = text;
}

function applyBattleMapLayers() {
  const container = document.getElementById('battle-map-container');
  const underlay = document.getElementById('battle-map-underlay');
  const overlayLayer = document.getElementById('battle-map-overlay-layer');
  if (!container) return;
  const bg = localStorage.getItem('dnd_battle_map_bg');
  const overlay = localStorage.getItem('dnd_battle_map_overlay');
  if (underlay) {
    underlay.style.backgroundImage = bg ? `url(${bg})` : '';
    underlay.style.backgroundSize = 'cover';
    underlay.style.backgroundPosition = 'center';
  }
  if (overlayLayer) {
    overlayLayer.style.backgroundImage = overlay ? `url(${overlay})` : '';
    overlayLayer.style.backgroundSize = 'cover';
    overlayLayer.style.backgroundPosition = 'center';
  }
  container.classList.toggle('has-map-image', !!(bg || overlay));
}

function initBattleMapLayerControls() {
  const onFile = (key) => (evt) => {
    const file = evt.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      void (async () => {
        await trySetMapImage(key, dataUrl);
        applyBattleMapLayers();
      })();
    };
    reader.readAsDataURL(file);
    evt.target.value = '';
  };
  document.getElementById('battle-map-bg-upload')?.addEventListener('change', onFile('dnd_battle_map_bg'));
  document.getElementById('battle-map-overlay-upload')?.addEventListener('change', onFile('dnd_battle_map_overlay'));
  document.getElementById('battle-map-clear-bg')?.addEventListener('click', () => {
    localStorage.removeItem('dnd_battle_map_bg');
    applyBattleMapLayers();
    showToast('Map image removed');
  });
  document.getElementById('battle-map-clear-overlay')?.addEventListener('click', () => {
    localStorage.removeItem('dnd_battle_map_overlay');
    applyBattleMapLayers();
    showToast('Overlay removed');
  });
}

function handleRulerMeasurementClick(x, y) {
  const cols = parseInt(document.getElementById('grid-cols')?.value, 10) || 10;
  const rows = parseInt(document.getElementById('grid-rows')?.value, 10) || 10;
  const feetPer = parseFloat(document.getElementById('grid-feet-per-cell')?.value) || 5;
  if (!battleMapRulerStart) {
    battleMapRulerStart = { x, y };
    saveAndRenderBattleMap();
    setMeasureReadout(`Ruler: start (${x},${y}) — click a second square for distance.`);
    showToast('Ruler: second click for distance.');
    return;
  }
  const start = battleMapRulerStart;
  battleMapRulerStart = null;
  saveAndRenderBattleMap();
  if (start.x === x && start.y === y) {
    setMeasureReadout('Same square — 0 ft, 0 squares.');
    showToast('Same square — 0 ft.');
    return;
  }
  if (typeof BattleMapEngine !== 'undefined' && BattleMapEngine.rulerMeasurement) {
    const m = BattleMapEngine.rulerMeasurement(start, { x, y }, battleMapCells, cols, rows);
    const straightFt = Math.round(m.euclideanCells * feetPer);
    const pathFt = m.pathCells * feetPer;
    const line = `(${start.x},${start.y}) → (${x},${y}): ${straightFt} ft straight (~${m.euclideanCells.toFixed(1)} sq); ${pathFt} ft along grid (${m.pathCells} steps). Movement: ${m.movementCost}.`;
    setMeasureReadout(line);
    showToast('Distance updated in the bar above.');
  } else {
    const dx = x - start.x;
    const dy = y - start.y;
    const cells = Math.hypot(dx, dy);
    const line = `(${start.x},${start.y}) → (${x},${y}): ~${Math.round(cells * feetPer)} ft (${cells.toFixed(1)} squares).`;
    setMeasureReadout(line);
    showToast('Distance updated in the bar above.');
  }
}

function handleAoeCellClick(x, y) {
  const rIn = document.getElementById('aoe-radius-sq');
  let r = parseFloat(rIn?.value);
  if (isNaN(r) || r < 0) r = 2;
  if (rIn) rIn.value = String(r);
  battleMapAoE = { cx: x, cy: y, r };
  saveAndRenderBattleMap();
  const feet = parseFloat(document.getElementById('grid-feet-per-cell')?.value) || 5;
  const radiusFt = Math.round(r * feet);
  const diameterFt = Math.round(2 * r * feet);
  setMeasureReadout(`AoE: center (${x},${y}), radius ${r} sq (~${radiusFt} ft). Diameter ≈ ${diameterFt} ft (circle on grid).`);
}

function applyToolToCellGlobal(cx, cy) {
  const tool = battleMapActiveTool;
  if (!tool) return;
  const ckey = `${cx},${cy}`;
  const existing = battleMapCells[ckey] || {};
  if (tool === 'fog') {
    if (typeof BattleMapEngine !== 'undefined' && BattleMapEngine.toggleFog) {
      BattleMapEngine.toggleFog(battleMapCells, cx, cy);
    } else {
      battleMapCells[ckey] = { ...existing, fog: !existing.fog };
    }
  } else if (tool === 'reveal') {
    if (existing.fog) {
      if (Object.keys(existing).length === 1) delete battleMapCells[ckey];
      else { const { fog, ...rest } = existing; battleMapCells[ckey] = rest; }
    }
  } else if (tool === 'normal') {
    if (existing.fog) battleMapCells[ckey] = { fog: true };
    else delete battleMapCells[ckey];
  } else if (tool === 'elevation') {
    battleMapCells[ckey] = { type: 'elevation', elevation: 1, fog: existing.fog };
  } else if (tool === 'elevation2') {
    battleMapCells[ckey] = { type: 'elevation', elevation: 2, fog: existing.fog };
  } else if (tool === 'elevation-1') {
    battleMapCells[ckey] = { type: 'elevation', elevation: -1, fog: existing.fog };
  } else {
    battleMapCells[ckey] = { ...existing, type: tool };
  }
  saveAndRenderBattleMap();
}

function getInitiativeOrder() {
  return [...battleMapTokens]
    .filter(t => t.initiative != null)
    .sort((a, b) => (b.initiative ?? 0) - (a.initiative ?? 0));
}

function rollInitiativeForTokens() {
  battleMapTokens.forEach(t => {
    let dex = 10;
    if (t.monsterData?.dex != null) dex = t.monsterData.dex;
    else if (t.npcData?.dex != null) dex = t.npcData.dex;
    const mod = Math.floor((dex - 10) / 2);
    const roll = Math.floor(Math.random() * 20) + 1;
    t.initiative = roll + mod;
  });
  const order = getInitiativeOrder();
  encounterRound = 1;
  encounterTurnIndex = 0;
  encounterActiveTokenId = order[0] ? order[0].id : null;
  saveAndRenderBattleMap();
  renderEncounterUI();
}

function advanceTurn() {
  const order = getInitiativeOrder();
  if (order.length === 0) return;
  const idx = getActiveTurnIndex();
  const next = (idx + 1) % order.length;
  if (next === 0) {
    encounterRound++;
    tickEncounterConditionsRound();
  }
  encounterActiveTokenId = order[next].id;
  encounterTurnIndex = next;
  saveAndRenderBattleMap();
}

function previousTurn() {
  const order = getInitiativeOrder();
  if (order.length === 0) return;
  const idx = getActiveTurnIndex();
  if (idx <= 0) {
    encounterTurnIndex = order.length - 1;
    encounterActiveTokenId = order[encounterTurnIndex].id;
    encounterRound = Math.max(1, encounterRound - 1);
  } else {
    encounterTurnIndex = idx - 1;
    encounterActiveTokenId = order[encounterTurnIndex].id;
  }
  saveAndRenderBattleMap();
}

function renderEncounterUI() {
  const roundEl = document.getElementById('encounter-round-num');
  const listEl = document.getElementById('encounter-initiative-list');
  if (roundEl) roundEl.textContent = encounterRound;
  const order = getInitiativeOrder();
  if (!listEl) return;
  const dE = typeof DomUtils !== 'undefined' ? DomUtils : null;
  if (order.length === 0) {
    const emptyP = dE ? dE.createElement('p', { className: 'encounter-empty', textContent: 'Initiative order appears here after you roll — add combatants from the map or encounter list first.' }) : (() => { const p = document.createElement('p'); p.className = 'encounter-empty'; p.textContent = 'Initiative order appears here after you roll — add combatants from the map or encounter list first.'; return p; })();
    listEl.replaceChildren(emptyP);
    return;
  }
  if (dE && dE.clearChildren) dE.clearChildren(listEl);
  else listEl.replaceChildren();
  const activeIdx = getActiveTurnIndex();
  order.forEach((t, i) => {
    const isActive = i === activeIdx;
    const maxHp = t.maxHp ?? (t.monsterData ? parseMonsterMaxHp(t.monsterData.hp) : null);
    const curHp = t.currentHp ?? maxHp;
    const hpStr = maxHp != null ? `${curHp}/${maxHp}` : '';
    const div = dE ? dE.createElement('div', { className: `encounter-initiative-item${isActive ? ' encounter-active' : ''}`, dataset: { id: String(t.id) } }) : (() => { const d = document.createElement('div'); d.className = `encounter-initiative-item${isActive ? ' encounter-active' : ''}`; d.dataset.id = String(t.id); return d; })();
    div.setAttribute('role', 'listitem');
    div.tabIndex = 0;
    const top = document.createElement('div');
    top.className = 'encounter-initiative-item-top';
    const mod = t.initiativeMod != null ? t.initiativeMod : (() => {
      let dex = 10;
      if (t.monsterData?.dex != null) dex = t.monsterData.dex;
      else if (t.npcData?.dex != null) dex = t.npcData.dex;
      return Math.floor((dex - 10) / 2);
    })();
    const nat = t.initiativeNat;
    const initLabel = nat != null
      ? `${t.initiative} (${nat}+${mod >= 0 ? '+' : ''}${mod})`
      : `${t.initiative >= 0 ? '+' : ''}${t.initiative}`;
    const initSp = dE ? dE.createElement('span', { className: 'encounter-init', textContent: initLabel, title: nat != null ? `Total initiative; d20 ${nat} + Dex mod ${mod >= 0 ? '+' : ''}${mod}` : 'Initiative total' }) : (() => { const s = document.createElement('span'); s.className = 'encounter-init'; s.textContent = initLabel; s.title = nat != null ? `d20 ${nat} + mod ${mod}` : ''; return s; })();
    const nameSp = dE ? dE.createElement('span', { className: 'encounter-name', textContent: t.name || '' }) : (() => { const s = document.createElement('span'); s.className = 'encounter-name'; s.textContent = t.name || ''; return s; })();
    top.appendChild(initSp);
    top.appendChild(nameSp);
    if (hpStr) top.appendChild(dE ? dE.createElement('span', { className: 'encounter-hp', textContent: hpStr }) : (() => { const s = document.createElement('span'); s.className = 'encounter-hp'; s.textContent = hpStr; return s; })());
    div.appendChild(top);
    const condLine = formatTokenConditionsShort(t);
    if (condLine) {
      div.appendChild(dE ? dE.createElement('span', { className: 'encounter-conditions', textContent: condLine }) : (() => { const s = document.createElement('span'); s.className = 'encounter-conditions'; s.textContent = condLine; return s; })());
    }
    const go = () => focusTokenOnMap(t.id);
    div.addEventListener('click', go);
    div.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        go();
      }
    });
    listEl.appendChild(div);
  });
}

function initBattleMap() {
  if (typeof window !== 'undefined') {
    window.resolveActiveTurnToken = resolveActiveTurnToken;
    window.formatTokenConditionsShort = formatTokenConditionsShort;
    window.focusTokenOnMap = focusTokenOnMap;
  }
    try {
    const saved = localStorage.getItem('dnd_battle_map');
    if (saved) {
      const data = JSON.parse(saved);
      battleMapTokens = (data.tokens || []).map(migrateBattleToken);
      battleMapCells = data.cells || {};
      encounterRound = data.encounterRound ?? 1;
      encounterTurnIndex = data.encounterTurnIndex ?? 0;
      encounterActiveTokenId = data.encounterActiveTokenId != null ? data.encounterActiveTokenId : null;
      const aoe = data.aoe;
      battleMapAoE = aoe && typeof aoe.cx === 'number' && typeof aoe.cy === 'number' && typeof aoe.r === 'number'
        ? { cx: aoe.cx, cy: aoe.cy, r: aoe.r }
        : null;
      const rEl = document.getElementById('aoe-radius-sq');
      if (rEl) rEl.value = String(battleMapAoE ? battleMapAoE.r : (parseFloat(rEl.value) || 2));
      getActiveTurnIndex();
      const cols = document.getElementById('grid-cols');
      const rows = document.getElementById('grid-rows');
      if (cols && data.cols) cols.value = data.cols;
      if (rows && data.rows) rows.value = data.rows;
      const zoom = document.getElementById('battle-map-zoom');
      if (zoom && data.zoom) zoom.value = String(data.zoom);
      const gridLines = document.getElementById('grid-lines-toggle');
      if (gridLines && data.gridLines !== undefined) gridLines.checked = data.gridLines;
      const feetEl = document.getElementById('grid-feet-per-cell');
      if (feetEl && data.feetPerCell != null && !isNaN(data.feetPerCell)) feetEl.value = String(data.feetPerCell);
    }
  } catch (e) {}
  document.getElementById('monster-stats-toggle')?.addEventListener('click', toggleMonsterStatsPanel);
  document.getElementById('grid-cols')?.addEventListener('change', saveAndRenderBattleMap);
  document.getElementById('grid-rows')?.addEventListener('change', saveAndRenderBattleMap);
  document.getElementById('grid-lines-toggle')?.addEventListener('change', saveAndRenderBattleMap);
  document.getElementById('battle-map-zoom')?.addEventListener('change', saveAndRenderBattleMap);
  document.getElementById('grid-feet-per-cell')?.addEventListener('change', saveAndRenderBattleMap);
  document.getElementById('aoe-radius-sq')?.addEventListener('input', () => {
    if (!battleMapAoE) return;
    let r = parseFloat(document.getElementById('aoe-radius-sq')?.value);
    if (isNaN(r) || r < 0) r = 0;
    battleMapAoE = { ...battleMapAoE, r };
    saveAndRenderBattleMap();
    const feet = parseFloat(document.getElementById('grid-feet-per-cell')?.value) || 5;
    setMeasureReadout(`AoE: center (${battleMapAoE.cx},${battleMapAoE.cy}), radius ${r} sq (~${Math.round(r * feet)} ft). Diameter ≈ ${Math.round(2 * r * feet)} ft.`);
  });
  document.getElementById('battle-map-clear-aoe')?.addEventListener('click', () => {
    battleMapAoE = null;
    saveAndRenderBattleMap();
    setMeasureReadout('—');
  });
  initBattleMapLayerControls();
  const gridEl = document.getElementById('battle-map-grid');
  document.querySelectorAll('.battle-map-tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      battleMapActiveTool = btn.dataset.tool ?? '';
      document.querySelectorAll('.battle-map-tool-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      gridEl?.classList.toggle('paint-mode', !!battleMapActiveTool);
    });
  });
  gridEl?.addEventListener('click', (e) => {
    const cell = e.target.closest('.grid-cell');
    if (!cell || e.target.closest('.map-token')) return;
    if (e.detail === 2) return;
    const x = parseInt(cell.dataset.x, 10);
    const y = parseInt(cell.dataset.y, 10);
    if (isNaN(x) || isNaN(y)) return;
    if (battleMapActiveTool === 'ruler') {
      handleRulerMeasurementClick(x, y);
      return;
    }
    if (battleMapActiveTool === 'aoe') {
      handleAoeCellClick(x, y);
      return;
    }
    if (!battleMapActiveTool) return;
    applyToolToCellGlobal(x, y);
  });
  gridEl?.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    const cell = e.target.closest('.grid-cell');
    if (!cell || e.target.closest('.map-token')) return;
    if (battleMapActiveTool === 'ruler' || battleMapActiveTool === 'aoe') return;
    if (!battleMapActiveTool) return;
    battleMapPaintDrag = true;
    battleMapLastPaintedKey = `${cell.dataset.x},${cell.dataset.y}`;
    const x = parseInt(cell.dataset.x, 10);
    const y = parseInt(cell.dataset.y, 10);
    if (!isNaN(x) && !isNaN(y)) applyToolToCellGlobal(x, y);
    const onMouseUp = () => { battleMapPaintDrag = false; document.removeEventListener('mouseup', onMouseUp); };
    document.addEventListener('mouseup', onMouseUp);
  });
  gridEl?.addEventListener('mouseover', (e) => {
    if (!battleMapPaintDrag) return;
    if (battleMapActiveTool === 'ruler' || battleMapActiveTool === 'aoe') return;
    const cell = e.target.closest('.grid-cell');
    if (!cell || e.target.closest('.map-token')) return;
    const key = `${cell.dataset.x},${cell.dataset.y}`;
    if (battleMapLastPaintedKey === key) return;
    battleMapLastPaintedKey = key;
    const x = parseInt(cell.dataset.x, 10);
    const y = parseInt(cell.dataset.y, 10);
    if (!isNaN(x) && !isNaN(y)) applyToolToCellGlobal(x, y);
  });
  renderBattleMapGrid();
  document.getElementById('add-token-btn')?.addEventListener('click', () => openTokenInspector(null));
  document.getElementById('clear-tokens-btn')?.addEventListener('click', () => {
    if (battleMapTokens.length) openConfirmClearTokensModal();
  });
  document.getElementById('clear-fog-btn')?.addEventListener('click', () => {
    Object.keys(battleMapCells).forEach(k => {
      if (battleMapCells[k]?.fog) delete battleMapCells[k].fog;
    });
    saveAndRenderBattleMap();
  });
  document.getElementById('clear-terrain-btn')?.addEventListener('click', () => {
    Object.keys(battleMapCells).forEach(k => {
      const c = battleMapCells[k];
      if (!c) return;
      const hasTerrain = c.type === 'difficult' || c.type === 'wall' || (c.type === 'elevation' && c.elevation != null);
      if (hasTerrain) {
        if (c.fog) battleMapCells[k] = { fog: true };
        else delete battleMapCells[k];
      }
    });
    saveAndRenderBattleMap();
    showToast('Terrain cleared');
  });
  initTokenInspectorModal();
  initSaveMapModal();
  initConfirmClearTokensModal();
  document.getElementById('encounter-roll-initiative')?.addEventListener('click', rollInitiativeForTokens);
  document.getElementById('encounter-next-turn')?.addEventListener('click', advanceTurn);
  document.getElementById('encounter-prev-turn')?.addEventListener('click', previousTurn);
  document.getElementById('encounter-round-inc')?.addEventListener('click', () => {
    encounterRound++;
    tickEncounterConditionsRound();
    saveAndRenderBattleMap();
  });
  const turnToggle = document.getElementById('encounter-show-turn-controls');
  const turnWrap = document.getElementById('encounter-turn-nav-wrap');
  const roundWrap = document.getElementById('encounter-turn-controls-wrap');
  function applyTurnControlsVisibility() {
    const show = turnToggle ? turnToggle.checked : true;
    try { localStorage.setItem('dnd_battle_map_turn_controls', show ? '1' : '0'); } catch (e) {}
    if (turnWrap) turnWrap.hidden = !show;
    if (roundWrap) roundWrap.hidden = !show;
  }
  if (turnToggle) {
    try { turnToggle.checked = localStorage.getItem('dnd_battle_map_turn_controls') !== '0'; } catch (e) {}
    turnToggle.addEventListener('change', applyTurnControlsVisibility);
    applyTurnControlsVisibility();
  }
  document.getElementById('encounter-party-level')?.addEventListener('change', renderEncounterDifficulty);
  document.getElementById('encounter-party-size')?.addEventListener('change', renderEncounterDifficulty);
  document.getElementById('encounter-use-party-btn')?.addEventListener('click', syncEncounterPartyFromCharacters);
  document.getElementById('encounter-add-to-map-btn')?.addEventListener('click', addEncounterToBattleMap);
  renderEncounterList();
  initBattleMapGridResizeObserver();
}

function saveAndRenderBattleMap() {
  const cols = parseInt(document.getElementById('grid-cols')?.value) || 10;
  const rows = parseInt(document.getElementById('grid-rows')?.value) || 10;
  const zoom = parseFloat(document.getElementById('battle-map-zoom')?.value) || 1;
  const gridLines = document.getElementById('grid-lines-toggle')?.checked !== false;
  const feetEl = document.getElementById('grid-feet-per-cell');
  let feetPerCell = feetEl ? parseFloat(feetEl.value) : 5;
  if (isNaN(feetPerCell) || feetPerCell < 0.5) feetPerCell = 5;
  if (feetPerCell > 500) feetPerCell = 500;
  if (feetEl) feetEl.value = String(feetPerCell);
  getActiveTurnIndex();
  const data = { cols, rows, tokens: battleMapTokens, cells: battleMapCells, zoom, gridLines, feetPerCell, encounterRound, encounterTurnIndex, encounterActiveTokenId, aoe: battleMapAoE };
  if (typeof StorageLayer !== 'undefined' && StorageLayer.debouncedSave) {
    StorageLayer.debouncedSave('dnd_battle_map', () => JSON.stringify(data));
  } else {
    localStorage.setItem('dnd_battle_map', JSON.stringify(data));
  }
  renderBattleMapGrid();
}

function toggleMonsterStatsPanel() {
  const btn = document.getElementById('monster-stats-toggle');
  const list = document.getElementById('monster-stats-list');
  if (!btn || !list) return;
  const expanded = list.hidden;
  list.hidden = !expanded;
  btn.setAttribute('aria-expanded', String(expanded));
  const icon = btn.querySelector('.toggle-icon');
  if (icon) icon.textContent = expanded ? '▼' : '▶';
}

/** Square cells from zoom-wrap size; avoids 1fr row collapse (slivers) and gap-0 + aspect-ratio overlap bugs. */
function layoutBattleMapGridTracks(retry) {
  const grid = document.getElementById('battle-map-grid');
  const zoomWrap = document.getElementById('battle-map-zoom-wrap');
  const stack = document.getElementById('battle-map-stack');
  if (!grid || !zoomWrap) return;
  const cols = parseInt(document.getElementById('grid-cols')?.value) || 10;
  const rows = parseInt(document.getElementById('grid-rows')?.value) || 10;
  const w = zoomWrap.clientWidth;
  const h = zoomWrap.clientHeight;
  const r = retry ?? 0;
  if ((w < 8 || h < 8) && r < 20) {
    requestAnimationFrame(() => layoutBattleMapGridTracks(r + 1));
    return;
  }
  if (w < 8 || h < 8) return;
  const cell = Math.min(w / cols, h / rows);
  const gw = cell * cols;
  const gh = cell * rows;
  if (stack) {
    stack.style.width = `${gw}px`;
    stack.style.height = `${gh}px`;
  }
  grid.style.width = '100%';
  grid.style.height = '100%';
  grid.style.gridTemplateColumns = `repeat(${cols}, ${cell}px)`;
  grid.style.gridTemplateRows = `repeat(${rows}, ${cell}px)`;
  const hint = document.getElementById('battle-map-grid-size-hint');
  if (hint) {
    hint.textContent = `Grid: ${Math.round(gw)}×${Math.round(gh)} px · ~${cell.toFixed(1)} px per square (${cols}×${rows})`;
  }
}

function initBattleMapGridResizeObserver() {
  const wrap = document.getElementById('battle-map-zoom-wrap');
  if (!wrap || typeof ResizeObserver === 'undefined') return;
  if (wrap.dataset.battleMapResizeBound === '1') return;
  wrap.dataset.battleMapResizeBound = '1';
  const ro = new ResizeObserver(() => layoutBattleMapGridTracks());
  ro.observe(wrap);
}

function renderBattleMapGrid() {
  const grid = document.getElementById('battle-map-grid');
  const container = document.getElementById('battle-map-container');
  const zoomWrap = document.getElementById('battle-map-zoom-wrap');
  const tokenList = document.getElementById('battle-map-token-list');
  if (!grid) return;
  const cols = parseInt(document.getElementById('grid-cols')?.value) || 10;
  const rows = parseInt(document.getElementById('grid-rows')?.value) || 10;
  const zoom = parseFloat(document.getElementById('battle-map-zoom')?.value) || 1;
  const gridLines = document.getElementById('grid-lines-toggle')?.checked !== false;

  applyBattleMapLayers();
  if (zoomWrap) {
    zoomWrap.style.transform = `scale(${zoom})`;
    zoomWrap.style.width = `${100 / zoom}%`;
    zoomWrap.style.height = `${100 / zoom}%`;
    zoomWrap.style.transformOrigin = 'top left';
  } else if (container) {
    container.style.zoom = String(zoom);
  }
  grid.classList.toggle('grid-no-lines', !gridLines);

  grid.replaceChildren();
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
      } else       if (cellData.type === 'elevation' && cellData.elevation < 0) {
        cell.classList.add('grid-cell--elevation-low');
        cell.dataset.elevation = cellData.elevation;
      }
      if (cellData.fog) cell.classList.add('grid-cell--fog');
      cell.dataset.x = x;
      cell.dataset.y = y;
      if (battleMapRulerStart && battleMapRulerStart.x === x && battleMapRulerStart.y === y) {
        cell.classList.add('grid-cell--ruler-start');
      }
      if (battleMapAoE) {
        const dx = x - battleMapAoE.cx;
        const dy = y - battleMapAoE.cy;
        if (Math.hypot(dx, dy) <= battleMapAoE.r + 1e-9) {
          cell.classList.add('grid-cell--aoe');
        }
      }
      const token = battleMapTokens.find(t => t.x === x && t.y === y);
      if (token) {
        const activeToken = resolveActiveTurnToken();
        const isActive = activeToken && String(activeToken.id) === String(token.id);
        const tok = document.createElement('div');
        tok.className = 'map-token' + (isActive ? ' encounter-active-token' : '');
        const maxHp = token.maxHp ?? (token.monsterData ? parseMonsterMaxHp(token.monsterData.hp) : null);
        const curHp = token.currentHp ?? maxHp;
        const nm = token.name || '';
        const displayLabel = token.label || (nm.length <= 4 ? nm : nm.slice(0, 4));
        const labelSpan = document.createElement('span');
        labelSpan.className = 'map-token-label';
        labelSpan.textContent = displayLabel;
        tok.appendChild(labelSpan);
        const condShort = formatTokenConditionsShort(token);
        if (condShort) {
          const cEl = document.createElement('div');
          cEl.className = 'map-token-conditions';
          cEl.textContent = condShort.length > 22 ? condShort.slice(0, 22) + '…' : condShort;
          tok.appendChild(cEl);
        }
        let tip = token.monsterData ? `${token.name} HP ${curHp}/${maxHp ?? '?'} (${x},${y}) — click for stats, double-click to edit` : `${token.name} (${x},${y}) — double-click to edit`;
        if (token.notes && String(token.notes).trim()) tip += ` — Notes: ${String(token.notes).slice(0, 120)}`;
        if (condShort) tip += ` — ${condShort}`;
        tok.title = tip;
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
          openTokenInspector(token);
        });
        tok.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          openTokenInspector(token);
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
      grid.appendChild(cell);
    }
  }

  renderEncounterUI();
  if (tokenList && typeof AppRenderers !== 'undefined' && AppRenderers.renderBattleTokenList) {
    AppRenderers.renderBattleTokenList(tokenList, battleMapTokens, {
      parseMonsterMaxHp,
      defaultColor: BATTLE_MAP_COLORS[0],
      onStats: (t) => { if (t?.monsterData) showMonsterStatModal(t.monsterData, t); },
      onDamage: (t) => {
        const maxHp = t.maxHp ?? (t.monsterData ? parseMonsterMaxHp(t.monsterData.hp) : 0);
        t.currentHp = Math.max(0, (t.currentHp ?? maxHp ?? 0) - 1);
        t.maxHp = t.maxHp ?? maxHp;
        saveAndRenderBattleMap();
      },
      onHeal: (t) => {
        const maxHp = t.maxHp ?? (t.monsterData ? parseMonsterMaxHp(t.monsterData.hp) : 0);
        t.currentHp = Math.min(t.maxHp ?? 999, (t.currentHp ?? maxHp ?? 0) + 1);
        t.maxHp = t.maxHp ?? maxHp;
        saveAndRenderBattleMap();
      },
      onEdit: (t) => openTokenInspector(t),
      onDelete: (t) => {
        battleMapTokens = battleMapTokens.filter(x => x.id != t.id);
        saveAndRenderBattleMap();
      }
    });
  }

  const monsterStatsList = document.getElementById('monster-stats-list');
  const monsterCountEl = document.getElementById('monster-count');
  const monsters = battleMapTokens.filter(t => t.monsterData);
  if (monsterCountEl) monsterCountEl.textContent = `(${monsters.length})`;
  if (monsterStatsList && typeof AppRenderers !== 'undefined' && AppRenderers.renderMonsterStatsList) {
    AppRenderers.renderMonsterStatsList(monsterStatsList, monsters, {
      parseMonsterMaxHp,
      getDifficulty: typeof getCrDifficulty === 'function' ? getCrDifficulty : () => '',
      onDamage: (t) => {
        const maxHp = t.maxHp ?? parseMonsterMaxHp(t.monsterData.hp);
        t.currentHp = Math.max(0, (t.currentHp ?? maxHp ?? 0) - 1);
        t.maxHp = t.maxHp ?? maxHp;
        saveAndRenderBattleMap();
      },
      onHeal: (t) => {
        const maxHp = t.maxHp ?? parseMonsterMaxHp(t.monsterData.hp);
        t.currentHp = Math.min(t.maxHp ?? 999, (t.currentHp ?? maxHp ?? 0) + 1);
        t.maxHp = t.maxHp ?? maxHp;
        saveAndRenderBattleMap();
      },
      onStats: (t) => { if (t?.monsterData) showMonsterStatModal(t.monsterData, t); }
    });
  }

  layoutBattleMapGridTracks();
}
