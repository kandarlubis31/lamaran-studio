// store.js — data layer HANYA client-side.
// Aturan privasi:
//   • Data disimpan di localStorage browser ini saja.
//   • Tidak ada jaringan yang membawa data (tidak ada API, tidak ada
//     analytics, tidak ada telemetry).
//   • Backup = unduh file JSON lokal; Import = pilih file lokal.
//   • Aplikasi TIDAK menyertakan data siapa pun — pengguna baru mulai
//     dari template / mengimpor data sendiri.

const KEY = 'lamaran-studio:data:v1';
const MAX_UNDO = 15;

export const state = {
  data: null,
  lastSaved: null,
  fresh: false,     // true kalau baru pertama kali (belum ada data)
  undoStack: [],    // snapshot JSON sebelum save terakhir (in-memory)
};

/* ---------------- template awal (tanpa data pribadi) --------------- */
export function templateData() {
  const paragrafUmum = [
    'Melalui surat ini, saya bermaksud mengajukan diri untuk mengisi posisi <b>{posisi}</b> di <b>{perusahaan}</b>. Saya memahami tugas posisi tersebut dan siap berkontribusi sejak hari pertama.',
    'Berkas pendukung (CV, ijazah, dan sertifikat) saya lampirkan bersama surat ini dan tersedia apabila diperlukan. Saya bersedia mengikuti seluruh tahapan rekrutmen hingga selesai.',
    'Demikian lamaran ini saya buat dengan sebenar-benarnya. Atas perhatian Bapak/Ibu, saya ucapkan terima kasih.',
  ];
  const kosong = (judulUtama) => ({
    judul: `CV — ${judulUtama}`,
    hdr_role: 'Isi baris peran di sini — mis. S1 Informatika · IT Support',
    profil: 'Tulis ringkasan profil kamu di sini (2–4 kalimat, boleh pakai tag <b>tebal</b>).',
    utama: [
      { judul: 'Pengalaman', blok: [] },
      { judul: 'Pendidikan', blok: [] },
    ],
    sisi: [
      { judul: 'Keahlian', blok: [] },
      { judul: 'Sertifikasi', blok: [] },
      { judul: 'Informasi', blok: [] },
    ],
  });
  return {
    identitas: {
      nama_awal: 'Nama',
      nama_akhir: 'Anda',
      foto: '',
      telp: '08xx-xxxx-xxxx',
      email: 'email@contoh.com',
      alamat: 'Jalan Alamat, Kota, Provinsi',
      tautan: ['github.com/username'],
      kota_surat: 'Jakarta',
    },
    cv: { it: kosong('IT'), umum: kosong('Umum') },
    surat: {
      it: {
        judul: 'Surat Lamaran — IT',
        sub: 'Isi sub-header — mis. S1 Informatika · IT Support · Jaringan',
        penerima: 'Tim Rekrutmen {perusahaan}',
        paragraf: [...paragrafUmum],
      },
      umum: {
        judul: 'Surat Lamaran — Umum',
        sub: 'Isi sub-header — mis. Administrasi Perkantoran · Layanan Pelanggan',
        penerima: 'Tim Rekrutmen {perusahaan}',
        paragraf: [...paragrafUmum],
      },
    },
    lamaran: [],
  };
}

