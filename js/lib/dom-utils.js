/**
 * Safe DOM utilities for D&D Character Builder
 * Prefer textContent and DOM builders over innerHTML for user-controlled content.
 */

/** Escape HTML to prevent XSS - use for any user/homebrew/imported content */
function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Set text content safely (no HTML interpretation) */
function setText(el, text) {
  if (el) el.textContent = String(text ?? '');
}

/** Create element with optional attributes and children */
function createElement(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([key, val]) => {
    if (val == null) return;
    if (key === 'className') el.className = val;
    else if (key === 'dataset') Object.assign(el.dataset, val);
    else if (key.startsWith('on') && typeof val === 'function') el.addEventListener(key.slice(2).toLowerCase(), val);
    else if (key === 'innerHTML') el.innerHTML = val; // Use sparingly, only for trusted static content
    else if (key === 'textContent') el.textContent = val;
    else el.setAttribute(key, String(val));
  });
  children.forEach(child => {
    if (typeof child === 'string') el.appendChild(document.createTextNode(child));
    else if (child instanceof Node) el.appendChild(child);
  });
  return el;
}


/** Clear all child nodes safely */
function clearChildren(container) {
  if (container) container.replaceChildren();
}

/** Populate a select element with option data safely */
function setSelectOptions(select, options, config = {}) {
  if (!select) return;
  clearChildren(select);
  (options || []).forEach((opt) => {
    const option = document.createElement('option');
    option.value = String(opt.value ?? '');
    option.textContent = String(opt.label ?? opt.value ?? '');
    if (config.selected != null && String(config.selected) === option.value) option.selected = true;
    select.appendChild(option);
  });
}

/** Append multiple children to a container */
function appendChildren(container, children) {
  if (!container) return;
  children.forEach(child => {
    if (typeof child === 'string') container.appendChild(document.createTextNode(child));
    else if (child instanceof Node) container.appendChild(child);
  });
}

/** Render a list by clearing container and appending items via itemRenderer(item, index) */
function renderList(container, items, itemRenderer) {
  if (!container) return;
  clearChildren(container);
  (items || []).forEach((item, idx) => {
    const node = itemRenderer(item, idx);
    if (node instanceof Node) container.appendChild(node);
  });
}

/** Get focusable elements within a container (buttons, inputs, links, etc.) */
function getFocusableElements(container) {
  if (!container) return [];
  const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  return Array.from(container.querySelectorAll(selector)).filter(el => {
    return !el.hidden && el.offsetParent !== null && !el.disabled;
  });
}


if (typeof window !== 'undefined') { window.DomUtils = { createElement, appendChildren, renderList, setText, esc, getFocusableElements, clearChildren, setSelectOptions }; }
if (typeof module !== 'undefined' && module.exports) { module.exports = { createElement, appendChildren, renderList, setText, esc, getFocusableElements, clearChildren, setSelectOptions }; }
