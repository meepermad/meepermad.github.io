const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const files = ['js/app/app.js', 'js/app/app-renderers.js', 'js/engines/monsterpedia-engine.js', 'js/engines/battlemap-engine.js', 'tests/test-runner.js'];
for (const rel of files) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) continue;
  const text = fs.readFileSync(full, 'utf8');
  const lines = text.split(/\r?\n/).length;
  const inner = (text.match(/innerHTML/g) || []).length;
  console.log(`${rel}: ${lines} lines, ${inner} innerHTML`);
}
