'use strict';
/* Toptancı sayfası (Stok içinde): hesap (girişler ve ödemeler), palet hesabı, ürün listesi, palet çeşitleri, girişler.
   Eklemeler ve düzeltmeler tek bir pencereden (dlgSup) yapılır */

mountDialog(`
<dialog id="dlgSup" aria-labelledby="sdT"><div class="sheet">
  <header><h2 id="sdT"></h2><button type="button" data-close>Kapat</button></header>
  <div class="col" id="sdBody"></div>
  <p class="hint" id="sdHint"></p>
  <p class="err" id="sdErr" role="alert"></p>
  <div class="row">
    <button type="button" class="primary grow" id="sdSave"></button>
    <button type="button" class="danger" id="sdDel" hidden>Sil</button>
  </div>
</div></dialog>`);

function renderSupPanel(t) {
  var ships = shipsOf(t.id).sort(function (a, b) { return cmp(entKey(b), entKey(a)); });
  var A = supAccount(t), L = palLedger(t), month = today().slice(0, 7), mon = 0;
  ships.forEach(function (s) { linesOf(s.id).forEach(function (e) { if (s.date.slice(0, 7) === month && e.total != null) mon += e.total; }); });
  var bende = L.rows.reduce(function (n, r) { return n + Math.max(0, r.out - r.giv); }, 0);
  var h = '<div class="suph"><div><h2>' + esc(t.name) + '</h2>' + (t.note ? '<p class="hint">' + esc(t.note) + '</p>' : '') + '</div>'
    + '<button type="button" data-sd="bilgi">Düzenle</button></div>';
  h += '<div class="kpis">'
    + kpi(A.rem < -0.004 ? 'Avans (fazla ödenen)' : 'Kalan borç', money(Math.abs(A.rem)), 'girişler ' + money(A.due) + ' · ödenen ' + money(A.paid), A.rem > 0.004 ? 'bad' : 'ok')
    + kpi('Bu ay alım', money(mon), ships.length + ' giriş')
    + kpi('Bendeki boş palet', fmt(bende) + ' palet', 'palet parası ' + money(L.out) + ' · geri alınan ' + money(L.back))
    + kpi('Palet parası alacağım', sm(L.claim), 'verdiğim paletlerin parası ' + money(L.given), L.claim > 0.004 ? 'warn' : '')
    + '</div>';
  h += '<div class="grid2 supacts">'
    + '<button type="button" class="primary addbtn" data-supentry>+ Ürün girişi</button>'
    + '<button type="button" class="paidbtn addbtn" data-sd="odeme">Ödeme yap</button>'
    + '<button type="button" class="addbtn" data-sd="ver">Boş palet verdim</button>'
    + '<button type="button" class="addbtn" data-sd="iade">Palet parası aldım</button></div>';

  // hesap hareketleri: girişlerin tutarı borca, ödemeler toplamdan düşer; en yeni üstte, kalan o ana kadarki
  var mv = ships.map(function (s) {
    var koli = linesOf(s.id).reduce(function (n, e) { return n + e.koli; }, 0);
    return { k: entKey(s), date: s.date, txt: 'Giriş · ' + fmt(koli) + ' koli', due: shipDue(s), ship: s.id };
  }).concat(t.pays.map(function (x) {
    return { k: x.date + ' ~ ' + x.ts, date: x.date, txt: 'Ödeme' + (x.note ? ' · ' + esc(x.note) : ''), paid: x.amount, pay: x.id };
  })).sort(function (a, b) { return cmp(a.k, b.k); });
  var bal = 0;
  mv.forEach(function (m) { bal += (m.due || 0) - (m.paid || 0); m.bal = bal; });
  h += '<h2>Hesap</h2><div class="tbl">' + (mv.length
    ? '<table><thead><tr><th>Tarih</th><th>Hareket</th><th>Borç</th><th>Ödeme</th><th>Kalan</th></tr></thead><tbody>'
      + mv.reverse().map(function (m) {
        return '<tr' + (m.ship ? ' class="tap" data-ship="' + m.ship + '"' : '') + '><td>' + dateTR(m.date) + '</td>'
          + '<td class="mv">' + m.txt + (m.pay ? ' <button type="button" class="lnk danger" data-paydel="' + m.pay + '">sil</button>' : '') + '</td>'
          + '<td>' + (m.due != null ? money(m.due) : '') + '</td><td>' + (m.paid != null ? money(m.paid) : '') + '</td>'
          + '<td' + (m.bal > 0.004 ? ' class="neg"' : '') + '>' + sm(m.bal) + '</td></tr>';
      }).join('') + '</tbody>'
      + '<tfoot><tr><td></td><td>Toplam</td><td>' + money(A.due) + '</td><td>' + money(A.paid) + '</td><td>' + sm(A.rem) + '</td></tr></tfoot></table>'
    : '<div class="empty" style="border:0">Henüz giriş ya da ödeme yok.</div>') + '</div>';

  // palet hesabı: çeşit başına alınan, geri verilen, bende; altta verdiklerim ve geri aldığım paralar
  var noLines = ships.filter(function (s) { return s.dep > 0 && !(s.depLines || []).length; }).length;
  h += '<h2>Palet hesabı</h2><div class="tbl">'
    + (L.rows.some(function (r) { return r.out || r.giv; }) ? '<table><thead><tr><th>Palet</th><th>Alınan</th><th>Verdim</th><th>Bende</th><th>Verdiklerimin parası</th></tr></thead><tbody>'
      + L.rows.map(function (r) { var o = r.out - r.giv; return '<tr><td>' + esc(r.name) + '</td><td>' + fmt(r.out) + '</td><td>' + fmt(r.giv) + '</td><td' + (o < 0 ? ' class="neg"' : '') + '><b>' + fmt(o) + '</b></td><td>' + money(r.val) + '</td></tr>'; }).join('')
      + '</tbody></table>' : '')
    + '<p class="hint" style="padding:8px 10px">Girişlerde palet parası ' + money(L.out) + ' · verdiğim paletlerin parası ' + money(L.given) + ' · geri aldığım ' + money(L.back)
      + ' · <b>alacağım ' + sm(L.claim) + '</b><br>Verdiğim paletlerin parası, en eski alımın fiyatından başlayarak hesaplanır.'
      + (noLines ? '<br>' + noLines + ' girişte palet çeşidi yazılmamış; o paletler adet olarak sayılmadı.' : '') + '</p></div>';
  var pm = t.gives.map(function (g) {
    return { k: g.date + ' ' + g.ts, h: '<div class="ret give"><div class="sh"><span class="d">' + dateTR(g.date) + ' boş palet verdim</span><b>' + fmt(g.lines.reduce(function (n, l) { return n + l.n; }, 0)) + ' palet</b></div>'
      + '<small>' + depLinesTxt(g.lines) + '</small>' + (g.note ? '<span class="note">' + esc(g.note) + '</span>' : '')
      + '<div class="acts"><button type="button" class="danger" data-givedel="' + g.id + '">Sil</button></div></div>' };
  }).concat(t.refs.map(function (x) {
    return { k: x.date + ' ' + x.ts, h: '<div class="ret"><div class="sh"><span class="d">' + dateTR(x.date) + ' palet parası aldım</span><b>+' + money(x.amount) + '</b></div>'
      + (x.note ? '<span class="note">' + esc(x.note) + '</span>' : '')
      + '<div class="acts"><button type="button" class="danger" data-refdel="' + x.id + '">Sil</button></div></div>' };
  })).sort(function (a, b) { return cmp(b.k, a.k); });
  if (pm.length) h += '<div class="list">' + pm.map(function (x) { return x.h; }).join('') + '</div>';

  // ürün listesi: girişte bunlar arasından seçilir; girişte yeni yazılan ürün buraya kendiliğinden eklenir
  var cat = supBrands(t);
  h += '<section class="card"><div class="cardh"><h2>Ürünleri</h2><button type="button" class="dash" data-sd="urun">+ Ürün ekle</button></div>'
    + (cat.length ? cat.map(function (b) {
      return '<div class="cat"><h3>' + esc(b.name) + '</h3>' + b.ids.map(function (id) {
        return '<div class="catr"><span>' + esc(db.products[id].variety) + '</span><small>' + (inUse(id) ? 'stokta ' + fmt(stockOf(id)) + ' koli' : 'henüz girişi yok') + '</small>'
          + '<button type="button" data-pidrm="' + id + '">Çıkar</button></div>';
      }).join('') + '</div>';
    }).join('') : '<p class="hint">Bu toptancının ürünü yok. "+ Ürün ekle" ile ekle ya da ilk girişte yaz; giriş kaydedilince listeye eklenir.</p>')
    + '</section>';

  // boş palet çeşitleri: sadece ad; fiyat her girişte o alımın fiyatı olarak yazılır
  h += '<section class="card"><div class="cardh"><h2>Boş palet çeşitleri</h2><button type="button" class="dash" data-sd="palet">+ Palet çeşidi</button></div>'
    + (t.pals.length ? t.pals.map(function (p) {
      var r = L.rows.filter(function (x) { return x.name === p.name; })[0], last = lastPalPrice(t, p.id);
      return '<div class="catr"><span>' + esc(p.name) + '</span><small>' + (r ? 'bende ' + fmt(r.out - r.giv) : '') + (last != null ? ' · son fiyat ' + money(last) : '') + '</small>'
        + '<button type="button" data-sd="palet" data-ref="' + p.id + '">Düzenle</button></div>';
    }).join('') : '<p class="hint">Henüz palet çeşidi yok. Palet fiyatını her girişte o alımın fiyatı olarak yazarsın.</p>')
    + '</section>';

  h += '<h2>Girişleri</h2><div class="list ships">' + (ships.length ? ships.slice(0, stLimit).map(shipHTML).join('') : '<div class="empty">Bu toptancıdan giriş yok.</div>') + '</div>';
  if (ships.length > stLimit) h += '<button type="button" data-stmore>Daha fazla göster (' + (ships.length - stLimit) + ' giriş daha)</button>';
  $('stSup').innerHTML = h;
}

