
const assert = require('assert');
const RulesEngine = require('../js/engines/rules-engine.js');
assert.strictEqual(RulesEngine.getTotalLevel({ level: 15, multiclass: [{ level: 3 }, { level: 4 }] }), 20);
assert.strictEqual(RulesEngine.getProficiencyBonus(1), 2);
assert.strictEqual(RulesEngine.getProficiencyBonus(17), 6);
assert.strictEqual(RulesEngine.getStatModifier(8), -1);
assert.strictEqual(RulesEngine.getStatModifier(20), 5);
const breakdown = RulesEngine.getStatBreakdown({ stats: { strength: 16 }, race: 'Human' }, 'strength', { races: [{ name: 'Human', abilityScore: { strength: 1 } }] });
assert.strictEqual(breakdown.base, 15);
assert.strictEqual(breakdown.mod, 3);
const acMonk = RulesEngine.calculateAC({ class: 'Monk', stats: { dexterity: 14, wisdom: 16 }, equipment: [], inventory: [] }, { races: [], items: { armorAC: {} } });
assert.strictEqual(acMonk, 15);
const acArmor = RulesEngine.calculateAC({ stats: { dexterity: 18 }, equipment: ['Chain Shirt', 'Shield'], inventory: [] }, { races: [], items: { armorAC: { 'Chain Shirt': { base: 13, dexCap: 2 }, 'Shield': { bonus: 2 } } } });
assert.strictEqual(acArmor, 17);
