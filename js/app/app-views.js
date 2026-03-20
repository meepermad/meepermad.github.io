/**
 * app-views.js
 * View switching, session view, character list, builder, save.
 * Handles: showListView, showSessionView, showBuilderView, renderCharacterList, saveCharacter.
 *
 * @depends app-state, app-persistence, app-combat, app-char-helpers, app-step-renderers, app-preview, app-array-helpers
 */
// ========== VIEW SWITCHING ==========
// showListView, showSessionView, showBuilderView, showBattleMapView - switch between main app views

/** Switch to character list view; hide builder, session, and battle map */
function showListView() {
  const mainPlayer = document.getElementById('main-player-content');
  const dmPanel = document.getElementById('dm-panel');
  const role = localStorage.getItem('dnd_role') || 'player';
  if (mainPlayer) mainPlayer.hidden = false;
  if (dmPanel) dmPanel.hidden = role !== 'dm';
  document.body.classList.toggle('dm-role', role === 'dm');
  if (listView) listView.hidden = false;
  if (builderView) builderView.hidden = true;
  if (sessionView) sessionView.hidden = true;
  if (battleMapView) battleMapView.hidden = true;
  document.body.classList.remove('battle-map-active');
  const listTitle = document.getElementById('character-list-title');
  if (listTitle) listTitle.textContent = role === 'dm' ? 'Characters & party' : 'Your Characters';
  const listHint = document.getElementById('character-list-role-hint');
  if (listHint) listHint.hidden = role !== 'dm';
  renderCharacterList();
}

/** Suggest max HP for a character based on hit dice and Con mod if not yet set */
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

/** Switch to session view for a character; loads character sheet for play */
function showSessionView(char) {
  sessionCharacter = characters.find(c => c.id === char.id) || char;
  suggestMaxHp(sessionCharacter);
  const mainPlayer = document.getElementById('main-player-content');
  const dmPanel = document.getElementById('dm-panel');
  const rolePlayer = document.getElementById('role-player');
  const roleDm = document.getElementById('role-dm');
  rolePlayer?.classList.add('active');
  roleDm?.classList.remove('active');
  localStorage.setItem('dnd_role', 'player');
  document.body.classList.remove('dm-role');
  if (mainPlayer) mainPlayer.hidden = false;
  if (dmPanel) dmPanel.hidden = true;
  if (listView) listView.hidden = true;
  builderView.hidden = true;
  sessionView.hidden = false;
  battleMapView.hidden = true;
  document.body.classList.remove('battle-map-active');

  document.getElementById('session-char-name').textContent = sessionCharacter.name || 'Unnamed';
  const editionBadge = document.getElementById('session-edition-badge');
  if (editionBadge) {
    const ed = (sessionCharacter.edition === '5.5e') ? '2024' : '5e';
    editionBadge.textContent = ed;
    editionBadge.title = ed === '2024' ? '2024 Rules (5.5e)' : '2014 Rules (5e)';
    editionBadge.hidden = false;
  }
  renderSessionOverview();
  renderSessionCombat();
  renderSessionAttacks();
  renderSessionSpells();
  renderSessionInventory();
  renderSessionLeveling();
  switchSessionTab('character');
}

function getTotalLevel(c) {
  if (typeof RulesEngine !== 'undefined' && RulesEngine.getTotalLevel) return RulesEngine.getTotalLevel(c);
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
  document.querySelectorAll('.session-tab').forEach(t => {
    t.classList.remove('active');
    t.setAttribute('aria-selected', 'false');
  });
  document.querySelectorAll('.session-pane').forEach(p => p.classList.remove('active'));
  const tab = document.querySelector(`.session-tab[data-tab="${tabId}"]`);
  const pane = document.getElementById(`pane-${tabId}`);
  if (tab) {
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
  }
  if (pane) pane.classList.add('active');
}

const CURRENT_SECTIONS = ['saves', 'about', 'senses-skills', 'defenses', 'features'];
const LEGACY_SECTIONS = ['ability-checks', 'senses', 'skills', 'conditions'];

