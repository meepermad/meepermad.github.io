/**
 * app-utils.js
 * Shared utility functions for the D&D Character Builder.
 * Load order: First among app modules (after js/lib/dom-utils.js which also has esc).
 *
 * @depends js/lib/dom-utils.js (optional - we define esc here for app modules that load before it)
 */

// ========== STRING UTILITIES ==========

/**
 * Escape HTML special characters to prevent XSS when rendering user content.
 * Used for any user-entered, homebrew, or imported data displayed in the DOM.
 *
 * @param {string} s - Raw string (may be null/undefined)
 * @returns {string} - HTML-safe string with &, <, >, " escaped
 */
function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
