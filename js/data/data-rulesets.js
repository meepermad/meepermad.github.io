/**
 * D&D 5e Rule Sets - PHB, Basic 2018, PHB 2024
 * Filters which races, classes, backgrounds appear in the character builder.
 */

// ========== RULE SETS ==========
const RULESETS = {
  phb: {
    id: 'phb',
    name: 'Player\'s Handbook / SRD',
    edition: '5e',
    description: 'Full content from the SRD and Player\'s Handbook.',
    link: null,
    races: null,
    raceSubraces: null,
    classes: null,
    classSubclasses: null,
    backgrounds: null
  },
  basic2018: {
    id: 'basic2018',
    name: 'Basic Rules 2018',
    edition: '5e',
    description: 'Free D&D 5e introduction from Wizards of the Coast. Core races, 4 classes, 6 backgrounds.',
    link: 'https://media.wizards.com/2018/dnd/downloads/DnD_BasicRules_2018.pdf',
    races: ['Human', 'Dwarf', 'Elf', 'Halfling'],
    raceSubraces: { Elf: ['High Elf', 'Wood Elf'] },
    classes: ['Cleric', 'Fighter', 'Rogue', 'Wizard'],
    classSubclasses: {
      Cleric: ['Life Domain', 'Knowledge Domain'],
      Fighter: ['Champion'],
      Rogue: ['Thief'],
      Wizard: ['School of Evocation']
    },
    backgrounds: ['Acolyte', 'Criminal', 'Folk Hero', 'Noble', 'Sage', 'Soldier']
  },
  phb2024: {
    id: 'phb2024',
    name: 'Player\'s Handbook 2024',
    edition: '5.5e',
    description: '2024 revised rules. Updated species, classes, and character creation.',
    link: null,
    races: null,
    raceSubraces: null,
    classes: null,
    classSubclasses: null,
    backgrounds: null
  }
};

/**
 * Get single active ruleset (legacy). Returns ruleset object by ID from localStorage.
 * @returns {Object} Active ruleset (phb, basic2018, or phb2024)
 */
function getActiveRuleset() {
  const id = localStorage.getItem('dnd_ruleset') || 'phb';
  return RULESETS[id] || RULESETS.phb;
}

function setActiveRuleset(id) {
  if (RULESETS[id]) {
    localStorage.setItem('dnd_ruleset', id);
    return true;
  }
  return false;
}

/**
 * Get enabled ruleset IDs. Multiple rule books can be active for combined content.
 * @returns {string[]} Array of ruleset IDs (e.g. ['phb', 'phb2024'])
 */
function getEnabledRulesets() {
  try {
    const saved = localStorage.getItem('dnd_enabled_rulesets');
    if (saved) {
      const arr = JSON.parse(saved);
      if (Array.isArray(arr) && arr.length > 0) return arr;
    }
    const legacy = localStorage.getItem('dnd_ruleset');
    if (legacy && RULESETS[legacy]) return [legacy];
  } catch (e) {}
  return ['phb'];
}

function setEnabledRulesets(ids) {
  if (Array.isArray(ids)) {
    localStorage.setItem('dnd_enabled_rulesets', JSON.stringify(ids));
    return true;
  }
  return false;
}

function toggleRuleset(id) {
  const current = getEnabledRulesets();
  const idx = current.indexOf(id);
  if (idx >= 0) {
    if (current.length === 1) return false; // keep at least one
    current.splice(idx, 1);
  } else {
    current.push(id);
  }
  setEnabledRulesets(current);
  return true;
}

function getMergedRulesetFilter() {
  const enabled = getEnabledRulesets();
  const rulesets = enabled.map(id => RULESETS[id]).filter(Boolean);
  if (rulesets.length === 0) return { races: null, classes: null, backgrounds: null, raceSubraces: null, classSubclasses: null };
  const hasUnrestrictedRaces = rulesets.some(r => !r.races);
  const hasUnrestrictedClasses = rulesets.some(r => !r.classes);
  const hasUnrestrictedBackgrounds = rulesets.some(r => !r.backgrounds);
  return {
    races: hasUnrestrictedRaces ? null : [...new Set(rulesets.flatMap(r => r.races || []))],
    classes: hasUnrestrictedClasses ? null : [...new Set(rulesets.flatMap(r => r.classes || []))],
    backgrounds: hasUnrestrictedBackgrounds ? null : [...new Set(rulesets.flatMap(r => r.backgrounds || []))],
    raceSubraces: mergeRaceSubraces(rulesets),
    classSubclasses: mergeClassSubclasses(rulesets)
  };
}

function mergeRaceSubraces(rulesets) {
  const result = {};
  const allRaces = [...new Set(rulesets.flatMap(r => Object.keys(r.raceSubraces || {})))];
  for (const race of allRaces) {
    const lists = rulesets.map(r => r.raceSubraces?.[race]).filter(Boolean);
    if (lists.some(l => !l || l.length === 0)) continue;
    result[race] = [...new Set(lists.flat())];
  }
  const hasAnyUnrestricted = rulesets.some(r => !r.raceSubraces || Object.keys(r.raceSubraces || {}).length === 0);
  return hasAnyUnrestricted ? null : (Object.keys(result).length ? result : null);
}

function mergeClassSubclasses(rulesets) {
  const result = {};
  const allClasses = [...new Set(rulesets.flatMap(r => Object.keys(r.classSubclasses || {})))];
  for (const cls of allClasses) {
    const lists = rulesets.map(r => r.classSubclasses?.[cls]).filter(Boolean);
    if (lists.some(l => !l || l.length === 0)) continue;
    result[cls] = [...new Set(lists.flat())];
  }
  const hasAnyUnrestricted = rulesets.some(r => !r.classSubclasses || Object.keys(r.classSubclasses || {}).length === 0);
  return hasAnyUnrestricted ? null : (Object.keys(result).length ? result : null);
}
