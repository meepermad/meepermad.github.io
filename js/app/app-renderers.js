(function (global) {
  'use strict';

  const d = global.DomUtils || {};
  const create = d.createElement || function(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (v == null) return;
      if (k === 'className') el.className = v;
      else if (k === 'textContent') el.textContent = v;
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k === 'style') Object.assign(el.style, v);
      else el.setAttribute(k, String(v));
    });
    [].concat(children || []).forEach((child) => {
      if (child == null) return;
      if (typeof child === 'string') el.appendChild(document.createTextNode(child));
      else el.appendChild(child);
    });
    return el;
  };
  const clear = d.clearChildren || function (el) { if (el) el.replaceChildren(); };
  const setSelectOptions = d.setSelectOptions || function (select, options, cfg = {}) {
    if (!select) return;
    clear(select);
    (options || []).forEach((opt) => {
      const option = document.createElement('option');
      option.value = String(opt.value ?? '');
      option.textContent = String(opt.label ?? opt.value ?? '');
      if (cfg.selected != null && String(cfg.selected) === option.value) option.selected = true;
      select.appendChild(option);
    });
  };
  const text = (v) => String(v ?? '');

  function makeButton(label, className, onClick, attrs = {}) {
    const btn = create('button', Object.assign({ type: 'button', className, textContent: label }, attrs));
    if (typeof onClick === 'function') btn.addEventListener('click', onClick);
    return btn;
  }

  function makeBadge(label, className = '') {
    return create('span', { className: `source-badge ${className}`.trim(), textContent: label });
  }

  function renderCharacterCards(container, characters, handlers = {}) {
    if (!container) return;
    clear(container);
    (characters || []).forEach((c) => {
      const totalLvl = (c.level || 1) + (c.multiclass || []).reduce((s, m) => s + (m.level || 0), 0);
      const classStr = c.class ? (c.class + (c.subclass ? ` — ${c.subclass}` : '')) : '—';
      const multiStr = (c.multiclass || []).length ? ' / ' + (c.multiclass || []).map((m) => `${m.name} ${m.level}`).join(', ') : '';
      const editionLabel = (c.edition === '5.5e') ? '2024' : '5e';
      const ready = !!(c.name && c.race && c.class);
      const card = create('div', { className: 'character-card', dataset: { id: c.id } });
      const header = create('div', { className: 'character-card-header' });
      const title = create('h3');
      title.append(document.createTextNode(c.name || 'Unnamed Character'));
      title.appendChild(create('span', { className: 'edition-badge', textContent: editionLabel }));
      header.appendChild(title);
      const body = create('div', { className: 'character-card-body' });
      const rows = [
        ['Class', `${classStr}${multiStr}`],
        ['Level', String(totalLvl)],
        ['Race', c.race ? `${c.race}${c.subrace ? ` (${c.subrace})` : ''}` : '—']
      ];
      if (c.background) rows.push(['Background', c.background]);
      rows.forEach(([label, value]) => {
        const row = create('div', { className: 'character-info-row' });
        row.append(
          create('span', { className: 'info-label', textContent: `${label}:` }),
          create('span', { textContent: value })
        );
        body.appendChild(row);
      });
      body.appendChild(create('div', { className: `character-status-pill ${ready ? 'is-ready' : 'is-draft'}`, textContent: ready ? 'Table-ready' : 'In progress' }));
      const actions = create('div', { className: 'character-card-actions' });
      actions.append(
        makeButton('Play', 'btn-icon btn-play', () => handlers.onPlay && handlers.onPlay(c)),
        makeButton('Edit', 'btn-icon btn-edit', () => handlers.onEdit && handlers.onEdit(c)),
        makeButton('Copy', 'btn-icon btn-duplicate', () => handlers.onDuplicate && handlers.onDuplicate(c), { title: 'Duplicate character' }),
        makeButton('Delete', 'btn-icon btn-danger btn-delete', () => handlers.onDelete && handlers.onDelete(c))
      );
      card.append(header, body, actions);
      container.appendChild(card);
    });
  }

  function renderDMNPCList(container, npcs, handlers = {}) {
    if (!container) return;
    clear(container);
    if (!(npcs || []).length) {
      container.appendChild(create('p', { className: 'dm-empty', textContent: 'No NPCs yet — use Add NPC to sketch a quick stat line.' }));
      return;
    }
    (npcs || []).forEach((n, i) => {
      const item = create('div', { className: 'dm-list-item dm-npc-item', dataset: { idx: i } });
      const header = create('div', { className: 'dm-npc-header' }, [create('strong', { textContent: n.name || 'Unnamed' })]);
      if (n.role) header.appendChild(create('span', { className: 'dm-npc-role', textContent: n.role }));
      item.appendChild(header);
      if (n.notes) item.appendChild(create('p', { className: 'dm-npc-notes', textContent: `${(n.notes || '').slice(0, 80)}${(n.notes || '').length > 80 ? '…' : ''}` }));
      const actions = create('div', { className: 'dm-npc-actions' });
      actions.append(
        makeButton('Edit', 'btn btn-secondary btn-sm dm-npc-edit', () => handlers.onEdit && handlers.onEdit(i)),
        makeButton('Add to Map', 'btn btn-primary btn-sm dm-npc-to-map', () => handlers.onAddToMap && handlers.onAddToMap(i)),
        makeButton('×', 'btn btn-ghost btn-sm dm-npc-delete', () => handlers.onDelete && handlers.onDelete(i), { title: 'Delete NPC' })
      );
      item.appendChild(actions);
      container.appendChild(item);
    });
  }

  function renderDMMonsterList(container, filtered, handlers = {}) {
    if (!container) return;
    clear(container);
    if (!(filtered || []).length) {
      container.appendChild(create('p', { className: 'dm-empty', textContent: 'No monsters match your search. Try a different filter.' }));
      return;
    }
    (filtered || []).forEach((m, idx) => {
      const diff = handlers.getDifficulty ? handlers.getDifficulty(m.cr) : '';
      const card = create('div', { className: 'dm-monster-card', dataset: { idx }, role: 'button', tabindex: '0' });
      const titleLine = create('div', { className: 'monster-card-titleline' }, [create('strong', { textContent: m.name || 'Unnamed Monster' })]);
      if (m.source) titleLine.appendChild(makeBadge(m.source));
      const actions = create('div', { className: 'monster-card-actions' });
      if (handlers.onAddToEncounter) {
        const addBtn = makeButton('+ Encounter', 'btn btn-ghost btn-sm', () => { handlers.onAddToEncounter(m); }, { title: 'Add to encounter' });
        addBtn.addEventListener('click', (e) => e.stopPropagation());
        actions.appendChild(addBtn);
      }
      card.append(
        titleLine,
        create('span', { className: 'dm-monster-meta', textContent: `${m.type || ''} · CR ${m.cr} (${diff})` }),
        create('span', { className: 'dm-monster-stats', textContent: `AC ${m.ac} · HP ${m.hp || '?'} · ${m.xp || ''} XP` }),
        actions,
        create('span', { className: 'dm-monster-hint', textContent: 'Click for full stats · Add to map' })
      );
      const open = () => handlers.onOpen && handlers.onOpen(m);
      card.addEventListener('click', (e) => { if (!e.target.closest('.monster-card-actions')) open(); });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      });
      container.appendChild(card);
    });
  }

  function renderBattleTokenList(container, tokens, handlers = {}) {
    if (!container) return;
    clear(container);
    if (!(tokens || []).length) {
      container.appendChild(create('p', { className: 'token-list-empty', textContent: 'No miniatures on the map — Add Token to place heroes and foes.' }));
      return;
    }
    (tokens || []).forEach((t) => {
      const maxHp = t.maxHp ?? (t.monsterData && handlers.parseMonsterMaxHp ? handlers.parseMonsterMaxHp(t.monsterData.hp) : null);
      const curHp = t.currentHp ?? maxHp;
      const item = create('div', { className: 'token-list-item', dataset: { id: t.id } });
      item.appendChild(create('span', { className: 'token-color', style: { background: t.color || (handlers.defaultColor || '#999') } }));
      item.appendChild(create('span', { className: 'token-name', textContent: t.name || 'Token' }));
      if (t.notes && String(t.notes).trim()) item.appendChild(create('span', { className: 'token-notes-badge', textContent: '📝', title: t.notes }));
      if (maxHp != null) item.appendChild(create('span', { className: 'token-hp', textContent: `${curHp}/${maxHp}` }));
      item.appendChild(create('span', { className: 'token-pos', textContent: `(${t.x},${t.y})` }));
      const showQuickHp = t.monsterData != null || t.maxHp != null;
      if (showQuickHp) {
        const hpBtns = create('div', { className: 'token-hp-btns' });
        hpBtns.append(
          makeButton('−', 'hp-btn', () => handlers.onDamage && handlers.onDamage(t), { title: 'Damage' }),
          makeButton('+', 'hp-btn', () => handlers.onHeal && handlers.onHeal(t), { title: 'Heal' })
        );
        item.appendChild(hpBtns);
      }
      if (t.monsterData) item.appendChild(makeButton('📋', 'token-stats-btn', () => handlers.onStats && handlers.onStats(t), { title: 'View stats' }));
      item.append(
        makeButton('✎', 'token-edit-btn', () => handlers.onEdit && handlers.onEdit(t), { title: 'Edit' }),
        makeButton('×', 'token-delete-btn', () => handlers.onDelete && handlers.onDelete(t), { title: 'Delete' })
      );
      container.appendChild(item);
    });
  }

  function renderMonsterStatsList(container, monsters, handlers = {}) {
    if (!container) return;
    clear(container);
    if (!(monsters || []).length) {
      container.appendChild(create('p', { className: 'token-list-empty', textContent: 'The grid is clear — add creatures from the DM panel or encounter list.' }));
      return;
    }
    (monsters || []).forEach((t) => {
      const m = t.monsterData;
      const maxHp = t.maxHp ?? (handlers.parseMonsterMaxHp ? handlers.parseMonsterMaxHp(m.hp) : null);
      const curHp = t.currentHp ?? maxHp;
      const hpStr = maxHp != null ? `${curHp}/${maxHp}` : (m.hp || '?');
      const diff = handlers.getDifficulty ? handlers.getDifficulty(m.cr) : '';
      const row = create('div', { className: 'monster-stat-row', dataset: { id: t.id } });
      const header = create('div', { className: 'monster-stat-row-header' });
      header.append(
        create('strong', { textContent: t.name || m.name || 'Monster' }),
        create('span', { className: 'monster-stat-row-meta', textContent: `${m.type || ''} · CR ${m.cr} (${diff})` })
      );
      row.append(
        header,
        create('div', { className: 'monster-stat-row-quick', textContent: `AC ${m.ac} · HP ${hpStr} · ${m.speed || '?'}` })
      );
      const hpActions = create('div', { className: 'monster-stat-row-hp' });
      hpActions.append(
        makeButton('−', 'hp-btn', () => handlers.onDamage && handlers.onDamage(t), { title: 'Damage' }),
        makeButton('+', 'hp-btn', () => handlers.onHeal && handlers.onHeal(t), { title: 'Heal' })
      );
      row.append(hpActions, makeButton('📋', 'token-stats-btn', () => handlers.onStats && handlers.onStats(t), { title: 'Full stats' }));
      container.appendChild(row);
    });
  }

  function renderQuickReferenceResults(container, matches, handlers = {}) {
    if (!container) return;
    clear(container);
    if (!(matches || []).length) {
      container.appendChild(create('p', { className: 'quick-ref-empty', textContent: 'Nothing matched — try another keyword or widen the filter.' }));
      return;
    }
    (matches || []).forEach((m, idx) => {
      let card;
      if (m.type === 'monster') {
        const d = m.data;
        const line = create('div', { className: 'quick-ref-item quick-ref-monster', dataset: { idx }, role: 'button', tabindex: '0', 'aria-label': `View ${d.name} stats` });
        line.append(create('strong', { textContent: d.name || 'Monster' }));
        if (d.source) line.appendChild(makeBadge(d.source));
        line.append(document.createTextNode(` — ${d.type || ''} · CR ${d.cr ?? ''} · AC ${d.ac ?? ''} · HP ${d.hp || '?'}`));
        card = line;
      } else if (m.type === 'spell') {
        const d = m.data;
        card = create('div', { className: 'quick-ref-item quick-ref-spell', dataset: { idx }, role: 'button', tabindex: '0', 'aria-label': `View ${d.name} details` }, [
          create('strong', { textContent: d.name || 'Spell' }),
          ` — ${d.level === 0 ? 'Cantrip' : `Level ${d.level}`} · ${d.school || ''} · ${String(d.description || '').slice(0, 80)}…`
        ]);
      } else if (m.type === 'rule') {
        const d = m.data;
        card = create('div', { className: 'quick-ref-item quick-ref-rule', dataset: { idx }, role: 'button', tabindex: '0', 'aria-label': `View ${d.name}` }, [
          create('strong', { textContent: d.name || 'Rule' }),
          ` — ${d.category || 'Rules'} · ${String(d.text || '').slice(0, 60)}…`
        ]);
      } else {
        card = create('div', { className: 'quick-ref-item quick-ref-item-name', dataset: { idx }, role: 'button', tabindex: '0' }, [create('strong', { textContent: m.name || 'Item' })]);
      }
      const open = () => handlers.onSelect && handlers.onSelect(m);
      card.addEventListener('click', open);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      });
      container.appendChild(card);
    });
    if (handlers.moreText) container.appendChild(create('p', { className: 'quick-ref-more', textContent: handlers.moreText }));
  }

  /**
   * Build a spell detail card (preview sidebar, session sheet, or lookup list).
   * All text via textContent / DOM — no HTML string assembly for spell data.
   * @param {Object} spell - { name, level, school, description, higherLevel, castTime, range, duration }
   * @param {{ variant?: 'preview'|'lookup', includeHigherLevel?: boolean, cardStyle?: object }} [opts]
   */
  function buildSpellDetailCard(spell, opts = {}) {
    if (!spell) return null;
    const variant = opts.variant === 'lookup' ? 'lookup' : 'preview';
    const includeHigherLevel = opts.includeHigherLevel !== false;
    const wrap = create('div', {
      className: variant === 'lookup' ? 'spell-card' : 'spell-preview-card',
      style: opts.cardStyle || undefined
    });
    const head = create('strong');
    head.appendChild(document.createTextNode(spell.name || ''));
    head.appendChild(document.createTextNode(' — '));
    head.appendChild(document.createTextNode(spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`));
    head.appendChild(document.createTextNode(' '));
    head.appendChild(document.createTextNode(spell.school || opts.schoolFallback || ''));
    wrap.appendChild(head);
    wrap.appendChild(create('p', {
      className: variant === 'lookup' ? 'spell-desc' : 'spell-preview-desc',
      textContent: spell.description || ''
    }));
    if (includeHigherLevel && spell.higherLevel) {
      const hp = create('p', { className: 'spell-preview-higher' });
      hp.appendChild(create('strong', { textContent: 'At higher levels: ' }));
      hp.appendChild(document.createTextNode(spell.higherLevel));
      wrap.appendChild(hp);
    }
    wrap.appendChild(create('small', {
      textContent: `${spell.castTime || ''} · ${spell.range || ''} · ${spell.duration || ''}`
    }));
    return wrap;
  }

  function mountSpellPreview(container, spell, opts = {}) {
    if (!container) return;
    clear(container);
    if (!spell) {
      container.hidden = true;
      return;
    }
    const card = buildSpellDetailCard(spell, opts);
    if (card) container.appendChild(card);
    container.hidden = false;
  }

  function renderQuickReferenceDetail(container, match, handlers = {}) {
    if (!container || !match) return;
    clear(container);
    const wrap = create('div', { className: `spell-card ${match.type === 'rule' ? 'quick-ref-rule-card' : ''}` });
    if (match.type === 'monster') {
      const m = match.data;
      const diff = handlers.getDifficulty ? handlers.getDifficulty(m.cr) : '';
      wrap.append(
        create('h4', { textContent: m.name || 'Monster' }),
        create('p', { textContent: `${m.type || ''} · CR ${m.cr ?? ''} (${diff}) · ${m.xp ?? ''} XP` }),
        create('p', { textContent: `AC ${m.ac ?? '?'} · HP ${m.hp || '?'} · Speed ${m.speed || '?'}` })
      );
      [
        ['Saving Throws', m.saves], ['Skills', m.skills], ['Senses', m.senses], ['Languages', m.languages],
        ['Vulnerabilities', m.vulnerabilities], ['Immunities', m.immunities], ['Traits', m.traits], ['Actions', m.actions]
      ].forEach(([label, value]) => { if (value) wrap.appendChild(create('p', { textContent: `${label}: ${value}` })); });
    } else if (match.type === 'spell') {
      const d = match.data;
      wrap.append(
        create('strong', { textContent: `${d.name} — ${d.level === 0 ? 'Cantrip' : `Level ${d.level}`} ${d.school || ''}` }),
        create('p', { className: 'spell-desc', textContent: d.description || '' })
      );
      if (d.higherLevel) wrap.appendChild(create('p', { className: 'spell-preview-higher', textContent: `At higher levels: ${d.higherLevel}` }));
      wrap.appendChild(create('small', { textContent: `${d.castTime || ''} · ${d.range || ''} · ${d.duration || ''}` }));
    } else if (match.type === 'item') {
      wrap.append(create('strong', { textContent: match.name || 'Item' }), create('p', { textContent: 'Item — no details available.' }));
    } else if (match.type === 'rule') {
      const r = match.data;
      wrap.append(create('h4', { textContent: r.name || 'Rule' }), create('span', { className: 'quick-ref-rule-category', textContent: r.category || 'Rules' }), create('p', { className: 'rules-desc', textContent: r.text || '' }));
    }
    container.append(wrap, makeButton('← Back to search', 'btn btn-ghost btn-sm', () => handlers.onBack && handlers.onBack()));
  }

  global.AppRenderers = {
    renderCharacterCards,
    renderDMNPCList,
    renderDMMonsterList,
    renderBattleTokenList,
    renderMonsterStatsList,
    renderQuickReferenceResults,
    renderQuickReferenceDetail,
    setSelectOptions,
    buildSpellDetailCard,
    mountSpellPreview
  };
})(typeof window !== 'undefined' ? window : this);
