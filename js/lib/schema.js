/**
 * JSON schema validation for homebrew import and character data
 */

(function (global) {
  'use strict';

  const HOMEBREW_REQUIRED = { races: ['name'], classes: ['name'], backgrounds: ['name'], feats: ['name'] };
  const HOMEBREW_ALLOWED = {
    race: ['id', 'name', 'description', 'speed', 'abilityScore', 'traits', 'languages', 'languagesExtra', 'subraces', 'resistances', 'immunities', 'vulnerabilities', 'weaknesses', 'source'],
    class: ['id', 'name', 'description', 'hitDie', 'primaryAbility', 'savingThrows', 'subclasses', 'source'],
    background: ['id', 'name', 'description', 'skillProficiencies', 'languages', 'languagesExtra', 'abilityScoreOptions', 'feat', 'source'],
    feat: ['id', 'name', 'description', 'prerequisite', 'source']
  };

  /** Validate a single homebrew item */
  function validateHomebrewItem(item, type, errors) {
    if (!item || typeof item !== 'object') {
      errors.push(`${type} item must be an object`);
      return false;
    }
    const required = HOMEBREW_REQUIRED[type + 's'];
    if (!required) return true;
    for (const field of required) {
      if (!item[field] || typeof item[field] !== 'string') {
        errors.push(`${type} missing required field "${field}"`);
        return false;
      }
    }
    const allowed = HOMEBREW_ALLOWED[type];
    if (allowed) {
      for (const key of Object.keys(item)) {
        if (!allowed.includes(key)) {
          errors.push(`${type} "${item.name}" has unknown field "${key}"`);
        }
      }
    }
    return true;
  }

  /** Validate homebrew import data */
  function validateHomebrewImport(data) {
    const errors = [];
    if (!data || typeof data !== 'object') {
      errors.push('Data must be an object');
      return { valid: false, errors };
    }
    const arrays = ['races', 'classes', 'backgrounds', 'feats'];
    for (const key of arrays) {
      if (!(key in data)) continue;
      if (!Array.isArray(data[key])) {
        errors.push(`"${key}" must be an array`);
        continue;
      }
      const types = { races: 'race', classes: 'class', backgrounds: 'background', feats: 'feat' };
      data[key].forEach((item, i) => {
        if (!validateHomebrewItem(item, types[key], errors)) {
          errors.push(`  at ${key}[${i}]`);
        }
      });
    }
    return { valid: errors.length === 0, errors };
  }

  /** Sanitize homebrew item - keep only allowed fields */
  function sanitizeHomebrewItem(item, type) {
    if (!item || typeof item !== 'object') return null;
    const allowed = HOMEBREW_ALLOWED[type];
    if (!allowed || !item.name) return null;
    const out = {};
    for (const k of allowed) {
      if (item[k] !== undefined) out[k] = item[k];
    }
    return out;
  }

  /** Sanitize full homebrew import - validate and filter invalid entries */
  function sanitizeHomebrewImport(data) {
    const result = validateHomebrewImport(data);
    if (!result.valid) return { sanitized: null, errors: result.errors };
    const sanitized = { races: [], classes: [], backgrounds: [], feats: [] };
    const types = { races: 'race', classes: 'class', backgrounds: 'background', feats: 'feat' };
    for (const key of Object.keys(sanitized)) {
      if (!Array.isArray(data[key])) continue;
      for (const item of data[key]) {
        const s = sanitizeHomebrewItem(item, types[key]);
        if (s) sanitized[key].push(s);
      }
    }
    return { sanitized, errors: [] };
  }



  function sanitizeCharacterImport(data) {
    const out = Object.assign({}, data || {});
    out.name = String(out.name || '').slice(0, 120);
    out.notes = String(out.notes || '').slice(0, 5000);
    ['languages','resistances','immunities','vulnerabilities','weaknesses','skills','equipment'].forEach(key => {
      if (!Array.isArray(out[key])) out[key] = [];
      out[key] = out[key].map(v => String(v).slice(0, 120)).slice(0, 200);
    });
    if (!out.stats || typeof out.stats !== 'object') out.stats = {};
    ['strength','dexterity','constitution','intelligence','wisdom','charisma'].forEach(stat => {
      const val = Number(out.stats[stat]);
      out.stats[stat] = Number.isFinite(val) ? Math.max(1, Math.min(30, val)) : 10;
    });
    return out;
  }

  const api = {
    validateHomebrewImport,
    sanitizeHomebrewImport,
    validateHomebrewItem,
    sanitizeCharacterImport
  };
  global.Schema = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
