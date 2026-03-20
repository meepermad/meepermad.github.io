/**
 * D&D 5.5e (2024 PHB) Content - Species, Classes, Backgrounds
 * Based on the 2024 Player's Handbook revised rules.
 *
 * Key differences from 2014 PHB:
 *   - Species no longer grant ability score increases (backgrounds do).
 *   - All classes gain their subclass at level 3.
 *   - Backgrounds grant +2/+1 (or +1/+1/+1) ability score increases and a feat.
 *   - Weapon Mastery system added for martial classes.
 */

// ========== 2024 SPECIES ==========
const RACES_2024 = [
  {
    id: 'human-2024',
    name: 'Human',
    description: 'Versatile and ambitious, humans are the most widespread people across the worlds of D&D. In the 2024 rules they gain an extra skill proficiency (Skillful), the ability to swap a skill or tool proficiency after a long rest (Resourceful), and Heroic Inspiration whenever they finish a long rest. A fantastic blank-canvas choice for any class.',
    speed: 30,
    abilityScore: {},
    traits: ['Resourceful', 'Skillful', 'Versatile'],
    languages: ['Common'],
    languagesExtra: 1,
    resistances: [],
    immunities: [],
    vulnerabilities: [],
    weaknesses: [],
    subraces: [],
    edition: '5.5e',
    source: '2024 PHB'
  },
  {
    id: 'elf-2024',
    name: 'Elf',
    description: 'Graceful, long-lived fey-touched people with keen senses and an innate connection to the Feywild. Elves enter a meditative Trance instead of sleeping and are resistant to charm effects. At creation you choose a lineage — Drow, High Elf, or Wood Elf — each granting unique magical or physical gifts.',
    speed: 30,
    abilityScore: {},
    traits: ['Darkvision', 'Fey Ancestry', 'Keen Senses', 'Trance'],
    languages: ['Common', 'Elvish'],
    languagesExtra: 0,
    resistances: [],
    immunities: [],
    vulnerabilities: [],
    weaknesses: [],
    subraces: [
      {
        name: 'Drow',
        description: 'Elves with ties to the Underdark. They possess 120-foot Superior Darkvision and gain innate Drow spellcasting (dancing lights, faerie fire, darkness) as they level up. Ideal for stealthy or charisma-focused builds.',
        abilityScore: {},
        traits: ['Superior Darkvision', 'Drow Magic'],
        languages: [],
        languagesExtra: 0
      },
      {
        name: 'High Elf',
        description: 'Elves steeped in arcane tradition. They learn one wizard cantrip of their choice and gain one additional language. Perfect for wizards, eldritch knights, and any character who wants a dash of magic.',
        abilityScore: {},
        traits: ['Cantrip', 'Extra Language'],
        languages: [],
        languagesExtra: 1
      },
      {
        name: 'Wood Elf',
        description: 'Fleet-footed elves of the deep forests. Their walking speed increases to 35 feet and they can attempt to hide when only lightly obscured by natural phenomena (Mask of the Wild). Great for rangers, druids, and monks.',
        abilityScore: {},
        traits: ['Fleet of Foot', 'Mask of the Wild'],
        languages: [],
        languagesExtra: 0
      }
    ],
    edition: '5.5e',
    source: '2024 PHB'
  },
  {
    id: 'dwarf-2024',
    name: 'Dwarf',
    description: 'Bold and hardy folk with a deep affinity for stone, metal, and tradition. In the 2024 rules, dwarves now have a full 30-foot walking speed and gain Dwarven Toughness (extra HP each level) as part of their base species. They shrug off poison and instinctively read stonework.',
    speed: 30,
    abilityScore: {},
    traits: ['Darkvision', 'Dwarven Resilience', 'Dwarven Toughness', 'Stonecunning'],
    languages: ['Common', 'Dwarvish'],
    languagesExtra: 0,
    resistances: ['Poison'],
    immunities: [],
    vulnerabilities: [],
    weaknesses: [],
    subraces: [],
    edition: '5.5e',
    source: '2024 PHB'
  },
  {
    id: 'halfling-2024',
    name: 'Halfling',
    description: 'Small, resourceful, and remarkably lucky, halflings thrive in a world built for bigger folk. The 2024 version folds Naturally Stealthy into the base species, so every halfling can hide behind larger creatures. Combined with Lucky (reroll natural 1s) and Brave, they excel as rogues, bards, and rangers.',
    speed: 30,
    abilityScore: {},
    traits: ['Brave', 'Halfling Nimbleness', 'Lucky', 'Naturally Stealthy'],
    languages: ['Common', 'Halfling'],
    languagesExtra: 0,
    resistances: [],
    immunities: [],
    vulnerabilities: [],
    weaknesses: [],
    subraces: [],
    edition: '5.5e',
    source: '2024 PHB'
  },
  {
    id: 'gnome-2024',
    name: 'Gnome',
    description: 'Curious, inventive, and irrepressibly cheerful, gnomes delight in tinkering and discovery. Gnome Cunning grants them advantage on Intelligence, Wisdom, and Charisma saving throws against spells. Choose a lineage — Forest Gnome for illusion magic and beast-speech, or Rock Gnome for clockwork gadgets and lore.',
    speed: 30,
    abilityScore: {},
    traits: ['Darkvision', 'Gnome Cunning'],
    languages: ['Common', 'Gnomish'],
    languagesExtra: 0,
    resistances: [],
    immunities: [],
    vulnerabilities: [],
    weaknesses: [],
    subraces: [
      {
        name: 'Forest Gnome',
        description: 'Reclusive gnomes with a knack for illusion and an affinity for woodland creatures. They know the minor illusion cantrip and can communicate simple ideas with Small or smaller beasts.',
        abilityScore: {},
        traits: ['Natural Illusionist', 'Speak with Small Beasts'],
        languages: [],
        languagesExtra: 0
      },
      {
        name: 'Rock Gnome',
        description: 'Inventive gnomes fascinated by gadgets and engineering. They gain double proficiency on History checks related to magical or technological items and can craft tiny clockwork devices.',
        abilityScore: {},
        traits: ['Artificer\'s Lore', 'Tinker'],
        languages: [],
        languagesExtra: 0
      }
    ],
    edition: '5.5e',
    source: '2024 PHB'
  },
  {
    id: 'dragonborn-2024',
    name: 'Dragonborn',
    description: 'Proud, draconic humanoids who carry the legacy of true dragons. The 2024 version grants darkvision and a significantly improved Breath Weapon that uses an action to deal 1d10 damage (scaling with level) in a 15-foot cone or 30-foot line, depending on ancestry. Choose a dragon type to determine your damage type and resistance.',
    speed: 30,
    abilityScore: {},
    traits: ['Draconic Ancestry', 'Breath Weapon', 'Damage Resistance', 'Darkvision'],
    languages: ['Common', 'Draconic'],
    languagesExtra: 0,
    resistances: [],
    immunities: [],
    vulnerabilities: [],
    weaknesses: [],
    subraces: [
      { name: 'Black (Acid)', description: 'Breath weapon: 30 ft. line of acid (Dex save). Resistant to acid damage. Damage: 1d10, scaling at 5th, 11th, and 17th level.', abilityScore: {}, traits: ['Breath Weapon (Acid, 30 ft. line, Dex save)', 'Acid Resistance'], resistances: ['Acid'], languages: [], languagesExtra: 0 },
      { name: 'Blue (Lightning)', description: 'Breath weapon: 30 ft. line of lightning (Dex save). Resistant to lightning damage. Damage: 1d10, scaling at 5th, 11th, and 17th level.', abilityScore: {}, traits: ['Breath Weapon (Lightning, 30 ft. line, Dex save)', 'Lightning Resistance'], resistances: ['Lightning'], languages: [], languagesExtra: 0 },
      { name: 'Green (Poison)', description: 'Breath weapon: 15 ft. cone of poison (Con save). Resistant to poison damage. Damage: 1d10, scaling at 5th, 11th, and 17th level.', abilityScore: {}, traits: ['Breath Weapon (Poison, 15 ft. cone, Con save)', 'Poison Resistance'], resistances: ['Poison'], languages: [], languagesExtra: 0 },
      { name: 'Red (Fire)', description: 'Breath weapon: 15 ft. cone of fire (Dex save). Resistant to fire damage. Damage: 1d10, scaling at 5th, 11th, and 17th level. The most iconic dragonborn choice.', abilityScore: {}, traits: ['Breath Weapon (Fire, 15 ft. cone, Dex save)', 'Fire Resistance'], resistances: ['Fire'], languages: [], languagesExtra: 0 },
      { name: 'White (Cold)', description: 'Breath weapon: 15 ft. cone of cold (Con save). Resistant to cold damage. Damage: 1d10, scaling at 5th, 11th, and 17th level.', abilityScore: {}, traits: ['Breath Weapon (Cold, 15 ft. cone, Con save)', 'Cold Resistance'], resistances: ['Cold'], languages: [], languagesExtra: 0 },
      { name: 'Brass (Fire)', description: 'Breath weapon: 30 ft. line of fire (Dex save). Resistant to fire damage. Damage: 1d10, scaling at 5th, 11th, and 17th level.', abilityScore: {}, traits: ['Breath Weapon (Fire, 30 ft. line, Dex save)', 'Fire Resistance'], resistances: ['Fire'], languages: [], languagesExtra: 0 },
      { name: 'Bronze (Lightning)', description: 'Breath weapon: 30 ft. line of lightning (Dex save). Resistant to lightning damage. Damage: 1d10, scaling at 5th, 11th, and 17th level.', abilityScore: {}, traits: ['Breath Weapon (Lightning, 30 ft. line, Dex save)', 'Lightning Resistance'], resistances: ['Lightning'], languages: [], languagesExtra: 0 },
      { name: 'Copper (Acid)', description: 'Breath weapon: 30 ft. line of acid (Dex save). Resistant to acid damage. Damage: 1d10, scaling at 5th, 11th, and 17th level.', abilityScore: {}, traits: ['Breath Weapon (Acid, 30 ft. line, Dex save)', 'Acid Resistance'], resistances: ['Acid'], languages: [], languagesExtra: 0 },
      { name: 'Gold (Fire)', description: 'Breath weapon: 15 ft. cone of fire (Dex save). Resistant to fire damage. Damage: 1d10, scaling at 5th, 11th, and 17th level.', abilityScore: {}, traits: ['Breath Weapon (Fire, 15 ft. cone, Dex save)', 'Fire Resistance'], resistances: ['Fire'], languages: [], languagesExtra: 0 },
      { name: 'Silver (Cold)', description: 'Breath weapon: 15 ft. cone of cold (Con save). Resistant to cold damage. Damage: 1d10, scaling at 5th, 11th, and 17th level.', abilityScore: {}, traits: ['Breath Weapon (Cold, 15 ft. cone, Con save)', 'Cold Resistance'], resistances: ['Cold'], languages: [], languagesExtra: 0 }
    ],
    edition: '5.5e',
    source: '2024 PHB'
  },
  {
    id: 'orc-2024',
    name: 'Orc',
    description: 'Powerful and resilient, orcs are a proud people who value strength and perseverance. The 2024 version replaces Aggressive with Adrenaline Rush — a bonus action dash that also grants temporary hit points equal to your proficiency bonus. Combined with Relentless Endurance and Powerful Build, orcs are outstanding front-line combatants.',
    speed: 30,
    abilityScore: {},
    traits: ['Darkvision', 'Adrenaline Rush', 'Powerful Build', 'Relentless Endurance'],
    languages: ['Common', 'Orc'],
    languagesExtra: 0,
    resistances: [],
    immunities: [],
    vulnerabilities: [],
    weaknesses: [],
    subraces: [],
    edition: '5.5e',
    source: '2024 PHB'
  },
  {
    id: 'tiefling-2024',
    name: 'Tiefling',
    description: 'Tieflings bear the mark of a fiendish heritage — horns, a tail, and eyes of solid color. In the 2024 rules, you choose a Fiendish Legacy that shapes your innate spellcasting: Abyssal (poison and fear magic), Chthonic (necrotic and death-themed spells), or Infernal (fire and charm magic). Otherworldly Presence grants a free cantrip.',
    speed: 30,
    abilityScore: {},
    traits: ['Darkvision', 'Fiendish Legacy', 'Otherworldly Presence'],
    languages: ['Common', 'Infernal'],
    languagesExtra: 0,
    resistances: [],
    immunities: [],
    vulnerabilities: [],
    weaknesses: [],
    subraces: [
      {
        name: 'Abyssal',
        description: 'Tied to the chaotic evil of the Abyss. You gain resistance to poison damage and learn poison-themed spells as you level: poison spray cantrip, ray of sickness at 3rd level, and hold person at 5th level.',
        abilityScore: {},
        traits: ['Abyssal Spellcasting', 'Poison Resistance'],
        resistances: ['Poison'],
        languages: [],
        languagesExtra: 0
      },
      {
        name: 'Chthonic',
        description: 'Connected to the underworld and the realm of the dead. You gain resistance to necrotic damage and learn death-themed spells as you level: chill touch cantrip, false life at 3rd level, and ray of enfeeblement at 5th level.',
        abilityScore: {},
        traits: ['Chthonic Spellcasting', 'Necrotic Resistance'],
        resistances: ['Necrotic'],
        languages: [],
        languagesExtra: 0
      },
      {
        name: 'Infernal',
        description: 'Heir to the ordered evil of the Nine Hells. You gain resistance to fire damage and learn fire and charm magic: thaumaturgy cantrip, hellish rebuke at 3rd level, and darkness at 5th level. The classic tiefling experience.',
        abilityScore: {},
        traits: ['Infernal Spellcasting', 'Fire Resistance'],
        resistances: ['Fire'],
        languages: [],
        languagesExtra: 0
      }
    ],
    edition: '5.5e',
    source: '2024 PHB'
  },
  {
    id: 'goliath-2024',
    name: 'Goliath',
    description: 'Mountain-born giants who thrive in the harshest environments, goliaths stand 7 to 8 feet tall and prize self-reliance. Their 35-foot walking speed keeps them mobile, and Stone\'s Endurance (now usable a number of times equal to your proficiency bonus per long rest) lets them shrug off punishment. At higher levels they can temporarily become Large via Large Form.',
    speed: 35,
    abilityScore: {},
    traits: ['Large Form', 'Powerful Build', "Stone's Endurance"],
    languages: ['Common', 'Giant'],
    languagesExtra: 0,
    resistances: [],
    immunities: [],
    vulnerabilities: [],
    weaknesses: [],
    subraces: [],
    edition: '5.5e',
    source: '2024 PHB'
  },
  {
    id: 'aasimar-2024',
    name: 'Aasimar',
    description: 'Aasimar carry a spark of celestial power that manifests as luminous features and divine abilities. They resist necrotic and radiant damage, can heal with a touch (Healing Hands), and know the light cantrip (Light Bearer). At 3rd level, Celestial Revelation lets you choose one of three transformations each time you use it: Heavenly Wings for flight, Inner Radiance for an aura of damage, or Necrotic Shroud to frighten enemies.',
    speed: 30,
    abilityScore: {},
    traits: ['Celestial Resistance', 'Darkvision', 'Healing Hands', 'Light Bearer', 'Celestial Revelation'],
    languages: ['Common', 'Celestial'],
    languagesExtra: 0,
    resistances: ['Necrotic', 'Radiant'],
    immunities: [],
    vulnerabilities: [],
    weaknesses: [],
    subraces: [],
    edition: '5.5e',
    source: '2024 PHB'
  }
];

