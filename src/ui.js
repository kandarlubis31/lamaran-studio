// ui.js — render form di 4 tab + handler inline (di-expose ke window).
// Semua perubahan lewat setPath/setLines/setCommas -> state.data -> markChange.
import { state, fotoToDataUrl } from './store.js';
import { markChange, setStatus } from './activity.js';

const $ = (s) => document.querySelector(s);

export const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

function setByPath(obj, path, value) {
  const segs = path.split('.');
  let cur = obj;
  for (let i = 0; i < segs.length - 1; i++) cur = cur[segs[i]];
  cur[segs[segs.length - 1]] = value;
}

/* ======================= handler global (inline) ===================== */
window.setPath = (path, value) => { setByPath(state.data, path, value); markChange(); };
window.setLines = (path, txt) => window.setPath(path, txt.split('\n').filter(Boolean));
window.setCommas = (path, txt) => window
  .setPath(path, txt.split(',').map((s) => s.trim()).filter(Boolean));

window.renderCV = () => { renderCV(); };
window.renderSurat = () => { renderSurat(); };

window.ubahFoto = async (input) => {
  const f = input.files[0];
  if (!f) return;
  try {
    state.data.identitas.foto = await fotoToDataUrl(f);
    markChange();
    renderDiri();
    setStatus('✓ foto disimpan lokal (data URL di browser)');
  } catch (e) {
    setStatus('✖ ' + e.message, true);
  }
  input.value = '';
};
window.hapusFoto = () => {
  state.data.identitas.foto = '';
  markChange();
  renderDiri();
};

window.tambahBlok = (v, arr, si, jenis) => {
  const blank = {
    item: { jenis, peran: '', tanggal: '', org: '', bullet: [] },
    edu: { jenis, peran: '', tanggal: '', org: '', catatan: '' },
    skill: { jenis, kat: '', chips: [] },
    cert: { jenis, nama: '', org: '' },
    chips_list: { jenis, chips: [] },
    info: { jenis, html: '' },
  }[jenis];
  state.data.cv[v][arr][si].blok.push(blank);
  renderCV();
  markChange();
};
window.hapusBlok = (v, arr, si, bi) => {
  if (!confirm('Hapus blok ini? (bisa di-undo dengan Ctrl+Z)')) return;
  state.data.cv[v][arr][si].blok.splice(bi, 1);
  renderCV();
  markChange();
};
window.geserBlok = (v, arr, si, bi, d) => {
  const a = state.data.cv[v][arr][si].blok;
  const j = bi + d;
  if (j < 0 || j >= a.length) return;
  [a[bi], a[j]] = [a[j], a[bi]];
  renderCV();
  markChange();
};
window.tambahSection = (v, arr) => {
  const j = prompt('Judul bagian baru:', 'Bagian Baru');
  if (!j) return;
  state.data.cv[v][arr].push({ judul: j, blok: [] });
  renderCV();
  markChange();
};

window.tambahPar = (v) => {
  state.data.surat[v].paragraf.push('Paragraf baru…');
  renderSurat();
  markChange();
};
window.hapusPar = (v, pi) => {
  if (!confirm('Hapus paragraf ini? (bisa di-undo dengan Ctrl+Z)')) return;
  state.data.surat[v].paragraf.splice(pi, 1);
  renderSurat();
  markChange();
};
window.geserPar = (v, pi, d) => {
  const a = state.data.surat[v].paragraf;
  const j = pi + d;
  if (j < 0 || j >= a.length) return;
  [a[pi], a[j]] = [a[j], a[pi]];
  renderSurat();
  markChange();
};

window.pilihTab = (t) => {
  document.querySelectorAll('nav.tab button').forEach((b) => b.classList.toggle('aktif', b.dataset.tab === t));
  document.querySelectorAll('.tabpane').forEach((p) => { p.style.display = 'none'; });
  $('#tab-' + t).style.display = 'block';
};

