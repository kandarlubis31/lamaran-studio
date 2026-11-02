// activity.js — jembatan antar modul: status bar, autosave, preview debounced.
// Dipakai ui.js (form dinamis) dan main.js (event statis) tanpa siklus import.
let statusEl = null;
let previewFn = null;
let autoT = null;
let pvT = null;

export function initActivity(el, preview) {
  statusEl = el;
  previewFn = preview;
}

export function setStatus(msg, err = false) {
  if (!statusEl) return;
  statusEl.textContent = msg;
  statusEl.style.color = err ? '#ffb3a7' : '';
}

export function markChange() {
  setStatus('• perubahan belum disimpan');
  clearTimeout(autoT);
  autoT = setTimeout(() => {
    // diisi oleh main.js lewat setAutosaveHook (saveData + render riwayat)
    if (autosaveFn) autosaveFn();
  }, 1200);
  clearTimeout(pvT);
  pvT = setTimeout(() => { if (previewFn) previewFn(); }, 1500);
}

let autosaveFn = null;
export function setAutosaveHook(fn) { autosaveFn = fn; }

export function batalkanTimer() { clearTimeout(autoT); clearTimeout(pvT); }