function applyOverviewSectionOrder(className) {
  const container = document.getElementById('overview-sections');
  if (!container) return;
  let customOrder = sessionCharacter?.sectionOrder;
  const hasLegacy = customOrder?.some(id => LEGACY_SECTIONS.includes(id));
  const defaultOrder = (typeof SECTION_ORDER_BY_CLASS !== 'undefined' ? SECTION_ORDER_BY_CLASS[className] : null) || (typeof SECTION_ORDER_DEFAULT !== 'undefined' ? SECTION_ORDER_DEFAULT : CURRENT_SECTIONS);
  const order = (customOrder && customOrder.length > 0 && !hasLegacy)
    ? customOrder.filter(id => CURRENT_SECTIONS.includes(id))
    : defaultOrder;
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

let designerModeActive = false;
const SECTION_LABELS = {
  saves: 'Saves & Ability Checks', about: 'About & Notes', 'senses-skills': 'Skills & Senses',
  defenses: 'Defenses', features: 'Features'
};

function toggleDesignerMode() {
  const container = document.getElementById('overview-sections');
  const btn = document.getElementById('designer-mode-toggle');
  if (!container) return;
  designerModeActive = !designerModeActive;
  container.classList.toggle('designer-active', designerModeActive);
  if (btn) btn.classList.toggle('active', designerModeActive);

  container.querySelectorAll('.collapsible-section').forEach(section => {
    let handle = section.querySelector('.drag-handle');
    let controls = section.querySelector('.designer-controls');
    if (designerModeActive) {
      if (!handle) {
        handle = document.createElement('span');
        handle.className = 'drag-handle';
        handle.textContent = '⠿';
        handle.title = 'Drag to reorder';
        const toggle = section.querySelector('.section-toggle');
        if (toggle) toggle.insertBefore(handle, toggle.firstChild);
      }
      if (!controls) {
        controls = document.createElement('div');
        controls.className = 'designer-controls';
        const id = section.dataset.section || section.dataset.sectionId;
        const layout = sessionCharacter?.sheetLayout || { sections: {} };
        let current = layout.sections?.[id] || 'full';
        if (SECTION_DISPLAY_LEGACY[current]) current = SECTION_DISPLAY_LEGACY[current];
        const sel = typeof DomUtils !== 'undefined'
          ? DomUtils.createElement('select', { className: 'designer-size-select', title: 'Section display mode', dataset: { section: id } })
          : (() => { const s = document.createElement('select'); s.className = 'designer-size-select'; s.title = 'Section display mode'; s.dataset.section = id; return s; })();
        if (typeof AppRenderers !== 'undefined' && AppRenderers.setSelectOptions) {
          AppRenderers.setSelectOptions(sel, [
            { value: 'full', label: 'Full' },
            { value: 'compact', label: 'Compact' },
            { value: 'half', label: 'Half' }
          ], { selected: current });
        }
        controls.appendChild(sel);
        sel.onchange = (e) => {
          if (!sessionCharacter) return;
          if (!sessionCharacter.sheetLayout) sessionCharacter.sheetLayout = { overall: 'single', sections: {} };
          if (!sessionCharacter.sheetLayout.sections) sessionCharacter.sheetLayout.sections = {};
          sessionCharacter.sheetLayout.sections[id] = e.target.value;
          saveCharacters();
          applySheetLayout();
        };
        section.appendChild(controls);
      }
      handle.hidden = false;
      controls.hidden = false;
    } else {
      if (handle) handle.hidden = true;
      if (controls) controls.hidden = true;
    }
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

/** Dex-based initiative modifier (Alert / other static bonuses can be added later). */
function getInitiativeModifier(c) {
  const dex = c?.stats?.dexterity ?? 10;
  return Math.floor((dex - 10) / 2);
}

/**
 * Add weapon entries from equipment list into c.attacks when they match the weapons table.
 */
function syncEquipmentWeaponsToAttacks(c) {
  if (!c || !Array.isArray(c.equipment)) return;
  const table = typeof WEAPONS !== 'undefined' ? WEAPONS : [];
  if (!table.length) return;
  c.attacks = c.attacks || [];
  const have = new Set(c.attacks.map(a => String(a.name || '').toLowerCase()));
  const findWeapon = (line) => {
    const s = String(line).trim().toLowerCase();
    if (!s) return null;
    let w = table.find(x => x.name.toLowerCase() === s);
    if (w) return w;
    w = table.find(x => s.includes(x.name.toLowerCase()) || x.name.toLowerCase().includes(s));
    return w || null;
  };
  c.equipment.forEach((line) => {
    const w = findWeapon(line);
    if (!w || have.has(w.name.toLowerCase())) return;
    c.attacks.push({ ...w, proficient: true });
    have.add(w.name.toLowerCase());
  });
}

function getStatBreakdown(c, stat) {
  if (typeof RulesEngine !== 'undefined' && RulesEngine.getStatBreakdown) {
    return RulesEngine.getStatBreakdown(c, stat, { races: getMergedRaces() });
  }
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
  const initMod = getInitiativeModifier(c);
  const initModStr = initMod >= 0 ? `+${initMod}` : `${initMod}`;
  const profBonus = Math.floor(getTotalLevel(c) / 4) + 2;
  document.getElementById('qs-name').textContent = c.name || 'Unnamed';
  const printEditionEl = document.getElementById('print-edition');
  if (printEditionEl) {
    const ed = (c.edition === '5.5e') ? '2024' : '5e';
    printEditionEl.textContent = ed;
    printEditionEl.hidden = false;
  }
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
  const qsInitMod = document.getElementById('qs-init-mod');
  const qsInitTotal = document.getElementById('qs-init-total');
  if (qsInitMod) qsInitMod.textContent = initModStr;
  if (qsInitTotal) {
    if (c.initiative != null) {
      qsInitTotal.textContent = String(c.initiative);
      qsInitTotal.title = c.initiativeNat != null ? `d20 (${c.initiativeNat}) + mod (${initModStr})` : '';
    } else {
      qsInitTotal.textContent = '—';
      qsInitTotal.title = 'Roll initiative from the Combat strip';
    }
  }
  const saveProfs = (cls?.savingThrows || []).map(s => s.toLowerCase().slice(0, 3));
  const statToSave = { strength: 'str', dexterity: 'dex', constitution: 'con', intelligence: 'int', wisdom: 'wis', charisma: 'cha' };
  const savesDisadv = debuff.savesDisadvantage;
  const savesEl = document.getElementById('session-saves-display');
  if (savesEl) {
    const d = typeof DomUtils !== 'undefined' ? DomUtils : null;
    if (d && d.clearChildren) d.clearChildren(savesEl);
    else savesEl.replaceChildren();
    Object.entries(c.stats || {}).forEach(([stat, val]) => {
      const mod = Math.floor((val - 10) / 2);
      const isProf = saveProfs.includes(statToSave[stat] || stat.slice(0, 3));
      const total = mod + (isProf ? profBonus : 0);
      const totalStr = total >= 0 ? `+${total}` : `${total}`;
      const label = (stat.charAt(0).toUpperCase() + stat.slice(1)).slice(0, 3);
      const bd = getStatBreakdown(c, stat);
      const breakdownTip = bd.parts.join(' = ') + ` → Mod ${bd.mod >= 0 ? '+' : ''}${bd.mod}` + (savesDisadv ? ' (disadvantage)' : '');
      const row = d
        ? d.createElement('div', {
          className: `stat-display-item stat-rollable stat-row-clickable${savesDisadv ? ' has-disadvantage' : ''}`,
          title: `${breakdownTip} — click to roll save`,
          role: 'button',
          tabIndex: 0
        })
        : (() => {
          const r = document.createElement('div');
          r.className = `stat-display-item stat-rollable stat-row-clickable${savesDisadv ? ' has-disadvantage' : ''}`;
          r.title = `${breakdownTip} — click to roll save`;
          r.setAttribute('role', 'button');
          r.tabIndex = 0;
          return r;
        })();
      row.dataset.ability = stat;
      const mainRow = d ? d.createElement('div', { className: 'stat-main-row' }) : (() => { const el = document.createElement('div'); el.className = 'stat-main-row'; return el; })();
      mainRow.appendChild(d ? d.createElement('div', { className: 'stat-name', textContent: label }) : (() => { const x = document.createElement('div'); x.className = 'stat-name'; x.textContent = label; return x; })());
      const saveNums = d ? d.createElement('div', { className: 'stat-nums stat-nums--save' }) : (() => { const el = document.createElement('div'); el.className = 'stat-nums stat-nums--save'; return el; })();
      const saveBlk = d ? d.createElement('div', { className: 'stat-num-block' }) : (() => { const el = document.createElement('div'); el.className = 'stat-num-block'; return el; })();
      saveBlk.appendChild(d ? d.createElement('span', { className: 'stat-num-label', textContent: 'Save' }) : (() => { const s = document.createElement('span'); s.className = 'stat-num-label'; s.textContent = 'Save'; return s; })());
      saveBlk.appendChild(d ? d.createElement('span', { className: 'stat-save-total', textContent: totalStr }) : (() => { const s = document.createElement('span'); s.className = 'stat-save-total'; s.textContent = totalStr; return s; })());
      saveNums.appendChild(saveBlk);
      mainRow.appendChild(saveNums);
      if (savesDisadv) {
        mainRow.appendChild(d ? d.createElement('span', { className: 'debuff-badge', title: 'Saving throws at disadvantage', textContent: 'dis adv' }) : (() => { const s = document.createElement('span'); s.className = 'debuff-badge'; s.title = 'Saving throws at disadvantage'; s.textContent = 'dis adv'; return s; })());
      }
      row.appendChild(mainRow);
      savesEl.appendChild(row);
    });
    const rollSave = (stat) => {
      const c2 = sessionCharacter;
      const mod = Math.floor(((c2.stats?.[stat] || 10) - 10) / 2);
      const abCap = stat ? stat.charAt(0).toUpperCase() + stat.slice(1) : '';
      const isProf = (getMergedClasses().find(x => x.name === c2.class)?.savingThrows || []).includes(abCap);
      const totalMod = mod + (isProf ? profBonus : 0);
      const debuff = getDebuffEffects(c2);
      showDiceRoll(stat, 'ability', null, totalMod, debuff.savesDisadvantage);
    };
    savesEl.querySelectorAll('.stat-row-clickable').forEach(row => {
      const stat = row.dataset.ability;
      row.addEventListener('click', () => rollSave(stat));
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          rollSave(stat);
        }
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
  const statsEl = document.getElementById('session-stats-display');
  if (statsEl) {
    const d = typeof DomUtils !== 'undefined' ? DomUtils : null;
    if (d && d.clearChildren) d.clearChildren(statsEl);
    else statsEl.replaceChildren();
    Object.entries(c.stats || {}).forEach(([stat, val]) => {
      const bd = getStatBreakdown(c, stat);
      const modStr = bd.mod >= 0 ? `+${bd.mod}` : `${bd.mod}`;
      const label = statNames[stat] || stat.slice(0, 3).toUpperCase();
      const breakdownTip = bd.parts.join(' = ') + ` → Mod ${bd.mod >= 0 ? '+' : ''}${bd.mod}` + (abilityDisadv ? ' (disadvantage)' : '');
      const row = d
        ? d.createElement('div', {
          className: `stat-display-item stat-rollable stat-with-breakdown stat-row-clickable${abilityDisadv ? ' has-disadvantage' : ''}`,
          title: `${breakdownTip} — click to roll check`,
          role: 'button',
          tabIndex: 0
        })
        : (() => {
          const r = document.createElement('div');
          r.className = `stat-display-item stat-rollable stat-with-breakdown stat-row-clickable${abilityDisadv ? ' has-disadvantage' : ''}`;
          r.title = `${breakdownTip} — click to roll check`;
          r.setAttribute('role', 'button');
          r.tabIndex = 0;
          return r;
        })();
      row.dataset.ability = stat;
      const abMain = d ? d.createElement('div', { className: 'stat-main-row' }) : (() => { const el = document.createElement('div'); el.className = 'stat-main-row'; return el; })();
      abMain.appendChild(d ? d.createElement('div', { className: 'stat-name', textContent: label }) : (() => { const x = document.createElement('div'); x.className = 'stat-name'; x.textContent = label; return x; })());
      const abNums = d ? d.createElement('div', { className: 'stat-nums stat-nums--ability' }) : (() => { const el = document.createElement('div'); el.className = 'stat-nums stat-nums--ability'; return el; })();
      const scoreBlk = d ? d.createElement('div', { className: 'stat-num-block' }) : (() => { const el = document.createElement('div'); el.className = 'stat-num-block'; return el; })();
      scoreBlk.appendChild(d ? d.createElement('span', { className: 'stat-num-label', textContent: 'Score' }) : (() => { const s = document.createElement('span'); s.className = 'stat-num-label'; s.textContent = 'Score'; return s; })());
      scoreBlk.appendChild(d ? d.createElement('span', { className: 'stat-score', textContent: String(val) }) : (() => { const s = document.createElement('span'); s.className = 'stat-score'; s.textContent = String(val); return s; })());
      const modBlk = d ? d.createElement('div', { className: 'stat-num-block' }) : (() => { const el = document.createElement('div'); el.className = 'stat-num-block'; return el; })();
      modBlk.appendChild(d ? d.createElement('span', { className: 'stat-num-label', textContent: 'Mod' }) : (() => { const s = document.createElement('span'); s.className = 'stat-num-label'; s.textContent = 'Mod'; return s; })());
      modBlk.appendChild(d ? d.createElement('span', { className: 'stat-mod', textContent: modStr }) : (() => { const s = document.createElement('span'); s.className = 'stat-mod'; s.textContent = modStr; return s; })());
      abNums.appendChild(scoreBlk);
      abNums.appendChild(modBlk);
      abMain.appendChild(abNums);
      if (abilityDisadv) {
        abMain.appendChild(d ? d.createElement('span', { className: 'debuff-badge', title: 'Ability checks at disadvantage', textContent: 'dis adv' }) : (() => { const s = document.createElement('span'); s.className = 'debuff-badge'; s.title = 'Ability checks at disadvantage'; s.textContent = 'dis adv'; return s; })());
      }
      row.appendChild(abMain);
      row.appendChild(d ? d.createElement('div', { className: 'stat-breakdown', textContent: bd.parts.join(' = ') }) : (() => { const x = document.createElement('div'); x.className = 'stat-breakdown'; x.textContent = bd.parts.join(' = '); return x; })());
      statsEl.appendChild(row);
    });
    statsEl.querySelectorAll('.stat-row-clickable').forEach(row => {
      const ab = row.dataset.ability;
      const go = () => {
        const debuff = getDebuffEffects(sessionCharacter);
        showDiceRoll(ab, 'ability', null, undefined, debuff.abilityChecksDisadvantage);
      };
      row.addEventListener('click', go);
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          go();
        }
      });
    });
  }

  applyOverviewSectionOrder(getPrimaryClass(c));
  const layoutSel = document.getElementById('sheet-layout-overall');
  if (layoutSel) layoutSel.value = (c.sheetLayout?.overall || 'single');
  applySheetLayout();
  initCollapsibleSections();

  const skillsToDisplay = typeof SKILLS !== 'undefined' ? SKILLS : [];
  const skillsDisplay = document.getElementById('session-skills-display');
  if (skillsDisplay) {
    const d = typeof DomUtils !== 'undefined' ? DomUtils : null;
    if (d && d.clearChildren) d.clearChildren(skillsDisplay);
    else skillsDisplay.replaceChildren();
    if (!skillsToDisplay.length) {
      skillsDisplay.appendChild(d ? d.createElement('span', { className: 'list-item muted', textContent: 'None' }) : (() => { const s = document.createElement('span'); s.className = 'list-item muted'; s.textContent = 'None'; return s; })());
    } else {
      skillsToDisplay.forEach(skill => {
        const ability = typeof SKILL_ABILITY_MAP !== 'undefined' ? (SKILL_ABILITY_MAP[skill] || 'strength') : 'strength';
        const mod = Math.floor(((c.stats?.[ability] || 10) - 10) / 2);
        const isProf = (c.skills || []).includes(skill) || (c.proficiencies || []).includes(skill);
        const total = mod + (isProf ? profBonus : 0);
        const totalStr = total >= 0 ? `+${total}` : `${total}`;
        const source = isProf && typeof getSkillSource === 'function' ? getSkillSource(skill, c) : null;
        const title = source ? `${skill}: ${totalStr} (${source}) — click to roll` : `${skill}: ${totalStr}${isProf ? ' (proficient)' : ''} — click to roll`;
        const btn = d
          ? d.createElement('button', { type: 'button', className: `skill-compact-btn${isProf ? ' proficient' : ''}`, title })
          : (() => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = `skill-compact-btn${isProf ? ' proficient' : ''}`;
            b.title = title;
            return b;
          })();
        const nameSp = document.createElement('span');
        nameSp.className = 'skill-compact-name';
        nameSp.textContent = skill;
        const modSp = document.createElement('span');
        modSp.className = 'skill-compact-mod';
        modSp.textContent = totalStr;
        btn.append(nameSp, modSp);
        if (source) {
          const srcEl = d ? d.createElement('span', { className: 'skill-source', textContent: source }) : (() => { const x = document.createElement('span'); x.className = 'skill-source'; x.textContent = source; return x; })();
          btn.appendChild(srcEl);
        }
        btn.addEventListener('click', () => {
          const debuff = getDebuffEffects(sessionCharacter);
          showDiceRoll(skill, 'skill', ability, undefined, debuff.abilityChecksDisadvantage);
        });
        skillsDisplay.appendChild(btn);
      });
    }
  }

  const aboutEl = document.getElementById('session-about-display');
  if (aboutEl) {
    const d = typeof DomUtils !== 'undefined' ? DomUtils : null;
    if (d && d.clearChildren) d.clearChildren(aboutEl);
    else aboutEl.replaceChildren();
    const pushAbout = (label, text) => {
      const p = d ? d.createElement('p') : document.createElement('p');
      const strong = document.createElement('strong');
      strong.textContent = `${label}:`;
      p.appendChild(strong);
      p.appendChild(document.createTextNode(' ' + text));
      aboutEl.appendChild(p);
    };
    if (c.languages && c.languages.length) pushAbout('Languages', c.languages.join(', '));
    if (c.physicalAppearance) pushAbout('Appearance', c.physicalAppearance);
    if (c.personalityTraits) pushAbout('Personality', c.personalityTraits);
    if (c.ideals) pushAbout('Ideals', c.ideals);
    if (c.bonds) pushAbout('Bonds', c.bonds);
    if (c.flaws) pushAbout('Flaws', c.flaws);
    if (!aboutEl.childNodes.length) {
      aboutEl.appendChild(d ? d.createElement('span', { className: 'list-item muted', textContent: 'None added' }) : (() => { const s = document.createElement('span'); s.className = 'list-item muted'; s.textContent = 'None added'; return s; })());
    }
  }

  const res = c.resistances || [];
  const imm = c.immunities || [];
  const vuln = c.vulnerabilities || [];
  const weak = c.weaknesses || [];
  const defensesEl = document.getElementById('session-defenses-display');
  if (defensesEl) {
    const d = typeof DomUtils !== 'undefined' ? DomUtils : null;
    if (d && d.clearChildren) d.clearChildren(defensesEl);
    else defensesEl.replaceChildren();
    const appendDefense = (className, text) => {
      defensesEl.appendChild(d ? d.createElement('span', { className, textContent: text }) : (() => { const s = document.createElement('span'); s.className = className; s.textContent = text; return s; })());
    };
    res.forEach(r => appendDefense('list-item list-item-resist', `Resist: ${r}`));
    imm.forEach(i => appendDefense('list-item list-item-immune', `Immune: ${i}`));
    vuln.forEach(v => appendDefense('list-item list-item-vuln', `Vulnerable: ${v}`));
    weak.forEach(w => appendDefense('list-item list-item-weak', w));
    if (!defensesEl.childNodes.length) {
      defensesEl.appendChild(d ? d.createElement('span', { className: 'list-item muted', textContent: 'None' }) : (() => { const s = document.createElement('span'); s.className = 'list-item muted'; s.textContent = 'None'; return s; })());
    }
  }

  const notesEl = document.getElementById('session-notes');
  if (notesEl) {
    notesEl.value = c.notes || '';
    notesEl.onchange = notesEl.onblur = () => { if (sessionCharacter) { sessionCharacter.notes = notesEl.value; saveCharacters(); } };
  }

  const featuresEl = document.getElementById('session-features-display');
  if (featuresEl) {
    const totalLevel = getTotalLevel(c);
    const primaryClass = c.class || '';
    const featuresByLevel = typeof CLASS_FEATURES_BY_LEVEL !== 'undefined' ? CLASS_FEATURES_BY_LEVEL[primaryClass] : null;
    const subclassKey = c.subclass ? `${primaryClass}|${c.subclass}` : null;
    const subclassFeatures = (c.subclass && typeof SUBCLASS_FEATURES_BY_LEVEL !== 'undefined') ? SUBCLASS_FEATURES_BY_LEVEL[subclassKey] : null;
    const race = getMergedRaces().find(r => r.name === c.race);
    const traitDescs = typeof RACIAL_TRAIT_DESCRIPTIONS !== 'undefined' ? RACIAL_TRAIT_DESCRIPTIONS : {};
    const d = typeof DomUtils !== 'undefined' ? DomUtils : null;
    if (d && d.clearChildren) d.clearChildren(featuresEl);
    else featuresEl.replaceChildren();
    const appendFeatureSpan = (className, title, buildContent) => {
      const span = d ? d.createElement('span', { className, title: title || undefined }) : (() => { const s = document.createElement('span'); s.className = className; if (title) s.title = title; return s; })();
      buildContent(span);
      featuresEl.appendChild(span);
    };
    (c.feats || []).forEach(f => {
      appendFeatureSpan('feature-item', 'View full in Quick Reference.', (span) => {
        const strong = document.createElement('strong');
        strong.textContent = 'Feat:';
        span.appendChild(strong);
        span.appendChild(document.createTextNode(' ' + f));
      });
    });
    (race?.traits || []).forEach(t => {
      const desc = traitDescs[t];
      if (desc) {
        appendFeatureSpan('feature-item feature-has-desc', desc, (span) => {
          span.appendChild(document.createTextNode(t + ' '));
          span.appendChild(d ? d.createElement('span', { className: 'feature-info', textContent: 'ⓘ' }) : (() => { const i = document.createElement('span'); i.className = 'feature-info'; i.textContent = 'ⓘ'; return i; })());
        });
      } else {
        appendFeatureSpan('feature-item', null, (span) => { span.textContent = t; });
      }
    });
    if (featuresByLevel) {
      for (let lvl = 1; lvl <= totalLevel; lvl++) {
        const feat = featuresByLevel[lvl];
        if (feat) {
          appendFeatureSpan('feature-item', feat, (span) => {
            const strong = document.createElement('strong');
            strong.textContent = `Lvl ${lvl}:`;
            span.appendChild(strong);
            span.appendChild(document.createTextNode(' ' + feat));
          });
        }
      }
    }
    if (subclassFeatures) {
      for (let lvl = 1; lvl <= totalLevel; lvl++) {
        const feat = subclassFeatures[lvl];
        if (feat) {
          appendFeatureSpan('feature-item feature-item-subclass', feat, (span) => {
            const strong = document.createElement('strong');
            strong.textContent = `Lvl ${lvl} (${c.subclass || ''}):`;
            span.appendChild(strong);
            span.appendChild(document.createTextNode(' ' + feat));
          });
        }
      }
    }
    if (!featuresEl.childNodes.length) {
      featuresEl.appendChild(d ? d.createElement('span', { className: 'list-item muted', textContent: 'None' }) : (() => { const s = document.createElement('span'); s.className = 'list-item muted'; s.textContent = 'None'; return s; })());
    }
  }
}

/** Show dice roll overlay with d20 animation; supports ability checks, saves, initiative.
 *  overrideMod: use this modifier instead of computing (for saves/initiative)
 *  overrideRoll: use this d20 result instead of rolling (ensures overlay matches saved value) */
function showDiceRoll(label, type, abilityKey, overrideMod, disadvantage, overrideRoll) {
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
    if (label === 'Initiative') labelEl.textContent = 'Initiative';
    else {
      const ab = String(label || '').toLowerCase();
      const isSaveAbility = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].includes(ab);
      labelEl.textContent = isSaveAbility
        ? ab.charAt(0).toUpperCase() + ab.slice(1) + ' Save'
        : `${label} — Attack`;
    }
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
  if (overrideRoll != null && overrideRoll >= 1 && overrideRoll <= 20) {
    natural = overrideRoll;
    total = natural + mod;
  } else if (useDisadvantage) {
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
          const d = typeof DomUtils !== 'undefined' ? DomUtils : null;
          if (d && d.clearChildren) d.clearChildren(logEl);
          else logEl.replaceChildren();
          const entry = d ? d.createElement('div', { className: 'spell-roll-log-entry' }) : (() => { const e = document.createElement('div'); e.className = 'spell-roll-log-entry'; return e; })();
          const strong = document.createElement('strong');
          strong.textContent = `${spellLabel}${label || (isHealing ? 'Healing' : 'Damage')}`;
          entry.appendChild(strong);
          entry.appendChild(document.createElement('br'));
          entry.appendChild(document.createTextNode(detail));
          logEl.appendChild(entry);
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

  const dexMod = getInitiativeModifier(c);
  const modEl = document.getElementById('combat-init-mod');
  const totalEl = document.getElementById('combat-init-total');
  const detailEl = document.getElementById('combat-init-detail');
  if (modEl) modEl.textContent = (dexMod >= 0 ? '+' : '') + dexMod;
  if (totalEl) {
    if (c.initiative != null) totalEl.textContent = String(c.initiative);
    else totalEl.textContent = '—';
  }
  if (detailEl) {
    if (c.initiative != null && c.initiativeNat != null) {
      detailEl.hidden = false;
      detailEl.textContent = `d20 ${c.initiativeNat} + ${dexMod >= 0 ? '+' : ''}${dexMod}`;
    } else {
      detailEl.hidden = true;
      detailEl.textContent = '';
    }
  }
  const rollInitBtn = document.getElementById('roll-initiative-btn');
  if (rollInitBtn) rollInitBtn.onclick = () => {
    const roll = Math.floor(Math.random() * 20) + 1;
    const total = roll + dexMod;
    sessionCharacter.initiativeNat = roll;
    sessionCharacter.initiative = total;
    saveCharacters();
    renderSessionCombat();
    renderSessionOverview();
    const debuff = getDebuffEffects(sessionCharacter);
    showDiceRoll('Initiative', 'ability', 'dexterity', dexMod, debuff.abilityChecksDisadvantage, roll);
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

  const dsSuccessDisplay = document.getElementById('ds-success-display');
  const dsFailDisplay = document.getElementById('ds-fail-display');
  const dsSuccess = document.getElementById('ds-success');
  const dsFail = document.getElementById('ds-fail');
  const succ = c.deathSaveSuccesses ?? 0;
  const fail = c.deathSaveFailures ?? 0;
  if (dsSuccessDisplay) dsSuccessDisplay.textContent = ['○', '○', '○'].map((_, i) => i < succ ? '●' : '○').join(' ');
  if (dsFailDisplay) dsFailDisplay.textContent = ['○', '○', '○'].map((_, i) => i < fail ? '●' : '○').join(' ');
  if (dsSuccess) dsSuccess.disabled = succ >= 3;
  if (dsFail) dsFail.disabled = fail >= 3;
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
  const d = typeof DomUtils !== 'undefined' ? DomUtils : null;
  if (d && d.clearChildren) d.clearChildren(container);
  else container.replaceChildren();
  (c.conditions || []).forEach((cond, i) => {
    const span = d ? d.createElement('span', { className: 'array-item' }) : (() => { const s = document.createElement('span'); s.className = 'array-item'; return s; })();
    span.appendChild(document.createTextNode(cond + ' '));
    span.appendChild(d ? d.createElement('button', { type: 'button', className: 'remove-item', dataset: { idx: String(i) }, textContent: '×' }) : (() => { const b = document.createElement('button'); b.type = 'button'; b.className = 'remove-item'; b.dataset.idx = String(i); b.textContent = '×'; return b; })());
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
  const atkBefore = (c.attacks || []).length;
  syncEquipmentWeaponsToAttacks(c);
  if ((c.attacks || []).length !== atkBefore && typeof saveCharacters === 'function') saveCharacters();
  const attacks = c.attacks || [];
  const weapons = typeof WEAPONS !== 'undefined' ? WEAPONS : [];
  const profBonus = Math.floor(getTotalLevel(c) / 4) + 2;
  const strMod = Math.floor(((c.stats?.strength || 10) - 10) / 2);
  const dexMod = Math.floor(((c.stats?.dexterity || 10) - 10) / 2);

  const weaponSel = document.getElementById('attack-weapon-select');
  if (weaponSel) {
    if (typeof AppRenderers !== 'undefined' && AppRenderers.setSelectOptions) AppRenderers.setSelectOptions(weaponSel, [{ value: '', label: '— Add weapon —' }, ...weapons.map(w => ({ value: w.name, label: `${w.name} (${w.damage} ${w.damageType})` }))]);
  }

  const listEl = document.getElementById('attacks-list');
  if (listEl) {
    const d = typeof DomUtils !== 'undefined' ? DomUtils : null;
    if (d && d.clearChildren) d.clearChildren(listEl);
    else listEl.replaceChildren();
    attacks.forEach((a, i) => {
      const w = weapons.find(x => x.name === a.name) || a;
      const baseMod = (w.type === 'ranged' || (w.properties || '').includes('Finesse')) ? Math.max(strMod, dexMod) : (w.type === 'ranged' ? dexMod : strMod);
      const customMod = parseInt(a.toHitModifier) || 0;
      const toHit = baseMod + (a.proficient ? profBonus : 0) + customMod;
      const toHitStr = toHit >= 0 ? `+${toHit}` : `${toHit}`;
      const card = d ? d.createElement('div', { className: 'attack-card', dataset: { idx: String(i) } }) : (() => { const el = document.createElement('div'); el.className = 'attack-card'; el.dataset.idx = String(i); return el; })();
      const header = d ? d.createElement('div', { className: 'attack-header' }) : (() => { const h = document.createElement('div'); h.className = 'attack-header'; return h; })();
      header.appendChild(d ? d.createElement('strong', { textContent: a.name || 'Attack' }) : (() => { const s = document.createElement('strong'); s.textContent = a.name || 'Attack'; return s; })());
      header.appendChild(d ? d.createElement('button', { type: 'button', className: 'remove-item', dataset: { idx: String(i) }, textContent: '×' }) : (() => { const b = document.createElement('button'); b.type = 'button'; b.className = 'remove-item'; b.dataset.idx = String(i); b.textContent = '×'; return b; })());
      card.appendChild(header);
      const details = d ? d.createElement('div', { className: 'attack-details' }) : (() => { const x = document.createElement('div'); x.className = 'attack-details'; return x; })();
      details.appendChild(d ? d.createElement('span', { textContent: `${w.type || 'melee'} · ${w.range || a.range || '5 ft'}` }) : (() => { const s = document.createElement('span'); s.textContent = `${w.type || 'melee'} · ${w.range || a.range || '5 ft'}`; return s; })());
      details.appendChild(d ? d.createElement('span', { textContent: `To hit: ${toHitStr}` }) : (() => { const s = document.createElement('span'); s.textContent = `To hit: ${toHitStr}`; return s; })());
      details.appendChild(d ? d.createElement('span', { textContent: `${w.damage || a.damage || '?'} ${w.damageType || a.damageType || ''}`.trim() }) : (() => { const s = document.createElement('span'); s.textContent = `${w.damage || a.damage || '?'} ${w.damageType || a.damageType || ''}`.trim(); return s; })());
      if (w.properties || a.notes) {
        details.appendChild(d ? d.createElement('span', { className: 'attack-props', textContent: w.properties || a.notes }) : (() => { const s = document.createElement('span'); s.className = 'attack-props'; s.textContent = w.properties || a.notes; return s; })());
      }
      if (c.edition === '5.5e' && (w.mastery || a.mastery)) {
        const mast = w.mastery || a.mastery;
        details.appendChild(d ? d.createElement('span', { className: 'attack-mastery', title: getMasteryDescription(mast), textContent: `Mastery: ${mast}` }) : (() => { const s = document.createElement('span'); s.className = 'attack-mastery'; s.title = getMasteryDescription(mast); s.textContent = `Mastery: ${mast}`; return s; })());
      }
      card.appendChild(details);
      const modRow = d ? d.createElement('div', { className: 'attack-mod-row' }) : (() => { const x = document.createElement('div'); x.className = 'attack-mod-row'; return x; })();
      modRow.appendChild(d ? d.createElement('label', { textContent: 'Modifier:' }) : (() => { const l = document.createElement('label'); l.textContent = 'Modifier:'; return l; })());
      const inp = d ? d.createElement('input', { type: 'number', className: 'attack-mod-input', dataset: { idx: String(i) }, placeholder: '+0', title: 'Bonus/penalty to hit (e.g. +2 magic weapon)' }) : (() => { const n = document.createElement('input'); n.type = 'number'; n.className = 'attack-mod-input'; n.dataset.idx = String(i); n.placeholder = '+0'; n.title = 'Bonus/penalty to hit (e.g. +2 magic weapon)'; return n; })();
      if (a.toHitModifier != null && a.toHitModifier !== '') inp.value = String(a.toHitModifier);
      modRow.appendChild(inp);
      card.appendChild(modRow);
      card.appendChild(d ? d.createElement('button', { type: 'button', className: 'btn btn-sm btn-roll', dataset: { idx: String(i) }, textContent: 'Roll Attack' }) : (() => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-sm btn-roll'; b.dataset.idx = String(i); b.textContent = 'Roll Attack'; return b; })());
      listEl.appendChild(card);
    });
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
    const d = typeof DomUtils !== 'undefined' ? DomUtils : null;
    if (d && d.clearChildren) d.clearChildren(actionsEl);
    else actionsEl.replaceChildren();
    allActions.forEach(a => {
      actionsEl.appendChild(d ? d.createElement('span', { className: 'action-chip', textContent: a }) : (() => { const s = document.createElement('span'); s.className = 'action-chip'; s.textContent = a; return s; })());
    });
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

function updateConcentrationDisplay() {
  const el = document.getElementById('concentration-display');
  if (!el || !sessionCharacter) return;
  const spell = sessionCharacter.concentratingOn;
  const d = typeof DomUtils !== 'undefined' ? DomUtils : null;
  if (d && d.clearChildren) d.clearChildren(el);
  else el.replaceChildren();
  if (spell) {
    const wrap = d ? d.createElement('span', { className: 'concentration-active' }) : (() => { const s = document.createElement('span'); s.className = 'concentration-active'; return s; })();
    wrap.appendChild(document.createTextNode('Concentrating on '));
    const strong = document.createElement('strong');
    strong.textContent = spell;
    wrap.appendChild(strong);
    el.appendChild(wrap);
    el.appendChild(document.createTextNode(' '));
    const dropBtn = d ? d.createElement('button', { type: 'button', className: 'btn btn-sm btn-ghost', id: 'drop-concentration', textContent: 'Drop' }) : (() => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-sm btn-ghost'; b.id = 'drop-concentration'; b.textContent = 'Drop'; return b; })();
    el.appendChild(dropBtn);
    dropBtn.addEventListener('click', () => {
      sessionCharacter.concentratingOn = null;
      saveCharacters();
      updateConcentrationDisplay();
    });
  } else {
    el.appendChild(d ? d.createElement('span', { className: 'concentration-none', textContent: 'Not concentrating on any spell.' }) : (() => { const s = document.createElement('span'); s.className = 'concentration-none'; s.textContent = 'Not concentrating on any spell.'; return s; })());
  }
}

function renderSessionSpells() {
  const c = sessionCharacter;
  const totalLevel = getTotalLevel(c);
  const isCaster = typeof isSpellcastingClass === 'function'
    ? (isSpellcastingClass(c.class, c.subclass) || (c.multiclass || []).some(m => isSpellcastingClass(m.name, m.subclass)))
    : (typeof SPELLCASTING_CLASSES !== 'undefined' && (SPELLCASTING_CLASSES.includes(c.class) || (c.multiclass || []).some(m => SPELLCASTING_CLASSES.includes(m.name))));
  const slots = typeof getSpellSlotsForCharacter === 'function' ? getSpellSlotsForCharacter(c) : (typeof getSpellSlotsForLevel === 'function' ? getSpellSlotsForLevel(totalLevel, c.class) : [0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const used = c.spellSlotsUsed || [0, 0, 0, 0, 0, 0, 0, 0, 0];

  const spellAttackDcEl = document.getElementById('spell-attack-dc');
  if (spellAttackDcEl && isCaster) {
    const ability = typeof getSpellcastingAbility === 'function' ? getSpellcastingAbility(c) : null;
    if (ability) {
      const profBonus = Math.floor(totalLevel / 4) + 2;
      const abilityMod = Math.floor(((c.stats?.[ability] || 10) - 10) / 2);
      const spellAttack = profBonus + abilityMod;
      const spellDC = 8 + profBonus + abilityMod;
      spellAttackDcEl.replaceChildren();
      spellAttackDcEl.append(
        Object.assign(document.createElement('span'), { className: 'spell-stat', textContent: `Spell Attack: ${spellAttack >= 0 ? '+' : ''}${spellAttack}` }),
        document.createTextNode(' '),
        Object.assign(document.createElement('span'), { className: 'spell-stat', textContent: `Spell Save DC: ${spellDC}` })
      );
      spellAttackDcEl.hidden = false;
    } else {
      spellAttackDcEl.hidden = true;
    }
  } else if (spellAttackDcEl) {
    spellAttackDcEl.hidden = true;
  }

  const grid = document.getElementById('spell-slots-grid');
  const dGrid = typeof DomUtils !== 'undefined' ? DomUtils : null;
  if (dGrid && dGrid.clearChildren) dGrid.clearChildren(grid);
  else grid.replaceChildren();
  if (!isCaster || slots.every(s => s === 0)) {
    grid.appendChild(dGrid ? dGrid.createElement('p', { className: 'muted', textContent: 'This class does not use spell slots.' }) : (() => { const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'This class does not use spell slots.'; return p; })());
  } else {
    slots.forEach((total, i) => {
      if (total === 0) return;
      const u = used[i] || 0;
      const left = total - u;
      const row = dGrid ? dGrid.createElement('div', { className: 'spell-slot-row' }) : (() => { const r = document.createElement('div'); r.className = 'spell-slot-row'; return r; })();
      row.appendChild(dGrid ? dGrid.createElement('span', { className: 'slot-level', textContent: `Level ${i + 1}` }) : (() => { const s = document.createElement('span'); s.className = 'slot-level'; s.textContent = `Level ${i + 1}`; return s; })());
      row.appendChild(dGrid ? dGrid.createElement('span', { className: 'slot-count', textContent: `${left}/${total}` }) : (() => { const s = document.createElement('span'); s.className = 'slot-count'; s.textContent = `${left}/${total}`; return s; })());
      row.appendChild(dGrid ? dGrid.createElement('button', { type: 'button', className: 'btn btn-sm btn-secondary use-slot', dataset: { level: String(i) }, textContent: 'Use' }) : (() => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-sm btn-secondary use-slot'; b.dataset.level = String(i); b.textContent = 'Use'; return b; })());
      grid.appendChild(row);
    });
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
  const d = typeof DomUtils !== 'undefined' ? DomUtils : null;
  if (d && d.clearChildren) d.clearChildren(knownList);
  else knownList.replaceChildren();
  const allSpells = typeof SPELLS !== 'undefined' ? SPELLS : [];
  const usedSlots = c.spellSlotsUsed || [0,0,0,0,0,0,0,0,0];
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
    const group = d ? d.createElement('div', { className: 'spell-level-group' }) : (() => { const g = document.createElement('div'); g.className = 'spell-level-group'; return g; })();
    group.appendChild(d ? d.createElement('h5', { textContent: label }) : (() => { const h = document.createElement('h5'); h.textContent = label; return h; })());
    const items = d ? d.createElement('div', { className: 'spell-level-items' }) : (() => { const x = document.createElement('div'); x.className = 'spell-level-items'; return x; })();
    group.appendChild(items);
    (byLevel[lvl] || []).forEach(({ name, spell }) => {
      const isCantrip = lvl === 0;
      const span = d ? d.createElement('span', { className: 'array-item spell-item' }) : (() => { const s = document.createElement('span'); s.className = 'array-item spell-item'; return s; })();
      const spellDesc = spell?.description ? String(spell.description).slice(0, 200) + (spell.description.length > 200 ? '…' : '') + ' View full in Quick Reference.' : 'View full in Quick Reference.';
      const nameClick = d
        ? d.createElement('span', { className: 'spell-name-clickable', dataset: { name }, role: 'button', tabindex: '0', title: spellDesc, textContent: name })
        : (() => { const s = document.createElement('span'); s.className = 'spell-name-clickable'; s.dataset.name = name; s.setAttribute('role', 'button'); s.setAttribute('tabindex', '0'); s.title = spellDesc; s.textContent = name; return s; })();
      span.appendChild(nameClick);
      span.appendChild(document.createTextNode(' '));
      if (isCantrip) {
        span.appendChild(d ? d.createElement('span', { className: 'cantrip-badge', textContent: 'Cantrip' }) : (() => { const s = document.createElement('span'); s.className = 'cantrip-badge'; s.textContent = 'Cantrip'; return s; })());
      } else {
        span.appendChild(document.createTextNode(`(Lv${lvl})`));
      }
      span.appendChild(document.createTextNode(' '));
      span.appendChild(d ? d.createElement('button', { type: 'button', className: 'btn btn-sm btn-ghost spell-view-btn', dataset: { name }, title: 'View spell', textContent: 'View' }) : (() => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-sm btn-ghost spell-view-btn'; b.dataset.name = name; b.title = 'View spell'; b.textContent = 'View'; return b; })());
      if (isCantrip) {
        span.appendChild(document.createTextNode(' '));
        span.appendChild(d ? d.createElement('button', { type: 'button', className: 'btn btn-sm btn-secondary cast-spell cast-cantrip', dataset: { name, level: '0' }, textContent: 'Cast' }) : (() => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-sm btn-secondary cast-spell cast-cantrip'; b.dataset.name = name; b.dataset.level = '0'; b.textContent = 'Cast'; return b; })());
      } else {
        const slotOptions = [];
        for (let s = lvl - 1; s <= 8; s++) {
          const slotTotal = slots[s] || 0;
          const slotLeft = slotTotal - (usedSlots[s] || 0);
          if (slotTotal > 0 && slotLeft > 0) {
            const n = s + 1;
            const ord = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th';
            slotOptions.push({ value: String(s), label: `${n}${ord}` });
          }
        }
        if (slotOptions.length) {
          span.appendChild(document.createTextNode(' '));
          const sel = d ? d.createElement('select', { className: 'cast-slot-select', dataset: { name }, title: 'Slot level' }) : (() => { const s = document.createElement('select'); s.className = 'cast-slot-select'; s.dataset.name = name; s.title = 'Slot level'; return s; })();
          if (typeof AppRenderers !== 'undefined' && AppRenderers.setSelectOptions) AppRenderers.setSelectOptions(sel, slotOptions);
          span.appendChild(sel);
          span.appendChild(document.createTextNode(' '));
          span.appendChild(d ? d.createElement('button', { type: 'button', className: 'btn btn-sm btn-secondary cast-spell', dataset: { name, level: String(lvl) }, textContent: 'Cast' }) : (() => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-sm btn-secondary cast-spell'; b.dataset.name = name; b.dataset.level = String(lvl); b.textContent = 'Cast'; return b; })());
        }
      }
      span.appendChild(document.createTextNode(' '));
      span.appendChild(d ? d.createElement('button', { type: 'button', className: 'remove-item', dataset: { name }, textContent: '×' }) : (() => { const b = document.createElement('button'); b.type = 'button'; b.className = 'remove-item'; b.dataset.name = name; b.textContent = '×'; return b; })());
      items.appendChild(span);
    });
    knownList.appendChild(group);
  });
  const showSpellPreview = (spellName) => {
    if (!spellName || typeof SPELLS === 'undefined') return;
    const spell = SPELLS.find(s => s.name === spellName);
    const sessionPreview = document.getElementById('spell-session-preview');
    if (spell && sessionPreview && typeof AppRenderers !== 'undefined' && AppRenderers.mountSpellPreview) {
      AppRenderers.mountSpellPreview(sessionPreview, spell, { schoolFallback: spell.school || '' });
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
      const spell = (typeof SPELLS !== 'undefined' ? SPELLS : []).find(s => s.name === spellName);
      const isConcentration = spell && (spell.duration || '').toLowerCase().includes('concentration');
      if (isConcentration) {
        sessionCharacter.concentratingOn = spellName;
        saveCharacters();
        updateConcentrationDisplay();
      }
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
    const edition = c?.edition || (typeof getActiveEdition === 'function' ? getActiveEdition() : '5e');
    const classSpells = typeof getSpellsForClass === 'function' ? getSpellsForClass(c.class, c.subclass, edition) : SPELLS;
    const datalist = document.getElementById('spells-datalist');
    if (datalist) if (typeof AppRenderers !== 'undefined' && AppRenderers.setSelectOptions) AppRenderers.setSelectOptions(datalist, classSpells.map(s => ({ value: s.name, label: s.name })));
    const spellSel = document.getElementById('known-spell-select');
    const sessionPreview = document.getElementById('spell-session-preview');
    if (spellSel) {
      const knownSet = new Set(c.knownSpells || []);
      const available = classSpells.filter(s => !knownSet.has(s.name));
      if (typeof AppRenderers !== 'undefined' && AppRenderers.setSelectOptions) AppRenderers.setSelectOptions(spellSel, [{ value: '', label: '— Add spell —' }, ...available.map(s => ({ value: s.name, label: `${s.name} (${s.level === 0 ? 'Cantrip' : 'Lv' + s.level})` }))]);
      const showSessionSpellPreview = (spellName) => {
        if (!sessionPreview) return;
        const spell = classSpells.find(s => s.name === spellName);
        if (!spell) { sessionPreview.replaceChildren(); sessionPreview.hidden = true; return; }
        if (typeof AppRenderers !== 'undefined' && AppRenderers.mountSpellPreview) {
          AppRenderers.mountSpellPreview(sessionPreview, spell, { includeHigherLevel: false });
        }
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

  updateConcentrationDisplay();

  const searchEl = document.getElementById('spell-search');
  if (searchEl) {
    searchEl.oninput = () => {
      const q = searchEl.value.trim().toLowerCase();
      const results = document.getElementById('spell-lookup-results');
      if (!q || typeof SPELLS === 'undefined') {
        results.replaceChildren();
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
      const dR = typeof DomUtils !== 'undefined' ? DomUtils : null;
      if (dR && dR.clearChildren) dR.clearChildren(results);
      else results.replaceChildren();
      if (!matches.length) {
        results.appendChild(dR ? dR.createElement('p', { className: 'spell-lookup-empty', textContent: 'No spells matched — try part of the name, a school, or a word from the description.' }) : (() => { const p = document.createElement('p'); p.className = 'spell-lookup-empty'; p.textContent = 'No spells matched — try part of the name, a school, or a word from the description.'; return p; })());
      } else if (typeof AppRenderers !== 'undefined' && AppRenderers.buildSpellDetailCard) {
        matches.forEach(s => results.appendChild(AppRenderers.buildSpellDetailCard(s, { variant: 'lookup' })));
      }
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
    if (typeof AppRenderers !== 'undefined' && AppRenderers.setSelectOptions) {
      AppRenderers.setSelectOptions(sel, [{ value: '', label: '— Choose item —' }, ...items.map(x => ({ value: x, label: x }))]);
    }
  }

  const invContainer = document.getElementById('inventory-list');
  if (invContainer) {
  const dInv = typeof DomUtils !== 'undefined' ? DomUtils : null;
  if (dInv && dInv.clearChildren) dInv.clearChildren(invContainer);
  else invContainer.replaceChildren();
  (sessionCharacter.inventory || []).forEach((item, i) => {
    const span = dInv ? dInv.createElement('span', { className: 'array-item' }) : (() => { const s = document.createElement('span'); s.className = 'array-item'; return s; })();
    span.appendChild(document.createTextNode(item + ' '));
    span.appendChild(dInv ? dInv.createElement('button', { type: 'button', className: 'remove-item', dataset: { idx: String(i) }, textContent: '×' }) : (() => { const b = document.createElement('button'); b.type = 'button'; b.className = 'remove-item'; b.dataset.idx = String(i); b.textContent = '×'; return b; })());
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

/** Get all feats for the active edition (FEATS + FEATS_2024 when 5.5e + homebrew) */
function getFeatsForEdition(edition) {
  const ed = edition || (typeof getActiveEdition === 'function' ? getActiveEdition() : '5e');
  const base = typeof FEATS !== 'undefined' ? FEATS : [];
  const extra = (ed === '5.5e' && typeof FEATS_2024 !== 'undefined') ? FEATS_2024 : [];
  const homebrew = (typeof getHomebrewContent === 'function' ? getHomebrewContent() : {}).feats || [];
  const byName = {};
  [...base, ...extra, ...homebrew].forEach(f => { if (f && f.name && !byName[f.name]) byName[f.name] = f; });
  return Object.values(byName);
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
    const stats = c.stats || {};
    const statNames = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
    const statLabel = (key) => {
      const val = stats[key] || 10;
      const mod = Math.floor((val - 10) / 2);
      const sign = mod >= 0 ? '+' : '';
      return `${key.charAt(0).toUpperCase() + key.slice(1)} (${val}, ${sign}${mod})`;
    };
    const statOpts = statNames.map(k => ({ value: k, label: statLabel(k) }));
    ['asi-dual-1', 'asi-dual-2', 'asi-single-select'].forEach(id => {
      const sel = document.getElementById(id);
      if (sel && typeof AppRenderers !== 'undefined' && AppRenderers.setSelectOptions) {
        AppRenderers.setSelectOptions(sel, statOpts, { selected: 'strength' });
      }
    });
    const asiModeAsi = document.querySelector('input[name="asi-mode"][value="asi"]');
    const asiModeFeat = document.querySelector('input[name="asi-mode"][value="feat"]');
    if (asiModeAsi) asiModeAsi.checked = true;
    document.querySelector('input[name="asi-sub-mode"][value="dual"]').checked = true;
    const asiSubOpts = document.getElementById('level-up-asi-picker')?.querySelector('.level-up-asi-sub-options');
    if (asiSubOpts) asiSubOpts.hidden = false;
    document.getElementById('level-up-asi-single').hidden = true;
    document.getElementById('level-up-asi-dual').hidden = false;
    document.getElementById('level-up-feat-picker').hidden = true;

    const edition = c.edition || (typeof getActiveEdition === 'function' ? getActiveEdition() : '5e');
    const feats = getFeatsForEdition(edition);
    const isSpellcaster = typeof isSpellcastingClass === 'function' ? isSpellcastingClass(c.class, c.subclass) : (typeof SPELLCASTING_CLASSES !== 'undefined' && SPELLCASTING_CLASSES.includes(c.class));
    const featSelect = document.getElementById('level-up-feat-select');
    const featDesc = document.getElementById('level-up-feat-desc');
    const featSearch = document.getElementById('level-up-feat-search');
    if (featSelect) {
      const populateFeats = (filter) => {
        const q = (filter || '').toLowerCase().trim();
        const filtered = feats.filter(f => !q || f.name.toLowerCase().includes(q));
        const canTake = (f) => {
          if (f.prerequisite?.toLowerCase().includes('spellcasting') || f.prerequisite?.toLowerCase().includes('pact magic')) return isSpellcaster;
          if (f.prerequisite) return true;
          return true;
        };
        if (typeof AppRenderers !== 'undefined' && AppRenderers.setSelectOptions) {
          AppRenderers.setSelectOptions(featSelect, [
            { value: '', label: '— Choose a feat —' },
            ...filtered.filter(canTake).map(f => ({
              value: f.name,
              label: f.name + (f.prerequisite ? ` (${f.prerequisite})` : '')
            }))
          ]);
        }
      };
      populateFeats(featSearch?.value || '');
      if (featSearch) featSearch.oninput = () => populateFeats(featSearch.value);
      featSelect.onchange = () => {
        const val = featSelect.value;
        const f = feats.find(x => x.name === val);
        featDesc.textContent = f ? f.description : '';
      };
    }
  }

  if (hasProfs && bonusProfs) {
    const desc = document.getElementById('level-up-profs-desc');
    if (bonusProfs.type === 'skills' && bonusProfs.count) {
      desc.textContent = `Choose ${bonusProfs.count} additional skill(s).`;
      const currentSkills = new Set(c.skills || []);
      const options = (typeof SKILLS !== 'undefined' ? SKILLS : []).filter(s => !currentSkills.has(s));
      const dP = typeof DomUtils !== 'undefined' ? DomUtils : null;
      if (dP && dP.clearChildren) dP.clearChildren(profsPicker);
      else profsPicker.replaceChildren();
      for (let i = 0; i < bonusProfs.count; i++) {
        const fg = dP ? dP.createElement('div', { className: 'form-group' }) : (() => { const g = document.createElement('div'); g.className = 'form-group'; return g; })();
        fg.appendChild(dP ? dP.createElement('label', { textContent: `Skill ${i + 1}:` }) : (() => { const l = document.createElement('label'); l.textContent = `Skill ${i + 1}:`; return l; })());
        const sel = dP ? dP.createElement('select', { className: 'level-up-skill-select', dataset: { idx: String(i) } }) : (() => { const s = document.createElement('select'); s.className = 'level-up-skill-select'; s.dataset.idx = String(i); return s; })();
        if (typeof AppRenderers !== 'undefined' && AppRenderers.setSelectOptions) {
          AppRenderers.setSelectOptions(sel, [{ value: '', label: '— Choose —' }, ...options.map(s => ({ value: s, label: s }))]);
        }
        fg.appendChild(sel);
        profsPicker.appendChild(fg);
      }
    } else if (bonusProfs.items && bonusProfs.items.length) {
      desc.textContent = `You gain proficiency with: ${bonusProfs.items.join(', ')}.`;
      const dP = typeof DomUtils !== 'undefined' ? DomUtils : null;
      if (dP && dP.clearChildren) dP.clearChildren(profsPicker);
      else profsPicker.replaceChildren();
      profsPicker.appendChild(dP ? dP.createElement('p', { className: 'muted', textContent: 'These will be added automatically.' }) : (() => { const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'These will be added automatically.'; return p; })());
    } else {
      const dP = typeof DomUtils !== 'undefined' ? DomUtils : null;
      if (dP && dP.clearChildren) dP.clearChildren(profsPicker);
      else profsPicker.replaceChildren();
    }
  }

  const levelUpErr = document.getElementById('level-up-validation-error');
  const setLevelUpError = (msg) => {
    if (levelUpErr) { levelUpErr.textContent = msg || ''; levelUpErr.hidden = !msg; }
  };

  const closeModal = () => {
    setLevelUpError('');
    if (typeof ModalA11y !== 'undefined' && ModalA11y.closeModal) ModalA11y.closeModal(modal);
    else modal.hidden = true;
  };

  const doConfirm = () => {
    setLevelUpError('');
    const choices = {};
    if (hasAsi) {
      const mode = document.querySelector('input[name="asi-mode"]:checked')?.value || 'asi';
      if (mode === 'feat') {
        const featVal = document.getElementById('level-up-feat-select')?.value?.trim();
        if (!featVal) {
          setLevelUpError('Please select a feat.');
          return;
        }
        choices.feat = featVal;
      } else {
        const subMode = document.querySelector('input[name="asi-sub-mode"]:checked')?.value || 'dual';
        if (subMode === 'single') {
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
          setLevelUpError('Please select ability score(s) to improve.');
          return;
        }
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
          setLevelUpError(`Please choose ${bonusProfs.count} skill(s).`);
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
      const isFeat = r.value === 'feat';
      const asiSubOpts = document.getElementById('level-up-asi-picker')?.querySelector('.level-up-asi-sub-options');
      const featPicker = document.getElementById('level-up-feat-picker');
      const single = document.getElementById('level-up-asi-single');
      const dual = document.getElementById('level-up-asi-dual');
      if (isFeat) {
        if (asiSubOpts) asiSubOpts.hidden = true;
        if (single) single.hidden = true;
        if (dual) dual.hidden = true;
        if (featPicker) featPicker.hidden = false;
      } else {
        if (asiSubOpts) asiSubOpts.hidden = false;
        if (featPicker) featPicker.hidden = true;
        const subMode = document.querySelector('input[name="asi-sub-mode"]:checked')?.value || 'dual';
        if (single) single.hidden = subMode !== 'single';
        if (dual) dual.hidden = subMode !== 'dual';
      }
    };
  });
  document.querySelectorAll('input[name="asi-sub-mode"]').forEach(r => {
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

  if (typeof ModalA11y !== 'undefined' && ModalA11y.openModal) ModalA11y.openModal(modal, { focusTarget: '#level-up-modal-body' });
  else modal.hidden = false;
}

function applyLevelUpChoices(c, choices) {
  if (!c || !choices) return;
  if (choices.feat) {
    if (!c.feats) c.feats = [];
    c.feats.push(choices.feat);
  }
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
    renderSessionOverview();
    renderSessionCombat();
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
      if (typeof AppRenderers !== 'undefined' && AppRenderers.setSelectOptions) AppRenderers.setSelectOptions(swapOut, [{ value: '', label: '— Remove spell —' }, ...((c.knownSpells || []).map(s => ({ value: s, label: s })))]);
      const edition = c?.edition || (typeof getActiveEdition === 'function' ? getActiveEdition() : '5e');
      const classSpells = typeof getSpellsForClass === 'function' ? getSpellsForClass(c.class, c.subclass, edition) : SPELLS;
      const knownSet = new Set(c.knownSpells || []);
      const available = classSpells.filter(s => !knownSet.has(s.name)).map(s => s.name);
      if (typeof AppRenderers !== 'undefined' && AppRenderers.setSelectOptions) AppRenderers.setSelectOptions(swapIn, [{ value: '', label: '— Add spell —' }, ...available.map(s => ({ value: s, label: s }))]);
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

  const activeEdition = typeof getActiveEdition === 'function' ? getActiveEdition() : '5e';
  const enabledRulesets = typeof getEnabledRulesets === 'function' ? getEnabledRulesets() : ['phb'];
  const enabledAdditional = typeof getEnabledAdditionalBooks === 'function' ? getEnabledAdditionalBooks() : [];
  const allRulesets = typeof RULESETS !== 'undefined' ? Object.values(RULESETS) : [];
  const allAdditionalBooks = typeof ADDITIONAL_BOOKS !== 'undefined' ? ADDITIONAL_BOOKS : [];

  const rulesets = allRulesets.filter(rs => (rs.edition || '5e') === activeEdition);
  const additionalBooks = allAdditionalBooks.filter(b => (b.edition || '5e') === activeEdition);

  const hasRulesetForEdition = enabledRulesets.some(id => rulesets.some(r => r.id === id));
  const defaultRuleset = rulesets[0]?.id || (activeEdition === '5.5e' ? 'phb2024' : 'phb');

  const dRb = typeof DomUtils !== 'undefined' ? DomUtils : null;
  if (dRb && dRb.clearChildren) dRb.clearChildren(optionsEl);
  else optionsEl.replaceChildren();
  if (rulesets.length) {
    const group = dRb ? dRb.createElement('div', { className: 'rule-books-group' }) : (() => { const g = document.createElement('div'); g.className = 'rule-books-group'; return g; })();
    group.appendChild(dRb ? dRb.createElement('h4', { textContent: `Core Rules (${activeEdition === '5.5e' ? '2024' : '2014'})` }) : (() => { const h = document.createElement('h4'); h.textContent = `Core Rules (${activeEdition === '5.5e' ? '2024' : '2014'})`; return h; })());
    rulesets.forEach(rs => {
      const checked = hasRulesetForEdition ? enabledRulesets.includes(rs.id) : rs.id === defaultRuleset;
      const label = dRb ? dRb.createElement('label', { className: `ruleset-option${checked ? ' selected' : ''}` }) : (() => { const l = document.createElement('label'); l.className = `ruleset-option${checked ? ' selected' : ''}`; return l; })();
      const inp = dRb ? dRb.createElement('input', { type: 'checkbox', name: 'rule-books-ruleset', value: rs.id }) : (() => { const i = document.createElement('input'); i.type = 'checkbox'; i.name = 'rule-books-ruleset'; i.value = rs.id; return i; })();
      inp.checked = checked;
      label.appendChild(inp);
      label.appendChild(dRb ? dRb.createElement('span', { className: 'ruleset-name', textContent: rs.name }) : (() => { const s = document.createElement('span'); s.className = 'ruleset-name'; s.textContent = rs.name; return s; })());
      if (rs.edition) {
        label.appendChild(dRb ? dRb.createElement('span', { className: 'ruleset-edition-badge', textContent: rs.edition === '5.5e' ? '2024' : '2014' }) : (() => { const s = document.createElement('span'); s.className = 'ruleset-edition-badge'; s.textContent = rs.edition === '5.5e' ? '2024' : '2014'; return s; })());
      }
      group.appendChild(label);
    });
    optionsEl.appendChild(group);
  }
  if (additionalBooks.length) {
    const group = dRb ? dRb.createElement('div', { className: 'rule-books-group' }) : (() => { const g = document.createElement('div'); g.className = 'rule-books-group'; return g; })();
    group.appendChild(dRb ? dRb.createElement('h4', { textContent: `Additional Books (${activeEdition === '5.5e' ? '2024' : '2014'})` }) : (() => { const h = document.createElement('h4'); h.textContent = `Additional Books (${activeEdition === '5.5e' ? '2024' : '2014'})`; return h; })());
    additionalBooks.forEach(b => {
      const checked = enabledAdditional.includes(b.id);
      const label = dRb ? dRb.createElement('label', { className: `ruleset-option${checked ? ' selected' : ''}` }) : (() => { const l = document.createElement('label'); l.className = `ruleset-option${checked ? ' selected' : ''}`; return l; })();
      const inp = dRb ? dRb.createElement('input', { type: 'checkbox', name: 'rule-books-additional', value: b.id }) : (() => { const i = document.createElement('input'); i.type = 'checkbox'; i.name = 'rule-books-additional'; i.value = b.id; return i; })();
      inp.checked = checked;
      label.appendChild(inp);
      label.appendChild(dRb ? dRb.createElement('span', { className: 'ruleset-name', textContent: b.name }) : (() => { const s = document.createElement('span'); s.className = 'ruleset-name'; s.textContent = b.name; return s; })());
      const ed = b.edition === '5.5e' ? '2024' : '2014';
      label.appendChild(dRb ? dRb.createElement('span', { className: 'ruleset-edition-badge', textContent: ed }) : (() => { const s = document.createElement('span'); s.className = 'ruleset-edition-badge'; s.textContent = ed; return s; })());
      group.appendChild(label);
    });
    optionsEl.appendChild(group);
  }
  if (!rulesets.length && !additionalBooks.length) {
    optionsEl.appendChild(dRb ? dRb.createElement('p', { className: 'rules-desc', textContent: `No rule books available for ${activeEdition === '5.5e' ? '2024' : '2014'} rules. Switch edition with the header toggle.` }) : (() => { const p = document.createElement('p'); p.className = 'rules-desc'; p.textContent = `No rule books available for ${activeEdition === '5.5e' ? '2024' : '2014'} rules. Switch edition with the header toggle.`; return p; })());
  } else if (!optionsEl.childNodes.length) {
    optionsEl.appendChild(dRb ? dRb.createElement('p', { textContent: 'No books configured.' }) : (() => { const p = document.createElement('p'); p.textContent = 'No books configured.'; return p; })());
  }

  const updateInfo = () => {
    const rulesetChecked = Array.from(document.querySelectorAll('input[name="rule-books-ruleset"]:checked')).map(x => x.value);
    const additionalChecked = Array.from(document.querySelectorAll('input[name="rule-books-additional"]:checked')).map(x => x.value);
    const enabledList = rulesets.filter(r => rulesetChecked.includes(r.id));
    const addList = additionalBooks.filter(b => additionalChecked.includes(b.id));
    if (infoEl) {
      if (dRb && dRb.clearChildren) dRb.clearChildren(infoEl);
      else infoEl.replaceChildren();
      if (!enabledList.length && !addList.length) {
        infoEl.appendChild(dRb ? dRb.createElement('p', { textContent: 'Select at least one rule book.' }) : (() => { const p = document.createElement('p'); p.textContent = 'Select at least one rule book.'; return p; })());
      } else {
        enabledList.forEach(rs => {
          const p = document.createElement('p');
          if (rs.link) {
            const a = document.createElement('a');
            a.href = rs.link;
            a.target = '_blank';
            a.rel = 'noopener';
            a.textContent = rs.name;
            p.appendChild(a);
            p.appendChild(document.createTextNode(': ' + (rs.description || '')));
          } else {
            const strong = document.createElement('strong');
            strong.textContent = rs.name;
            p.appendChild(strong);
            p.appendChild(document.createTextNode(': ' + (rs.description || '')));
          }
          infoEl.appendChild(p);
        });
        addList.forEach(b => {
          const p = document.createElement('p');
          const strong = document.createElement('strong');
          strong.textContent = b.name;
          p.appendChild(strong);
          infoEl.appendChild(p);
        });
      }
    }
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
  const dmPanel = document.getElementById('dm-panel');
  if (dmPanel) dmPanel.hidden = true;
  const mainPlayer = document.getElementById('main-player-content');
  if (mainPlayer) mainPlayer.hidden = false;
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

  if (listView) listView.hidden = true;
  if (sessionView) sessionView.hidden = true;
  if (battleMapView) battleMapView.hidden = true;
  builderView.hidden = false;
  document.body.classList.remove('battle-map-active');

  const builderEditionEl = document.getElementById('builder-edition-badge');
  if (builderEditionEl) {
    const ed = (currentChar.edition === '5.5e') ? '2024' : '5e';
    builderEditionEl.textContent = char ? ed : `Creating for ${ed}`;
    builderEditionEl.title = ed === '2024' ? '2024 Rules (5.5e)' : '2014 Rules (5e)';
    builderEditionEl.hidden = false;
  }

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
    renderArrayList('skills-list', char.skills, 'skills', (skill) => {
      const src = typeof getSkillSource === 'function' ? getSkillSource(skill, currentChar) : null;
      if (!src) return document.createTextNode(skill);
      const wrap = document.createElement('span');
      wrap.appendChild(document.createTextNode(skill + ' '));
      const srcSpan = document.createElement('span');
      srcSpan.className = 'skill-source';
      srcSpan.textContent = `(${src})`;
      wrap.appendChild(srcSpan);
      return wrap;
    });
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
    characterGrid.replaceChildren();
    return;
  }
  if (emptyState) emptyState.classList.add('hidden');
  characterGrid.classList.remove('empty');
  if (typeof AppRenderers !== 'undefined' && AppRenderers.renderCharacterCards) {
    AppRenderers.renderCharacterCards(characterGrid, characters, {
      onPlay: (c) => showSessionView(c),
      onEdit: (c) => showBuilderView(c),
      onDuplicate: (orig) => {
        const copy = JSON.parse(JSON.stringify(orig));
        copy.id = Date.now().toString() + Math.random().toString(36).slice(2);
        copy.name = (orig.name || 'Unnamed') + ' (Copy)';
        migrateCharacter(copy);
        characters.push(copy);
        saveCharacters();
        renderCharacterList();
      },
      onDelete: (charToDelete) => {
        showConfirmModal('Delete Character', 'Delete this character? This cannot be undone.', 'Delete').then(ok => {
          if (ok) {
            characters = characters.filter(c => c.id !== charToDelete.id);
            saveCharacters();
            renderCharacterList();
          }
        });
      }
    });
  }
  if (typeof updateUndoButtonVisibility === 'function') updateUndoButtonVisibility();
}

function saveCharacter() {
  clearValidationErrors();
  currentChar.name = document.getElementById('char-name')?.value?.trim() || currentChar.name;
  syncDetailsFromForm();
  if (!currentChar.name) {
    showValidationError(10, 'Please enter a character name.');
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
