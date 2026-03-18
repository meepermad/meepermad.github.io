/**
 * D&D 5e Content - Races, Classes, Subclasses, Backgrounds
 * Based on SRD and common PHB content.
 * Rule sets filter which content appears; PHB = full, basic2018 = limited.
 */

// ========== CONSTANTS ==========
// Standard languages and damage types for dropdowns
const LANGUAGES = ['Common', 'Dwarvish', 'Elvish', 'Giant', 'Gnomish', 'Goblin', 'Halfling', 'Orc', 'Abyssal', 'Auran', 'Celestial', 'Draconic', 'Deep Speech', 'Infernal', 'Primordial', 'Sylvan', 'Undercommon', 'Other'];
const DAMAGE_TYPES = ['Acid', 'Bludgeoning', 'Cold', 'Fire', 'Force', 'Lightning', 'Necrotic', 'Piercing', 'Poison', 'Psychic', 'Radiant', 'Slashing', 'Thunder'];

// ========== RULE SETS ==========
// Toggle between different D&D 5e rule sets. Stored in localStorage as 'dnd_ruleset'.
const RULESETS = {
  phb: {
    id: 'phb',
    name: 'Player\'s Handbook / SRD',
    description: 'Full content from the SRD and Player\'s Handbook.',
    link: null,
    races: null,
    raceSubraces: null,
    classes: null,
    classSubclasses: null,
    backgrounds: null
  },
  basic2018: {
    id: 'basic2018',
    name: 'Basic Rules 2018',
    description: 'Free D&D 5e introduction from Wizards of the Coast. Core races, 4 classes, 6 backgrounds.',
    link: 'https://media.wizards.com/2018/dnd/downloads/DnD_BasicRules_2018.pdf',
    races: ['Human', 'Dwarf', 'Elf', 'Halfling'],
    raceSubraces: { Elf: ['High Elf', 'Wood Elf'] },
    classes: ['Cleric', 'Fighter', 'Rogue', 'Wizard'],
    classSubclasses: {
      Cleric: ['Life Domain', 'Knowledge Domain'],
      Fighter: ['Champion'],
      Rogue: ['Thief'],
      Wizard: ['School of Evocation']
    },
    backgrounds: ['Acolyte', 'Criminal', 'Folk Hero', 'Noble', 'Sage', 'Soldier']
  }
};

/** Get single active ruleset (legacy) */
function getActiveRuleset() {
  const id = localStorage.getItem('dnd_ruleset') || 'phb';
  return RULESETS[id] || RULESETS.phb;
}

function setActiveRuleset(id) {
  if (RULESETS[id]) {
    localStorage.setItem('dnd_ruleset', id);
    return true;
  }
  return false;
}

// Multiple rule books: enable several at once for combined content
function getEnabledRulesets() {
  try {
    const saved = localStorage.getItem('dnd_enabled_rulesets');
    if (saved) {
      const arr = JSON.parse(saved);
      if (Array.isArray(arr) && arr.length > 0) return arr;
    }
    const legacy = localStorage.getItem('dnd_ruleset');
    if (legacy && RULESETS[legacy]) return [legacy];
  } catch (e) {}
  return ['phb'];
}

function setEnabledRulesets(ids) {
  if (Array.isArray(ids)) {
    localStorage.setItem('dnd_enabled_rulesets', JSON.stringify(ids));
    return true;
  }
  return false;
}

function toggleRuleset(id) {
  const current = getEnabledRulesets();
  const idx = current.indexOf(id);
  if (idx >= 0) {
    if (current.length === 1) return false; // keep at least one
    current.splice(idx, 1);
  } else {
    current.push(id);
  }
  setEnabledRulesets(current);
  return true;
}

function getMergedRulesetFilter() {
  const enabled = getEnabledRulesets();
  const rulesets = enabled.map(id => RULESETS[id]).filter(Boolean);
  if (rulesets.length === 0) return { races: null, classes: null, backgrounds: null, raceSubraces: null, classSubclasses: null };
  const hasUnrestrictedRaces = rulesets.some(r => !r.races);
  const hasUnrestrictedClasses = rulesets.some(r => !r.classes);
  const hasUnrestrictedBackgrounds = rulesets.some(r => !r.backgrounds);
  return {
    races: hasUnrestrictedRaces ? null : [...new Set(rulesets.flatMap(r => r.races || []))],
    classes: hasUnrestrictedClasses ? null : [...new Set(rulesets.flatMap(r => r.classes || []))],
    backgrounds: hasUnrestrictedBackgrounds ? null : [...new Set(rulesets.flatMap(r => r.backgrounds || []))],
    raceSubraces: mergeRaceSubraces(rulesets),
    classSubclasses: mergeClassSubclasses(rulesets)
  };
}

function mergeRaceSubraces(rulesets) {
  const result = {};
  const allRaces = [...new Set(rulesets.flatMap(r => Object.keys(r.raceSubraces || {})))];
  for (const race of allRaces) {
    const lists = rulesets.map(r => r.raceSubraces?.[race]).filter(Boolean);
    if (lists.some(l => !l || l.length === 0)) continue;
    result[race] = [...new Set(lists.flat())];
  }
  const hasAnyUnrestricted = rulesets.some(r => !r.raceSubraces || Object.keys(r.raceSubraces || {}).length === 0);
  return hasAnyUnrestricted ? null : (Object.keys(result).length ? result : null);
}

function mergeClassSubclasses(rulesets) {
  const result = {};
  const allClasses = [...new Set(rulesets.flatMap(r => Object.keys(r.classSubclasses || {})))];
  for (const cls of allClasses) {
    const lists = rulesets.map(r => r.classSubclasses?.[cls]).filter(Boolean);
    if (lists.some(l => !l || l.length === 0)) continue;
    result[cls] = [...new Set(lists.flat())];
  }
  const hasAnyUnrestricted = rulesets.some(r => !r.classSubclasses || Object.keys(r.classSubclasses || {}).length === 0);
  return hasAnyUnrestricted ? null : (Object.keys(result).length ? result : null);
}

