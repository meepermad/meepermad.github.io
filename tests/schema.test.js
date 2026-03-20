
const assert = require('assert');
const Schema = require('../js/lib/schema.js');
const valid = { races: [{ name: 'Test Race', description: 'x' }], classes: [], backgrounds: [], feats: [] };
assert.strictEqual(Schema.validateHomebrewImport(valid).valid, true);
const invalid = { races: [{ notName: 'oops' }] };
assert.strictEqual(Schema.validateHomebrewImport(invalid).valid, false);
const sanitized = Schema.sanitizeHomebrewImport({ races: [{ name: 'Test Race', evil: true }], classes: [], backgrounds: [], feats: [] });
assert.strictEqual(sanitized.sanitized, null);
const char = Schema.sanitizeCharacterImport({ name: '<b>Atem</b>', stats: { strength: 40 }, notes: 'x'.repeat(7000) });
assert.strictEqual(char.name.includes('<b>'), true);
assert.strictEqual(char.stats.strength, 30);
assert.ok(char.notes.length <= 5000);
