/**
 * app-char-helpers.js
 * Character building helpers: race/background bonuses, validation, modals.
 * Used during the character creation wizard.
 *
 * @depends app-state, app-utils (esc), js/data/data.js (getMergedRaces, etc.)
 */

// ========== RACE / BACKGROUND STAT BONUSES ==========

/**
 * Apply race/subrace ability bonuses to base 10s.
 * Used when initializing stats before user assigns values.
 * @returns {Object} Base stats object with race bonuses applied
 */
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

/**
 * Apply race/subrace bonuses to an existing stats object.
 * @param {Object} stats - Stats object to modify
 * @returns {Object} Modified stats
 */
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

/**
 * Apply 5.5e background ability score bonuses.
 * Returns new stats object (does not mutate input).
 * @param {Object} stats - Current stats
 * @param {string} backgroundName - Background name
 * @param {string} edition - '5e' or '5.5e'
 * @returns {Object} Stats with background bonuses applied
 */
function applyBackgroundAbilityBonuses(stats, backgroundName, edition) {
  if (edition !== '5.5e' || !backgroundName) return { ...stats };
  const bg = getMergedBackgrounds().find(b => b.name === backgroundName);
  if (!bg?.abilityScoreOptions) return { ...stats };
  const out = { ...stats };
  const choice = currentChar?.backgroundAbilityChoice || 'default';
  const opts = bg.abilityScoreOptions;
  if (choice === 'alternative' && currentChar?.backgroundAbilityChoiceStats?.length === 3) {
    currentChar.backgroundAbilityChoiceStats.forEach(stat => {
      if (out[stat] !== undefined) out[stat] = (out[stat] || 10) + 1;
    });
  } else if (opts.default && typeof opts.default === 'object') {
    Object.entries(opts.default).forEach(([stat, val]) => {
      if (out[stat] !== undefined) out[stat] = (out[stat] || 10) + val;
    });
  }
  return out;
}

// ========== EXPORT / MODALS ==========

/**
 * Export character sheet to a new window for printing/saving as PDF.
 * Opens session view clone in popup; user presses Ctrl+P to print.
 */
function exportToPdf() {
  if (!sessionCharacter) return;
  const sessionEl = document.getElementById('session-view');
  if (!sessionEl) return;
  const clone = sessionEl.cloneNode(true);
  clone.querySelectorAll('.btn, button').forEach(btn => btn.remove());
  const base = window.location.origin + (window.location.pathname || '/').replace(/[^/]*$/, '');
  const cssUrl = base + (base.endsWith('/') ? '' : '/') + 'styles.css';
  const w = window.open('', '_blank', 'noopener,noreferrer');
  if (!w) { showConfirmModal('Export to PDF', 'Please allow popups for this site to open the printable sheet in a new tab.'); return; }
  w.document.write('<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Character Sheet - ' + esc(sessionCharacter.name || 'Unnamed') + '</title><link rel="stylesheet" href="' + esc(cssUrl) + '"></head><body class="export-pdf-body"><p class="export-pdf-hint">Press <kbd>Ctrl+P</kbd> (or <kbd>Cmd+P</kbd> on Mac) to print or save as PDF.</p>' + clone.outerHTML + '</body></html>');
  w.document.close();
}

/**
 * Show a confirm modal; returns a Promise that resolves to true if confirmed, false if cancelled.
 * @param {string} title - Modal title
 * @param {string} message - Modal message
 * @param {string} confirmLabel - Confirm button text
 * @returns {Promise<boolean>}
 */
function showConfirmModal(title, message, confirmLabel = 'Confirm') {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirm-modal');
    const titleEl = document.getElementById('confirm-modal-title');
    const msgEl = document.getElementById('confirm-modal-message');
    const confirmBtn = document.getElementById('confirm-modal-confirm');
    const cancelBtn = document.getElementById('confirm-modal-cancel');
    const closeBtn = document.getElementById('confirm-modal-close');
    const backdrop = document.getElementById('confirm-modal-backdrop');
    if (!modal || !titleEl || !msgEl || !confirmBtn) return resolve(false);
    titleEl.textContent = title || 'Confirm';
    msgEl.textContent = message || '';
    confirmBtn.textContent = confirmLabel;
    const close = (result) => {
      if (typeof ModalA11y !== 'undefined' && ModalA11y.closeModal) ModalA11y.closeModal(modal);
      else modal.hidden = true;
      resolve(result);
    };
    confirmBtn.onclick = () => close(true);
    cancelBtn.onclick = () => close(false);
    closeBtn.onclick = () => close(false);
    backdrop.onclick = () => close(false);
    const escHandler = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(false); modal.removeEventListener('keydown', escHandler); } };
    modal.addEventListener('keydown', escHandler);
    if (typeof ModalA11y !== 'undefined' && ModalA11y.openModal) ModalA11y.openModal(modal, { focusTarget: confirmBtn });
    else modal.hidden = false;
  });
}