// ========== RACES ==========
const RACES = [
  {
    id: 'human',
    name: 'Human',
    description: 'Humans are the most adaptable and ambitious people among the common races. They are incredibly diverse in appearance, culture, and temperament, with lifespans of less than a century but boundless drive. Their versatility makes them suitable for any class.',
    speed: 30,
    abilityScore: { any: 1 },
    traits: ['Extra Language'],
    languages: ['Common'],
    languagesExtra: 1,
    resistances: [],
    immunities: [],
    vulnerabilities: [],
    weaknesses: [],
    subraces: [
      { name: 'Standard', description: 'The default human, receiving +1 to all ability scores and one extra language. Broadly capable and adaptable.', abilityScore: { any: 1 }, traits: ['Extra Language'], languages: [], languagesExtra: 1 },
      { name: 'Variant', description: 'A more specialized human who trades the broad +1 bonuses for a feat, an extra skill proficiency, and +1 to two abilities of your choice. Popular for feat-based builds.', abilityScore: { any: 1 }, traits: ['Feat', 'Extra Skill', 'Extra Language'], languages: [], languagesExtra: 1 }
    ]
  },
  {
    id: 'elf',
    name: 'Elf',
    description: 'Elves are a magical people of otherworldly grace, living in the world but not entirely part of it. With lifespans stretching over 700 years, they have a long perspective on events. They are slender, standing 5–6 feet tall, and possess keen senses, darkvision, and resistance to charm magic.',
    speed: 30,
    abilityScore: { dexterity: 2 },
    traits: ['Darkvision', 'Fey Ancestry', 'Trance'],
    languages: ['Common', 'Elvish'],
    languagesExtra: 0,
    resistances: [],
    immunities: [],
    vulnerabilities: [],
    weaknesses: [],
    subraces: [
      { name: 'High Elf', description: 'Elves of keen mind and mastery of basic magic. They gain +1 Intelligence, know one wizard cantrip, and learn an extra language. Common among elven scholars and wizards.', abilityScore: { dexterity: 2, intelligence: 1 }, traits: ['Cantrip', 'Extra Language'], languages: [], languagesExtra: 1 },
      { name: 'Wood Elf', description: 'Swift and stealthy elves of the deep forests. They gain +1 Wisdom, 35-foot speed (Fleet of Foot), and can hide in light natural cover (Mask of the Wild). Great for rangers and druids.', abilityScore: { dexterity: 2, wisdom: 1 }, traits: ['Fleet of Foot', 'Mask of the Wild'], languages: [], languagesExtra: 0 },
      { name: 'Drow', description: 'Dark elves from the Underdark, known for their sinister reputation and powerful magic. They gain +1 Charisma, 120-foot Superior Darkvision, and innate spellcasting (dancing lights, faerie fire, darkness), but suffer disadvantage on attack rolls and Perception in direct sunlight.', abilityScore: { dexterity: 2, charisma: 1 }, traits: ['Superior Darkvision', 'Drow Magic', 'Sunlight Sensitivity'], languages: [], languagesExtra: 0, weaknesses: ['Sunlight Sensitivity'] },
      { name: 'Eladrin', description: 'Elves of the Feywild whose appearance shifts with the seasons. They gain +1 Charisma and can use Fey Step to teleport 30 feet once per short rest, with a bonus effect based on their current season.', abilityScore: { dexterity: 2, charisma: 1 }, traits: ['Fey Step'], languages: [], languagesExtra: 0 }
    ]
  },
  {
    id: 'dwarf',
    name: 'Dwarf',
    description: 'Bold and hardy, dwarves are known as skilled warriors, miners, and workers of stone and metal. Standing 4–5 feet tall but broad and compact, they are tough, resilient, and live over 350 years. They have resistance to poison and an innate knowledge of stonework.',
    speed: 25,
    abilityScore: { constitution: 2 },
    traits: ['Darkvision', 'Dwarven Resilience', 'Stonecunning'],
    languages: ['Common', 'Dwarvish'],
    languagesExtra: 0,
    resistances: ['Poison'],
    immunities: [],
    vulnerabilities: [],
    weaknesses: [],
    subraces: [
      { name: 'Mountain Dwarf', description: 'Strong and hardy dwarves accustomed to rugged mountain life. They gain +2 Strength (in addition to +2 Con) and proficiency with light and medium armor. One of the best martial race options.', abilityScore: { constitution: 2, strength: 2 }, traits: ['Dwarven Armor Training'], resistances: [], immunities: [], vulnerabilities: [] },
      { name: 'Hill Dwarf', description: 'Wise and tough dwarves with a deep connection to the earth. They gain +1 Wisdom and Dwarven Toughness (+1 HP per level). Excellent for clerics and druids.', abilityScore: { constitution: 2, wisdom: 1 }, traits: ['Dwarven Toughness'], resistances: [], immunities: [], vulnerabilities: [] },
      { name: 'Duergar', description: 'Gray dwarves from the Underdark, grim and resilient. They gain +1 Strength, Superior Darkvision (120 ft.), and can cast enlarge/reduce and invisibility once per long rest each. However, they have Sunlight Sensitivity.', abilityScore: { constitution: 2, strength: 1 }, traits: ['Superior Darkvision', 'Duergar Magic', 'Sunlight Sensitivity'], resistances: [], immunities: [], vulnerabilities: [], weaknesses: ['Sunlight Sensitivity'] }
    ]
  },
  {
    id: 'halfling',
    name: 'Halfling',
    description: 'Small and practical, halflings stand about 3 feet tall and survive in a world of larger creatures through resourcefulness and luck. They reroll natural 1s on attack rolls, checks, and saves (Lucky), are brave against fear, and can move through the space of larger creatures.',
    speed: 25,
    abilityScore: { dexterity: 2 },
    traits: ['Lucky', 'Brave', 'Halfling Nimbleness'],
    languages: ['Common', 'Halfling'],
    languagesExtra: 0,
    resistances: [],
    immunities: [],
    vulnerabilities: [],
    weaknesses: [],
    subraces: [
      { name: 'Lightfoot', description: 'Sociable and stealthy halflings who can hide behind creatures one size larger than them. They gain +1 Charisma. Great for rogues, bards, and any sneaky character.', abilityScore: { dexterity: 2, charisma: 1 }, traits: ['Naturally Stealthy'] },
      { name: 'Stout', description: 'Hardy halflings with dwarven blood in their veins. They gain +1 Constitution and have advantage on saves against poison, plus resistance to poison damage. Good for front-line halflings.', abilityScore: { dexterity: 2, constitution: 1 }, traits: ['Stout Resilience'], resistances: ['Poison'] },
      { name: 'Ghostwise', description: 'Reclusive halflings from deep forests who communicate through limited telepathy (30 ft., one creature at a time). They gain +1 Wisdom. Uncommon but flavorful for druids and monks.', abilityScore: { dexterity: 2, wisdom: 1 }, traits: ['Silent Speech'] }
    ]
  },
  {
    id: 'dragonborn',
    name: 'Dragonborn',
    description: 'Dragonborn are tall, proud humanoids who resemble dragons, standing over 6 feet tall with scales, a broad frame, and a draconic head. They have no tails or wings. Each dragonborn has a draconic ancestry that determines their breath weapon and damage resistance. Choose a color below to set your ancestry.',
    speed: 30,
    abilityScore: { strength: 2, charisma: 1 },
    traits: ['Draconic Ancestry', 'Breath Weapon', 'Damage Resistance'],
    languages: ['Common', 'Draconic'],
    languagesExtra: 0,
    resistances: [],
    immunities: [],
    vulnerabilities: [],
    weaknesses: [],
    subraces: [
      { name: 'Black (Acid)', description: 'Black dragonborn descend from black dragons. Breath weapon: 5×30 ft. line of acid (Dex save). Resistant to acid damage.', abilityScore: { strength: 2, charisma: 1 }, traits: ['Breath Weapon (Acid, 5×30 ft. line, Dex save)', 'Acid Resistance'], resistances: ['Acid'] },
      { name: 'Blue (Lightning)', description: 'Blue dragonborn descend from blue dragons. Breath weapon: 5×30 ft. line of lightning (Dex save). Resistant to lightning damage.', abilityScore: { strength: 2, charisma: 1 }, traits: ['Breath Weapon (Lightning, 5×30 ft. line, Dex save)', 'Lightning Resistance'], resistances: ['Lightning'] },
      { name: 'Green (Poison)', description: 'Green dragonborn descend from green dragons. Breath weapon: 15 ft. cone of poison (Con save). Resistant to poison damage.', abilityScore: { strength: 2, charisma: 1 }, traits: ['Breath Weapon (Poison, 15 ft. cone, Con save)', 'Poison Resistance'], resistances: ['Poison'] },
      { name: 'Red (Fire)', description: 'Red dragonborn descend from red dragons. Breath weapon: 15 ft. cone of fire (Dex save). Resistant to fire damage. The most iconic dragonborn choice.', abilityScore: { strength: 2, charisma: 1 }, traits: ['Breath Weapon (Fire, 15 ft. cone, Dex save)', 'Fire Resistance'], resistances: ['Fire'] },
      { name: 'White (Cold)', description: 'White dragonborn descend from white dragons. Breath weapon: 15 ft. cone of cold (Con save). Resistant to cold damage.', abilityScore: { strength: 2, charisma: 1 }, traits: ['Breath Weapon (Cold, 15 ft. cone, Con save)', 'Cold Resistance'], resistances: ['Cold'] },
      { name: 'Brass (Fire)', description: 'Brass dragonborn descend from brass dragons. Breath weapon: 5×30 ft. line of fire (Dex save). Resistant to fire damage.', abilityScore: { strength: 2, charisma: 1 }, traits: ['Breath Weapon (Fire, 5×30 ft. line, Dex save)', 'Fire Resistance'], resistances: ['Fire'] },
      { name: 'Bronze (Lightning)', description: 'Bronze dragonborn descend from bronze dragons. Breath weapon: 5×30 ft. line of lightning (Dex save). Resistant to lightning damage.', abilityScore: { strength: 2, charisma: 1 }, traits: ['Breath Weapon (Lightning, 5×30 ft. line, Dex save)', 'Lightning Resistance'], resistances: ['Lightning'] },
      { name: 'Copper (Acid)', description: 'Copper dragonborn descend from copper dragons. Breath weapon: 5×30 ft. line of acid (Dex save). Resistant to acid damage.', abilityScore: { strength: 2, charisma: 1 }, traits: ['Breath Weapon (Acid, 5×30 ft. line, Dex save)', 'Acid Resistance'], resistances: ['Acid'] },
      { name: 'Gold (Fire)', description: 'Gold dragonborn descend from gold dragons. Breath weapon: 15 ft. cone of fire (Dex save). Resistant to fire damage.', abilityScore: { strength: 2, charisma: 1 }, traits: ['Breath Weapon (Fire, 15 ft. cone, Dex save)', 'Fire Resistance'], resistances: ['Fire'] },
      { name: 'Silver (Cold)', description: 'Silver dragonborn descend from silver dragons. Breath weapon: 15 ft. cone of cold (Con save). Resistant to cold damage.', abilityScore: { strength: 2, charisma: 1 }, traits: ['Breath Weapon (Cold, 15 ft. cone, Con save)', 'Cold Resistance'], resistances: ['Cold'] }
    ]
  },
  {
    id: 'gnome',
    name: 'Gnome',
    description: 'Gnomes are small (3–4 feet), energetic folk who delight in life, invention, and exploration. They live 350–500 years and are known for their curiosity and resilience against magic. Gnome Cunning gives them advantage on Intelligence, Wisdom, and Charisma saving throws against magic.',
    speed: 25,
    abilityScore: { intelligence: 2 },
    traits: ['Darkvision', 'Gnome Cunning'],
    languages: ['Common', 'Gnomish'],
    languagesExtra: 0,
    resistances: [],
    immunities: [],
    vulnerabilities: [],
    weaknesses: [],
    subraces: [
      { name: 'Forest Gnome', description: 'Reclusive gnomes with a knack for illusion magic and a kinship with small animals. They gain +1 Dexterity, know the minor illusion cantrip, and can speak with small beasts. Great for druids and illusionists.', abilityScore: { intelligence: 2, dexterity: 1 }, traits: ['Natural Illusionist', 'Speak with Small Beasts'] },
      { name: 'Rock Gnome', description: 'Inventive and hardy gnomes who love tinkering with devices. They gain +1 Constitution, double proficiency on History checks about magic items and technology, and can create tiny clockwork devices. Perfect for artificers.', abilityScore: { intelligence: 2, constitution: 1 }, traits: ['Artificer\'s Lore', 'Tinker'] },
      { name: 'Deep Gnome (Svirfneblin)', description: 'Gnomes of the Underdark, cautious and adapted to subterranean life. They gain +1 Dexterity, 120-ft. Superior Darkvision, advantage on Stealth in rocky terrain (Stone Camouflage), and access to Svirfneblin Magic.', abilityScore: { intelligence: 2, dexterity: 1 }, traits: ['Superior Darkvision', 'Stone Camouflage', 'Svirfneblin Magic'], languages: [], languagesExtra: 0 }
    ]
  },
  {
    id: 'aarakocra',
    name: 'Aarakocra',
    description: 'Aarakocra are bird-like humanoids originally from the Elemental Plane of Air. Standing about 5 feet tall with wingspans of 20 feet, they have hollow bones and talons. Their 50-foot flying speed makes them one of the most mobile races, though some DMs restrict flight at low levels.',
    speed: 30,
    abilityScore: { dexterity: 2, wisdom: 1 },
    traits: ['Flight (50 ft.)', 'Talons (1d4 slashing)'],
    languages: ['Aarakocra', 'Auran'],
    languagesExtra: 0,
    resistances: [],
    immunities: [],
    vulnerabilities: [],
    weaknesses: [],
    subraces: []
  },
  {
    id: 'half-elf',
    name: 'Half-Elf',
    description: 'Half-elves blend human adaptability with elven grace. They gain +2 Charisma and +1 to two other abilities of their choice, darkvision, Fey Ancestry (advantage vs. charm, immune to magic sleep), two extra skill proficiencies, and an extra language. One of the most versatile races, excellent for any class.',
    speed: 30,
    abilityScore: { charisma: 2, any: 1 },
    traits: ['Darkvision', 'Fey Ancestry', 'Skill Versatility'],
    languages: ['Common', 'Elvish'],
    languagesExtra: 1,
    resistances: [],
    immunities: [],
    vulnerabilities: [],
    weaknesses: [],
    subraces: []
  },
  {
    id: 'half-orc',
    name: 'Half-Orc',
    description: 'Half-orcs are imposing figures who combine orcish physical power with human ambition. They gain +2 Strength, +1 Constitution, darkvision, Menacing (proficiency in Intimidation), Relentless Endurance (drop to 1 HP instead of 0 once per long rest), and Savage Attacks (extra damage die on critical melee hits). Ideal for barbarians, fighters, and paladins.',
    speed: 30,
    abilityScore: { strength: 2, constitution: 1 },
    traits: ['Darkvision', 'Menacing', 'Relentless Endurance', 'Savage Attacks'],
    languages: ['Common', 'Orc'],
    languagesExtra: 0,
    resistances: [],
    immunities: [],
    vulnerabilities: [],
    weaknesses: [],
    subraces: []
  },
  {
    id: 'tiefling',
    name: 'Tiefling',
    description: 'Tieflings bear the marks of an infernal bloodline — horns, a tail, solid-colored eyes, and skin tones ranging from human shades to reds and purples. They gain +2 Charisma, +1 Intelligence, darkvision, fire resistance, and Infernal Legacy (thaumaturgy cantrip, plus hellish rebuke and darkness at higher levels). Effective warlocks, sorcerers, and paladins.',
    speed: 30,
    abilityScore: { charisma: 2, intelligence: 1 },
    traits: ['Darkvision', 'Hellish Resistance', 'Infernal Legacy'],
    languages: ['Common', 'Infernal'],
    languagesExtra: 0,
    resistances: ['Fire'],
    immunities: [],
    vulnerabilities: [],
    weaknesses: [],
    subraces: []
  },
  {
    id: 'genasi',
    name: 'Genasi',
    description: 'Genasi are humanoids infused with elemental energy, descended from genies or touched by elemental planes. They look mostly human but have distinctive features — flickering flames for hair, blue skin, earthen cracks, or a constant breeze. Each subrace grants unique elemental powers and resistances.',
    speed: 30,
    abilityScore: { constitution: 2 },
    traits: [],
    languages: ['Common'],
    languagesExtra: 1,
    resistances: [],
    immunities: [],
    vulnerabilities: [],
    weaknesses: [],
    subraces: [
      { name: 'Air Genasi', description: 'Descended from djinn. They gain +1 Dexterity, can hold their breath indefinitely, and can cast levitate once per long rest. Light and breezy in personality.', abilityScore: { constitution: 2, dexterity: 1 }, traits: ['Unending Breath', 'Mingle with the Wind'], resistances: [], immunities: [], vulnerabilities: [] },
      { name: 'Earth Genasi', description: 'Descended from dao. They gain +1 Strength, can move across difficult terrain made of earth or stone without extra movement cost, and can cast pass without trace once per long rest.', abilityScore: { constitution: 2, strength: 1 }, traits: ['Earth Walk', 'Merge with Stone'], resistances: [], immunities: [], vulnerabilities: [] },
      { name: 'Fire Genasi', description: 'Descended from efreet. They gain +1 Intelligence, darkvision, fire resistance, and can cast produce flame (cantrip) and burning hands once per long rest.', abilityScore: { constitution: 2, intelligence: 1 }, traits: ['Darkvision', 'Fire Resistance', 'Reach to the Blaze'], resistances: ['Fire'], immunities: [], vulnerabilities: [] },
      { name: 'Water Genasi', description: 'Descended from marids. They gain +1 Wisdom, can breathe air and water, have a 30-ft. swim speed, acid resistance, and can cast create or destroy water and shape water.', abilityScore: { constitution: 2, wisdom: 1 }, traits: ['Amphibious', 'Swim', 'Call to the Wave'], resistances: ['Acid'], immunities: [], vulnerabilities: [] }
    ]
  },
  {
    id: 'goliath',
    name: 'Goliath',
    description: 'Goliaths are massive humanoids (7–8 feet tall) from remote mountain peaks, where they compete against giants for survival. They value self-sufficiency and personal achievement. They gain +2 Strength, Natural Athlete (Athletics proficiency), Stone\'s Endurance (reduce damage by 1d12+Con once per rest), and Powerful Build (count as Large for carrying capacity).',
    speed: 30,
    abilityScore: { strength: 2 },
    traits: ['Natural Athlete', "Stone's Endurance", 'Powerful Build'],
    languages: ['Common', 'Giant'],
    languagesExtra: 0,
    resistances: [],
    immunities: [],
    vulnerabilities: [],
    weaknesses: [],
    subraces: []
  },
  {
    id: 'aasimar',
    name: 'Aasimar',
    description: 'Aasimar are humanoids with a celestial heritage — an angelic guide watches over them. They have luminous features, often with golden or silver eyes and hair. They gain +2 Charisma, darkvision, resistance to necrotic and radiant damage, and Healing Hands (heal HP equal to your level, once per long rest). Each subrace grants a powerful transformation at 3rd level.',
    speed: 30,
    abilityScore: { charisma: 2 },
    traits: ['Darkvision', 'Celestial Resistance', 'Healing Hands'],
    languages: ['Common', 'Celestial'],
    languagesExtra: 0,
    resistances: ['Necrotic', 'Radiant'],
    immunities: [],
    vulnerabilities: [],
    weaknesses: [],
    subraces: [
      { name: 'Protector', description: 'At 3rd level, you can sprout spectral wings (fly 30 ft.) and deal extra radiant damage equal to your level for 1 minute. +1 Wisdom. The classic angelic hero.', abilityScore: { charisma: 2, wisdom: 1 }, traits: ['Radiant Soul'] },
      { name: 'Scourge', description: 'At 3rd level, you can unleash divine energy that sears nearby enemies (and yourself) for radiant damage each turn. +1 Constitution. The burning martyr archetype.', abilityScore: { charisma: 2, constitution: 1 }, traits: ['Radiant Consumption'] },
      { name: 'Fallen', description: 'At 3rd level, you can manifest skeletal, flightless wings that frighten nearby enemies. +1 Strength. An aasimar whose light has been tainted by darkness or despair.', abilityScore: { charisma: 2, strength: 1 }, traits: ['Necrotic Shroud'] }
    ]
  },
  {
    id: 'tabaxi',
    name: 'Tabaxi',
    description: 'Tabaxi are cat-like humanoids from a distant southern land, driven by an insatiable curiosity to collect stories, artifacts, and lore. They gain +2 Dexterity, +1 Charisma, darkvision, Feline Agility (double speed for one turn, recharges when you stop moving), climbing speed 20 ft., and Cat\'s Claws (1d4 slashing unarmed strikes).',
    speed: 30,
    abilityScore: { dexterity: 2, charisma: 1 },
    traits: ['Darkvision', 'Feline Agility', 'Cat\'s Claws'],
    languages: ['Common'],
    languagesExtra: 1,
    resistances: [],
    immunities: [],
    vulnerabilities: [],
    weaknesses: [],
    subraces: []
  },
  {
    id: 'kenku',
    name: 'Kenku',
    description: 'Kenku are flightless, crow-like humanoids cursed to have lost their wings, their creativity, and their true voices. They communicate by mimicking sounds and speech they have heard (Mimicry). They gain +2 Dexterity, proficiency in two skills of your choice (Expert Forgery, Kenku Training), and are excellent rogues and rangers.',
    speed: 30,
    abilityScore: { dexterity: 2 },
    traits: ['Expert Forgery', 'Kenku Training', 'Mimicry'],
    languages: ['Common', 'Auran'],
    languagesExtra: 0,
    resistances: [],
    immunities: [],
    vulnerabilities: [],
    weaknesses: [],
    subraces: []
  },
  { id: 'orc', name: 'Orc', description: 'Orcs are powerful, aggressive humanoids with gray-green skin and prominent tusks. They gain +2 Strength, +1 Constitution, darkvision, Aggressive (bonus action to move toward a hostile creature), and Intimidation proficiency. Straightforward and effective as barbarians and fighters.', speed: 30, abilityScore: { strength: 2, constitution: 1 }, traits: ['Darkvision', 'Aggressive', 'Menacing'], languages: ['Common', 'Orc'], languagesExtra: 0, resistances: [], immunities: [], vulnerabilities: [], weaknesses: [], subraces: [] },
  { id: 'lizardfolk', name: 'Lizardfolk', description: 'Lizardfolk are cold-blooded reptilian humanoids who think in practical, survival-oriented terms. They gain +2 Constitution, +1 Wisdom, a natural bite attack (1d6 piercing), Natural Armor (AC = 13 + Dex), can hold their breath 15 minutes, and can craft shields and weapons from fallen creatures.', speed: 30, abilityScore: { constitution: 2, wisdom: 1 }, traits: ['Bite', 'Cunning Artisan', 'Hold Breath', 'Natural Armor'], languages: ['Common', 'Draconic'], languagesExtra: 0, resistances: [], immunities: [], vulnerabilities: [], weaknesses: [], subraces: [] },
  { id: 'triton', name: 'Triton', description: 'Tritons are aquatic humanoids from the deep ocean, serving as noble guardians against undersea threats. They gain +1 Strength, +1 Constitution, +1 Charisma, can breathe air and water, swim 30 ft., and can cast fog cloud, gust of wind, and wall of water at higher levels. Somewhat haughty but well-meaning.', speed: 30, abilityScore: { strength: 1, constitution: 1, charisma: 1 }, traits: ['Amphibious', 'Control Air and Water', 'Emissary of the Sea', 'Guardians of the Depths'], languages: ['Common', 'Primordial'], languagesExtra: 0, resistances: [], immunities: [], vulnerabilities: [], weaknesses: [], subraces: [] },
  { id: 'firbolg', name: 'Firbolg', description: 'Firbolgs are gentle, reclusive giants (7–8 feet tall) who live in deep forests and protect the natural world. They gain +2 Wisdom, +1 Strength, can turn invisible for one turn (Hidden Step), cast disguise self and detect magic once per rest, and count as Large for carrying. Ideal druids and nature clerics.', speed: 30, abilityScore: { wisdom: 2, strength: 1 }, traits: ['Firbolg Magic', 'Hidden Step', 'Powerful Build'], languages: ['Common', 'Elvish', 'Giant'], languagesExtra: 0, resistances: [], immunities: [], vulnerabilities: [], weaknesses: [], subraces: [] },
  { id: 'goblin', name: 'Goblin', description: 'Goblins are small (3–4 feet), cunning creatures who rely on speed and numbers. They gain +2 Dexterity, +1 Constitution, darkvision, Fury of the Small (bonus damage once per rest against a larger creature), and Nimble Escape (Disengage or Hide as a bonus action). Excellent rogues.', speed: 30, abilityScore: { dexterity: 2, constitution: 1 }, traits: ['Darkvision', 'Fury of the Small', 'Nimble Escape'], languages: ['Common', 'Goblin'], languagesExtra: 0, resistances: [], immunities: [], vulnerabilities: [], weaknesses: [], subraces: [] },
  { id: 'hobgoblin', name: 'Hobgoblin', description: 'Hobgoblins are disciplined, militaristic goblinoids who value strategy and honor. They gain +2 Constitution, +1 Intelligence, darkvision, and Saving Face (add a bonus to a failed roll equal to the number of allies you can see). Strong fighters and warlords.', speed: 30, abilityScore: { constitution: 2, intelligence: 1 }, traits: ['Darkvision', 'Martial Training', 'Saving Face'], languages: ['Common', 'Goblin'], languagesExtra: 0, resistances: [], immunities: [], vulnerabilities: [], weaknesses: [], subraces: [] },
  { id: 'kobold', name: 'Kobold', description: 'Kobolds are tiny (2–3 feet), dragon-worshipping reptilians who fight with traps and teamwork. They gain +2 Dexterity, darkvision, Pack Tactics (advantage on attacks when an ally is within 5 ft.), and Grovel, Cower, and Beg (distract enemies to give allies advantage). However, they have Sunlight Sensitivity.', speed: 30, abilityScore: { dexterity: 2 }, traits: ['Darkvision', 'Grovel, Cower, and Beg', 'Pack Tactics', 'Sunlight Sensitivity'], languages: ['Common', 'Draconic'], languagesExtra: 0, resistances: [], immunities: [], vulnerabilities: [], weaknesses: ['Sunlight Sensitivity'], subraces: [] },
  { id: 'yuan-ti', name: 'Yuan-ti Pureblood', description: 'Yuan-ti Purebloods are the most human-looking of the serpent people, with only subtle snake-like features. They gain +2 Charisma, +1 Intelligence, darkvision, Magic Resistance (advantage on saves against spells and magical effects), Poison Immunity, and innate spellcasting (poison spray cantrip, animal friendship on snakes, suggestion at 3rd).', speed: 30, abilityScore: { charisma: 2, intelligence: 1 }, traits: ['Darkvision', 'Innate Spellcasting', 'Magic Resistance', 'Poison Immunity'], languages: ['Common', 'Abyssal', 'Draconic'], languagesExtra: 0, resistances: [], immunities: ['Poison'], vulnerabilities: [], weaknesses: [], subraces: [] }
];

