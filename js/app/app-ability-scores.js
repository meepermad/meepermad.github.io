/**
 * app-ability-scores.js
 * Ability score assignment: Standard Array, Point Buy, 4d6 drop lowest.
 * Handles the Stats step (step 6) UI for choosing and assigning ability scores.
 *
 * @depends app-state (currentChar), app-char-helpers (applyRaceBonusesToStats)
 */

// ========== CONSTANTS ==========

/** Standard Array: fixed values to assign to stats (15, 14, 13, 12, 10, 8) */
const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

/** Point buy cost per ability score value (8–15) */
const POINT_BUY_COSTS = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };

/** Total points available for point buy */
const POINT_BUY_TOTAL = 27;

// ========== ROLL ASSIGNMENT STATE ==========
// Used when user rolls 4d6 or uses Standard Array; tracks which values go to which stat

/** Last rolled/assigned values (6 numbers) */
let lastRolledValues = [];

/** Per-roll details for 4d6 visualization (dice, dropped, kept, total) */
let lastRollDetails = [];

// ========== STANDARD ARRAY ==========

/**
 * Apply Standard Array and show assignment UI.
 * User picks which value goes to which stat.
 */
function applyStandardArray() {
  lastRolledValues = [...STANDARD_ARRAY];
  const ui = document.getElementById('roll-assign-ui');
  const grid = document.getElementById('roll-assign-grid');
  const rolledEl = document.getElementById('roll-assign-rolled');
  const visualEl = document.getElementById('roll-4d6-visual');
  document.getElementById('point-buy-ui').hidden = true;
  if (!ui || !grid) return;
  if (visualEl) visualEl.replaceChildren();
  if (rolledEl) rolledEl.textContent = 'Standard Array: ' + STANDARD_ARRAY.join(', ');
  const statOrder = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
  const statLabels = { strength: 'STR', dexterity: 'DEX', constitution: 'CON', intelligence: 'INT', wisdom: 'WIS', charisma: 'CHA' };
  const d = typeof DomUtils !== 'undefined' ? DomUtils : null;
  if (d && d.clearChildren) d.clearChildren(grid);
  else grid.replaceChildren();
  statOrder.forEach(stat => {
    const row = d
      ? d.createElement('div', { className: 'roll-assign-row' }, [
        d.createElement('span', { className: 'roll-stat-label', textContent: statLabels[stat] })
      ])
      : (() => {
        const r = document.createElement('div');
        r.className = 'roll-assign-row';
        const lab = document.createElement('span');
        lab.className = 'roll-stat-label';
        lab.textContent = statLabels[stat];
        r.appendChild(lab);
        return r;
      })();
    const sel = d
      ? d.createElement('select', { className: 'roll-assign-select', dataset: { stat } })
      : (() => {
        const s = document.createElement('select');
        s.className = 'roll-assign-select';
        s.dataset.stat = stat;
        return s;
      })();
    if (d && d.setSelectOptions) {
      d.setSelectOptions(sel, [
        { value: '', label: '— Choose —' },
        ...lastRolledValues.map((v, i) => ({ value: String(i), label: String(v) }))
      ]);
    }
    row.appendChild(sel);
    grid.appendChild(row);
  });
  grid.querySelectorAll('.roll-assign-select').forEach(sel => {
    sel.addEventListener('change', () => updateRollAssignOptions());
  });
  ui.hidden = false;
}

// ========== POINT BUY ==========

/**
 * Open Point Buy UI. User adjusts each stat 8–15; total cost must not exceed 27.
 */
