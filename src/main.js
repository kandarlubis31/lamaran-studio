// main.js — boot aplikasi, event statis, preview A4, eksekusi export.
import './style.css';
import {
  state, loadData, saveData, undo, backupJSON, parseImport,
} from './store.js';
import {
  initActivity, setStatus, markChange, setAutosaveHook,
} from './activity.js';
import { renderAll, renderRiwayat, esc } from './ui.js';
import { renderCv, renderSurat as renderSuratDoc, tanggalHariIni } from './render.js';
import { validasi, printDoc, unduhHtml, namaFileDasar } from './export.js';

const $ = (s) => document.querySelector(s);
let pvZoom = 1;

/* ------------------------------ preview ----------------------------- */
function isianPreview() {
  return {
    perusahaan: $('#ex-perusahaan').value.trim() || '{perusahaan}',
    posisi: $('#ex-posisi').value.trim() || '{posisi}',
    tanggal: $('#ex-tanggal').value.trim() || tanggalHariIni(),
    kota: state.data.identitas.kota_surat || 'Jakarta',
  };
}
function isianRaw() {
  return { perusahaan: $('#ex-perusahaan').value, posisi: $('#ex-posisi').value };
}

function preview() {
  const [doc, varian] = $('#pv-doc').value.split(':');
  const html = doc === 'cv'
    ? renderCv(state.data, varian)
    : renderSuratDoc(state.data, varian, isianPreview());
  $('#preview').srcdoc = html;
}

function tungguLoad(iframe) {
  return new Promise((res) => {
    iframe.onload = () => res();
    setTimeout(res, 1500); // cadangan kalau onload tidak menyala
  });
}

/* ------------------------------ zoom fit ---------------------------- */
function fit() {
  const wrap = $('#frame-wrap');
  if (!wrap) return;
  pvZoom = Math.min(1, Math.max(0.3, (wrap.clientWidth - 28) / 794));
  $('#preview').style.transform = `scale(${pvZoom})`;
}
window.zoom = (d) => {
  pvZoom = Math.min(2, Math.max(0.3, pvZoom + d * 0.1));
  $('#preview').style.transform = `scale(${pvZoom})`;
};

/* -------------------------- simpan / undo --------------------------- */
function autosave() {
  const r = saveData();
  setStatus(r.ok ? '✓ tersimpan ' + new Date().toLocaleTimeString() : '✖ ' + r.error, !r.ok);
}
setAutosaveHook(autosave);

function simpanManual() {
  autosave();
  preview();
}
function doUndo() {
  if (undo()) {
    renderAll();
    preview();
    setStatus('↩ langkah terakhir di-undo');
  } else {
    setStatus('Tidak ada langkah untuk di-undo', true);
  }
}

/* --------------------------- import / backup ------------------------ */
function pasangImport() {
  $('#file-import').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const { data, fotoDihapus } = parseImport(await f.text());
      state.data = data;
      state.undoStack.length = 0;
      saveData({ recordUndo: false });
      renderAll();
      preview();
      setStatus(fotoDihapus
        ? '✓ data diimpor — foto lama berupa path file, silakan upload ulang di tab Data Diri'
        : '✓ data diimpor dari file', false);
    } catch (err) {
      setStatus('✖ Import gagal: ' + err.message, true);
    }
    e.target.value = '';
  });
}

/* ------------------------------ riwayat ----------------------------- */
window.pakaiLamaran = (i) => {
  const x = (state.data.lamaran || [])[i];
  if (!x) return;
  $('#ex-perusahaan').value = x.perusahaan || '';
  $('#ex-posisi').value = x.posisi || '';
  $('#ex-tanggal').value = x.tanggal || tanggalHariIni();
  if (x.doc) $('#ex-doc').value = x.doc;
  if (x.varian) $('#ex-varian').value = x.varian;
  $('#pv-doc').value = `${$('#ex-doc').value}:${$('#ex-varian').value}`;
  isiNamaFile();
  preview();
  setStatus('✓ form export terisi ulang dari riwayat');
};