// ========== CLASSES ==========
const CLASSES = [
  {
    id: 'barbarian',
    name: 'Barbarian',
    description: 'A fierce warrior of primitive background who can enter a battle rage.',
    hitDie: 12,
    primaryAbility: ['Strength'],
    savingThrows: ['Strength', 'Constitution'],
    subclasses: [
      { name: 'Path of the Berserker', level: 3, description: 'Frenzy drives you to unmatched ferocity in battle.' },
      { name: 'Path of the Totem Warrior', level: 3, description: 'The spirits of animals guide and protect you.' }
    ]
  },
  {
    id: 'bard',
    name: 'Bard',
    description: 'An inspiring magician whose power echoes the music of creation.',
    hitDie: 8,
    primaryAbility: ['Charisma'],
    savingThrows: ['Dexterity', 'Charisma'],
    subclasses: [
      { name: 'College of Lore', level: 3, description: 'Bards of the College of Lore know something about most things.' },
      { name: 'College of Valor', level: 3, description: 'Bards of the College of Valor are daring skalds.' }
    ]
  },
  {
    id: 'cleric',
    name: 'Cleric',
    description: 'A priestly champion who wields divine magic in service of a higher power.',
    hitDie: 8,
    primaryAbility: ['Wisdom'],
    savingThrows: ['Wisdom', 'Charisma'],
    subclasses: [
      { name: 'Knowledge Domain', level: 1, description: 'Gods of knowledge value learning and understanding.' },
      { name: 'Life Domain', level: 1, description: 'The Life domain focuses on the vibrant positive energy.' },
      { name: 'Light Domain', level: 1, description: 'Gods of light promote the ideals of rebirth and renewal.' },
      { name: 'Nature Domain', level: 1, description: 'Gods of nature are as varied as the natural world.' },
      { name: 'Tempest Domain', level: 1, description: 'Gods whose portfolios include the tempest.' },
      { name: 'Trickery Domain', level: 1, description: 'Gods of trickery are mischief-makers and deceivers.' },
      { name: 'War Domain', level: 1, description: 'War has many manifestations.' }
    ]
  },
  {
    id: 'druid',
    name: 'Druid',
    description: 'A priest of the Old Faith, wielding the powers of nature and adopting animal forms.',
    hitDie: 8,
    primaryAbility: ['Wisdom'],
    savingThrows: ['Intelligence', 'Wisdom'],
    subclasses: [
      { name: 'Circle of the Land', level: 2, description: 'The Circle of the Land is made up of mystics and sages.' },
      { name: 'Circle of the Moon', level: 2, description: 'Druids of the Circle of the Moon are fierce guardians.' }
    ]
  },
  {
    id: 'fighter',
    name: 'Fighter',
    description: 'A master of martial combat, skilled with a variety of weapons and armor.',
    hitDie: 10,
    primaryAbility: ['Strength', 'Dexterity'],
    savingThrows: ['Strength', 'Constitution'],
    subclasses: [
      { name: 'Champion', level: 3, description: 'The archetypal Champion focuses on the development of raw physical power.' },
      { name: 'Battle Master', level: 3, description: 'Those who emulate the archetypal Battle Master employ martial techniques.' },
      { name: 'Eldritch Knight', level: 3, description: 'The archetypal Eldritch Knight combines the martial mastery of the fighter with spellcasting.' }
    ]
  },
  {
    id: 'monk',
    name: 'Monk',
    description: 'A master of martial arts, harnessing the power of the body in pursuit of physical and spiritual perfection.',
    hitDie: 8,
    primaryAbility: ['Dexterity', 'Wisdom'],
    savingThrows: ['Strength', 'Dexterity'],
    subclasses: [
      { name: 'Way of the Open Hand', level: 3, description: 'Monks of the Way of the Open Hand are the ultimate masters of martial arts.' },
      { name: 'Way of Shadow', level: 3, description: 'Monks of the Way of Shadow follow a tradition that values stealth and subterfuge.' },
      { name: 'Way of the Four Elements', level: 3, description: 'You follow a monastic tradition that teaches you to harness the elements.' }
    ]
  },
  {
    id: 'paladin',
    name: 'Paladin',
    description: 'A holy warrior bound to a sacred oath to fight evil.',
    hitDie: 10,
    primaryAbility: ['Strength', 'Charisma'],
    savingThrows: ['Wisdom', 'Charisma'],
    subclasses: [
      { name: 'Oath of Devotion', level: 3, description: 'The Oath of Devotion binds a paladin to the loftiest ideals of justice.' },
      { name: 'Oath of the Ancients', level: 3, description: 'The Oath of the Ancients is as old as the race of elves.' },
      { name: 'Oath of Vengeance', level: 3, description: 'The Oath of Vengeance is a solemn commitment to punish those who have committed a grievous sin.' }
    ]
  },
  {
    id: 'ranger',
    name: 'Ranger',
    description: 'A warrior who uses martial prowess and nature magic to combat threats on the edges of civilization.',
    hitDie: 10,
    primaryAbility: ['Dexterity', 'Wisdom'],
    savingThrows: ['Strength', 'Dexterity'],
    subclasses: [
      { name: 'Hunter', level: 3, description: 'Emulating the Hunter archetype means accepting your place as a bulwark against the terrors of the wilderness.' },
      { name: 'Beast Master', level: 3, description: 'The Beast Master archetype embodies a friendship between the civilized races and the beasts of the world.' }
    ]
  },
  {
    id: 'rogue',
    name: 'Rogue',
    description: 'A scoundrel who uses stealth and trickery to overcome obstacles and enemies.',
    hitDie: 8,
    primaryAbility: ['Dexterity'],
    savingThrows: ['Dexterity', 'Intelligence'],
    subclasses: [
      { name: 'Thief', level: 3, description: 'You hone your skills in the larcenous arts.' },
      { name: 'Assassin', level: 3, description: 'You focus your training on the grim art of death.' },
      { name: 'Arcane Trickster', level: 3, description: 'Some rogues enhance their fine-honed skills of stealth and agility with magic.' }
    ]
  },
  {
    id: 'sorcerer',
    name: 'Sorcerer',
    description: 'A spellcaster who draws on inherent magic from a gift or bloodline.',
    hitDie: 6,
    primaryAbility: ['Charisma'],
    savingThrows: ['Constitution', 'Charisma'],
    subclasses: [
      { name: 'Draconic Bloodline', level: 1, description: 'Your innate magic comes from draconic magic that was mingled with your blood.' },
      { name: 'Wild Magic', level: 1, description: 'Your innate magic comes from the wild magic of chaos.' }
    ]
  },
  {
    id: 'warlock',
    name: 'Warlock',
    description: 'A wielder of magic that is derived from a bargain with an extraplanar entity.',
    hitDie: 8,
    primaryAbility: ['Charisma'],
    savingThrows: ['Wisdom', 'Charisma'],
    subclasses: [
      { name: 'The Archfey', level: 1, description: 'Your patron is a lord or lady of the fey.' },
      { name: 'The Fiend', level: 1, description: 'You have made a pact with a fiend from the lower planes.' },
      { name: 'The Great Old One', level: 1, description: 'Your patron is a mysterious entity whose nature is utterly foreign to the fabric of reality.' }
    ]
  },
  {
    id: 'wizard',
    name: 'Wizard',
    description: 'A scholarly magic-user capable of manipulating the structures of reality.',
    hitDie: 6,
    primaryAbility: ['Intelligence'],
    savingThrows: ['Intelligence', 'Wisdom'],
    subclasses: [
      { name: 'School of Evocation', level: 2, description: 'You focus your study on magic that creates powerful elemental effects.' },
      { name: 'School of Illusion', level: 2, description: 'You focus your studies on magic that dazzles the senses.' },
      { name: 'School of Necromancy', level: 2, description: 'The School of Necromancy explores the cosmic forces of life, death, and undeath.' },
      { name: 'School of Abjuration', level: 2, description: 'The School of Abjuration emphasizes magic that blocks, banishes, or protects.' },
      { name: 'School of Conjuration', level: 2, description: 'As a conjurer, you favor spells that produce objects and creatures out of thin air.' },
      { name: 'School of Divination', level: 2, description: 'The counsel of a diviner is sought by royalty and commoners alike.' },
      { name: 'School of Enchantment', level: 2, description: 'As a member of the School of Enchantment, you have honed your ability to magically entrance and beguile.' },
      { name: 'School of Transmutation', level: 2, description: 'You are a student of spells that modify energy and matter.' }
    ]
  }
];

