/**
 * Storage layer - debounced saves, schema validation, snapshots, recovery
 */

(function (global) {
  'use strict';

  const DEBOUNCE_MS = 500;
  let storage = typeof localStorage !== 'undefined' ? localStorage : createMemoryStorage();
  const MAX_SNAPSHOTS = 10;
  const BACKUP_KEY = 'dnd_characters_backup';

  const debounceTimers = {};
  /** @type {Record<string, function|*>} pending getter or raw payload per key */
  const pendingSavers = {};
  const characterSnapshots = [];

  function createMemoryStorage() {
    const data = new Map();
    return {
      getItem: (k) => data.has(k) ? data.get(k) : null,
      setItem: (k, v) => data.set(k, String(v)),
      removeItem: (k) => data.delete(k),
      clear: () => data.clear()
    };
  }

  function runPendingSave(key) {
    debounceTimers[key] = null;
    const getData = pendingSavers[key];
    if (getData === undefined) return;
    delete pendingSavers[key];
    try {
      const data = typeof getData === 'function' ? getData() : getData;
      const str = typeof data === 'string' ? data : JSON.stringify(data);
      storage.setItem(key, str);
    } catch (e) {
      console.error('Storage save error:', e);
    }
  }

  /** Debounced localStorage setItem */
  function debouncedSave(key, getData, delayMs = DEBOUNCE_MS) {
    pendingSavers[key] = getData;
    if (debounceTimers[key]) clearTimeout(debounceTimers[key]);
    debounceTimers[key] = setTimeout(() => runPendingSave(key), delayMs);
  }

  /** Flush one key: cancel timer and persist latest pending payload now */
  function flushDebounced(key) {
    if (debounceTimers[key]) {
      clearTimeout(debounceTimers[key]);
      debounceTimers[key] = null;
    }
    if (pendingSavers[key] !== undefined) runPendingSave(key);
  }

  /** Flush all keys with a pending or scheduled debounced save (e.g. pagehide) */
  function flushAllDebounced() {
    const keys = new Set([...Object.keys(pendingSavers), ...Object.keys(debounceTimers)]);
    keys.forEach((k) => flushDebounced(k));
  }

  /** Push snapshot before save (caller provides characters array) */
  function pushCharacterSnapshot(characters) {
    if (!Array.isArray(characters)) return;
    try {
      const copy = JSON.parse(JSON.stringify(characters));
      characterSnapshots.push(copy);
      if (characterSnapshots.length > MAX_SNAPSHOTS) characterSnapshots.shift();
    } catch (e) {}
  }

  /** Pop last snapshot (discard) - returns the discarded value */
  function popCharacterSnapshot() {
    return characterSnapshots.pop() || null;
  }

  /** Get previous state for undo: pop current, return new top (state to restore to) */
  function getPreviousForUndo() {
    characterSnapshots.pop(); // discard current
    return characterSnapshots.length > 0 ? characterSnapshots[characterSnapshots.length - 1] : null;
  }

  /** Get snapshot count */
  function getSnapshotCount() {
    return characterSnapshots.length;
  }

  /** Load with recovery - try main key, then backup */
  function loadWithRecovery(key, parseFn) {
    try {
      const raw = storage.getItem(key);
      if (!raw) return null;
      return parseFn ? parseFn(raw) : JSON.parse(raw);
    } catch (e) {
      try {
        const backup = storage.getItem(BACKUP_KEY);
        if (backup) return parseFn ? parseFn(backup) : JSON.parse(backup);
      } catch (e2) {}
      return null;
    }
  }

  /** Save backup of characters */
  function saveCharactersBackup(characters) {
    try {
      storage.setItem(BACKUP_KEY, JSON.stringify(characters));
    } catch (e) {}
  }

  /** Check if data is corrupted (returns error message or null) */
  function getLoadError(key) {
    try {
      const raw = storage.getItem(key);
      if (!raw) return null;
      JSON.parse(raw);
      return null;
    } catch (e) {
      return e.message || 'Invalid data';
    }
  }

  function setStorageAdapter(adapter) { if (adapter) storage = adapter; }

  const api = {
    debouncedSave,
    flushDebounced,
    flushAllDebounced,
    pushCharacterSnapshot,
    popCharacterSnapshot,
    getPreviousForUndo,
    getSnapshotCount,
    loadWithRecovery,
    saveCharactersBackup,
    getLoadError,
    DEBOUNCE_MS,
    BACKUP_KEY,
    createMemoryStorage,
    setStorageAdapter
  };
  global.StorageLayer = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
