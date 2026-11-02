// export.js — validasi + eksekusi export dari browser.
// PDF : Print dialog browser ("Save as PDF") — Chrome yang merender,
//       kualitas sama persis dengan export headless versi desktop.
// HTML: unduh file self-contained (CSS inline + foto base64).
import { download } from './store.js';

export const slug = (s) => String(s || '')
  .replace(/[^A-Za-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

export function namaFileDasar(doc, isian, data) {
  const pos = slug(isian.posisi);
  const per = slug(isian.perusahaan);
  const jen = doc === 'cv' ? 'CV' : 'ML';
  const orang = slug(data.identitas.nama_awal) || 'CV';
  if (pos || per) return `${jen}_${orang}_${pos || 'Universal'}${per ? '_' + per : ''}`;
  return `${jen}_${orang}`;
}

function semuaString(obj, ke = []) {
  if (typeof obj === 'string') ke.push(obj);
  else if (Array.isArray(obj)) obj.forEach((x) => semuaString(x, ke));
  else if (obj && typeof obj === 'object') Object.values(obj).forEach((x) => semuaString(x, ke));
  return ke;
}

/* Validasi sebelum export — balik array pesan error ([] = lolos). */
export function validasi(doc, isian, data) {
  const errs = [];
  const pos = String(isian.posisi || '').trim();
  const per = String(isian.perusahaan || '').trim();
  if (doc === 'surat') {
    if (!pos) errs.push('Posisi dilamar wajib diisi untuk surat.');
    if (!per) errs.push('Nama perusahaan wajib diisi untuk surat.');
  }
  // konsistensi data: pola typo IPK ("3.93/3,93") dulu pernah nyasar ke dokumen
  const strings = semuaString(data);
  for (const s of strings) {
    if (/IPK\s*3[.,]93/i.test(s)) {
      errs.push('Ditemukan teks "IPK 3,93" di data — kemungkinan salah ketik, periksa nilai IPK kamu.');
      break;
    }
  }
  for (const s of strings) {
    if (/\b\d{16}\b/.test(s)) {
      errs.push('Ditemukan nomor 16 digit (kemungkinan NIK) — jangan taruh NIK di dokumen lamaran.');
      break;
    }
  }
  if (!String(data.identitas.nama_awal || '').trim()) {
    errs.push('Nama depan masih kosong.');
  }
  return errs;
}

/* Cetak iframe preview -> dialog print (pilih "Save as PDF"). */
export async function printDoc(iframe) {
  try {
    const doc = iframe.contentDocument;
    if (doc && doc.fonts && doc.fonts.ready) {
      await Promise.race([doc.fonts.ready, new Promise((r) => setTimeout(r, 1500))]);
    }
    if (doc && doc.images && doc.images.length) {
      const tunggu = [...doc.images].map((img) => (img.complete
        ? null
        : new Promise((r) => { img.onload = r; img.onerror = r; }))).filter(Boolean);
      await Promise.race([Promise.all(tunggu), new Promise((r) => setTimeout(r, 1500))]);
    }
  } catch { /* iframe silang-origin dll. — lanjut saja */ }
  iframe.contentWindow.focus();
  iframe.contentWindow.print();
}

export function unduhHtml(html, namaDasar) {
  const filename = namaDasar.toLowerCase().endsWith('.html')
    ? namaDasar : `${namaDasar}.html`;
  download(new Blob([html], { type: 'text/html;charset=utf-8' }), filename);
}