// ========== BACKGROUNDS ==========
const BACKGROUNDS = [
  { name: 'Acolyte', skillProficiencies: ['Insight', 'Religion'], description: 'You have spent your life in the service of a temple.' },
  { name: 'Charlatan', skillProficiencies: ['Deception', 'Sleight of Hand'], description: 'You have always had a way with people.' },
  { name: 'City Watch', skillProficiencies: ['Athletics', 'Insight'], description: 'You served in the city watch, keeping the peace.' },
  { name: 'Criminal', skillProficiencies: ['Deception', 'Stealth'], description: 'You are an experienced criminal with a history of breaking the law.' },
  { name: 'Entertainer', skillProficiencies: ['Acrobatics', 'Performance'], description: 'You thrive in front of an audience.' },
  { name: 'Folk Hero', skillProficiencies: ['Animal Handling', 'Survival'], description: 'You come from a humble social rank.' },
  { name: 'Gladiator', skillProficiencies: ['Athletics', 'Performance'], description: 'You fought for sport and entertainment in the arena.' },
  { name: 'Guild Artisan', skillProficiencies: ['Insight', 'Persuasion'], description: 'You are a member of an artisan\'s guild.' },
  { name: 'Hermit', skillProficiencies: ['Medicine', 'Religion'], description: 'You lived in seclusion for a formative part of your life.' },
  { name: 'Knight', skillProficiencies: ['History', 'Persuasion'], description: 'You belong to an order of knights who have sworn oaths.' },
  { name: 'Noble', skillProficiencies: ['History', 'Persuasion'], description: 'You understand wealth, power, and privilege.' },
  { name: 'Outlander', skillProficiencies: ['Athletics', 'Survival'], description: 'You grew up in the wilds, far from civilization.' },
  { name: 'Pirate', skillProficiencies: ['Athletics', 'Perception'], description: 'You sailed the seas as a pirate or privateer.' },
  { name: 'Sage', skillProficiencies: ['Arcana', 'History'], description: 'You spent years learning the lore of the multiverse.' },
  { name: 'Sailor', skillProficiencies: ['Athletics', 'Perception'], description: 'You sailed on a seagoing vessel for years.' },
  { name: 'Soldier', skillProficiencies: ['Athletics', 'Intimidation'], description: 'War has been your life for as long as you care to remember.' },
  { name: 'Spy', skillProficiencies: ['Deception', 'Stealth'], description: 'You worked as a spy or informant for a faction.' },
  { name: 'Urchin', skillProficiencies: ['Sleight of Hand', 'Stealth'], description: 'You grew up on the streets, surviving by your wits.' },
  { name: 'Courtier', skillProficiencies: ['Insight', 'Persuasion'], description: 'You move in noble circles and understand courtly intrigue.' },
  { name: 'Far Traveler', skillProficiencies: ['Insight', 'Perception'], description: 'You come from a distant land with strange customs.' },
  { name: 'Mercenary Veteran', skillProficiencies: ['Athletics', 'Persuasion'], description: 'You served in a mercenary company for years.' },
  { name: 'Guild Merchant', skillProficiencies: ['Insight', 'Persuasion'], description: 'You are a member of a guild that trades in goods.' },
  { name: 'Inheritor', skillProficiencies: ['Survival', 'One of your choice'], description: 'You inherited something from an ancestor.' },
  { name: 'Clan Crafter', skillProficiencies: ['History', 'Insight'], description: 'You are a skilled artisan in a dwarven clan.' },
  { name: 'Cloistered Scholar', skillProficiencies: ['History', 'One of Arcana/Nature/Religion'], description: 'You spent your life in libraries and scriptoriums.' },
  { name: 'Entertainer (Gladiator)', skillProficiencies: ['Acrobatics', 'Performance'], description: 'You fought for sport and entertainment in the arena.' },
  { name: 'Faceless', skillProficiencies: ['Deception', 'Intimidation'], description: 'You hide your identity behind masks or magic.' },
  { name: 'Investigator', skillProficiencies: ['Investigation', 'One of Insight/Religion'], description: 'You solved mysteries and tracked down criminals.' },
  { name: 'Urban Bounty Hunter', skillProficiencies: ['Choose two from Deception, Insight, Persuasion, Stealth'], description: 'You hunt fugitives in city streets.' }
];

// ========== ALIGNMENTS ==========
const ALIGNMENTS = [
  { name: 'Lawful Good', short: 'LG', description: 'Can be counted on to do the right thing as expected by society.' },
  { name: 'Neutral Good', short: 'NG', description: 'Do the best they can to help others according to their needs.' },
  { name: 'Chaotic Good', short: 'CG', description: 'Act as their conscience directs with little regard for expectations.' },
  { name: 'Lawful Neutral', short: 'LN', description: 'Act in accordance with law, tradition, or personal codes.' },
  { name: 'True Neutral', short: 'TN', description: 'Prefer to avoid moral questions and don\'t take sides.' },
  { name: 'Chaotic Neutral', short: 'CN', description: 'Follow their whims, holding personal freedom above all else.' },
  { name: 'Lawful Evil', short: 'LE', description: 'Methodically take what they want within the limits of a code.' },
  { name: 'Neutral Evil', short: 'NE', description: 'Do whatever they can get away with, without compassion.' },
  { name: 'Chaotic Evil', short: 'CE', description: 'Act with arbitrary violence, spurred by their greed or bloodlust.' }
];

const SKILLS = [
  'Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception',
  'History', 'Insight', 'Intimidation', 'Investigation', 'Medicine',
  'Nature', 'Perception', 'Performance', 'Persuasion', 'Religion',
  'Sleight of Hand', 'Stealth', 'Survival'
];

const COMMON_CONDITIONS = ['Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened', 'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious', 'Sunlight Sensitivity'];

const COMMON_EQUIPMENT = ['Longsword', 'Shortsword', 'Dagger', 'Greatsword', 'Battleaxe', 'Handaxe', 'Longbow', 'Shortbow', 'Crossbow, light', 'Quarterstaff', 'Mace', 'Warhammer', 'Shield', 'Leather armor', 'Chain mail', 'Studded leather', 'Backpack', 'Rope, hempen (50 feet)', 'Torch', 'Rations (1 day)', 'Waterskin', 'Potion of healing', 'Thieves\' tools', 'Spellcasting focus', 'Holy symbol', 'Druidic focus', 'Arcane focus'];

// Weapon data: name, type, damage, damageType, range, properties (SRD)
const WEAPONS = [
  { name: 'Club', type: 'melee', damage: '1d4', damageType: 'Bludgeoning', range: '5 ft', properties: 'Light' },
  { name: 'Dagger', type: 'melee', damage: '1d4', damageType: 'Piercing', range: '5 ft', properties: 'Finesse, light, thrown (20/60)' },
  { name: 'Greatclub', type: 'melee', damage: '1d8', damageType: 'Bludgeoning', range: '5 ft', properties: 'Two-handed' },
  { name: 'Handaxe', type: 'melee', damage: '1d6', damageType: 'Slashing', range: '5 ft', properties: 'Light, thrown (20/60)' },
  { name: 'Javelin', type: 'melee', damage: '1d6', damageType: 'Piercing', range: '5 ft', properties: 'Thrown (30/120)' },
  { name: 'Light hammer', type: 'melee', damage: '1d4', damageType: 'Bludgeoning', range: '5 ft', properties: 'Light, thrown (20/60)' },
  { name: 'Mace', type: 'melee', damage: '1d6', damageType: 'Bludgeoning', range: '5 ft', properties: '—' },
  { name: 'Quarterstaff', type: 'melee', damage: '1d6', damageType: 'Bludgeoning', range: '5 ft', properties: 'Versatile (1d8)' },
  { name: 'Sickle', type: 'melee', damage: '1d4', damageType: 'Slashing', range: '5 ft', properties: 'Light' },
  { name: 'Spear', type: 'melee', damage: '1d6', damageType: 'Piercing', range: '5 ft', properties: 'Thrown (20/60), versatile (1d8)' },
  { name: 'Crossbow, light', type: 'ranged', damage: '1d8', damageType: 'Piercing', range: '80/320 ft', properties: 'Ammunition, loading, two-handed' },
  { name: 'Dart', type: 'ranged', damage: '1d4', damageType: 'Piercing', range: '20/60 ft', properties: 'Finesse, thrown' },
  { name: 'Shortbow', type: 'ranged', damage: '1d6', damageType: 'Piercing', range: '80/320 ft', properties: 'Ammunition, two-handed' },
  { name: 'Sling', type: 'ranged', damage: '1d4', damageType: 'Bludgeoning', range: '30/120 ft', properties: 'Ammunition' },
  { name: 'Battleaxe', type: 'melee', damage: '1d8', damageType: 'Slashing', range: '5 ft', properties: 'Versatile (1d10)' },
  { name: 'Flail', type: 'melee', damage: '1d8', damageType: 'Bludgeoning', range: '5 ft', properties: '—' },
  { name: 'Glaive', type: 'melee', damage: '1d10', damageType: 'Slashing', range: '5 ft', properties: 'Heavy, reach, two-handed' },
  { name: 'Greataxe', type: 'melee', damage: '1d12', damageType: 'Slashing', range: '5 ft', properties: 'Heavy, two-handed' },
  { name: 'Greatsword', type: 'melee', damage: '2d6', damageType: 'Slashing', range: '5 ft', properties: 'Heavy, two-handed' },
  { name: 'Halberd', type: 'melee', damage: '1d10', damageType: 'Slashing', range: '5 ft', properties: 'Heavy, reach, two-handed' },
  { name: 'Lance', type: 'melee', damage: '1d12', damageType: 'Piercing', range: '5 ft', properties: 'Reach, special' },
  { name: 'Longsword', type: 'melee', damage: '1d8', damageType: 'Slashing', range: '5 ft', properties: 'Versatile (1d10)' },
  { name: 'Maul', type: 'melee', damage: '2d6', damageType: 'Bludgeoning', range: '5 ft', properties: 'Heavy, two-handed' },
  { name: 'Morningstar', type: 'melee', damage: '1d8', damageType: 'Piercing', range: '5 ft', properties: '—' },
  { name: 'Pike', type: 'melee', damage: '1d10', damageType: 'Piercing', range: '5 ft', properties: 'Heavy, reach, two-handed' },
  { name: 'Rapier', type: 'melee', damage: '1d8', damageType: 'Piercing', range: '5 ft', properties: 'Finesse' },
  { name: 'Scimitar', type: 'melee', damage: '1d6', damageType: 'Slashing', range: '5 ft', properties: 'Finesse, light' },
  { name: 'Shortsword', type: 'melee', damage: '1d6', damageType: 'Piercing', range: '5 ft', properties: 'Finesse, light' },
  { name: 'Trident', type: 'melee', damage: '1d6', damageType: 'Piercing', range: '5 ft', properties: 'Thrown (20/60), versatile (1d8)' },
  { name: 'War pick', type: 'melee', damage: '1d8', damageType: 'Piercing', range: '5 ft', properties: '—' },
  { name: 'Warhammer', type: 'melee', damage: '1d8', damageType: 'Bludgeoning', range: '5 ft', properties: 'Versatile (1d10)' },
  { name: 'Whip', type: 'melee', damage: '1d4', damageType: 'Slashing', range: '5 ft', properties: 'Finesse, reach' },
  { name: 'Blowgun', type: 'ranged', damage: '1', damageType: 'Piercing', range: '25/100 ft', properties: 'Ammunition, loading' },
  { name: 'Crossbow, hand', type: 'ranged', damage: '1d6', damageType: 'Piercing', range: '30/120 ft', properties: 'Ammunition, light, loading' },
  { name: 'Crossbow, heavy', type: 'ranged', damage: '1d10', damageType: 'Piercing', range: '100/400 ft', properties: 'Ammunition, heavy, loading, two-handed' },
  { name: 'Longbow', type: 'ranged', damage: '1d8', damageType: 'Piercing', range: '150/600 ft', properties: 'Ammunition, heavy, two-handed' },
  { name: 'Net', type: 'ranged', damage: '—', damageType: '—', range: '5/15 ft', properties: 'Special, thrown' },
  { name: 'Unarmed strike', type: 'melee', damage: '1', damageType: 'Bludgeoning', range: '5 ft', properties: '—' }
];

// Armor and tool proficiencies by class
const ARMOR_PROFICIENCIES = ['Light', 'Medium', 'Heavy', 'Shields'];
const WEAPON_PROFICIENCY_CATEGORIES = ['Simple weapons', 'Martial weapons'];
const TOOL_PROFICIENCIES = ['Thieves\' tools', 'Disguise kit', 'Forgery kit', 'Herbalism kit', 'Navigator\'s tools', 'Poisoner\'s kit', 'Smith\'s tools', 'Gaming set', 'Musical instrument'];

const CLASS_PROFICIENCIES = {
  Barbarian: { armor: ['Light', 'Medium', 'Shields'], weapons: ['Simple weapons', 'Martial weapons'], tools: [] },
  Bard: { armor: ['Light'], weapons: ['Simple weapons'], tools: ['Musical instrument'] },
  Cleric: { armor: ['Light', 'Medium', 'Shields'], weapons: ['Simple weapons'], tools: [] },
  Druid: { armor: ['Light', 'Medium', 'Shields'], weapons: ['Clubs', 'Daggers', 'Darts', 'Javelins', 'Maces', 'Quarterstaffs', 'Scimitars', 'Sickles', 'Slings', 'Spears'], tools: ['Herbalism kit'] },
  Fighter: { armor: ['Light', 'Medium', 'Heavy', 'Shields'], weapons: ['Simple weapons', 'Martial weapons'], tools: [] },
  Monk: { armor: [], weapons: ['Simple weapons', 'Shortswords'], tools: [] },
  Paladin: { armor: ['Light', 'Medium', 'Heavy', 'Shields'], weapons: ['Simple weapons', 'Martial weapons'], tools: [] },
  Ranger: { armor: ['Light', 'Medium', 'Shields'], weapons: ['Simple weapons', 'Martial weapons'], tools: [] },
  Rogue: { armor: ['Light'], weapons: ['Simple weapons', 'Hand crossbows', 'Longswords', 'Rapiers', 'Shortswords'], tools: ['Thieves\' tools'] },
  Sorcerer: { armor: [], weapons: ['Daggers', 'Darts', 'Slings', 'Quarterstaffs', 'Crossbows, light'], tools: [] },
  Warlock: { armor: ['Light'], weapons: ['Simple weapons'], tools: [] },
  Wizard: { armor: [], weapons: ['Daggers', 'Darts', 'Slings', 'Quarterstaffs', 'Crossbows, light'], tools: [] },
  Artificer: { armor: ['Light', 'Medium', 'Shields'], weapons: ['Simple weapons'], tools: ["Thieves' tools", "Smith's tools", "Tinker's tools"] }
};

