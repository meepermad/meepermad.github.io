
const tests = [
  './rules-engine.test.js',
  './schema.test.js',
  './storage.test.js',
  './monsterpedia-engine.test.js',
  './monsterpedia-advanced.test.js',
  './battlemap-engine.test.js',
  './battlemap-advanced.test.js',
  './data-integrity.test.js',
  './security.static.test.js',
  './app-structure.test.js',
  './repo-quality.test.js',
  './modal-a11y.static.test.js',
  './premium-overhaul.static.test.js'
];
let failed = 0;
for (const test of tests) {
  try {
    require(test);
    console.log('✓', test);
  } catch (err) {
    failed++;
    console.error('✗', test);
    console.error(err.stack || err);
  }
}
if (failed) {
  console.error(`
${failed} test suite(s) failed.`);
  process.exit(1);
}
console.log(`
All ${tests.length} test suites passed.`);