/* ============================== render =============================== */
export function renderDiri() {
  const i = state.data.identitas;
  $('#tab-diri').innerHTML = `
  <div class="kartu">
    <h3>Identitas</h3>
    <div class="row2">
      <div><label class="f">Nama depan</label><input type="text" value="${esc(i.nama_awal)}" oninput="setPath('identitas.nama_awal', this.value)"></div>
      <div><label class="f">Nama belakang</label><input type="text" value="${esc(i.nama_akhir)}" oninput="setPath('identitas.nama_akhir', this.value)"></div>
    </div>
    <label class="f">No. HP</label><input type="text" value="${esc(i.telp)}" oninput="setPath('identitas.telp', this.value)">
    <label class="f">Email</label><input type="text" value="${esc(i.email)}" oninput="setPath('identitas.email', this.value)">
    <label class="f">Alamat</label><input type="text" value="${esc(i.alamat)}" oninput="setPath('identitas.alamat', this.value)">
    <label class="f">Tautan (satu baris satu tautan)</label>
    <textarea rows="3" oninput="setLines('identitas.tautan', this.value)">${esc(i.tautan.join('\n'))}</textarea>
    <label class="f">Kota pada surat</label><input type="text" value="${esc(i.kota_surat)}" oninput="setPath('identitas.kota_surat', this.value)">
    <label class="f">Foto profil (opsional — disimpan di browser)</label>
    <div class="foto-row">
      ${i.foto ? `<img src="${i.foto}" alt="foto profil" class="foto-thumb"><button class="mini hapus" onclick="hapusFoto()">✕ hapus foto</button>` : ''}
      <input type="file" accept="image/*" onchange="ubahFoto(this)">
    </div>
    <p class="hint">Foto otomatis diperkecil (maks 900px JPEG) supaya hemat penyimpanan browser. Tidak dikirim ke mana pun.</p>
  </div>`;
}

function blokForm(v, arr, si, bi, b, total) {
  const P = `cv.${v}.${arr}.${si}.blok.${bi}`;
  const jenis = {
    item: 'Pengalaman', edu: 'Pendidikan', skill: 'Keahlian',
    cert: 'Sertifikat', chips_list: 'Chips', info: 'Info',
  }[b.jenis] || b.jenis;
  let inner = '';
  if (b.jenis === 'item') {
    inner = `<div class="row2">
        <div><label class="f">Peran/jabatan</label><input type="text" value="${esc(b.peran)}" oninput="setPath('${P}.peran', this.value)"></div>
        <div><label class="f">Tanggal</label><input type="text" value="${esc(b.tanggal)}" oninput="setPath('${P}.tanggal', this.value)"></div>
      </div>
      <label class="f">Instansi/organisasi</label><input type="text" value="${esc(b.org)}" oninput="setPath('${P}.org', this.value)">
      <label class="f">Poin pencapaian (satu baris satu poin, boleh &lt;b&gt;)</label>
      <textarea rows="${Math.max(2, (b.bullet || []).length)}" oninput="setLines('${P}.bullet', this.value)">${esc((b.bullet || []).join('\n'))}</textarea>`;
  } else if (b.jenis === 'edu') {
    inner = `<div class="row2">
        <div><label class="f">Jenjang/nama</label><input type="text" value="${esc(b.peran)}" oninput="setPath('${P}.peran', this.value)"></div>
        <div><label class="f">Tanggal</label><input type="text" value="${esc(b.tanggal)}" oninput="setPath('${P}.tanggal', this.value)"></div>
      </div>
      <label class="f">Institusi</label><input type="text" value="${esc(b.org)}" oninput="setPath('${P}.org', this.value)">
      <label class="f">Catatan (opsional)</label><input type="text" value="${esc(b.catatan || '')}" oninput="setPath('${P}.catatan', this.value)">`;
  } else if (b.jenis === 'skill') {
    inner = `<label class="f">Kategori</label><input type="text" value="${esc(b.kat)}" oninput="setPath('${P}.kat', this.value)">
      <label class="f">Keahlian (pisahkan dengan koma)</label>
      <input type="text" value="${esc((b.chips || []).join(', '))}" oninput="setCommas('${P}.chips', this.value)">`;
  } else if (b.jenis === 'cert') {
    inner = `<label class="f">Nama sertifikat</label><input type="text" value="${esc(b.nama)}" oninput="setPath('${P}.nama', this.value)">
      <label class="f">Penerbit · tahun</label><input type="text" value="${esc(b.org)}" oninput="setPath('${P}.org', this.value)">`;
  } else if (b.jenis === 'chips_list') {
    inner = `<label class="f">Chips (pisahkan dengan koma)</label>
      <input type="text" value="${esc((b.chips || []).join(', '))}" oninput="setCommas('${P}.chips', this.value)">`;
  } else if (b.jenis === 'info') {
    inner = `<label class="f">Isi (boleh pakai &lt;b&gt;)</label>
      <textarea rows="3" oninput="setPath('${P}.html', this.value)">${esc(b.html || '')}</textarea>`;
  }
  return `<div class="blok"><span class="tag">${jenis}</span>
    <div style="text-align:right;margin-top:-18px">
      <button class="mini" ${bi === 0 ? 'disabled' : ''} onclick="geserBlok('${v}','${arr}',${si},${bi},-1)" title="Naik">↑</button>
      <button class="mini" ${bi === total - 1 ? 'disabled' : ''} onclick="geserBlok('${v}','${arr}',${si},${bi},1)" title="Turun">↓</button>
      <button class="mini hapus" onclick="hapusBlok('${v}','${arr}',${si},${bi})" title="Hapus">✕</button>
    </div>
    ${inner}</div>`;
}

