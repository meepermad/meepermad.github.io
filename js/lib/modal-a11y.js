/**
 * Modal accessibility utilities - WAI-ARIA / WCAG 2.2
 * Focus trapping, initial focus, Escape handling, focus restoration
 */

(function (global) {
  'use strict';

  let lastFocusedElement = null;
  let focusTrapHandlers = new WeakMap();

  /** Whether an element can receive focus (fixed/sticky often have offsetParent null) */
  function isFocusableVisible(el) {
    if (!el || el.hidden || el.disabled) return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    if (typeof el.checkVisibility === 'function') {
      try {
        return el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
      } catch (e) { /* fall through */ }
    }
    const style = typeof getComputedStyle === 'function' ? getComputedStyle(el) : null;
    if (style && (style.visibility === 'hidden' || style.display === 'none')) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  /** Get focusable elements within a container */
  function getFocusableElements(container) {
    if (!container) return [];
    const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    return Array.from(container.querySelectorAll(selector)).filter(isFocusableVisible);
  }

  /** Trap focus inside modal on Tab/Shift+Tab */
  function trapFocus(modalEl) {
    const handler = (e) => {
      if (e.key !== 'Tab') return;
      const focusable = getFocusableElements(modalEl);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    modalEl.addEventListener('keydown', handler);
    focusTrapHandlers.set(modalEl, handler);
  }

  /** Remove focus trap */
  function removeFocusTrap(modalEl) {
    const handler = focusTrapHandlers.get(modalEl);
    if (handler) {
      modalEl.removeEventListener('keydown', handler);
      focusTrapHandlers.delete(modalEl);
    }
  }

  /** Open modal with focus management */
  function openModal(modalEl, options) {
    if (!modalEl) return;
    lastFocusedElement = document.activeElement;
    modalEl.hidden = false;
    if (modalEl.style) modalEl.style.display = '';
    const focusTarget = options?.focusTarget ? (typeof options.focusTarget === 'string'
      ? modalEl.querySelector(options.focusTarget) || document.getElementById(options.focusTarget)
      : options.focusTarget) : null;
    const focusable = getFocusableElements(modalEl);
    const toFocus = focusTarget || focusable[0];
    if (toFocus) {
      setTimeout(() => toFocus.focus(), 0);
    }
    trapFocus(modalEl);
  }

  /** Close modal and restore focus */
  function closeModal(modalEl) {
    if (!modalEl) return;
    modalEl.hidden = true;
    if (modalEl.style) modalEl.style.display = 'none';
    removeFocusTrap(modalEl);
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      try { lastFocusedElement.focus(); } catch (e) {}
    }
  }

  /** Setup modal: Escape, backdrop, close button, focus trap */
  function setupModal(modalId, options) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    const closeBtn = modal.querySelector('.modal-close') || modal.querySelector('[aria-label="Close"]');
    const backdrop = modal.querySelector('.modal-backdrop');
    const onClose = options?.onClose || (() => closeModal(modal));

    if (closeBtn) {
      closeBtn.addEventListener('click', () => { onClose(); closeModal(modal); });
    }
    if (backdrop) {
      backdrop.addEventListener('click', () => { onClose(); closeModal(modal); });
    }

    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        closeModal(modal);
      }
    });

    return { open: (opts) => openModal(modal, opts || options), close: () => closeModal(modal) };
  }

  /** Get the topmost visible modal */
  function getTopmostVisibleModal(modalIds) {
    for (let i = modalIds.length - 1; i >= 0; i--) {
      const m = document.getElementById(modalIds[i]);
      if (m && !m.hidden) return m;
    }
    return null;
  }

  /** Register global Escape handler for modal stack */
  function registerEscapeHandler(modalIds) {
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const top = getTopmostVisibleModal(modalIds);
      if (top) {
        closeModal(top);
        e.preventDefault();
      }
    });
  }

  global.ModalA11y = {
    openModal,
    closeModal,
    setupModal,
    getFocusableElements,
    registerEscapeHandler,
    getTopmostVisibleModal
  };
})(typeof window !== 'undefined' ? window : this);
