/**
 * app-step-renderers.js
 * Renders each wizard step's choice UI: race, subrace, class, subclass, background, alignment, stats, summary.
 * Each renderer populates a container with choice cards and info panels.
 *
 * @depends app-state (currentChar), app-utils (esc), app-array-helpers (renderArrayList)
 */

function _dom() {
  return typeof DomUtils !== 'undefined' ? DomUtils : null;
}
function _clear(el) {
  if (!el) return;
  const d = _dom();
  if (d && d.clearChildren) d.clearChildren(el);
  else el.replaceChildren();
}
function _mountRaceInfo(panel, race) {
  if (!panel) return;
  _clear(panel);
  if (!race) return;
  const d = _dom();
  if (!d) return;
  panel.appendChild(d.createElement('h4', { textContent: race.name }));
  const p1 = d.createElement('p');
  p1.appendChild(d.createElement('span', { className: 'source-badge', textContent: race.source || 'PHB' }));
  panel.appendChild(p1);
  panel.appendChild(d.createElement('p', { textContent: race.description || '' }));
  const asText = Object.entries(race.abilityScore || {}).map(([k, v]) => (k === 'any' ? '+1 to any' : `${k} +${v}`)).join(', ');
  const pAs = d.createElement('p');
  const sAs = document.createElement('strong');
  sAs.textContent = 'Ability Score:';
  pAs.appendChild(sAs);
  pAs.appendChild(document.createTextNode(' ' + asText));
  panel.appendChild(pAs);
  const pTr = d.createElement('p');
  const sTr = document.createElement('strong');
  sTr.textContent = 'Traits:';
  pTr.appendChild(sTr);
  pTr.appendChild(document.createTextNode(' ' + (race.traits || []).join(', ')));
  panel.appendChild(pTr);
}
function _mountClassInfo(panel, cls) {
  if (!panel) return;
  _clear(panel);
  if (!cls) return;
  const d = _dom();
  if (!d) return;
  const h4 = document.createElement('h4');
  if (typeof CLASS_ICONS !== 'undefined' && CLASS_ICONS[cls.name]) h4.appendChild(document.createTextNode(CLASS_ICONS[cls.name] + ' '));
  h4.appendChild(document.createTextNode(cls.name));
  panel.appendChild(h4);
  const p0 = d.createElement('p');
  p0.appendChild(d.createElement('span', { className: 'source-badge', textContent: cls.source || 'PHB' }));
  panel.appendChild(p0);
  panel.appendChild(d.createElement('p', { textContent: cls.description || '' }));
  ['Hit Die', 'Primary Ability', 'Saving Throws'].forEach((label, idx) => {
    const p = d.createElement('p');
    const strong = document.createElement('strong');
    strong.textContent = label + ':';
    p.appendChild(strong);
    const rest = idx === 0 ? ` d${cls.hitDie}` : idx === 1 ? ` ${(cls.primaryAbility || []).join(', ')}` : ` ${(cls.savingThrows || []).join(', ')}`;
    p.appendChild(document.createTextNode(rest));
    panel.appendChild(p);
  });
  const features = typeof CLASS_FEATURES_BY_LEVEL !== 'undefined' ? CLASS_FEATURES_BY_LEVEL[cls.name] : null;
  if (features && Object.keys(features).length) {
    const wrap = d.createElement('div', { className: 'class-features-table-wrap' });
    wrap.appendChild(d.createElement('h5', { textContent: 'Features by Level' }));
    const table = d.createElement('table', { className: 'class-features-table' });
    const thead = d.createElement('thead');
    const hr = d.createElement('tr');
    hr.appendChild(d.createElement('th', { textContent: 'Lvl' }));
    hr.appendChild(d.createElement('th', { textContent: 'Feature' }));
    thead.appendChild(hr);
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    Object.entries(features).forEach(([lvl, feat]) => {
      const tr = document.createElement('tr');
      tr.appendChild(d.createElement('td', { textContent: String(lvl) }));
      tr.appendChild(d.createElement('td', { textContent: String(feat) }));
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    panel.appendChild(wrap);
  }
}
function _mountSubraceInfo(panel, race, sub) {
  if (!panel) return;
  _clear(panel);
  if (!sub) return;
  const d = _dom();
  if (!d) return;
  panel.appendChild(d.createElement('h4', { textContent: sub.name }));
  const p0 = d.createElement('p');
  p0.appendChild(d.createElement('span', { className: 'source-badge', textContent: sub.source || race?.source || 'PHB' }));
  panel.appendChild(p0);
  if (sub.description) panel.appendChild(d.createElement('p', { textContent: sub.description }));
  const pTr = d.createElement('p');
  const sTr = document.createElement('strong');
  sTr.textContent = 'Traits:';
  pTr.appendChild(sTr);
  pTr.appendChild(document.createTextNode(' ' + (sub.traits || []).join(', ')));
  panel.appendChild(pTr);
}
function _mountSubclassInfo(panel, cls, sub) {
  if (!panel) return;
  _clear(panel);
  if (!sub) return;
  const d = _dom();
  if (!d) return;
  panel.appendChild(d.createElement('h4', { textContent: sub.name }));
  const p0 = d.createElement('p');
  p0.appendChild(d.createElement('span', { className: 'source-badge', textContent: sub.source || cls?.source || 'PHB' }));
  panel.appendChild(p0);
  panel.appendChild(d.createElement('p', { textContent: sub.description || '' }));
  const key = `${currentChar.class}|${sub.name}`;
  const features = typeof SUBCLASS_FEATURES_BY_LEVEL !== 'undefined' ? SUBCLASS_FEATURES_BY_LEVEL[key] : null;
  if (features && Object.keys(features).length) {
    const wrap = d.createElement('div', { className: 'subclass-progression' });
    wrap.appendChild(d.createElement('h5', { textContent: 'Features by level' }));
    const ul = d.createElement('ul', { className: 'feature-list' });
    Object.keys(features).map(Number).sort((a, b) => a - b).forEach(lvl => {
      const li = document.createElement('li');
      const strong = document.createElement('strong');
      strong.textContent = `Level ${lvl}:`;
      li.appendChild(strong);
      li.appendChild(document.createTextNode(' ' + features[lvl]));
      ul.appendChild(li);
    });
    wrap.appendChild(ul);
    panel.appendChild(wrap);
  }
}

// ========== STEP 2: RACE ==========

/** Render race selection step (step 2). Shows all races as choice cards. */
function renderRaceStep() {
  const container = document.getElementById('race-choices');
  const infoPanel = document.getElementById('race-info');
  const beginnerRaces = ['Human', 'Half-Elf', 'Dwarf', 'Halfling'];
  const d = _dom();
  _clear(container);
  getMergedRaces().forEach(r => {
    const btn = d ? d.createElement('button', { type: 'button', className: 'choice-card', dataset: { race: r.name } }) : (() => { const b = document.createElement('button'); b.type = 'button'; b.className = 'choice-card'; b.dataset.race = r.name; return b; })();
    const title = d ? d.createElement('span', { className: 'choice-title' }) : (() => { const s = document.createElement('span'); s.className = 'choice-title'; return s; })();
    title.appendChild(document.createTextNode(r.name));
    if (beginnerRaces.includes(r.name)) title.appendChild(d ? d.createElement('span', { className: 'newcomer-badge', textContent: 'Recommended' }) : (() => { const s = document.createElement('span'); s.className = 'newcomer-badge'; s.textContent = 'Recommended'; return s; })());
    btn.appendChild(title);
    btn.appendChild(d ? d.createElement('span', { className: 'choice-meta', textContent: `Speed ${r.speed} ft · ${(r.traits || []).join(', ')}` }) : (() => { const s = document.createElement('span'); s.className = 'choice-meta'; s.textContent = `Speed ${r.speed} ft · ${(r.traits || []).join(', ')}`; return s; })());
    btn.appendChild(d ? d.createElement('span', { className: 'source-badge', textContent: r.source || 'PHB' }) : (() => { const s = document.createElement('span'); s.className = 'source-badge'; s.textContent = r.source || 'PHB'; return s; })());
    container.appendChild(btn);
  });
  container.querySelectorAll('.choice-card').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.choice-card').forEach(c => c.classList.remove('selected'));
      btn.classList.add('selected');
      currentChar.race = btn.dataset.race;
      currentChar.subrace = '';
      const race = getMergedRaces().find(r => r.name === currentChar.race);
      _mountRaceInfo(infoPanel, race);
    });
  });
  const selected = getMergedRaces().find(r => r.name === currentChar.race);
  if (selected) {
    const btn = container.querySelector(`[data-race="${esc(selected.name)}"]`);
    if (btn) btn.classList.add('selected');
    const dSel = _dom();
    _clear(infoPanel);
    if (dSel) {
      infoPanel.appendChild(dSel.createElement('h4', { textContent: selected.name }));
      const p1 = dSel.createElement('p');
      p1.appendChild(dSel.createElement('span', { className: 'source-badge', textContent: selected.source || 'PHB' }));
      infoPanel.appendChild(p1);
      infoPanel.appendChild(dSel.createElement('p', { textContent: selected.description || '' }));
      const pTr = dSel.createElement('p');
      const sTr = document.createElement('strong');
      sTr.textContent = 'Traits:';
      pTr.appendChild(sTr);
      pTr.appendChild(document.createTextNode(' ' + (selected.traits || []).join(', ')));
      infoPanel.appendChild(pTr);
    }
  }
}