// ========== 2024 CLASSES ==========
const CLASSES_2024 = [
  {
    id: 'barbarian-2024',
    name: 'Barbarian',
    description: 'A primal warrior who channels raw fury into devastating attacks. Barbarians thrive on the front line, soaking up damage with the highest hit die in the game and unleashing Reckless Attacks. The 2024 version adds Weapon Mastery options and streamlined rage mechanics for even more satisfying melee combat.',
    hitDie: 12,
    primaryAbility: ['Strength'],
    savingThrows: ['Strength', 'Constitution'],
    subclasses: [
      { name: 'Path of the Berserker', level: 3, description: 'Frenzy fuels your rage with an extra attack each turn. The 2024 version removes the exhaustion penalty, making this a powerful and straightforward damage dealer.' },
      { name: 'Path of the Wild Heart', level: 3, description: 'Replaces Totem Warrior. You forge a spiritual bond with wild beasts, gaining animal-themed abilities like Bear (resistance to all damage while raging), Eagle (flight at high levels), or Wolf (pack tactics for allies).' },
      { name: 'Path of the World Tree', level: 3, description: 'A cosmic barbarian connected to the World Tree (Yggdrasil). You can teleport allies with your rage, create barriers of magical energy, and eventually open portals across planes.' },
      { name: 'Path of the Zealot', level: 3, description: 'A divinely inspired warrior who fights with fanatical fervor. You deal extra radiant or necrotic damage while raging, can be raised from the dead for free, and become nearly impossible to kill at high levels.' }
    ],
    edition: '5.5e',
    source: '2024 PHB'
  },
  {
    id: 'bard-2024',
    name: 'Bard',
    description: 'A charismatic performer whose magic springs from music, oration, or artistic expression. Bards are the ultimate support class, wielding Bardic Inspiration to bolster allies while casting a broad spell list. The 2024 version adds Weapon Mastery and refines how Magical Secrets works for maximum versatility.',
    hitDie: 8,
    primaryAbility: ['Charisma'],
    savingThrows: ['Dexterity', 'Charisma'],
    subclasses: [
      { name: 'College of Dance', level: 3, description: 'A brand-new subclass that blends graceful movement with combat. Your Bardic Inspiration fuels dazzling footwork, granting you bonus AC, extra movement, and the ability to weave through enemies untouched.' },
      { name: 'College of Glamour', level: 3, description: 'Channel fey magic through your performances to bewitch and inspire. You can grant temporary HP and free movement to allies, and your presence becomes magically commanding at higher levels.' },
      { name: 'College of Lore', level: 3, description: 'The quintessential knowledge bard. You gain extra skill proficiencies, Cutting Words (use Inspiration to reduce enemy rolls), and early access to spells from any class list via Magical Secrets.' },
      { name: 'College of Valor', level: 3, description: 'A battle-hardened bard who inspires courage on the front line. You gain medium armor, shields, martial weapons, Combat Inspiration (allies add your die to damage or AC), and Extra Attack.' }
    ],
    edition: '5.5e',
    source: '2024 PHB'
  },
  {
    id: 'cleric-2024',
    name: 'Cleric',
    description: 'A divine champion who wields the power of their deity to heal allies, smite undead, and shape the battlefield with potent spells. Clerics are the premier healers and can also hold their own in melee depending on their domain. In 2024, subclasses are chosen at level 3 instead of level 1.',
    hitDie: 8,
    primaryAbility: ['Wisdom'],
    savingThrows: ['Wisdom', 'Charisma'],
    subclasses: [
      { name: 'Life Domain', level: 3, description: 'The gold standard of healing. Your cure spells are supercharged by Disciple of Life, you gain heavy armor proficiency, and your Channel Divinity can mass-heal allies. No party with a Life Cleric should ever run out of HP.' },
      { name: 'Light Domain', level: 3, description: 'A radiant blaster who wields fire and light. Warding Flare lets you impose disadvantage on attacks against you, and Radiance of the Dawn is a powerful area burst. Plays like a divine sorcerer.' },
      { name: 'Trickery Domain', level: 3, description: 'A stealthy, deceptive cleric with access to illusion and enchantment spells. Invoke Duplicity creates a perfect illusory double, and Blessing of the Trickster grants advantage on Stealth to an ally.' },
      { name: 'War Domain', level: 3, description: 'A martial cleric built for combat. You gain heavy armor, martial weapons, bonus attacks via War Priest, and Channel Divinity: Guided Strike (+10 to an attack roll). Devastating with a warhammer in hand.' }
    ],
    edition: '5.5e',
    source: '2024 PHB'
  },
  {
    id: 'druid-2024',
    name: 'Druid',
    description: 'A guardian of the natural world who draws on the magic of the land, sea, and sky. Druids command a versatile spell list of healing, control, and elemental damage, and many can transform into beasts with Wild Shape. The 2024 revision streamlines Wild Shape and gives every druid a stronger spellcasting identity.',
    hitDie: 8,
    primaryAbility: ['Wisdom'],
    savingThrows: ['Intelligence', 'Wisdom'],
    subclasses: [
      { name: 'Circle of the Land', level: 3, description: 'A spellcasting-focused druid who draws power from a chosen biome. You recover spell slots on a short rest (Natural Recovery), gain bonus spells tied to your terrain, and eventually become immune to natural hazards.' },
      { name: 'Circle of the Moon', level: 3, description: 'The ultimate shapeshifter. You can Wild Shape into more powerful beasts, use Wild Shape as a bonus action in combat, and eventually transform into elementals. A tough, front-line druid.' },
      { name: 'Circle of the Sea', level: 3, description: 'A new subclass drawing on oceanic and storm magic. You command water, lightning, and thunder, gaining abilities to push and pull enemies, summon crashing waves, and thrive in aquatic environments.' },
      { name: 'Circle of the Stars', level: 3, description: 'A cosmic druid who reads the stars for guidance. Your Starry Form grants one of three constellations — Archer (bonus radiant damage), Chalice (bonus healing), or Dragon (better concentration) — and your Star Map gives free castings of guiding bolt.' }
    ],
    edition: '5.5e',
    source: '2024 PHB'
  },
  {
    id: 'fighter-2024',
    name: 'Fighter',
    description: 'The quintessential martial combatant, mastering every weapon and armor in existence. Fighters get more Ability Score Improvements and Extra Attacks than any other class, making them endlessly customizable. The 2024 version leans into the new Weapon Mastery system, letting fighters swap mastery properties on the fly.',
    hitDie: 10,
    primaryAbility: ['Strength', 'Dexterity'],
    savingThrows: ['Strength', 'Constitution'],
    subclasses: [
      { name: 'Battle Master', level: 3, description: 'A tactical genius who uses superiority dice to fuel powerful combat maneuvers like Trip Attack, Riposte, and Precision Attack. The most versatile fighter subclass, rewarding creative play and battlefield control.' },
      { name: 'Champion', level: 3, description: 'Simple but devastating. Your critical hit range expands (19-20 at level 3, 18-20 later), you gain a bonus Fighting Style, and Remarkable Athlete makes you great at physical challenges. The easiest fighter to play and still effective.' },
      { name: 'Eldritch Knight', level: 3, description: 'A fighter-mage hybrid who casts wizard spells while wearing heavy armor. You bond weapons to your hand, mix cantrips with weapon attacks via War Magic, and eventually steal spells from enemy casters.' },
      { name: 'Psi Warrior', level: 3, description: 'A psychic fighter who uses psionic energy dice to fuel telekinetic abilities. You can deflect attacks with Psionic Shield, move objects with your mind, and at high levels fly and create protective force fields.' }
    ],
    edition: '5.5e',
    source: '2024 PHB'
  },
  {
    id: 'monk-2024',
    name: 'Monk',
    description: 'A martial artist who channels internal energy (ki, now called Focus Points) into supernatural feats of agility and power. Monks are fast, mobile, and deadly in melee without armor or weapons. The 2024 revision renames ki to Focus Points, improves Martial Arts damage, and makes Stunning Strike more reliable.',
    hitDie: 8,
    primaryAbility: ['Dexterity', 'Wisdom'],
    savingThrows: ['Strength', 'Dexterity'],
    subclasses: [
      { name: 'Warrior of Mercy', level: 3, description: 'A monk who blends martial arts with healing and necrotic techniques. Hand of Healing lets you spend Focus Points to cure allies, while Hand of Harm adds necrotic damage and can inflict the poisoned condition.' },
      { name: 'Warrior of Shadow', level: 3, description: 'A stealth-focused monk who commands darkness and shadow. You can cast darkness, darkvision, pass without trace, and silence using Focus Points, and Shadow Step lets you teleport between dim light and darkness.' },
      { name: 'Warrior of the Elements', level: 3, description: 'Replaces Way of the Four Elements with a more streamlined elemental monk. You channel fire, water, earth, and air through your strikes, gaining elemental burst attacks and the ability to ride the elements at higher levels.' },
      { name: 'Warrior of the Open Hand', level: 3, description: 'The classic unarmed combat master. Open Hand Technique lets you knock enemies prone, push them away, or prevent reactions when you hit. Wholeness of Body heals you, and Quivering Palm is one of the most feared abilities in the game.' }
    ],
    edition: '5.5e',
    source: '2024 PHB'
  },
  {
    id: 'paladin-2024',
    name: 'Paladin',
    description: 'A holy warrior who swears a sacred oath, blending martial prowess with divine spellcasting. Paladins anchor any party with powerful auras, healing, and the devastating Divine Smite. The 2024 version makes Divine Smite a spell that you cast on a hit, and Weapon Mastery opens up more tactical options.',
    hitDie: 10,
    primaryAbility: ['Strength', 'Charisma'],
    savingThrows: ['Wisdom', 'Charisma'],
    subclasses: [
      { name: 'Oath of Devotion', level: 3, description: 'The archetypal knight in shining armor. Sacred Weapon enchants your blade with your Charisma modifier, Turn the Unholy repels fiends and undead, and Aura of Devotion makes you and nearby allies immune to charm.' },
      { name: 'Oath of Glory', level: 3, description: 'A champion of athletic and heroic excellence. Peerless Athlete boosts your physical checks, Inspiring Smite grants temporary HP to allies after you smite, and your aura increases allies\' movement speed.' },
      { name: 'Oath of the Ancients', level: 3, description: 'A nature-themed paladin sworn to protect the light against darkness. Nature\'s Wrath ensnares foes in vines, Turn the Faithless repels fey and fiends, and Aura of Warding gives resistance to spell damage. A fey-knight fantasy.' },
      { name: 'Oath of Vengeance', level: 3, description: 'A relentless hunter who pursues the wicked. Vow of Enmity gives you advantage against a single foe, Abjure Enemy freezes targets with fear, and Relentless Avenger lets you chase down fleeing enemies. The single-target damage king.' }
    ],
    edition: '5.5e',
    source: '2024 PHB'
  },
  {
    id: 'ranger-2024',
    name: 'Ranger',
    description: 'A skilled hunter and tracker who blends martial combat with nature magic. The 2024 ranger is significantly improved — Favored Enemy and Natural Explorer are replaced by more impactful features, spellcasting is stronger, and the class feels rewarding from level 1. Weapon Mastery makes rangers deadly with bows and dual weapons alike.',
    hitDie: 10,
    primaryAbility: ['Dexterity', 'Wisdom'],
    savingThrows: ['Strength', 'Dexterity'],
    subclasses: [
      { name: 'Beast Master', level: 3, description: 'You forge a bond with a primal beast companion that fights alongside you. The 2024 version gives your beast its own stat block that scales with your proficiency bonus, making it viable at all levels. Command your beast as a bonus action.' },
      { name: 'Fey Wanderer', level: 3, description: 'A ranger touched by the Feywild who blends fey charm with martial skill. You add Wisdom to Charisma checks, deal bonus psychic damage, and can spread the frightened condition. Excellent for social and combat encounters alike.' },
      { name: 'Gloom Stalker', level: 3, description: 'A shadow hunter who thrives in darkness. Dread Ambusher grants an extra attack and bonus damage on the first turn of combat, Umbral Sight makes you invisible to creatures relying on darkvision, and your initiative is boosted by Wisdom. A devastating ambush predator.' },
      { name: 'Hunter', level: 3, description: 'A versatile ranger focused on taking down dangerous prey. Choose from options like Colossus Slayer (bonus damage to wounded foes), Giant Killer (react to large creatures), or Horde Breaker (attack two adjacent enemies). The most customizable ranger subclass.' }
    ],
    edition: '5.5e',
    source: '2024 PHB'
  },
  {
    id: 'rogue-2024',
    name: 'Rogue',
    description: 'A cunning specialist who relies on skill, stealth, and precision strikes. Rogues deal massive damage with Sneak Attack and have unmatched skill versatility through Expertise and Cunning Action. The 2024 version gives rogues Weapon Mastery for martial finesse and a refined Cunning Strike system that trades Sneak Attack dice for debuffs.',
    hitDie: 8,
    primaryAbility: ['Dexterity'],
    savingThrows: ['Dexterity', 'Intelligence'],
    subclasses: [
      { name: 'Arcane Trickster', level: 3, description: 'A rogue who supplements stealth with wizard spells, primarily illusion and enchantment. Mage Hand Legerdemain lets your invisible mage hand pick pockets, and Magical Ambush imposes disadvantage on saves when you attack from hiding.' },
      { name: 'Assassin', level: 3, description: 'A master of infiltration and instant kills. Assassinate grants advantage and automatic critical hits against surprised foes. You gain proficiency with disguise kits and poisoner\'s kits, and higher-level abilities let you impersonate others flawlessly.' },
      { name: 'Soulknife', level: 3, description: 'A psionic rogue who manifests blades of psychic energy. Your Psi-Bolstered Knack adds a die to failed skill checks, Psychic Whispers lets you communicate telepathically, and your soul blades bypass resistance and never leave your hands.' },
      { name: 'Thief', level: 3, description: 'The quintessential burglar and treasure hunter. Fast Hands lets you use objects, pick locks, and disarm traps as a bonus action. Second-Story Work gives you climbing speed and longer jumps. At higher levels you can use any magic item regardless of class restrictions.' }
    ],
    edition: '5.5e',
    source: '2024 PHB'
  },
  {
    id: 'sorcerer-2024',
    name: 'Sorcerer',
    description: 'A spellcaster whose magic is innate, flowing from a supernatural gift, cosmic event, or magical bloodline. Sorcerers shape their spells on the fly with Metamagic, adding range, duration, or power that no other caster can match. The 2024 version expands sorcery point recovery and gives sorcerers a stronger identity separate from wizards.',
    hitDie: 6,
    primaryAbility: ['Charisma'],
    savingThrows: ['Constitution', 'Charisma'],
    subclasses: [
      { name: 'Aberrant Sorcery', level: 3, description: 'Your magic springs from an alien influence — a Far Realm entity, aberrant parasite, or psionic awakening. You gain telepathy, psionic spells, and the ability to warp reality around you. At high levels, your body transforms and you can unleash psychic devastation.' },
      { name: 'Clockwork Sorcery', level: 3, description: 'Your power flows from the plane of Mechanus or a force of cosmic order. You can cancel advantage and disadvantage, gain bonus spells focused on protection and restoration, and at high levels create a zone of perfect order that shuts down chaos.' },
      { name: 'Draconic Sorcery', level: 3, description: 'Dragon blood runs through your veins, granting you tougher skin (bonus HP and natural AC), elemental affinity (bonus damage matching your draconic ancestor), and eventually the ability to sprout dragon wings and project a draconic aura.' },
      { name: 'Wild Magic Sorcery', level: 3, description: 'Your magic is volatile and unpredictable. Wild Magic Surges can trigger random effects from a table of 50+ possibilities, Tides of Chaos gives you advantage on a roll in exchange for increased chaos, and Bend Luck lets you nudge ally and enemy rolls alike.' }
    ],
    edition: '5.5e',
    source: '2024 PHB'
  },
  {
    id: 'warlock-2024',
    name: 'Warlock',
    description: 'A seeker of forbidden knowledge who forges a pact with a powerful otherworldly entity. Warlocks cast fewer spells but recover them on a short rest, and Eldritch Invocations let you customize your abilities in unique ways. The 2024 version makes Pact Magic scale better and adds new invocation choices for more build variety.',
    hitDie: 8,
    primaryAbility: ['Charisma'],
    savingThrows: ['Wisdom', 'Charisma'],
    subclasses: [
      { name: 'Archfey Patron', level: 3, description: 'Your patron is a lord or lady of the Feywild — beings of ancient magic and capricious whims. Fey Presence charms or frightens nearby creatures, Misty Escape lets you turn invisible and teleport when hurt, and Beguiling Defenses turn charm attempts back on the caster.' },
      { name: 'Celestial Patron', level: 3, description: 'Your patron is a powerful celestial being like a solar, ki-rin, or unicorn. Healing Light lets you heal allies with bonus action dice, you gain bonus radiant and fire spells, and at higher levels you gain temporary HP and radiant resilience.' },
      { name: 'Fiend Patron', level: 3, description: 'Your patron is a demon lord, archdevil, or other fiendish power. Dark One\'s Blessing grants temporary HP whenever you reduce a creature to 0, and your expanded spell list is packed with fire and destruction. The classic "deal with the devil" warlock.' },
      { name: 'Great Old One Patron', level: 3, description: 'Your patron is an incomprehensible entity from beyond the stars — Cthulhu, Dendar, or Tharizdun. Awakened Mind grants telepathy, Entropic Ward lets you deflect attacks and gain advantage, and Thought Shield protects your mind from intrusion.' }
    ],
    edition: '5.5e',
    source: '2024 PHB'
  },
  {
    id: 'wizard-2024',
    name: 'Wizard',
    description: 'A scholarly spellcaster who studies the underlying fabric of magic itself. Wizards have the largest spell list in the game and can prepare different spells each day from their spellbook, making them the most adaptable caster. The 2024 version refines Arcane Recovery, introduces Modify Spell, and streamlines the school subclasses.',
    hitDie: 6,
    primaryAbility: ['Intelligence'],
    savingThrows: ['Intelligence', 'Wisdom'],
    subclasses: [
      { name: 'Abjurer', level: 3, description: 'A specialist in protective magic. Your Arcane Ward absorbs damage for you, growing stronger each time you cast an abjuration spell. Projected Ward lets you protect allies too, and Spell Resistance gives you advantage on saves against spells.' },
      { name: 'Diviner', level: 3, description: 'A seer who glimpses the future and bends fate. Portent lets you replace any d20 roll (yours or an enemy\'s) with pre-rolled dice each morning — one of the most powerful abilities in the game. Expert Divination recovers spell slots, and The Third Eye grants special sight.' },
      { name: 'Evoker', level: 3, description: 'A blaster mage who specializes in raw elemental power. Sculpt Spells lets you protect allies from your fireballs, Empowered Evocation adds your Intelligence to damage, and Overchannel lets you maximize spell damage at the cost of self-harm.' },
      { name: 'Illusionist', level: 3, description: 'A trickster who makes the unreal seem real. Improved Minor Illusion adds sound and image to your cantrip, Malleable Illusions lets you reshape active spells, and Illusory Reality makes one illusory object temporarily solid and real.' }
    ],
    edition: '5.5e',
    source: '2024 PHB'
  }
];