/**
 * Show Import Homebrew modal; parses JSON and merges into localStorage.
 * Supports races, classes, backgrounds, feats. Uses Schema.sanitizeHomebrewImport if available.
 */
function showImportHomebrewModal() {
  const modal = document.getElementById('import-homebrew-modal');
  const textarea = document.getElementById('import-homebrew-textarea');
  const statusEl = document.getElementById('import-homebrew-status');
  const confirmBtn = document.getElementById('import-homebrew-modal-confirm');
  const cancelBtn = document.getElementById('import-homebrew-modal-cancel');
  const closeBtn = document.getElementById('import-homebrew-modal-close');
  const backdrop = document.getElementById('import-homebrew-modal-backdrop');
  if (!modal || !textarea || !statusEl) return;
  const close = () => {
    if (typeof ModalA11y !== 'undefined' && ModalA11y.closeModal) ModalA11y.closeModal(modal);
    else modal.hidden = true;
    statusEl.textContent = '';
  };
  cancelBtn.onclick = close;
  closeBtn.onclick = close;
  backdrop.onclick = close;
  textarea.value = '';
  statusEl.textContent = '';
  statusEl.className = 'import-homebrew-status';
  confirmBtn.onclick = () => {
    const raw = textarea.value.trim();
    if (!raw) { statusEl.textContent = 'Paste JSON content first.'; statusEl.className = 'import-homebrew-status error'; return; }
    let data;
    try { data = JSON.parse(raw); } catch (e) { statusEl.textContent = 'Invalid JSON: ' + (e.message || 'parse error'); statusEl.className = 'import-homebrew-status error'; return; }
    if (typeof data !== 'object' || data === null) { statusEl.textContent = 'JSON must be an object.'; statusEl.className = 'import-homebrew-status error'; return; }
    let races = [], classes = [], backgrounds = [], feats = [];
    if (typeof Schema !== 'undefined' && Schema.sanitizeHomebrewImport) {
      const { sanitized, errors } = Schema.sanitizeHomebrewImport(data);
      if (errors.length > 0) {
        statusEl.textContent = 'Validation: ' + errors.slice(0, 3).join('; ') + (errors.length > 3 ? '...' : '');
        statusEl.className = 'import-homebrew-status error';
        return;
      }
      if (sanitized) {
        races = sanitized.races || [];
        classes = sanitized.classes || [];
        backgrounds = sanitized.backgrounds || [];
        feats = sanitized.feats || [];
      }
    }
    if (races.length === 0 && classes.length === 0 && backgrounds.length === 0 && feats.length === 0 && (!Schema || !Schema.sanitizeHomebrewImport)) {
      races = Array.isArray(data.races) ? data.races : [];
      classes = Array.isArray(data.classes) ? data.classes : [];
      backgrounds = Array.isArray(data.backgrounds) ? data.backgrounds : [];
      feats = Array.isArray(data.feats) ? data.feats : [];
    }
    const existing = typeof getHomebrewContent === 'function' ? getHomebrewContent() : { races: [], classes: [], backgrounds: [], feats: [] };
    const merged = {
      races: [...(existing.races || []), ...races].filter(r => r && r.name),
      classes: [...(existing.classes || []), ...classes].filter(c => c && c.name),
      backgrounds: [...(existing.backgrounds || []), ...backgrounds].filter(b => b && b.name),
      feats: [...(existing.feats || []), ...feats].filter(f => f && f.name)
    };
    if (typeof setHomebrewContent === 'function' && setHomebrewContent(merged)) {
      statusEl.textContent = `Imported: ${races.length} races, ${classes.length} classes, ${backgrounds.length} backgrounds, ${feats.length} feats. Total: ${merged.races.length} races, ${merged.classes.length} classes, ${merged.backgrounds.length} backgrounds, ${merged.feats.length} feats.`;
      statusEl.className = 'import-homebrew-status success';
    } else {
      statusEl.textContent = 'Failed to save homebrew content.';
      statusEl.className = 'import-homebrew-status error';
    }
  };
  if (typeof ModalA11y !== 'undefined' && ModalA11y.openModal) ModalA11y.openModal(modal, { focusTarget: '#import-homebrew-textarea' });
  else modal.hidden = false;
  textarea.focus();
}

// ========== VALIDATION ==========

/** Clear all step validation errors (inline messages under wizard steps) */
function clearValidationErrors() {
  for (let i = 1; i <= 10; i++) {
    const el = document.getElementById(`validation-error-${i}`);
    if (el) el.textContent = '';
  }
}

