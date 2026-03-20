/**
 * app-preview.js
 * Character preview panel, step 9 (Details) rendering: Variant Human feat, spells, arrays.
 * Also: formatModifier, updatePreview, applyRaceTraitsAndRenderStep9, syncDetailsFromForm.
 *
 * @depends app-state (currentChar, characterPreview, currentStep)
 * @depends app-array-helpers (renderArrayList)
 * @depends app-combat (calculateAC)
 */

// ========== MODIFIER FORMATTING ==========

/**
 * Format ability modifier as +N or -N.
 * @param {number} stat - Ability score (e.g. 16)
 * @returns {string} Modifier string (e.g. '+3')
 */
function formatModifier(stat) {
  const mod = Math.floor((stat - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

// ========== PREVIEW PANEL ==========

/**
 * Update the character preview panel (sidebar) with current character data.
 * Called whenever character data changes during wizard flow.
 */
function updatePreview() {
  if (!currentChar) return;
  const nameInput = document.getElementById('char-name');
  if (nameInput) currentChar.name = nameInput.value?.trim() || currentChar.name;
  const char = currentChar;
  const stats = char.stats || {};
  const ac = typeof calculateAC === 'function' ? calculateAC(char) : 10;
  const d = typeof DomUtils !== 'undefined' ? DomUtils : null;
  if (!characterPreview) return;
  if (d && d.clearChildren) d.clearChildren(characterPreview);
  else characterPreview.replaceChildren();
  const wrap = d ? d.createElement('div', { className: 'character-display' }) : (() => { const w = document.createElement('div'); w.className = 'character-display'; return w; })();
  const header = d ? d.createElement('div', { className: 'display-header' }) : (() => { const h = document.createElement('div'); h.className = 'display-header'; return h; })();
  header.appendChild(d ? d.createElement('h3', { textContent: char.name || 'Unnamed' }) : (() => { const h3 = document.createElement('h3'); h3.textContent = char.name || 'Unnamed'; return h3; })());
  wrap.appendChild(header);
  const content = d ? d.createElement('div', { className: 'display-content' }) : (() => { const c = document.createElement('div'); c.className = 'display-content'; return c; })();
  const basicSec = d ? d.createElement('div', { className: 'display-section' }) : (() => { const s = document.createElement('div'); s.className = 'display-section'; return s; })();
  basicSec.appendChild(d ? d.createElement('h4', { textContent: 'Basic Info' }) : (() => { const h = document.createElement('h4'); h.textContent = 'Basic Info'; return h; })());
  const infoGrid = d ? d.createElement('div', { className: 'info-grid' }) : (() => { const g = document.createElement('div'); g.className = 'info-grid'; return g; })();
  const pushInfo = (lab, val) => {
    const item = d ? d.createElement('div', { className: 'info-item' }) : (() => { const i = document.createElement('div'); i.className = 'info-item'; return i; })();
    item.appendChild(d ? d.createElement('span', { className: 'info-label', textContent: `${lab}:` }) : (() => { const s = document.createElement('span'); s.className = 'info-label'; s.textContent = `${lab}:`; return s; })());
    item.appendChild(d ? d.createElement('span', { className: 'info-value', textContent: String(val) }) : (() => { const s = document.createElement('span'); s.className = 'info-value'; s.textContent = String(val); return s; })());
    infoGrid.appendChild(item);
  };
  pushInfo('AC', ac);
  if (char.race) pushInfo('Race', `${char.race}${char.subrace ? ` (${char.subrace})` : ''}`);
  if (char.class) pushInfo('Class', char.class);
  pushInfo('Level', char.level || 1);
  if (char.background) pushInfo('Background', char.background);
  basicSec.appendChild(infoGrid);
  content.appendChild(basicSec);
  const statsSec = d ? d.createElement('div', { className: 'display-section' }) : (() => { const s = document.createElement('div'); s.className = 'display-section'; return s; })();
  statsSec.appendChild(d ? d.createElement('h4', { textContent: 'Ability Scores' }) : (() => { const h = document.createElement('h4'); h.textContent = 'Ability Scores'; return h; })());
  const statsDisplay = d ? d.createElement('div', { className: 'stats-display' }) : (() => { const s = document.createElement('div'); s.className = 'stats-display'; return s; })();
  Object.entries(stats).forEach(([stat, val]) => {
    const row = d ? d.createElement('div', { className: 'stat-display-item' }) : (() => { const r = document.createElement('div'); r.className = 'stat-display-item'; return r; })();
    row.append(
      d ? d.createElement('div', { className: 'stat-name', textContent: stat.slice(0, 3).toUpperCase() }) : (() => { const x = document.createElement('div'); x.className = 'stat-name'; x.textContent = stat.slice(0, 3).toUpperCase(); return x; })(),
      d ? d.createElement('div', { className: 'stat-value', textContent: String(val) }) : (() => { const x = document.createElement('div'); x.className = 'stat-value'; x.textContent = String(val); return x; })(),
      d ? d.createElement('div', { className: 'stat-mod', textContent: formatModifier(val) }) : (() => { const x = document.createElement('div'); x.className = 'stat-mod'; x.textContent = formatModifier(val); return x; })()
    );
    statsDisplay.appendChild(row);
  });
  statsSec.appendChild(statsDisplay);
  content.appendChild(statsSec);
  const appendListSection = (title, items, cls = 'list-item') => {
    if (!(items || []).length) return;
    const sec = d ? d.createElement('div', { className: 'display-section' }) : (() => { const s = document.createElement('div'); s.className = 'display-section'; return s; })();
    sec.appendChild(d ? d.createElement('h4', { textContent: title }) : (() => { const h = document.createElement('h4'); h.textContent = title; return h; })());
    const list = d ? d.createElement('div', { className: 'list-items' }) : (() => { const l = document.createElement('div'); l.className = 'list-items'; return l; })();
    (items || []).forEach(x => list.appendChild(d ? d.createElement('span', { className: cls, textContent: x }) : (() => { const s = document.createElement('span'); s.className = cls; s.textContent = x; return s; })()));
    sec.appendChild(list);
    content.appendChild(sec);
  };
  appendListSection('Languages', char.languages);
  appendListSection('Resistances', char.resistances, 'list-item list-item-resist');
  appendListSection('Immunities', char.immunities, 'list-item list-item-immune');
  appendListSection('Vulnerabilities', char.vulnerabilities, 'list-item list-item-vuln');
  appendListSection('Weaknesses', char.weaknesses, 'list-item list-item-weak');
  wrap.appendChild(content);
  characterPreview.appendChild(wrap);
  if (currentStep === 9 && typeof updateStep9AcHint === 'function') updateStep9AcHint();
}

// ========== VARIANT HUMAN FEAT ==========

/** Show and populate Variant Human feat picker when Human (Variant) 5e. */
function renderVariantHumanFeatSection() {
  const section = document.getElementById('variant-human-feat-section');
  const featSelect = document.getElementById('variant-human-feat-select');
  const featDesc = document.getElementById('variant-human-feat-desc');
  if (!section || !featSelect) return;
  const edition = currentChar?.edition || (typeof getActiveEdition === 'function' ? getActiveEdition() : '5e');
  const isVariantHuman = currentChar?.race === 'Human' && currentChar?.subrace === 'Variant' && edition === '5e';
  section.hidden = !isVariantHuman;
  if (!isVariantHuman) return;
  const feats = getFeatsForEdition(edition);
  if (typeof AppRenderers !== 'undefined' && AppRenderers.setSelectOptions) AppRenderers.setSelectOptions(featSelect, [{ value: '', label: '— Choose a feat —' }, ...feats.map(f => ({ value: f.name, label: f.name }))]);
  const existingFeat = (currentChar.feats || []).find(f => feats.some(x => x.name === f));
  if (existingFeat) featSelect.value = existingFeat;
  featSelect.onchange = () => {
    const val = featSelect.value?.trim();
    const f = feats.find(x => x.name === val);
    if (featDesc) featDesc.textContent = f ? f.description : '';
    if (!currentChar.feats) currentChar.feats = [];
    currentChar.feats = currentChar.feats.filter(x => !feats.some(fa => fa.name === x));
    if (val) currentChar.feats.push(val);
  };
  if (featDesc) featDesc.textContent = (feats.find(f => f.name === featSelect.value) || {}).description || '';
}

// ========== STEP 9: DETAILS ==========

/**
 * Apply race traits (languages, skills, resistances) when first entering step 9 if not yet set.
 * Then render step 9 UI: populate selects, variant human feat, spells, arrays.
 */
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
  populateStep9Selects();
  renderVariantHumanFeatSection();
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

/** Update AC hint in step 9 based on current character. */
function updateStep9AcHint() {
  const el = document.getElementById('step9-ac-hint');
  if (!el || !currentChar) return;
  const ac = typeof calculateAC === 'function' ? calculateAC(currentChar) : 10;
  el.textContent = `AC: ${ac} (from armor + Dex). Add armor/gear below to change.`;
}

/**
 * Max spell level available at given character level (half-caster style).
 * @param {number} charLevel - Character level
 * @returns {number} Max spell level (0–9)
 */
function getMaxSpellLevel(charLevel) {
  if (charLevel < 1) return 0;
  return Math.min(9, Math.floor((charLevel + 1) / 2));
}

/** Render spell selection UI for step 9 (cantrips + leveled spells). */
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
  const cls = currentChar.class || '';
  const slots = typeof getSpellSlotsForLevel === 'function' ? getSpellSlotsForLevel(charLevel, cls) : [0,0,0,0,0,0,0,0,0];
  const slotLabels = slots.map((n, i) => n > 0 ? `${i + 1}st: ${n}` : null).filter(Boolean);
  if (slotsSummary) {
    slotsSummary.replaceChildren();
    if (slotLabels.length) {
      const p = typeof DomUtils !== 'undefined'
        ? DomUtils.createElement('p', { className: 'spell-slots-hint' })
        : (() => { const x = document.createElement('p'); x.className = 'spell-slots-hint'; return x; })();
      const strong = document.createElement('strong');
      strong.textContent = `Spell slots at level ${charLevel}:`;
      p.appendChild(strong);
      p.appendChild(document.createTextNode(` ${slotLabels.join(', ')}. Some spells can be cast at higher levels for stronger effects.`));
      slotsSummary.appendChild(p);
    }
  }

  const edition = currentChar?.edition || (typeof getActiveEdition === 'function' ? getActiveEdition() : '5e');
  const classSpells = typeof getSpellsForClass === 'function' ? getSpellsForClass(currentChar.class, currentChar.subclass, edition) : (typeof SPELLS !== 'undefined' ? SPELLS : []);
  const cantrips = classSpells.filter(s => s.level === 0);
  const known = currentChar.knownSpells || [];
  const chosenCantrips = known.filter(n => cantrips.find(s => s.name === n));
  const chosenSpells = known.filter(n => classSpells.find(s => s.name === n && s.level > 0));
  const needSpells = cfg?.spells === 'prepare' ? 0 : (typeof cfg?.spells === 'number' ? cfg.spells : 0);

  const levelRange = maxSpellLevel <= 1 ? '1st level' : `1st–${maxSpellLevel}${maxSpellLevel === 2 ? 'nd' : maxSpellLevel === 3 ? 'rd' : 'th'} level`;
  hint.textContent = cfg ? (isPrepareCaster ? `Choose ${cfg.cantrips || 0} cantrips. You prepare spells from your spell list each day.` : `Choose ${cfg.cantrips || 0} cantrips and ${needSpells} leveled spells (any combination of ${levelRange}).`) : '';

  if (typeof AppRenderers !== 'undefined' && AppRenderers.setSelectOptions) AppRenderers.setSelectOptions(cantripSel, [{ value: '', label: '— Choose cantrip —' }, ...cantrips.map(s => ({ value: s.name, label: s.name }))]);

  const leveledSpellsByLvl = {};
  for (let l = 1; l <= maxSpellLevel; l++) leveledSpellsByLvl[l] = classSpells.filter(s => s.level === l);

  const d = typeof DomUtils !== 'undefined' ? DomUtils : null;
  if (d && d.clearChildren) d.clearChildren(pickRowsContainer);
  else pickRowsContainer.replaceChildren();
  if (!isPrepareCaster) {
    for (let lvl = 1; lvl <= maxSpellLevel; lvl++) {
      const spellsAtLvl = leveledSpellsByLvl[lvl] || [];
      const ord = lvl === 1 ? 'st' : lvl === 2 ? 'nd' : lvl === 3 ? 'rd' : 'th';
      const row = d
        ? d.createElement('div', { className: 'spell-pick-row spell-pick-row-lvl', dataset: { level: String(lvl) } })
        : (() => { const r = document.createElement('div'); r.className = 'spell-pick-row spell-pick-row-lvl'; r.dataset.level = String(lvl); return r; })();
      const lab = d ? d.createElement('label', { textContent: `${lvl}${ord}-level spells:` }) : (() => { const l = document.createElement('label'); l.textContent = `${lvl}${ord}-level spells:`; return l; })();
      const sel = d
        ? d.createElement('select', { className: 'spell-level-select', dataset: { level: String(lvl) } })
        : (() => { const s = document.createElement('select'); s.className = 'spell-level-select'; s.dataset.level = String(lvl); return s; })();
      if (typeof AppRenderers !== 'undefined' && AppRenderers.setSelectOptions) {
        AppRenderers.setSelectOptions(sel, [
          { value: '', label: '— Choose spell —' },
          ...spellsAtLvl.map(s => ({ value: s.name, label: s.name + (s.higherLevel ? ' (↑ upcast)' : '') }))
        ]);
      }
      const addBtn = d
        ? d.createElement('button', { type: 'button', className: 'btn btn-secondary btn-sm spell-level-add-btn', dataset: { level: String(lvl) }, textContent: 'Add' })
        : (() => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-secondary btn-sm spell-level-add-btn'; b.dataset.level = String(lvl); b.textContent = 'Add'; return b; })();
      const chosen = d
        ? d.createElement('div', { className: 'array-items spell-level-chosen', dataset: { level: String(lvl) } })
        : (() => { const c = document.createElement('div'); c.className = 'array-items spell-level-chosen'; c.dataset.level = String(lvl); return c; })();
      row.append(lab, sel, addBtn, chosen);
      pickRowsContainer.appendChild(row);
    }
  }

  const allLeveledSpells = classSpells.filter(s => s.level > 0 && s.level <= maxSpellLevel);
  const previewPanel = document.getElementById('spell-preview-panel');
  if (previewPanel) previewPanel.hidden = true;
  const showSpellPreview = (spellName) => {
    if (!previewPanel) return;
    const spell = spellName ? [...cantrips, ...allLeveledSpells].find(s => s.name === spellName) : null;
    if (!spell) {
      previewPanel.replaceChildren();
      previewPanel.hidden = true;
      return;
    }
    if (typeof AppRenderers !== 'undefined' && AppRenderers.mountSpellPreview) AppRenderers.mountSpellPreview(previewPanel, spell);
    else {
      previewPanel.replaceChildren();
      previewPanel.hidden = false;
    }
  };

  cantripSel.onfocus = () => { const v = cantripSel.value; if (v) showSpellPreview(v); };
  cantripSel.onchange = () => showSpellPreview(cantripSel.value || null);

  const renderChosen = (containerId, items, type) => {
    const c = document.getElementById(containerId);
    if (!c) return;
    const du = typeof DomUtils !== 'undefined' ? DomUtils : null;
    if (du && du.clearChildren) du.clearChildren(c);
    else c.replaceChildren();
    items.forEach((name, idx) => {
      const span = du ? du.createElement('span', { className: 'array-item' }) : (() => { const s = document.createElement('span'); s.className = 'array-item'; return s; })();
      span.appendChild(document.createTextNode(name + ' '));
      const rm = du
        ? du.createElement('button', { type: 'button', className: 'remove-item', dataset: { type, idx: String(idx) }, textContent: '×' })
        : (() => { const b = document.createElement('button'); b.type = 'button'; b.className = 'remove-item'; b.dataset.type = type; b.dataset.idx = String(idx); b.textContent = '×'; return b; })();
      span.appendChild(rm);
      c.appendChild(span);
    });
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
    const du = typeof DomUtils !== 'undefined' ? DomUtils : null;
    if (du && du.clearChildren) du.clearChildren(cont);
    else cont.replaceChildren();
    items.forEach((name, idx) => {
      const span = du ? du.createElement('span', { className: 'array-item' }) : (() => { const s = document.createElement('span'); s.className = 'array-item'; return s; })();
      span.appendChild(document.createTextNode(name + ' '));
      const rm = du
        ? du.createElement('button', { type: 'button', className: 'remove-item', dataset: { level: String(lvl), idx: String(idx) }, textContent: '×' })
        : (() => { const b = document.createElement('button'); b.type = 'button'; b.className = 'remove-item'; b.dataset.level = String(lvl); b.dataset.idx = String(idx); b.textContent = '×'; return b; })();
      span.appendChild(rm);
      cont.appendChild(span);
    });
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

/** Populate step 9 dropdowns: languages, damage types, skills, equipment, proficiencies. */
function populateStep9Selects() {
  const opts = (id, items, useIcons) => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const fmt = useIcons && typeof DAMAGE_TYPE_ICONS !== 'undefined' ? (x) => (DAMAGE_TYPE_ICONS[x] || '') + ' ' + x : (x) => x;
    if (typeof AppRenderers !== 'undefined' && AppRenderers.setSelectOptions) {
      AppRenderers.setSelectOptions(sel, [{ value: '', label: '— Choose —' }, ...(items || []).map(x => ({ value: x, label: fmt(x) }))]);
    }
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

/** Render step 9 array lists (languages, resistances, skills, equipment, proficiencies). */
function renderStep9Arrays() {
  const dmgFmt = (x) => {
    const frag = document.createDocumentFragment();
    const prefix = typeof DAMAGE_TYPE_ICONS !== 'undefined' && DAMAGE_TYPE_ICONS[x] ? DAMAGE_TYPE_ICONS[x] + ' ' : '';
    frag.appendChild(document.createTextNode(prefix + x));
    return frag;
  };
  renderArrayList('languages-list-items', currentChar?.languages, 'languages');
  renderArrayList('resistances-list', currentChar?.resistances, 'resistances', dmgFmt);
  renderArrayList('immunities-list', currentChar?.immunities, 'immunities', dmgFmt);
  renderArrayList('vulnerabilities-list', currentChar?.vulnerabilities, 'vulnerabilities', dmgFmt);
  renderArrayList('weaknesses-list', currentChar?.weaknesses, 'weaknesses');
  renderArrayList('skills-list', currentChar?.skills, 'skills', (skill) => {
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
  renderArrayList('equipment-list', currentChar?.equipment, 'equipment');
  renderArrayList('weapon-profs-list', currentChar?.weaponProficiencies, 'weaponProficiencies');
  renderArrayList('armor-profs-list', currentChar?.armorProficiencies, 'armorProficiencies');
  renderArrayList('tool-profs-list', currentChar?.toolProficiencies, 'toolProficiencies');
}

/**
 * Copy step 9 form values into currentChar.
 * Called before save to sync notes, personality traits, etc.
 */
function syncDetailsFromForm() {
  const notesEl = document.getElementById('char-notes');
  if (notesEl) currentChar.notes = notesEl.value;
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