/* --------------------------- normalisasi --------------------------- */
export function normalize(d) {
  d.identitas = d.identitas || {};
  const i = d.identitas;
  i.nama_awal = i.nama_awal || 'Nama';
  i.nama_akhir = i.nama_akhir || '';
  i.telp = i.telp || '';
  i.email = i.email || '';
  i.alamat = i.alamat || '';
  i.tautan = Array.isArray(i.tautan) ? i.tautan : [];
  i.kota_surat = i.kota_surat || 'Jakarta';
  // path file lama (folder lokal) tak terbaca browser -> minta upload ulang
  const fotoDihapus = Boolean(i.foto) && !String(i.foto).startsWith('data:');
  if (fotoDihapus) i.foto = '';
  i.foto = i.foto || '';

  d.cv = d.cv || {};
  for (const v of ['it', 'umum']) {
    d.cv[v] = d.cv[v] || { judul: 'CV', hdr_role: '', profil: '', utama: [], sisi: [] };
    d.cv[v].utama = d.cv[v].utama || [];
    d.cv[v].sisi = d.cv[v].sisi || [];
    for (const arr of [d.cv[v].utama, d.cv[v].sisi]) {
      for (const s of arr) s.blok = s.blok || [];
    }
  }
  d.surat = d.surat || {};
  for (const v of ['it', 'umum']) {
    d.surat[v] = d.surat[v] || { judul: 'Surat Lamaran', sub: '', paragraf: [] };
    d.surat[v].paragraf = d.surat[v].paragraf || [];
    d.surat[v].penerima = d.surat[v].penerima || 'Tim Rekrutmen {perusahaan}';
    d.surat[v].judul = d.surat[v].judul || 'Surat Lamaran';
    d.surat[v].sub = d.surat[v].sub || '';
  }
  d.lamaran = Array.isArray(d.lamaran) ? d.lamaran : [];
  return { data: d, fotoDihapus };
}

/* ------------------------- load / simpan --------------------------- */
export function loadData() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch { /* private mode */ }
  if (raw) {
    try {
      const { data } = normalize(JSON.parse(raw));
      state.data = data;
      state.lastSaved = JSON.stringify(data);
      state.fresh = false;
      return state;
    } catch { /* rusak -> jatuh ke template */ }
  }
  const { data } = normalize(templateData());
  state.data = data;
  state.lastSaved = JSON.stringify(data);
  state.fresh = true;
  saveData({ recordUndo: false });
  return state;
}

export function saveData({ recordUndo = true } = {}) {
  const now = JSON.stringify(state.data);
  if (recordUndo && state.lastSaved && state.lastSaved !== now) {
    state.undoStack.push(state.lastSaved);
    while (state.undoStack.length > MAX_UNDO) state.undoStack.shift();
  }
  try { localStorage.setItem(KEY, now); } catch (e) {
    // kuota penuh (foto terlalu besar) — laporkan ke pemanggil
    return { ok: false, error: 'Penyimpanan penuh: ' + e.message };
  }
  state.lastSaved = now;
  return { ok: true };
}

export function undo() {
  const prev = state.undoStack.pop();
  if (!prev) return false;
  state.data = JSON.parse(prev);
  state.lastSaved = JSON.stringify(state.data);
  try { localStorage.setItem(KEY, state.lastSaved); } catch { /* ignore */ }
  return true;
}

export function canUndo() { return state.undoStack.length > 0; }

/* ------------------------ import / backup -------------------------- */
export function parseImport(text) {
  const obj = JSON.parse(text);
  if (!obj || typeof obj !== 'object' || !obj.cv || !obj.surat || !obj.identitas) {
    throw new Error('Bukan file data_master.json yang valid (field identitas/cv/surat tidak ada).');
  }
  return normalize(obj);
}

export function backupJSON() {
  const nama = `lamaran-studio-backup-${new Date().toISOString().slice(0, 10)}.json`;
  download(new Blob([JSON.stringify(state.data, null, 2)],
    { type: 'application/json' }), nama);
  return nama;
}

export function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* --------- foto: upload -> data URL (diperkecil dulu biar hemat) ----- */
export function fotoToDataUrl(file, maxDim = 900) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('File bukan gambar.'));
    const fr = new FileReader();
    fr.onerror = () => reject(new Error('Gagal membaca file.'));
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width: w, height: h } = img;
        if (w > maxDim || h > maxDim) {
          const k = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * k); h = Math.round(h * k);
        }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => reject(new Error('Gambar rusak.'));
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}
