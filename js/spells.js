/**
 * D&D 5e Spell Data (SRD)
 * Level 0 = Cantrip. Provides spell slots, spells known, prepared limits, and spell list.
 */

// ========== SPELL SLOTS ==========
// [cantrips, 1st, 2nd, ... 9th] per character level
const SPELL_SLOTS_BY_LEVEL = {
  1: [2, 0, 0, 0, 0, 0, 0, 0, 0],
  2: [3, 0, 0, 0, 0, 0, 0, 0, 0],
  3: [4, 2, 0, 0, 0, 0, 0, 0, 0],
  4: [4, 3, 0, 0, 0, 0, 0, 0, 0],
  5: [4, 3, 2, 0, 0, 0, 0, 0, 0],
  6: [4, 3, 3, 0, 0, 0, 0, 0, 0],
  7: [4, 3, 3, 1, 0, 0, 0, 0, 0],
  8: [4, 3, 3, 2, 0, 0, 0, 0, 0],
  9: [4, 3, 3, 3, 1, 0, 0, 0, 0],
  10: [4, 3, 3, 3, 2, 0, 0, 0, 0],
  11: [4, 3, 3, 3, 2, 1, 0, 0, 0],
  12: [4, 3, 3, 3, 2, 1, 0, 0, 0],
  13: [4, 3, 3, 3, 2, 1, 1, 0, 0],
  14: [4, 3, 3, 3, 2, 1, 1, 0, 0],
  15: [4, 3, 3, 3, 2, 1, 1, 1, 0],
  16: [4, 3, 3, 3, 2, 1, 1, 1, 0],
  17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
  18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
  19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
  20: [4, 3, 3, 3, 3, 2, 2, 1, 1]
};

// ========== CHARACTER SHEET CONFIG ==========
// Default section order for overview. Class-specific overrides put important sections first.
const SECTION_ORDER_DEFAULT = ['saves', 'ability-checks', 'senses', 'skills', 'about', 'defenses', 'conditions', 'features'];
const SECTION_ORDER_BY_CLASS = {
  Artificer: ['ability-checks', 'saves', 'skills', 'senses', 'about', 'defenses', 'conditions', 'features'],
  Bard: ['ability-checks', 'saves', 'skills', 'senses', 'about', 'defenses', 'conditions', 'features'],
  Cleric: ['ability-checks', 'saves', 'senses', 'skills', 'about', 'defenses', 'conditions', 'features'],
  Druid: ['ability-checks', 'saves', 'senses', 'skills', 'about', 'defenses', 'conditions', 'features'],
  Paladin: ['saves', 'ability-checks', 'senses', 'skills', 'about', 'defenses', 'conditions', 'features'],
  Ranger: ['ability-checks', 'saves', 'senses', 'skills', 'about', 'defenses', 'conditions', 'features'],
  Sorcerer: ['ability-checks', 'saves', 'skills', 'senses', 'about', 'defenses', 'conditions', 'features'],
  Warlock: ['ability-checks', 'saves', 'skills', 'senses', 'about', 'defenses', 'conditions', 'features'],
  Wizard: ['ability-checks', 'saves', 'skills', 'senses', 'about', 'defenses', 'conditions', 'features'],
  Fighter: ['saves', 'ability-checks', 'senses', 'skills', 'about', 'defenses', 'conditions', 'features'],
  Rogue: ['ability-checks', 'saves', 'skills', 'senses', 'about', 'defenses', 'conditions', 'features'],
  Barbarian: ['saves', 'ability-checks', 'senses', 'skills', 'about', 'defenses', 'conditions', 'features'],
  Monk: ['ability-checks', 'saves', 'senses', 'skills', 'about', 'defenses', 'conditions', 'features']
};

const XP_BY_LEVEL = {
  1: 0, 2: 300, 3: 900, 4: 2700, 5: 6500, 6: 14000, 7: 23000, 8: 34000,
  9: 48000, 10: 64000, 11: 85000, 12: 100000, 13: 120000, 14: 140000,
  15: 165000, 16: 195000, 17: 225000, 18: 265000, 19: 305000, 20: 355000
};

const SPELLCASTING_CLASSES = ['Artificer', 'Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Sorcerer', 'Warlock', 'Wizard'];