// ========== STEP 3: SUBRACE ==========

/** Render subrace selection step (step 3). Skips if race has no subraces. */
function renderSubraceStep() {
  const container = document.getElementById('subrace-choices');
  const infoPanel = document.getElementById('subrace-info');
  const race = getMergedRaces().find(r => r.name === currentChar.race);
  const subraces = race?.subraces || [];
  const d = _dom();
  if (subraces.length === 0) {
    _clear(container);
    container.appendChild(d ? d.createElement('p', { className: 'no-subraces', textContent: 'This race has no subraces. Continue to the next step.' }) : (() => { const p = document.createElement('p'); p.className = 'no-subraces'; p.textContent = 'This race has no subraces. Continue to the next step.'; return p; })());
    infoPanel.replaceChildren();
    return;
  }
  _clear(container);
  subraces.forEach(s => {
    const meta = Object.entries(s.abilityScore || {}).map(([k, v]) => (k === 'any' ? '+1 any' : `${k} +${v}`)).join(', ');
    const btn = d ? d.createElement('button', { type: 'button', className: 'choice-card', dataset: { subrace: s.name } }) : (() => { const b = document.createElement('button'); b.type = 'button'; b.className = 'choice-card'; b.dataset.subrace = s.name; return b; })();
    btn.appendChild(d ? d.createElement('span', { className: 'choice-title', textContent: s.name }) : (() => { const x = document.createElement('span'); x.className = 'choice-title'; x.textContent = s.name; return x; })());
    btn.appendChild(d ? d.createElement('span', { className: 'choice-meta', textContent: meta }) : (() => { const x = document.createElement('span'); x.className = 'choice-meta'; x.textContent = meta; return x; })());
    btn.appendChild(d ? d.createElement('span', { className: 'source-badge', textContent: s.source || race?.source || 'PHB' }) : (() => { const x = document.createElement('span'); x.className = 'source-badge'; x.textContent = s.source || race?.source || 'PHB'; return x; })());
    container.appendChild(btn);
  });
  container.querySelectorAll('.choice-card').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.choice-card').forEach(c => c.classList.remove('selected'));
      btn.classList.add('selected');
      currentChar.subrace = btn.dataset.subrace;
      const sub = subraces.find(s => s.name === currentChar.subrace);
      _mountSubraceInfo(infoPanel, race, sub);
    });
  });
  const sel = subraces.find(s => s.name === currentChar.subrace);
  if (sel) {
    const btn = container.querySelector(`[data-subrace="${esc(sel.name)}"]`);
    if (btn) btn.classList.add('selected');
  }
}

