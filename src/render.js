// render.js — renderer CV & Surat Lamaran -> HTML self-contained.
// Port presisi dari dashboard.py (versi Python) supaya hasil render
// identik: string dari data berasal dari parser "escaped fragment"
// (teks escape + tag inline mentah) dan ditulis TANPA escape() lagi;
// yang di-escape hanya nilai plain dari identitas/isian.
import { CV_CSS, ML_CSS } from './assets/inline-css.js';

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export function tanggalHariIni(d = new Date()) {
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

function fotoSrc(foto) {
  // data URL (hasil upload di browser) langsung dipakai; path file lama
  // ("00_Universal/FotoBerwarna.jpg") tak bisa diakses browser -> kosong.
  return foto && foto.startsWith('data:') ? foto : '';
}

function pageWrap(css, title, inner) {
  const btn = '<div class="no-print"><button onclick="window.print()">'
    + '&#128424;&#65039; Print / Simpan sebagai PDF</button></div>';
  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
${css}
</style>
</head>
<body>
${btn}
${inner}
</body>
</html>
`;
}

export function renderCv(data, varian) {
  const d = data.cv[varian];
  const idn = data.identitas;
  const nama = `${esc(idn.nama_awal)} <span>${esc(idn.nama_akhir)}</span>`;
  const fullName = `${idn.nama_awal} ${idn.nama_akhir}`;
  const foto = fotoSrc(idn.foto);
  const kontak = [
    `<div><b>${esc(idn.telp)}</b> · ${esc(idn.email)}</div>`,
    `<div>${esc(idn.alamat)}</div>`,
    `<div>${esc((idn.tautan || []).join(' · '))}</div>`,
  ].join('\n      ');

  let hdr = '  <div class="hdr">\n';
  if (foto) {
    hdr += `    <img src="${foto}" alt="Foto ${esc(fullName)}" class="hdr-foto">\n`;
  }
  hdr += `    <div>\n      <div class="hdr-name">${nama}</div>\n`
    + `      <div class="hdr-role">${d.hdr_role}</div>\n    </div>\n`
    + `    <div class="hdr-contact">\n      ${kontak}\n    </div>\n  </div>`;

  const renderBlok = (b) => {
    const j = b.jenis;
    if (j === 'item') {
      const bullets = (b.bullet || []).map((x) => `            <li>${x}</li>`).join('\n');
      const org = b.org ? `\n          <div class="item-org">${b.org}</div>` : '';
      return `        <div class="item">
          <div class="item-top">
            <div class="item-role">${b.peran || ''}</div>
            <div class="item-date">${b.tanggal || ''}</div>
          </div>${org}
          <ul>
${bullets}
          </ul>
        </div>`;
    }
    if (j === 'edu') {
      const note = b.catatan ? `\n          <div class="edu-note">${b.catatan}</div>` : '';
      return `        <div class="edu">
          <div class="edu-line">
            <div class="edu-deg">${b.peran || ''}</div>
            <div class="item-date">${b.tanggal || ''}</div>
          </div>
          <div class="edu-school">${b.org || ''}</div>${note}
        </div>`;
    }
    if (j === 'cert') {
      return `        <div class="cert">
          <div class="cert-name">${b.nama || ''}</div>
          <div class="cert-org">${b.org || ''}</div>
        </div>`;
    }
    if (j === 'skill') {
      const chips = (b.chips || []).map((c) => `<span class="chip">${c}</span>`).join('');
      return `        <div class="skill">
          <div class="skill-cat">${b.kat || ''}</div>
          <div class="chips">${chips}</div>
        </div>`;
    }
    if (j === 'chips_list') {
      const chips = (b.chips || []).map((c) => `<span class="chip">${c}</span>`).join('');
      return `        <div class="chips">${chips}</div>`;
    }
    if (j === 'info') {
      return `        <div class="info-note">${b.html || ''}</div>`;
    }
    return '';
  };

  const renderSec = (s) => {
    const blok = s.blok.map(renderBlok).filter(Boolean).join('\n\n');
    return `      <div class="sec">
        <div class="sec-title">${s.judul}</div>

${blok}
      </div>`;
  };

  const utama = d.utama.map(renderSec).join('\n\n');
  const sisi = d.sisi.map(renderSec).join('\n\n');
  const inner = `<div class="page">

  <!-- HEADER -->
${hdr}

  <!-- PROFIL -->
  <p class="profil">${d.profil}</p>

  <div class="cols">

    <div class="col-main">

${utama}

    </div>

    <div class="col-side">

${sisi}

    </div>
  </div>
</div>`;
  return pageWrap(CV_CSS, d.judul, inner);
}

export function renderSurat(data, varian, isian = {}) {
  const d = data.surat[varian];
  const idn = data.identitas;
  const perusahaan = isian.perusahaan ?? '{perusahaan}';
  const posisi = isian.posisi ?? '{posisi}';
  const tanggal = isian.tanggal || tanggalHariIni();
  const kota = isian.kota || idn.kota_surat || 'Jakarta';
  const nama = `${esc(idn.nama_awal)} <span>${esc(idn.nama_akhir)}</span>`;
  const namaLengkap = `${idn.nama_awal} ${idn.nama_akhir}`;

  // Format penerima "Kepada Yth." — template dengan token {perusahaan}.
  const tmpl = d.penerima || 'Tim Rekrutmen {perusahaan}';
  const penerimaHtml = esc(tmpl)
    .replaceAll('{perusahaan}', `<span class="ph">${esc(perusahaan)}</span>`)
    .replaceAll('{posisi}', `<span class="ph">${esc(posisi)}</span>`)
    .replaceAll('{nama}', esc(namaLengkap));

  const subToken = (t) => t
    .replaceAll('{perusahaan}', esc(perusahaan))
    .replaceAll('{posisi}', esc(posisi))
    .replaceAll('{nama}', esc(namaLengkap));

  const paras = (d.paragraf || []).map((t) => `  <p>${subToken(t)}</p>`).join('\n\n');

  const inner = `<div class="page">
  <div class="ltr-hdr">
    <div>
      <div class="ltr-name">${nama}</div>
      <div class="ltr-sub">${d.sub}</div>
    </div>
    <div class="ltr-contact">
      <div>${esc(idn.email)} · ${esc(idn.telp)}</div>
      <div>${esc(idn.alamat)}</div>
      <div>${esc((idn.tautan || []).join(' · '))}</div>
    </div>
  </div>

  <div class="ltr-meta">
    <p>${esc(kota)}, ${esc(tanggal)}</p>
    <p>Kepada Yth.<br><b>${penerimaHtml}</b></p>
  </div>

  <p class="ltr-subject"><b>Perihal:</b> Lamaran Posisi <b><span class="ph">${esc(posisi)}</span></b></p>

  <p class="ltr-open">Dengan hormat,</p>

${paras}

  <div class="ltr-close">
    <p>Hormat saya,</p>
    <div class="ltr-sign"><p class="nama">${esc(namaLengkap)}</p></div>
  </div>
</div>`;
  return pageWrap(ML_CSS, d.judul, inner);
}
