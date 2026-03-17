# Content Guide: Adding Races, Classes, Monsters, Spells & More

This guide explains how to add and manage content in the D&D Character Builder—including supplemental books, homebrew, and custom content.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [File Structure](#file-structure)
3. [Adding a New Race](#adding-a-new-race)
4. [Adding a New Class or Subclass](#adding-a-new-class-or-subclass)
5. [Adding a New Background](#adding-a-new-background)
6. [Adding Monsters](#adding-monsters)
7. [Adding Spells](#adding-spells)
8. [Adding Weapons & Items](#adding-weapons--items)
9. [Adding a New Book](#adding-a-new-book)
10. [Data Structures Reference](#data-structures-reference)

---

## Quick Start

- **Core content** lives in `js/data.js` (races, classes, backgrounds)
- **Monsters** live in `js/monsters.js`
- **Spells** live in `js/spells.js`
- **Items & weapons** live in `js/items.js`
- **Additional books** are in the `ADDITIONAL_BOOKS` array in `js/data.js`

Enable books when creating a new character via the rule books modal, or in **Rules & Reference** → **Rule Books**.

---

## File Structure

```
DnD Website/
├── index.html
├── styles.css
├── CONTENT_GUIDE.md
├── js/
│   ├── data.js       ← Races, classes, backgrounds, ADDITIONAL_BOOKS, WEAPONS
│   ├── monsters.js   ← SRD_MONSTERS (DM panel)
│   ├── spells.js     ← SPELLS, spell slots, class spell lists
│   ├── items.js      ← ITEMS (weapons, armor, gear, tools)
│   └── app.js        ← App logic
```

---

## Adding a New Race

### Step 1: Choose location

- **Core races** (PHB/SRD): Add to the `RACES` array in `js/data.js`
- **Supplemental book**: Add to the book's `races` array in `ADDITIONAL_BOOKS`

### Step 2: Use the race structure

```javascript
{
  id: 'goliath',
  name: 'Goliath',
  description: 'Large humanoids from mountain regions.',
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
}
```

### Step 3: Ability score options

- Fixed: `{ strength: 2, constitution: 1 }`
- Flexible: `{ any: 1 }` (player chooses one ability)
- Mixed: `{ charisma: 2, any: 1 }`

### Step 4: Add subraces (optional)

```javascript
subraces: [
  {
    name: 'Protector',
    abilityScore: { charisma: 2, wisdom: 1 },
    traits: ['Radiant Soul'],
    languages: [],
    languagesExtra: 0
  }
]
```

---

## Adding a New Class or Subclass

### New class (e.g. Artificer)

Add to `CLASSES` in `data.js` or to a book's `classes` array:

```javascript
{
  id: 'artificer',
  name: 'Artificer',
  description: 'Masters of invention who use magic.',
  hitDie: 8,
  primaryAbility: ['Intelligence'],
  savingThrows: ['Constitution', 'Intelligence'],
  subclasses: [
    { name: 'Alchemist', level: 3, description: 'Create potions.' },
    { name: 'Armorer', level: 3, description: 'Magical armor.' }
  ]
}
```

**Also add** to `data.js`:
- `CLASS_PROFICIENCIES.Artificer`
- `CLASS_ACTIONS.Artificer`
- `CLASS_FEATURES_BY_LEVEL.Artificer`

**And** in `spells.js`:
- `SPELLS_KNOWN_BY_LEVEL.Artificer`
- `SPELLCASTING_CLASSES` (include 'Artificer')
- Add `Artificer` to the `classes` array of spells the class can cast

### Subclass only (merge into existing class)

In a book's `classes` array:

```javascript
{
  name: 'Wizard',  // Must match existing class exactly
  subclasses: [
    { name: 'School of Bladesinging', level: 2, description: '...' }
  ]
}
```

---

## Adding a New Background

```javascript
{
  name: 'Pirate',
  skillProficiencies: ['Athletics', 'Perception'],
  description: 'You sailed the high seas.'
}
```

Add to `BACKGROUNDS` in `data.js` or to a book's `backgrounds` array.

---

## Adding Monsters

### Step 1: Open `js/monsters.js`

### Step 2: Add to `SRD_MONSTERS` array

```javascript
{
  name: 'Goblin Boss',
  ac: 15,
  hp: '21 (6d6)',
  speed: '30 ft.',
  cr: 0.5,
  type: 'Humanoid',
  xp: 100,
  str: 10, dex: 14, con: 10, int: 10, wis: 8, cha: 8,
  skills: 'Stealth +6',
  senses: 'Darkvision 60 ft., Passive Perception 9',
  traits: 'Nimble Escape.',
  actions: 'Scimitar. Melee +4, 5 ft., 5 (1d6+2) slashing.'
}
```

### Step 3: Fields

| Field | Description |
|-------|-------------|
| `name` | Monster name |
| `ac` | Armor Class |
| `hp` | Hit points (e.g. `"22 (3d8+9)"`) |
| `speed` | Movement speed |
| `cr` | Challenge Rating (0.125, 0.25, 0.5, 1, 2, …) |
| `type` | Humanoid, Beast, Undead, etc. |
| `xp` | Experience points |
| `str`, `dex`, `con`, `int`, `wis`, `cha` | Ability scores |
| `saves` | Saving throw bonuses |
| `skills` | Skill bonuses |
| `senses` | Darkvision, passive Perception |
| `traits` | Special abilities |
| `actions` | Attack options |
| `vulnerabilities`, `immunities` | Damage modifiers |

Monsters appear in the DM panel and can be added to the battle map as tokens.

---

## Adding Spells

### Step 1: Open `js/spells.js`

### Step 2: Add to `SPELLS` array

```javascript
{
  name: 'Fireball',
  level: 3,
  school: 'Evocation',
  castTime: '1 action',
  range: '150 ft',
  components: 'V, S, M',
  duration: 'Instantaneous',
  description: '20-ft radius, 8d6 fire. Dex save for half.',
  classes: ['Sorcerer', 'Wizard']
}
```

### Step 3: Class lists

Add the class name to the `classes` array for each class that can cast the spell:
- `Bard`, `Cleric`, `Druid`, `Paladin`, `Ranger`, `Sorcerer`, `Warlock`, `Wizard`, `Artificer`

Level 0 = Cantrip.

---

## Adding Weapons & Items

### Weapons with stats

Add to `WEAPONS` in `data.js`:

```javascript
{
  name: 'Rapier',
  type: 'melee',
  damage: '1d8',
  damageType: 'Piercing',
  range: '5 ft',
  properties: 'Finesse'
}
```

### Simple item names

Add to `ITEMS.weapons`, `ITEMS.armor`, `ITEMS.adventuringGear`, or `ITEMS.tools` in `items.js`:

```javascript
weapons: ['Club', 'Dagger', 'Rapier', 'Your New Weapon', ...]
```

### Armor with AC

Add to `ITEMS.armorAC` in `items.js`:

```javascript
'Plate': { base: 18, type: 'heavy', dexCap: 0 }
```

---

## Adding a New Book

### Step 1: Find `ADDITIONAL_BOOKS` in `js/data.js`

### Step 2: Add a book object

```javascript
{
  id: 'my-book',
  name: "My Sourcebook",
  enabled: false,
  races: [],
  classes: [],
  backgrounds: [],
  rules: 'Optional rules summary.'
}
```

### Step 3: Add content

Populate `races`, `classes`, and `backgrounds` using the structures in this guide. Enable the book when creating a new character.

### Existing book placeholders

The app includes placeholders for:
- Tasha's Cauldron, Xanathar's Guide, Volo's, Mordenkainen's, Fizban's, Van Richten's
- Sword Coast Adventurer's Guide, Acquisitions Incorporated
- Mordenkainen Presents: Monsters of the Multiverse
- Guildmaster's Guide to Ravnica, Eberron, Wildemount, Theros, Strixhaven, Spelljammer

Add your content to these or create new book entries.

---

## Data Structures Reference

### Race

```javascript
{
  id: 'elf',
  name: 'Elf',
  description: '...',
  speed: 30,
  abilityScore: { dexterity: 2 },
  traits: ['Darkvision', 'Fey Ancestry', 'Trance'],
  languages: ['Common', 'Elvish'],
  languagesExtra: 0,
  resistances: [],
  immunities: [],
  vulnerabilities: [],
  weaknesses: [],
  subraces: [{ name: 'High Elf', abilityScore: {...}, traits: [...] }]
}
```

### Class

```javascript
{
  id: 'wizard',
  name: 'Wizard',
  description: '...',
  hitDie: 6,
  primaryAbility: ['Intelligence'],
  savingThrows: ['Intelligence', 'Wisdom'],
  subclasses: [{ name: 'School of Evocation', level: 2, description: '...' }]
}
```

### Background

```javascript
{
  name: 'Sage',
  skillProficiencies: ['Arcana', 'History'],
  description: '...'
}
```

---

## Tips

1. **Backup** — Copy `data.js` before major edits
2. **Test** — Refresh the app and run through the character builder
3. **Consistency** — Match existing structure and naming
4. **Duplicates** — Races/backgrounds with the same name are skipped; subclasses are merged into existing classes
5. **External reference** — Use [5e.tools](https://5e.tools/books.html) or official PDFs for full rules and content
