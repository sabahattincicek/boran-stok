'use strict';
/* Toptancı sayfası (Stok içinde): hesap (girişler, ödemeler, palet iadeleri), ürün listesi, girişler.
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
  var A = supAccount(t), L = palSum(t), month = today().slice(0, 7), mon = 0;
  ships.forEach(function (s) { linesOf(s.id).forEach(function (e) { if (s.date.slice(0, 7) === month && e.total != null) mon += e.total; }); });
  var h = '<div class="suph"><div><h2>' + esc(t.name) + '</h2>' + (t.note ? '<p class="hint">' + esc(t.note) + '</p>' : '') + '</div>'
    + '<button type="button" data-sd="bilgi">Düzenle</button></div>';
  h += '<div class="kpis">'
    + kpi(A.rem < -0.004 ? 'Avans (fazla ödenen)' : 'Kalan borç', money(Math.abs(A.rem)), 'borç ' + money(A.due) + ' · ödenen ' + money(A.paid) + (A.back ? ' · palet iadesi ' + money(A.back) : ''), A.rem > 0.004 ? 'bad' : 'ok')
    + kpi('Bu ay alım', money(mon), ships.length + ' giriş')
    + kpi('İade edilmemiş palet parası', money(L.open), 'girişlerde ' + money(L.out) + (L.n ? ' · ' + fmt(L.n) + ' palet' : '') + ' · iade ' + money(L.back) + (L.backN ? ' · ' + fmt(L.backN) + ' palet' : ''), L.open > 0.004 ? 'warn' : '')
    + '</div>';
  h += '<div class="supacts">'
    + '<button type="button" class="primary addbtn" data-supentry>+ Ürün girişi</button>'
    + '<button type="button" class="paidbtn addbtn" data-sd="odeme">Ödeme yap</button>'
    + '<button type="button" class="addbtn" data-sd="iade">Palet iadesi</button></div>';

  // hesap hareketleri: girişlerin tutarı borca, ödemeler ve palet iadeleri toplamdan düşer; en yeni üstte, kalan o ana kadarki
  var mv = ships.map(function (s) {
    var koli = linesOf(s.id).reduce(function (n, e) { return n + e.koli; }, 0);
    return { k: entKey(s), date: s.date, txt: 'Giriş · ' + fmt(koli) + ' koli', due: shipDue(s), ship: s.id };
  }).concat(t.pays.map(function (x) {
    return { k: x.date + ' ~ ' + x.ts, date: x.date, txt: 'Ödeme' + (x.note ? ' · ' + esc(x.note) : ''), paid: x.amount, del: 'paydel', id: x.id };
  })).concat(t.backs.map(function (x) {
    return { k: x.date + ' ~ ' + x.ts, date: x.date, txt: 'Palet iadesi · ' + fmt(x.n) + ' palet' + (x.note ? ' · ' + esc(x.note) : ''), paid: x.amount, del: 'backdel', id: x.id };
  })).concat(t.refs.map(function (x) {
    return { k: x.date + ' ~ ' + x.ts, date: x.date, txt: 'Palet parası elden alındı' + (x.note ? ' · ' + esc(x.note) : ''), due: x.amount, del: 'refdel', id: x.id };
  })).sort(function (a, b) { return cmp(a.k, b.k); });
  var bal = 0;
  mv.forEach(function (m) { bal += (m.due || 0) - (m.paid || 0); m.bal = bal; });
  h += '<h2>Hesap</h2><div class="tbl">' + (mv.length
    ? '<table><thead><tr><th>Tarih</th><th>Hareket</th><th>Borç</th><th>Ödeme / iade</th><th>Kalan</th></tr></thead><tbody>'
      + mv.reverse().map(function (m) {
        return '<tr' + (m.ship ? ' class="tap" data-ship="' + m.ship + '"' : '') + '><td>' + dateTR(m.date) + '</td>'
          + '<td class="mv">' + m.txt + (m.del ? ' <button type="button" class="lnk danger" data-' + m.del + '="' + m.id + '">sil</button>' : '') + '</td>'
          + '<td>' + (m.due != null ? money(m.due) : '') + '</td><td>' + (m.paid != null ? money(m.paid) : '') + '</td>'
          + '<td' + (m.bal > 0.004 ? ' class="neg"' : '') + '>' + sm(m.bal) + '</td></tr>';
      }).join('') + '</tbody>'
      + '<tfoot><tr><td></td><td>Toplam</td><td>' + money(A.due) + '</td><td>' + money(A.paid + A.back) + '</td><td>' + sm(A.rem) + '</td></tr></tfoot></table>'
    : '<div class="empty" style="border:0">Henüz giriş ya da ödeme yok.</div>') + '</div>';

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

  h += '<h2>Girişleri</h2><div class="list ships">' + (ships.length ? ships.slice(0, stLimit).map(shipHTML).join('') : '<div class="empty">Bu toptancıdan giriş yok.</div>') + '</div>';
  if (ships.length > stLimit) h += '<button type="button" data-stmore>Daha fazla göster (' + (ships.length - stLimit) + ' giriş daha)</button>';
  $('stSup').innerHTML = h;
}

/* ---------- pencere: toptancı bilgisi, ürün, ödeme, palet iadesi ---------- */
var sdMode = null, sdRef = null;
var SD = {
  bilgi: { t: 'Toptancı bilgisi', save: 'Kaydet' },
  urun: { t: 'Ürün ekle', save: 'Listeye ekle' },
  odeme: { t: 'Ödeme yap', save: 'Ödemeyi kaydet' },
  iade: { t: 'Palet iadesi', save: 'İadeyi kaydet' },
  yeni: { t: 'Yeni toptancı', save: 'Toptancıyı ekle' },
  shpay: { t: 'Girişe ödeme', save: 'Ödemeyi kaydet' },
  depback: { t: 'Palet parası iade edildi', save: 'İade edildi' }
};
function dateF(id) { return '<label class="f">Tarih<input type="date" id="' + id + '" value="' + today() + '"></label>'; }
// yeni toptancı ve toptancısız girişin ödemesi/palet iadesi seçili toptancı olmadan da açılır
function openSd(mode, ref) {
  var t = supOf(stSup), free = mode === 'yeni' || mode === 'shpay' || mode === 'depback';
  if (!t && !free) return;
  sdMode = mode; sdRef = ref || null;
  var A = t ? supAccount(t) : null, L = t ? palSum(t) : null, b = '', hint = '', del = false, title = SD[mode].t, s = ref && byId(db.ships, ref);
  if (mode === 'yeni') {
    b = '<label class="f">Toptancı / firma adı<input id="sdName" autocomplete="off" placeholder="ör. Yıldız Toptan"></label>';
    hint = 'Eklendikten sonra ürünlerini toptancının sayfasından eklersin.';
  } else if (mode === 'shpay') {
    var rem = shipTotal(s) - shipPaid(s);
    title = dateTR(s.date) + ' girişine ödeme';
    b = '<label class="f">Ödenen tutar (₺)<input id="sdAmt" inputmode="decimal" autocomplete="off" placeholder="kalan ' + gnum(amt(rem)) + '"></label>'
      + dateF('sdDate') + '<label class="f">Not<input id="sdNote" autocomplete="off" placeholder="ör. Havale ile, elden verdim"></label>';
    hint = 'Toptancısız giriş; kalan borç ' + money(rem) + '.';
  } else if (mode === 'depback') {
    b = dateF('sdDate');
    hint = dateTR(s.date) + ' girişinin boş palet parası ' + money(s.dep) + ' geri alındı olarak işaretlenecek.';
  } else if (mode === 'bilgi') {
    b = '<label class="f">Toptancı / firma adı<input id="sdName" autocomplete="off" value="' + esc(t.name) + '"></label>'
      + '<label class="f">Not<input id="sdNote" autocomplete="off" value="' + esc(t.note || '') + '" placeholder="ör. telefon, plasiyer"></label>';
    del = true;
    hint = shipsOf(t.id).length ? 'Girişi olan toptancı silinemez.' : '';
  } else if (mode === 'urun') {
    b = '<div class="grid2"><label class="f">Marka<input id="sdBrand" autocomplete="off" list="dlBrand" autocapitalize="words" placeholder="ör. Maysu"></label>'
      + '<label class="f">Çeşit<input id="sdVar" autocomplete="off" list="dlVar" placeholder="ör. 0.5"></label></div>';
    hint = 'Ekledikten sonra pencere açık kalır; aynı markanın diğer çeşitlerini arka arkaya ekleyebilirsin.';
  } else if (mode === 'odeme') {
    b = '<label class="f">Ödenen tutar (₺)<input id="sdAmt" inputmode="decimal" autocomplete="off" placeholder="' + (A.rem > 0.004 ? 'kalan ' + gnum(amt(A.rem)) : 'ör. 5.000') + '"></label>'
      + dateF('sdDate') + '<label class="f">Not<input id="sdNote" autocomplete="off" placeholder="ör. Havale ile, elden verdim"></label>';
    hint = 'Ödeme girişlere bölünmez, toptancı hesabının toplamından düşer. Şu an kalan: ' + sm(A.rem) + '.';
  } else if (mode === 'iade') {
    b = '<div class="grid2"><label class="f">İade edilen palet (adet)<input id="sdN" inputmode="decimal" autocomplete="off" placeholder="ör. 5"></label>'
      + '<label class="f">Borçtan düşecek (₺)<input id="sdAmt" inputmode="decimal" autocomplete="off" placeholder="' + (L.unit != null ? 'adetten hesaplanır' : 'ör. 1.250') + '"></label></div>'
      + dateF('sdDate') + '<label class="f">Not<input id="sdNote" autocomplete="off" placeholder="ör. şoföre verdim"></label>';
    hint = 'İade edilmemiş palet parası ' + money(L.open) + (L.unit != null ? ', palet başı ortalama ' + money(L.unit) + '. Tutar farklıysa elle yaz.' : '. Girişlerde palet sayısı yok, tutarı elle yaz.') + ' Toptancı hesabındaki borçtan düşer, ayrıca ödeme girmen gerekmez.';
  }
  $('sdT').textContent = title;
  $('sdBody').innerHTML = b; $('sdHint').textContent = hint; $('sdErr').textContent = '';
  $('sdSave').textContent = SD[mode].save;
  $('sdDel').hidden = !del; disarm($('sdDel'));
  $('dlgSup').showModal();
  var f = $('sdBody').querySelector('input'); if (f && mode !== 'bilgi') f.focus();
}
function sdErr(m) { $('sdErr').textContent = m; }
function saveSd() {
  var t = supOf(stSup), m = sdMode, msg = '', s = sdRef && byId(db.ships, sdRef);
  if (!t && m !== 'yeni' && m !== 'shpay' && m !== 'depback') return;
  if (m === 'yeni') {
    var nn = clean($('sdName').value);
    if (!nn) return sdErr('Toptancının adını yaz.');
    if (findSup(nn)) return sdErr(findSup(nn).name + ' zaten var.');
    var nt = ensureSup(nn);
    if (!persist()) return;
    $('dlgSup').close(); pickSup(nt.id); toast(nt.name + ' eklendi. Ürünlerini ekleyebilirsin.');
    return;
  } else if (m === 'shpay') {
    var r0 = $('sdAmt').value.trim(), a0 = num(r0), d0 = $('sdDate').value, rem0 = shipTotal(s) - shipPaid(s);
    if (!r0) return sdErr('Ödediğin tutarı yaz.');
    if (a0 == null || a0 <= 0) return sdErr('Tutarı sayı olarak yaz, ör. 5000.');
    if (a0 > rem0 + 0.004) return sdErr('Kalan borçtan (' + money(rem0) + ') fazla olamaz.');
    if (!d0) return sdErr('Ödeme tarihini seç.');
    s.pays.push({ id: 'o' + uid(), ts: Date.now(), date: d0, amount: a0, note: clean($('sdNote').value) });
    msg = money(a0) + ' ödeme kaydedildi · ' + (rem0 - a0 > 0.004 ? 'kalan ' + money(rem0 - a0) : 'tamamı ödendi');
  } else if (m === 'depback') {
    s.depBack = $('sdDate').value || today();
    msg = 'Palet parası iade edildi: ' + money(s.dep);
  } else if (m === 'bilgi') {
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
  } else if (m === 'odeme') {
    var raw = $('sdAmt').value.trim(), a = num(raw), d = $('sdDate').value;
    if (!raw) return sdErr('Ödediğin tutarı yaz.');
    if (a == null || a <= 0) return sdErr('Tutarı sayı olarak yaz, ör. 5000.');
    if (!d) return sdErr('Tarihi seç.');
    t.pays.push({ id: 'o' + uid(), ts: Date.now(), date: d, amount: a, note: clean($('sdNote').value) });
    msg = money(a) + ' ödeme kaydedildi · kalan ' + sm(supAccount(t).rem);
  } else if (m === 'iade') {
    var L = palSum(t), rn = $('sdN').value.trim(), n = num(rn), ra = $('sdAmt').value.trim(), v = ra ? num(ra) : n && L.unit != null ? palAmount(t, n) : null, dt = $('sdDate').value;
    if (!rn) return sdErr('Kaç palet iade edildiğini yaz.');
    if (n == null || n <= 0) return sdErr('Palet adedini sayı olarak yaz, ör. 5.');
    if (v == null || v <= 0) return sdErr('Borçtan düşecek tutarı yaz.');
    if (v > L.open + 0.004) return sdErr('İade edilmemiş palet parası ' + money(L.open) + '; bundan fazla düşülemez.');
    if (!dt) return sdErr('Tarihi seç.');
    t.backs.push({ id: 'd' + uid(), ts: Date.now(), date: dt, n: n, amount: v, note: clean($('sdNote').value) });
    msg = fmt(n) + ' palet iade edildi · borçtan ' + money(v) + ' düştü · kalan ' + sm(supAccount(t).rem);
  }
  if (!persist()) return;
  $('dlgSup').close(); renderAll(); toast(msg);
}
function deleteSd() {
  var t = supOf(stSup); if (!t) return;
  if (sdMode === 'bilgi') {
    if (shipsOf(t.id).length) return sdErr('Girişi olan toptancı silinemez.');
    var other = supUsedIn(t.id);
    if (other) return sdErr(other + ' şubesinde bu toptancının kayıtları var; silinemez.');
    db.sups = db.sups.filter(function (x) { return x !== t; });
    tidy(); persist(); $('dlgSup').close(); pickSup(''); renderAll(); toast(t.name + ' silindi.');
  }
}
// hesaptaki ödeme ve palet iadesi silme
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
  else if (d.paydel) arm(b, function () { removeFrom('pays', d.paydel, 'Ödeme silindi.'); });
  else if (d.backdel) arm(b, function () { removeFrom('backs', d.backdel, 'Palet iadesi silindi.'); });
  else if (d.refdel) arm(b, function () { removeFrom('refs', d.refdel, 'Palet parası kaydı silindi.'); });
  else if (d.pidrm) removeSupProduct(d.pidrm);
  else if (d.stmore != null) { stLimit += 15; renderStock(); }
});
$('sdSave').addEventListener('click', saveSd);
$('sdDel').addEventListener('click', function () { arm(this, deleteSd); });
$('sdBody').addEventListener('input', function (ev) {
  $('sdErr').textContent = '';
  // palet iadesi: adet yazılınca düşecek tutar boş kutuda "= …" görünür
  if (ev.target.id !== 'sdN') return;
  var t = supOf(stSup), n = num(ev.target.value), u = t && palSum(t).unit;
  $('sdAmt').placeholder = n && u != null ? '= ' + fmt(palAmount(t, n)) : u != null ? 'adetten hesaplanır' : 'ör. 1.250';
});
$('sdBody').addEventListener('keydown', function (ev) { if (ev.key === 'Enter' && ev.target.tagName === 'INPUT') saveSd(); });
// çeşit önerileri yazılan markaya göre
$('sdBody').addEventListener('focusin', function (ev) { if (ev.target.id === 'sdVar') fillDatalists($('sdBrand').value); else if (ev.target.id === 'sdBrand') fillDatalists(); });
$('dlgSup').addEventListener('input', liveNum, true);