// Racial trait descriptions (for Features & Traits display)
const RACIAL_TRAIT_DESCRIPTIONS = {
  'Darkvision': 'You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light. You can\'t discern color in darkness, only shades of gray.',
  'Superior Darkvision': 'You can see in dim light within 120 feet as if bright light, and in darkness as dim light.',
  'Fey Ancestry': 'You have advantage on saving throws against being charmed, and magic can\'t put you to sleep.',
  'Trance': 'You don\'t need to sleep. Instead, you meditate deeply for 4 hours, gaining the same benefit a human gets from 8 hours of sleep.',
  'Lucky': 'When you roll a 1 on an attack roll, ability check, or saving throw, you can reroll the die and must use the new roll.',
  'Brave': 'You have advantage on saving throws against being frightened.',
  'Halfling Nimbleness': 'You can move through the space of any creature that is of a size larger than yours.',
  'Dwarven Resilience': 'You have advantage on saving throws against poison, and you have resistance against poison damage.',
  'Stonecunning': 'Whenever you make an Intelligence (History) check related to the origin of stonework, you are considered proficient and add double your proficiency bonus.',
  'Gnome Cunning': 'You have advantage on all Intelligence, Wisdom, and Charisma saving throws against magic.',
  'Relentless Endurance': 'When you are reduced to 0 hit points but not killed outright, you can drop to 1 hit point instead. Once per long rest.',
  'Savage Attacks': 'When you score a critical hit with a melee weapon attack, you can roll one of the weapon\'s damage dice one additional time.',
  'Hellish Resistance': 'You have resistance to fire damage.',
  'Infernal Legacy': 'You know the thaumaturgy cantrip. At 3rd level, you can cast hellish rebuke as a 2nd-level spell once per long rest. At 5th level, you can cast darkness once per long rest.',
  'Breath Weapon': 'You can use your action to exhale destructive energy. Your draconic ancestry determines the size, shape, and damage type. DC = 8 + Con modifier + proficiency bonus. Damage: 2d6 at 1st level, scaling at 6th, 11th, and 16th.',
  'Draconic Ancestry': 'You have draconic ancestry. Choose one type of dragon from the Draconic Ancestry table. Your breath weapon and damage resistance are determined by the dragon type.',
  'Damage Resistance': 'You have resistance to the damage type associated with your draconic ancestry.',
  'Menacing': 'You gain proficiency in the Intimidation skill.',
  'Skill Versatility': 'You gain proficiency in two skills of your choice.',
  'Flight (50 ft.)': 'You have a flying speed of 50 feet. To use this speed, you can\'t be wearing medium or heavy armor.',
  'Talons (1d4 slashing)': 'Your talons are natural weapons, which you can use to make unarmed strikes dealing 1d4 slashing damage.',
  'Naturally Stealthy': 'You can attempt to hide even when you are obscured only by a creature that is at least one size larger than you.',
  'Stout Resilience': 'You have advantage on saving throws against poison, and resistance against poison damage.',
  'Feline Agility': 'When you move on your turn in combat, you can double your speed until the end of the turn. Once used, you can\'t use it again until you move 0 feet on one of your turns.',
  'Cat\'s Claws': 'You have a climbing speed of 20 feet and can make unarmed strikes dealing 1d4 slashing damage.',
  'Pack Tactics': 'You have advantage on an attack roll against a creature if at least one of your allies is within 5 feet of the creature and the ally isn\'t incapacitated.',
  'Nimble Escape': 'You can take the Disengage or Hide action as a bonus action on each of your turns.',
  'Fury of the Small': 'When you damage a creature that is of a larger size than you, you can deal extra damage equal to your level. Once per short or long rest.',
  'Aggressive': 'As a bonus action, you can move up to your speed toward an enemy you can see or hear. You must end this move closer to the enemy.',
  'Natural Armor': 'You have tough, scaly skin. When you aren\'t wearing armor, your AC is 13 + your Dexterity modifier.',
  'Powerful Build': 'You count as one size larger when determining your carrying capacity and the weight you can push, drag, or lift.',
  'Stone\'s Endurance': 'When you take damage, you can use your reaction to roll a d12 + your Constitution modifier and reduce the damage by that total. Once per short or long rest.',
  'Hidden Step': 'As a bonus action, you can magically turn invisible until the start of your next turn or until you attack, deal damage, or force a creature to make a saving throw. Once per short or long rest.',
  'Firbolg Magic': 'You can cast detect magic and disguise self with this trait, using Wisdom as your spellcasting ability. Once per short or long rest each.',
  'Healing Hands': 'As an action, you can touch a creature and restore hit points equal to your level. Once per long rest.',
  'Celestial Resistance': 'You have resistance to necrotic and radiant damage.',
  'Sunlight Sensitivity': 'You have disadvantage on attack rolls and on Wisdom (Perception) checks that rely on sight when you, the target, or what you are trying to perceive is in direct sunlight.',
  'Magic Resistance': 'You have advantage on saving throws against spells and other magical effects.',
  'Saving Face': 'When you miss an attack roll, fail an ability check, or fail a saving throw, you can add a bonus to the roll equal to the number of allies you can see within 30 feet (max +5). Once per short or long rest.',
  'Radiant Soul': 'Starting at 3rd level, you can use your action to unleash divine energy. For 1 minute, you sprout luminous wings (fly 30 ft.) and deal extra radiant damage equal to your level once per turn.',
  'Radiant Consumption': 'Starting at 3rd level, you can use your action to unleash divine energy. For 1 minute, you shed bright light and at the end of each turn, you and creatures within 10 feet take radiant damage equal to half your level (rounded up).',
  'Necrotic Shroud': 'Starting at 3rd level, you can use your action to unleash divine energy. For 1 minute, your eyes turn black and ghostly wings appear. Creatures within 10 feet must succeed on a Charisma saving throw or be frightened of you.',
  'Drow Magic': 'You know the dancing lights cantrip. At 3rd level: faerie fire (1/long rest). At 5th level: darkness (1/long rest). Charisma is the spellcasting ability.',
  'Dwarven Toughness': 'Your hit point maximum increases by 1 for every level you have.',
  'Dwarven Armor Training': 'You have proficiency with light and medium armor.',
  'Fleet of Foot': 'Your base walking speed increases to 35 feet.',
  'Mask of the Wild': 'You can attempt to hide even when you are only lightly obscured by foliage, heavy rain, falling snow, mist, and other natural phenomena.',
  'Fey Step': 'As a bonus action, you can magically teleport up to 30 feet to an unoccupied space you can see. Once per short or long rest. The bonus effect varies by your current season.',
  'Silent Speech': 'You can speak telepathically to any creature within 30 feet of you, as long as you share a language.',
  'Mimicry': 'You can mimic sounds you have heard, including voices. A creature that hears the sounds can tell they are imitations with a successful Wisdom (Insight) check.',
  'Expert Forgery': 'You can duplicate other creatures\' handwriting and craftwork.',
  'Kenku Training': 'You are proficient in your choice of two of the following skills: Acrobatics, Deception, Stealth, and Sleight of Hand.',
  'Amphibious': 'You can breathe air and water.',
  'Natural Illusionist': 'You know the minor illusion cantrip. Intelligence is your spellcasting ability for it.',
  'Speak with Small Beasts': 'Through sounds and gestures, you can communicate simple ideas with Small or smaller beasts.',
  'Artificer\'s Lore': 'Whenever you make an Intelligence (History) check related to magic items, alchemical objects, or technological devices, you add double your proficiency bonus.',
  'Tinker': 'You can spend 1 hour and 10 gp to construct a Tiny clockwork device (AC 5, 1 hp). Choose: Clockwork Toy, Fire Starter, or Music Box.'
};

// Starting equipment kits (PHB defaults, simplified)
const STARTING_EQUIPMENT = {
  Barbarian: ['Greataxe', 'Handaxe', 'Handaxe', 'Javelin', 'Javelin', 'Javelin', 'Javelin', "Explorer's pack"],
  Bard: ['Rapier', 'Dagger', 'Lute', 'Leather', "Entertainer's pack"],
  Cleric: ['Mace', 'Scale mail', 'Shield', 'Crossbow, light', "Priest's pack", 'Holy symbol'],
  Druid: ['Wooden shield', 'Scimitar', 'Leather', "Explorer's pack", 'Druidic focus'],
  Fighter: ['Chain mail', 'Shield', 'Longsword', 'Crossbow, light', "Dungeoneer's pack"],
  Monk: ['Shortsword', 'Dart', 'Dart', 'Dart', 'Dart', 'Dart', 'Dart', 'Dart', 'Dart', 'Dart', 'Dart', "Explorer's pack"],
  Paladin: ['Longsword', 'Shield', 'Chain mail', 'Javelin', 'Javelin', 'Javelin', 'Javelin', 'Javelin', "Priest's pack", 'Holy symbol'],
  Ranger: ['Longsword', 'Shortsword', 'Shortsword', 'Leather', 'Longbow', 'Quiver', "Explorer's pack"],
  Rogue: ['Rapier', 'Shortbow', 'Quiver', 'Leather', 'Dagger', 'Dagger', "Burglar's pack", "Thieves' tools"],
  Sorcerer: ['Crossbow, light', 'Component pouch', "Dungeoneer's pack", 'Dagger', 'Dagger'],
  Warlock: ['Crossbow, light', 'Component pouch', "Scholar's pack", 'Leather', 'Dagger', 'Dagger'],
  Wizard: ['Quarterstaff', 'Component pouch', "Scholar's pack", 'Spellbook'],
  Artificer: ['Crossbow, light', 'Scale mail', "Thieves' tools", "Dungeoneer's pack"]
};

// Class actions (common + class-specific)
const CLASS_ACTIONS = {
  _common: ['Attack', 'Cast a spell', 'Dash', 'Disengage', 'Dodge', 'Help', 'Hide', 'Ready', 'Search', 'Use an object'],
  Barbarian: ['Reckless Attack', 'Rage'],
  Bard: ['Bardic Inspiration', 'Jack of All Trades'],
  Cleric: ['Channel Divinity', 'Turn Undead'],
  Druid: ['Wild Shape', 'Druidic'],
  Fighter: ['Second Wind', 'Action Surge', 'Fighting Style'],
  Monk: ['Martial Arts', 'Ki', 'Unarmored Movement', 'Deflect Missiles', 'Stunning Strike'],
  Paladin: ['Divine Sense', 'Lay on Hands', 'Divine Smite'],
  Ranger: ['Favored Enemy', 'Natural Explorer'],
  Rogue: ['Sneak Attack', 'Cunning Action', 'Thieves\' Cant'],
  Sorcerer: ['Font of Magic', 'Metamagic'],
  Warlock: ['Eldritch Invocations', 'Pact Magic'],
  Wizard: ['Arcane Recovery', 'Spellcasting'],
  Artificer: ['Spellcasting', 'Magical Tinkering', 'Infuse Item']
};

