# 📋 Lamaran Studio

**Editor CV & surat lamaran yang 100% client-side — data kamu tidak pernah meninggalkan browser.**

Buat CV (varian IT & Umum) dan surat lamaran lewat form, lihat preview A4 realtime, lalu export PDF / HTML. Tanpa server, tanpa akun, tanpa analytics.

> **English:** A fully client-side CV & cover-letter builder. All data stays in your browser (localStorage) — no backend, no API calls, no tracking. A4 preview with instant PDF export via the browser's print dialog.

---

## 🔒 Kenapa "client-side"?

Ini poin utama proyeknya — dokumen lamaran isinya data paling sensitif (NIK, alamat, nomor HP):

- **Tidak ada backend.** Aplikasi ini murni HTML + JavaScript yang dijalankan di browser. Tidak ada API, tidak ada database, tidak ada yang bisa "mengambil" data kamu.
- **Data disimpan di `localStorage`** browser masing-masing. Hilang kalau data browser dihapus — makanya ada tombol **💾 Backup** (unduh JSON) dan **📥 Import** (muat JSON).
- **Deploy berisi template kosong.** Repo/deploy tidak menyertakan data siapa pun — pengguna baru mulai dari template atau mengimpor data sendiri. (Ini diverifikasi otomatis saat development: grep `dist/` untuk pola data pribadi sebelum rilis.)
- **Tanpa analytics / tracker / cookie.** Satu-satunya request jaringan dari aplikasi adalah Google Fonts (judul & isi dokumen tidak pernah ikut dikirim). Mau 100% offline? Hapus dua tag `<link>` ke fonts.googleapis.com di `src/render.js`.
- **Export PDF = dialog print browser.** Dokumen dirender lokal lalu dicetak "Save as PDF" — tidak ada dokumen yang dikirim ke layanan mana pun.

## ✨ Fitur

- **4 tab form**: Data Diri · CV · Surat Lamaran · Riwayat
- **2 varian dokumen**: IT (support/jaringan/server) dan Umum (administrasi/CS) — untuk CV maupun surat
- **Preview A4 realtime** (zoom otomatis pas lebar layar, buka di tab baru)
- **Export PDF** via dialog print + **Unduh HTML** (self-contained, CSS inline)
- **Reorder blok** CV (↑↓) dan paragraf surat (↑↓) tanpa hapus-tambah
- **Undo (Ctrl+Z)** — 15 langkah terakhir — dan **autosave** + **Ctrl+S**
- **Validasi sebelum export**: posisi/perusahaan wajib (untuk surat), deteksi typo IPK ("3,93"), deteksi NIK 16 digit (jangan taruh NIK di dokumen lamaran!)
- **Token otomatis** di surat: `{posisi}` `{perusahaan}` `{nama}` + pilihan format penerima ("Tim Rekrutmen …" / "HRD …" / dll.)
- **Riwayat export** — sekali klik, form export terisi ulang
- **Upload foto** (otomatis diperkecil, disimpan sebagai data URL)
- **Import / Backup JSON** — data milikmu, format file terbuka

## 🚀 Menjalankan lokal

```bash
npm install
npm run dev        # http://localhost:5173
```

Build produksi:

```bash
npm run build      # hasil di dist/
npm run preview    # cek build
```

> Mengubah gaya CV? Edit `src/styles/cv.css` / `ml.css` lalu `npm run sync:css` (menghasilkan `src/assets/inline-css.js` yang dipakai renderer).

## ☁️ Deploy ke Vercel

Cara termudah — tanpa konfigurasi apa pun (Vercel otomatis mendeteksi Vite):

```bash
npm install -g vercel
npm run build
vercel             # ikuti instruksinya, pilih "Yes" untuk production
```

Atau hubungkan repo GitHub-nya di dashboard Vercel (Framework: **Vite**, Output: **dist**) — setiap push ke `main` langsung deploy.

## 🗂️ Struktur proyek

```
lamaran-studio/
├── index.html              # shell aplikasi (header, tab, preview, panel export)
├── scripts/sync-css.mjs    # generate modul CSS inline dari src/styles/
└── src/
    ├── main.js             # boot, event, preview, eksekusi export
    ├── render.js           # renderer CV & surat -> HTML self-contained (A4)
    ├── ui.js               # render form 4 tab + handler
    ├── store.js            # localStorage, undo, import/backup, template
    ├── export.js           # validasi, print-to-PDF, unduh HTML
    ├── activity.js         # autosave & status bar
    ├── style.css           # gaya dashboard (palet navy/copper)
    └── styles/             # cv.css + ml.css — sumber gaya dokumen
```

**Tanpa dependensi runtime** — hanya Vite (devDependency). Vanilla JS, tanpa framework.

## 🧪 Jaminan kualitas

Saat pengembangan, hasil renderer JS diuji **byte-identik** terhadap versi Python aslinya (render CV IT/Umum + surat dengan data yang sama), plus unit test validasi/undo dan pemeriksaan otomatis bahwa `dist/` bebas data pribadi.

## 📄 Lisensi

MIT — silakan dipakai, dimodifikasi, dan dipublikasikan.

---

Dibuat oleh **Aulia Iskandar Lubis**.