/* ---------- pencere: toptancı bilgisi, ürün, palet çeşidi, ödeme, palet verdim, palet parası aldım ---------- */
var sdMode = null, sdRef = null;
var SD = {
  bilgi: { t: 'Toptancı bilgisi', save: 'Kaydet' },
  urun: { t: 'Ürün ekle', save: 'Listeye ekle' },
  palet: { t: 'Boş palet çeşidi', save: 'Kaydet' },
  odeme: { t: 'Ödeme yap', save: 'Ödemeyi kaydet' },
  ver: { t: 'Boş palet verdim', save: 'Kaydet' },
  iade: { t: 'Palet parası aldım', save: 'Kaydet' }
};
function dateF(id) { return '<label class="f">Tarih<input type="date" id="' + id + '" value="' + today() + '"></label>'; }
function openSd(mode, ref) {
  var t = supOf(stSup); if (!t) return;
  sdMode = mode; sdRef = ref || null;
  var A = supAccount(t), L = palLedger(t), b = '', hint = '', del = false, title = SD[mode].t;
  if (mode === 'bilgi') {
    b = '<label class="f">Toptancı / firma adı<input id="sdName" autocomplete="off" value="' + esc(t.name) + '"></label>'
      + '<label class="f">Not<input id="sdNote" autocomplete="off" value="' + esc(t.note || '') + '" placeholder="ör. telefon, plasiyer"></label>';
    del = true;
    hint = shipsOf(t.id).length ? 'Girişi olan toptancı silinemez.' : '';
  } else if (mode === 'urun') {
    b = '<div class="grid2"><label class="f">Marka<input id="sdBrand" autocomplete="off" list="dlBrand" autocapitalize="words" placeholder="ör. Maysu"></label>'
      + '<label class="f">Çeşit<input id="sdVar" autocomplete="off" list="dlVar" placeholder="ör. 0.5"></label></div>';
    hint = 'Ekledikten sonra pencere açık kalır; aynı markanın diğer çeşitlerini arka arkaya ekleyebilirsin.';
  } else if (mode === 'palet') {
    var p = ref && byId(t.pals, ref);
    title = p ? 'Palet çeşidini düzenle' : 'Boş palet çeşidi ekle';
    b = '<label class="f">Palet adı<input id="sdPal" autocomplete="off" value="' + esc(p ? p.name : '') + '" placeholder="ör. Euro palet"></label>';
    hint = 'Fiyat burada tutulmaz; her girişte o alımdaki palet başı fiyatı yazarsın.' + (p ? ' Silinen çeşidin eski girişlerdeki paletleri hesapta kalır.' : '');
    del = !!p;
  } else if (mode === 'odeme') {
    b = '<label class="f">Ödenen tutar (₺)<input id="sdAmt" inputmode="decimal" autocomplete="off" placeholder="' + (A.rem > 0.004 ? 'kalan ' + gnum(amt(A.rem)) : 'ör. 5.000') + '"></label>'
      + dateF('sdDate') + '<label class="f">Not<input id="sdNote" autocomplete="off" placeholder="ör. Havale ile, elden verdim"></label>';
    hint = 'Ödeme girişlere bölünmez, toptancı hesabının toplamından düşer. Şu an kalan: ' + sm(A.rem) + '.';
  } else if (mode === 'ver') {
    b = t.pals.length ? t.pals.map(function (p) {
      var r = L.rows.filter(function (x) { return x.name === p.name; })[0], o = r ? r.out - r.giv : 0;
      return '<label class="f">' + esc(p.name) + ' (adet)<input data-give="' + p.id + '" inputmode="decimal" autocomplete="off" placeholder="' + (o > 0 ? 'bende ' + fmt(o) : 'ör. 5') + '"></label>';
    }).join('') + dateF('sdDate') + '<label class="f">Not<input id="sdNote" autocomplete="off" placeholder="ör. şoföre verdim"></label>'
      : '<p class="hint">Önce "Boş palet çeşitleri"nden palet çeşidi ekle.</p>';
    hint = 'Sadece paletleri yazarsın; parasını geri aldığında "Palet parası aldım" ile ayrıca girersin.';
  } else if (mode === 'iade') {
    b = '<label class="f">Geri aldığım para (₺)<input id="sdAmt" inputmode="decimal" autocomplete="off" placeholder="' + (L.claim > 0.004 ? 'alacağım ' + gnum(amt(L.claim)) : 'ör. 1.250') + '"></label>'
      + dateF('sdDate') + '<label class="f">Not<input id="sdNote" autocomplete="off" placeholder="ör. 2 palet kırık, eksik ödedi"></label>';
    hint = 'Verdiğim paletlerin parası ' + money(L.given) + ', şimdiye kadar geri aldığım ' + money(L.back) + '.';
  }
  $('sdT').textContent = title;
  $('sdBody').innerHTML = b; $('sdHint').textContent = hint; $('sdErr').textContent = '';
  $('sdSave').textContent = SD[mode].save; $('sdSave').hidden = mode === 'ver' && !t.pals.length;
  $('sdDel').hidden = !del; disarm($('sdDel'));
  $('dlgSup').showModal();
  var f = $('sdBody').querySelector('input'); if (f && mode !== 'bilgi') f.focus();
}
function sdErr(m) { $('sdErr').textContent = m; }
function saveSd() {
  var t = supOf(stSup); if (!t) return;
  var m = sdMode, msg = '';
  if (m === 'bilgi') {
    var name = clean($('sdName').value), o = findSup(name);
    if (!name) return sdErr('Toptancının adını yaz.');
    if (o && o !== t) return sdErr(o.name + ' adında başka bir toptancı var.');
    t.name = name; t.note = clean($('sdNote').value); msg = 'Toptancı kaydedildi.';
  } else if (m === 'urun') {
    var b = clean($('sdBrand').value), v = clean($('sdVar').value);
    if (!b || !v) return sdErr('Marka ve çeşidi yaz.');
    var pid = findProduct(b, v);
    if (pid && t.pids.indexOf(pid) >= 0) return sdErr(pname(pid) + ' zaten listede.');
    pid = ensureProduct(b, v); supAddPid(t, pid);
    if (!persist()) return;
    renderAll();
    // pencere açık kalır: aynı markadan bir sonraki çeşit
    $('sdBrand').value = db.products[pid].brand; $('sdVar').value = ''; $('sdVar').focus();
    $('sdHint').textContent = pname(pid) + ' eklendi. Başka çeşit yazabilir ya da kapatabilirsin.';
    return;
  } else if (m === 'palet') {
    var pn = clean($('sdPal').value), p = sdRef && byId(t.pals, sdRef), same = findPal(t, pn);
    if (!pn) return sdErr('Palet çeşidinin adını yaz.');
    if (same && same !== p) return sdErr(pn + ' zaten var.');
    if (p) p.name = pn; else ensurePal(t, pn);
    msg = p ? 'Palet çeşidi kaydedildi.' : pn + ' eklendi.';
  } else if (m === 'odeme' || m === 'iade') {
    var raw = $('sdAmt').value.trim(), a = num(raw), d = $('sdDate').value;
    if (!raw) return sdErr(m === 'odeme' ? 'Ödediğin tutarı yaz.' : 'Geri aldığın parayı yaz.');
    if (a == null || a <= 0) return sdErr('Tutarı sayı olarak yaz, ör. 5000.');
    if (!d) return sdErr('Tarihi seç.');
    (m === 'odeme' ? t.pays : t.refs).push({ id: (m === 'odeme' ? 'o' : 'i') + uid(), ts: Date.now(), date: d, amount: a, note: clean($('sdNote').value) });
    msg = m === 'odeme' ? money(a) + ' ödeme kaydedildi · kalan ' + sm(supAccount(t).rem) : 'Palet parası alındı: ' + money(a);
  } else if (m === 'ver') {
    var lines = [], err = '', dv = $('sdDate').value;
    document.querySelectorAll('#sdBody [data-give]').forEach(function (x) {
      var r = x.value.trim(), n = num(r), pl = byId(t.pals, x.dataset.give);
      if (!r || !pl) return;
      if (n == null || n <= 0) { err = err || pl.name + ' için adedi sayı olarak yaz.'; return; }
      lines.push({ pal: pl.id, name: pl.name, n: n });
    });
    if (err) return sdErr(err);
    if (!lines.length) return sdErr('Verdiğin palet adedini yaz.');
    if (!dv) return sdErr('Tarihi seç.');
    t.gives.push({ id: 'v' + uid(), ts: Date.now(), date: dv, lines: lines, note: clean($('sdNote').value) });
    msg = lines.reduce(function (n, l) { return n + l.n; }, 0) + ' boş palet verildi.';
  }
  if (!persist()) return;
  $('dlgSup').close(); renderAll(); toast(msg);
}
function deleteSd() {
  var t = supOf(stSup); if (!t) return;
  if (sdMode === 'bilgi') {
    if (shipsOf(t.id).length) return sdErr('Girişi olan toptancı silinemez.');
    db.sups = db.sups.filter(function (x) { return x !== t; });
    tidy(); persist(); $('dlgSup').close(); pickSup(''); renderAll(); toast(t.name + ' silindi.');
  } else if (sdMode === 'palet') {
    t.pals = t.pals.filter(function (p) { return p.id !== sdRef; });
    persist(); $('dlgSup').close(); renderAll(); toast('Palet çeşidi silindi.');
  }
}
// hesaptaki ödeme, verilen palet, geri alınan para silme
function removeFrom(key, id, msg) {
  var t = supOf(stSup); if (!t) return;
  t[key] = t[key].filter(function (x) { return x.id !== id; });
  persist(); renderAll(); toast(msg);
}
function removeSupProduct(pid) {
  var t = supOf(stSup); if (!t) return;
  var n = pname(pid);
  t.pids = t.pids.filter(function (x) { return x !== pid; });
  tidy(); persist(); renderAll(); toast(n + ' listeden çıkarıldı.');
}