// ========== SUBCLASS / LEVEL-UP DATA ==========
// Subclass features and spells by level. Key: "ClassName|SubclassName"
const SUBCLASS_FEATURES_BY_LEVEL = {
  'Barbarian|Path of the Berserker': { 3: 'Frenzy (bonus action extra attack, exhaustion)', 6: 'Mindless Rage', 10: 'Intimidating Presence', 14: 'Retaliation' },
  'Barbarian|Path of the Totem Warrior': { 3: 'Spirit Seeker, Totem Spirit (choose bear/eagle/wolf)', 6: 'Totem Spirit feature', 10: 'Spirit Walker', 14: 'Totemic Attunement' },
  'Bard|College of Lore': { 3: 'Bonus Proficiencies (3 skills), Cutting Words', 6: 'Additional Magical Secrets', 14: 'Peerless Skill' },
  'Bard|College of Valor': { 3: 'Bonus Proficiencies (medium armor, shields, martial weapons), Combat Inspiration', 6: 'Extra Attack', 14: 'Battle Magic' },
  'Cleric|Knowledge Domain': { 1: 'Domain Spells: Identify, Command. Blessings of Knowledge (2 languages, 2 skills)', 2: 'Channel Divinity: Knowledge of the Ages', 6: 'Channel Divinity: Read Thoughts', 8: 'Potent Spellcasting', 17: 'Visions of the Past' },
  'Cleric|Life Domain': { 1: 'Domain Spells: Bless, Cure Wounds. Bonus Proficiency (heavy armor). Disciple of Life', 2: 'Channel Divinity: Preserve Life', 6: 'Blessed Healer', 8: 'Divine Strike', 17: 'Supreme Healing' },
  'Cleric|Light Domain': { 1: 'Domain Spells: Light, Faerie Fire. Warding Flare', 2: 'Channel Divinity: Radiance of the Dawn', 6: 'Improved Flare', 8: 'Potent Spellcasting', 17: 'Corona of Light' },
  'Cleric|Nature Domain': { 1: 'Domain Spells: Animal Friendship, Speak with Animals. Acolyte of Nature.', 2: 'Channel Divinity: Charm Animals and Plants', 6: 'Dampen Elements', 8: 'Divine Strike', 17: 'Master of Nature' },
  'Cleric|Tempest Domain': { 1: 'Domain Spells: Fog Cloud, Thunderwave. Bonus Proficiency (heavy armor, martial weapons). Wrath of the Storm', 2: 'Channel Divinity: Destructive Wrath', 6: 'Thunderbolt Strike', 8: 'Divine Strike', 17: 'Stormborn' },
  'Cleric|Trickery Domain': { 1: 'Domain Spells: Disguise Self, Charm Person. Blessing of the Trickster', 2: 'Channel Divinity: Invoke Duplicity', 6: 'Cloak of Shadows', 8: 'Divine Strike', 17: 'Improved Duplicity' },
  'Cleric|War Domain': { 1: 'Domain Spells: Divine Favor, Shield. Bonus Proficiencies (heavy armor, martial weapons). War Priest', 2: 'Channel Divinity: Guided Strike', 6: 'Channel Divinity: War God\'s Blessing', 8: 'Divine Strike', 17: 'Avatar of Battle' },
  'Druid|Circle of the Land': { 2: 'Bonus Cantrip, Natural Recovery', 6: 'Land\'s Stride', 10: 'Nature\'s Ward', 14: 'Nature\'s Sanctuary' },
  'Druid|Circle of the Moon': { 2: 'Combat Wild Shape, Circle Forms', 6: 'Primal Strike', 10: 'Elemental Wild Shape', 14: 'Thousand Forms' },
  'Fighter|Champion': { 3: 'Improved Critical', 7: 'Remarkable Athlete', 10: 'Additional Fighting Style', 15: 'Superior Critical', 18: 'Survivor' },
  'Fighter|Battle Master': { 3: 'Combat Superiority (d8, 4 maneuvers), Student of War', 7: 'Know Your Enemy', 10: 'Improved Combat Superiority (d10)', 15: 'Relentless', 18: 'Improved Combat Superiority (d12)' },
  'Fighter|Eldritch Knight': { 3: 'Spellcasting (Wizard list), Weapon Bond', 7: 'War Magic', 10: 'Eldritch Strike', 15: 'Arcane Charge', 18: 'Improved War Magic' },
  'Monk|Way of the Open Hand': { 3: 'Open Hand Technique', 6: 'Wholeness of Body', 11: 'Tranquility', 17: 'Quivering Palm' },
  'Monk|Way of Shadow': { 3: 'Shadow Arts', 6: 'Shadow Step', 11: 'Cloak of Shadows', 17: 'Opportunist' },
  'Monk|Way of the Four Elements': { 3: 'Disciple of the Elements', 6: 'Elemental feature', 11: 'Elemental feature', 17: 'Elemental feature' },
  'Paladin|Oath of Devotion': { 3: 'Oath Spells, Channel Divinity (Sacred Weapon, Turn the Unholy)', 7: 'Aura of Devotion', 15: 'Purity of Spirit', 20: 'Holy Nimbus' },
  'Paladin|Oath of the Ancients': { 3: 'Oath Spells, Channel Divinity (Nature\'s Wrath, Turn the Faithless)', 7: 'Aura of Warding', 15: 'Undying Sentinel', 20: 'Elder Champion' },
  'Paladin|Oath of Vengeance': { 3: 'Oath Spells, Channel Divinity (Abjure Enemy, Vow of Enmity)', 7: 'Relentless Avenger', 15: 'Soul of Vengeance', 20: 'Avenging Angel' },
  'Ranger|Hunter': { 3: 'Hunter\'s Prey', 7: 'Defensive Tactics', 11: 'Multiattack', 15: 'Superior Hunter\'s Defense' },
  'Ranger|Beast Master': { 3: 'Ranger\'s Companion', 7: 'Exceptional Training', 11: 'Bestial Fury', 15: 'Share Spells' },
  'Rogue|Thief': { 3: 'Fast Hands, Second-Story Work', 9: 'Supreme Sneak', 13: 'Use Magic Device', 17: 'Thief\'s Reflexes' },
  'Rogue|Assassin': { 3: 'Bonus Proficiencies, Assassinate', 9: 'Infiltration Expertise', 13: 'Impostor', 17: 'Death Strike' },
  'Rogue|Arcane Trickster': { 3: 'Spellcasting (Wizard), Mage Hand Legerdemain', 9: 'Magical Ambush', 13: 'Versatile Trickster', 17: 'Spell Thief' },
  'Sorcerer|Draconic Bloodline': { 1: 'Dragon Ancestor, Draconic Resilience', 6: 'Elemental Affinity', 14: 'Dragon Wings', 18: 'Draconic Presence' },
  'Sorcerer|Wild Magic': { 1: 'Wild Magic Surge, Tides of Chaos', 6: 'Bend Luck', 14: 'Controlled Chaos', 18: 'Spell Bombardment' },
  'Warlock|The Archfey': { 1: 'Fey Presence', 6: 'Misty Escape', 10: 'Beguiling Defenses', 14: 'Dark Delirium' },
  'Warlock|The Fiend': { 1: 'Dark One\'s Blessing', 6: 'Dark One\'s Own Luck', 10: 'Fiendish Resilience', 14: 'Hurl Through Hell' },
  'Warlock|The Great Old One': { 1: 'Awakened Mind', 6: 'Entropic Ward', 10: 'Thought Shield', 14: 'Create Thrall' },
  'Wizard|School of Evocation': { 2: 'Evocation Savant, Sculpt Spells', 6: 'Potent Cantrip', 10: 'Empowered Evocation', 14: 'Overchannel' },
  'Wizard|School of Illusion': { 2: 'Illusion Savant, Improved Minor Illusion', 6: 'Malleable Illusions', 10: 'Illusory Self', 14: 'Illusory Reality' },
  'Wizard|School of Necromancy': { 2: 'Necromancy Savant, Grim Harvest', 6: 'Undead Thralls', 10: 'Inured to Undeath', 14: 'Command Undead' },
  'Wizard|School of Abjuration': { 2: 'Abjuration Savant, Arcane Ward', 6: 'Projected Ward', 10: 'Improved Abjuration', 14: 'Spell Resistance' },
  'Wizard|School of Conjuration': { 2: 'Conjuration Savant, Minor Conjuration', 6: 'Benign Transposition', 10: 'Focused Conjuration', 14: 'Durable Summons' },
  'Wizard|School of Divination': { 2: 'Divination Savant, Portent', 6: 'Expert Divination', 10: 'The Third Eye', 14: 'Greater Portent' },
  'Wizard|School of Enchantment': { 2: 'Enchantment Savant, Hypnotic Gaze', 6: 'Instinctive Charm', 10: 'Split Enchantment', 14: 'Alter Memories' },
  'Wizard|School of Transmutation': { 2: 'Transmutation Savant, Minor Alchemy', 6: 'Transmuter\'s Stone', 10: 'Shapechanger', 14: 'Master Transmuter' },
  'Artificer|Alchemist': { 3: 'Tool Proficiency, Experimental Elixir', 5: 'Alchemical Savant', 9: 'Restorative Reagents', 15: 'Chemical Mastery' },
  'Artificer|Armorer': { 3: 'Tools of the Trade, Armor Modifications', 5: 'Extra Attack', 9: 'Armor Modifications', 15: 'Perfected Armor' },
  'Artificer|Battle Smith': { 3: 'Battle Ready, Steel Defender', 5: 'Extra Attack', 9: 'Arcane Jolt', 15: 'Improved Defender' },
  'Barbarian|Path of the Storm Herald': { 3: 'Storm Aura', 6: 'Storm Soul', 10: 'Shielding Storm', 14: 'Raging Storm' },
  'Barbarian|Path of the Beast': { 3: 'Form of the Beast', 6: 'Bestial Soul', 10: 'Infectious Fury', 14: 'Call the Hunt' },
  'Barbarian|Path of the Battlerager': { 3: 'Battlerager Armor, Reckless Abandon', 6: 'Battlerager Charge', 10: 'Spiked Retribution', 14: 'Battlerager Armor improvement' },
  'Bard|College of Glamour': { 3: 'Mantle of Majesty, Enthralling Performance', 6: 'Mantle of Majesty improvement', 14: 'Unbreakable Majesty' },
  'Bard|College of Spirits': { 3: 'Guiding Whispers, Spiritual Focus', 6: 'Spirit Session', 14: 'Mystical Connection' },
  'Cleric|Forge Domain': { 1: 'Domain Spells: Identify, Searing Smite. Blessing of the Forge', 2: 'Channel Divinity: Artisan\'s Blessing', 6: 'Soul of the Forge', 8: 'Divine Strike', 17: 'Saint of Forge and Fire' },
  'Cleric|Peace Domain': { 1: 'Domain Spells: Bless, Sanctuary. Implement of Peace', 2: 'Channel Divinity: Balm of Peace', 6: 'Protective Bond', 8: 'Potent Spellcasting', 17: 'Emboldening Bond improvement' },
  'Druid|Circle of the Shepherd': { 2: 'Spirit Totem', 6: 'Mighty Summoner', 10: 'Guardian Spirit', 14: 'Faithful Summons' },
  'Fighter|Samurai': { 3: 'Bonus Proficiency, Fighting Spirit', 7: 'Elegant Courtier', 10: 'Tireless Spirit', 15: 'Rapid Strike', 18: 'Strength Before Death' },
  'Fighter|Rune Knight': { 3: 'Bonus Proficiency, Rune Knight Magic', 7: 'Runic Shield', 10: 'Great Stature', 15: 'Master of Runes', 18: 'Runic Juggernaut' },
  'Fighter|Purple Dragon Knight': { 3: 'Rallying Cry, Inspiring Surge', 7: 'Bulwark', 10: 'Inspiring Surge improvement', 15: 'Bulwark improvement', 18: 'Inspiring Surge improvement' },
  'Monk|Way of the Kensei': { 3: 'Path of the Kensei, Kensei Weapons', 6: 'One with the Blade', 11: 'Sharpen the Blade', 17: 'Unerring Accuracy' },
  'Monk|Way of the Ascendant Dragon': { 3: 'Draconic Disciple', 6: 'Breath of the Dragon', 11: 'Wings Unfurled', 17: 'Ascendant Aspect' },
  'Paladin|Oath of Conquest': { 3: 'Oath Spells, Channel Divinity (Conquering Presence, Guided Strike)', 7: 'Aura of Conquest', 15: 'Scornful Rebuke', 20: 'Invincible Conqueror' },
  'Paladin|Oath of the Watchers': { 3: 'Oath Spells, Channel Divinity (Watcher\'s Will, Abjure the Extraplanar)', 7: 'Aura of the Sentinel', 15: 'Vigilant Rebuke', 20: 'Mortal Bulwark' },
  'Ranger|Gloom Stalker': { 3: 'Dread Ambusher, Umbral Sight', 7: 'Iron Mind', 11: 'Stalker\'s Flurry', 15: 'Shadowy Dodge' },
  'Ranger|Drakewarden': { 3: 'Draconic Gift, Drake Companion', 7: 'Bond of Fang and Scale', 11: 'Drake Mount', 15: 'Perfected Bond' },
  'Rogue|Scout': { 3: 'Skirmisher, Survivalist', 9: 'Superior Mobility', 13: 'Ambush Master', 17: 'Sudden Strike' },
  'Rogue|Mastermind': { 3: 'Master of Intrigue, Master of Tactics', 9: 'Insightful Manipulator', 13: 'Misdirection', 17: 'Soul of Deceit' },
  'Sorcerer|Divine Soul': { 1: 'Divine Magic, Favored by the Gods', 6: 'Empowered Healing', 14: 'Otherworldly Wings', 18: 'Unearthly Recovery' },
  'Warlock|The Celestial': { 1: 'Expanded Spell List, Healing Light', 6: 'Radiant Soul', 10: 'Celestial Resilience', 14: 'Searing Vengeance' },
  'Warlock|The Undead': { 1: 'Expanded Spell List, Form of Dread', 6: 'Grave Touched', 10: 'Necrotic Husk', 14: 'Spirit Projection' },
  'Warlock|The Undying': { 1: 'Expanded Spell List, Among the Dead', 6: 'Defy Death', 10: 'Undying Nature', 14: 'Indestructible Life' },
  'Wizard|War Magic': { 2: 'Arcane Deflection, Tactical Wit', 6: 'Power Surge', 10: 'Durable Magic', 14: 'Deflecting Shroud' },
  'Wizard|Order of Scribes': { 2: 'Wizardly Quill, Awakened Spellbook', 6: 'Manifest Mind', 10: 'One with the Word', 14: 'Master Scrivener' }
};

// Levels at which each class gains Ability Score Improvement (or feat)
const ASI_LEVELS_BY_CLASS = {
  Barbarian: [4, 8, 12, 16, 19],
  Bard: [4, 8, 12, 16, 19],
  Cleric: [4, 8, 12, 16, 19],
  Druid: [4, 8, 12, 16, 19],
  Fighter: [4, 6, 8, 12, 14, 16, 19],
  Monk: [4, 8, 12, 16, 19],
  Paladin: [4, 8, 12, 16, 19],
  Ranger: [4, 8, 12, 16, 19],
  Rogue: [4, 8, 10, 12, 16, 19],
  Sorcerer: [4, 8, 12, 16, 19],
  Warlock: [4, 8, 12, 16, 19],
  Wizard: [4, 8, 12, 16, 19],
  Artificer: [4, 8, 12, 16, 19]
};

// Bonus proficiencies granted by subclass at specific levels. Key: "ClassName|SubclassName"
const BONUS_PROFICIENCIES_ON_LEVEL = {
  'Bard|College of Lore': { 3: { type: 'skills', count: 3 } },
  'Bard|College of Valor': { 3: { type: 'armor', items: ['Medium armor', 'Shields', 'Martial weapons'] } },
  'Cleric|Knowledge Domain': { 1: { type: 'skills', count: 2 } },
  'Cleric|Life Domain': { 1: { type: 'armor', items: ['Heavy armor'] } },
  'Cleric|Tempest Domain': { 1: { type: 'armor', items: ['Heavy armor', 'Martial weapons'] } },
  'Cleric|War Domain': { 1: { type: 'armor', items: ['Heavy armor', 'Martial weapons'] } },
  'Cleric|Forge Domain': { 1: { type: 'armor', items: ['Heavy armor'] } },
  'Rogue|Assassin': { 3: { type: 'tools', items: ["Disguise kit", "Poisoner's kit"] } },
  'Fighter|Samurai': { 3: { type: 'skills', count: 1 } },
  'Fighter|Rune Knight': { 3: { type: 'tools', items: ["Smith's tools"] } }
};

