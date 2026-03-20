/**
 * app-quick-ref.js
 * Quick Reference search: rules, monsters, spells, items.
 * Searchable index and result rendering for the Tools > Quick Reference modal.
 *
 * @depends app-utils (esc), js/data/monsters-data.js (SRD_MONSTERS), js/data/spells.js (SPELLS), js/data/items.js (getAllItems)
 */

// ========== QUICK RULES INDEX ==========
/** Searchable D&D 5e rules index for Quick Reference. Categories: Checks, Combat, Rest, Conditions. */
const QUICK_RULES_INDEX = [
  { name: 'Ability Check', category: 'Checks', text: 'd20 + ability modifier + proficiency (if proficient). DC set by DM. Advantage = roll 2d20 take higher; Disadvantage = take lower.' },
  { name: 'Saving Throw', category: 'Checks', text: 'd20 + ability modifier + proficiency (if proficient). Used to resist spells, traps, and effects. Same DC and advantage rules as ability checks.' },
  { name: 'Skill Check', category: 'Checks', text: 'Same as ability check but uses a specific skill (e.g. Stealth, Perception). Skills are tied to abilities (Stealth=Dex, Perception=Wis).' },
  { name: 'AC (Armor Class)', category: 'Combat', text: '10 + Dex (unarmored), or armor base + Dex cap + shield. Attack hits if roll + modifiers >= target AC.' },
  { name: 'Initiative', category: 'Combat', text: 'Dexterity modifier. Roll at start of combat to determine turn order. Higher goes first.' },
  { name: 'Attack Roll', category: 'Combat', text: 'd20 + ability modifier (Str/Dex for weapons) + proficiency. Meets or beats AC to hit. Natural 20 = critical hit.' },
  { name: 'Critical Hit', category: 'Combat', text: 'Natural 20 on attack roll. Double the weapon or spell dice; add modifiers once. Not double modifiers.' },
  { name: 'Advantage', category: 'Combat', text: 'Roll 2d20, take the higher. Cancels one disadvantage. Multiple advantages = still just one extra die.' },
  { name: 'Disadvantage', category: 'Combat', text: 'Roll 2d20, take the lower. Cancels one advantage. If both advantage and disadvantage, treat as normal roll.' },
  { name: 'Short Rest', category: 'Rest', text: 'At least 1 hour. Spend Hit Dice to heal (roll + Con mod per die). Some features recharge on short rest.' },
  { name: 'Long Rest', category: 'Rest', text: 'At least 8 hours. Restore all HP, regain half Hit Dice (min 1). Most features and spell slots recharge.' },
  { name: 'Death Saves', category: 'Combat', text: 'When at 0 HP: d20 each turn. 10+ = success, 9- = failure. 3 successes = stabilize. 3 failures = death.' },
  { name: 'Blinded', category: 'Conditions', text: 'Cannot see. Auto-fail sight-based checks. Attacks have disadvantage. Attacks against you have advantage.' },
  { name: 'Charmed', category: 'Conditions', text: 'Cannot attack the charmer. Charmer has advantage on social checks against you.' },
  { name: 'Frightened', category: 'Conditions', text: 'Disadvantage on checks and attacks while source of fear is in sight. Cannot willingly move closer.' },
  { name: 'Grappled', category: 'Conditions', text: 'Speed 0. Ends if grappler incapacitated or moved apart.' },
  { name: 'Incapacitated', category: 'Conditions', text: 'Cannot take actions or reactions.' },
  { name: 'Invisible', category: 'Conditions', text: 'Cannot be seen without special sense. Attacks against you have disadvantage; yours have advantage.' },
  { name: 'Paralyzed', category: 'Conditions', text: 'Incapacitated. Auto-fail Str/Dex saves. Attacks from within 5 ft. are critical hits.' },
  { name: 'Poisoned', category: 'Conditions', text: 'Disadvantage on attack rolls and ability checks.' },
  { name: 'Prone', category: 'Conditions', text: 'Disadvantage on attacks. Attacks from within 5 ft. have advantage; beyond have disadvantage. Half movement to stand.' },
  { name: 'Restrained', category: 'Conditions', text: 'Speed 0. Disadvantage on attacks and Dex saves. Attacks against you have advantage. Cannot benefit from speed bonuses.' },
  { name: 'Stunned', category: 'Conditions', text: 'Incapacitated. Auto-fail Str/Dex saves. Cannot move. Attacks against you have advantage.' },
  { name: 'Unconscious', category: 'Conditions', text: 'Incapacitated, prone. Drop held items. Auto-fail Str/Dex saves. Attacks from 5 ft. are critical hits.' },
  { name: 'Proficiency Bonus', category: 'Combat', text: '+2 at levels 1–4, +3 at 5–8, +4 at 9–12, +5 at 13–16, +6 at 17–20.' },
  { name: 'Passive Perception', category: 'Checks', text: '10 + Perception modifier. Used when not actively searching; represents general awareness.' }
];

