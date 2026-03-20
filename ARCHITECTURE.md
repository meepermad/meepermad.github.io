# Architecture Overview

This project is a local-first static SPA organized around a few core domains.

## Runtime layers

- `js/app.js` coordinates application state, view switching, and event wiring.
- `js/app-renderers.js` owns safer DOM-first rendering for high-risk UI surfaces such as character cards, quick reference results, DM lists, and battle-map sidebars.
- `js/rules-engine.js` contains pure calculation helpers for level, proficiency, stat modifiers, and AC.
- `js/monsterpedia-engine.js` contains monster normalization, heuristics, filtering, sorting, and encounter budgeting.
- `js/battlemap-engine.js` contains token footprint logic, placement rules, BFS pathing, terrain cost, and ruler measurement.
- `js/storage.js` contains debounced persistence, snapshot handling, and corruption recovery helpers.
- `js/modal-a11y.js` contains modal focus trapping, Escape handling, and focus restoration.
- `js/schema.js` contains import sanitization and validation logic.
- `js/dom-utils.js` contains safe DOM helpers and select-population helpers.

## Design principles

1. Keep calculation-heavy logic in pure modules.
2. Keep rendering of user-controlled content DOM-first instead of string-first.
3. Keep local persistence resilient through snapshots and recovery.
4. Prefer explicit module boundaries over hidden cross-file mutation.
5. Keep the project dependency-light so it stays easy to run as a personal reference project.

## Next refactor targets

- Continue shrinking `js/app.js` by moving builder-step rendering into dedicated modules.
- Replace remaining `innerHTML` uses with DOM builders wherever practical.
- Add browser-level integration coverage when a dedicated test dependency is acceptable.
- Deepen monster data normalization for tactics, reactions, legendary actions, lair actions, and spellcasting blocks.