export function renderCV() {
  const v = $('#cv-varian')?.value || 'it';
  const c = state.data.cv[v];
  // ingat bagian mana yang sedang terbuka, supaya re-render tidak menutupnya
  const openSet = new Set();
  document.querySelectorAll('#tab-cv details.section').forEach((el, i) => {
    if (el.open) openSet.add(i);
  });

  let html = `
  <div class="kartu">
    <h3>Varian CV</h3>
    <select id="cv-varian" onchange="renderCV()">
      <option value="it" ${v === 'it' ? 'selected' : ''}>IT (support/jaringan/server)</option>
      <option value="umum" ${v === 'umum' ? 'selected' : ''}>Umum (administrasi/CS/umum)</option>
    </select>
    <label class="f">Judul dokumen</label><input type="text" value="${esc(c.judul)}" oninput="setPath('cv.${v}.judul', this.value)">
    <label class="f">Baris peran di header</label><input type="text" value="${esc(c.hdr_role)}" oninput="setPath('cv.${v}.hdr_role', this.value)">
    <label class="f">Ringkasan profil (boleh pakai &lt;b&gt;tebal&lt;/b&gt;)</label>
    <textarea rows="5" oninput="setPath('cv.${v}.profil', this.value)">${esc(c.profil)}</textarea>
  </div>`;

  const kolom = (judul, arr) => {
    let s = `<div class="kartu"><h3>${judul}</h3>`;
    c[arr].forEach((sec, si) => {
      const n = sec.blok.length;
      s += `<details class="section" ${si === 0 ? 'open' : ''}><summary>§ ${esc(sec.judul)} <span style="font-weight:400;color:var(--muted);font-size:11px">(${n} blok)</span></summary><div class="isi">
        <label class="f">Judul bagian</label>
        <input type="text" value="${esc(sec.judul)}" oninput="setPath('cv.${v}.${arr}.${si}.judul', this.value)">
        <div style="margin-top:8px">`;
      sec.blok.forEach((b, bi) => { s += blokForm(v, arr, si, bi, b, n); });
      s += `</div><div class="baris-aksi">
        <button class="mini" onclick="tambahBlok('${v}','${arr}',${si},'item')">+ Pengalaman</button>
        <button class="mini" onclick="tambahBlok('${v}','${arr}',${si},'edu')">+ Pendidikan</button>
        <button class="mini" onclick="tambahBlok('${v}','${arr}',${si},'skill')">+ Keahlian</button>
        <button class="mini" onclick="tambahBlok('${v}','${arr}',${si},'cert')">+ Sertifikat</button>
        <button class="mini" onclick="tambahBlok('${v}','${arr}',${si},'chips_list')">+ Chips</button>
        <button class="mini" onclick="tambahBlok('${v}','${arr}',${si},'info')">+ Info</button>
      </div></div></details>`;
    });
    s += `<div class="baris-aksi"><button class="mini" onclick="tambahSection('${v}','${arr}')">+ Bagian baru</button></div></div>`;
    return s;
  };

  html += kolom('Kolom Utama (kiri)', 'utama') + kolom('Sidebar (kanan)', 'sisi');
  $('#tab-cv').innerHTML = html;
  const dets = document.querySelectorAll('#tab-cv details.section');
  if (openSet.size) dets.forEach((el, i) => { el.open = openSet.has(i); });
}