// ========== QUICK REFERENCE RENDERING ==========

/**
 * Render Quick Reference search results (rules, monsters, spells, items).
 * Uses AppRenderers if available; otherwise falls back to basic rendering.
 *
 * @param {string} q - Search query (optional, empty = show all)
 */
function renderQuickReference(q) {
  const results = document.getElementById('quick-ref-results');
  const filter = document.getElementById('quick-ref-filter')?.value || '';
  if (!results) return;
  const query = (q || '').toLowerCase().trim();
  const matches = [];
  if ((!filter || filter === 'rules') && typeof QUICK_RULES_INDEX !== 'undefined') {
    QUICK_RULES_INDEX.forEach(r => {
      if (!query || r.name.toLowerCase().includes(query) || (r.category || '').toLowerCase().includes(query) || (r.text || '').toLowerCase().includes(query)) {
        matches.push({ type: 'rule', name: r.name, data: r });
      }
    });
  }
  if ((!filter || filter === 'monsters') && typeof SRD_MONSTERS !== 'undefined') {
    SRD_MONSTERS.forEach(m => {
      if (!query || m.name.toLowerCase().includes(query) || (m.type || '').toLowerCase().includes(query) || String(m.cr).includes(query)) {
        matches.push({ type: 'monster', name: m.name, data: m });
      }
    });
  }
  if ((!filter || filter === 'spells') && typeof SPELLS !== 'undefined') {
    SPELLS.forEach(s => {
      if (!query || (s.name || '').toLowerCase().includes(query) || (s.school || '').toLowerCase().includes(query) || String(s.level).includes(query)) {
        matches.push({ type: 'spell', name: s.name, data: s });
      }
    });
  }
  if ((!filter || filter === 'items') && typeof getAllItems === 'function') {
    (getAllItems() || []).forEach(i => {
      if (!query || String(i).toLowerCase().includes(query)) {
        matches.push({ type: 'item', name: i, data: i });
      }
    });
  }
  matches.sort((a, b) => a.name.localeCompare(b.name));
  const limit = 50;
  const slice = matches.slice(0, limit);
  if (typeof AppRenderers !== 'undefined' && AppRenderers.renderQuickReferenceResults) {
    AppRenderers.renderQuickReferenceResults(results, slice, {
      onSelect: handleQuickRefClick,
      moreText: matches.length > limit ? `Showing ${limit} of ${matches.length}. Refine search.` : ''
    });
    return;
  }
  results.replaceChildren();
}

/**
 * Handle click on a Quick Reference result - show detail view.
 * Renders monster/spell/item/rule detail; AppRenderers used if available.
 *
 * @param {Object} match - { type, name, data } from search results
 */
