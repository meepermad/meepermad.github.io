
const assert = require('assert');
const Engine = require('../js/engines/battlemap-engine.js');
const token = { id: 1, x: 2, y: 3, size: 2 };
assert.deepStrictEqual(Engine.tokenFootprint(token), [{ x:2,y:3 },{ x:3,y:3 },{ x:2,y:4 },{ x:3,y:4 }]);
const cells = { '4,4': { type: 'wall' }, '2,1': { type: 'difficult' } };
assert.strictEqual(Engine.canPlaceToken({ id:2, size:1 }, 4, 4, 10, 10, cells, []), false);
assert.strictEqual(Engine.canPlaceToken({ id:2, size:1 }, 1, 1, 10, 10, cells, [token]), true);
assert.strictEqual(Engine.terrainCostAt(2, 1, cells), 2);
const measure = Engine.rulerMeasurement({ x:0, y:0 }, { x:3, y:4 }, cells, 10, 10);
assert.strictEqual(measure.euclideanFeet, 25);
assert.ok(measure.movementCost >= 7);
let fogCells = {};
Engine.toggleFog(fogCells, 1, 1, true);
assert.strictEqual(fogCells['1,1'].fog, true);
