
(function (global) {
  'use strict';

  const ENVIRONMENT_KEYWORDS = {
    forest: ['forest', 'wood', 'tree', 'grove'],
    swamp: ['swamp', 'marsh', 'bog'],
    desert: ['desert', 'sand', 'dune'],
    mountain: ['mountain', 'hill', 'cliff'],
    underground: ['underground', 'cave', 'underdark', 'subterranean'],
    urban: ['city', 'town', 'urban', 'street', 'guard'],
    coast: ['coast', 'shore', 'sea', 'ocean', 'swim', 'amphibious'],
    arctic: ['arctic', 'ice', 'snow', 'frost'],
    plains: ['plain', 'grassland', 'field'],
    any: []
  };

  function parseHp(hp) {
    const m = String(hp || '').match(/^(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  }

  /** Heuristic: split SRD-style action string into named entries */
  function splitStandardActions(text) {
    const raw = String(text || '').replace(/\s+/g, ' ').trim();
    if (!raw) return [];
    const hasAttackCue = (s) => /\b(Melee|Ranged|Multiattack|DC\s*\d|Recharge|ft\.|save|damage|cone|line|aura|spell|breath)\b/i.test(s);
    const parts = raw.split(/\.\s+(?=[A-Z])/);
    const merged = [];
    for (let i = 0; i < parts.length; i++) {
      let s = parts[i].trim();
      if (!s) continue;
      if (!hasAttackCue(s) && merged.length) {
        merged[merged.length - 1] += '. ' + s;
      } else {
        merged.push(s);
      }
    }
    return merged.map((full) => {
      const t = full.trim();
      const colon = t.indexOf(':');
      const dot = t.indexOf('.');
      if (colon > 0 && (dot < 0 || colon < dot)) {
        return { title: t.slice(0, colon).trim(), body: t.slice(colon + 1).trim(), full: t };
      }
      if (dot > 0) {
        return { title: t.slice(0, dot).trim(), body: t.slice(dot + 1).trim(), full: t };
      }
      return { title: t.slice(0, 48).trim(), body: '', full: t };
    });
  }

  function extractBonusFromTraits(traits) {
    if (!traits) return [];
    return String(traits)
      .split(/\.\s+/)
      .filter((s) => /bonus action/i.test(s))
      .map((s) => {
        const x = s.trim();
        return { title: 'Bonus (trait)', body: x + (x.endsWith('.') ? '' : '.'), full: x };
      });
  }

  function extractReactionsFromTraits(traits) {
    if (!traits) return [];
    return String(traits)
      .split(/\.\s+/)
      .filter((s) => /\breaction\b/i.test(s) && !/legendary resistance/i.test(s))
      .map((s) => {
        const x = s.trim();
        return { title: 'Reaction (trait)', body: x + (x.endsWith('.') ? '' : '.'), full: x };
      });
  }

  function extractActionSections(monster) {
    const out = {
      standard: String(monster.actions || '').trim(),
      bonus: String(monster.bonusActions || '').trim(),
      reaction: String(monster.reactions || '').trim(),
      legendary: String(monster.legendaryActions || '').trim(),
      lair: String(monster.lairActions || '').trim()
    };
    if (out.legendary || out.bonus || out.reaction || out.lair) return out;

    const blob = [monster.actions, monster.traits].filter(Boolean).join('\n\n');
    function pull(label, key) {
      const re = new RegExp('(?:^|\\n)\\s*' + label + '\\s*[\\n:]', 'i');
      const m = blob.match(re);
      if (!m) return;
      const start = m.index + m[0].length;
      const tail = blob.slice(start);
      const next = tail.search(/\n\s*(?:Bonus Actions?|Reactions?|Legendary Actions?|Lair Actions?)\s*[\n:]/i);
      out[key] = (next >= 0 ? tail.slice(0, next) : tail).trim();
      out.standard = out.standard.replace(re, ' ').replace(/\s+/g, ' ').trim();
    }

    pull('Legendary Actions?', 'legendary');
    pull('Lair Actions?', 'lair');
    pull('Bonus Actions?', 'bonus');
    pull('Reactions?', 'reaction');

    if (!out.standard && monster.actions) out.standard = String(monster.actions).trim();
    return out;
  }

  function parseSpellcasting(traitsStr) {
    const traits = String(traitsStr || '');
    if (!/spellcasting/i.test(traits)) return null;
    const headerM = traits.match(/Spellcasting\s*\(([^)]+)\)/i);
    const header = headerM ? headerM[1].trim() : '';
    const cantM = traits.match(/Cantrips?\s*:\s*([^.]+(?:\.[^.]*)?)/i);
    const cantrips = cantM ? cantM[1].trim().replace(/\.$/, '') : '';
    const slots = [];
    const rx = /(\d+)(?:st|nd|rd|th)(?:\s+level)?\s*\((\d+)\s*slots?\)\s*:\s*([^.]+)/gi;
    let m;
    while ((m = rx.exec(traits)) !== null) {
      slots.push({ level: parseInt(m[1], 10), count: parseInt(m[2], 10), spells: m[3].trim() });
    }
    const prep = traits.match(/(\d+)(?:st|nd|rd|th)(?:\s+level)?\s*\(([^)]+)\)\s*prepared\s*:\s*([^.]+)/i);
    const prepared = prep ? { level: parseInt(prep[1], 10), note: prep[2].trim(), spells: prep[3].trim() } : null;
    return { header, cantrips, slots, prepared };
  }

  function inferBiomesList(monster) {
    const primary = inferEnvironment(monster);
    const text = [monster.traits, monster.actions, monster.name, monster.type, monster.senses].join(' ').toLowerCase();
    const found = new Set();
    if (primary && primary !== 'any') found.add(primary);
    for (const [env, keys] of Object.entries(ENVIRONMENT_KEYWORDS)) {
      if (!keys.length || env === 'any') continue;
      if (keys.some((k) => text.includes(k))) found.add(env);
    }
    const arr = [...found];
    if (!arr.length) arr.push('any');
    return arr;
  }

  function inferCombatTags(monster, sections, combinedLower) {
    const hp = parseHp(monster.hp);
    const cr = Number(monster.cr) || 0;
    const name = String(monster.name || '');
    const type = String(monster.type || '').toLowerCase();
    const t = combinedLower;
    const boss =
      cr >= 13 ||
      !!sections.legendary ||
      /\b(lich|tarrasque|kraken|demilich)\b/i.test(name) ||
      /\b(ancient|adult)\s+\w+\s+dragon\b/i.test(name) ||
      (/\blegendary resistance\b/.test(t) && cr >= 8);
    const elite =
      (cr >= 3 && hp >= 35) ||
      /captain|knight|veteran|champion|warlord|fanatic|assassin|archmage/i.test(name);
    const swarm = /\bswarm\b/i.test(type + name) || /\bswarm\b/i.test(t);
    return { boss, elite, swarm };
  }

  function inferRoleClassic(monster) {
    const text = [monster.traits, monster.actions, monster.type, monster.name].join(' ').toLowerCase();
    if (/spellcasting|spellcaster|magic|mage|priest|cleric|wizard|druid|sorcerer|warlock/.test(text)) return 'Controller';
    if (/pack tactics|stealth|ambush|nimble|surprise/.test(text)) return 'Skirmisher';
    if (/regeneration|brute|multiattack|slam|bite|claw/.test(text)) return 'Bruiser';
    if (/fly|ranged|bow|crossbow|ray|breath|cone|line \d|aura/.test(text)) return 'Artillery';
    if (/leader|captain|commander|fanatic|hobgoblin/.test(text)) return 'Leader';
    return 'Generalist';
  }

  function inferTacticalRole(monster, actionEntries, spellcasting, combatTags) {
    if (combatTags.boss) return 'Solo';
    if (spellcasting && (spellcasting.header || spellcasting.slots.length || spellcasting.cantrips)) return 'Controller';
    const actBlob = [
      ...(actionEntries.standard || []),
      ...(actionEntries.legendary || [])
    ].map((e) => e.full || e.body || '').join(' ').toLowerCase();
    if (/breath|cone|line \d|recharge|aura|radius/.test(actBlob)) return 'Artillery';
    if (/multiattack|swallow|grapple|paralyz|petrif/.test(actBlob)) return 'Bruiser';
    return inferRoleClassic(monster);
  }

  function stripSpellcastingFromTraits(traitsStr, parsed) {
    if (!parsed || !traitsStr) return traitsStr;
    return String(traitsStr)
      .replace(/\bSpellcasting\s*\([^)]+\)[^.]*\.?/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function buildEncounterHints(monster, enriched) {
    const hints = [];
    const t = [monster.traits, monster.actions].join(' ').toLowerCase();
    if (/recharge|breath|cone|line \d|sphere|radius \d/.test(t)) hints.push('Limited-use area threat—spread after it fires, then collapse.');
    if (/pack tactics/i.test(t)) hints.push('Fights beside allies for advantage; split pairs with control or terrain.');
    if (enriched.parsedSpellcasting) hints.push('Spellcaster: expect buffs or control; pressure concentration if possible.');
    if (/regeneration/i.test(t) && /fire|acid|radiant|necrotic/.test(t)) hints.push('Check regeneration shutoff damage types in the stat block.');
    if (/frightful presence|aura of fear|fear\b/i.test(t)) hints.push('Fear/morale effects can reshape formation—prep Wis saves.');
    if (enriched.combatTags.boss) hints.push('Boss-tier: pace legendary uses; give players a clear objective beyond “deplete HP.”');
    if (enriched.combatTags.swarm) hints.push('Swarm profile: area damage pays off; single-target is inefficient.');
    if (enriched.combatTags.elite) hints.push('Elite stat line: may outlast minions—don’t let it free-action focus one PC forever.');
    if (/invisibility|greater invisibility|ethereal|phase spider|misty step/i.test(t)) hints.push('High mobility or phasing—ready actions, detection, or zone control help.');
    if (/legendary resistance/i.test(t)) hints.push('Legendary Resistance: save-or-suck spells may fail early—burn wisely.');
    return [...new Set(hints)].slice(0, 10);
  }

  function inferEnvironment(monster) {
    if (monster.environment) return monster.environment;
    const text = [monster.traits, monster.actions, monster.name, monster.type, monster.senses].join(' ').toLowerCase();
    for (const [env, keys] of Object.entries(ENVIRONMENT_KEYWORDS)) {
      if (!keys.length) continue;
      if (keys.some((k) => text.includes(k))) return env;
    }
    if (/fly/.test(String(monster.speed || '').toLowerCase())) return 'mountain';
    if (/darkvision|blindsight/.test(text) && /undead|aberration|construct/.test(text)) return 'underground';
    return 'any';
  }

  function movementProfile(monster) {
    const s = String(monster.speed || '').toLowerCase();
    if (s.includes('fly')) return 'flying';
    if (s.includes('swim')) return 'swimming';
    if (s.includes('climb')) return 'climbing';
    return 'ground';
  }

  function senseProfile(monster) {
    const s = String(monster.senses || '').toLowerCase();
    if (s.includes('truesight')) return 'truesight';
    if (s.includes('blindsight')) return 'blindsight';
    if (s.includes('darkvision')) return 'darkvision';
    return 'normal';
  }

  function estimatedDamage(monster) {
    const text = String(monster.actions || '').toLowerCase();
    const nums = [...text.matchAll(/(\d+)\s*\((?:\d+d\d+(?:\s*[+\-]\s*\d+)?)\)/g)].map((mm) => parseInt(mm[1], 10));
    if (nums.length) return Math.max(...nums);
    return Math.max(1, Math.round((Number(monster.cr) || 0) * 6));
  }

  function threatScore(monster) {
    const cr = Number(monster.cr) || 0;
    const hp = parseHp(monster.hp);
    const ac = Number(monster.ac) || 10;
    const dmg = estimatedDamage(monster);
    const specials = [monster.traits, monster.actions, monster.immunities, monster.vulnerabilities].filter(Boolean).length;
    return Math.round((cr * 18) + (hp * 0.25) + (ac * 1.5) + (dmg * 1.8) + (specials * 4));
  }

  function effectiveHp(monster) {
    const base = parseHp(monster.hp);
    const imm = String(monster.immunities || '').split(',').filter(Boolean).length;
    const vuln = String(monster.vulnerabilities || '').split(',').filter(Boolean).length;
    return Math.max(1, Math.round(base + imm * 10 - vuln * 5));
  }

  function normalizeMonster(monster) {
    const out = Object.assign({}, monster);
    const sections = extractActionSections(monster);
    const combinedLower = [monster.traits, monster.actions, sections.legendary, sections.bonus, sections.reaction].filter(Boolean).join(' ').toLowerCase();

    const standardList = splitStandardActions(sections.standard);
    const bonusList = sections.bonus ? splitStandardActions(sections.bonus) : extractBonusFromTraits(monster.traits);
    const reactionList = sections.reaction ? splitStandardActions(sections.reaction) : extractReactionsFromTraits(monster.traits);
    const legendaryList = sections.legendary ? splitStandardActions(sections.legendary) : [];
    const lairList = sections.lair ? splitStandardActions(sections.lair) : [];

    out.actionEntries = {
      standard: standardList,
      bonus: bonusList,
      reaction: reactionList,
      legendary: legendaryList,
      lair: lairList
    };
    out.parsedSpellcasting = parseSpellcasting(monster.traits || '');
    out.biomes = inferBiomesList(monster);
    out.environment = out.biomes[0] || inferEnvironment(monster);
    out.combatTags = inferCombatTags(monster, sections, combinedLower);
    out.tacticalRole = inferTacticalRole(monster, out.actionEntries, out.parsedSpellcasting, out.combatTags);
    out.role = out.tacticalRole;
    out.movementProfile = movementProfile(monster);
    out.senseProfile = senseProfile(monster);
    out.estimatedDamage = estimatedDamage(monster);
    out.threatScore = threatScore(monster);
    out.effectiveHp = effectiveHp(monster);
    out.sourceLabel = classifySource(monster.source);
    out.encounterHints = buildEncounterHints(monster, out);
    return out;
  }

  function classifySource(source) {
    const s = String(source || 'Core 5e').toLowerCase();
    const allowed = ['phb', 'phb 2024', 'phb2024', 'xgte', 'tcoe', 'mordenkainen presents: monsters of the multiverse', 'srd', 'mm', 'dmg', 'core 5e', '5e', '5.5e', '2024'];
    return allowed.includes(s) ? String(source || 'Core 5e') : 'Personal Homebrew (Legacy Edition)';
  }

  function matchMonster(monster, query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return true;
    const tags = monster.combatTags || {};
    const tagStr = [tags.boss && 'boss', tags.elite && 'elite', tags.swarm && 'swarm'].filter(Boolean).join(' ');
    const hay = [
      monster.name,
      monster.type,
      monster.role,
      monster.tacticalRole,
      monster.environment,
      (monster.biomes || []).join(' '),
      tagStr,
      monster.sourceLabel,
      monster.traits,
      monster.actions,
      monster.senses,
      monster.languages
    ].join(' ').toLowerCase();
    return hay.includes(q);
  }

  function filterMonsters(monsters, filters = {}) {
    return (monsters || []).map(normalizeMonster).filter((m) => {
      if (!matchMonster(m, filters.query)) return false;
      if (filters.type && m.type !== filters.type) return false;
      if (filters.role && m.role !== filters.role) return false;
      if (filters.environment && m.environment !== filters.environment) return false;
      if (filters.source && m.sourceLabel !== filters.source) return false;
      if (filters.movementProfile && m.movementProfile !== filters.movementProfile) return false;
      if (filters.senseProfile && m.senseProfile !== filters.senseProfile) return false;
      if (filters.crBucket) {
        const cr = Number(m.cr) || 0;
        const map = {
          trivial: cr <= 0.5,
          easy: cr > 0.5 && cr <= 4,
          medium: cr > 4 && cr <= 10,
          hard: cr > 10 && cr <= 16,
          deadly: cr > 16
        };
        if (!map[filters.crBucket]) return false;
      }
      if (filters.boss != null && !!m.combatTags?.boss !== !!filters.boss) return false;
      if (filters.elite != null && !!m.combatTags?.elite !== !!filters.elite) return false;
      if (filters.swarm != null && !!m.combatTags?.swarm !== !!filters.swarm) return false;
      return true;
    });
  }

  function sortMonsters(monsters, sortBy) {
    const arr = [...(monsters || [])];
    arr.sort((a, b) => {
      if (sortBy === 'cr') return (Number(a.cr) || 0) - (Number(b.cr) || 0);
      if (sortBy === 'xp') return (Number(a.xp) || 0) - (Number(b.xp) || 0);
      if (sortBy === 'threat') return (a.threatScore || 0) - (b.threatScore || 0);
      if (sortBy === 'type') return String(a.type || '').localeCompare(String(b.type || ''));
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
    return arr;
  }

  function buildEncounterBudget(monsters, partyLevel, partySize) {
    const count = Math.max(1, Number(partySize) || 4);
    const level = Math.max(1, Number(partyLevel) || 1);
    const baseline = level * count * 50;
    const totalXp = (monsters || []).reduce((sum, m) => sum + (Number(m.xp) || 0), 0);
    const adjustedXp = Math.round(totalXp * (1 + Math.max(0, (monsters || []).length - 1) * 0.15));
    let difficulty = 'Trivial';
    if (adjustedXp > baseline * 3) difficulty = 'Deadly';
    else if (adjustedXp > baseline * 2) difficulty = 'Hard';
    else if (adjustedXp > baseline * 1.2) difficulty = 'Medium';
    else if (adjustedXp > baseline * 0.6) difficulty = 'Easy';
    return { totalXp, adjustedXp, baseline, difficulty };
  }

  const api = {
    parseHp,
    inferRole: inferRoleClassic,
    inferEnvironment,
    inferBiomesList,
    movementProfile,
    senseProfile,
    estimatedDamage,
    threatScore,
    effectiveHp,
    normalizeMonster,
    classifySource,
    filterMonsters,
    sortMonsters,
    buildEncounterBudget,
    splitStandardActions,
    parseSpellcasting,
    extractActionSections,
    inferCombatTags,
    buildEncounterHints,
    stripSpellcastingFromTraits
  };
  global.MonsterpediaEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
