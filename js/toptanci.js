'use strict';
/* Toptancı sayfası (Stok içinde): ürün listesi, boş palet çeşitleri, palet hesabı ve iadeler, girişler */

// stEdit: toptancı bilgisi düzenleniyor, stRet: palet iade formu açık
var stEdit = false, stRet = false;
function renderSupPanel(t) {
  var ships = shipsOf(t.id).sort(function (a, b) { return cmp(entKey(b), entKey(a)); });
  var debt = supDebt(t.id), L = palLedger(t), month = today().slice(0, 7), mon = 0, koli = 0;
  ships.forEach(function (s) { linesOf(s.id).forEach(function (e) { koli += e.koli; if (s.date.slice(0, 7) === month && e.total != null) mon += e.total; }); });
  var palOpen = L.rows.reduce(function (n, r) { return n + Math.max(0, r.out - r.back); }, 0);
  var h = '<div class="suph"><div><h2>' + esc(t.name) + '</h2>' + (t.note ? '<p class="hint">' + esc(t.note) + '</p>' : '') + '</div>'
    + '<button type="button" data-supedit>' + (stEdit ? 'Kapat' : 'Düzenle') + '</button></div>';
  if (stEdit) {
    h += '<div class="card"><label class="f">Toptancı / firma adı<input id="supName" autocomplete="off" value="' + esc(t.name) + '"></label>'
      + '<label class="f">Not<input id="supNote" autocomplete="off" value="' + esc(t.note || '') + '" placeholder="ör. telefon, plasiyer"></label>'
      + '<p class="err" id="supErr" role="alert"></p>'
      + '<div class="row"><button type="button" class="primary grow" data-supsave>Kaydet</button>'
      + (ships.length ? '' : '<button type="button" class="danger" data-supdel>Toptancıyı sil</button>') + '</div>'
      + (ships.length ? '<p class="hint">Girişi olan toptancı silinemez.</p>' : '') + '</div>';
  }
  h += '<div class="kpis">'
    + kpi('Kalan borç', money(debt), ships.length + ' giriş', debt > 0.004 ? 'bad' : '')
    + kpi('Bu ay alım', money(mon), 'toplam ' + fmt(koli) + ' koli geldi')
    + kpi('İadesi beklenen palet parası', sm(L.open), palOpen ? fmt(palOpen) + ' palet geri verilmedi' : 'ödenen ' + money(L.out) + ' · geri alınan ' + money(L.back), L.open > 0.004 ? 'warn' : '')
    + kpi('Ürün listesi', t.pids.length + ' çeşit', t.pals.length + ' palet çeşidi')
    + '</div>';
  h += '<div class="grid2"><button type="button" class="primary addbtn" data-supentry>+ Ürün girişi</button>'
    + '<button type="button" class="addbtn" data-retopen>' + (stRet ? 'İadeyi kapat' : 'Boş palet iade') + '</button></div>';
  if (stRet) h += retFormHTML(t, L);

  // ürün listesi: girişte bunlar arasından seçilir; girişte yeni yazılan ürün buraya kendiliğinden eklenir
  var cat = supBrands(t);
  h += '<section class="card"><h2>Ürünleri</h2>'
    + (cat.length ? cat.map(function (b) {
      return '<div class="cat"><h3>' + esc(b.name) + '</h3>' + b.ids.map(function (id) {
        return '<div class="catr"><span>' + esc(db.products[id].variety) + '</span><small>' + (inUse(id) ? 'stokta ' + fmt(stockOf(id)) + ' koli' : 'henüz girişi yok') + '</small>'
          + '<button type="button" data-pidrm="' + id + '">Çıkar</button></div>';
      }).join('') + '</div>';
    }).join('') : '<p class="hint">Bu toptancının ürünü yok. Aşağıdan ekle ya da ilk girişte yaz; giriş kaydedilince listeye eklenir.</p>')
    + '<div class="grid2"><label class="f">Marka<input id="supBrand" autocomplete="off" list="dlBrand" autocapitalize="words" placeholder="ör. Maysu"></label>'
    + '<label class="f">Çeşit<input id="supVar" autocomplete="off" list="dlVar" placeholder="ör. 0.5"></label></div>'
    + '<p class="err" id="supPErr" role="alert"></p>'
    + '<button type="button" class="dash" data-pidadd>+ Ürünü listeye ekle</button></section>';

  // boş palet çeşitleri: ad ve palet başı fiyat; kutuda değiştirince kaydedilir
  h += '<section class="card"><div class="fh"><h2>Boş palet çeşitleri</h2><span class="info" tabindex="0" role="button" aria-label="Açıklama">i<span class="tip">Toptancı malı gönderirken boş paletlerin parasını alır, paletleri geri verince parayı iade eder. Her çeşidin palet başı fiyatını yaz; girişte adetleri yazınca palet parası hesaplanır. Adı ya da fiyatı kutuda değiştirince kaydedilir; eski girişler değişmez.</span></span></div>'
    + (t.pals.length ? t.pals.map(function (p) {
      return '<div class="palr" data-pal="' + p.id + '"><input data-pn value="' + esc(p.name) + '" autocomplete="off" aria-label="Palet adı">'
        + '<label class="pr"><input data-pp inputmode="decimal" autocomplete="off" value="' + esc(gnum(amt(p.price))) + '" aria-label="' + esc(p.name) + ' palet başı">₺</label>'
        + '<button type="button" class="danger" data-paldel="' + p.id + '">Sil</button></div>';
    }).join('') : '<p class="hint">Henüz palet çeşidi yok.</p>')
    + '<div class="palr"><input id="palName" autocomplete="off" placeholder="ör. Euro palet" aria-label="Yeni palet adı">'
    + '<label class="pr"><input id="palPrice" inputmode="decimal" autocomplete="off" placeholder="ör. 250" aria-label="Palet başı fiyat">₺</label>'
    + '<button type="button" data-paladd>Ekle</button></div>'
    + '<p class="err" id="palErr" role="alert"></p></section>';

  // palet hesabı: çeşit başına alınan / iade edilen, para olarak bekleyen
  var noLines = ships.filter(function (s) { return s.dep > 0 && !(s.depLines || []).length; }).length;
  h += '<h2>Palet hesabı</h2><div class="tbl">'
    + (L.out || L.back
      ? (L.rows.length ? '<table><thead><tr><th>Palet</th><th>Alınan</th><th>İade</th><th>Bende</th></tr></thead><tbody>'
        + L.rows.map(function (r) { var o = r.out - r.back; return '<tr><td>' + esc(r.name) + '</td><td>' + fmt(r.out) + '</td><td>' + fmt(r.back) + '</td><td' + (o < 0 ? ' class="neg"' : '') + '><b>' + fmt(o) + '</b></td></tr>'; }).join('')
        + '</tbody></table>' : '')
        + '<p class="hint" style="padding:8px 10px">Ödenen palet parası ' + money(L.out) + ' · geri alınan ' + money(L.back) + ' · <b>bekleyen ' + sm(L.open) + '</b>'
        + (noLines ? '<br>' + noLines + ' girişte palet çeşidi yazılmamış; o paletler adet olarak sayılmadı.' : '') + '</p>'
      : '<div class="empty" style="border:0">Henüz palet parası yok.</div>')
    + '</div>';
  var rets = t.rets.slice().sort(function (a, b) { return cmp(b.date + ' ' + b.ts, a.date + ' ' + a.ts); });
  if (rets.length) {
    h += '<div class="list">' + rets.map(function (r) {
      return '<div class="ret"><div class="sh"><span class="d">' + dateTR(r.date) + ' palet iadesi</span><b>+' + money(r.amount) + '</b></div>'
        + (r.lines.length ? '<small>' + depLinesTxt(r.lines) + '</small>' : '')
        + (r.note ? '<span class="note">' + esc(r.note) + '</span>' : '')
        + '<div class="acts"><button type="button" class="danger" data-retdel="' + r.id + '">Sil</button></div></div>';
    }).join('') + '</div>';
  }

  h += '<h2>Girişleri</h2><div class="list ships">' + (ships.length ? ships.slice(0, stLimit).map(shipHTML).join('') : '<div class="empty">Bu toptancıdan giriş yok.</div>') + '</div>';
  if (ships.length > stLimit) h += '<button type="button" data-stmore>Daha fazla göster (' + (ships.length - stLimit) + ' giriş daha)</button>';
  $('stSup').innerHTML = h;
}

