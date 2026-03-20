/**
 * app-state.js
 * Global application state: character list, current character, wizard step, DOM refs.
 * All app modules depend on these variables. Load early in app module order.
 *
 * @depends None (foundation for other app modules)
 */

// ========== CHARACTER STATE ==========

/** All saved characters (loaded from localStorage) */
let characters = [];

/** Character being edited in builder (reference into characters or new) */
let editingCharacter = null;

/** Character currently being built/edited in the wizard (in-memory object) */
let currentChar = null;

/** Character being played in session view (reference from characters array) */
let sessionCharacter = null;

/** Current wizard step (1-10) */
let currentStep = 1;

/** Total number of wizard steps */
const TOTAL_STEPS = 10;

// ========== CACHED DOM REFERENCES ==========
// Cached for performance; populated when DOM is ready

/** Main view containers */
const listView = document.getElementById('list-view');
const builderView = document.getElementById('builder-view');
const sessionView = document.getElementById('session-view');
const battleMapView = document.getElementById('battle-map-view');

/** Character list elements */
const characterGrid = document.getElementById('character-grid');
const emptyState = document.getElementById('empty-state');

/** Wizard progress UI */
const progressBar = document.getElementById('progress-bar');
const stepIndicators = document.getElementById('step-indicators');

/** Wizard navigation buttons */
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const saveBtn = document.getElementById('save-btn');
const cancelBtn = document.getElementById('cancel-btn');

/** Builder preview panel */
const characterPreview = document.getElementById('character-preview');