// Class features by level (SRD/PHB summary)
const CLASS_FEATURES_BY_LEVEL = {
  Barbarian: { 1: 'Rage, Unarmored Defense', 2: 'Reckless Attack, Danger Sense', 3: 'Primal Path', 4: 'Ability Score Improvement', 5: 'Extra Attack, Fast Movement', 6: 'Path feature', 7: 'Feral Instinct', 8: 'Ability Score Improvement', 9: 'Brutal Critical (1 die)', 10: 'Path feature', 11: 'Relentless Rage', 12: 'Ability Score Improvement', 13: 'Brutal Critical (2 dice)', 14: 'Path feature', 15: 'Persistent Rage', 16: 'Ability Score Improvement', 17: 'Brutal Critical (3 dice)', 18: 'Indomitable Might', 19: 'Ability Score Improvement', 20: 'Primal Champion' },
  Bard: { 1: 'Spellcasting, Bardic Inspiration (d6)', 2: 'Jack of All Trades, Song of Rest (d6)', 3: 'Bard College, Expertise', 4: 'Ability Score Improvement', 5: 'Bardic Inspiration (d8), Font of Inspiration', 6: 'Countercharm, College feature', 7: '—', 8: 'Ability Score Improvement', 9: 'Song of Rest (d8)', 10: 'Bardic Inspiration (d10), Expertise, Magical Secrets', 11: '—', 12: 'Ability Score Improvement', 13: 'Song of Rest (d10)', 14: 'Magical Secrets, College feature', 15: 'Bardic Inspiration (d12)', 16: 'Ability Score Improvement', 17: '—', 18: 'Magical Secrets', 19: 'Ability Score Improvement', 20: 'Superior Inspiration' },
  Cleric: { 1: 'Spellcasting, Divine Domain', 2: 'Channel Divinity (1/rest), Domain feature', 3: '—', 4: 'Ability Score Improvement', 5: 'Destroy Undead (CR 1/2)', 6: 'Channel Divinity (2/rest), Domain feature', 7: '—', 8: 'Ability Score Improvement, Destroy Undead (CR 1)', 9: '—', 10: 'Divine Intervention', 11: 'Destroy Undead (CR 2)', 12: 'Ability Score Improvement', 13: '—', 14: 'Destroy Undead (CR 3)', 15: '—', 16: 'Ability Score Improvement', 17: '—', 18: 'Channel Divinity (3/rest)', 19: 'Ability Score Improvement', 20: 'Divine Intervention improvement' },
  Druid: { 1: 'Druidic, Spellcasting', 2: 'Wild Shape, Druid Circle', 3: '—', 4: 'Ability Score Improvement, Wild Shape improvement', 5: '—', 6: 'Druid Circle feature', 7: '—', 8: 'Ability Score Improvement, Wild Shape improvement', 9: '—', 10: 'Druid Circle feature', 11: '—', 12: 'Ability Score Improvement', 13: '—', 14: 'Druid Circle feature', 15: '—', 16: 'Ability Score Improvement', 17: '—', 18: 'Beast Spells', 19: 'Ability Score Improvement', 20: 'Archdruid' },
  Fighter: { 1: 'Fighting Style, Second Wind', 2: 'Action Surge (1 use)', 3: 'Martial Archetype', 4: 'Ability Score Improvement', 5: 'Extra Attack', 6: 'Ability Score Improvement', 7: 'Archetype feature', 8: 'Ability Score Improvement', 9: 'Indomitable (1 use)', 10: 'Archetype feature', 11: 'Extra Attack (2)', 12: 'Ability Score Improvement', 13: 'Indomitable (2 uses)', 14: 'Ability Score Improvement', 15: 'Archetype feature', 16: 'Ability Score Improvement', 17: 'Action Surge (2 uses), Indomitable (3)', 18: 'Archetype feature', 19: 'Ability Score Improvement', 20: 'Extra Attack (3)' },
  Monk: { 1: 'Unarmored Defense, Martial Arts', 2: 'Ki, Unarmored Movement', 3: 'Monastic Tradition, Deflect Missiles', 4: 'Ability Score Improvement, Slow Fall', 5: 'Extra Attack, Stunning Strike', 6: 'Ki-Empowered Strikes, Tradition feature', 7: 'Evasion, Stillness of Mind', 8: 'Ability Score Improvement', 9: 'Unarmored Movement improvement', 10: 'Purity of Body', 11: 'Tradition feature', 12: 'Ability Score Improvement', 13: 'Tongue of the Sun and Moon', 14: 'Diamond Soul', 15: 'Timeless Body', 16: 'Ability Score Improvement', 17: 'Tradition feature', 18: 'Empty Body', 19: 'Ability Score Improvement', 20: 'Perfect Self' },
  Paladin: { 1: 'Divine Sense, Lay on Hands', 2: 'Fighting Style, Spellcasting, Divine Smite', 3: 'Sacred Oath', 4: 'Ability Score Improvement', 5: 'Extra Attack', 6: 'Aura of Protection', 7: 'Sacred Oath feature', 8: 'Ability Score Improvement', 9: '—', 10: 'Aura of Courage', 11: 'Improved Divine Smite', 12: 'Ability Score Improvement', 13: '—', 14: 'Cleansing Touch', 15: 'Sacred Oath feature', 16: 'Ability Score Improvement', 17: '—', 18: 'Aura improvements', 19: 'Ability Score Improvement', 20: 'Sacred Oath capstone' },
  Ranger: { 1: 'Favored Enemy, Natural Explorer', 2: 'Fighting Style, Spellcasting', 3: 'Ranger Archetype', 4: 'Ability Score Improvement', 5: 'Extra Attack', 6: 'Favored Enemy improvement', 7: 'Archetype feature', 8: 'Ability Score Improvement', 9: '—', 10: 'Natural Explorer improvement', 11: 'Archetype feature', 12: 'Ability Score Improvement', 13: '—', 14: 'Favored Enemy improvement', 15: 'Archetype feature', 16: 'Ability Score Improvement', 17: '—', 18: 'Feral Senses', 19: 'Ability Score Improvement', 20: 'Foe Slayer' },
  Rogue: { 1: 'Expertise, Sneak Attack, Thieves\' Cant', 2: 'Cunning Action', 3: 'Roguish Archetype', 4: 'Ability Score Improvement', 5: 'Uncanny Dodge', 6: 'Expertise', 7: 'Evasion', 8: 'Ability Score Improvement', 9: 'Archetype feature', 10: 'Ability Score Improvement', 11: 'Reliable Talent', 12: 'Ability Score Improvement', 13: 'Archetype feature', 14: 'Blindsense', 15: 'Slippery Mind', 16: 'Ability Score Improvement', 17: 'Archetype feature', 18: 'Elusive', 19: 'Ability Score Improvement', 20: 'Stroke of Luck' },
  Sorcerer: { 1: 'Spellcasting, Sorcerous Origin', 2: 'Font of Magic', 3: 'Metamagic', 4: 'Ability Score Improvement', 5: '—', 6: 'Origin feature', 7: '—', 8: 'Ability Score Improvement', 9: '—', 10: 'Metamagic', 11: '—', 12: 'Ability Score Improvement', 13: '—', 14: 'Origin feature', 15: '—', 16: 'Ability Score Improvement', 17: 'Metamagic', 18: 'Origin feature', 19: 'Ability Score Improvement', 20: 'Sorcerous Restoration' },
  Warlock: { 1: 'Otherworldly Patron, Pact Magic', 2: 'Eldritch Invocations', 3: 'Pact Boon', 4: 'Ability Score Improvement', 5: '—', 6: 'Otherworldly Patron feature', 7: '—', 8: 'Ability Score Improvement', 9: '—', 10: 'Patron feature', 11: 'Mystic Arcanum (6th)', 12: 'Ability Score Improvement', 13: 'Mystic Arcanum (7th)', 14: 'Patron feature', 15: 'Mystic Arcanum (8th)', 16: 'Ability Score Improvement', 17: 'Mystic Arcanum (9th)', 18: '—', 19: 'Ability Score Improvement', 20: 'Eldritch Master' },
  Wizard: { 1: 'Spellcasting, Arcane Recovery', 2: 'Arcane Tradition', 3: '—', 4: 'Ability Score Improvement', 5: '—', 6: 'Tradition feature', 7: '—', 8: 'Ability Score Improvement', 9: '—', 10: 'Tradition feature', 11: '—', 12: 'Ability Score Improvement', 13: '—', 14: 'Tradition feature', 15: '—', 16: 'Ability Score Improvement', 17: '—', 18: 'Spell Mastery', 19: 'Ability Score Improvement', 20: 'Signature Spells' },
  Artificer: { 1: 'Spellcasting, Magical Tinkering', 2: 'Infuse Item', 3: 'Artificer Specialist', 4: 'Ability Score Improvement', 5: '—', 6: 'Specialist feature', 7: 'Flash of Genius', 8: 'Ability Score Improvement', 9: '—', 10: 'Magic Item Adept', 11: 'Spell-Storing Item', 12: 'Ability Score Improvement', 13: '—', 14: 'Magic Item Savant', 15: 'Specialist feature', 16: 'Ability Score Improvement', 17: '—', 18: 'Magic Item Master', 19: 'Ability Score Improvement', 20: 'Soul of Artifice' }
};

const SKILL_ABILITY_MAP = {
  'Acrobatics': 'dexterity', 'Animal Handling': 'wisdom', 'Arcana': 'intelligence', 'Athletics': 'strength',
  'Deception': 'charisma', 'History': 'intelligence', 'Insight': 'wisdom', 'Intimidation': 'charisma',
  'Investigation': 'intelligence', 'Medicine': 'wisdom', 'Nature': 'intelligence', 'Perception': 'wisdom',
  'Performance': 'charisma', 'Persuasion': 'charisma', 'Religion': 'intelligence', 'Sleight of Hand': 'dexterity',
  'Stealth': 'dexterity', 'Survival': 'wisdom'
};

function createEmptyCharacter() {
  return {
    id: null,
    name: '',
    race: '',
    subrace: '',
    class: '',
    subclass: '',
    level: 1,
    background: '',
    alignment: '',
    stats: {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10
    },
    skills: [],
    proficiencies: [],
    equipment: [],
    languages: [],
    resistances: [],
    immunities: [],
    vulnerabilities: [],
    weaknesses: [],
    notes: '',
    source: 'PHB',
    // Campaign / session fields
    hp: null,
    maxHp: null,
    tempHp: 0,
    ac: null,
    initiative: null,
    speed: null,
    levelingMode: 'xp', // 'xp' | 'milestone'
    xp: 0,
    spellSlotsUsed: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    knownSpells: [],
    conditions: [],
    inspiration: false,
    hitDiceTotal: null,
    hitDiceUsed: 0,
    deathSaveSuccesses: 0,
    deathSaveFailures: 0,
    currency: { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 },
    attacks: [],
    multiclass: [],
    weaponProficiencies: [],
    armorProficiencies: [],
    toolProficiencies: [],
    sectionOrder: [],
    inventory: [],
    personalityTraits: '',
    ideals: '',
    bonds: '',
    flaws: '',
    physicalAppearance: ''
  };
}

// Get languages, resistances, etc. from race (for auto-population)
function getRaceTraits(raceName, subraceName) {
  const race = getMergedRaces().find(r => r.name === raceName);
  if (!race) return { languages: [], resistances: [], immunities: [], vulnerabilities: [], weaknesses: [], languagesExtra: 0 };
  const sub = subraceName && race.subraces?.find(s => s.name === subraceName);
  const langs = [...(race.languages || []), ...(sub?.languages || [])];
  const res = [...(race.resistances || []), ...(sub?.resistances || [])];
  const imm = [...(race.immunities || []), ...(sub?.immunities || [])];
  const vuln = [...(race.vulnerabilities || []), ...(sub?.vulnerabilities || [])];
  const weak = [...(race.weaknesses || []), ...(sub?.weaknesses || [])];
  const extra = sub?.languagesExtra ?? race.languagesExtra ?? 0;
  return { languages: langs, resistances: res, immunities: imm, vulnerabilities: vuln, weaknesses: weak, languagesExtra: extra };
}

// ========== OFFICIAL D&D REFERENCE LINKS ==========
// PDFs and supplements for quick reference (links only; content not parsed).

const REFERENCE_LINKS = [
  { id: 'basic2018', name: 'Basic Rules 2018', url: 'https://media.wizards.com/2018/dnd/downloads/DnD_BasicRules_2018.pdf' },
  { id: 'hoard', name: 'Hoard of the Dragon Queen (Supplement)', url: 'https://media.wizards.com/2014/downloads/dnd/HoardDragonQueen_Supplement_PF_v0.3.pdf' },
  { id: 'dm-basic', name: 'DM Basic Rules', url: 'https://media.wizards.com/2014/downloads/dnd/DMBasicRulesv.0.3_PrinterFriendly.pdf' },
  { id: 'rise-tiamat', name: 'Rise of Tiamat (Supplement)', url: 'https://media.wizards.com/2014/downloads/dnd/RiseTiamatSupplementv0.2_Printer.pdf' },
  { id: 'ee-companion', name: 'Elemental Evil Player\'s Companion', url: 'https://media.wizards.com/2015/downloads/dnd/EE_PlayersCompanion.pdf' },
  { id: 'al-tod', name: 'Adventurers League: Tyranny of Dragons', url: 'https://media.wizards.com/downloads/dnd/ADVLeague_PlayerGuide_TODv1.pdf' },
  { id: 'al-ee', name: 'Adventurers League: Elemental Evil', url: 'https://media.wizards.com/2015/downloads/dnd/DDALPG_EEv1Print.pdf' },
  { id: 'ua-eberron', name: 'Unearthed Arcana: Eberron', url: 'https://media.wizards.com/2015/downloads/dnd/UA_Eberron_v1.1.pdf' },
  { id: 'ua-battlesystem', name: 'Unearthed Arcana: Battle System', url: 'https://media.wizards.com/2015/downloads/dnd/UA_Battlesystem.pdf' }
];

// Class icons (emoji for quick visual identification)
const CLASS_ICONS = {
  Barbarian: '⚔', Bard: '🎵', Cleric: '✝', Druid: '🌿', Fighter: '🛡', Monk: '🥋',
  Paladin: '⚜', Ranger: '🏹', Rogue: '🗡', Sorcerer: '✨', Warlock: '🔮', Wizard: '📜', Artificer: '⚙'
};

// Damage type icons
const DAMAGE_TYPE_ICONS = {
  Acid: '🧪', Bludgeoning: '🔨', Cold: '❄', Fire: '🔥', Force: '💫', Lightning: '⚡',
  Necrotic: '💀', Piercing: '🗡', Poison: '☠', Psychic: '🧠', Radiant: '☀', Slashing: '⚔', Thunder: '💥'
};

// ========== ADDITIONAL BOOKS SYSTEM ==========
// Add content from supplemental books (Tasha's, Xanathar's, homebrew, etc.)
// See CONTENT_GUIDE.md for how to add new books.

