'use strict';
/* Stok sayfası: üstte toptancı seçimi; Tümü'nde bütün stok ve girişler, toptancıda onun sayfası (toptanci.js) */

mountPage(`
  <section class="page" id="p-stok" hidden>
    <header class="top"><h1>Stok</h1></header>
    <div class="chips" id="stTabs"></div>
    <div class="col" id="stAll">
      <div class="kpis" id="kpis"></div>
      <div class="supacts">
        <button type="button" class="primary addbtn" id="btnAdd">+ Ürün girişi</button>
        <button type="button" class="addbtn" id="btnCount">Sayım gir</button>
      </div>
      <div class="list" id="brands"></div>
      <details class="more sec" id="stSupD"><summary><b>Toptancılar</b><small id="stSupS"></small></summary><div class="morein"><div class="tbl" id="stSupTbl"></div></div></details>
      <details class="more sec"><summary><b>Son girişler</b><small id="recentS"></small></summary><div class="morein">
        <div class="list" id="recent"></div>
        <button type="button" id="recentMore" hidden>Daha fazla göster</button>
      </div></details>
    </div>
    <div class="col" id="stSup" hidden></div>
  </section>`);

// stSup: seçili toptancı ('' = Tümü)
var stSup = '';
function renderStock() {
  if (stSup && !supOf(stSup)) stSup = '';
  $('stTabs').innerHTML = '<button type="button" data-stsup="" aria-pressed="' + !stSup + '">Tümü</button>'
    + supsSorted().map(function (t) { return '<button type="button" data-stsup="' + t.id + '" aria-pressed="' + (stSup === t.id) + '">' + esc(t.name) + '</button>'; }).join('')
    + '<button type="button" class="add" data-stnew>+ Toptancı</button>';
  $('stAll').hidden = !!stSup; $('stSup').hidden = !stSup;
  if (stSup) renderSupPanel(supOf(stSup)); else renderStockAll();
}
function pickSup(id) {
  stSup = id; stLimit = 15;
  renderStock(); window.scrollTo(0, 0);
}
// Tümü: bütün stok, toptancıların özeti ve bütün girişler
function renderStockAll() {
  var all = db.entries, totalKoli = 0, nProd = 0, debt = supDebt(), month = today().slice(0, 7), mon = 0;
  Object.keys(db.products).forEach(function (id) { if (inUse(id)) { totalKoli += stockOf(id); nProd++; } });
  all.forEach(function (e) { if (e.date.slice(0, 7) === month && e.total != null) mon += e.total; });
  var last = lastEntry(all);
  $('kpis').innerHTML =
    '<div class="kpi"><span>Toplam stok</span><b>' + fmt(totalKoli) + ' koli</b><small>' + nProd + ' çeşit ürün</small></div>'
    + '<div class="kpi' + (debt > 0 ? ' bad' : '') + '"><span>Toptancıya kalan borç</span><b>' + money(debt) + '</b></div>';
  $('recentS').textContent = last ? ago(last.date) + ' · bu ay ' + money(mon) : '';

  var bs = brands(true);
  if (!bs.length) {
    $('brands').innerHTML = '<div class="empty">Henüz ürün yok. İlk tır geldiğinde <b>+ Ürün girişi</b> ile ekle.</div>';
  } else {
    $('brands').innerHTML = bs.map(function (b) {
      var sum = b.ids.reduce(function (t, id) { return t + stockOf(id); }, 0), low = 0;
      var prods = b.ids.map(function (id) {
        var p = db.products[id], q = stockOf(id), isLow = p.kpp ? q < p.kpp : q <= 0;
        if (isLow) low++;
        return '<button type="button" class="prod' + (isLow ? ' low' : '') + '" data-prod="' + id + '">'
          + '<span class="l"><span class="v">' + esc(p.variety) + '</span></span>'
          + '<span class="q"><b>' + fmt(q) + '</b> koli<small>' + palTxt(q, p.kpp) + '</small></span></button>';
      }).join('');
      // tek marka varsa açık gelir; azalan ürün kapalı markada da görünür
      return more('brand.' + fold(b.name), '<b>' + esc(b.name) + '</b><small>' + (low ? '<span class="lowc">' + low + ' azaldı</span> · ' : '') + fmt(sum) + ' koli</small>', prods, 'sec brand', bs.length === 1);
    }).join('');
  }

  // toptancılar: giriş, borç, iadesi beklenen palet parası; satıra dokununca toptancının sayfası açılır
  var rows = supsSorted().map(function (t) {
    var ss = shipsOf(t.id), l = lastEntry(ss), d = supDebt(t.id), pl = palSum(t).open;
    return '<tr class="tap" data-stsup="' + t.id + '"><td><b>' + esc(t.name) + '</b>' + (l ? '<small class="unk"> · ' + dateTR(l.date) + '</small>' : '') + '</td>'
      + '<td>' + ss.length + '</td><td' + (d > 0.004 ? ' class="neg"' : '') + '>' + (d < -0.004 ? 'avans ' + money(-d) : money(d)) + '</td><td>' + (Math.abs(pl) > 0.004 ? sm(pl) : '—') + '</td></tr>';
  });
  var none = shipsOf('');
  if (none.length && rows.length) rows.push('<tr><td class="unk">Toptancısız girişler</td><td>' + none.length + '</td><td>' + money(supDebt('')) + '</td><td>—</td></tr>');
  $('stSupS').textContent = db.sups.length ? db.sups.length + ' toptancı' : '';
  if (!rows.length) $('stSupD').open = true;
  $('stSupTbl').innerHTML = rows.length
    ? '<table><thead><tr><th>Toptancı</th><th>Giriş</th><th>Borç</th><th>Palet parası</th></tr></thead><tbody>' + rows.join('') + '</tbody></table>'
    : '<div class="empty" style="border:0">Henüz toptancı yok. Yukarıdan <b>+ Toptancı</b> ile ekle; her toptancının ürünleri, girişleri ve hesabı ayrı tutulur.</div>';

  var rec = db.ships.slice().sort(function (a, b) { return cmp(entKey(b), entKey(a)); });
  $('recent').innerHTML = rec.length ? rec.slice(0, stLimit).map(shipHTML).join('') : '<div class="empty">Giriş yok.</div>';
  $('recentMore').hidden = rec.length <= stLimit;
}
// ürün detayındaki tek satır; dokununca girişin tamamı düzenlenir
// "3 palet × 72 koli = 216 koli"; palet bilgisi yoksa sadece koli
function lineKoliTxt(e) {
  return e.palet && e.kpp ? fmt(e.palet) + ' palet × ' + fmt(e.kpp) + ' koli = ' + fmt(e.koli) + ' koli' : fmt(e.koli) + ' koli';
}
function entHTML(e) {
  var koli = e.koli, money1 = [];
  if (e.total != null) {
    money1.push('Toplam ' + money(e.total) + (e.auto ? ' (giriş toplamından pay)' : ''));
    if (koli) money1.push('koli başı ' + money(e.total / koli));
    if (koli && e.extra) money1.push('nakliye/ek gider payı ' + money(e.extra) + ', giderle koli ' + money((e.total + e.extra) / koli));
  }
  return '<button type="button" class="ent" data-ship="' + e.sid + '">'
    + '<span class="h"><b>+' + fmt(koli) + ' koli</b><span class="d">' + dateTR(e.date) + (e.time ? ' ' + e.time : '') + '</span></span>'
    + '<span class="k">' + lineKoliTxt(e) + '</span>'
    + (money1.length ? '<span class="p">' + money1.join(' · ') + '</span>' : '')
    + '</button>';
}
var stLimit = 15;
function shipHTML(s) {
  // toptancılı girişin ödemesi yok: tutarı toptancı hesabına yazılır, ödemeler hesabın toplamından düşer
  var ls = linesOf(s.id), acc = !!s.sup, tot = acc ? shipDue(s) : shipTotal(s), paid = acc ? 0 : shipPaid(s), rem = acc ? 0 : tot - paid;
  var koli = ls.reduce(function (t, e) { return t + e.koli; }, 0);
  var pays = s.pays.slice().sort(function (a, b) { return cmp(a.date + ' ' + a.ts, b.date + ' ' + b.ts); });
  var head = '<span class="shm"><span class="sh"><span class="d">' + dateTR(s.date) + (s.time ? ' ' + s.time : '') + (s.sup && stSup !== s.sup ? '<small class="sup">' + esc(supName(s.sup)) + '</small>' : '') + '</span>'
    + '<span class="tt"><b>' + (tot ? money(tot) : 'fiyatsız') + '</b><small>' + ls.length + ' çeşit · ' + fmt(koli) + ' koli' + (rem > 0.004 ? ' · kalan ' + money(rem) : '') + '</small></span></span></span>';
  return more('ship.' + s.id, head, '<ul class="its">' + ls.map(function (e) {
      var k = e.koli;
      return '<li><span><b>' + esc(pname(e.pid)) + '</b><small>' + lineKoliTxt(e) + '</small></span>'
        + '<span>' + (e.total != null ? money(e.total) + (k ? '<small>' + (e.auto ? 'pay · ' : '') + 'koli ' + money(e.total / k) + '</small>' : '')
          + (k && e.extra ? '<small>giderle koli ' + money((e.total + e.extra) / k) + '</small>' : '') : '—') + '</span></li>';
    }).join('') + '</ul>'
    + (!acc && shipExtra(s) ? '<span class="xc">' + extraTxt(s) + '<small>maliyete eklendi' + (shipExtraOut(s) ? '; ayrı ödenenler borca eklenmedi' : '') + '</small></span>' : '')
    + (!acc && s.dep > 0 ? '<div class="dep' + (s.depBack ? ' back' : '') + '"><span class="xc">Boş palet parası ' + money(s.dep)
        + (s.depIn ? ' <small>(toplamın içinde)</small>' : '')
        + '<small>' + (s.depBack ? 'İade edildi · ' + dateTR(s.depBack) : 'İade bekliyor') + '</small></span>'
      + (s.depBack
        ? '<button type="button" data-depundo="' + s.id + '">Geri al</button>'
        : '<button type="button" class="paidbtn" data-sd="depback" data-ref="' + s.id + '">İade edildi</button>')
      + '</div>' : '')
    // toptancılı giriş: sadece fiyat kalemleri
    + (acc && tot ? '<ul class="kal"><li><span>Mal bedeli</span><span>' + money(shipGoods(s)) + '</span></li>'
        + (s.nak ? '<li><span>Nakliye</span><span>' + money(s.nak) + '</span></li>' : '')
        + (s.costs || []).map(function (c) { return '<li><span>' + esc(c.desc) + '</span><span>' + money(c.amount) + '</span></li>'; }).join('')
        + (s.dep > 0 ? '<li><span>Palet parası</span><span>' + money(s.dep) + '</span></li>' : '')
        + '<li class="t"><span>Toplam</span><span>' + money(tot) + '</span></li></ul>' : '')
    + (!acc && tot ? '<div class="pays">'
      + pays.map(function (x) {
        return '<div class="pay"><span>' + dateTR(x.date) + ' ödeme</span><b>' + money(x.amount) + '</b>'
          + '<button type="button" class="danger" data-shpdel="' + s.id + '|' + x.id + '">Sil</button>'
          + (x.note ? '<small>' + esc(x.note) + '</small>' : '') + '</div>';
      }).join('')
      + '<div class="pst">' + (rem > 0.004 ? 'Ödenen ' + money(paid) + ' · <span class="debt">kalan ' + money(rem) + '</span>' : 'Tamamı ödendi') + '</div>'
      + '</div>' : '')
    + (s.note ? '<span class="note">' + esc(s.note) + '</span>' : '')
    + '<div class="acts">'
    + (tot && rem > 0.004 ? '<button type="button" class="paidbtn" data-sd="shpay" data-ref="' + s.id + '">Ödeme yap</button>' : '')
    + '<button type="button" data-ship="' + s.id + '">Düzenle</button></div>',
    'item ship' + (rem > 0.004 ? ' due' : ''));
}
// toptancısız girişin palet iadesini geri al (iade ve girişe ödeme pencereden: toptanci.js openSd)
function undoDep(sid) {
  var s = byId(db.ships, sid); if (!s) return;
  s.depBack = null;
  if (!persist()) return;
  renderAll(); toast('İade geri alındı.');
}
function deletePay(ref) {
  var k = ref.split('|'), s = byId(db.ships, k[0]); if (!s) return;
  s.pays = s.pays.filter(function (x) { return x.id !== k[1]; });
  persist(); renderAll(); toast('Ödeme silindi.');
}

$('recentMore').addEventListener('click', function () { stLimit += 15; renderStock(); });
$('btnAdd').addEventListener('click', function () { openEntry(null, null); });
$('btnCount').addEventListener('click', function () { openCount(null); });
$('p-stok').addEventListener('click', function (ev) {
  var b = ev.target.closest('[data-stsup],[data-stnew]'); if (!b) return;
  if (b.dataset.stnew != null) openSd('yeni'); else pickSup(b.dataset.stsup);
});
// giriş kartları Stok sayfasında, ürün detayında ve toptancı sayfasında
document.addEventListener('click', function (ev) {
  var b = ev.target.closest('[data-prod],[data-ship],[data-sd],[data-shpdel],[data-depundo]');
  if (!b || b.closest('#stSup') && b.dataset.sd) return; // toptancı sayfasındaki pencere butonları toptanci.js'te
  if (b.dataset.sd) openSd(b.dataset.sd, b.dataset.ref);
  else if (b.dataset.prod) openProd(b.dataset.prod);
  else if (b.dataset.ship) openEntry(b.dataset.ship);
  else if (b.dataset.depundo) undoDep(b.dataset.depundo);
  else if (b.dataset.shpdel) arm(b, function () { deletePay(b.dataset.shpdel); });
});