export function renderSurat() {
  const v = $('#sr-varian')?.value || 'it';
  const s = state.data.surat[v];
  const openSet = new Set();
  document.querySelectorAll('#tab-surat details.section').forEach((el, i) => {
    if (el.open) openSet.add(i);
  });

  let html = `
  <details class="section" open><summary>Pengaturan surat — varian ${v === 'it' ? 'IT' : 'Umum'}</summary><div class="isi">
    <label class="f">Varian</label>
    <select id="sr-varian" onchange="renderSurat()">
      <option value="it" ${v === 'it' ? 'selected' : ''}>IT (dukungan teknis)</option>
      <option value="umum" ${v === 'umum' ? 'selected' : ''}>Umum (administrasi/CS)</option>
    </select>
    <label class="f">Judul dokumen</label><input type="text" value="${esc(s.judul)}" oninput="setPath('surat.${v}.judul', this.value)">
    <label class="f">Baris sub-header</label><input type="text" value="${esc(s.sub)}" oninput="setPath('surat.${v}.sub', this.value)">
    <label class="f">Format penerima "Kepada Yth."</label>
    <input type="text" list="opt-penerima" value="${esc(s.penerima)}" oninput="setPath('surat.${v}.penerima', this.value)">
    <datalist id="opt-penerima">
      <option value="Tim Rekrutmen {perusahaan}"></option>
      <option value="Bapak/Ibu HRD {perusahaan}"></option>
      <option value="Bapak/Ibu Manajer Personalia {perusahaan}"></option>
      <option value="{perusahaan}"></option>
      <option value="Tim Rekrutmen"></option>
    </datalist>
    <p class="hint">Token <span class="token">{perusahaan}</span> <span class="token">{posisi}</span> <span class="token">{nama}</span> di paragraf & penerima otomatis diganti sesuai form export.</p>
  </div></details>`;

  s.paragraf.forEach((p, pi) => {
    const n = s.paragraf.length;
    html += `<details class="section" ${pi === 0 ? 'open' : ''}><summary>Paragraf ${pi + 1} <span style="font-weight:400;color:var(--muted);font-size:11px">(${p.length} kar.)</span></summary><div class="isi">
      <div style="text-align:right;margin-top:0">
        <button class="mini" ${pi === 0 ? 'disabled' : ''} onclick="geserPar('${v}',${pi},-1)">↑</button>
        <button class="mini" ${pi === n - 1 ? 'disabled' : ''} onclick="geserPar('${v}',${pi},1)">↓</button>
        <button class="mini hapus" onclick="hapusPar('${v}',${pi})">✕ hapus</button>
      </div>
      <textarea rows="5" oninput="setPath('surat.${v}.paragraf.${pi}', this.value)">${esc(p)}</textarea>
    </div></details>`;
  });
  html += `<div class="kartu"><button class="mini" onclick="tambahPar('${v}')">+ Paragraf baru</button></div>`;
  $('#tab-surat').innerHTML = html;
  const dets = document.querySelectorAll('#tab-surat details.section');
  if (openSet.size) dets.forEach((el, i) => { el.open = openSet.has(i); });
}

export function renderRiwayat() {
  const l = state.data.lamaran || [];
  let html = `<div class="kartu"><h3>Riwayat export lamaran (${l.length})</h3>`;
  if (!l.length) {
    html += `<p class="hint">Belum ada. Isi perusahaan + posisi di panel export (kanan bawah) lalu Export — otomatis tercatat. Klik entri untuk mengisi ulang form export.</p>`;
  }
  l.forEach((x, i) => {
    html += `<div class="blok riwayat-item" onclick="pakaiLamaran(${i})" title="Klik untuk isi ulang form export">
      <b>${esc(x.perusahaan || '-')}</b> — ${esc(x.posisi || '-')}<br>
      <span class="hint">${esc(x.tanggal || '')} · ${esc(x.doc === 'surat' ? 'Surat' : 'CV')}${x.varian ? ' / ' + esc(x.varian) : ''}${x.folder ? ' · ' + esc(x.folder) : ''}</span>
    </div>`;
  });
  html += `</div>`;
  $('#tab-riwayat').innerHTML = html;
}

export function renderAll() {
  renderDiri();
  renderCV();
  renderSurat();
  renderRiwayat();
}
