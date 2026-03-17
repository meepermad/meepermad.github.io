/**
 * D&D 5e Items - Weapons, Armor, Adventuring Gear, etc.
 * Consolidated list for character equipment and inventory.
 * armorAC: base AC, type, Dex cap for AC calculation.
 */

// ========== ITEM DATA ==========
const ITEMS = {
  weapons: [
    'Club', 'Dagger', 'Greatclub', 'Handaxe', 'Javelin', 'Light hammer', 'Mace', 'Quarterstaff',
    'Sickle', 'Spear', 'Crossbow, light', 'Dart', 'Shortbow', 'Sling', 'Battleaxe', 'Flail',
    'Glaive', 'Greataxe', 'Greatsword', 'Halberd', 'Lance', 'Longsword', 'Maul', 'Morningstar',
    'Pike', 'Rapier', 'Scimitar', 'Shortsword', 'Trident', 'War pick', 'Warhammer', 'Whip',
    'Blowgun', 'Crossbow, hand', 'Crossbow, heavy', 'Longbow', 'Net'
  ],
  armor: [
    'Padded', 'Leather', 'Studded leather', 'Hide', 'Chain shirt', 'Scale mail', 'Breastplate',
    'Half plate', 'Ring mail', 'Chain mail', 'Splint', 'Plate', 'Shield'
  ],
  // D&D 5e armor AC: base AC, type (light/medium/heavy), Dex cap (null = full Dex)
  armorAC: {
    'Padded': { base: 11, type: 'light', dexCap: null },
    'Leather': { base: 11, type: 'light', dexCap: null },
    'Studded leather': { base: 12, type: 'light', dexCap: null },
    'Hide': { base: 12, type: 'medium', dexCap: 2 },
    'Chain shirt': { base: 13, type: 'medium', dexCap: 2 },
    'Scale mail': { base: 14, type: 'medium', dexCap: 2 },
    'Breastplate': { base: 14, type: 'medium', dexCap: 2 },
    'Half plate': { base: 15, type: 'medium', dexCap: 2 },
    'Ring mail': { base: 14, type: 'heavy', dexCap: 0 },
    'Chain mail': { base: 16, type: 'heavy', dexCap: 0 },
    'Splint': { base: 17, type: 'heavy', dexCap: 0 },
    'Plate': { base: 18, type: 'heavy', dexCap: 0 },
    'Shield': { bonus: 2 }
  },
  adventuringGear: [
    'Abacus', 'Acid (vial)', 'Alchemist\'s fire (flask)', 'Antitoxin (vial)', 'Backpack',
    'Ball bearings (bag of 1000)', 'Block and tackle', 'Book', 'Caltrops (bag of 20)',
    'Candle', 'Case, crossbow bolt', 'Case, map or scroll', 'Chain (10 feet)', 'Chalk (1 piece)',
    'Chest', 'Climber\'s kit', 'Clothes, common', 'Clothes, costume', 'Clothes, fine',
    'Clothes, traveler\'s', 'Component pouch', 'Crowbar', 'Fishing tackle', 'Flask or tankard',
    'Grappling hook', 'Hammer', 'Hammer, sledge', 'Healer\'s kit', 'Holy water (flask)',
    'Hourglass', 'Hunting trap', 'Ink (1 oz. bottle)', 'Ink pen', 'Jug or pitcher',
    'Ladder (10-foot)', 'Lamp', 'Lantern, bullseye', 'Lantern, hooded', 'Lock', 'Magnifying glass',
    'Manacles', 'Mess kit', 'Mirror, steel', 'Oil (flask)', 'Paper (one sheet)', 'Parchment (one sheet)',
    'Perfume (vial)', 'Pick, miner\'s', 'Piton', 'Poison, basic (vial)', 'Pole (10-foot)',
    'Pot, iron', 'Potion of healing', 'Pouch', 'Quiver', 'Ram, portable', 'Rations (1 day)',
    'Rope, hempen (50 feet)', 'Rope, silk (50 feet)', 'Sack', 'Scale, merchant\'s',
    'Seal', 'Shovel', 'Signal whistle', 'Signet ring', 'Soap', 'Spellbook', 'Spyglass',
    'Tent, two-person', 'Tinderbox', 'Torch', 'Vial', 'Waterskin', 'Whetstone'
  ],
  tools: [
    'Thieves\' tools', 'Disguise kit', 'Forgery kit', 'Herbalism kit', 'Navigator\'s tools',
    'Poisoner\'s kit', 'Gaming set (dice)', 'Gaming set (playing cards)', 'Gaming set (three-dragon ante)',
    'Musical instrument (bagpipes)', 'Musical instrument (drum)', 'Musical instrument (dulcimer)',
    'Musical instrument (flute)', 'Musical instrument (horn)', 'Musical instrument (lute)',
    'Musical instrument (lyre)', 'Musical instrument (pan flute)', 'Musical instrument (shawm)',
    'Musical instrument (viol)', 'Smith\'s tools', 'Tinker\'s tools', 'Woodworker\'s tools'
  ],
  focus: [
    'Spellcasting focus', 'Arcane focus', 'Crystal', 'Orb', 'Rod', 'Staff', 'Wand',
    'Druidic focus', 'Sprig of mistletoe', 'Totem', 'Wooden staff', 'Yew wand',
    'Holy symbol', 'Amulet', 'Emblem', 'Relic'
  ]
};

function getAllItems() {
  return [
    ...ITEMS.weapons,
    ...ITEMS.armor,
    ...ITEMS.adventuringGear,
    ...ITEMS.tools,
    ...ITEMS.focus
  ];
}
