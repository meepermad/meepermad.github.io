
const assert = require('assert');
const StorageLayer = require('../js/lib/storage.js');
const storage = StorageLayer.createMemoryStorage();
StorageLayer.setStorageAdapter(storage);
StorageLayer.saveCharactersBackup([{ id: 1 }]);
assert.strictEqual(JSON.parse(storage.getItem(StorageLayer.BACKUP_KEY))[0].id, 1);
StorageLayer.pushCharacterSnapshot([{ id: 'a' }]);
StorageLayer.pushCharacterSnapshot([{ id: 'b' }]);
assert.strictEqual(StorageLayer.getSnapshotCount() >= 2, true);
assert.deepStrictEqual(StorageLayer.getPreviousForUndo()[0].id, 'a');
storage.setItem('broken', '{oops');
assert.ok(StorageLayer.getLoadError('broken'));
storage.setItem('chars', JSON.stringify([{ id: 9 }]));
assert.deepStrictEqual(StorageLayer.loadWithRecovery('chars')[0].id, 9);

let debounceVal = 0;
StorageLayer.debouncedSave('deb_key', () => JSON.stringify({ n: ++debounceVal }));
StorageLayer.flushDebounced('deb_key');
assert.strictEqual(JSON.parse(storage.getItem('deb_key')).n, 1);
StorageLayer.debouncedSave('deb_key', () => JSON.stringify({ n: 99 }));
StorageLayer.flushAllDebounced();
assert.strictEqual(JSON.parse(storage.getItem('deb_key')).n, 99);
assert.strictEqual(typeof StorageLayer.flushAllDebounced, 'function');