function openPointBuy() {
  document.getElementById('roll-assign-ui').hidden = true;
  const ui = document.getElementById('point-buy-ui');
  const grid = document.getElementById('point-buy-grid');
  if (!ui || !grid) return;
  const statOrder = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
  const statLabels = { strength: 'STR', dexterity: 'DEX', constitution: 'CON', intelligence: 'INT', wisdom: 'WIS', charisma: 'CHA' };
  const d = typeof DomUtils !== 'undefined' ? DomUtils : null;
  if (d && d.clearChildren) d.clearChildren(grid);
  else grid.replaceChildren();
  statOrder.forEach(stat => {
    const row = d
      ? d.createElement('div', { className: 'point-buy-row', dataset: { stat } }, [
        d.createElement('span', { className: 'roll-stat-label', textContent: statLabels[stat] }),
        d.createElement('button', { type: 'button', className: 'btn btn-sm btn-secondary pb-minus', dataset: { stat }, textContent: '−' }),
        d.createElement('span', { className: 'pb-value', id: `pb-${stat}`, textContent: '8' }),
        d.createElement('button', { type: 'button', className: 'btn btn-sm btn-secondary pb-plus', dataset: { stat }, textContent: '+' }),
        d.createElement('span', { className: 'pb-cost', id: `pb-cost-${stat}`, textContent: '(0 pts)' })
      ])
      : (() => {
        const r = document.createElement('div');
        r.className = 'point-buy-row';
        r.dataset.stat = stat;
        const lab = document.createElement('span');
        lab.className = 'roll-stat-label';
        lab.textContent = statLabels[stat];
        const b1 = document.createElement('button');
        b1.type = 'button';
        b1.className = 'btn btn-sm btn-secondary pb-minus';
        b1.dataset.stat = stat;
        b1.textContent = '−';
        const pv = document.createElement('span');
        pv.className = 'pb-value';
        pv.id = `pb-${stat}`;
        pv.textContent = '8';
        const b2 = document.createElement('button');
        b2.type = 'button';
        b2.className = 'btn btn-sm btn-secondary pb-plus';
        b2.dataset.stat = stat;
        b2.textContent = '+';
        const pc = document.createElement('span');
        pc.className = 'pb-cost';
        pc.id = `pb-cost-${stat}`;
        pc.textContent = '(0 pts)';
        r.append(lab, b1, pv, b2, pc);
        return r;
      })();
    grid.appendChild(row);
  });

  const values = {};
  statOrder.forEach(s => values[s] = 8);

  const updatePointBuy = () => {
    let spent = 0;
    statOrder.forEach(s => {
      const cost = POINT_BUY_COSTS[values[s]] || 0;
      spent += cost;
      document.getElementById(`pb-${s}`).textContent = values[s];
      document.getElementById(`pb-cost-${s}`).textContent = `(${cost} pts)`;
    });
    document.getElementById('point-buy-remaining').textContent = POINT_BUY_TOTAL - spent;
    grid.querySelectorAll('.pb-minus').forEach(btn => {
      btn.disabled = values[btn.dataset.stat] <= 8;
    });
    grid.querySelectorAll('.pb-plus').forEach(btn => {
      const s = btn.dataset.stat;
      const newVal = values[s] + 1;
      if (newVal > 15 || POINT_BUY_COSTS[newVal] === undefined) { btn.disabled = true; return; }
      const addedCost = POINT_BUY_COSTS[newVal] - (POINT_BUY_COSTS[values[s]] || 0);
      btn.disabled = spent + addedCost > POINT_BUY_TOTAL;
    });
  };

  grid.querySelectorAll('.pb-minus').forEach(btn => {
    btn.addEventListener('click', () => {
      if (values[btn.dataset.stat] > 8) { values[btn.dataset.stat]--; updatePointBuy(); }
    });
  });
  grid.querySelectorAll('.pb-plus').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = btn.dataset.stat;
      const newVal = values[s] + 1;
      if (newVal <= 15) {
        const addedCost = (POINT_BUY_COSTS[newVal] || 0) - (POINT_BUY_COSTS[values[s]] || 0);
        let spent = 0;
        statOrder.forEach(k => spent += POINT_BUY_COSTS[values[k]] || 0);
        if (spent + addedCost <= POINT_BUY_TOTAL) { values[s] = newVal; updatePointBuy(); }
      }
    });
  });

  document.getElementById('point-buy-apply').onclick = () => {
    currentChar.stats = applyRaceBonusesToStats({ ...values });
    Object.keys(currentChar.stats).forEach(k => {
      currentChar.stats[k] = Math.max(1, Math.min(30, currentChar.stats[k]));
    });
    ui.hidden = true;
    renderStatsStep(true);
    updatePreview();
  };

  updatePointBuy();
  ui.hidden = false;
}

// ========== 4D6 DROP LOWEST ==========

/**
 * Roll 4d6 drop lowest for each of 6 stats, then show assignment UI.
 * Visualizes dice rolls (dropped vs kept).
 */
