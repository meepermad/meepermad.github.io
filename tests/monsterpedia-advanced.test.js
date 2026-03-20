const assert = require('assert');
const Engine = require('../js/engines/monsterpedia-engine.js');

const monsters = [
  { name: 'Goblin Scout', type: 'Humanoid', cr: 0.25, hp: '7 (2d6)', ac: 15, speed: '30 ft.', actions: 'Scimitar. 5 (1d6+2)', traits: 'Nimble Escape', senses: 'Darkvision 60 ft.', source: 'Core 5e', xp: 50 },
  { name: 'Ancient White Dragon', type: 'Dragon', cr: 20, hp: '333 (18d20+144)', ac: 20, speed: '40 ft., fly 80 ft., swim 40 ft.', actions: 'Cold Breath (Recharge 5-6): 72 (16d8)', traits: 'Legendary Resistance (3/Day)', senses: 'Blindsight 60 ft., Darkvision 120 ft.', source: 'MM', xp: 25000 }
];
const filtered = Engine.filterMonsters(monsters, { query: 'dragon', movementProfile: 'flying' });
assert.strictEqual(filtered.length, 1);
assert.strictEqual(filtered[0].name, 'Ancient White Dragon');
const sorted = Engine.sortMonsters(filtered, 'threat');
assert.strictEqual(sorted[0].name, 'Ancient White Dragon');
const budget = Engine.buildEncounterBudget(sorted, 12, 4);
assert.ok(budget.adjustedXp >= budget.totalXp);
