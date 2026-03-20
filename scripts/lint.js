const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const jsDir = path.join(root, 'js');
function findJsFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) results.push(...findJsFiles(full));
    else if (e.name.endsWith('.js')) results.push(full);
  }
  return results;
}
const jsFiles = findJsFiles(jsDir);
const failures = [];

function fail(message) {
  failures.push(message);
}

for (const file of jsFiles) {
  const rel = path.relative(root, file);
  const source = fs.readFileSync(file, 'utf8');
  try {
    execFileSync(process.execPath, ['-c', file], { stdio: 'pipe' });
  } catch (error) {
    fail(`Syntax check failed for ${rel}: ${error.message}`);
  }
  if (/\bprompt\s*\(/.test(source)) fail(`prompt() is not allowed in ${rel}`);
}

const appSource = fs.readFileSync(path.join(jsDir, 'app', 'app.js'), 'utf8');
const appLines = appSource.split(/\r?\n/).length;
const appInner = (appSource.match(/innerHTML/g) || []).length;
if (appLines > 5400) fail(`app.js should stay under 5400 lines. Found ${appLines}.`);
if (appInner > 90) fail(`app.js should stay at or below 90 innerHTML occurrences. Found ${appInner}.`);

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!packageJson.scripts || !packageJson.scripts.test || !packageJson.scripts.lint || !packageJson.scripts.ci) {
  fail('package.json must expose test, lint, and ci scripts.');
}

const workflowPath = path.join(root, '.github', 'workflows', 'ci.yml');
if (!fs.existsSync(workflowPath)) fail('Missing .github/workflows/ci.yml');
const architecturePath = path.join(root, 'ARCHITECTURE.md');
if (!fs.existsSync(architecturePath)) fail('Missing ARCHITECTURE.md');

if (failures.length) {
  console.error('Lint / repo quality checks failed:');
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log(`Lint passed. app.js: ${appLines} lines, ${appInner} innerHTML occurrences.`);
