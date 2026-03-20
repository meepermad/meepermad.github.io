
(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  function escLocal(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (v == null) return;
      if (k === 'className') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k === 'dataset') Object.assign(node.dataset, v);
      else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), v);
      else node.setAttribute(k, v);
    });
    (Array.isArray(children) ? children : [children]).forEach(child => {
      if (child == null) return;
      if (typeof child === 'string') node.appendChild(document.createTextNode(child));
      else node.appendChild(child);
    });
    return node;
  }

  function afterInit(cb) {
    if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(cb, 0);
    else document.addEventListener('DOMContentLoaded', cb);
  }

  function classifySource(source) {
    return (window.MonsterpediaEngine?.classifySource || (s => s || 'Core 5e'))(source);
  }

  function getMonsterDataset() {
    try {
      if (typeof SRD_MONSTERS !== 'undefined' && Array.isArray(SRD_MONSTERS)) return SRD_MONSTERS;
    } catch (e) {}
    return Array.isArray(window.SRD_MONSTERS) ? window.SRD_MONSTERS : [];
  }

  function getCharactersDataset() {
    try {
      if (typeof characters !== 'undefined' && Array.isArray(characters)) return characters;
    } catch (e) {}
    return Array.isArray(window.characters) ? window.characters : [];
  }

  function syncWindowBridges() {
    try {
      if (typeof SRD_MONSTERS !== 'undefined' && !window.SRD_MONSTERS) window.SRD_MONSTERS = SRD_MONSTERS;
    } catch (e) {}
    try {
      if (!Object.getOwnPropertyDescriptor(window, 'characters') && typeof characters !== 'undefined') {
        Object.defineProperty(window, 'characters', {
          configurable: true,
          enumerable: false,
          get() { return characters; },
          set(v) { characters = Array.isArray(v) ? v : []; }
        });
      }
    } catch (e) {}
  }

  function injectBuilderHintBar() {
    const topBar = document.querySelector('.builder-top-bar');
    if (!topBar || document.getElementById('builder-hint-bar')) return;
    const hint = el('div', { id: 'builder-hint-bar', className: 'builder-hint-bar' }, [
      el('div', { className: 'builder-hint-title', text: 'Guided path' }),
      el('div', { className: 'builder-hint-text', text: 'Start with name, race, and class. Tooltips explain the “why” behind each choice. Legacy-source material is labeled as personal homebrew.' })
    ]);
    topBar.appendChild(hint);
  }

  function patchCharacterList() {
    if (typeof renderCharacterList !== 'function') return;
    window.renderCharacterList = function renderCharacterListOverhauled() {
      if (!characterGrid) return;
      characterGrid.replaceChildren();
      if (!characters.length) {
        if (emptyState) emptyState.classList.remove('hidden');
        characterGrid.classList.add('empty');
        return;
      }
      if (emptyState) emptyState.classList.add('hidden');
      characterGrid.classList.remove('empty');
      characters.forEach(c => {
        const totalLvl = (c.level || 1) + (c.multiclass || []).reduce((s, m) => s + (m.level || 0), 0);
        const ready = !!(c.name && c.race && c.class);
        const card = el('div', { className: 'character-card premium-character-card', 'data-id': c.id });
        const header = el('div', { className: 'character-card-header' });
        const titleWrap = el('div', { className: 'character-card-title-wrap' }, [
          el('h3', { text: c.name || 'Unnamed Character' }),
          el('span', { className: 'edition-badge', text: c.edition === '5.5e' ? '2024' : '5e' }),
          el('span', { className: 'ready-badge ' + (ready ? 'ready-badge--ready' : 'ready-badge--draft'), text: ready ? 'Table-ready' : 'In progress' })
        ]);
        const actions = el('div', { className: 'character-card-actions' });
        const mkBtn = (cls, txt, fn, title) => el('button', { className: cls, text: txt, title, onclick: fn });
        actions.append(
          mkBtn('btn-icon btn-play', 'Play', () => { const found = characters.find(x => x.id === c.id); if (found) showSessionView(found); }),
          mkBtn('btn-icon btn-edit', 'Edit', () => { const found = characters.find(x => x.id === c.id); if (found) showBuilderView(found); }),
          mkBtn('btn-icon btn-duplicate', 'Copy', () => {
            const copy = JSON.parse(JSON.stringify(c));
            copy.id = Date.now().toString() + Math.random().toString(36).slice(2);
            copy.name = (c.name || 'Unnamed') + ' (Copy)';
            migrateCharacter(copy);
            characters.push(copy);
            saveCharacters();
            renderCharacterList();
          }, 'Duplicate character'),
          mkBtn('btn-icon btn-danger btn-delete', 'Delete', () => showConfirmModal('Delete Character', 'Delete this character? This cannot be undone.', 'Delete').then(ok => {
            if (ok) { characters = characters.filter(x => x.id !== c.id); saveCharacters(); renderCharacterList(); }
          }))
        );
        header.append(titleWrap, actions);
        const body = el('div', { className: 'character-card-body' });
        const multi = (c.multiclass || []).length ? ' / ' + (c.multiclass || []).map(m => `${m.name} ${m.level}`).join(', ') : '';
        const rows = [
          ['Race', `${c.race || '—'}${c.subrace ? ` (${c.subrace})` : ''}`],
          ['Class', `${c.class || '—'}${c.subclass ? ` — ${c.subclass}` : ''}${multi}`],
          ['Level', String(totalLvl)],
          ['Background', c.background || '—']
        ];
        rows.forEach(([label, value]) => {
          const row = el('div', { className: 'character-info-row' }, [
            el('span', { className: 'info-label', text: label + ':' }),
            el('span', { text: value })
          ]);
          body.appendChild(row);
        });
        card.append(header, body);
        characterGrid.appendChild(card);
      });
      if (typeof updateUndoButtonVisibility === 'function') updateUndoButtonVisibility();
    };
  }

  function injectMonsterControls() {
    const search = document.getElementById('monster-search');
    if (!search || document.getElementById('monster-role-filter')) return;
    const row = search.closest('.dm-search-row, .dm-toolbar, .monster-toolbar, .form-row') || search.parentElement;
    const wrap = el('div', { className: 'monster-enhanced-controls' });
    const makeSelect = (id, title, options) => {
      const s = el('select', { id, title });
      options.forEach(([v, t]) => s.appendChild(el('option', { value: v, text: t })));
      return s;
    };
    wrap.append(
      makeSelect('monster-role-filter', 'Monster role', [['', 'All roles'], ['Bruiser', 'Bruiser'], ['Controller', 'Controller'], ['Artillery', 'Artillery'], ['Skirmisher', 'Skirmisher'], ['Leader', 'Leader'], ['Generalist', 'Generalist']]),
      makeSelect('monster-environment-filter', 'Environment', [['', 'All environments'], ['forest', 'Forest'], ['swamp', 'Swamp'], ['desert', 'Desert'], ['mountain', 'Mountain'], ['underground', 'Underground'], ['urban', 'Urban'], ['coast', 'Coast'], ['arctic', 'Arctic'], ['plains', 'Plains'], ['any', 'Any']]),
      makeSelect('monster-source-filter', 'Source', [['', 'All sources'], ['SRD', 'SRD'], ['MM', 'MM'], ['Personal Homebrew (Legacy Edition)', 'Personal Homebrew (Legacy Edition)']]),
      makeSelect('monster-movement-filter', 'Movement', [['', 'All movement'], ['ground', 'Ground'], ['flying', 'Flying'], ['swimming', 'Swimming'], ['climbing', 'Climbing']]),
      makeSelect('monster-sense-filter', 'Senses', [['', 'All senses'], ['normal', 'Normal'], ['darkvision', 'Darkvision'], ['blindsight', 'Blindsight'], ['truesight', 'Truesight']])
    );
    const sortBase = document.getElementById('monster-sort');
    if (sortBase && !sortBase.dataset.premiumOpts) {
      sortBase.dataset.premiumOpts = '1';
      [['xp', 'Sort: XP'], ['threat', 'Sort: threat']].forEach(([v, lab]) => {
        sortBase.appendChild(el('option', { value: v, text: lab }));
      });
      sortBase.addEventListener('change', () => window.renderDMMonsters?.());
    }
    const details = el('details', { className: 'monster-filters-advanced' });
    details.appendChild(el('summary', { className: 'monster-filters-summary' }, ['More filters (role, environment, movement…)']));
    details.appendChild(wrap);
    row.appendChild(details);
    ['monster-role-filter', 'monster-environment-filter', 'monster-source-filter', 'monster-movement-filter', 'monster-sense-filter'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', () => window.renderDMMonsters?.());
    });

    const list = document.getElementById('dm-monsters-list');
    if (list && !document.getElementById('monster-summary-bar')) {
      list.parentElement.insertBefore(el('div', { id: 'monster-summary-bar', className: 'monster-summary-bar' }), list);
    }
    if (list && !document.getElementById('encounter-builder')) {
      list.parentElement.insertBefore(el('div', { id: 'monster-encounter-tools', className: 'monster-encounter-tools' }, [
        el('label', { text: 'Party level ' }),
        el('input', { id: 'encounter-party-level', type: 'number', min: '1', max: '20', value: '5' }),
        el('label', { text: ' Party size ' }),
        el('input', { id: 'encounter-party-size', type: 'number', min: '1', max: '10', value: '4' }),
        el('button', { id: 'encounter-use-current-party', className: 'btn btn-ghost btn-sm', text: 'Use saved PCs', onclick: syncEncounterPartyFromCharacters })
      ]), list);
      document.getElementById('encounter-party-level')?.addEventListener('change', () => window.renderDMMonsters?.());
      document.getElementById('encounter-party-size')?.addEventListener('change', () => window.renderDMMonsters?.());
    }
  }

  function syncEncounterPartyFromCharacters() {
    const chars = getCharactersDataset();
    if (!chars.length) return;
    const active = chars.filter(c => c && (c.level || c.multiclass?.length));
    if (!active.length) return;
    const total = active.reduce((sum, c) => sum + ((c.level || 1) + (c.multiclass || []).reduce((s, m) => s + (m.level || 0), 0)), 0);
    const avg = Math.max(1, Math.round(total / active.length));
    const levelEl = document.getElementById('encounter-party-level');
    const sizeEl = document.getElementById('encounter-party-size');
    if (levelEl) levelEl.value = avg;
    if (sizeEl) sizeEl.value = active.length;
    window.renderDMMonsters?.();
  }

  function patchDMMonsters() {
    if (typeof renderDMMonsters !== 'function') return;
    window.renderDMMonsters = function renderDMMonstersOverhauled() {
      injectMonsterControls();
      const list = document.getElementById('dm-monsters-list');
      if (!list) return;
      const monsters = getMonsterDataset().map(m => window.MonsterpediaEngine.normalizeMonster(m));
      const typeSelect = document.getElementById('monster-type-filter');
      if (typeSelect && typeSelect.options.length <= 1 && typeof AppRenderers !== 'undefined' && AppRenderers.setSelectOptions) {
        const types = [...new Set(monsters.map(m => m.type).filter(Boolean))].sort();
        AppRenderers.setSelectOptions(typeSelect, [{ value: '', label: 'All types' }, ...types.map(t => ({ value: t, label: t }))]);
      }
      const filters = {
        query: document.getElementById('monster-search')?.value || '',
        crBucket: document.getElementById('monster-cr-filter')?.value || '',
        type: document.getElementById('monster-type-filter')?.value || '',
        role: document.getElementById('monster-role-filter')?.value || '',
        environment: document.getElementById('monster-environment-filter')?.value || '',
        source: document.getElementById('monster-source-filter')?.value || '',
        movementProfile: document.getElementById('monster-movement-filter')?.value || '',
        senseProfile: document.getElementById('monster-sense-filter')?.value || ''
      };
      let filtered = monsters.filter(m => {
        const q = filters.query.trim().toLowerCase();
        const matchesQ = !q || [m.name, m.type, m.role, m.environment, m.traits, m.actions, m.senses, String(m.cr), String(m.xp), m.sourceLabel].join(' ').toLowerCase().includes(q);
        const cr = Number(m.cr) || 0;
        const crMatches = !filters.crBucket || {
          trivial: cr <= 0.5,
          easy: cr > 0.5 && cr <= 4,
          medium: cr > 4 && cr <= 10,
          hard: cr > 10 && cr <= 16,
          deadly: cr > 16
        }[filters.crBucket];
        return matchesQ && crMatches && (!filters.type || m.type === filters.type) && (!filters.role || m.role === filters.role) && (!filters.environment || m.environment === filters.environment) && (!filters.source || m.sourceLabel === filters.source) && (!filters.movementProfile || m.movementProfile === filters.movementProfile) && (!filters.senseProfile || m.senseProfile === filters.senseProfile);
      });
      const sortBy = document.getElementById('monster-sort')?.value || 'name';
      filtered = window.MonsterpediaEngine.sortMonsters(filtered, sortBy);

      const summary = document.getElementById('monster-summary-bar');
      if (summary) {
        const totalXp = filtered.reduce((sum, m) => sum + (Number(m.xp) || 0), 0);
        const avgCr = filtered.length ? (filtered.reduce((s, m) => s + (Number(m.cr) || 0), 0) / filtered.length).toFixed(1) : '0.0';
        const budget = window.MonsterpediaEngine.buildEncounterBudget(filtered.slice(0, Math.min(filtered.length, 4)), document.getElementById('encounter-party-level')?.value, document.getElementById('encounter-party-size')?.value);
        summary.textContent = `${filtered.length} monsters • Avg CR ${avgCr} • ${totalXp} XP visible • Suggested encounter difficulty ${budget.difficulty}`;
      }

      list.replaceChildren();
      if (!filtered.length) {
        list.appendChild(el('p', { className: 'dm-empty', text: 'No stat blocks match these filters — try a shorter search or relax source / environment.' }));
        return;
      }
      filtered.forEach(m => {
        const card = el('div', { className: 'dm-monster-card premium-monster-card', role: 'button', tabindex: '0' });
        const header = el('div', { className: 'premium-monster-header' }, [
          el('strong', { text: m.name }),
          el('span', { className: 'source-badge', text: m.sourceLabel })
        ]);
        const meta = el('div', { className: 'dm-monster-meta premium-monster-meta', text: `${m.type || '—'} • CR ${m.cr} • ${m.role} • ${m.environment}` });
        const stats = el('div', { className: 'dm-monster-stats premium-monster-stats', text: `AC ${m.ac} • HP ${m.hp || '?'} • XP ${m.xp || 0} • Threat ${m.threatScore}` });
        const tags = el('div', { className: 'premium-monster-tags' }, [
          el('span', { className: 'monster-tag', text: m.movementProfile }),
          el('span', { className: 'monster-tag', text: m.senseProfile }),
          el('span', { className: 'monster-tag', text: `Peak dmg ${m.estimatedDamage}` })
        ]);
        const actions = el('div', { className: 'premium-monster-actions' });
        actions.append(
          el('button', { className: 'btn btn-secondary btn-sm', text: 'Open', onclick: (e) => { e.stopPropagation(); showMonsterStatModal(m); } }),
          el('button', { className: 'btn btn-ghost btn-sm', text: '+ Encounter', onclick: (e) => { e.stopPropagation(); if (typeof addMonsterToEncounter === 'function') addMonsterToEncounter(m); } }),
          el('button', { className: 'btn btn-ghost btn-sm', text: 'Add to Map', onclick: (e) => { e.stopPropagation(); addMonsterToBattleMap(m); } })
        );
        card.append(header, meta, stats, tags, actions);
        card.addEventListener('click', () => showMonsterStatModal(m));
        card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showMonsterStatModal(m); } });
        list.appendChild(card);
      });
    };
  }

  function patchMonsterModal() {
    if (typeof showMonsterStatModal !== 'function') return;
    window.showMonsterStatModal = function showMonsterStatModalOverhauled(m, token) {
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
      const data = window.MonsterpediaEngine?.normalizeMonster ? window.MonsterpediaEngine.normalizeMonster(m) : m;
      title.textContent = data.name;
      body.replaceChildren();
      const summary = el('div', { className: 'monster-modal-summary' }, [
        el('span', { className: 'source-badge', text: data.sourceLabel || data.source || 'Core 5e' }),
        el('span', { className: 'monster-tag', text: data.type || 'Unknown' }),
        el('span', { className: 'monster-tag', text: `CR ${data.cr}` }),
        el('span', { className: 'monster-tag', text: data.tacticalRole || data.role || 'Generalist' }),
        el('span', { className: 'monster-tag', text: (data.biomes && data.biomes.join(', ')) || data.environment || 'any' })
      ]);
      if (data.combatTags?.boss) summary.appendChild(el('span', { className: 'monster-tag monster-tag-boss', text: 'Boss' }));
      if (data.combatTags?.elite) summary.appendChild(el('span', { className: 'monster-tag monster-tag-elite', text: 'Elite' }));
      if (data.combatTags?.swarm) summary.appendChild(el('span', { className: 'monster-tag monster-tag-swarm', text: 'Swarm' }));
      const grid = el('div', { className: 'monster-stat-grid premium-monster-grid' }, [
        el('span', { text: `AC ${data.ac ?? '?'}` }),
        el('span', { text: `HP ${data.hp || '?'}` }),
        el('span', { text: `Speed ${data.speed || '?'}` }),
        el('span', { text: `Peak dmg ${data.estimatedDamage || '?'}` }),
        el('span', { text: `Eff. HP ${data.effectiveHp || '?'}` }),
        el('span', { text: `${data.xp || 0} XP` })
      ]);
      body.append(summary, grid);
      if (typeof window.mountMonsterpediaOverview === 'function' && data.actionEntries) window.mountMonsterpediaOverview(body, data);
      const pushLabeledPremium = (label, text) => {
        if (!text) return;
        const base = String(label).replace(/:?\s*$/, '');
        body.appendChild(el('p', {}, [el('strong', { text: base + ': ' }), text]));
      };
      const sections = [
        ['Ability Scores', ['str','dex','con','int','wis','cha'].filter(k => data[k] != null).map(k => `${k.toUpperCase()} ${data[k]}`).join(', ')],
        ['Saving Throws', data.saves],
        ['Skills', data.skills],
        ['Senses', data.senses],
        ['Languages', data.languages],
        ['Vulnerabilities', data.vulnerabilities],
        ['Immunities', data.immunities]
      ];
      sections.forEach(([label, text]) => {
        if (!text) return;
        body.appendChild(el('p', {}, [el('strong', { text: label + ': ' }), text]));
      });
      const traitsPremium =
        window.MonsterpediaEngine?.stripSpellcastingFromTraits
          ? window.MonsterpediaEngine.stripSpellcastingFromTraits(data.traits, data.parsedSpellcasting)
          : data.traits;
      if (traitsPremium) pushLabeledPremium('Traits', traitsPremium);
      if (typeof window.mountMonsterpediaCombatBlock === 'function' && data.actionEntries) {
        window.mountMonsterpediaCombatBlock(body, data, data, pushLabeledPremium);
      } else if (data.actions) {
        pushLabeledPremium('Actions', data.actions);
      }
      addBtn.hidden = !!token;
      hpControls.hidden = !token;
      addBtn.onclick = () => { if (typeof ModalA11y !== 'undefined' && ModalA11y.closeModal) ModalA11y.closeModal(modal); else modal.hidden = true; openTokenInspector(null, data, data.npcData || null); };
      if (token) {
        const maxHp = token.maxHp ?? (window.MonsterpediaEngine?.parseHp(data.hp) || null);
        const cur = token.currentHp ?? maxHp ?? 0;
        hpDisplay.textContent = `${cur}/${maxHp ?? '?'}`;
        hpMinus.onclick = () => { token.currentHp = Math.max(0, (token.currentHp ?? cur) - 1); saveAndRenderBattleMap(); hpDisplay.textContent = `${token.currentHp}/${token.maxHp ?? maxHp ?? '?'}`; };
        hpPlus.onclick = () => { token.currentHp = Math.min(token.maxHp ?? 999, (token.currentHp ?? cur) + 1); saveAndRenderBattleMap(); hpDisplay.textContent = `${token.currentHp}/${token.maxHp ?? maxHp ?? '?'}`; };
        hpInput.onchange = () => { const v = parseInt(hpInput.value, 10); if (!isNaN(v)) { token.currentHp = Math.max(0, v); saveAndRenderBattleMap(); hpDisplay.textContent = `${token.currentHp}/${token.maxHp ?? maxHp ?? '?'}`; } hpInput.value = ''; };
      }
      if (typeof ModalA11y !== 'undefined' && ModalA11y.openModal) ModalA11y.openModal(modal, {}); else modal.hidden = false;
    };
  }

  function patchXpControls() {
    const btn = document.getElementById('xp-add-btn');
    const current = document.getElementById('xp-current');
    if (!btn || document.getElementById('xp-quick-add')) return;
    const quick = el('input', { id: 'xp-quick-add', type: 'number', min: '0', placeholder: 'XP to add', class: 'xp-quick-add' });
    btn.before(quick);
    btn.addEventListener('click', () => {
      const add = parseInt(quick.value, 10);
      if (!sessionCharacter || isNaN(add)) return;
      sessionCharacter.xp = Math.max(0, (sessionCharacter.xp || 0) + add);
      if (current) current.value = sessionCharacter.xp;
      quick.value = '';
      if (typeof saveCharacters === 'function') saveCharacters();
      if (typeof renderSessionSheet === 'function') renderSessionSheet();
    }, true);
    btn.onclick = null;
  }

  function patchTokenInspector() {
    const modal = document.getElementById('token-inspector-modal');
    if (!modal || document.getElementById('token-inspector-size')) return;
    const maxHpGroup = document.getElementById('token-inspector-max-hp')?.closest('.form-group');
    if (!maxHpGroup) return;
    const sizeGroup = el('div', { className: 'form-group' }, [
      el('label', { for: 'token-inspector-size', text: 'Size (grid cells)' }),
      el('input', { id: 'token-inspector-size', type: 'number', min: '1', max: '4', value: '1' })
    ]);
    maxHpGroup.parentElement.appendChild(sizeGroup);
    const origOpen = window.openTokenInspector;
    window.openTokenInspector = function(token, monsterData, npcData) {
      origOpen(token, monsterData, npcData);
      const sizeEl = document.getElementById('token-inspector-size');
      if (sizeEl) sizeEl.value = String(token?.size || 1);
    };
    document.getElementById('token-inspector-save')?.addEventListener('click', () => {
      const size = Math.max(1, parseInt(document.getElementById('token-inspector-size')?.value, 10) || 1);
      const token = modal._editingToken;
      if (token) token.size = size;
      else {
        setTimeout(() => {
          const last = battleMapTokens[battleMapTokens.length - 1];
          if (last) last.size = size;
        }, 0);
      }
    }, true);
  }

  afterInit(() => {
    syncWindowBridges();
    injectBuilderHintBar();
    patchCharacterList();
    patchDMMonsters();
    patchMonsterModal();
    patchXpControls();
    patchTokenInspector();
    if (typeof renderCharacterList === 'function') renderCharacterList();
    if (typeof renderDMMonsters === 'function') renderDMMonsters();
  });
})();
