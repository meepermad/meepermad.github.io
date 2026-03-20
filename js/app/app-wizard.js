/**
 * app-wizard.js
 * Wizard navigation: goToStep, renderStepIndicators.
 * Handles step switching, progress bar, and step-specific rendering dispatch.
 *
 * @depends app-state (currentChar, currentStep, TOTAL_STEPS, DOM refs)
 */

// ========== WIZARD NAVIGATION ==========

/**
 * Switch to step N, update UI, run step-specific render.
 * Steps 1–2 use static HTML; steps 3–10 may need dynamic rendering.
 * @param {number} step - Wizard step (1–10)
 */
function goToStep(step) {
  step = Math.max(1, Math.min(step, TOTAL_STEPS));
  if (typeof clearValidationErrors === 'function') clearValidationErrors();
  document.querySelectorAll('.wizard-pane').forEach(p => p.classList.remove('active'));
  const pane = document.querySelector(`.wizard-pane[data-step="${step}"]`);
  if (pane) pane.classList.add('active');

  currentStep = step;
  if (progressBar) progressBar.style.width = `${(step / TOTAL_STEPS) * 100}%`;
  const stepLabels = ['Name', 'Race', 'Subrace', 'Class', 'Subclass', 'Stats', 'Background', 'Alignment', 'Details', 'Summary'];
  document.querySelectorAll('.step-dot').forEach((d, i) => {
    const s = i + 1;
    d.classList.toggle('completed', s < step);
    d.classList.toggle('current', s === step);
    d.classList.toggle('future', s > step);
    d.classList.toggle('active', s <= step);
    d.setAttribute('aria-selected', s === step ? 'true' : 'false');
    d.setAttribute('aria-current', s === step ? 'step' : 'false');
    d.disabled = s > step;
    d.style.cursor = s <= step ? 'pointer' : 'default';
  });
  const mobileLabel = document.getElementById('step-current-label');
  if (mobileLabel) mobileLabel.textContent = `Step ${step} of ${TOTAL_STEPS}: ${stepLabels[step - 1] || ''}`;

  if (prevBtn) prevBtn.disabled = step === 1;
  if (nextBtn) nextBtn.hidden = step === TOTAL_STEPS;
  if (saveBtn) saveBtn.hidden = step !== TOTAL_STEPS;

  const firstRunHint = document.getElementById('first-run-hint');
  if (firstRunHint) {
    const seen = localStorage.getItem('dnd_first_run');
    firstRunHint.hidden = step !== 1 || !!seen;
  }

  // Step-specific rendering
  if (step === 3) {
    const race = getMergedRaces().find(r => r.name === currentChar.race);
    if (!race?.subraces?.length) {
      goToStep(4);
      return;
    }
    renderSubraceStep();
  }
  else if (step === 4) renderClassStep();
  else if (step === 5) renderSubclassStep();
  else if (step === 6) renderStatsStep();
  else if (step === 7) renderBackgroundStep();
  else if (step === 8) renderAlignmentStep();
  else if (step === 9) applyRaceTraitsAndRenderStep9();
  else if (step === 10) renderSummaryStep();

  updatePreview();
}

/**
 * Render step indicator dots (1–10) in the wizard header.
 * Each dot is clickable to jump to that step (if already completed).
 */
function renderStepIndicators() {
  if (!stepIndicators) return;
  const labels = ['Name', 'Race', 'Subrace', 'Class', 'Subclass', 'Stats', 'Background', 'Alignment', 'Details', 'Summary'];
  const d = typeof DomUtils !== 'undefined' ? DomUtils : null;
  if (d && d.clearChildren) d.clearChildren(stepIndicators);
  else stepIndicators.replaceChildren();
  labels.forEach((l, i) => {
    const num = i + 1;
    const dot = d
      ? d.createElement('button', {
        type: 'button',
        className: 'step-dot',
        role: 'tab',
        'aria-selected': 'false',
        'aria-current': 'false',
        dataset: { step: String(num) },
        title: l
      }, [
        d.createElement('span', { className: 'step-dot-num', textContent: String(num) }),
        d.createElement('span', { className: 'step-dot-label', textContent: l })
      ])
      : (() => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'step-dot';
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-selected', 'false');
        b.setAttribute('aria-current', 'false');
        b.dataset.step = String(num);
        b.title = l;
        const n = document.createElement('span');
        n.className = 'step-dot-num';
        n.textContent = String(num);
        const lab = document.createElement('span');
        lab.className = 'step-dot-label';
        lab.textContent = l;
        b.append(n, lab);
        return b;
      })();
    stepIndicators.appendChild(dot);
  });
  stepIndicators.querySelectorAll('.step-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      if (!currentChar) return;
      const s = parseInt(dot.dataset.step);
      if (s > currentStep) return;
      if (s === 3 && getMergedRaces().find(r => r.name === currentChar.race)?.subraces?.length && !currentChar.subrace) return;
      goToStep(s);
    });
  });
}