// ========== STEP 4: CLASS ==========

/** Render class selection step (step 4). Includes starting level picker. */
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
  const beginnerClasses = ['Fighter', 'Barbarian', 'Rogue', 'Cleric'];
  const d = _dom();
  _clear(container);
  getMergedClasses().forEach(c => {
    const btn = d ? d.createElement('button', { type: 'button', className: 'choice-card', dataset: { class: c.name } }) : (() => { const b = document.createElement('button'); b.type = 'button'; b.className = 'choice-card'; b.dataset.class = c.name; return b; })();
    btn.appendChild(d ? d.createElement('span', { className: 'choice-icon', textContent: classIcon(c.name).trimEnd() }) : (() => { const s = document.createElement('span'); s.className = 'choice-icon'; s.textContent = classIcon(c.name).trimEnd(); return s; })());
    const title = d ? d.createElement('span', { className: 'choice-title' }) : (() => { const s = document.createElement('span'); s.className = 'choice-title'; return s; })();
    title.appendChild(document.createTextNode(c.name));
    if (beginnerClasses.includes(c.name)) title.appendChild(d ? d.createElement('span', { className: 'newcomer-badge', textContent: 'Recommended' }) : (() => { const s = document.createElement('span'); s.className = 'newcomer-badge'; s.textContent = 'Recommended'; return s; })());
    btn.appendChild(title);
    btn.appendChild(d ? d.createElement('span', { className: 'choice-meta', textContent: `d${c.hitDie} hit die · ${(c.primaryAbility || []).join(', ')}` }) : (() => { const s = document.createElement('span'); s.className = 'choice-meta'; s.textContent = `d${c.hitDie} hit die · ${(c.primaryAbility || []).join(', ')}`; return s; })());
    btn.appendChild(d ? d.createElement('span', { className: 'source-badge', textContent: c.source || 'PHB' }) : (() => { const s = document.createElement('span'); s.className = 'source-badge'; s.textContent = c.source || 'PHB'; return s; })());
    container.appendChild(btn);
  });
  container.querySelectorAll('.choice-card').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.choice-card').forEach(c => c.classList.remove('selected'));
      btn.classList.add('selected');
      currentChar.class = btn.dataset.class;
      currentChar.subclass = '';
      const cls = getMergedClasses().find(c => c.name === currentChar.class);
      _mountClassInfo(infoPanel, cls);
    });
  });
  const selected = getMergedClasses().find(c => c.name === currentChar.class);
  if (selected) {
    const btn = container.querySelector(`[data-class="${esc(selected.name)}"]`);
    if (btn) btn.classList.add('selected');
    _mountClassInfo(infoPanel, selected);
  }
}

