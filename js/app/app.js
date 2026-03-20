/**
 * D&D Character Builder - Application logic (main orchestrator)
 * Handles: character CRUD, wizard flow, session view, combat, spells, leveling, DM tools, battle map
 *
 * Modular pieces (load before this file, all in js/app/):
 *   app-utils, app-export, app-quick-ref, app-combat, app-state, app-persistence,
 *   app-char-helpers, app-ability-scores, app-wizard, app-step-renderers,
 *   app-array-helpers, app-preview, app-views, app-dm-tools, app-rules-modal
 *
 * @depends js/data/* (data, spells, items, monsters), js/lib/*, js/engines/*, js/app/* (other modules)
 */


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
            showSessionView(sessionCharacter);
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
        toAdd.forEach(c => {
          if (!c || typeof c !== 'object' || Array.isArray(c)) return;
          if (!c.id) c.id = Date.now().toString() + Math.random().toString(36).slice(2);
          migrateCharacter(c);
        });
        const valid = toAdd.filter(c => c && typeof c === 'object' && !Array.isArray(c));
        if (valid.length === 0) {
          if (errEl) errEl.textContent = 'No valid character data found. Expected a character object or array of characters.';
          return;
        }
        characters = [...characters, ...valid];
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
        const d = typeof DomUtils !== 'undefined' ? DomUtils : null;
        if (d && d.clearChildren) d.clearChildren(resultEl);
        else resultEl.replaceChildren();
        resultEl.appendChild(d ? d.createElement('span', { className: 'dice-error', textContent: `Invalid: ${expr}` }) : (() => {
          const s = document.createElement('span');
          s.className = 'dice-error';
          s.textContent = `Invalid: ${expr}`;
          return s;
        })());
        resultEl.hidden = false;
        return;
      }
    }
    const display = `${raw}${useAdv ? ' adv' : ''}${useDis ? ' dis' : ''}`;
    {
      const d = typeof DomUtils !== 'undefined' ? DomUtils : null;
      if (d && d.clearChildren) d.clearChildren(resultEl);
      else resultEl.replaceChildren();
      const strong = document.createElement('strong');
      strong.textContent = String(totalRoll);
      const detail = d ? d.createElement('span', { className: 'dice-detail', textContent: `(${details.join(' + ')})` }) : (() => {
        const s = document.createElement('span');
        s.className = 'dice-detail';
        s.textContent = `(${details.join(' + ')})`;
        return s;
      })();
      resultEl.append(strong, document.createTextNode(' '), detail);
    }
    resultEl.hidden = false;
    diceRollHistory.unshift({ expr: display, total: totalRoll, details: details.join(' + ') });
    diceRollHistory = diceRollHistory.slice(0, DICE_HISTORY_MAX);
    const historyList = document.getElementById('dice-roll-history-list');
    if (historyList) {
      const d = typeof DomUtils !== 'undefined' ? DomUtils : null;
      if (d && d.clearChildren) d.clearChildren(historyList);
      else historyList.replaceChildren();
      diceRollHistory.forEach(h => {
        const li = document.createElement('li');
        li.appendChild(document.createTextNode(`${h.expr}: `));
        const st = document.createElement('strong');
        st.textContent = String(h.total);
        li.appendChild(st);
        li.appendChild(document.createTextNode(` (${h.details})`));
        historyList.appendChild(li);
      });
    }
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
    const sectionLabels = { saves: 'Saves & Ability Checks', about: 'About & Notes', 'senses-skills': 'Skills & Senses', defenses: 'Defenses', features: 'Features & Traits' };
    const getMode = (id) => {
      let m = layout.sections[id] || 'full';
      if (SECTION_DISPLAY_LEGACY[m]) m = SECTION_DISPLAY_LEGACY[m];
      return m;
    };
    const d = typeof DomUtils !== 'undefined' ? DomUtils : null;
    if (d && d.clearChildren) d.clearChildren(optionsEl);
    else optionsEl.replaceChildren();
    Object.entries(sectionLabels).forEach(([id, label]) => {
      const row = d ? d.createElement('div', { className: 'row' }) : (() => { const r = document.createElement('div'); r.className = 'row'; return r; })();
      const lab = d ? d.createElement('label', { textContent: label }) : (() => { const l = document.createElement('label'); l.textContent = label; return l; })();
      const sel = d ? d.createElement('select', { dataset: { section: id } }) : (() => { const s = document.createElement('select'); s.dataset.section = id; return s; })();
      const mode = getMode(id);
      if (d && d.setSelectOptions) {
        d.setSelectOptions(sel, [
          { value: 'full', label: 'Full width' },
          { value: 'compact', label: 'Compact' },
          { value: 'half', label: 'Half (one column)' }
        ], { selected: mode });
      }
      row.appendChild(lab);
      row.appendChild(sel);
      optionsEl.appendChild(row);
    });
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
    if (typeof updateRulesetBadge === 'function') updateRulesetBadge();
    const rulesModal = document.getElementById('rules-modal');
    if (rulesModal && !rulesModal.hasAttribute('hidden')) {
      if (typeof updateRulesModalTitle === 'function') updateRulesModalTitle();
      if (typeof renderRulesetPane === 'function') renderRulesetPane();
      if (typeof renderBooksPane === 'function') renderBooksPane();
    }
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
    document.body.classList.toggle('dm-role', role === 'dm');
    if (dmPanel) dmPanel.hidden = role !== 'dm';
    if (mainPlayer) mainPlayer.hidden = false;
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
    const listTitle = document.getElementById('character-list-title');
    const listHint = document.getElementById('character-list-role-hint');
    const lv = document.getElementById('list-view');
    if (listTitle && lv && !lv.hidden) listTitle.textContent = role === 'dm' ? 'Characters & party' : 'Your Characters';
    if (listHint) listHint.hidden = role !== 'dm';
  };
  rolePlayer?.addEventListener('click', () => setRole('player'));
  roleDm?.addEventListener('click', () => setRole('dm'));
  setRole(localStorage.getItem('dnd_role') || 'player');

  document.getElementById('home-btn')?.addEventListener('click', () => showListView());

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
  const closeQuickRulesModal = () => {
    const modal = document.getElementById('quick-rules-modal');
    if (!modal) return;
    if (typeof ModalA11y !== 'undefined' && ModalA11y.closeModal) ModalA11y.closeModal(modal);
    else { modal.hidden = true; modal.style.display = 'none'; }
  };
  document.getElementById('quick-rules-close')?.addEventListener('click', closeQuickRulesModal);
  document.getElementById('quick-rules-backdrop')?.addEventListener('click', closeQuickRulesModal);

  const closeQuickReferenceModal = () => {
    const modal = document.getElementById('quick-reference-modal');
    if (!modal) return;
    if (typeof ModalA11y !== 'undefined' && ModalA11y.closeModal) ModalA11y.closeModal(modal);
    else modal.hidden = true;
  };
  document.getElementById('quick-reference-close')?.addEventListener('click', closeQuickReferenceModal);
  document.getElementById('quick-reference-backdrop')?.addEventListener('click', closeQuickReferenceModal);
  document.getElementById('quick-ref-search')?.addEventListener('input', (e) => { if (typeof renderQuickReference === 'function') renderQuickReference(e.target.value); });
  document.getElementById('quick-ref-search')?.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeQuickReferenceModal(); });
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
  document.getElementById('session-battle-map-btn')?.addEventListener('click', () => {
    document.getElementById('role-dm')?.click();
    showBattleMapView();
  });
  initBattleMap();

  if (typeof updateRulesetBadge === 'function') updateRulesetBadge();
  if (typeof initRulesModal === 'function') initRulesModal();

  renderCharacterList();

  window.addEventListener('pagehide', () => {
    if (typeof StorageLayer !== 'undefined' && StorageLayer.flushAllDebounced) StorageLayer.flushAllDebounced();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
