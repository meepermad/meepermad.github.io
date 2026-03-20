const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const appDir = path.join(root, 'js', 'app');
const app = fs.readFileSync(path.join(appDir, 'app.js'), 'utf8');
const appViews = fs.readFileSync(path.join(appDir, 'app-views.js'), 'utf8');
const appDmTools = fs.readFileSync(path.join(appDir, 'app-dm-tools.js'), 'utf8');
const appQuickRef = fs.readFileSync(path.join(appDir, 'app-quick-ref.js'), 'utf8');
const renderers = fs.readFileSync(path.join(appDir, 'app-renderers.js'), 'utf8');

assert.ok(app.split(/\r?\n/).length <= 5400, 'app.js should stay under 5400 lines');
const appInner = (app.match(/innerHTML/g) || []).length;
const viewsInner = (appViews.match(/innerHTML/g) || []).length;
assert.ok(appInner + viewsInner <= 90, 'app.js + app-views.js should stay at or below 90 innerHTML uses');
assert.ok(/AppRenderers\.renderCharacterCards/.test(appViews), 'app-views.js should delegate character rendering');
assert.ok(/AppRenderers\.renderDMNPCList/.test(appDmTools), 'app-dm-tools.js should delegate NPC rendering');
assert.ok(/AppRenderers\.renderBattleTokenList/.test(appDmTools), 'app-dm-tools.js should delegate battle token rendering');
assert.ok(/AppRenderers\.renderQuickReferenceResults/.test(appQuickRef), 'app-quick-ref.js should delegate quick reference rendering');
assert.strictEqual(/innerHTML/.test(renderers), false, 'app-renderers.js should avoid innerHTML');