// ========== SPELLS KNOWN ==========
// Spells known per level (PHB/SRD). Prepare casters use 'prepare' = level + modifier.
const SPELLS_KNOWN_BY_LEVEL = {
  Bard: { cantrips: [2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4], spells: [4,5,6,7,8,9,10,11,12,14,15,15,16,18,19,19,20,22,22,22] },
  Cleric: { cantrips: [3,3,3,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5], spells: 'prepare' },
  Druid: { cantrips: [2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4], spells: 'prepare' },
  Paladin: { cantrips: 0, spells: 'prepare' },
  Ranger: { cantrips: 0, spells: [0,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11] },
  Sorcerer: { cantrips: [4,4,4,5,5,5,6,6,6,6,6,6,6,6,6,6,6,6,6,6], spells: [2,3,4,5,6,7,8,9,10,11,12,12,13,13,14,14,15,15,15,15] },
  Warlock: { cantrips: [2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4], spells: [2,2,2,3,3,3,4,4,4,5,5,5,5,5,5,5,5,5,5,5] },
  Wizard: { cantrips: [3,3,3,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5], spells: [6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,40,42,44] },
  Artificer: { cantrips: [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2], spells: [2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11] }
};

function getSpellsForClassLevel(cls, level, subclass) {
  if (cls === 'Fighter' && subclass === 'Eldritch Knight') {
    if (level < 3) return null;
    const ekSpells = [0,0,2,3,4,5,6,8,9,10,11,13,13,13,13,13,13,13,13,13];
    return { cantrips: 2, spells: ekSpells[level - 1] ?? 13 };
  }
  if (cls === 'Rogue' && subclass === 'Arcane Trickster') {
    if (level < 3) return null;
    const atSpells = [0,0,2,3,4,5,6,8,9,10,11,13,13,13,13,13,13,13,13,13];
    return { cantrips: 2, spells: atSpells[level - 1] ?? 13 };
  }
  if (cls === 'Ranger' || cls === 'Paladin') {
    if (level < 2) return null;
    const arr = SPELLS_KNOWN_BY_LEVEL[cls]?.spells;
    const count = Array.isArray(arr) ? (arr[level - 1] ?? 0) : (cls === 'Paladin' ? 'prepare' : 0);
    return { cantrips: 0, spells: count };
  }
  const cfg = SPELLS_KNOWN_BY_LEVEL[cls];
  if (!cfg || level < 1) return null;
  const cantrips = Array.isArray(cfg.cantrips) ? (cfg.cantrips[level - 1] ?? cfg.cantrips[0]) : (cfg.cantrips ?? 0);
  const spells = Array.isArray(cfg.spells) ? (cfg.spells[level - 1] ?? cfg.spells[0]) : (cfg.spells ?? 'prepare');
  return { cantrips, spells };
}

// Returns spells available to a class. Eldritch Knight and Arcane Trickster use Wizard list. Artificer uses own list.
function getSpellsForClass(cls, subclass) {
  if (typeof SPELLS === 'undefined') return [];
  let spellClass = cls;
  if (cls === 'Fighter' && subclass === 'Eldritch Knight') spellClass = 'Wizard';
  if (cls === 'Rogue' && subclass === 'Arcane Trickster') spellClass = 'Wizard';
  if (cls === 'Artificer') return SPELLS.filter(s => (s.classes || []).includes('Artificer'));
  return SPELLS.filter(s => (s.classes || []).includes(spellClass));
}

// True if the class (and subclass) can cast spells.
function isSpellcastingClass(cls, subclass) {
  if (SPELLCASTING_CLASSES.includes(cls)) return true;
  if (cls === 'Fighter' && subclass === 'Eldritch Knight') return true;
  if (cls === 'Rogue' && subclass === 'Arcane Trickster') return true;
  return false;
}

// Max prepared spells for prepare casters (Cleric, Druid, Paladin, Wizard). Cantrips don't count.
function getPreparedSpellLimit(c) {
  if (!c) return 0;
  const cfg = typeof getSpellsForClassLevel === 'function' ? getSpellsForClassLevel(c.class, c.level || 1, c.subclass) : null;
  if (!cfg || cfg.spells !== 'prepare') return 0;
  const cls = (c.class || '').toLowerCase();
  const level = c.level || 1;
  let mod = 0;
  if (cls === 'cleric' || cls === 'druid') {
    const wis = c.stats?.wisdom ?? 10;
    mod = Math.floor((wis - 10) / 2);
  } else if (cls === 'paladin') {
    const cha = c.stats?.charisma ?? 10;
    mod = Math.floor((cha - 10) / 2);
    return Math.max(1, Math.floor(level / 2) + mod);
  } else if (cls === 'wizard') {
    const int = c.stats?.intelligence ?? 10;
    mod = Math.floor((int - 10) / 2);
  } else {
    return 0;
  }
  return Math.max(1, level + mod);
}

