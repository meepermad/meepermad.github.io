/**
 * D&D Character Builder - Application logic (main orchestrator)
 * Handles: character CRUD, wizard flow, session view, combat, spells, leveling, DM tools, battle map
 *
 * Modular pieces (load before this file):
 *   app-utils, app-export, app-quick-ref, app-combat, app-state, app-persistence,
 *   app-char-helpers, app-ability-scores, app-wizard, app-step-renderers,
 *   app-array-helpers, app-preview
 *
 * @depends data.js, monsters.js, spells.js, items.js, app-*.js modules
 */

// Character building, ability scores, wizard, step renderers, array helpers, preview
// are in: app-char-helpers.js, app-ability-scores.js, app-wizard.js, app-step-renderers.js,
// app-array-helpers.js, app-preview.js

// ========== VIEW SWITCHING ==========
// showListView, showSessionView, showBuilderView, showBattleMapView - switch between main app views

/** Switch to character list view; hide builder, session, and battle map */
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
  if (mainPlayer) mainPlayer.hidden = false;
  if (dmPanel) dmPanel.hidden = true;
  listView.style.display = 'none';
  builderView.hidden = true;
  sessionView.hidden = false;
  battleMapView.hidden = true;

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

let designerModeActive = false;
const SECTION_LABELS = {
  saves: 'Saving Throws', 'ability-checks': 'Ability Checks', about: 'About',
  senses: 'Senses', skills: 'Skills', defenses: 'Defenses',
  conditions: 'Conditions', features: 'Features'
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
        controls.innerHTML = `<select class="designer-size-select" data-section="${id}" title="Section display mode">
          <option value="full" ${current === 'full' ? 'selected' : ''}>Full</option>
          <option value="compact" ${current === 'compact' ? 'selected' : ''}>Compact</option>
          <option value="half" ${current === 'half' ? 'selected' : ''}>Half</option>
        </select>`;
        controls.querySelector('select').onchange = (e) => {
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
  const initModStr = dexMod >= 0 ? `+${dexMod}` : `${dexMod}`;

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
  if (qsInitTotal) qsInitTotal.textContent = c.initiative != null ? String(c.initiative) : '—';
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
    return `<div class="stat-display-item stat-rollable stat-row-clickable ${savesDisadv ? 'has-disadvantage' : ''}" title="${esc(breakdownTip)} — click to roll save" data-ability="${stat}" role="button" tabindex="0"><div class="stat-main-row"><div class="stat-name">${label}</div><div class="stat-nums stat-nums--save"><div class="stat-num-block"><span class="stat-num-label">Save</span><span class="stat-save-total">${totalStr}</span></div></div>${disadvBadge}</div></div>`;
  }).join('');
  const savesEl = document.getElementById('session-saves-display');
  if (savesEl) {
    savesEl.innerHTML = savesHtml;
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
  const statsHtml = Object.entries(c.stats || {}).map(([stat, val]) => {
    const bd = getStatBreakdown(c, stat);
    const modStr = bd.mod >= 0 ? `+${bd.mod}` : `${bd.mod}`;
    const label = statNames[stat] || stat.slice(0, 3).toUpperCase();
    const breakdownTip = bd.parts.join(' = ') + ` → Mod ${bd.mod >= 0 ? '+' : ''}${bd.mod}` + (abilityDisadv ? ' (disadvantage)' : '');
    const disadvBadge = abilityDisadv ? '<span class="debuff-badge" title="Ability checks at disadvantage">dis adv</span>' : '';
    return `<div class="stat-display-item stat-rollable stat-with-breakdown stat-row-clickable ${abilityDisadv ? 'has-disadvantage' : ''}" title="${esc(breakdownTip)} — click to roll check" data-ability="${stat}" role="button" tabindex="0"><div class="stat-main-row"><div class="stat-name">${label}</div><div class="stat-nums stat-nums--ability"><div class="stat-num-block"><span class="stat-num-label">Score</span><span class="stat-score">${val}</span></div><div class="stat-num-block"><span class="stat-num-label">Mod</span><span class="stat-mod">${modStr}</span></div></div>${disadvBadge}</div><div class="stat-breakdown">${esc(bd.parts.join(' = '))}</div></div>`;
  }).join('');
  const statsEl = document.getElementById('session-stats-display');
  if (statsEl) {
    statsEl.innerHTML = statsHtml;
    statsEl.querySelectorAll('.stat-row-clickable').forEach(row => {
      const ab = row.dataset.ability;
      const go = () => {
        const debuff = getDebuffEffects(c);
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
      const source = isProf && typeof getSkillSource === 'function' ? getSkillSource(skill, c) : null;
      const title = source ? `${skill}: ${totalStr} (${source})` : `${skill}: ${totalStr}${isProf ? ' (proficient)' : ''}`;
      const sourceLabel = source ? ` <span class="skill-source">(${source})</span>` : '';
      return `<span class="skill-item ${isProf ? 'proficient' : ''}" title="${esc(title)}">${skill} ${totalStr}${sourceLabel}</span>`;
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
    const traitDescs = typeof RACIAL_TRAIT_DESCRIPTIONS !== 'undefined' ? RACIAL_TRAIT_DESCRIPTIONS : {};
    const raceTraits = (race?.traits || []).map(t => {
      const desc = traitDescs[t];
      if (desc) return `<span class="feature-item feature-has-desc" title="${esc(desc)}">${esc(t)} <span class="feature-info">ⓘ</span></span>`;
      return `<span class="feature-item">${esc(t)}</span>`;
    });
    let classFeatures = [];
    if (featuresByLevel) {
      for (let lvl = 1; lvl <= totalLevel; lvl++) {
        const feat = featuresByLevel[lvl];
        if (feat) classFeatures.push(`<span class="feature-item" title="${esc(feat)}"><strong>Lvl ${lvl}:</strong> ${esc(feat)}</span>`);
      }
    }
    let subFeatures = [];
    if (subclassFeatures) {
      for (let lvl = 1; lvl <= totalLevel; lvl++) {
        const feat = subclassFeatures[lvl];
        if (feat) subFeatures.push(`<span class="feature-item feature-item-subclass" title="${esc(feat)}"><strong>Lvl ${lvl} (${esc(c.subclass || '')}):</strong> ${esc(feat)}</span>`);
      }
    }
    const featItems = (c.feats || []).map(f => `<span class="feature-item" title="View full in Quick Reference."><strong>Feat:</strong> ${esc(f)}</span>`);
    const all = [...featItems, ...raceTraits, ...classFeatures, ...subFeatures];
    featuresEl.innerHTML = all.length ? all.join('') : '<span class="list-item muted">None</span>';
  }
}

/** Show dice roll overlay with d20 animation; supports ability checks, saves, initiative */
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
  const modEl = document.getElementById('combat-init-mod');
  const totalEl = document.getElementById('combat-init-total');
  const detailEl = document.getElementById('combat-init-detail');
  if (modEl) modEl.textContent = (dexMod >= 0 ? '+' : '') + dexMod;
  if (totalEl) totalEl.textContent = c.initiative != null ? String(c.initiative) : '—';
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
    if (typeof AppRenderers !== 'undefined' && AppRenderers.setSelectOptions) AppRenderers.setSelectOptions(weaponSel, [{ value: '', label: '— Add weapon —' }, ...weapons.map(w => ({ value: w.name, label: `${w.name} (${w.damage} ${w.damageType})` }))]);
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
            ${(c.edition === '5.5e' && (w.mastery || a.mastery)) ? `<span class="attack-mastery" title="${getMasteryDescription(w.mastery || a.mastery)}">Mastery: ${w.mastery || a.mastery}</span>` : ''}
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

function updateConcentrationDisplay() {
  const el = document.getElementById('concentration-display');
  if (!el || !sessionCharacter) return;
  const spell = sessionCharacter.concentratingOn;
  if (spell) {
    el.innerHTML = `<span class="concentration-active">Concentrating on <strong>${esc(spell)}</strong></span> <button type="button" class="btn btn-sm btn-ghost" id="drop-concentration">Drop</button>`;
    document.getElementById('drop-concentration')?.addEventListener('click', () => {
      sessionCharacter.concentratingOn = null;
      saveCharacters();
      updateConcentrationDisplay();
    });
  } else {
    el.innerHTML = '<span class="concentration-none">Not concentrating on any spell.</span>';
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
      spellAttackDcEl.innerHTML = `<span class="spell-stat">Spell Attack: ${spellAttack >= 0 ? '+' : ''}${spellAttack}</span> <span class="spell-stat">Spell Save DC: ${spellDC}</span>`;
      spellAttackDcEl.hidden = false;
    } else {
      spellAttackDcEl.hidden = true;
    }
  } else if (spellAttackDcEl) {
    spellAttackDcEl.hidden = true;
  }

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
      const spellDesc = spell?.description ? String(spell.description).slice(0, 200) + (spell.description.length > 200 ? '…' : '') + ' View full in Quick Reference.' : 'View full in Quick Reference.';
      const spellTitle = esc(spellDesc).replace(/"/g, '&quot;');
      const viewBtn = ` <button type="button" class="btn btn-sm btn-ghost spell-view-btn" data-name="${esc(name)}" title="View spell">View</button>`;
      span.innerHTML = `<span class="spell-name-clickable" data-name="${esc(name)}" role="button" tabindex="0" title="${spellTitle}">${esc(name)}</span> ${isCantrip ? '<span class="cantrip-badge">Cantrip</span>' : `(Lv${lvl})`}${viewBtn}${castHtml} <button type="button" class="remove-item" data-name="${esc(name)}">×</button>`;
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
      results.innerHTML = matches.length ? matches.map(s => {
        const higherNote = s.higherLevel ? `<p class="spell-preview-higher"><strong>At higher levels:</strong> ${esc(s.higherLevel)}</p>` : '';
        return `<div class="spell-card">
          <strong>${esc(s.name)}</strong> — ${s.level === 0 ? 'Cantrip' : `Level ${s.level}`} ${s.school || ''}
          <p class="spell-desc">${esc(s.description || '')}</p>
          ${higherNote}
          <small>${esc(s.castTime || '')} · ${esc(s.range || '')} · ${esc(s.duration || '')}</small>
        </div>`;
      }).join('') : '<p class="spell-lookup-empty">No spells matched — try part of the name, a school, or a word from the description.</p>';
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
    const optionsHtml = statNames.map(k => `<option value="${k}">${statLabel(k)}</option>`).join('');
    ['asi-dual-1', 'asi-dual-2', 'asi-single-select'].forEach(id => {
      const sel = document.getElementById(id);
      if (sel) {
        sel.innerHTML = optionsHtml;
        sel.value = 'strength';
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
        featSelect.innerHTML = '<option value="">— Choose a feat —</option>' + filtered.filter(canTake).map(f => `<option value="${esc(f.name)}">${esc(f.name)}${f.prerequisite ? ' (' + esc(f.prerequisite) + ')' : ''}</option>`).join('');
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

  let html = '';
  if (rulesets.length) {
    html += '<div class="rule-books-group"><h4>Core Rules (' + (activeEdition === '5.5e' ? '2024' : '2014') + ')</h4>';
    html += rulesets.map(rs => {
      const editionBadge = rs.edition ? `<span class="ruleset-edition-badge">${rs.edition === '5.5e' ? '2024' : '2014'}</span>` : '';
      const checked = hasRulesetForEdition ? enabledRulesets.includes(rs.id) : rs.id === defaultRuleset;
      return `<label class="ruleset-option ${checked ? 'selected' : ''}">
        <input type="checkbox" name="rule-books-ruleset" value="${rs.id}" ${checked ? 'checked' : ''}>
        <span class="ruleset-name">${rs.name}</span>${editionBadge}
      </label>`;
    }).join('') + '</div>';
  }
  if (additionalBooks.length) {
    html += '<div class="rule-books-group"><h4>Additional Books (' + (activeEdition === '5.5e' ? '2024' : '2014') + ')</h4>';
    html += additionalBooks.map(b => {
      const ed = b.edition === '5.5e' ? '2024' : '2014';
      const editionBadge = `<span class="ruleset-edition-badge">${ed}</span>`;
      return `<label class="ruleset-option ${enabledAdditional.includes(b.id) ? 'selected' : ''}">
        <input type="checkbox" name="rule-books-additional" value="${b.id}" ${enabledAdditional.includes(b.id) ? 'checked' : ''}>
        <span class="ruleset-name">${b.name}</span>${editionBadge}
      </label>`;
    }).join('') + '</div>';
  }
  if (!rulesets.length && !additionalBooks.length) {
    html = '<p class="rules-desc">No rule books available for ' + (activeEdition === '5.5e' ? '2024' : '2014') + ' rules. Switch edition with the header toggle.</p>';
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
      return src ? `${esc(skill)} <span class="skill-source">(${esc(src)})</span>` : esc(skill);
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

  // Undo characters (restore from snapshot)
  const undoBtn = document.getElementById('undo-characters-btn');
  if (undoBtn) {
    undoBtn.addEventListener('click', () => {
      if (typeof StorageLayer !== 'undefined' && StorageLayer.getPreviousForUndo) {
        const prev = StorageLayer.getPreviousForUndo();
        if (prev && Array.isArray(prev)) {
          characters = prev.map(c => migrateCharacter(c));
          saveCharacters(true); // skip snapshot to avoid re-pushing
          renderCharacterList();
          if (sessionCharacter && characters.find(x => x.id === sessionCharacter.id)) {
            sessionCharacter = characters.find(x => x.id === sessionCharacter.id);
            renderSessionView();
          }
        }
      }
    });
  }
  window.updateUndoButtonVisibility = function () {
    if (undoBtn && typeof StorageLayer !== 'undefined' && StorageLayer.getSnapshotCount) {
      undoBtn.hidden = StorageLayer.getSnapshotCount() < 2;
    }
  };

  // Escape closes any visible modal (focus trap + restore via ModalA11y)
  const MODAL_IDS = ['rules-modal', 'rule-books-modal', 'quick-reference-modal', 'quick-rules-modal', 'monster-stat-modal', 'custom-race-modal', 'custom-background-modal', 'level-up-modal', 'npc-modal', 'sheet-section-display-modal', 'confirm-modal', 'short-rest-modal', 'import-homebrew-modal', 'token-inspector-modal', 'save-map-modal', 'confirm-clear-tokens-modal'];
  if (typeof ModalA11y !== 'undefined' && ModalA11y.registerEscapeHandler) {
    ModalA11y.registerEscapeHandler(MODAL_IDS);
  } else {
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      for (const id of MODAL_IDS) {
        const m = document.getElementById(id);
        if (m && !m.hidden) {
          m.hidden = true;
          if (m.style) m.style.display = 'none';
          e.preventDefault();
          break;
        }
      }
    });
  }

  document.getElementById('new-character-btn')?.addEventListener('click', () => showRuleBooksModalForNewCharacter());
  document.getElementById('empty-new-btn')?.addEventListener('click', () => showRuleBooksModalForNewCharacter());
  document.querySelector('.first-run-dismiss')?.addEventListener('click', () => {
    try { localStorage.setItem('dnd_first_run', '1'); } catch (e) {}
    const hint = document.getElementById('first-run-hint');
    if (hint) hint.hidden = true;
  });
  cancelBtn?.addEventListener('click', showListView);
  saveBtn?.addEventListener('click', saveCharacter);

  prevBtn?.addEventListener('click', () => goToStep(currentStep - 1));
  nextBtn?.addEventListener('click', () => {
    if (currentStep >= TOTAL_STEPS) return;
    if (!canAdvanceStep(currentStep)) return;
    if (currentStep === 7 && typeof applyBackgroundAbilityBonuses === 'function') {
      const edition = currentChar.edition || (typeof getActiveEdition === 'function' ? getActiveEdition() : '5e');
      if (edition === '5.5e' && currentChar.background) {
        currentChar.stats = applyBackgroundAbilityBonuses(currentChar.stats || {}, currentChar.background, edition);
        Object.keys(currentChar.stats).forEach(k => {
          currentChar.stats[k] = Math.max(1, Math.min(30, currentChar.stats[k]));
        });
        const bg = getMergedBackgrounds().find(b => b.name === currentChar.background);
        if (bg?.feat) {
          currentChar.feats = currentChar.feats || [];
          if (!currentChar.feats.includes(bg.feat)) currentChar.feats.push(bg.feat);
        }
      }
    }
    if (currentStep === 9) syncDetailsFromForm();
    let next = currentStep + 1;
    if (currentStep === 2) {
      const race = getMergedRaces().find(r => r.name === currentChar.race);
      if (!race?.subraces?.length) next = 4;
    }
    goToStep(Math.min(next, TOTAL_STEPS));
  });

  document.getElementById('roll-4d6-btn')?.addEventListener('click', () => {
    if (currentChar) roll4d6DropLowest();
  });
  document.getElementById('standard-array-btn')?.addEventListener('click', () => {
    if (currentChar) applyStandardArray();
  });
  document.getElementById('point-buy-btn')?.addEventListener('click', () => {
    if (currentChar) openPointBuy();
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
    container.querySelectorAll('.step9-tab').forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
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
    const errEl = document.getElementById('import-error');
    if (!file) return;
    if (errEl) errEl.textContent = '';
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        const toAdd = Array.isArray(imported) ? imported : (imported && typeof imported === 'object' ? [imported] : []);
        if (toAdd.length === 0) {
          if (errEl) errEl.textContent = 'No valid character data found. Expected a character object or array of characters.';
          return;
        }
        toAdd.forEach(c => { if (c && !c.id) c.id = Date.now().toString() + Math.random().toString(36).slice(2); migrateCharacter(c); });
        characters = [...characters, ...toAdd];
        saveCharacters();
        renderCharacterList();
        if (errEl) errEl.textContent = '';
      } catch (err) {
        if (errEl) errEl.textContent = 'Failed to import: invalid JSON. Please check the file format.';
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

  // General-purpose dice roller (supports adv/dis: 1d20 adv, 1d20 dis, or use Adv/Dis buttons)
  let diceRollHistory = [];
  const DICE_HISTORY_MAX = 10;
  const rollCustomDice = (expr) => {
    const resultEl = document.getElementById('dice-roller-result');
    const advBtn = document.getElementById('dice-adv-btn');
    const disBtn = document.getElementById('dice-dis-btn');
    if (!resultEl) return;
    let raw = (expr || '').trim().toLowerCase();
    let useAdv = raw.includes(' adv') || advBtn?.classList.contains('active');
    let useDis = raw.includes(' dis') || disBtn?.classList.contains('active');
    raw = raw.replace(/\s+(adv|dis)$/, '').trim();
    if (useAdv && useDis) { useAdv = false; useDis = false; }
    const parts = raw.split('+');
    let totalRoll = 0;
    const details = [];
    for (const part of parts) {
      const p = part.trim();
      const dm = p.match(/^(\d+)d(\d+)$/);
      if (dm) {
        const num = parseInt(dm[1]); const sides = parseInt(dm[2]);
        let rolls = [];
        for (let i = 0; i < num; i++) { const r = Math.floor(Math.random() * sides) + 1; rolls.push(r); totalRoll += r; }
        if ((useAdv || useDis) && num === 1 && sides === 20) {
          const r2 = Math.floor(Math.random() * 20) + 1;
          rolls = [rolls[0], r2];
          totalRoll = useAdv ? Math.max(rolls[0], r2) : Math.min(rolls[0], r2);
          details.push(`1d20 ${useAdv ? 'adv' : 'dis'}: [${rolls.join(', ')}] → ${totalRoll}`);
        } else {
          details.push(`${num}d${sides}: [${rolls.join(', ')}]`);
        }
      } else if (/^\d+$/.test(p)) {
        const flat = parseInt(p); totalRoll += flat; details.push(`+${flat}`);
      } else {
        resultEl.innerHTML = `<span class="dice-error">Invalid: ${esc(expr)}</span>`;
        resultEl.hidden = false;
        return;
      }
    }
    const display = `${raw}${useAdv ? ' adv' : ''}${useDis ? ' dis' : ''}`;
    resultEl.innerHTML = `<strong>${totalRoll}</strong> <span class="dice-detail">(${details.join(' + ')})</span>`;
    resultEl.hidden = false;
    diceRollHistory.unshift({ expr: display, total: totalRoll, details: details.join(' + ') });
    diceRollHistory = diceRollHistory.slice(0, DICE_HISTORY_MAX);
    const historyList = document.getElementById('dice-roll-history-list');
    if (historyList) { historyList.innerHTML = diceRollHistory.map(h => `<li>${esc(h.expr)}: <strong>${h.total}</strong> (${esc(h.details)})</li>`).join(''); }
    if (advBtn) advBtn.classList.remove('active');
    if (disBtn) disBtn.classList.remove('active');
  };
  document.getElementById('dice-adv-btn')?.addEventListener('click', () => {
    const adv = document.getElementById('dice-adv-btn');
    const dis = document.getElementById('dice-dis-btn');
    adv?.classList.toggle('active', !adv?.classList.contains('active'));
    if (dis) dis.classList.remove('active');
  });
  document.getElementById('dice-dis-btn')?.addEventListener('click', () => {
    const adv = document.getElementById('dice-adv-btn');
    const dis = document.getElementById('dice-dis-btn');
    dis?.classList.toggle('active', !dis?.classList.contains('active'));
    if (adv) adv.classList.remove('active');
  });
  document.getElementById('dice-roller-btn')?.addEventListener('click', () => {
    rollCustomDice(document.getElementById('dice-roller-input')?.value);
  });
  document.getElementById('dice-roller-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); rollCustomDice(e.target.value); }
  });
  document.querySelectorAll('.dice-quick').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById('dice-roller-input');
      if (input) input.value = btn.dataset.dice;
      rollCustomDice(btn.dataset.dice);
    });
  });

  // Starter kit button
  document.getElementById('load-starter-kit-btn')?.addEventListener('click', () => {
    if (!currentChar || !currentChar.class) {
      alert('Please select a class first (Step 4).');
      return;
    }
    const kit = typeof STARTING_EQUIPMENT !== 'undefined' ? STARTING_EQUIPMENT[currentChar.class] : null;
    if (!kit || kit.length === 0) {
      alert('No starter kit available for ' + currentChar.class + '.');
      return;
    }
    if (!currentChar.equipment) currentChar.equipment = [];
    kit.forEach(item => {
      currentChar.equipment.push(item);
    });
    renderStep9Arrays();
    updateStep9AcHint();
    updatePreview();
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
    const activeEdition = typeof getActiveEdition === 'function' ? getActiveEdition() : '5e';
    const allRulesets = typeof RULESETS !== 'undefined' ? Object.values(RULESETS) : [];
    const allAdditional = typeof ADDITIONAL_BOOKS !== 'undefined' ? ADDITIONAL_BOOKS : [];
    const otherEditionRulesetIds = allRulesets.filter(r => (r.edition || '5e') !== activeEdition).map(r => r.id);
    const otherEditionBookIds = allAdditional.filter(b => (b.edition || '5e') !== activeEdition).map(b => b.id);
    const currentRulesets = typeof getEnabledRulesets === 'function' ? getEnabledRulesets() : [];
    const currentBooks = typeof getEnabledAdditionalBooks === 'function' ? getEnabledAdditionalBooks() : [];
    const mergedRulesets = [...currentRulesets.filter(id => otherEditionRulesetIds.includes(id)), ...rulesetChecked];
    const mergedBooks = [...currentBooks.filter(id => otherEditionBookIds.includes(id)), ...additionalChecked];
    if (typeof setEnabledRulesets === 'function') setEnabledRulesets(mergedRulesets);
    if (typeof setEnabledAdditionalBooks === 'function') setEnabledAdditionalBooks(mergedBooks);
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
  document.getElementById('session-print-btn')?.addEventListener('click', () => {
    window.print();
  });
  document.getElementById('session-export-pdf-btn')?.addEventListener('click', () => {
    exportToPdf();
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
    if (typeof ModalA11y !== 'undefined' && ModalA11y.openModal) ModalA11y.openModal(modal, {});
    else modal.hidden = false;
  });
  document.getElementById('sheet-display-close')?.addEventListener('click', () => {
    const m = document.getElementById('sheet-section-display-modal');
    if (typeof ModalA11y !== 'undefined' && ModalA11y.closeModal) ModalA11y.closeModal(m);
    else if (m) m.hidden = true;
  });
  document.getElementById('designer-mode-toggle')?.addEventListener('click', toggleDesignerMode);
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
    const c = sessionCharacter;
    const totalLevel = getTotalLevel(c);
    const hdUsed = c.hitDiceUsed || 0;
    const hdRemaining = totalLevel - hdUsed;
    const hitDie = c.hitDie || (typeof CLASSES !== 'undefined' ? (CLASSES.find(cl => cl.name === c.class)?.hitDie || 8) : 8);
    const conMod = Math.floor(((c.stats?.constitution ?? 10) - 10) / 2);
    if (hdRemaining <= 0) {
      showConfirmModal('Short Rest', 'No Hit Dice remaining. Take a short rest anyway? Warlocks regain pact slots.', 'Take Rest').then(ok => {
        if (ok) {
          if (c.class === 'Warlock') c.spellSlotsUsed = (c.spellSlotsUsed || [0,0,0,0,0,0,0,0,0]).map(() => 0);
          c.concentratingOn = null;
          saveCharacters(); renderSessionCombat(); renderSessionSpells(); renderSessionOverview();
        }
      });
      return;
    }
    const modal = document.getElementById('short-rest-modal');
    const msgEl = document.getElementById('short-rest-message');
    const hdSection = document.getElementById('short-rest-hd-section');
    const hdInput = document.getElementById('short-rest-hd-input');
    const hdHint = document.getElementById('short-rest-hd-hint');
    if (!modal || !msgEl || !hdInput) return;
    msgEl.textContent = `You have ${hdRemaining} Hit Dice remaining (d${hitDie}).`;
    hdSection.hidden = false;
    hdInput.min = 0;
    hdInput.max = hdRemaining;
    hdInput.value = Math.min(1, hdRemaining);
    if (hdHint) hdHint.textContent = `Each die: d${hitDie} + ${conMod >= 0 ? '+' : ''}${conMod} Con. (0–${hdRemaining})`;
    const close = () => {
      if (typeof ModalA11y !== 'undefined' && ModalA11y.closeModal) ModalA11y.closeModal(modal);
      else modal.hidden = true;
    };
    const doRest = () => {
      const numToSpend = parseInt(hdInput.value) || 0;
      const spend = Math.max(0, Math.min(numToSpend, hdRemaining));
      let totalHealing = 0;
      const rolls = [];
      for (let i = 0; i < spend; i++) {
        const roll = Math.floor(Math.random() * hitDie) + 1;
        const heal = Math.max(1, roll + conMod);
        rolls.push(roll);
        totalHealing += heal;
      }
      c.hitDiceUsed = (c.hitDiceUsed || 0) + spend;
      const currentHp = c.hp ?? c.maxHp ?? 0;
      const maxHp = c.maxHp ?? currentHp;
      c.hp = Math.min(maxHp, currentHp + totalHealing);
      if (c.class === 'Warlock') c.spellSlotsUsed = (c.spellSlotsUsed || [0,0,0,0,0,0,0,0,0]).map(() => 0);
      c.concentratingOn = null;
      close();
      saveCharacters();
      renderSessionCombat();
      renderSessionSpells();
      renderSessionOverview();
    };
    document.getElementById('short-rest-modal-close').onclick = close;
    document.getElementById('short-rest-modal-backdrop').onclick = close;
    document.getElementById('short-rest-modal-cancel').onclick = close;
    document.getElementById('short-rest-modal-confirm').onclick = doRest;
    if (typeof ModalA11y !== 'undefined' && ModalA11y.openModal) ModalA11y.openModal(modal, { focusTarget: '#short-rest-hd-input' });
    else modal.hidden = false;
  });
  document.getElementById('long-rest-btn')?.addEventListener('click', () => {
    if (!sessionCharacter) return;
    showConfirmModal('Long Rest', 'Take a long rest? Restore all HP, half Hit Dice, all spell slots. Exhaustion decreases by 1.', 'Take Long Rest').then(ok => {
    if (ok) {
      sessionCharacter.hp = sessionCharacter.maxHp ?? sessionCharacter.hp;
      document.getElementById('hp-current').value = sessionCharacter.hp;
      const level = sessionCharacter.level || 1;
      const regain = Math.floor(level / 2);
      sessionCharacter.hitDiceUsed = Math.max(0, (sessionCharacter.hitDiceUsed || 0) - regain);
      document.getElementById('hd-used').value = sessionCharacter.hitDiceUsed;
      sessionCharacter.spellSlotsUsed = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      sessionCharacter.concentratingOn = null;
      if ((sessionCharacter.exhaustion || 0) > 0) sessionCharacter.exhaustion--;
      saveCharacters();
      renderSessionCombat();
      renderSessionSpells();
      renderSessionOverview();
    }
    });
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
    const quickInput = document.getElementById('xp-quick-add');
    const add = parseInt(quickInput?.value, 10);
    if (!isNaN(add)) {
      const newXp = (sessionCharacter.xp || 0) + add;
      const newLevel = typeof getLevelFromXp === 'function' ? getLevelFromXp(newXp) : 1;
      const currentLevel = sessionCharacter.level || 1;
      if (newLevel > currentLevel) {
        performLevelUp(sessionCharacter, currentLevel, newLevel, {
          newXp,
          onDone: () => {
            saveCharacters();
            renderSessionLeveling();
            renderSessionOverview();
            renderSessionCombat();
            alert(`Level up! Now level ${sessionCharacter.level}.`);
          }
        });
      } else {
        sessionCharacter.xp = newXp;
        if (quickInput) quickInput.value = '';
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
        renderSessionOverview();
        renderSessionCombat();
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

  // Edition toggle (5e / 5.5e)
  const edBtn5e = document.getElementById('edition-5e');
  const edBtn55e = document.getElementById('edition-55e');
  const setEdition = (ed) => {
    setActiveEdition(ed);
    edBtn5e?.classList.toggle('active', ed === '5e');
    edBtn55e?.classList.toggle('active', ed === '5.5e');
    const badge = document.getElementById('ruleset-badge');
    if (badge) badge.textContent = ed === '5.5e' ? '2024' : 'PHB';
  };
  edBtn5e?.addEventListener('click', () => setEdition('5e'));
  edBtn55e?.addEventListener('click', () => setEdition('5.5e'));
  setEdition(getActiveEdition());

  // Role toggle (Player / DM)
  const rolePlayer = document.getElementById('role-player');
  const roleDm = document.getElementById('role-dm');
  const dmPanel = document.getElementById('dm-panel');
  const mainPlayer = document.getElementById('main-player-content');
  const setRole = (role) => {
    const previous = localStorage.getItem('dnd_role');
    localStorage.setItem('dnd_role', role);
    rolePlayer?.classList.toggle('active', role === 'player');
    roleDm?.classList.toggle('active', role === 'dm');
    if (dmPanel) dmPanel.hidden = role !== 'dm';
    if (mainPlayer) mainPlayer.hidden = role === 'dm';
    const battleMapViewEl = document.getElementById('battle-map-view');
    if (role === 'dm') {
      document.body.classList.remove('battle-map-active');
      if (battleMapViewEl) battleMapViewEl.hidden = true;
    }
    if (role === 'player') {
      document.body.classList.remove('battle-map-active');
      const listView = document.getElementById('list-view');
      const builderView = document.getElementById('builder-view');
      const sessionView = document.getElementById('session-view');
      if (battleMapViewEl) battleMapViewEl.hidden = true;
      if (builderView) builderView.hidden = true;
      if (sessionView) sessionView.hidden = true;
      if (listView) listView.hidden = false;
      if (previous === 'dm' && typeof showListView === 'function') showListView();
    }
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
    toolsBtn.setAttribute('aria-expanded', String(!toolsDropdown.hidden));
  });
  document.addEventListener('click', () => {
    if (toolsDropdown) toolsDropdown.hidden = true;
    toolsBtn?.setAttribute('aria-expanded', 'false');
  });
  toolsDropdown?.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const tool = btn.dataset.tool;
      if (tool === 'rules') { document.getElementById('rules-btn')?.click(); }
      if (tool === 'quick-rules') {
        const modal = document.getElementById('quick-rules-modal');
        if (modal) {
          if (typeof ModalA11y !== 'undefined' && ModalA11y.openModal) ModalA11y.openModal(modal, {});
          else modal.hidden = false;
        }
      }
      if (tool === 'quick-reference') {
        const modal = document.getElementById('quick-reference-modal');
        if (modal) {
          if (typeof ModalA11y !== 'undefined' && ModalA11y.openModal) ModalA11y.openModal(modal, { focusTarget: '#quick-ref-search' });
          else { modal.hidden = false; document.getElementById('quick-ref-search')?.focus(); }
        }
        if (typeof renderQuickReference === 'function') renderQuickReference('');
      }
      if (tool === 'battle-map') {
        document.getElementById('role-dm')?.click();
        showBattleMapView();
      }
      if (tool === 'import-homebrew') showImportHomebrewModal();
      toolsDropdown.hidden = true;
      toolsBtn.setAttribute('aria-expanded', 'false');
    });
  });

  // Quick Rules modal
  document.getElementById('quick-rules-btn')?.addEventListener('click', () => {
    const modal = document.getElementById('quick-rules-modal');
    if (modal) {
      if (typeof ModalA11y !== 'undefined' && ModalA11y.openModal) ModalA11y.openModal(modal, {});
      else modal.hidden = false;
    }
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
    const crModal = document.getElementById('custom-race-modal');
    if (typeof ModalA11y !== 'undefined' && ModalA11y.openModal) ModalA11y.openModal(crModal, {});
    else crModal.hidden = false;
  });
  document.getElementById('custom-race-close')?.addEventListener('click', () => {
    const m = document.getElementById('custom-race-modal');
    if (typeof ModalA11y !== 'undefined' && ModalA11y.closeModal) ModalA11y.closeModal(m);
    else if (m) m.hidden = true;
  });
  document.getElementById('custom-race-backdrop')?.addEventListener('click', () => {
    const m = document.getElementById('custom-race-modal');
    if (typeof ModalA11y !== 'undefined' && ModalA11y.closeModal) ModalA11y.closeModal(m);
    else if (m) m.hidden = true;
  });
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
      const m = document.getElementById('custom-race-modal');
      if (typeof ModalA11y !== 'undefined' && ModalA11y.closeModal) ModalA11y.closeModal(m);
      else if (m) m.hidden = true;
      if (currentStep === 2) renderRaceStep();
    }
  });

  // Custom background
  document.getElementById('add-custom-background-btn')?.addEventListener('click', () => {
    document.getElementById('custom-bg-name').value = '';
    document.getElementById('custom-bg-desc').value = '';
    document.getElementById('custom-bg-skills').value = '';
    const cbModal = document.getElementById('custom-background-modal');
    if (typeof ModalA11y !== 'undefined' && ModalA11y.openModal) ModalA11y.openModal(cbModal, {});
    else cbModal.hidden = false;
  });
  document.getElementById('custom-background-close')?.addEventListener('click', () => {
    const m = document.getElementById('custom-background-modal');
    if (typeof ModalA11y !== 'undefined' && ModalA11y.closeModal) ModalA11y.closeModal(m);
    else if (m) m.hidden = true;
  });
  document.getElementById('custom-background-backdrop')?.addEventListener('click', () => {
    const m = document.getElementById('custom-background-modal');
    if (typeof ModalA11y !== 'undefined' && ModalA11y.closeModal) ModalA11y.closeModal(m);
    else if (m) m.hidden = true;
  });
  document.getElementById('custom-bg-save')?.addEventListener('click', () => {
    const name = document.getElementById('custom-bg-name')?.value?.trim();
    if (!name) { alert('Enter a background name.'); return; }
    if (typeof addCustomBackground === 'function' && addCustomBackground({
      name,
      description: document.getElementById('custom-bg-desc')?.value || '',
      skillProficiencies: (document.getElementById('custom-bg-skills')?.value || '').split(',').map(s => s.trim()).filter(Boolean)
    })) {
      const m = document.getElementById('custom-background-modal');
      if (typeof ModalA11y !== 'undefined' && ModalA11y.closeModal) ModalA11y.closeModal(m);
      else if (m) m.hidden = true;
      if (currentStep === 7) renderBackgroundStep();
    }
  });

  // DM NPCs
  document.getElementById('dm-add-npc-btn')?.addEventListener('click', () => openNPCModal());
  document.getElementById('npc-modal-close')?.addEventListener('click', () => {
    const m = document.getElementById('npc-modal');
    if (typeof ModalA11y !== 'undefined' && ModalA11y.closeModal) ModalA11y.closeModal(m);
    else if (m) m.hidden = true;
  });
  document.getElementById('npc-modal-backdrop')?.addEventListener('click', () => {
    const m = document.getElementById('npc-modal');
    if (typeof ModalA11y !== 'undefined' && ModalA11y.closeModal) ModalA11y.closeModal(m);
    else if (m) m.hidden = true;
  });
  document.getElementById('npc-save-btn')?.addEventListener('click', () => saveNPCModal(false));
  document.getElementById('npc-add-to-map-btn')?.addEventListener('click', () => saveNPCModal(true));

  // Battle map
  document.getElementById('battle-map-btn')?.addEventListener('click', () => {
    document.getElementById('role-dm')?.click();
    showBattleMapView();
  });
  document.getElementById('battle-map-back-btn')?.addEventListener('click', () => {
    if (sessionCharacter) {
      document.getElementById('role-player')?.click();
      showSessionView(sessionCharacter);
    } else {
      document.getElementById('role-dm')?.click();
      if (typeof showListView === 'function') showListView();
    }
  });
  document.getElementById('battle-map-character-btn')?.addEventListener('click', () => {
    if (sessionCharacter) showSessionView(sessionCharacter);
  });
  document.getElementById('session-battle-map-btn')?.addEventListener('click', () => {
    document.getElementById('role-dm')?.click();
    showBattleMapView();
  });
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
    const matchSearch = !search || m.name.toLowerCase().includes(search) || String(m.cr).includes(search) || (m.type || '').toLowerCase().includes(search);
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
      onOpen: (m) => showMonsterStatModal(m)
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
  let html = npcData ? `<p class="monster-stat-meta"><strong>NPC</strong> · ${esc(npcData.role || '—')}</p>` : `<p class="monster-stat-meta"><strong>${esc(m.type || '')}</strong> · Challenge ${esc(String(m.cr ?? ''))} (${esc(diff)}) · ${esc(String(m.xp ?? ''))} XP</p>`;
  html += `<div class="monster-stat-grid"><span>AC ${esc(String(m.ac ?? '?'))}</span><span>HP ${esc(String(m.hp || '?'))}</span><span>Speed ${esc(String(m.speed || '?'))}</span></div>`;
  if (npcData?.notes) html += `<p><strong>Notes:</strong> ${esc(npcData.notes)}</p>`;
  if (npcData?.stats) html += `<p><strong>Stats:</strong> ${esc(npcData.stats)}</p>`;
  if (stats.length) html += `<p><strong>Ability Scores:</strong> ${esc(stats.join(', '))}</p>`;
  if (m.saves) html += `<p><strong>Saving Throws:</strong> ${esc(m.saves)}</p>`;
  if (m.skills) html += `<p><strong>Skills:</strong> ${esc(m.skills)}</p>`;
  if (m.senses) html += `<p><strong>Senses:</strong> ${esc(m.senses)}</p>`;
  if (m.languages) html += `<p><strong>Languages:</strong> ${esc(m.languages)}</p>`;
  if (m.vulnerabilities) html += `<p><strong>Vulnerabilities:</strong> ${esc(m.vulnerabilities)}</p>`;
  if (m.immunities) html += `<p><strong>Immunities:</strong> ${esc(m.immunities)}</p>`;
  if (m.traits) html += `<p><strong>Traits:</strong> ${esc(m.traits)}</p>`;
  if (m.actions) html += `<p><strong>Actions:</strong> ${esc(m.actions)}</p>`;
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
      if (typeof ModalA11y !== 'undefined' && ModalA11y.closeModal) ModalA11y.closeModal(modal);
      else modal.hidden = true;
      openTokenInspector(null, m, m.npcData || null);
    }
  };
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
  `).join('') : '<p class="dm-empty">No saved battle maps yet — lay out a grid, then Save Current Map to keep it.</p>';
  list.querySelectorAll('.dm-load-map').forEach(btn => {
    btn.addEventListener('click', () => {
      const maps = JSON.parse(localStorage.getItem('dnd_dm_maps') || '[]');
      const m = maps[parseInt(btn.dataset.idx)];
      if (m) {
        battleMapTokens = (m.tokens || []).map(t => ({ ...t, color: t.color || BATTLE_MAP_COLORS[0] }));
        battleMapCells = m.cells || {};
        encounterRound = m.encounterRound ?? 1;
        encounterTurnIndex = m.encounterTurnIndex ?? 0;
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
  if (token) {
    nameEl.value = token.name || '';
    labelEl.value = token.label || '';
    const maxHp = token.maxHp ?? (token.monsterData ? parseMonsterMaxHp(token.monsterData.hp) : null);
    hpEl.value = token.currentHp ?? maxHp ?? '';
    maxHpEl.value = maxHp ?? '';
    colorEl.value = token.color || BATTLE_MAP_COLORS[0];
    if (initEl) initEl.value = token.initiative != null ? token.initiative : '';
    maxHpEl.disabled = !token.monsterData;
  } else if (monsterData) {
    nameEl.value = (monsterData.name || 'Token').slice(0, 20);
    labelEl.value = '';
    const maxHp = parseMonsterMaxHp(monsterData.hp);
    hpEl.value = maxHp ?? '';
    maxHpEl.value = maxHp ?? '';
    colorEl.value = BATTLE_MAP_COLORS[battleMapTokens.length % BATTLE_MAP_COLORS.length];
    if (initEl) initEl.value = '';
    maxHpEl.disabled = true;
  } else {
    nameEl.value = 'Token';
    labelEl.value = '';
    hpEl.value = '';
    maxHpEl.value = '';
    colorEl.value = BATTLE_MAP_COLORS[battleMapTokens.length % BATTLE_MAP_COLORS.length];
    if (initEl) initEl.value = '';
    maxHpEl.disabled = false;
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
    const validColor = color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : BATTLE_MAP_COLORS[0];
    if (token) {
      token.name = name;
      if (label) token.label = label; else delete token.label;
      if (!isNaN(hp)) token.currentHp = hp;
      if (!isNaN(maxHp) && !token.monsterData) token.maxHp = maxHp;
      token.color = validColor;
      if (!isNaN(initiative)) token.initiative = initiative; else delete token.initiative;
    } else if (monsterData) {
      addMonsterToBattleMap(monsterData, npcData || null, label || null);
      const t = battleMapTokens[battleMapTokens.length - 1];
      if (t) t.color = validColor;
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
      const newToken = { id: Date.now(), name, x, y, color: validColor };
      if (label) newToken.label = label;
      if (!isNaN(maxHp) && maxHp > 0) { newToken.maxHp = maxHp; newToken.currentHp = isNaN(hp) ? maxHp : hp; }
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
    maps.push({ name, cols, rows, tokens: [...battleMapTokens], cells: { ...battleMapCells }, encounterRound, encounterTurnIndex });
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
    t.initiativeNat = roll;
    t.initiativeMod = mod;
    t.initiative = roll + mod;
  });
  const order = getInitiativeOrder();
  encounterTurnIndex = order.length > 0 ? 0 : -1;
  encounterRound = 1;
  saveAndRenderBattleMap();
  renderEncounterUI();
}

function advanceTurn() {
  const order = getInitiativeOrder();
  if (order.length === 0) return;
  encounterTurnIndex = (encounterTurnIndex + 1) % order.length;
  if (encounterTurnIndex === 0) encounterRound++;
  renderEncounterUI();
  renderBattleMapGrid();
}

function previousTurn() {
  const order = getInitiativeOrder();
  if (order.length === 0) return;
  encounterTurnIndex--;
  if (encounterTurnIndex < 0) {
    encounterTurnIndex = order.length - 1;
    encounterRound = Math.max(1, encounterRound - 1);
  }
  renderEncounterUI();
  renderBattleMapGrid();
}

function renderEncounterUI() {
  const roundEl = document.getElementById('encounter-round-num');
  const listEl = document.getElementById('encounter-initiative-list');
  if (roundEl) roundEl.textContent = encounterRound;
  const order = getInitiativeOrder();
  if (!listEl) return;
  if (order.length === 0) {
    listEl.replaceChildren(createElement('p', { className: 'encounter-empty', textContent: 'Initiative order appears here after you roll — add combatants from the map or encounter list first.' }));
    return;
  }
  listEl.innerHTML = order.map((t, i) => {
    const isActive = i === encounterTurnIndex;
    const maxHp = t.maxHp ?? (t.monsterData ? parseMonsterMaxHp(t.monsterData.hp) : null);
    const curHp = t.currentHp ?? maxHp;
    const hpStr = maxHp != null ? `${curHp}/${maxHp}` : '';
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
    return `<div class="encounter-initiative-item ${isActive ? 'encounter-active' : ''}" data-id="${t.id}">
      <span class="encounter-init">${esc(initLabel)}</span>
      <span class="encounter-name">${esc(t.name)}</span>
      ${hpStr ? `<span class="encounter-hp">${hpStr}</span>` : ''}
    </div>`;
  }).join('');
}

function initBattleMap() {
  try {
    const saved = localStorage.getItem('dnd_battle_map');
    if (saved) {
      const data = JSON.parse(saved);
      battleMapTokens = (data.tokens || []).map(t => ({ ...t, color: t.color || BATTLE_MAP_COLORS[0] }));
      battleMapCells = data.cells || {};
      encounterRound = data.encounterRound ?? 1;
      const order = (data.tokens || []).filter(t => t.initiative != null).sort((a, b) => (b.initiative ?? 0) - (a.initiative ?? 0));
      encounterTurnIndex = Math.min(data.encounterTurnIndex ?? 0, Math.max(0, order.length - 1));
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
  document.getElementById('add-token-btn')?.addEventListener('click', () => openTokenInspector(null));
  document.getElementById('clear-tokens-btn')?.addEventListener('click', () => {
    if (battleMapTokens.length) openConfirmClearTokensModal();
  });
  initTokenInspectorModal();
  initSaveMapModal();
  initConfirmClearTokensModal();
  document.getElementById('encounter-roll-initiative')?.addEventListener('click', rollInitiativeForTokens);
  document.getElementById('encounter-next-turn')?.addEventListener('click', advanceTurn);
  document.getElementById('encounter-prev-turn')?.addEventListener('click', previousTurn);
  document.getElementById('encounter-round-inc')?.addEventListener('click', () => { encounterRound++; renderEncounterUI(); });
}

function saveAndRenderBattleMap() {
  const cols = parseInt(document.getElementById('grid-cols')?.value) || 10;
  const rows = parseInt(document.getElementById('grid-rows')?.value) || 10;
  const zoom = parseFloat(document.getElementById('battle-map-zoom')?.value) || 1;
  const gridLines = document.getElementById('grid-lines-toggle')?.checked !== false;
  const data = { cols, rows, tokens: battleMapTokens, cells: battleMapCells, zoom, gridLines, encounterRound, encounterTurnIndex };
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
      } else if (cellData.type === 'elevation' && cellData.elevation < 0) {
        cell.classList.add('grid-cell--elevation-low');
        cell.dataset.elevation = cellData.elevation;
      }
      cell.dataset.x = x;
      cell.dataset.y = y;
      const token = battleMapTokens.find(t => t.x === x && t.y === y);
      if (token) {
        const order = getInitiativeOrder();
        const activeToken = order.length > 0 && encounterTurnIndex >= 0 ? order[encounterTurnIndex] : null;
        const isActive = activeToken && activeToken.id === token.id;
        const tok = document.createElement('div');
        tok.className = 'map-token' + (isActive ? ' encounter-active-token' : '');
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
    }).join('') : '<p class="token-list-empty">The grid is clear — add creatures from the DM panel or encounter list.</p>';
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

  function openRulesModal() {
    loadRulesIntoModal();
    if (modal) {
      if (typeof ModalA11y !== 'undefined' && ModalA11y.openModal) {
        ModalA11y.openModal(modal, {});
      } else {
        modal.removeAttribute('hidden');
        modal.style.display = 'flex';
      }
      modal.style.display = 'flex';
    }
  }

  function closeRulesModal() {
    if (modal) {
      if (typeof ModalA11y !== 'undefined' && ModalA11y.closeModal) {
        ModalA11y.closeModal(modal);
      }
      modal.setAttribute('hidden', '');
      modal.style.display = 'none';
    }
  }

  rulesBtn?.addEventListener('click', openRulesModal);
  document.getElementById('ruleset-badge')?.addEventListener('click', () => {
    openRulesModal();
    document.querySelectorAll('.rules-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.rules-pane').forEach(p => p.hidden = true);
    document.querySelector('.rules-tab[data-tab="ruleset"]')?.classList.add('active');
    document.getElementById('pane-ruleset').hidden = false;
    renderRulesetPane();
  });
  document.getElementById('builder-rules-link')?.addEventListener('click', openRulesModal);
  closeBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    closeRulesModal();
  });
  backdrop?.addEventListener('click', (e) => {
    e.preventDefault();
    closeRulesModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && !modal.hasAttribute('hidden')) {
      closeRulesModal();
    }
  });

  saveRulesBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    saveRulesFromModal();
    closeRulesModal();
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

  const activeEdition = typeof getActiveEdition === 'function' ? getActiveEdition() : '5e';
  const enabled = typeof getEnabledRulesets === 'function' ? getEnabledRulesets() : ['phb'];
  const allRulesets = typeof RULESETS !== 'undefined' ? Object.values(RULESETS) : [];
  const rulesets = allRulesets.filter(rs => (rs.edition || '5e') === activeEdition);
  const allAdditional = typeof ADDITIONAL_BOOKS !== 'undefined' ? ADDITIONAL_BOOKS : [];
  const additionalBooks = allAdditional.filter(b => (b.edition || '5e') === activeEdition);
  const enabledAdditional = typeof getEnabledAdditionalBooks === 'function' ? getEnabledAdditionalBooks() : [];

  const hasRulesetForEdition = enabled.some(id => rulesets.some(r => r.id === id));
  const defaultRuleset = rulesets[0]?.id || (activeEdition === '5.5e' ? 'phb2024' : 'phb');

  let html = '';
  if (rulesets.length) {
    html += '<div class="rule-books-group"><h4>Core Rules (' + (activeEdition === '5.5e' ? '2024' : '2014') + ')</h4>';
    html += rulesets.map(rs => {
      const editionBadge = rs.edition ? `<span class="ruleset-edition-badge">${rs.edition === '5.5e' ? '2024' : '2014'}</span>` : '';
      const checked = hasRulesetForEdition ? enabled.includes(rs.id) : rs.id === defaultRuleset;
      return `<label class="ruleset-option ${checked ? 'selected' : ''}">
        <input type="checkbox" name="ruleset-book" value="${rs.id}" ${checked ? 'checked' : ''}>
        <span class="ruleset-name">${rs.name}</span>${editionBadge}
      </label>`;
    }).join('') + '</div>';
  }
  if (additionalBooks.length) {
    html += '<div class="rule-books-group"><h4>Additional Books (' + (activeEdition === '5.5e' ? '2024' : '2014') + ')</h4>';
    html += additionalBooks.map(b => {
      const ed = b.edition === '5.5e' ? '2024' : '2014';
      const editionBadge = `<span class="ruleset-edition-badge">${ed}</span>`;
      return `<label class="ruleset-option ${enabledAdditional.includes(b.id) ? 'selected' : ''}">
        <input type="checkbox" name="ruleset-additional" value="${b.id}" ${enabledAdditional.includes(b.id) ? 'checked' : ''}>
        <span class="ruleset-name">${b.name}</span>${editionBadge}
      </label>`;
    }).join('') + '</div>';
  }
  if (!rulesets.length && !additionalBooks.length) {
    html = '<p class="rules-desc">No rule books for ' + (activeEdition === '5.5e' ? '2024' : '2014') + ' rules. Use the edition toggle in the header.</p>';
  }
  options.innerHTML = html;

  const allDisplayed = [...rulesets, ...additionalBooks];
  const enabledList = rulesets.filter(r => enabled.includes(r.id));
  const addList = additionalBooks.filter(b => enabledAdditional.includes(b.id));
  info.innerHTML = [
    ...enabledList.map(rs => rs.link ? `<p><a href="${rs.link}" target="_blank" rel="noopener">${rs.name}</a>: ${rs.description}</p>` : `<p><strong>${rs.name}</strong>: ${rs.description}</p>`),
    ...addList.map(b => `<p><strong>${b.name}</strong></p>`)
  ].join('') || '<p>Select at least one rule book.</p>';

  const updateFromInputs = () => {
    const rulesetChecked = Array.from(document.querySelectorAll('input[name="ruleset-book"]:checked')).map(x => x.value);
    const additionalChecked = Array.from(document.querySelectorAll('input[name="ruleset-additional"]:checked')).map(x => x.value);
    const otherEditionRulesetIds = allRulesets.filter(r => (r.edition || '5e') !== activeEdition).map(r => r.id);
    const otherEditionBookIds = allAdditional.filter(b => (b.edition || '5e') !== activeEdition).map(b => b.id);
    const currentRulesets = typeof getEnabledRulesets === 'function' ? getEnabledRulesets() : [];
    const currentBooks = typeof getEnabledAdditionalBooks === 'function' ? getEnabledAdditionalBooks() : [];
    const mergedRulesets = [...currentRulesets.filter(id => otherEditionRulesetIds.includes(id)), ...rulesetChecked];
    const mergedBooks = [...currentBooks.filter(id => otherEditionBookIds.includes(id)), ...additionalChecked];
    if (typeof setEnabledRulesets === 'function') setEnabledRulesets(mergedRulesets);
    if (typeof setEnabledAdditionalBooks === 'function') setEnabledAdditionalBooks(mergedBooks);
    options.querySelectorAll('.ruleset-option').forEach(o => o.classList.remove('selected'));
    options.querySelectorAll('input[name="ruleset-book"]:checked, input[name="ruleset-additional"]:checked').forEach(x => x.closest('.ruleset-option')?.classList.add('selected'));
    const enabledList2 = rulesets.filter(r => rulesetChecked.includes(r.id));
    const addList2 = additionalBooks.filter(b => additionalChecked.includes(b.id));
    info.innerHTML = [
      ...enabledList2.map(rs => rs.link ? `<p><a href="${rs.link}" target="_blank" rel="noopener">${rs.name}</a>: ${rs.description}</p>` : `<p><strong>${rs.name}</strong>: ${rs.description}</p>`),
      ...addList2.map(b => `<p><strong>${b.name}</strong></p>`)
    ].join('') || '<p>Select at least one rule book.</p>';
    updateRulesetBadge();
    if (builderView && !builderView.hidden) {
      renderRaceStep();
      renderClassStep();
      renderBackgroundStep();
    }
  };

  options.querySelectorAll('input').forEach(cb => {
    cb.addEventListener('change', () => {
      const rulesetChecked = Array.from(document.querySelectorAll('input[name="ruleset-book"]:checked')).map(x => x.value);
      if (rulesetChecked.length === 0 && cb.name === 'ruleset-book') { cb.checked = true; return; }
      updateFromInputs();
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
  const additionalChecked = Array.from(document.querySelectorAll('input[name="ruleset-additional"]:checked')).map(cb => cb.value);
  if (rulesetChecked.length > 0 && typeof setEnabledRulesets === 'function') {
    const activeEdition = typeof getActiveEdition === 'function' ? getActiveEdition() : '5e';
    const allRulesets = typeof RULESETS !== 'undefined' ? Object.values(RULESETS) : [];
    const allAdditional = typeof ADDITIONAL_BOOKS !== 'undefined' ? ADDITIONAL_BOOKS : [];
    const otherEditionRulesetIds = allRulesets.filter(r => (r.edition || '5e') !== activeEdition).map(r => r.id);
    const otherEditionBookIds = allAdditional.filter(b => (b.edition || '5e') !== activeEdition).map(b => b.id);
    const currentRulesets = typeof getEnabledRulesets === 'function' ? getEnabledRulesets() : [];
    const currentBooks = typeof getEnabledAdditionalBooks === 'function' ? getEnabledAdditionalBooks() : [];
    const mergedRulesets = [...currentRulesets.filter(id => otherEditionRulesetIds.includes(id)), ...rulesetChecked];
    const mergedBooks = [...currentBooks.filter(id => otherEditionBookIds.includes(id)), ...additionalChecked];
    setEnabledRulesets(mergedRulesets);
    if (typeof setEnabledAdditionalBooks === 'function') setEnabledAdditionalBooks(mergedBooks);
  }
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
    booksList.innerHTML = books.map(b => {
      const ed = b.edition === '5.5e' ? '2024' : (b.edition || '5e');
      const editionBadge = `<span class="ruleset-edition-badge">${ed}</span>`;
      return `<div class="book-badge">${esc(b.name)}${editionBadge}</div>`;
    }).join('');
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
