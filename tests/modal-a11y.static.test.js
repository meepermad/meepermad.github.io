const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'lib', 'modal-a11y.js'), 'utf8');
assert.ok(/function trapFocus/.test(source), 'modal-a11y should expose focus trapping');
assert.ok(/function openModal/.test(source), 'modal-a11y should expose openModal');
assert.ok(/function closeModal/.test(source), 'modal-a11y should expose closeModal');
assert.ok(/key === 'Escape'/.test(source), 'modal-a11y should handle Escape');
assert.ok(/lastFocusedElement/.test(source), 'modal-a11y should restore focus');
assert.strictEqual(/prompt\(/.test(source), false, 'modal-a11y should not rely on prompt');