// ========== 2024 BACKGROUNDS ==========
const BACKGROUNDS_2024 = [
  {
    name: 'Acolyte',
    skillProficiencies: ['Insight', 'Religion'],
    description: 'You spent your formative years in a temple, learning rites, prayers, and the tenets of your faith. Your devotion earns you shelter and support among the faithful.',
    abilityScoreOptions: { default: { wisdom: 2, intelligence: 1 }, alternative: '+1/+1/+1 to three different' },
    feat: 'Magic Initiate (Cleric)',
    edition: '5.5e',
    source: '2024 PHB'
  },
  {
    name: 'Artisan',
    skillProficiencies: ['Investigation', 'Persuasion'],
    description: 'You trained under a master craftsperson, learning a trade that blends practical skill with creative problem-solving. You know how to appraise materials and haggle for fair prices.',
    abilityScoreOptions: { default: { intelligence: 2, charisma: 1 }, alternative: '+1/+1/+1 to three different' },
    feat: 'Crafter',
    edition: '5.5e',
    source: '2024 PHB'
  },
  {
    name: 'Charlatan',
    skillProficiencies: ['Deception', 'Sleight of Hand'],
    description: 'You have always had a talent for reading people and telling them exactly what they want to hear. Whether running cons, forging documents, or assuming false identities, deception is your art.',
    abilityScoreOptions: { default: { charisma: 2, dexterity: 1 }, alternative: '+1/+1/+1 to three different' },
    feat: 'Skilled',
    edition: '5.5e',
    source: '2024 PHB'
  },
  {
    name: 'Criminal',
    skillProficiencies: ['Sleight of Hand', 'Stealth'],
    description: 'You have a history of breaking the law, whether as a burglar, smuggler, or hired thug. You know how to case a target, pick a lock, and disappear before the watch arrives.',
    abilityScoreOptions: { default: { dexterity: 2, intelligence: 1 }, alternative: '+1/+1/+1 to three different' },
    feat: 'Alert',
    edition: '5.5e',
    source: '2024 PHB'
  },
  {
    name: 'Entertainer',
    skillProficiencies: ['Acrobatics', 'Performance'],
    description: 'You thrive in front of an audience, whether on a stage, in a tavern, or around a campfire. Music, storytelling, juggling, or acting — your art brings people together and earns their coin.',
    abilityScoreOptions: { default: { charisma: 2, dexterity: 1 }, alternative: '+1/+1/+1 to three different' },
    feat: 'Musician',
    edition: '5.5e',
    source: '2024 PHB'
  },
  {
    name: 'Farmer',
    skillProficiencies: ['Animal Handling', 'Nature'],
    description: 'You worked the land, tending crops and livestock through harsh seasons. This life built your endurance and taught you to read weather, soil, and the moods of beasts.',
    abilityScoreOptions: { default: { constitution: 2, wisdom: 1 }, alternative: '+1/+1/+1 to three different' },
    feat: 'Tough',
    edition: '5.5e',
    source: '2024 PHB'
  },
  {
    name: 'Guard',
    skillProficiencies: ['Athletics', 'Perception'],
    description: 'You served as a guard — at a city gate, a noble estate, a caravan, or a dungeon. You learned to stay alert during long watches and to handle trouble when it found you.',
    abilityScoreOptions: { default: { strength: 2, wisdom: 1 }, alternative: '+1/+1/+1 to three different' },
    feat: 'Alert',
    edition: '5.5e',
    source: '2024 PHB'
  },
  {
    name: 'Guide',
    skillProficiencies: ['Stealth', 'Survival'],
    description: 'You led travelers through dangerous wilderness, navigating by stars, tracks, and instinct. You know how to find food, water, and shelter where others see only hostile terrain.',
    abilityScoreOptions: { default: { wisdom: 2, dexterity: 1 }, alternative: '+1/+1/+1 to three different' },
    feat: 'Magic Initiate (Druid)',
    edition: '5.5e',
    source: '2024 PHB'
  },
  {
    name: 'Hermit',
    skillProficiencies: ['Medicine', 'Religion'],
    description: 'You lived in seclusion — in a monastery, a forest cave, or a remote shrine — for an extended period. In your isolation you found contemplation, healing knowledge, and perhaps a profound revelation.',
    abilityScoreOptions: { default: { wisdom: 2, constitution: 1 }, alternative: '+1/+1/+1 to three different' },
    feat: 'Healer',
    edition: '5.5e',
    source: '2024 PHB'
  },
  {
    name: 'Merchant',
    skillProficiencies: ['Animal Handling', 'Persuasion'],
    description: 'You bought and sold goods along trade routes, learning to negotiate, appraise wares, and manage pack animals. You have an eye for value and know how to turn a profit anywhere.',
    abilityScoreOptions: { default: { charisma: 2, intelligence: 1 }, alternative: '+1/+1/+1 to three different' },
    feat: 'Lucky',
    edition: '5.5e',
    source: '2024 PHB'
  },
  {
    name: 'Noble',
    skillProficiencies: ['History', 'Persuasion'],
    description: 'You were raised in privilege, with wealth, title, and the expectation of leadership. You understand the games of power and influence, and doors open at the mention of your family name.',
    abilityScoreOptions: { default: { charisma: 2, intelligence: 1 }, alternative: '+1/+1/+1 to three different' },
    feat: 'Skilled',
    edition: '5.5e',
    source: '2024 PHB'
  },
  {
    name: 'Sage',
    skillProficiencies: ['Arcana', 'History'],
    description: 'You spent years studying in libraries and scriptoriums, absorbing the lore of the multiverse. When you don\'t know the answer, you know exactly where to find it.',
    abilityScoreOptions: { default: { intelligence: 2, wisdom: 1 }, alternative: '+1/+1/+1 to three different' },
    feat: 'Magic Initiate (Wizard)',
    edition: '5.5e',
    source: '2024 PHB'
  },
  {
    name: 'Sailor',
    skillProficiencies: ['Acrobatics', 'Perception'],
    description: 'You sailed the seas for years, learning the ropes (literally), navigating by the stars, and surviving storms. You can handle a vessel, tie any knot, and hold your own in a dockside brawl.',
    abilityScoreOptions: { default: { dexterity: 2, wisdom: 1 }, alternative: '+1/+1/+1 to three different' },
    feat: 'Tavern Brawler',
    edition: '5.5e',
    source: '2024 PHB'
  },
  {
    name: 'Scribe',
    skillProficiencies: ['Investigation', 'Perception'],
    description: 'You copied manuscripts, recorded legal proceedings, or cataloged arcane texts. Your sharp eyes catch details others miss, and your meticulous nature serves you well in any investigation.',
    abilityScoreOptions: { default: { intelligence: 2, wisdom: 1 }, alternative: '+1/+1/+1 to three different' },
    feat: 'Skilled',
    edition: '5.5e',
    source: '2024 PHB'
  },
  {
    name: 'Soldier',
    skillProficiencies: ['Athletics', 'Intimidation'],
    description: 'You served in a military force — a standing army, a militia, or a mercenary company. You understand rank, discipline, and the harsh realities of combat. War has shaped who you are.',
    abilityScoreOptions: { default: { strength: 2, constitution: 1 }, alternative: '+1/+1/+1 to three different' },
    feat: 'Savage Attacker',
    edition: '5.5e',
    source: '2024 PHB'
  },
  {
    name: 'Wayfarer',
    skillProficiencies: ['Insight', 'Stealth'],
    description: 'You have spent your life on the move — drifting from town to town, living by your wits and your ability to read people. You know how to blend in, find a meal, and vanish when trouble brews.',
    abilityScoreOptions: { default: { wisdom: 2, dexterity: 1 }, alternative: '+1/+1/+1 to three different' },
    feat: 'Lucky',
    edition: '5.5e',
    source: '2024 PHB'
  }
];