function roll4d6DropLowest() {
  document.getElementById('point-buy-ui').hidden = true;
  lastRollDetails = [];
  lastRolledValues = [];
  for (let i = 0; i < 6; i++) {
    const dice = [1,2,3,4].map(() => Math.floor(Math.random() * 6) + 1);
    const sorted = [...dice].sort((a, b) => a - b);
    const dropped = sorted[0];
    const kept = sorted.slice(1);
    const total = kept.reduce((s, v) => s + v, 0);
    lastRollDetails.push({ dice, sorted, dropped, kept, total });
    lastRolledValues.push(total);
  }
  const ui = document.getElementById('roll-assign-ui');
  const grid = document.getElementById('roll-assign-grid');
  const rolledEl = document.getElementById('roll-assign-rolled');
  const visualEl = document.getElementById('roll-4d6-visual');
  if (!ui || !grid) return;

  if (visualEl) {
    const du = typeof DomUtils !== 'undefined' ? DomUtils : null;
    visualEl.replaceChildren();
    lastRollDetails.forEach((r, i) => {
      const setRow = du
        ? du.createElement('div', { className: 'roll-4d6-set' })
        : document.createElement('div');
      if (!du) setRow.className = 'roll-4d6-set';
      const label = du
        ? du.createElement('span', { className: 'roll-set-label', textContent: `Roll ${i + 1}:` })
        : (() => { const s = document.createElement('span'); s.className = 'roll-set-label'; s.textContent = `Roll ${i + 1}:`; return s; })();
      setRow.appendChild(label);
      const group = du
        ? du.createElement('div', { className: 'roll-dice-group' })
        : (() => { const g = document.createElement('div'); g.className = 'roll-dice-group'; return g; })();
      r.sorted.forEach((die, idx) => {
        const cls = `roll-die ${idx === 0 ? 'roll-die-dropped' : 'roll-die-kept'}`;
        group.appendChild(du ? du.createElement('span', { className: cls, textContent: String(die) }) : (() => {
          const sp = document.createElement('span');
          sp.className = cls;
          sp.textContent = String(die);
          return sp;
        })());
      });
      setRow.appendChild(group);
      const totalSpan = du ? du.createElement('span', { className: 'roll-set-total' }) : document.createElement('span');
      if (!du) totalSpan.className = 'roll-set-total';
      totalSpan.appendChild(document.createTextNode('= '));
      const strong = document.createElement('strong');
      strong.textContent = String(r.total);
      totalSpan.appendChild(strong);
      setRow.appendChild(totalSpan);
      visualEl.appendChild(setRow);
    });
  }

  if (rolledEl) rolledEl.textContent = 'Totals: ' + lastRolledValues.join(', ');
  const statOrder = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
  const statLabels = { strength: 'STR', dexterity: 'DEX', constitution: 'CON', intelligence: 'INT', wisdom: 'WIS', charisma: 'CHA' };
  const d2 = typeof DomUtils !== 'undefined' ? DomUtils : null;
  if (d2 && d2.clearChildren) d2.clearChildren(grid);
  else grid.replaceChildren();
  statOrder.forEach(stat => {
    const row = d2
      ? d2.createElement('div', { className: 'roll-assign-row' }, [
        d2.createElement('span', { className: 'roll-stat-label', textContent: statLabels[stat] })
      ])
      : (() => {
        const r = document.createElement('div');
        r.className = 'roll-assign-row';
        const lab = document.createElement('span');
        lab.className = 'roll-stat-label';
        lab.textContent = statLabels[stat];
        r.appendChild(lab);
        return r;
      })();
    const sel = d2
      ? d2.createElement('select', { className: 'roll-assign-select', dataset: { stat } })
      : (() => {
        const s = document.createElement('select');
        s.className = 'roll-assign-select';
        s.dataset.stat = stat;
        return s;
      })();
    if (d2 && d2.setSelectOptions) {
      d2.setSelectOptions(sel, [
        { value: '', label: '— Choose —' },
        ...lastRolledValues.map((v, i) => ({ value: String(i), label: `Roll ${i + 1}: ${v}` }))
      ]);
    }
    row.appendChild(sel);
    grid.appendChild(row);
  });
  grid.querySelectorAll('.roll-assign-select').forEach(sel => {
    sel.addEventListener('change', () => updateRollAssignOptions());
  });
  ui.hidden = false;
}

/**
 * Update roll assignment dropdowns: disable already-used options in other selects.
 */
function updateRollAssignOptions() {
  const grid = document.getElementById('roll-assign-grid');
  if (!grid) return;
  const used = new Set();
  grid.querySelectorAll('.roll-assign-select').forEach(sel => {
    const v = sel.value;
    if (v !== '') used.add(parseInt(v));
  });
  grid.querySelectorAll('.roll-assign-select').forEach(sel => {
    Array.from(sel.options).forEach((opt, i) => {
      if (i === 0) return;
      const idx = parseInt(opt.value);
      opt.disabled = used.has(idx) && sel.value !== String(idx);
    });
  });
}

/**
 * Apply roll assignments to currentChar.stats and close UI.
 * Validates that each roll is assigned exactly once.
 */
function applyRollAssignments() {
  const grid = document.getElementById('roll-assign-grid');
  if (!grid) return;
  const base = {};
  const used = new Set();
  grid.querySelectorAll('.roll-assign-select').forEach(sel => {
    const stat = sel.dataset.stat;
    const idx = parseInt(sel.value);
    if (sel.value !== '' && idx >= 0 && idx < lastRolledValues.length && !used.has(idx)) {
      base[stat] = lastRolledValues[idx];
      used.add(idx);
    }
  });
  if (Object.keys(base).length !== 6) {
    alert('Assign each roll to exactly one stat. Each roll can only be used once.');
    return;
  }
  currentChar.stats = applyRaceBonusesToStats({ ...base });
  Object.keys(currentChar.stats).forEach(k => {
    currentChar.stats[k] = Math.max(1, Math.min(30, currentChar.stats[k]));
  });
  document.getElementById('roll-assign-ui').hidden = true;
  renderStatsStep(true);
  updatePreview();
}