// ========== SPELL LIST ==========
// SRD Spells - Full list for selection. Each spell has a classes array (D&D 5e spell lists).
// Eldritch Knight and Arcane Trickster use Wizard spell list.
const SPELLS = [
  { name: 'Acid Splash', level: 0, school: 'Conjuration', castTime: '1 action', range: '60 ft', components: 'V, S', duration: 'Instantaneous', description: '1-2 creatures in 5 ft. Dex save or 1d6 acid.', classes: ['Sorcerer', 'Wizard'] },
  { name: 'Chill Touch', level: 0, school: 'Necromancy', castTime: '1 action', range: '120 ft', components: 'V, S', duration: '1 round', description: 'Ranged spell attack. 1d8 necrotic, no healing.', classes: ['Sorcerer', 'Warlock', 'Wizard'] },
  { name: 'Dancing Lights', level: 0, school: 'Evocation', castTime: '1 action', range: '120 ft', components: 'V, S, M', duration: 'Concentration, 1 min', description: 'Create up to 4 lights.', classes: ['Bard', 'Sorcerer', 'Wizard'] },
  { name: 'Fire Bolt', level: 0, school: 'Evocation', castTime: '1 action', range: '120 ft', components: 'V, S', duration: 'Instantaneous', description: 'Ranged spell attack. 1d10 fire damage.', classes: ['Sorcerer', 'Wizard'] },
  { name: 'Light', level: 0, school: 'Evocation', castTime: '1 action', range: 'Touch', components: 'V, M', duration: '1 hour', description: 'Object sheds bright light.', classes: ['Bard', 'Cleric', 'Sorcerer', 'Warlock', 'Wizard'] },
  { name: 'Mage Hand', level: 0, school: 'Conjuration', castTime: '1 action', range: '30 ft', components: 'V, S', duration: '1 minute', description: 'Create spectral hand to manipulate objects.', classes: ['Bard', 'Sorcerer', 'Warlock', 'Wizard'] },
  { name: 'Mending', level: 0, school: 'Transmutation', castTime: '1 minute', range: 'Touch', components: 'V, S, M', duration: 'Instantaneous', description: 'Repair a single break in an object.', classes: ['Artificer', 'Bard', 'Cleric', 'Druid', 'Sorcerer', 'Wizard'] },
  { name: 'Message', level: 0, school: 'Transmutation', castTime: '1 action', range: '120 ft', components: 'V, S, M', duration: '1 round', description: 'Whisper to creature within range.', classes: ['Bard', 'Sorcerer', 'Wizard'] },
  { name: 'Minor Illusion', level: 0, school: 'Illusion', castTime: '1 action', range: '30 ft', components: 'S, M', duration: '1 minute', description: 'Create sound or image.', classes: ['Bard', 'Sorcerer', 'Wizard'] },
  { name: 'Poison Spray', level: 0, school: 'Conjuration', castTime: '1 action', range: '10 ft', components: 'V, S', duration: 'Instantaneous', description: 'Con save or 1d12 poison.', classes: ['Druid', 'Sorcerer', 'Warlock', 'Wizard'] },
  { name: 'Prestidigitation', level: 0, school: 'Transmutation', castTime: '1 action', range: '10 ft', components: 'V, S', duration: 'Up to 1 hour', description: 'Minor magical trick.', classes: ['Artificer', 'Bard', 'Sorcerer', 'Warlock', 'Wizard'] },
  { name: 'Ray of Frost', level: 0, school: 'Evocation', castTime: '1 action', range: '60 ft', components: 'V, S', duration: 'Instantaneous', description: 'Ranged spell attack. 1d8 cold, -10 ft speed.', classes: ['Sorcerer', 'Wizard'] },
  { name: 'Sacred Flame', level: 0, school: 'Evocation', castTime: '1 action', range: '60 ft', components: 'V, S', duration: 'Instantaneous', description: 'Dex save or 1d8 radiant damage.', classes: ['Cleric'] },
  { name: 'Shocking Grasp', level: 0, school: 'Evocation', castTime: '1 action', range: 'Touch', components: 'V, S', duration: 'Instantaneous', description: 'Melee spell attack. 2d8 lightning, no reactions.', classes: ['Sorcerer', 'Wizard'] },
  { name: 'Thaumaturgy', level: 0, school: 'Transmutation', castTime: '1 action', range: '30 ft', components: 'V', duration: 'Up to 1 minute', description: 'Amplify voice, tremors, or flames.', classes: ['Cleric'] },
  { name: 'True Strike', level: 0, school: 'Divination', castTime: '1 action', range: '30 ft', components: 'S', duration: 'Concentration, 1 round', description: 'Advantage on next attack.', classes: ['Bard', 'Sorcerer', 'Warlock', 'Wizard'] },
  { name: 'Vicious Mockery', level: 0, school: 'Enchantment', castTime: '1 action', range: '60 ft', components: 'V', duration: 'Instantaneous', description: 'Wis save or 1d4 psychic and disadvantage.', classes: ['Bard'] },
  { name: 'Magic Missile', level: 1, school: 'Evocation', castTime: '1 action', range: '120 ft', components: 'V, S', duration: 'Instantaneous', description: '3 darts, 1d4+1 force each. +1 dart per slot above 1st.', higherLevel: '+1 dart per slot above 1st', classes: ['Artificer', 'Sorcerer', 'Wizard'] },
  { name: 'Shield', level: 1, school: 'Abjuration', castTime: '1 reaction', range: 'Self', components: 'V, S', duration: '1 round', description: '+5 AC until start of next turn.', classes: ['Sorcerer', 'Wizard'] },
  { name: 'Cure Wounds', level: 1, school: 'Evocation', castTime: '1 action', range: 'Touch', components: 'V, S', duration: 'Instantaneous', description: 'Heal 1d8 + spellcasting modifier.', higherLevel: '+1d8 per slot above 1st', classes: ['Artificer', 'Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger'] },
  { name: 'Healing Word', level: 1, school: 'Evocation', castTime: '1 bonus action', range: '60 ft', components: 'V', duration: 'Instantaneous', description: 'Heal 1d4 + modifier as bonus action.', classes: ['Bard', 'Cleric', 'Druid'] },
  { name: 'Burning Hands', level: 1, school: 'Evocation', castTime: '1 action', range: 'Self (15 ft cone)', components: 'V, S', duration: 'Instantaneous', description: 'Dex save. 3d6 fire damage.', classes: ['Sorcerer', 'Wizard'] },
  { name: 'Sleep', level: 1, school: 'Enchantment', castTime: '1 action', range: '90 ft', components: 'V, S, M', duration: '1 minute', description: '5d8 HP of creatures fall unconscious.', classes: ['Bard', 'Sorcerer', 'Wizard'] },
  { name: 'Charm Person', level: 1, school: 'Enchantment', castTime: '1 action', range: '30 ft', components: 'V, S', duration: '1 hour', description: 'Wis save or charmed.', classes: ['Bard', 'Druid', 'Sorcerer', 'Warlock', 'Wizard'] },
  { name: 'Detect Magic', level: 1, school: 'Divination', castTime: '1 action', range: 'Self', components: 'V, S', duration: 'Concentration, up to 10 min', description: 'Sense magic within 30 ft.', classes: ['Artificer', 'Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Sorcerer', 'Warlock', 'Wizard'] },
  { name: 'Identify', level: 1, school: 'Divination', castTime: '1 minute', range: 'Touch', components: 'V, S, M', duration: 'Instantaneous', description: 'Learn properties of magic item.', classes: ['Artificer', 'Bard', 'Wizard'] },
  { name: 'Bless', level: 1, school: 'Enchantment', castTime: '1 action', range: '30 ft', components: 'V, S, M', duration: 'Concentration, 1 min', description: 'Up to 3 creatures add 1d4 to attack/save.', classes: ['Cleric', 'Paladin'] },
  { name: 'Shield of Faith', level: 1, school: 'Abjuration', castTime: '1 bonus action', range: '60 ft', components: 'V, S, M', duration: 'Concentration, 10 min', description: '+2 AC to one creature.', classes: ['Cleric', 'Paladin'] },
  { name: 'Alarm', level: 1, school: 'Abjuration', castTime: '1 minute', range: '30 ft', components: 'V, S, M', duration: '8 hours', description: 'Alert when creature enters warded area.', classes: ['Ranger', 'Wizard'] },
  { name: 'Animal Friendship', level: 1, school: 'Enchantment', castTime: '1 action', range: '30 ft', components: 'V, S, M', duration: '24 hours', description: 'Wis save or beast is charmed.', classes: ['Bard', 'Druid', 'Ranger'] },
  { name: 'Armor of Agathys', level: 1, school: 'Abjuration', castTime: '1 action', range: 'Self', components: 'V, S, M', duration: '1 hour', description: '5 temp HP, 5 cold to melee attackers.', classes: ['Warlock'] },
  { name: 'Bane', level: 1, school: 'Enchantment', castTime: '1 action', range: '30 ft', components: 'V, S, M', duration: 'Concentration, 1 min', description: 'Cha save or -1d4 to attack/save.', classes: ['Bard', 'Cleric'] },
  { name: 'Color Spray', level: 1, school: 'Illusion', castTime: '1 action', range: 'Self', components: 'V, S, M', duration: '1 round', description: '6d10 HP of creatures blinded.', classes: ['Sorcerer', 'Wizard'] },
  { name: 'Command', level: 1, school: 'Enchantment', castTime: '1 action', range: '60 ft', components: 'V', duration: '1 round', description: 'Wis save or follow one-word command.', classes: ['Cleric', 'Paladin'] },
  { name: 'Comprehend Languages', level: 1, school: 'Divination', castTime: '1 action', range: 'Self', components: 'V, S, M', duration: '1 hour', description: 'Understand any language.', classes: ['Bard', 'Sorcerer', 'Warlock', 'Wizard'] },
  { name: 'Detect Poison and Disease', level: 1, school: 'Divination', castTime: '1 action', range: 'Self', components: 'V, S, M', duration: 'Concentration, 10 min', description: 'Sense poison/disease within 30 ft.', classes: ['Cleric', 'Paladin', 'Ranger'] },
  { name: 'Expeditious Retreat', level: 1, school: 'Transmutation', castTime: '1 bonus action', range: 'Self', components: 'V, S', duration: 'Concentration, 10 min', description: 'Dash as bonus action.', classes: ['Warlock', 'Wizard'] },
  { name: 'Faerie Fire', level: 1, school: 'Evocation', castTime: '1 action', range: '60 ft', components: 'V', duration: 'Concentration, 1 min', description: 'Dex save or advantage vs affected.', classes: ['Bard', 'Druid'] },
  { name: 'False Life', level: 1, school: 'Necromancy', castTime: '1 action', range: 'Self', components: 'V, S, M', duration: '1 hour', description: 'Gain 1d4+4 temp HP.', classes: ['Sorcerer', 'Warlock', 'Wizard'] },
  { name: 'Feather Fall', level: 1, school: 'Transmutation', castTime: '1 reaction', range: '60 ft', components: 'V, M', duration: '1 minute', description: 'Falling creatures fall slowly.', classes: ['Bard', 'Sorcerer', 'Wizard'] },
  { name: 'Find Familiar', level: 1, school: 'Conjuration', castTime: '1 hour', range: '10 ft', components: 'V, S, M', duration: 'Instantaneous', description: 'Summon a familiar.', classes: ['Wizard'] },
  { name: 'Fog Cloud', level: 1, school: 'Conjuration', castTime: '1 action', range: '120 ft', components: 'V, S', duration: 'Concentration, 1 hour', description: '20-ft radius heavily obscured.', classes: ['Druid', 'Ranger', 'Sorcerer', 'Wizard'] },
  { name: 'Goodberry', level: 1, school: 'Transmutation', castTime: '1 action', range: 'Touch', components: 'V, S, M', duration: '24 hours', description: '10 berries, 1 HP each.', classes: ['Druid', 'Ranger'] },
  { name: 'Grease', level: 1, school: 'Conjuration', castTime: '1 action', range: '60 ft', components: 'V, S, M', duration: '1 minute', description: '10-ft square difficult terrain.', classes: ['Wizard'] },
  { name: 'Guiding Bolt', level: 1, school: 'Evocation', castTime: '1 action', range: '120 ft', components: 'V, S', duration: '1 round', description: 'Ranged attack 4d6 radiant, advantage next.', classes: ['Cleric'] },
  { name: 'Hideous Laughter', level: 1, school: 'Enchantment', castTime: '1 action', range: '30 ft', components: 'V, S, M', duration: 'Concentration, 1 min', description: 'Wis save or incapacitated laughing.', classes: ['Bard', 'Wizard'] },
  { name: 'Illusory Script', level: 1, school: 'Illusion', castTime: '1 minute', range: 'Touch', components: 'S, M', duration: '10 days', description: 'Hide message in writing.', classes: ['Bard', 'Warlock', 'Wizard'] },
  { name: 'Longstrider', level: 1, school: 'Transmutation', castTime: '1 action', range: 'Touch', components: 'V, S, M', duration: '1 hour', description: 'Speed +10 ft.', classes: ['Artificer', 'Bard', 'Druid', 'Ranger', 'Sorcerer', 'Wizard'] },
  { name: 'Protection from Evil and Good', level: 1, school: 'Abjuration', castTime: '1 action', range: 'Touch', components: 'V, S, M', duration: 'Concentration, 10 min', description: 'Disadvantage vs creature types.', classes: ['Cleric', 'Paladin', 'Warlock', 'Wizard'] },
  { name: 'Purify Food and Drink', level: 1, school: 'Transmutation', castTime: '1 action', range: '10 ft', components: 'V, S', duration: 'Instantaneous', description: 'Purify food/drink in 5-ft cube.', classes: ['Cleric', 'Druid', 'Paladin', 'Ranger'] },
  { name: 'Sanctuary', level: 1, school: 'Abjuration', castTime: '1 bonus action', range: '30 ft', components: 'V, S, M', duration: '1 minute', description: 'Wis save to attack warded creature.', classes: ['Cleric'] },
  { name: 'Silent Image', level: 1, school: 'Illusion', castTime: '1 action', range: '60 ft', components: 'V, S, M', duration: 'Concentration, 10 min', description: 'Create silent image.', classes: ['Bard', 'Sorcerer', 'Wizard'] },
  { name: 'Tenser\'s Floating Disk', level: 1, school: 'Conjuration', castTime: '1 action', range: '30 ft', components: 'V, S, M', duration: '1 hour', description: 'Create floating 3-ft disk.', classes: ['Wizard'] },
  { name: 'Thunderwave', level: 1, school: 'Evocation', castTime: '1 action', range: 'Self', components: 'V, S', duration: 'Instantaneous', description: '15-ft cube, Con save 2d8 thunder.', classes: ['Bard', 'Druid', 'Sorcerer', 'Wizard'] },
  { name: 'Unseen Servant', level: 1, school: 'Conjuration', castTime: '1 action', range: '60 ft', components: 'V, S, M', duration: '1 hour', description: 'Invisible servant follows commands.', classes: ['Bard', 'Wizard'] },
  { name: 'Misty Step', level: 2, school: 'Conjuration', castTime: '1 bonus action', range: 'Self', components: 'V', duration: 'Instantaneous', description: 'Teleport up to 30 ft.', classes: ['Sorcerer', 'Warlock', 'Wizard'] },
  { name: 'Scorching Ray', level: 2, school: 'Evocation', castTime: '1 action', range: '120 ft', components: 'V, S', duration: 'Instantaneous', description: '3 rays, 2d6 fire each. +1 ray per slot above 2nd.', higherLevel: '+1 ray per slot above 2nd', classes: ['Sorcerer', 'Wizard'] },
  { name: 'Hold Person', level: 2, school: 'Enchantment', castTime: '1 action', range: '60 ft', components: 'V, S, M', duration: 'Concentration, 1 min', description: 'Wis save or paralyzed.', classes: ['Bard', 'Cleric', 'Druid', 'Paladin', 'Sorcerer', 'Warlock', 'Wizard'] },
  { name: 'Invisibility', level: 2, school: 'Illusion', castTime: '1 action', range: 'Touch', components: 'V, S, M', duration: 'Concentration, 1 hour', description: 'Creature becomes invisible.', classes: ['Bard', 'Sorcerer', 'Warlock', 'Wizard'] },
  { name: 'Spiritual Weapon', level: 2, school: 'Evocation', castTime: '1 bonus action', range: '60 ft', components: 'V, S', duration: '1 minute', description: 'Floating weapon attacks as bonus action.', classes: ['Cleric'] },
  { name: 'Fireball', level: 3, school: 'Evocation', castTime: '1 action', range: '150 ft', components: 'V, S, M', duration: 'Instantaneous', description: '20-ft radius, 8d6 fire. Dex save for half.', higherLevel: '+1d6 per slot above 3rd', classes: ['Sorcerer', 'Wizard'] },
  { name: 'Counterspell', level: 3, school: 'Abjuration', castTime: '1 reaction', range: '60 ft', components: 'S', duration: 'Instantaneous', description: 'Interrupt a spell of 3rd level or lower.', classes: ['Sorcerer', 'Warlock', 'Wizard'] },
  { name: 'Dispel Magic', level: 3, school: 'Abjuration', castTime: '1 action', range: '120 ft', components: 'V, S', duration: 'Instantaneous', description: 'End spell of 3rd level or lower.', classes: ['Bard', 'Cleric', 'Druid', 'Paladin', 'Sorcerer', 'Warlock', 'Wizard'] }
];

