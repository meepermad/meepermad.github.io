
const assert = require('assert');
const Engine = require('../js/engines/monsterpedia-engine.js');
const dragon = { name: 'Young Green Dragon', type: 'Dragon', cr: 8, hp: '136 (16d10+48)', ac: 18, speed: '40 ft., fly 80 ft., swim 40 ft.', actions: 'Poison Breath (Recharge 5–6): 30-ft cone, DC 18 Con, 42 (12d6) poison or half.', traits: 'Amphibious.', xp: 3900, senses: 'Blindsight 30 ft., Darkvision 120 ft.' };
const norm = Engine.normalizeMonster(dragon);
assert.strictEqual(norm.role, 'Artillery');
assert.strictEqual(norm.tacticalRole, 'Artillery');
assert.strictEqual(norm.movementProfile, 'flying');
assert.strictEqual(norm.senseProfile, 'blindsight');
assert.ok(Array.isArray(norm.biomes) && norm.biomes.includes('coast'));
assert.ok(norm.actionEntries.standard.length >= 1);
assert.ok(norm.encounterHints.length >= 1);
assert.ok(norm.threatScore > 100);
const budget = Engine.buildEncounterBudget([norm], 5, 4);
assert.ok(['Easy', 'Medium', 'Hard', 'Deadly', 'Trivial'].includes(budget.difficulty));
assert.strictEqual(Engine.classifySource('AD&D 2e'), 'Personal Homebrew (Legacy Edition)');

const acolyteTraits = 'Spellcasting (1st-level cleric). Cantrips: light, sacred flame, thaumaturgy. 1st (3 slots): bless, cure wounds, sanctuary.';
const sp = Engine.parseSpellcasting(acolyteTraits);
assert.ok(sp && sp.header.includes('cleric'));
assert.ok(sp.cantrips.includes('light'));
assert.strictEqual(sp.slots.length, 1);
assert.strictEqual(sp.slots[0].level, 1);
assert.strictEqual(sp.slots[0].count, 3);

const stripped = Engine.stripSpellcastingFromTraits(acolyteTraits, sp);
assert.ok(!/spellcasting/i.test(stripped));

const split = Engine.splitStandardActions('Scimitar. Melee +4, 5 ft., 5 slashing. Shortbow. Ranged +4, 80/320 ft., 5 piercing.');
assert.ok(split.length >= 2);

const lich = { name: 'Lich', type: 'Undead', cr: 21, hp: '135', ac: 17, traits: 'Legendary Resistance (3/day).', actions: 'Paralyzing Touch. Melee +12.', xp: 33000 };
const nLich = Engine.normalizeMonster(lich);
assert.strictEqual(nLich.tacticalRole, 'Solo');
assert.strictEqual(nLich.combatTags.boss, true);

const ancient = { name: 'Ancient White Dragon', type: 'Dragon', cr: 20, hp: '333', ac: 20, actions: 'Cold Breath.', traits: '', xp: 25000 };
const nAncient = Engine.normalizeMonster(ancient);
assert.strictEqual(nAncient.combatTags.boss, true);

const capt = { name: 'Hobgoblin Captain', type: 'Humanoid', cr: 2, hp: '39 (6d8+12)', ac: 17, actions: 'Longsword.', traits: '', xp: 450 };
const nCapt = Engine.normalizeMonster(capt);
assert.strictEqual(nCapt.combatTags.elite, true);

const withLegendaryField = {
  name: 'Custom Boss',
  type: 'Monstrosity',
  cr: 5,
  hp: '120',
  ac: 15,
  traits: 'Tough.',
  actions: 'Slam. Melee +8.',
  legendaryActions: 'Attack. The boss makes one melee attack.'
};
const nLeg = Engine.normalizeMonster(withLegendaryField);
assert.ok(nLeg.actionEntries.legendary.length >= 1);