// ========== 2024 FEATS ==========
// 2024-specific feats (add to FEATS when edition is 5.5e)
const FEATS_2024 = [
  { name: 'Crafter', prerequisite: '', description: 'Gain proficiency with 3 artisan\'s tools. Craft nonmagical items in half the time and half the cost.' },
  { name: 'Musician', prerequisite: '', description: 'Gain proficiency with 3 musical instruments. Inspire allies during short rest: they gain temp HP or clear one level of exhaustion.' },
  { name: 'Practiced Expert', prerequisite: '', description: 'Gain proficiency in one skill, one tool, and increase one ability by 1 (max 20).' },
  { name: 'Magic Initiate (Cleric)', prerequisite: '', description: 'Learn 2 cleric cantrips and 1 1st-level cleric spell. Cast the spell once per long rest. Wisdom is your spellcasting ability.' },
  { name: 'Magic Initiate (Druid)', prerequisite: '', description: 'Learn 2 druid cantrips and 1 1st-level druid spell. Cast the spell once per long rest. Wisdom is your spellcasting ability.' },
  { name: 'Magic Initiate (Wizard)', prerequisite: '', description: 'Learn 2 wizard cantrips and 1 1st-level wizard spell. Cast the spell once per long rest. Intelligence is your spellcasting ability.' }
];

// ========== 2024 PHB BOOK ENTRY ==========
const PHB_2024 = {
  id: 'phb2024',
  name: "Player's Handbook (2024)",
  edition: '5.5e',
  enabled: true,
  races: RACES_2024,
  classes: CLASSES_2024,
  backgrounds: BACKGROUNDS_2024,
  rules: '2024 revised rules: All subclasses at level 3. Backgrounds grant ability score increases and a feat. Species no longer grant ability score bonuses. Weapon Mastery system added.'
};