/* ---------- boş palet iadesi ---------- */
// çeşit başına adet (palet başı fiyat değiştirilebilir); geri alınan para boşsa adet × fiyattan hesaplanır
function retFormHTML(t, L) {
  var bende = {};
  L.rows.forEach(function (r) { bende[fold(r.name)] = r.out - r.back; });
  return '<div class="card retf"><h2>Boş palet iadesi</h2>'
    + t.pals.map(function (p) {
      var o = bende[fold(p.name)];
      return '<div class="grid3"><div class="f ro"><span>Palet</span><output>' + esc(p.name) + '</output></div>'
        + '<label class="f">Palet başı (₺)<input data-rp="' + p.id + '" inputmode="decimal" autocomplete="off" value="' + esc(gnum(amt(p.price))) + '"></label>'
        + '<label class="f">İade adedi<input data-rn="' + p.id + '" inputmode="decimal" autocomplete="off" placeholder="' + (o > 0 ? 'bende ' + fmt(o) : 'ör. 5') + '"></label></div>';
    }).join('')
    + (t.pals.length ? '' : '<p class="hint">Palet çeşidi yok; sadece geri aldığın parayı yazabilirsin.</p>')
    + '<div class="grid2"><label class="f">Geri alınan para (₺)<input id="rtAmt" inputmode="decimal" autocomplete="off" placeholder="Boşsa hesaplanır"></label>'
    + '<label class="f">Tarih<input type="date" id="rtDate" value="' + today() + '"></label></div>'
    + '<label class="f">Not<input id="rtNote" autocomplete="off" placeholder="ör. 2 palet kırık, eksik ödedi"></label>'
    + '<p class="err" id="rtErr" role="alert"></p>'
    + '<div class="row"><button type="button" class="paidbtn grow" data-retsave>İadeyi kaydet</button><button type="button" data-retopen>Vazgeç</button></div></div>';
}
function readRet(t) {
  var r = { lines: [], calc: 0, err: '' };
  document.querySelectorAll('#stSup [data-rn]').forEach(function (x) {
    var raw = x.value.trim(), n = num(raw), p = byId(t.pals, x.dataset.rn), pr = num(document.querySelector('#stSup [data-rp="' + x.dataset.rn + '"]').value);
    if (!raw || !p) return;
    if (n == null || n <= 0) { r.err = r.err || p.name + ' için adedi sayı olarak yaz.'; return; }
    if (pr == null) { r.err = r.err || p.name + ' için palet başı fiyatı yaz.'; return; }
    r.lines.push({ pal: p.id, name: p.name, price: pr, n: n }); r.calc += n * pr;
  });
  r.calc = Math.round(r.calc * 100) / 100;
  return r;
}
function retCalc() {
  var t = supOf(stSup), r = t && readRet(t);
  if (r && $('rtAmt')) $('rtAmt').placeholder = r.calc ? '= ' + fmt(r.calc) : 'Boşsa hesaplanır';
}
function saveRet() {
  var t = supOf(stSup); if (!t) return;
  var r = readRet(t), raw = $('rtAmt').value.trim(), a = raw ? num(raw) : r.calc, d = $('rtDate').value, err = r.err;
  if (!err && !r.lines.length && !raw) err = 'İade ettiğin palet adedini ya da geri aldığın parayı yaz.';
  else if (!err && (a == null || a <= 0)) err = 'Geri alınan parayı sayı olarak yaz, ör. 1250.';
  else if (!err && !d) err = 'Tarihi seç.';
  if (err) { $('rtErr').textContent = err; return; }
  t.rets.push({ id: 'r' + uid(), ts: Date.now(), date: d, lines: r.lines, amount: a, note: clean($('rtNote').value) });
  if (!persist()) return;
  stRet = false; renderAll();
  toast('Palet iadesi kaydedildi: ' + money(a));
}
function deleteRet(id) {
  var t = supOf(stSup); if (!t) return;
  t.rets = t.rets.filter(function (r) { return r.id !== id; });
  persist(); renderAll(); toast('Palet iadesi silindi.');
}