// ========== STEP 5: SUBCLASS ==========

/** Render subclass selection step (step 5). Filters by character level. */
function renderSubclassStep() {
  const container = document.getElementById('subclass-choices');
  const infoPanel = document.getElementById('subclass-info');
  const cls = getMergedClasses().find(c => c.name === currentChar.class);
  const charLevel = currentChar.level || 1;
  const subclasses = (cls?.subclasses || []).filter(s => (s.level || 1) <= charLevel);
  const d = _dom();
  if (subclasses.length === 0) {
    const allSubs = cls?.subclasses || [];
    const minLevel = allSubs.length ? Math.min(...allSubs.map(s => s.level || 1)) : 1;
    _clear(container);
    const hint = minLevel > charLevel
      ? `No subclasses available at level ${charLevel}. Choose subclass at level ${minLevel} or higher.`
      : `No subclasses available at level ${charLevel}. This class has no subclasses.`;
    container.appendChild(d ? d.createElement('p', { className: 'subclass-hint', textContent: hint }) : (() => { const p = document.createElement('p'); p.className = 'subclass-hint'; p.textContent = hint; return p; })());
    if (infoPanel) infoPanel.replaceChildren();
    currentChar.subclass = '';
  } else {
    _clear(container);
    subclasses.forEach(s => {
      const btn = d ? d.createElement('button', { type: 'button', className: 'choice-card', dataset: { subclass: s.name } }) : (() => { const b = document.createElement('button'); b.type = 'button'; b.className = 'choice-card'; b.dataset.subclass = s.name; return b; })();
      btn.appendChild(d ? d.createElement('span', { className: 'choice-title', textContent: s.name }) : (() => { const x = document.createElement('span'); x.className = 'choice-title'; x.textContent = s.name; return x; })());
      btn.appendChild(d ? d.createElement('span', { className: 'choice-meta', textContent: `Level ${s.level}` }) : (() => { const x = document.createElement('span'); x.className = 'choice-meta'; x.textContent = `Level ${s.level}`; return x; })());
      btn.appendChild(d ? d.createElement('span', { className: 'source-badge', textContent: s.source || cls?.source || 'PHB' }) : (() => { const x = document.createElement('span'); x.className = 'source-badge'; x.textContent = s.source || cls?.source || 'PHB'; return x; })());
      container.appendChild(btn);
    });
    container.querySelectorAll('.choice-card').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.choice-card').forEach(c => c.classList.remove('selected'));
        btn.classList.add('selected');
        currentChar.subclass = btn.dataset.subclass;
        const sub = subclasses.find(s => s.name === currentChar.subclass);
        _mountSubclassInfo(infoPanel, cls, sub);
      });
    });
    const sel = subclasses.find(s => s.name === currentChar.subclass);
    if (sel) {
      const btn = container.querySelector(`[data-subclass="${esc(sel.name)}"]`);
      if (btn) btn.classList.add('selected');
      _mountSubclassInfo(infoPanel, cls, sel);
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

/** Render multiclass list (class + level per entry) with add/remove. */
function renderMulticlassList() {
  const container = document.getElementById('multiclass-list');
  if (!container) return;
  const list = currentChar.multiclass || [];
  const d = _dom();
  _clear(container);
  const classOpts = getMergedClasses().filter(c => c.name !== currentChar.class).map(c => ({ value: c.name, label: c.name }));
  const levelOpts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19].map(l => ({ value: String(l), label: String(l) }));
  list.forEach((m, i) => {
    const row = d ? d.createElement('div', { className: 'multiclass-row' }) : (() => { const r = document.createElement('div'); r.className = 'multiclass-row'; return r; })();
    const selClass = d ? d.createElement('select', { className: 'multiclass-class', dataset: { idx: String(i) } }) : (() => { const s = document.createElement('select'); s.className = 'multiclass-class'; s.dataset.idx = String(i); return s; })();
    if (typeof AppRenderers !== 'undefined' && AppRenderers.setSelectOptions) AppRenderers.setSelectOptions(selClass, classOpts, { selected: m.name });
    const selLvl = d ? d.createElement('select', { className: 'multiclass-level', dataset: { idx: String(i) } }) : (() => { const s = document.createElement('select'); s.className = 'multiclass-level'; s.dataset.idx = String(i); return s; })();
    if (typeof AppRenderers !== 'undefined' && AppRenderers.setSelectOptions) AppRenderers.setSelectOptions(selLvl, levelOpts, { selected: String(m.level) });
    row.append(selClass, selLvl, d ? d.createElement('button', { type: 'button', className: 'remove-item', dataset: { idx: String(i) }, textContent: '×' }) : (() => { const b = document.createElement('button'); b.type = 'button'; b.className = 'remove-item'; b.dataset.idx = String(i); b.textContent = '×'; return b; })());
    container.appendChild(row);
  });
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

// ========== STEP 7: BACKGROUND ==========

/** Render background selection step (step 7). */
function renderBackgroundStep() {
  const container = document.getElementById('background-choices');
  const infoPanel = document.getElementById('background-info');
  const edition = currentChar?.edition || (typeof getActiveEdition === 'function' ? getActiveEdition() : '5e');
  const d = _dom();
  _clear(container);
  getMergedBackgrounds().forEach(b => {
    const btn = d ? d.createElement('button', { type: 'button', className: 'choice-card', dataset: { background: b.name } }) : (() => { const x = document.createElement('button'); x.type = 'button'; x.className = 'choice-card'; x.dataset.background = b.name; return x; })();
    btn.appendChild(d ? d.createElement('span', { className: 'choice-title', textContent: b.name }) : (() => { const s = document.createElement('span'); s.className = 'choice-title'; s.textContent = b.name; return s; })());
    btn.appendChild(d ? d.createElement('span', { className: 'choice-meta', textContent: (b.skillProficiencies || []).join(', ') }) : (() => { const s = document.createElement('span'); s.className = 'choice-meta'; s.textContent = (b.skillProficiencies || []).join(', '); return s; })());
    btn.appendChild(d ? d.createElement('span', { className: 'source-badge', textContent: b.source || 'PHB' }) : (() => { const s = document.createElement('span'); s.className = 'source-badge'; s.textContent = b.source || 'PHB'; return s; })());
    container.appendChild(btn);
  });
  container.querySelectorAll('.choice-card').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.choice-card').forEach(c => c.classList.remove('selected'));
      btn.classList.add('selected');
      currentChar.background = btn.dataset.background;
      updateBackgroundInfoPanel(infoPanel, edition);
    });
  });
  const sel = getMergedBackgrounds().find(b => b.name === currentChar.background);
  if (sel) {
    const btn = container.querySelector(`[data-background="${esc(sel.name)}"]`);
    if (btn) btn.classList.add('selected');
    updateBackgroundInfoPanel(infoPanel, edition);
  }
}

