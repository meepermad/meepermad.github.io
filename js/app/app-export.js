/**
 * app-export.js
 * Character export and file download utilities.
 * Supports CSV and JSON export formats.
 *
 * @depends app-utils.js (esc), app-state.js (characters)
 */

// ========== EXPORT FUNCTIONS ==========

/**
 * Export character array to CSV format for spreadsheet import.
 * Headers: Name, Race, Class, Stats, etc.
 *
 * @param {Object[]} characters - Array of character objects
 * @returns {string} - CSV string, or empty if no characters
 */
function exportToCSV(characters) {
  if (!characters || characters.length === 0) return '';
  const headers = ['Name', 'Race', 'Subrace', 'Class', 'Subclass', 'Level', 'Background', 'Alignment',
    'Languages', 'Resistances', 'Immunities', 'Vulnerabilities', 'Weaknesses',
    'Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma',
    'Skills', 'Equipment', 'Notes'];
  const rows = characters.map(char => [
    char.name || '', char.race || '', char.subrace || '', char.class || '', char.subclass || '',
    char.level || 1, char.background || '', char.alignment || '',
    (char.languages || []).join('; '), (char.resistances || []).join('; '),
    (char.immunities || []).join('; '), (char.vulnerabilities || []).join('; '),
    (char.weaknesses || []).join('; '),
    char.stats?.strength || 10, char.stats?.dexterity || 10, char.stats?.constitution || 10,
    char.stats?.intelligence || 10, char.stats?.wisdom || 10, char.stats?.charisma || 10,
    (char.skills || []).join('; '), (char.equipment || []).join('; '), char.notes || ''
  ]);
  return [headers.join(','), ...rows.map(r => r.map(c => {
    const str = String(c);
    if (str.includes(',') || str.includes('"') || str.includes('\n'))
      return `"${str.replace(/"/g, '""')}"`;
    return str;
  }).join(','))].join('\n');
}

/**
 * Export character array to pretty-printed JSON.
 *
 * @param {Object[]} characters - Array of character objects
 * @returns {string} - JSON string
 */
function exportToJSON(characters) {
  return JSON.stringify(characters, null, 2);
}

/**
 * Trigger browser download of a blob/file.
 * Creates temporary anchor, programmatic click, then cleans up.
 *
 * @param {string} content - File content
 * @param {string} filename - Suggested filename for download
 * @param {string} mimeType - MIME type (e.g. 'text/csv', 'application/json')
 */
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