// Spell damage/healing for auto-roll when casting. slotLevel is 0-indexed (0=1st, 1=2nd, ...).
// damage: string or { base, perSlot, fromSlot }. healing: { dice, perSlot?, fromSlot?, addMod? }.
const SPELL_ROLLS = {
  'Acid Splash': { damage: '1d6' },
  'Chill Touch': { damage: '1d8' },
  'Fire Bolt': { damage: '1d10' },
  'Poison Spray': { damage: '1d12' },
  'Ray of Frost': { damage: '1d8' },
  'Sacred Flame': { damage: '1d8' },
  'Shocking Grasp': { damage: '2d8' },
  'Vicious Mockery': { damage: '1d4' },
  'Magic Missile': { damage: { base: '3d4+3', perSlot: '1d4+1', fromSlot: 0 } },
  'Cure Wounds': { healing: { dice: '1d8', perSlot: '1d8', fromSlot: 0, addMod: true } },
  'Healing Word': { healing: { dice: '1d4', perSlot: '1d4', fromSlot: 0, addMod: true } },
  'Burning Hands': { damage: '3d6' },
  'Guiding Bolt': { damage: '4d6' },
  'Thunderwave': { damage: '2d8' },
  'Scorching Ray': { damage: { base: '6d6', perSlot: '2d6', fromSlot: 1 } },
  'Fireball': { damage: { base: '8d6', perSlot: '1d6', fromSlot: 2 } }
};