/* ---------- toptancı bilgisi, ürün listesi, palet çeşitleri ---------- */
function saveSupInfo() {
  var t = supOf(stSup), name = clean($('supName').value), o = findSup(name);
  if (!name) { $('supErr').textContent = 'Toptancının adını yaz.'; return; }
  if (o && o !== t) { $('supErr').textContent = o.name + ' adında başka bir toptancı var.'; return; }
  t.name = name; t.note = clean($('supNote').value);
  if (!persist()) return;
  stEdit = false; renderAll(); toast('Toptancı kaydedildi.');
}
function deleteSup() {
  var t = supOf(stSup); if (!t || shipsOf(t.id).length) return;
  db.sups = db.sups.filter(function (x) { return x !== t; });
  tidy(); persist();
  pickSup(''); renderAll(); toast(t.name + ' silindi.');
}
function addSupProduct() {
  var t = supOf(stSup), b = clean($('supBrand').value), v = clean($('supVar').value);
  if (!b || !v) { $('supPErr').textContent = 'Marka ve çeşidi yaz.'; return; }
  var pid = findProduct(b, v);
  if (pid && t.pids.indexOf(pid) >= 0) { $('supPErr').textContent = pname(pid) + ' zaten listede.'; return; }
  pid = ensureProduct(b, v);
  supAddPid(t, pid);
  if (!persist()) return;
  renderAll();
  $('supBrand').value = db.products[pid].brand; $('supVar').focus(); // aynı markadan bir sonraki çeşit
  toast(pname(pid) + ' listeye eklendi.');
}
function removeSupProduct(pid) {
  var t = supOf(stSup); if (!t) return;
  t.pids = t.pids.filter(function (x) { return x !== pid; });
  var n = pname(pid);
  tidy(); persist(); renderAll(); toast(n + ' listeden çıkarıldı.');
}
function addPal() {
  var t = supOf(stSup), name = clean($('palName').value), raw = $('palPrice').value.trim(), pr = num(raw);
  if (!name) { $('palErr').textContent = 'Palet çeşidinin adını yaz.'; return; }
  if (findPal(t, name)) { $('palErr').textContent = name + ' zaten var; fiyatını yukarıdan değiştir.'; return; }
  if (!raw || pr == null) { $('palErr').textContent = 'Palet başı fiyatı sayı olarak yaz, ör. 250.'; return; }
  ensurePal(t, name, pr);
  if (!persist()) return;
  renderAll(); toast(name + ' eklendi: palet başı ' + money(pr));
}
// palet çeşidinin adı ya da fiyatı kutuda değişince kaydedilir
function editPal(row) {
  var t = supOf(stSup), p = t && byId(t.pals, row.dataset.pal); if (!p) return;
  var nIn = row.querySelector('[data-pn]'), pIn = row.querySelector('[data-pp]');
  var name = clean(nIn.value), pr = num(pIn.value), o = findPal(t, name);
  if (!name || (o && o !== p)) { toast(!name ? 'Palet adı boş olamaz.' : name + ' zaten var.'); nIn.value = p.name; return; }
  if (pr == null) { toast('Palet başı fiyatı sayı olarak yaz.'); pIn.value = gnum(amt(p.price)); return; }
  p.name = name; p.price = pr;
  if (!persist()) return;
  toast(name + ': palet başı ' + money(pr) + ' kaydedildi.');
}
function deletePal(id) {
  var t = supOf(stSup); if (!t) return;
  t.pals = t.pals.filter(function (p) { return p.id !== id; });
  persist(); renderAll(); toast('Palet çeşidi silindi; eski girişlerdeki paletler hesapta kalır.');
}

