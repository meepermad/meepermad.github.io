const assert = require('assert');
const Engine = require('../js/engines/battlemap-engine.js');

const cells = {
  '1,0': { type: 'wall' },
  '1,1': { type: 'wall' },
  '2,1': { type: 'difficult' }
};
const path = Engine.bfsPath({ x: 0, y: 0 }, { x: 3, y: 0 }, 6, 6, cells);
assert.ok(path.length > 0, 'A path should be found around walls');
assert.strictEqual(path[0].x, 0);
assert.strictEqual(path[path.length - 1].x, 3);
const placement = Engine.findOpenPlacement({ id: 'x', size: 2 }, 5, 5, cells, [{ id: 'taken', x: 0, y: 2, size: 2 }]);
assert.ok(placement.x >= 0 && placement.y >= 0);