function getSpellRollForSlot(spellName, slotLevel) {
  const cfg = typeof SPELL_ROLLS !== 'undefined' ? SPELL_ROLLS[spellName] : null;
  if (!cfg) return null;
  slotLevel = Math.max(0, slotLevel || 0);
  if (cfg.damage) {
    const d = cfg.damage;
    let dice;
    if (typeof d === 'string') dice = d;
    else if (d.perSlot && d.fromSlot !== undefined && slotLevel >= d.fromSlot) {
      const extra = slotLevel - d.fromSlot;
      if (extra <= 0) dice = d.base;
      else dice = parseAndAddDice(d.base, d.perSlot, extra);
    } else dice = d.base || d;
    return { type: 'damage', dice, label: spellName + ' damage' };
  }
  if (cfg.healing) {
    const h = cfg.healing;
    let dice = h.dice;
    if (h.perSlot && h.fromSlot !== undefined && slotLevel >= h.fromSlot) {
      const extra = slotLevel - h.fromSlot;
      if (extra > 0) dice = parseAndAddDice(h.dice, h.perSlot, extra);
    }
    return { type: 'healing', dice, addMod: !!h.addMod, label: spellName + ' healing' };
  }
  return null;
}

function parseAndAddDice(base, perSlot, count) {
  const parse = (s) => {
    const m = s.match(/^(\d+)d(\d+)([+-]\d+)?$/);
    if (!m) return null;
    return { n: parseInt(m[1], 10), d: parseInt(m[2], 10), mod: m[3] ? parseInt(m[3], 10) : 0 };
  };
  const b = parse(base);
  const p = parse(perSlot);
  if (!b || !p) return base;
  const n = b.n + p.n * count;
  const mod = b.mod + p.mod * count;
  return n + 'd' + b.d + (mod !== 0 ? (mod >= 0 ? '+' : '') + mod : '');
}

function getSpellSlotsForLevel(level) {
  return SPELL_SLOTS_BY_LEVEL[Math.min(level, 20)] || [0, 0, 0, 0, 0, 0, 0, 0, 0];
}

function getXpForLevel(level) {
  return XP_BY_LEVEL[level] || 0;
}

function getLevelFromXp(xp) {
  let level = 1;
  for (let l = 20; l >= 1; l--) {
    if (xp >= XP_BY_LEVEL[l]) return l;
  }
  return 1;
}
