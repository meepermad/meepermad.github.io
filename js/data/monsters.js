/**
 * D&D 5e SRD Monsters - Helper functions
 * Monster data is in monsters-data.js (same folder, SRD_MONSTERS).
 * Challenge Rating: 0-4 Easy, 5-10 Medium, 11-16 Hard, 17+ Deadly
 */

// ========== MONSTER HELPERS ==========

/**
 * Map Challenge Rating to difficulty label for encounter balancing.
 * @param {number} cr - Challenge Rating (0–30+)
 * @returns {string} 'Trivial' | 'Easy' | 'Medium' | 'Hard' | 'Deadly'
 */
function getCrDifficulty(cr) {
  if (cr <= 0.5) return 'Trivial';
  if (cr <= 4) return 'Easy';
  if (cr <= 10) return 'Medium';
  if (cr <= 16) return 'Hard';
  return 'Deadly';
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { SRD_MONSTERS, getCrDifficulty }; }