function catatRiwayat(doc) {
  const rec = {
    perusahaan: $('#ex-perusahaan').value.trim(),
    posisi: $('#ex-posisi').value.trim(),
    tanggal: $('#ex-tanggal').value.trim() || tanggalHariIni(),
    doc,
    varian: $('#ex-varian').value,
    waktu: new Date().toISOString(),
  };
  state.data.lamaran = state.data.lamaran || [];
  state.data.lamaran.unshift(rec);
  while (state.data.lamaran.length > 30) state.data.lamaran.pop();
  saveData();
  renderRiwayat();
}

/* ------------------------------- export ----------------------------- */
function isiNamaFile() {
  const doc = $('#ex-doc').value;
  const nama = namaFileDasar(doc, isianRaw(), state.data);
  $('#ex-nama').value = nama;
}

function tampilHasil(msg, err) {
  const el = $('#hasil');
  el.className = err ? 'err' : '';
  el.style.display = 'block';
  el.textContent = msg;
}

async function eksporPdf() {
  const doc = $('#ex-doc').value;
  const errs = validasi(doc, isianRaw(), state.data);
  if (errs.length) { tampilHasil('✖ ' + errs.join(' · '), true); return; }
  $('#pv-doc').value = `${doc}:${$('#ex-varian').value}`;
  preview();
  await tungguLoad($('#preview'));
  tampilHasil('Dialog print terbuka → pilih "Save as PDF" (lokasi: Download).', false);
  await printDoc($('#preview'));
  catatRiwayat(doc);
}

function eksporHtml() {
  const doc = $('#ex-doc').value;
  const varian = $('#ex-varian').value;
  const errs = validasi(doc, isianRaw(), state.data);
  if (errs.length) { tampilHasil('✖ ' + errs.join(' · '), true); return; }
  const html = doc === 'cv'
    ? renderCv(state.data, varian)
    : renderSuratDoc(state.data, varian, isianPreview());
  const nama = $('#ex-nama').value.trim() || namaFileDasar(doc, isianRaw(), state.data);
  unduhHtml(html, nama);
  catatRiwayat(doc);
  tampilHasil(`✓ ${esc(nama)}.html diunduh ke folder Download.`, false);
}

function bukaTabBaru() {
  const w = window.open('', '_blank');
  w.document.write($('#preview').srcdoc);
  w.document.close();
}

/* ------------------------------ boot -------------------------------- */
function boot() {
  initActivity($('#status'), preview);
  loadData();
  renderAll();

  $('#ex-tanggal').value = tanggalHariIni();
  isiNamaFile();
  preview();
  fit();
  if (state.fresh) {
    setStatus('✨ Template baru dimuat — isi form, atau tombol 📥 Import untuk data sendiri');
  } else {
    setStatus('✓ data dimuat dari penyimpanan browser');
  }

  // event statis
  $('#pv-doc').addEventListener('change', preview);
  $('#ex-doc').addEventListener('change', () => { isiNamaFile(); });
  $('#ex-perusahaan').addEventListener('input', isiNamaFile);
  $('#ex-posisi').addEventListener('input', isiNamaFile);
  $('#btn-simpan').addEventListener('click', simpanManual);
  $('#btn-undo').addEventListener('click', doUndo);
  $('#btn-backup').addEventListener('click', () => {
    const nama = backupJSON();
    setStatus('✓ backup diunduh: ' + nama);
  });
  $('#btn-ekspor-pdf').addEventListener('click', eksporPdf);
  $('#btn-ekspor-html').addEventListener('click', eksporHtml);
  $('#btn-buka-tab').addEventListener('click', bukaTabBaru);
  $('#btn-zoom-in').addEventListener('click', () => window.zoom(1));
  $('#btn-zoom-out').addEventListener('click', () => window.zoom(-1));
  pasangImport();

  window.addEventListener('resize', fit);
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === 's') { e.preventDefault(); simpanManual(); }
    if ((e.ctrlKey || e.metaKey) && k === 'z' && !e.shiftKey) { e.preventDefault(); doUndo(); }
    if ((e.ctrlKey || e.metaKey) && k === 'p') { e.preventDefault(); eksporPdf(); }
  });
}

boot();