/** Update background info panel with 5.5e ability score choice if applicable. */
function updateBackgroundInfoPanel(infoPanel, edition) {
  const bg = getMergedBackgrounds().find(b => b.name === currentChar.background);
  if (!bg) { infoPanel.replaceChildren(); return; }
  const d = _dom();
  _clear(infoPanel);
  if (!d) return;
  infoPanel.appendChild(d.createElement('h4', { textContent: bg.name }));
  const p0 = d.createElement('p');
  p0.appendChild(d.createElement('span', { className: 'source-badge', textContent: bg.source || 'PHB' }));
  infoPanel.appendChild(p0);
  infoPanel.appendChild(d.createElement('p', { textContent: bg.description || '' }));
  const pSk = d.createElement('p');
  const sSk = document.createElement('strong');
  sSk.textContent = 'Skills:';
  pSk.appendChild(sSk);
  pSk.appendChild(document.createTextNode(' ' + (bg.skillProficiencies || []).join(', ')));
  infoPanel.appendChild(pSk);
  if (edition === '5.5e' && bg.abilityScoreOptions) {
    const opts = bg.abilityScoreOptions;
    const defaultStr = opts.default && typeof opts.default === 'object'
      ? Object.entries(opts.default).map(([s, v]) => `+${v} ${s.charAt(0).toUpperCase() + s.slice(1)}`).join(', ')
      : '';
    const box = d.createElement('div', { className: 'background-ability-choice' });
    Object.assign(box.style, { marginTop: '0.75rem', padding: '0.5rem', background: 'rgba(0,0,0,0.08)', borderRadius: '6px' });
    const strongAb = document.createElement('strong');
    strongAb.textContent = 'Ability scores (2024):';
    box.appendChild(strongAb);
    box.appendChild(document.createTextNode(` ${defaultStr} or ${opts.alternative || '+1/+1/+1'}`));
    const divR = d.createElement('div');
    divR.style.marginTop = '0.5rem';
    const lab1 = document.createElement('label');
    const r1 = d.createElement('input', { type: 'radio', name: 'bg-ability-choice', value: 'default' });
    r1.checked = (currentChar.backgroundAbilityChoice || 'default') === 'default';
    lab1.appendChild(r1);
    lab1.appendChild(document.createTextNode(' Default (+2/+1)'));
    const lab2 = document.createElement('label');
    lab2.style.marginLeft = '1rem';
    const r2 = d.createElement('input', { type: 'radio', name: 'bg-ability-choice', value: 'alternative' });
    r2.checked = currentChar.backgroundAbilityChoice === 'alternative';
    lab2.appendChild(r2);
    lab2.appendChild(document.createTextNode(' Alternative (+1/+1/+1)'));
    divR.append(lab1, lab2);
    box.appendChild(divR);
    if (currentChar.backgroundAbilityChoice === 'alternative') {
      const stats = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
      const choiceStats = currentChar.backgroundAbilityChoiceStats || [];
      const divS = d.createElement('div', { className: 'bg-alt-stats' });
      Object.assign(divS.style, { marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' });
      for (let i = 0; i < 3; i++) {
        const sel = d.createElement('select', { dataset: { bgStat: String(i) } });
        sel.style.minWidth = '6rem';
        if (typeof AppRenderers !== 'undefined' && AppRenderers.setSelectOptions) {
          AppRenderers.setSelectOptions(sel, stats.map(s => ({ value: s, label: `+1 ${s.charAt(0).toUpperCase() + s.slice(1)}` })), { selected: choiceStats[i] });
        }
        divS.appendChild(sel);
      }
      box.appendChild(divS);
    }
    infoPanel.appendChild(box);
  }
  if (edition === '5.5e' && bg.feat) {
    const pf = d.createElement('p');
    const sf = document.createElement('strong');
    sf.textContent = 'Feat:';
    pf.appendChild(sf);
    pf.appendChild(document.createTextNode(' ' + bg.feat));
    infoPanel.appendChild(pf);
  }
  infoPanel.querySelectorAll('input[name="bg-ability-choice"]').forEach(radio => {
    radio.addEventListener('change', () => {
      currentChar.backgroundAbilityChoice = radio.value;
      if (radio.value === 'alternative' && (!currentChar.backgroundAbilityChoiceStats || currentChar.backgroundAbilityChoiceStats.length !== 3)) {
        const opts = bg.abilityScoreOptions?.default;
        currentChar.backgroundAbilityChoiceStats = opts && typeof opts === 'object'
          ? Object.keys(opts).concat(['strength', 'dexterity', 'constitution']).slice(0, 3)
          : ['strength', 'dexterity', 'constitution'];
      }
      updateBackgroundInfoPanel(infoPanel, edition);
    });
  });
  infoPanel.querySelectorAll('.bg-alt-stats select').forEach((sel, i) => {
    sel.addEventListener('change', () => {
      currentChar.backgroundAbilityChoiceStats = currentChar.backgroundAbilityChoiceStats || [];
      currentChar.backgroundAbilityChoiceStats[i] = sel.value;
    });
  });
}

// ========== STEP 8: ALIGNMENT ==========

/** Render alignment selection step (step 8). */
function renderAlignmentStep() {
  const container = document.getElementById('alignment-choices');
  const infoPanel = document.getElementById('alignment-info');
  const d = _dom();
  _clear(container);
  ALIGNMENTS.forEach(a => {
    const btn = d ? d.createElement('button', { type: 'button', className: 'choice-card choice-small', dataset: { alignment: a.name } }) : (() => { const b = document.createElement('button'); b.type = 'button'; b.className = 'choice-card choice-small'; b.dataset.alignment = a.name; return b; })();
    btn.appendChild(d ? d.createElement('span', { className: 'choice-title', textContent: a.short }) : (() => { const s = document.createElement('span'); s.className = 'choice-title'; s.textContent = a.short; return s; })());
    btn.appendChild(d ? d.createElement('span', { className: 'choice-sub', textContent: a.name }) : (() => { const s = document.createElement('span'); s.className = 'choice-sub'; s.textContent = a.name; return s; })());
    container.appendChild(btn);
  });
  container.querySelectorAll('.choice-card').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.choice-card').forEach(c => c.classList.remove('selected'));
      btn.classList.add('selected');
      currentChar.alignment = btn.dataset.alignment;
      const align = ALIGNMENTS.find(a => a.name === currentChar.alignment);
      _clear(infoPanel);
      if (align) {
        const du = _dom();
        if (du) {
          infoPanel.appendChild(du.createElement('h4', { textContent: align.name }));
          infoPanel.appendChild(du.createElement('p', { textContent: align.description }));
        }
      }
    });
  });
  const sel = ALIGNMENTS.find(a => a.name === currentChar.alignment);
  if (sel) {
    const btn = container.querySelector(`[data-alignment="${sel.name}"]`);
    if (btn) btn.classList.add('selected');
    _clear(infoPanel);
    const du = _dom();
    if (du) {
      infoPanel.appendChild(du.createElement('h4', { textContent: sel.name }));
      infoPanel.appendChild(du.createElement('p', { textContent: sel.description }));
    }
  }
}