$('stSup').addEventListener('click', function (ev) {
  var b = ev.target.closest('button'); if (!b) return;
  var d = b.dataset;
  if (d.supedit != null) { stEdit = !stEdit; renderStock(); if (stEdit) $('supName').focus(); }
  else if (d.supsave != null) saveSupInfo();
  else if (d.supdel != null) arm(b, deleteSup);
  else if (d.supentry != null) openEntry(null, null, stSup);
  else if (d.retopen != null) {
    stRet = !stRet; renderStock();
    var f = stRet && (document.querySelector('#stSup [data-rn]') || $('rtAmt')); if (f) f.focus();
  }
  else if (d.retsave != null) saveRet();
  else if (d.retdel) arm(b, function () { deleteRet(d.retdel); });
  else if (d.pidadd != null) addSupProduct();
  else if (d.pidrm) removeSupProduct(d.pidrm);
  else if (d.paladd != null) addPal();
  else if (d.paldel) arm(b, function () { deletePal(d.paldel); });
  else if (d.stmore != null) { stLimit += 15; renderStock(); }
});
$('stSup').addEventListener('change', function (ev) { var row = ev.target.closest('.palr[data-pal]'); if (row) editPal(row); });
$('stSup').addEventListener('input', function (ev) {
  var t = ev.target;
  if (t.dataset.rn != null || t.dataset.rp != null) retCalc();
  ['supErr', 'supPErr', 'palErr', 'rtErr'].forEach(function (id) { if ($(id)) $(id).textContent = ''; });
});
$('stSup').addEventListener('keydown', function (ev) {
  if (ev.key !== 'Enter') return;
  var id = ev.target.id;
  if (id === 'supBrand' || id === 'supVar') addSupProduct();
  else if (id === 'palName' || id === 'palPrice') addPal();
  else if (id === 'supName' || id === 'supNote') saveSupInfo();
});
// çeşit önerileri yazılan markaya göre
$('stSup').addEventListener('focusin', function (ev) { if (ev.target.id === 'supVar') fillDatalists($('supBrand').value); else if (ev.target.id === 'supBrand') fillDatalists(); });
