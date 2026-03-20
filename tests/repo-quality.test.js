const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert.ok(pkg.scripts.test, 'package.json needs a test script');
assert.ok(pkg.scripts.lint, 'package.json needs a lint script');
assert.ok(pkg.scripts.ci, 'package.json needs a ci script');
assert.ok(fs.existsSync(path.join(root, '.github', 'workflows', 'ci.yml')), 'CI workflow should exist');
assert.ok(fs.existsSync(path.join(root, 'ARCHITECTURE.md')), 'Architecture doc should exist');
assert.strictEqual(fs.existsSync(path.join(root, 'src')), false, 'Empty src directory should be removed until it is used');