// ========== STEP 6: STATS ==========

/**
 * Render stats step (step 6). Shows editable ability score inputs.
 * @param {boolean} [preserveStats=false] - If true, keep existing stats; else reset from race bonuses
 */
function renderStatsStep(preserveStats = false) {
  const statsToUse = preserveStats && currentChar.stats ? { ...currentChar.stats } : getBaseStatsWithRaceBonuses();
  if (!preserveStats) currentChar.stats = { ...statsToUse };
  const grid = document.getElementById('stats-grid');
  grid.replaceChildren();
  Object.entries(statsToUse).forEach(([stat, value]) => {
    const d = _dom();
    const block = d ? d.createElement('div', { className: 'stat-block' }) : (() => { const b = document.createElement('div'); b.className = 'stat-block'; return b; })();
    const label = stat.charAt(0).toUpperCase() + stat.slice(1);
    const mod = Math.floor((value - 10) / 2);
    const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
    block.appendChild(d ? d.createElement('label', { className: 'stat-label', textContent: label }) : (() => { const l = document.createElement('label'); l.className = 'stat-label'; l.textContent = label; return l; })());
    const grp = d ? d.createElement('div', { className: 'stat-input-group' }) : (() => { const g = document.createElement('div'); g.className = 'stat-input-group'; return g; })();
    const input = d ? d.createElement('input', { type: 'number', min: '1', max: '30', className: 'stat-input', dataset: { stat } }) : (() => { const n = document.createElement('input'); n.type = 'number'; n.min = 1; n.max = 30; n.className = 'stat-input'; n.dataset.stat = stat; return n; })();
    input.value = String(value);
    grp.appendChild(input);
    grp.appendChild(d ? d.createElement('div', { className: 'stat-modifier', textContent: modStr }) : (() => { const x = document.createElement('div'); x.className = 'stat-modifier'; x.textContent = modStr; return x; })());
    block.appendChild(grp);
    input.addEventListener('input', () => {
      const v = Math.max(1, Math.min(30, parseInt(input.value) || 10));
      currentChar.stats[stat] = v;
      block.querySelector('.stat-modifier').textContent = (v - 10) / 2 >= 0 ? `+${Math.floor((v - 10) / 2)}` : Math.floor((v - 10) / 2);
      updatePreview();
    });
    grid.appendChild(block);
  });
}

