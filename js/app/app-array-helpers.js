/**
 * app-array-helpers.js
 * Helpers for rendering editable lists (languages, resistances, equipment, etc.).
 * Used in step 9 (Details) and elsewhere.
 *
 * @depends app-state (currentChar), app-utils (esc)
 */

// ========== ARRAY ITEM HELPERS ==========

/**
 * Render a list of items (equipment, conditions, etc.) with remove buttons.
 * @param {string} containerId - ID of the container element
 * @param {Array} items - Array of items to display
 * @param {string} arrayName - Property name on currentChar (e.g. 'languages', 'equipment')
 * @param {Function} [displayFormatter] - Optional formatter; receives item, returns HTML string
 */
function renderArrayList(containerId, items, arrayName, displayFormatter) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const d = typeof DomUtils !== 'undefined' ? DomUtils : null;
  const fmt = displayFormatter || ((x) => esc(x));
  if (d && d.clearChildren) d.clearChildren(container);
  else container.replaceChildren();
  (items || []).forEach((item, idx) => {
    const span = d ? d.createElement('span', { className: 'array-item' }) : (() => {
      const s = document.createElement('span');
      s.className = 'array-item';
      return s;
    })();
    const labelOut = typeof fmt === 'function' ? fmt(item) : esc(item);
    if (labelOut instanceof Node) span.appendChild(labelOut);
    else span.appendChild(document.createTextNode(String(labelOut)));
    span.appendChild(document.createTextNode(' '));
    const rm = d
      ? d.createElement('button', { type: 'button', className: 'remove-item', dataset: { idx: String(idx) }, textContent: '×' })
      : (() => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'remove-item';
        b.dataset.idx = String(idx);
        b.textContent = '×';
        return b;
      })();
    span.appendChild(rm);
    container.appendChild(span);
  });
  container.querySelectorAll('.remove-item').forEach(btn => {
    btn.addEventListener('click', () => {
      currentChar[arrayName].splice(parseInt(btn.dataset.idx), 1);
      renderArrayList(containerId, currentChar[arrayName], arrayName);
      updatePreview();
    });
  });
}

/**
 * Add an item from an input to an array on currentChar.
 * @param {string} inputId - ID of the input element
 * @param {string} listId - ID of the list container (for renderArrayList)
 * @param {string} arrayName - Property name on currentChar
 */
function addArrayItem(inputId, listId, arrayName) {
  const input = document.getElementById(inputId);
  const val = input?.value?.trim();
  if (!val) return;
  if (!currentChar[arrayName]) currentChar[arrayName] = [];
  currentChar[arrayName].push(val);
  input.value = '';
  renderArrayList(listId, currentChar[arrayName], arrayName);
  updatePreview();
}