function handleQuickRefClick(match) {
  const results = document.getElementById('quick-ref-results');
  if (!results) return;
  if (typeof AppRenderers !== 'undefined' && AppRenderers.renderQuickReferenceDetail) {
    AppRenderers.renderQuickReferenceDetail(results, match, {
      getDifficulty: typeof getCrDifficulty === 'function' ? getCrDifficulty : () => '',
      onBack: () => {
        const q = document.getElementById('quick-ref-search')?.value || '';
        if (typeof renderQuickReference === 'function') renderQuickReference(q);
      }
    });
    return;
  }
  const d = typeof DomUtils !== 'undefined' ? DomUtils : null;
  const goBack = () => {
    const q = document.getElementById('quick-ref-search')?.value || '';
    if (typeof renderQuickReference === 'function') renderQuickReference(q);
  };
  if (!d || !d.createElement) return;
  d.clearChildren(results);
  if (match.type === 'monster') {
    const m = match.data;
    const diff = typeof getCrDifficulty === 'function' ? getCrDifficulty(m.cr) : '';
    const card = d.createElement('div', { className: 'spell-card monster-quick-ref' });
    card.appendChild(d.createElement('h4', { textContent: m.name || 'Monster' }));
    card.appendChild(d.createElement('p', { textContent: `${m.type || ''} · CR ${m.cr ?? ''} (${diff}) · ${m.xp ?? ''} XP`.replace(/\s+/g, ' ').trim() }));
    card.appendChild(d.createElement('p', { textContent: `AC ${m.ac ?? '?'} · HP ${m.hp || '?'} · Speed ${m.speed || '?'}` }));
    const stats = [];
    if (m.str != null) stats.push(`STR ${m.str}`);
    if (m.dex != null) stats.push(`DEX ${m.dex}`);
    if (m.con != null) stats.push(`CON ${m.con}`);
    if (m.int != null) stats.push(`INT ${m.int}`);
    if (m.wis != null) stats.push(`WIS ${m.wis}`);
    if (m.cha != null) stats.push(`CHA ${m.cha}`);
    if (stats.length) card.appendChild(d.createElement('p', { textContent: `Ability Scores: ${stats.join(', ')}` }));
    if (m.saves) card.appendChild(d.createElement('p', { textContent: `Saving Throws: ${m.saves}` }));
    if (m.skills) card.appendChild(d.createElement('p', { textContent: `Skills: ${m.skills}` }));
    if (m.senses) card.appendChild(d.createElement('p', { textContent: `Senses: ${m.senses}` }));
    if (m.languages) card.appendChild(d.createElement('p', { textContent: `Languages: ${m.languages}` }));
    if (m.vulnerabilities) card.appendChild(d.createElement('p', { textContent: `Vulnerabilities: ${m.vulnerabilities}` }));
    if (m.immunities) card.appendChild(d.createElement('p', { textContent: `Immunities: ${m.immunities}` }));
    if (m.traits) card.appendChild(d.createElement('p', { textContent: `Traits: ${m.traits}` }));
    if (m.actions) card.appendChild(d.createElement('p', { textContent: `Actions: ${m.actions}` }));
    results.appendChild(card);
  } else if (match.type === 'spell') {
    const spellCard = typeof AppRenderers !== 'undefined' && AppRenderers.buildSpellDetailCard
      ? AppRenderers.buildSpellDetailCard(match.data, { variant: 'lookup', cardStyle: { marginTop: 0 } })
      : null;
    if (spellCard) results.appendChild(spellCard);
  } else if (match.type === 'item') {
    const card = d.createElement('div', { className: 'spell-card' });
    card.appendChild(d.createElement('strong', { textContent: match.name || 'Item' }));
    card.appendChild(d.createElement('p', { textContent: 'Item — no details available.' }));
    results.appendChild(card);
  } else if (match.type === 'rule') {
    const r = match.data;
    const card = d.createElement('div', { className: 'spell-card quick-ref-rule-card' });
    card.appendChild(d.createElement('h4', { textContent: r.name || 'Rule' }));
    card.appendChild(d.createElement('span', { className: 'quick-ref-rule-category', textContent: r.category || 'Rules' }));
    card.appendChild(d.createElement('p', { className: 'rules-desc', textContent: r.text || '' }));
    results.appendChild(card);
  }
  const back = d.createElement('button', { type: 'button', className: 'btn btn-ghost btn-sm', id: 'quick-ref-back', textContent: '← Back to search' });
  back.addEventListener('click', goBack);
  results.appendChild(back);
}