// ========== STEP 10: SUMMARY ==========

/** Render summary step (step 10). Shows final character overview before save. */
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
  const d = _dom();
  _clear(container);
  if (!d) return;
  const wrap = d.createElement('div', { className: 'character-display' });
  const header = d.createElement('div', { className: 'display-header' });
  header.appendChild(d.createElement('h3', { textContent: char.name || 'Unnamed Character' }));
  wrap.appendChild(header);
  const content = d.createElement('div', { className: 'display-content' });
  const basicSec = d.createElement('div', { className: 'display-section' });
  basicSec.appendChild(d.createElement('h4', { textContent: 'Basic Information' }));
  const grid = d.createElement('div', { className: 'info-grid' });
  const pushInfo = (lab, val) => {
    const item = d.createElement('div', { className: 'info-item' });
    item.appendChild(d.createElement('span', { className: 'info-label', textContent: `${lab}:` }));
    item.appendChild(d.createElement('span', { className: 'info-value', textContent: String(val) }));
    grid.appendChild(item);
  };
  pushInfo('AC', ac);
  if (char.race) pushInfo('Race', `${char.race}${char.subrace ? ` (${char.subrace})` : ''}`);
  if (char.class) pushInfo('Class', `${char.class}${char.subclass ? ` — ${char.subclass}` : ''}`);
  pushInfo('Level', char.level || 1);
  if (char.background) pushInfo('Background', char.background);
  if (char.alignment) pushInfo('Alignment', char.alignment);
  basicSec.appendChild(grid);
  content.appendChild(basicSec);
  const statsSec = d.createElement('div', { className: 'display-section' });
  statsSec.appendChild(d.createElement('h4', { textContent: 'Ability Scores' }));
  const statsDisplay = d.createElement('div', { className: 'stats-display' });
  Object.entries(char.stats || {}).forEach(([s, v]) => {
    const row = d.createElement('div', { className: 'stat-display-item' });
    row.appendChild(d.createElement('div', { className: 'stat-name', textContent: s.slice(0, 3).toUpperCase() }));
    row.appendChild(d.createElement('div', { className: 'stat-value', textContent: String(v) }));
    row.appendChild(d.createElement('div', { className: 'stat-mod', textContent: formatMod(s) }));
    statsDisplay.appendChild(row);
  });
  statsSec.appendChild(statsDisplay);
  content.appendChild(statsSec);
  const appendListSection = (title, items, cls = 'list-item') => {
    if (!(items || []).length) return;
    const sec = d.createElement('div', { className: 'display-section' });
    sec.appendChild(d.createElement('h4', { textContent: title }));
    const list = d.createElement('div', { className: 'list-items' });
    (items || []).forEach(x => list.appendChild(d.createElement('span', { className: cls, textContent: x })));
    sec.appendChild(list);
    content.appendChild(sec);
  };
  appendListSection('Languages', char.languages);
  appendListSection('Damage Resistances', char.resistances, 'list-item list-item-resist');
  appendListSection('Damage Immunities', char.immunities, 'list-item list-item-immune');
  appendListSection('Damage Vulnerabilities', char.vulnerabilities, 'list-item list-item-vuln');
  appendListSection('Weaknesses', char.weaknesses, 'list-item list-item-weak');
  appendListSection('Feats', char.feats);
  appendListSection('Skills', char.skills);
  appendListSection('Equipment', char.equipment);
  if (char.notes) {
    const nSec = d.createElement('div', { className: 'display-section' });
    nSec.appendChild(d.createElement('h4', { textContent: 'Notes' }));
    nSec.appendChild(d.createElement('div', { className: 'notes-content', textContent: char.notes }));
    content.appendChild(nSec);
  }
  wrap.appendChild(content);
  container.appendChild(wrap);
}
