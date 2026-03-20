/**
 * app-rules-modal.js
 * Rules modal: ruleset selection, custom rules, official PDFs.
 *
 * @depends app-state, js/data/data-rulesets.js
 */
// ========== RULES MODAL ==========
function initRulesModal() {
  const modal = document.getElementById('rules-modal');
  const rulesBtn = document.getElementById('rules-btn');
  const closeBtn = document.getElementById('rules-modal-close');
  const backdrop = document.getElementById('rules-modal-backdrop');
  const saveRulesBtn = document.getElementById('rules-save-btn');

  function openRulesModal() {
    loadRulesIntoModal();
    updateRulesModalTitle();
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
  const d = typeof DomUtils !== 'undefined' ? DomUtils : null;
  if (d && d.clearChildren) d.clearChildren(list);
  else list.replaceChildren();
  if (!links.length) {
    list.appendChild(d ? d.createElement('p', { className: 'no-books', textContent: 'No official PDF links configured.' }) : (() => { const p = document.createElement('p'); p.className = 'no-books'; p.textContent = 'No official PDF links configured.'; return p; })());
    return;
  }
  links.forEach(l => {
    const a = document.createElement('a');
    a.href = l.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.className = 'reference-link-item';
    a.appendChild(d ? d.createElement('span', { className: 'reference-link-name', textContent: l.name }) : (() => { const s = document.createElement('span'); s.className = 'reference-link-name'; s.textContent = l.name; return s; })());
    a.appendChild(d ? d.createElement('span', { className: 'reference-link-icon', textContent: '↗' }) : (() => { const s = document.createElement('span'); s.className = 'reference-link-icon'; s.textContent = '↗'; return s; })());
    list.appendChild(a);
  });
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

  const d = typeof DomUtils !== 'undefined' ? DomUtils : null;
  if (d && d.clearChildren) d.clearChildren(options);
  else options.replaceChildren();
  if (rulesets.length) {
    const group = d ? d.createElement('div', { className: 'rule-books-group' }) : (() => { const g = document.createElement('div'); g.className = 'rule-books-group'; return g; })();
    group.appendChild(d ? d.createElement('h4', { textContent: `Core Rules (${activeEdition === '5.5e' ? '2024' : '2014'})` }) : (() => { const h = document.createElement('h4'); h.textContent = `Core Rules (${activeEdition === '5.5e' ? '2024' : '2014'})`; return h; })());
    rulesets.forEach(rs => {
      const checked = hasRulesetForEdition ? enabled.includes(rs.id) : rs.id === defaultRuleset;
      const label = d ? d.createElement('label', { className: `ruleset-option${checked ? ' selected' : ''}` }) : (() => { const l = document.createElement('label'); l.className = `ruleset-option${checked ? ' selected' : ''}`; return l; })();
      const inp = d ? d.createElement('input', { type: 'checkbox', name: 'ruleset-book', value: rs.id }) : (() => { const i = document.createElement('input'); i.type = 'checkbox'; i.name = 'ruleset-book'; i.value = rs.id; return i; })();
      inp.checked = checked;
      label.appendChild(inp);
      label.appendChild(d ? d.createElement('span', { className: 'ruleset-name', textContent: rs.name }) : (() => { const s = document.createElement('span'); s.className = 'ruleset-name'; s.textContent = rs.name; return s; })());
      if (rs.edition) {
        label.appendChild(d ? d.createElement('span', { className: 'ruleset-edition-badge', textContent: rs.edition === '5.5e' ? '2024' : '2014' }) : (() => { const s = document.createElement('span'); s.className = 'ruleset-edition-badge'; s.textContent = rs.edition === '5.5e' ? '2024' : '2014'; return s; })());
      }
      group.appendChild(label);
    });
    options.appendChild(group);
  }
  if (additionalBooks.length) {
    const group = d ? d.createElement('div', { className: 'rule-books-group' }) : (() => { const g = document.createElement('div'); g.className = 'rule-books-group'; return g; })();
    group.appendChild(d ? d.createElement('h4', { textContent: `Additional Books (${activeEdition === '5.5e' ? '2024' : '2014'})` }) : (() => { const h = document.createElement('h4'); h.textContent = `Additional Books (${activeEdition === '5.5e' ? '2024' : '2014'})`; return h; })());
    additionalBooks.forEach(b => {
      const checked = enabledAdditional.includes(b.id);
      const label = d ? d.createElement('label', { className: `ruleset-option${checked ? ' selected' : ''}` }) : (() => { const l = document.createElement('label'); l.className = `ruleset-option${checked ? ' selected' : ''}`; return l; })();
      const inp = d ? d.createElement('input', { type: 'checkbox', name: 'ruleset-additional', value: b.id }) : (() => { const i = document.createElement('input'); i.type = 'checkbox'; i.name = 'ruleset-additional'; i.value = b.id; return i; })();
      inp.checked = checked;
      label.appendChild(inp);
      label.appendChild(d ? d.createElement('span', { className: 'ruleset-name', textContent: b.name }) : (() => { const s = document.createElement('span'); s.className = 'ruleset-name'; s.textContent = b.name; return s; })());
      const ed = b.edition === '5.5e' ? '2024' : '2014';
      label.appendChild(d ? d.createElement('span', { className: 'ruleset-edition-badge', textContent: ed }) : (() => { const s = document.createElement('span'); s.className = 'ruleset-edition-badge'; s.textContent = ed; return s; })());
      group.appendChild(label);
    });
    options.appendChild(group);
  }
  if (!rulesets.length && !additionalBooks.length) {
    options.appendChild(d ? d.createElement('p', { className: 'rules-desc', textContent: `No rule books for ${activeEdition === '5.5e' ? '2024' : '2014'} rules. Use the edition toggle in the header.` }) : (() => { const p = document.createElement('p'); p.className = 'rules-desc'; p.textContent = `No rule books for ${activeEdition === '5.5e' ? '2024' : '2014'} rules. Use the edition toggle in the header.`; return p; })());
  }

  const enabledList = rulesets.filter(r => enabled.includes(r.id));
  const addList = additionalBooks.filter(b => enabledAdditional.includes(b.id));
  function fillRulesetInfo(el, enList, adList) {
    if (!el) return;
    if (d && d.clearChildren) d.clearChildren(el);
    else el.replaceChildren();
    if (!enList.length && !adList.length) {
      el.appendChild(d ? d.createElement('p', { textContent: 'Select at least one rule book.' }) : (() => { const p = document.createElement('p'); p.textContent = 'Select at least one rule book.'; return p; })());
      return;
    }
    enList.forEach(rs => {
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
      el.appendChild(p);
    });
    adList.forEach(b => {
      const p = document.createElement('p');
      const strong = document.createElement('strong');
      strong.textContent = b.name;
      p.appendChild(strong);
      el.appendChild(p);
    });
  }
  fillRulesetInfo(info, enabledList, addList);

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
    fillRulesetInfo(info, enabledList2, addList2);
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

function updateRulesModalTitle() {
  const titleEl = document.getElementById('rules-modal-title');
  if (titleEl) {
    const activeEdition = typeof getActiveEdition === 'function' ? getActiveEdition() : '5e';
    const edLabel = activeEdition === '5.5e' ? '2024' : '5e (2014)';
    titleEl.textContent = `Rules & Custom Reference (${edLabel})`;
  }
}

const RULESET_BADGE_SHORT = { phb: 'PHB', basic2018: 'Basic', phb2024: 'PHB 2024' };

function updateRulesetBadge() {
  const badge = document.getElementById('ruleset-badge');
  if (badge && typeof getEnabledRulesets === 'function') {
    const activeEdition = typeof getActiveEdition === 'function' ? getActiveEdition() : '5e';
    const ids = getEnabledRulesets();
    const allRulesets = typeof RULESETS !== 'undefined' ? Object.values(RULESETS) : [];
    const editionIds = ids.filter(id => {
      const rs = allRulesets.find(r => r.id === id);
      return rs && (rs.edition || '5e') === activeEdition;
    });
    const names = editionIds.map(id => RULESETS[id]?.name).filter(Boolean);
    const shortNames = editionIds.map(id => RULESET_BADGE_SHORT[id] || RULESETS[id]?.name).filter(Boolean);
    const edLabel = activeEdition === '5.5e' ? ' (2024)' : ' (5e)';
    badge.textContent = names.length > 1 ? `${names.length} books` + edLabel : (shortNames[0] || (activeEdition === '5.5e' ? 'PHB 2024' : 'PHB'));
    badge.title = (names.length ? names.join(', ') : 'Rule books') + edLabel;
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

  const dB = typeof DomUtils !== 'undefined' ? DomUtils : null;
  if (dB && dB.clearChildren) dB.clearChildren(booksList);
  else booksList.replaceChildren();
  if (books.length === 0) {
    const p = document.createElement('p');
    p.className = 'no-books';
    p.appendChild(document.createTextNode('No additional books added yet. Edit '));
    const c1 = document.createElement('code');
    c1.textContent = 'js/data/data.js';
    p.appendChild(c1);
    p.appendChild(document.createTextNode(' and add entries to '));
    const c2 = document.createElement('code');
    c2.textContent = 'ADDITIONAL_BOOKS';
    p.appendChild(c2);
    p.appendChild(document.createTextNode('. See CONTENT_GUIDE.md for instructions.'));
    booksList.appendChild(p);
  } else {
    books.forEach(b => {
      const ed = b.edition === '5.5e' ? '2024' : (b.edition || '5e');
      const div = dB ? dB.createElement('div', { className: 'book-badge' }) : (() => { const d = document.createElement('div'); d.className = 'book-badge'; return d; })();
      div.appendChild(document.createTextNode(b.name));
      div.appendChild(dB ? dB.createElement('span', { className: 'ruleset-edition-badge', textContent: ed }) : (() => { const s = document.createElement('span'); s.className = 'ruleset-edition-badge'; s.textContent = ed; return s; })());
      booksList.appendChild(div);
    });
  }

  if (dB && dB.clearChildren) dB.clearChildren(rulesDisplay);
  else rulesDisplay.replaceChildren();
  if (bookRules) {
    const pre = dB ? dB.createElement('pre', { className: 'book-rules-content', textContent: bookRules }) : (() => { const pr = document.createElement('pre'); pr.className = 'book-rules-content'; pr.textContent = bookRules; return pr; })();
    rulesDisplay.appendChild(pre);
  } else {
    const p = dB ? dB.createElement('p', { className: 'no-books', textContent: 'Add books to ADDITIONAL_BOOKS in js/data/data.js to see their rules here.' }) : (() => { const x = document.createElement('p'); x.className = 'no-books'; x.textContent = 'Add books to ADDITIONAL_BOOKS in js/data/data.js to see their rules here.'; return x; })();
    rulesDisplay.appendChild(p);
  }
}