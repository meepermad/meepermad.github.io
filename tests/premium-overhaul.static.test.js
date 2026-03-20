const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const premium = fs.readFileSync(path.join(root, 'js', 'app', 'premium-overhaul.js'), 'utf8');

assert.ok(/function getMonsterDataset\(/.test(premium), 'premium-overhaul should define a monster dataset helper');
assert.ok(/function getCharactersDataset\(/.test(premium), 'premium-overhaul should define a character dataset helper');
assert.ok(!/window\.SRD_MONSTERS\s*\|\|/.test(premium), 'premium-overhaul should not rely on window.SRD_MONSTERS fallback for primary monster access');
assert.ok(!/window\.characters\s*\|\|/.test(premium), 'premium-overhaul should not rely on window.characters fallback for primary character access');
assert.ok(/monster-cr-filter/.test(premium), 'premium-overhaul monster filtering should include the CR difficulty filter');
assert.ok(/function patchXpControls/.test(premium), 'premium-overhaul should include XP quick-add patch');
assert.ok(/syncWindowBridges\(/.test(premium), 'premium-overhaul should bridge browser globals for patched features');