$('stSup').addEventListener('click', function (ev) {
  var b = ev.target.closest('button'); if (!b) return;
  var d = b.dataset;
  if (d.sd) openSd(d.sd, d.ref);
  else if (d.supentry != null) openEntry(null, null, stSup);
  else if (d.paydel) { ev.stopPropagation(); arm(b, function () { removeFrom('pays', d.paydel, 'Ödeme silindi.'); }); }
  else if (d.givedel) arm(b, function () { removeFrom('gives', d.givedel, 'Verilen palet kaydı silindi.'); });
  else if (d.refdel) arm(b, function () { removeFrom('refs', d.refdel, 'Palet parası kaydı silindi.'); });
  else if (d.pidrm) removeSupProduct(d.pidrm);
  else if (d.stmore != null) { stLimit += 15; renderStock(); }
});
$('sdSave').addEventListener('click', saveSd);
$('sdDel').addEventListener('click', function () { arm(this, deleteSd); });
$('sdBody').addEventListener('input', function () { $('sdErr').textContent = ''; });
$('sdBody').addEventListener('keydown', function (ev) { if (ev.key === 'Enter' && ev.target.tagName === 'INPUT') saveSd(); });
// çeşit önerileri yazılan markaya göre
$('sdBody').addEventListener('focusin', function (ev) { if (ev.target.id === 'sdVar') fillDatalists($('sdBrand').value); else if (ev.target.id === 'sdBrand') fillDatalists(); });
$('dlgSup').addEventListener('input', liveNum, true);
