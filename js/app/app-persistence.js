/**
 * app-persistence.js
 * Character load/save and migration. Handles localStorage, StorageLayer, and legacy field migration.
 *
 * @depends app-state (characters), js/data/data.js (createEmptyCharacter, getCampaignLevelingMode)
 */

// ========== LOAD / SAVE ==========

/**
 * Load characters from localStorage. Uses StorageLayer recovery if available.
 * Migrates each character to current schema (adds missing fields).
 */
function loadCharacters() {
  try {
    let saved = null;
    if (typeof StorageLayer !== 'undefined' && StorageLayer.loadWithRecovery) {
      saved = StorageLayer.loadWithRecovery('dnd_characters', JSON.parse);
    }
    if (!saved) {
      const raw = localStorage.getItem('dnd_characters');
      saved = raw ? JSON.parse(raw) : null;
    }
    characters = Array.isArray(saved) ? saved : [];
    characters.forEach(c => migrateCharacter(c));
  } catch (e) {
    characters = [];
  }
}

/**
 * Ensure character has all expected fields (handles old saves from previous app versions).
 * Adds defaults for hp, tempHp, spellSlotsUsed, conditions, currency, etc.
 *
 * @param {Object} c - Character object (mutated in place)
 * @returns {Object} - The same character (for chaining)
 */
function migrateCharacter(c) {
  const def = createEmptyCharacter();
  if (c.hp === undefined) c.hp = c.maxHp ?? null;
  if (c.maxHp === undefined) c.maxHp = null;
  if (c.tempHp === undefined) c.tempHp = 0;
  if (c.ac === undefined) c.ac = null;
  if (c.initiative === undefined) c.initiative = null;
  if (c.initiativeNat === undefined) c.initiativeNat = null;
  if (c.speed === undefined) c.speed = null;
  if (c.levelingMode === undefined) c.levelingMode = getCampaignLevelingMode();
  if (c.xp === undefined) c.xp = 0;
  if (!c.spellSlotsUsed) c.spellSlotsUsed = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  if (!c.knownSpells) c.knownSpells = [];
  if (!c.conditions) c.conditions = [];
  if (c.inspiration === undefined) c.inspiration = false;
  if (c.hitDiceTotal === undefined) c.hitDiceTotal = null;
  if (c.hitDiceUsed === undefined) c.hitDiceUsed = 0;
  if (c.deathSaveSuccesses === undefined) c.deathSaveSuccesses = 0;
  if (c.deathSaveFailures === undefined) c.deathSaveFailures = 0;
  if (c.exhaustion === undefined) c.exhaustion = 0;
  if (!c.currency) c.currency = { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 };
  if (!c.attacks) c.attacks = [];
  if (!c.feats) c.feats = [];
  if (!c.multiclass) c.multiclass = [];
  if (!c.weaponProficiencies) c.weaponProficiencies = [];
  if (!c.armorProficiencies) c.armorProficiencies = [];
  if (!c.toolProficiencies) c.toolProficiencies = [];
  if (!c.sectionOrder) c.sectionOrder = [];
  if (!c.sheetLayout) c.sheetLayout = { overall: 'single', sections: {} };
  if (c.sheetLayout.sections) {
    const legacy = { block: 'full', skinny: 'compact', column: 'half' };
    Object.keys(c.sheetLayout.sections).forEach(k => {
      const v = c.sheetLayout.sections[k];
      if (legacy[v]) c.sheetLayout.sections[k] = legacy[v];
    });
  }
  if (!c.inventory) c.inventory = [];
  if (c.personalityTraits === undefined) c.personalityTraits = '';
  if (c.ideals === undefined) c.ideals = '';
  if (c.bonds === undefined) c.bonds = '';
  if (c.flaws === undefined) c.flaws = '';
  if (c.physicalAppearance === undefined) c.physicalAppearance = '';
  if (c.concentratingOn === undefined) c.concentratingOn = null;
  if (!c.edition) c.edition = (typeof getActiveEdition === 'function' ? getActiveEdition() : null) || '5e';
  if (!c.hitDie && c.class && typeof CLASSES !== 'undefined') {
    const cls = CLASSES.find(cl => cl.name === c.class);
    if (cls) c.hitDie = cls.hitDie;
  }
  return c;
}

/**
 * Get campaign default leveling mode (xp or milestone).
 * @returns {string}
 */
function getCampaignLevelingMode() {
  return localStorage.getItem('dnd_leveling_mode') || 'xp';
}

/**
 * Set campaign default leveling mode.
 * @param {string} mode - 'xp' or 'milestone'
 */
function setCampaignLevelingMode(mode) {
  localStorage.setItem('dnd_leveling_mode', mode);
}

/**
 * Save characters to localStorage. Uses StorageLayer if available (snapshots, backup, debounce).
 *
 * @param {boolean} [skipSnapshot] - If true, don't push to undo snapshot (used when restoring)
 */
function saveCharacters(skipSnapshot) {
  if (typeof StorageLayer !== 'undefined') {
    if (!skipSnapshot) StorageLayer.pushCharacterSnapshot(characters);
    StorageLayer.saveCharactersBackup(characters);
    StorageLayer.debouncedSave('dnd_characters', () => JSON.stringify(characters));
  } else {
    localStorage.setItem('dnd_characters', JSON.stringify(characters));
  }
}