const ADDITIONAL_BOOKS = [
  {
    id: 'tashas',
    name: "Tasha's Cauldron of Everything",
    enabled: true,
    races: [
      { id: 'custom-lineage', name: 'Custom Lineage', description: 'Create a custom lineage using the rules in Tasha\'s.', speed: 30, abilityScore: { any: 2 }, traits: ['Custom', 'Darkvision or Skill'], languages: ['Common'], languagesExtra: 1, subraces: [] }
    ],
    classes: [
      { id: 'artificer', name: 'Artificer', description: 'Masters of invention who use magic to create objects.', hitDie: 8, primaryAbility: ['Intelligence'], savingThrows: ['Constitution', 'Intelligence'], subclasses: [
        { name: 'Alchemist', level: 3, description: 'Alchemists use magic to create potions.' },
        { name: 'Armorer', level: 3, description: 'Armorers craft magical suits of armor.' },
        { name: 'Battle Smith', level: 3, description: 'Battle Smiths bond with a mechanical companion.' }
      ] }
    ],
    backgrounds: [
      { name: 'Feylost', skillProficiencies: ['Deception', 'Survival'], description: 'You were lost in the Feywild as a child.' }
    ],
    rules: 'Custom Lineage: +2 to one ability score. Optional class features from Tasha\'s can be used with DM approval.'
  },
  {
    id: 'xanathars',
    name: "Xanathar's Guide to Everything",
    enabled: true,
    races: [],
    classes: [
      { name: 'Barbarian', subclasses: [{ name: 'Path of the Storm Herald', level: 3, description: 'Channel the storm.' }] },
      { name: 'Bard', subclasses: [{ name: 'College of Glamour', level: 3, description: 'Bards of the College of Glamour.' }] },
      { name: 'Cleric', subclasses: [{ name: 'Forge Domain', level: 1, description: 'Gods of the forge.' }] },
      { name: 'Druid', subclasses: [{ name: 'Circle of the Shepherd', level: 2, description: 'Spirit of the wild.' }] },
      { name: 'Fighter', subclasses: [{ name: 'Samurai', level: 3, description: 'Elegant warriors.' }] },
      { name: 'Monk', subclasses: [{ name: 'Way of the Kensei', level: 3, description: 'Weapon masters.' }] },
      { name: 'Paladin', subclasses: [{ name: 'Oath of Conquest', level: 3, description: 'Conquer your foes.' }] },
      { name: 'Ranger', subclasses: [{ name: 'Gloom Stalker', level: 3, description: 'Hunters in the dark.' }] },
      { name: 'Rogue', subclasses: [{ name: 'Scout', level: 3, description: 'Skilled hunters.' }] },
      { name: 'Sorcerer', subclasses: [{ name: 'Divine Soul', level: 1, description: 'Celestial power.' }] },
      { name: 'Warlock', subclasses: [{ name: 'The Celestial', level: 1, description: 'Healing light.' }] },
      { name: 'Wizard', subclasses: [{ name: 'War Magic', level: 2, description: 'Combat magic.' }] }
    ],
    backgrounds: [
      { name: 'Archaeologist', skillProficiencies: ['History', 'Survival'], description: 'You have explored ruins.' },
      { name: 'Knight of the Order', skillProficiencies: ['Persuasion', 'Survival'], description: 'You belong to an order.' }
    ],
    rules: 'Additional subclasses and options from Xanathar\'s Guide.'
  },
  {
    id: 'elemental-evil',
    name: "Elemental Evil Player's Companion",
    enabled: true,
    races: [],
    classes: [],
    backgrounds: [],
    rules: 'Aarakocra and Deep Gnome (Svirfneblin) are in core. Elemental spells available in spell list.'
  },
  {
    id: 'volos',
    name: "Volo's Guide to Monsters",
    enabled: false,
    races: [
      { id: 'goliath', name: 'Goliath', description: 'Large humanoids from mountain regions, known for strength and resilience.', speed: 30, abilityScore: { strength: 2 }, traits: ['Natural Athlete', 'Stone\'s Endurance', 'Powerful Build'], languages: ['Common', 'Giant'], languagesExtra: 0, subraces: [] },
      { id: 'aasimar', name: 'Aasimar', description: 'Humanoids touched by celestial power, often serving as divine emissaries.', speed: 30, abilityScore: { charisma: 2 }, traits: ['Darkvision', 'Celestial Resistance', 'Healing Hands'], languages: ['Common', 'Celestial'], languagesExtra: 0, subraces: [
        { name: 'Protector', abilityScore: { charisma: 2, wisdom: 1 }, traits: ['Radiant Soul'] },
        { name: 'Scourge', abilityScore: { charisma: 2, constitution: 1 }, traits: ['Radiant Consumption'] },
        { name: 'Fallen', abilityScore: { charisma: 2, strength: 1 }, traits: ['Necrotic Shroud'] }
      ] },
      { id: 'firbolg', name: 'Firbolg', description: 'Gentle giants of the forest who prefer solitude and nature.', speed: 30, abilityScore: { wisdom: 2, strength: 1 }, traits: ['Firbolg Magic', 'Hidden Step', 'Powerful Build'], languages: ['Common', 'Elvish', 'Giant'], languagesExtra: 0, subraces: [] }
    ],
    classes: [],
    backgrounds: [],
    rules: 'Additional playable races from Volo\'s Guide.'
  },
  {
    id: 'mordenkainen',
    name: "Mordenkainen's Tome of Foes",
    enabled: false,
    races: [
      { id: 'githyanki', name: 'Githyanki', description: 'Warrior race from the Astral Plane, sworn to destroy mind flayers.', speed: 30, abilityScore: { strength: 2, intelligence: 1 }, traits: ['Decadent Mastery', 'Martial Prodigy', 'Githyanki Psionics'], languages: ['Common', 'Gith'], languagesExtra: 0, subraces: [] },
      { id: 'githzerai', name: 'Githzerai', description: 'Disciplined monks from Limbo, focused on mental clarity.', speed: 30, abilityScore: { wisdom: 2, intelligence: 1 }, traits: ['Mental Discipline', 'Githzerai Psionics'], languages: ['Common', 'Gith'], languagesExtra: 0, subraces: [] },
      { id: 'eladrin', name: 'Eladrin', description: 'Elves of the Feywild whose mood shifts with the seasons.', speed: 30, abilityScore: { dexterity: 2 }, traits: ['Fey Ancestry', 'Trance', 'Fey Step'], languages: ['Common', 'Elvish'], languagesExtra: 0, subraces: [] }
    ],
    classes: [],
    backgrounds: [],
    rules: 'Races and lore from Mordenkainen\'s Tome of Foes.'
  },
  {
    id: 'fizbans',
    name: "Fizban's Treasury of Dragons",
    enabled: false,
    races: [],
    classes: [
      { name: 'Barbarian', subclasses: [{ name: 'Path of the Beast', level: 3, description: 'Embrace the beast within.' }] },
      { name: 'Fighter', subclasses: [{ name: 'Rune Knight', level: 3, description: 'Harness the power of runes.' }] },
      { name: 'Monk', subclasses: [{ name: 'Way of the Ascendant Dragon', level: 3, description: 'Channel draconic power.' }] },
      { name: 'Paladin', subclasses: [{ name: 'Oath of the Watchers', level: 3, description: 'Guard against extraplanar threats.' }] },
      { name: 'Ranger', subclasses: [{ name: 'Drakewarden', level: 3, description: 'Bond with a draconic spirit.' }] }
    ],
    backgrounds: [],
    rules: 'Draconic subclasses and options from Fizban\'s Treasury.'
  },
  {
    id: 'vanrichtens',
    name: "Van Richten's Guide to Ravenloft",
    enabled: false,
    races: [],
    classes: [
      { name: 'Bard', subclasses: [{ name: 'College of Spirits', level: 3, description: 'Channel spirits for guidance.' }] },
      { name: 'Cleric', subclasses: [{ name: 'Peace Domain', level: 1, description: 'Spread harmony and unity.' }] },
      { name: 'Warlock', subclasses: [{ name: 'The Undead', level: 1, description: 'Pact with an undead patron.' }] },
      { name: 'Wizard', subclasses: [{ name: 'Order of Scribes', level: 2, description: 'Master of magical writing and spellbooks.' }] }
    ],
    backgrounds: [
      { name: 'Haunted One', skillProficiencies: ['Investigation', 'Religion'], description: 'You are haunted by something from your past.' }
    ],
    rules: 'Gothic horror subclasses from Van Richten\'s Guide.'
  },
  {
    id: 'sword-coast',
    name: "Sword Coast Adventurer's Guide",
    enabled: false,
    races: [
      { id: 'duergar', name: 'Duergar', description: 'Gray dwarves of the Underdark, hardened by slavery.', speed: 25, abilityScore: { constitution: 2 }, traits: ['Darkvision', 'Duergar Resilience', 'Sunlight Sensitivity'], languages: ['Common', 'Dwarvish'], languagesExtra: 0, subraces: [] }
    ],
    classes: [
      { name: 'Barbarian', subclasses: [{ name: 'Path of the Battlerager', level: 3, description: 'Berserker in spiked armor.' }] },
      { name: 'Fighter', subclasses: [{ name: 'Purple Dragon Knight', level: 3, description: 'Inspire allies in battle.' }] },
      { name: 'Rogue', subclasses: [{ name: 'Mastermind', level: 3, description: 'Master of tactics and deception.' }] },
      { name: 'Warlock', subclasses: [{ name: 'The Undying', level: 1, description: 'Pact with deathless beings.' }] }
    ],
    backgrounds: [],
    rules: 'Regional options from the Sword Coast.'
  },
  {
    id: 'acquisitions',
    name: "Acquisitions Incorporated",
    enabled: false,
    races: [],
    classes: [],
    backgrounds: [
      { name: 'Celebrity Adventurer\'s Scion', skillProficiencies: ['Performance', 'Persuasion'], description: 'You grew up in the shadow of famous adventurers.' },
      { name: 'Failed Merchant', skillProficiencies: ['Investigation', 'Persuasion'], description: 'Your business failed; now you seek new opportunities.' },
      { name: 'Gambler', skillProficiencies: ['Deception', 'Sleight of Hand'], description: 'You make your living by chance and skill.' }
    ],
    rules: 'Corporate comedy and alternative backgrounds.'
  },
  { id: 'mpmm', name: "Mordenkainen Presents: Monsters of the Multiverse", enabled: false, races: [], classes: [], backgrounds: [], rules: 'Updated races and monsters from Volo\'s and Mordenkainen\'s.' },
  { id: 'ggr', name: "Guildmaster's Guide to Ravnica", enabled: false, races: [], classes: [], backgrounds: [], rules: 'Ravnica setting.' },
  { id: 'erlw', name: "Eberron: Rising from the Last War", enabled: false, races: [], classes: [], backgrounds: [], rules: 'Eberron setting.' },
  { id: 'egw', name: "Explorer's Guide to Wildemount", enabled: false, races: [], classes: [], backgrounds: [], rules: 'Critical Role setting.' },
  { id: 'mot', name: "Mythic Odysseys of Theros", enabled: false, races: [], classes: [], backgrounds: [], rules: 'Theros setting.' },
  { id: 'scc', name: "Strixhaven: Curriculum of Chaos", enabled: false, races: [], classes: [], backgrounds: [], rules: 'Strixhaven setting.' },
  { id: 'aag', name: "Astral Adventurer's Guide", enabled: false, races: [], classes: [], backgrounds: [], rules: 'Spelljammer setting.' }
];

// Custom races and backgrounds (stored in localStorage)
function getCustomRaces() {
  try {
    const s = localStorage.getItem('dnd_custom_races');
    return s ? JSON.parse(s) : [];
  } catch (e) { return []; }
}
function setCustomRaces(arr) {
  localStorage.setItem('dnd_custom_races', JSON.stringify(Array.isArray(arr) ? arr : []));
}
function addCustomRace(race) {
  const arr = getCustomRaces();
  if (!race.name?.trim()) return false;
  const r = {
    id: 'custom_' + Date.now(),
    name: race.name.trim(),
    description: race.description || '',
    speed: race.speed ?? 30,
    abilityScore: race.abilityScore || {},
    traits: race.traits || [],
    languages: race.languages || ['Common'],
    languagesExtra: race.languagesExtra ?? 0,
    subraces: race.subraces || [],
    custom: true
  };
  arr.push(r);
  setCustomRaces(arr);
  return true;
}
function getCustomBackgrounds() {
  try {
    const s = localStorage.getItem('dnd_custom_backgrounds');
    return s ? JSON.parse(s) : [];
  } catch (e) { return []; }
}
function setCustomBackgrounds(arr) {
  localStorage.setItem('dnd_custom_backgrounds', JSON.stringify(Array.isArray(arr) ? arr : []));
}
function addCustomBackground(bg) {
  const arr = getCustomBackgrounds();
  if (!bg.name?.trim()) return false;
  const b = {
    name: bg.name.trim(),
    skillProficiencies: bg.skillProficiencies || [],
    description: bg.description || '',
    custom: true
  };
  arr.push(b);
  setCustomBackgrounds(arr);
  return true;
}

// ========== MERGED CONTENT (ruleset-filtered) ==========
/** Merge content from PHB + all enabled additional books, filtered by enabled rulesets */
function getMergedRaces() {
  let races = [...RACES, ...getCustomRaces()];
  const enabledBooks = typeof getEnabledAdditionalBooks === 'function' ? getEnabledAdditionalBooks() : [];
  ADDITIONAL_BOOKS.filter(b => (b.enabled || enabledBooks.includes(b.id)) && b.races).forEach(book => {
    book.races.forEach(r => {
      if (!races.find(ex => ex.name === r.name)) races.push({ ...r, source: book.id });
    });
  });
  const filter = getMergedRulesetFilter();
  if (filter.races) {
    races = races.filter(r => filter.races.includes(r.name));
    if (filter.raceSubraces) {
      races = races.map(r => {
        const allowed = filter.raceSubraces[r.name];
        if (!allowed) return r;
        return { ...r, subraces: (r.subraces || []).filter(s => allowed.includes(s.name)) };
      });
    }
  }
  return races;
}

function getMergedClasses() {
  let classes = JSON.parse(JSON.stringify(CLASSES));
  const enabledBooks = typeof getEnabledAdditionalBooks === 'function' ? getEnabledAdditionalBooks() : [];
  ADDITIONAL_BOOKS.filter(b => (b.enabled || enabledBooks.includes(b.id)) && b.classes).forEach(book => {
    book.classes.forEach(cls => {
      const existing = classes.find(c => c.name === cls.name);
      if (existing && cls.subclasses?.length) {
        existing.subclasses = [...(existing.subclasses || []), ...cls.subclasses];
      } else if (!existing) {
        classes.push({ ...cls, source: book.id });
      }
    });
  });
  const filter = getMergedRulesetFilter();
  if (filter.classes) {
    classes = classes.filter(c => filter.classes.includes(c.name));
    if (filter.classSubclasses) {
      classes = classes.map(c => {
        const allowed = filter.classSubclasses[c.name];
        if (!allowed) return c;
        return { ...c, subclasses: (c.subclasses || []).filter(s => allowed.includes(s.name)) };
      });
    }
  }
  return classes;
}

function getMergedBackgrounds() {
  let bgs = [...BACKGROUNDS, ...getCustomBackgrounds()];
  const enabledBooks = typeof getEnabledAdditionalBooks === 'function' ? getEnabledAdditionalBooks() : [];
  ADDITIONAL_BOOKS.filter(b => (b.enabled || enabledBooks.includes(b.id)) && b.backgrounds).forEach(book => {
    book.backgrounds.forEach(bg => {
      if (!bgs.find(ex => ex.name === bg.name)) bgs.push({ ...bg, source: book.id });
    });
  });
  const filter = getMergedRulesetFilter();
  if (filter.backgrounds) {
    bgs = bgs.filter(b => filter.backgrounds.includes(b.name));
  }
  return bgs;
}

function getMergedRules() {
  const bookRules = ADDITIONAL_BOOKS.filter(b => b.enabled && b.rules).map(b => `## ${b.name}\n${b.rules}`).join('\n\n');
  const customRules = localStorage.getItem('dnd_custom_rules') || '';
  return { bookRules, customRules };
}

function getEnabledBooks() {
  return ADDITIONAL_BOOKS.filter(b => b.enabled);
}

function getEnabledAdditionalBooks() {
  try {
    const saved = localStorage.getItem('dnd_enabled_additional_books');
    if (saved) {
      const arr = JSON.parse(saved);
      if (Array.isArray(arr)) return arr;
    }
  } catch (e) {}
  return ADDITIONAL_BOOKS.map(b => b.id);
}

function setEnabledAdditionalBooks(ids) {
  if (Array.isArray(ids)) {
    localStorage.setItem('dnd_enabled_additional_books', JSON.stringify(ids));
    return true;
  }
  return false;
}

function getAllSelectableBooks() {
  const rulesets = typeof RULESETS !== 'undefined' ? Object.values(RULESETS) : [];
  const additional = typeof ADDITIONAL_BOOKS !== 'undefined' ? ADDITIONAL_BOOKS.filter(b => b.id) : [];
  return [
    ...rulesets.map(r => ({ id: r.id, name: r.name, type: 'ruleset' })),
    ...additional.map(b => ({ id: 'book_' + b.id, name: b.name, type: 'additional' }))
  ];
}
