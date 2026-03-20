/**
 * app-combat.js
 * Combat and rules helper functions: AC calculation, weapon mastery, debuff effects.
 * Used by session view, character sheet, and builder preview.
 *
 * @depends js/data/data.js (getMergedRaces), js/data/items.js (ITEMS), js/engines/rules-engine.js (RulesEngine, optional)
 */

// ========== WEAPON MASTERY (2024) ==========

/**
 * Return short description for 2024 Weapon Mastery (tooltip).
 * Used when displaying weapon mastery on character sheet.
 *
 * @param {string} mastery - Mastery name (Cleave, Graze, Nick, etc.)
 * @returns {string} - HTML-safe description
 */
function getMasteryDescription(mastery) {
  const desc = {
    Cleave: 'On hit, make a second melee attack against another creature within 5 ft; second target takes weapon damage without ability modifier.',
    Graze: 'On miss, deal damage equal to your ability modifier.',
    Nick: 'When wielding two light weapons, make the extra attack as part of your Attack action instead of a bonus action (once per turn).',
    Push: 'On hit vs Large or smaller, push it up to 10 ft away from you.',
    Sap: 'On hit, target has disadvantage on its next attack roll before the start of your next turn.',
    Slow: 'On hit and deal damage, reduce target\'s speed by 10 ft until the start of your next turn.',
    Topple: 'On hit, target makes Constitution save or falls prone (DC 8 + PB + ability mod).',
    Vex: 'On hit and deal damage, you have advantage on your next attack roll against that creature before the end of your next turn.'
  };
  const s = desc[mastery] || mastery;
  return String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// ========== DEBUFF EFFECTS ==========

/**
 * Compute debuff effects from conditions and exhaustion (D&D 5e).
 * Used to apply disadvantage, speed reduction, etc. on rolls and movement.
 *
 * @param {Object} c - Character object with conditions[] and exhaustion
 * @returns {Object} - { abilityChecksDisadvantage, savesDisadvantage, speedMultiplier, hpMaxMultiplier }
 */
function getDebuffEffects(c) {
  const conds = (c.conditions || []).map(s => String(s).toLowerCase());
  const exh = c.exhaustion ?? 0;
  const abilityChecksDisadvantage = exh >= 1 || conds.includes('poisoned') || conds.includes('frightened');
  const savesDisadvantage = exh >= 3;
  const attackRollsDisadvantage = exh >= 3;
  let speedMultiplier = 1;
  if (exh >= 5) speedMultiplier = 0;
  else if (exh >= 2) speedMultiplier = 0.5;
  const hpMaxMultiplier = exh >= 4 ? 0.5 : 1;
  return { abilityChecksDisadvantage, savesDisadvantage, attackRollsDisadvantage, speedMultiplier, hpMaxMultiplier };
}

// ========== AC CALCULATION ==========

/**
 * Calculate Armor Class for a character.
 * Uses RulesEngine when available; otherwise falls back to armor/race/class logic.
 * Handles: armor, shield, natural armor (Lizardfolk), Monk (Dex+Wis), Barbarian (Dex+Con).
 *
 * @param {Object} c - Character object with stats, equipment, race, class
 * @returns {number} - AC value
 */
function calculateAC(c) {
  if (typeof RulesEngine !== 'undefined' && RulesEngine.calculateAC) {
    const ctx = { races: typeof getMergedRaces === 'function' ? getMergedRaces() : [], items: typeof ITEMS !== 'undefined' ? ITEMS : {} };
    return RulesEngine.calculateAC(c, ctx);
  }
  const armorAC = typeof ITEMS !== 'undefined' && ITEMS?.armorAC ? ITEMS.armorAC : {};
  const dex = c.stats?.dexterity ?? 10;
  const wis = c.stats?.wisdom ?? 10;
  const con = c.stats?.constitution ?? 10;
  const dexMod = Math.floor((dex - 10) / 2);
  const wisMod = Math.floor((wis - 10) / 2);
  const conMod = Math.floor((con - 10) / 2);
  const items = [...(c.equipment || []), ...(c.inventory || [])].map(s => String(s).trim()).filter(Boolean);
  const hasItem = (name) => items.some(s => s.toLowerCase().includes(name.toLowerCase()));
  const shieldBonus = hasItem('Shield') ? (armorAC['Shield']?.bonus ?? 2) : 0;
  let base = 10, dexAdd = dexMod;
  let hasArmor = false;
  for (const [name, data] of Object.entries(armorAC)) {
    if (name === 'Shield' || data.bonus) continue;
    if (!hasItem(name)) continue;
    base = data.base ?? 10;
    dexAdd = data.dexCap === null ? dexMod : (data.dexCap === 2 ? Math.min(dexMod, 2) : 0);
    hasArmor = true;
    break;
  }
  if (hasArmor) return base + dexAdd + shieldBonus;
  const race = typeof getMergedRaces === 'function' ? getMergedRaces().find(r => r.name === c.race) : null;
  const naturalArmor = race?.naturalArmor;
  if (naturalArmor != null) return naturalArmor + dexMod + shieldBonus;
  if (c.class === 'Monk') return 10 + dexMod + wisMod + shieldBonus;
  if (c.class === 'Barbarian') return 10 + dexMod + conMod + shieldBonus;
  return 10 + dexMod + shieldBonus;
}
