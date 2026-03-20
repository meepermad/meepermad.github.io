
const assert = require('assert');
const { SRD_MONSTERS } = require('../js/data/monsters-data.js');
assert.ok(Array.isArray(SRD_MONSTERS));
assert.ok(SRD_MONSTERS.length > 20);
for (const monster of SRD_MONSTERS.slice(0, 50)) {
  assert.ok(monster.name, 'Monster missing name');
  assert.ok(monster.ac != null, `Monster missing AC: ${monster.name}`);
  assert.ok(monster.hp != null, `Monster missing HP: ${monster.name}`);
  assert.ok(monster.type, `Monster missing type: ${monster.name}`);
}
