// Settings panel (Phase 18): DOM overlay opened with Esc.
// The browser reserves Esc to exit pointer lock while locked, so in practice
// the panel opens via the pointerlockchange handler in main.js when the lock
// drops. All controls apply live and persist to localStorage.

export function createSettingsPanel({ panel, initial, onChange, onResume, onOpen, isLocked, onFullscreen }) {
  const rdInput = panel.querySelector("#set-render-distance");
  const rdValue = panel.querySelector("#set-render-distance-value");
  const seInput = panel.querySelector("#set-sensitivity");
  const seValue = panel.querySelector("#set-sensitivity-value");
  const fsButton = panel.querySelector("#set-fullscreen");
  const resumeButton = panel.querySelector("#set-resume");

  function syncLabels(settings) {
    rdValue.textContent = `${settings.renderDistance} chunks`;
    seValue.textContent = settings.sensitivity.toFixed(4);
  }

  function syncInputs(settings) {
    rdInput.value = String(settings.renderDistance);
    seInput.value = String(settings.sensitivity);
    syncLabels(settings);
  }

  syncInputs(initial);

  let current = { ...initial };
  const emit = () => onChange({ ...current });

  rdInput.addEventListener("input", () => {
    current.renderDistance = Math.round(Number(rdInput.value));
    syncLabels(current);
    emit();
  });
  seInput.addEventListener("input", () => {
    current.sensitivity = Number(seInput.value);
    syncLabels(current);
    emit();
  });
  fsButton.addEventListener("click", () => onFullscreen());
  resumeButton.addEventListener("click", () => onResume());
  // Esc toggles the panel. While locked, Esc never reaches the page (the
  // browser spends it breaking pointer lock), so that path opens settings
  // via the pointerlockchange handler in main.js. This covers the unlocked
  // case: locked Esc exits the lock (panel opens from the lock handler),
  // unlocked Esc with the panel open resumes.
  window.addEventListener("keydown", (e) => {
    if (e.code !== "Escape") return;
    if (!panel.classList.contains("hidden")) onResume();
    else if (!isLocked()) onOpen();
  });

  return {
    open() {
      panel.classList.remove("hidden");
    },
    close() {
      panel.classList.add("hidden");
    },
    isOpen() {
      return !panel.classList.contains("hidden");
    },
    refresh(settings) {
      current = { ...settings };
      syncInputs(current);
    },
  };
}
