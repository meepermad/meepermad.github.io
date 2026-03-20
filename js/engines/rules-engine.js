/**
 * D&D Rules Engine - Pure calculation functions
 * AC, proficiency, stats, spell slots. Context passed by caller.
 */

(function (global) {
  'use strict';

  /** Total character level (primary + multiclass), capped at 20 */
  function getTotalLevel(c) {
    if (!c) return 1;
    const primary = c.level || 1;
    const multi = (c.multiclass || []).reduce((s, m) => s + (m.level || 0), 0);
    return Math.min(20, primary + multi);
  }

  /** Proficiency bonus by level: +2 at 1-4, +3 at 5-8, +4 at 9-12, +5 at 13-16, +6 at 17-20 */
  function getProficiencyBonus(level) {
    return Math.floor((level || 1) / 4) + 2;
  }

  /** Ability modifier from score */
  function getStatModifier(val) {
    return Math.floor(((val ?? 10) - 10) / 2);
  }

  /** Stat breakdown for display (base, race bonus, total, mod) */
  function getStatBreakdown(c, stat, context) {
    const total = c.stats?.[stat] ?? 10;
    const races = context?.races || [];
    const race = races.find(r => r.name === c.race);
    const subrace = race?.subraces?.find(s => s.name === c.subrace);
    let raceBonus = 0;
    [race?.abilityScore, subrace?.abilityScore].forEach(bonus => {
      if (!bonus) return;
      const val = bonus[stat];
      if (val != null) raceBonus += val;
    });
    const base = Math.max(1, total - raceBonus);
    const mod = Math.floor((total - 10) / 2);
    const parts = [];
    if (raceBonus !== 0) parts.push(`Base ${base} + Race ${raceBonus >= 0 ? '+' : ''}${raceBonus}`);
    else parts.push(`Base ${base}`);
    parts.push(`= ${total}`);
    return { base, raceBonus, total, mod, parts };
  }

  /** Calculate AC from armor, Dexterity, class features. Context: { races, items } */
  function calculateAC(c, context) {
    const armorAC = context?.items?.armorAC || {};
    const races = context?.races || [];
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
    const race = races.find(r => r.name === c.race);
    const naturalArmor = race?.naturalArmor;
    if (naturalArmor != null) return naturalArmor + dexMod + shieldBonus;
    if (c.class === 'Monk') return 10 + dexMod + wisMod + shieldBonus;
    if (c.class === 'Barbarian') return 10 + dexMod + conMod + shieldBonus;
    return 10 + dexMod + shieldBonus;
  }

  const api = {
    getTotalLevel,
    getProficiencyBonus,
    getStatModifier,
    getStatBreakdown,
    calculateAC
  };
  global.RulesEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