/**
 * Show inline validation error for a step; returns false when invalid.
 * @param {number} step - Wizard step number (1-10)
 * @param {string} message - Error message to display
 * @returns {boolean} Always false (for use in canAdvanceStep)
 */
function showValidationError(step, message) {
  clearValidationErrors();
  const el = document.getElementById(`validation-error-${step}`);
  if (el) {
    el.textContent = message;
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  return false;
}

/**
 * Validate current step before advancing; returns false + inline error if invalid.
 * @param {number} step - Wizard step number (1-10)
 * @returns {boolean} True if step is valid and can advance
 */
function canAdvanceStep(step) {
  if (!currentChar) return false;
  clearValidationErrors();
  switch (step) {
    case 1:
      if (!document.getElementById('char-name')?.value?.trim()) {
        return showValidationError(1, 'Please enter a character name.');
      }
      return true;
    case 2:
      if (!currentChar.race) {
        return showValidationError(2, 'Please select a race.');
      }
      return true;
    case 3: {
      const race = getMergedRaces().find(r => r.name === currentChar.race);
      if (race?.subraces?.length && !currentChar.subrace) {
        return showValidationError(3, 'Please select a subrace.');
      }
      return true;
    }
    case 4: {
      const levelEl = document.getElementById('starting-level-step4');
      if (levelEl) currentChar.level = parseInt(levelEl.value) || 1;
      if (!currentChar.class) {
        return showValidationError(4, 'Please select a class.');
      }
      return true;
    }
    case 5: {
      const cls = getMergedClasses().find(c => c.name === currentChar.class);
      const charLevel = currentChar.level || 1;
      const availableSubclasses = (cls?.subclasses || []).filter(s => (s.level || 1) <= charLevel);
      if (availableSubclasses.length > 0 && !currentChar.subclass) {
        return showValidationError(5, 'Please select a subclass.');
      }
      return true;
    }
    case 6:
      if (!currentChar.stats || Object.values(currentChar.stats).some(v => v == null || v === '')) {
        return showValidationError(6, 'Please set all ability scores.');
      }
      return true;
    case 7: {
      if (!currentChar.background) {
        return showValidationError(7, 'Please select a background.');
      }
      const edition = currentChar.edition || (typeof getActiveEdition === 'function' ? getActiveEdition() : '5e');
      if (edition === '5.5e' && currentChar.backgroundAbilityChoice === 'alternative') {
        const stats = currentChar.backgroundAbilityChoiceStats || [];
        if (stats.length !== 3) {
          return showValidationError(7, 'Select 3 different ability scores for +1/+1/+1.');
        }
        const unique = new Set(stats);
        if (unique.size !== 3) {
          return showValidationError(7, 'Each ability score must be different for +1/+1/+1.');
        }
      }
      return true;
    }
    case 8:
      if (!currentChar.alignment) {
        return showValidationError(8, 'Please select an alignment.');
      }
      return true;
    case 9: {
      const edition = currentChar?.edition || (typeof getActiveEdition === 'function' ? getActiveEdition() : '5e');
      if (currentChar.race === 'Human' && currentChar.subrace === 'Variant' && edition === '5e') {
        const variantFeat = (currentChar.feats || []).find(f => (typeof FEATS !== 'undefined' ? FEATS : []).some(x => x.name === f));
        if (!variantFeat) {
          return showValidationError(9, 'Variant Human must choose a feat. Select one in the Equipment tab.');
        }
      }
      if (typeof isSpellcastingClass === 'function' && isSpellcastingClass(currentChar.class, currentChar.subclass)) {
        const cfg = typeof getSpellsForClassLevel === 'function' ? getSpellsForClassLevel(currentChar.class, currentChar.level || 1, currentChar.subclass) : null;
        if (cfg) {
          const known = currentChar.knownSpells || [];
          const cantrips = known.filter(n => (SPELLS || []).find(s => s.name === n && s.level === 0));
          const spells = known.filter(n => (SPELLS || []).find(s => s.name === n && s.level > 0));
          const needCantrips = typeof cfg.cantrips === 'number' ? cfg.cantrips : 0;
          const needSpells = cfg.spells === 'prepare' ? 0 : (typeof cfg.spells === 'number' ? cfg.spells : 0);
          if (cantrips.length < needCantrips) {
            return showValidationError(9, `Please select ${needCantrips} cantrips. You have ${cantrips.length}.`);
          }
          if (needSpells > 0 && spells.length < needSpells) {
            return showValidationError(9, `Please select ${needSpells} spells. You have ${spells.length}.`);
          }
        }
      }
      return true;
    }
    default:
      return true;
  }
}
