'use strict';
/* Stok sayfası: üstte toptancı seçimi; Tümü'nde bütün stok ve girişler, toptancıda onun sayfası (toptanci.js) */

mountPage(`
  <section class="page" id="p-stok" hidden>
    <header class="top"><h1>Stok</h1></header>
    <div class="chips" id="stTabs"></div>
    <div class="card" id="stNew" hidden>
      <h2>Yeni toptancı</h2>
      <label class="f">Toptancı / firma adı<input id="stNewName" autocomplete="off" placeholder="ör. Yıldız Toptan"></label>
      <p class="err" id="stNewErr" role="alert"></p>
      <div class="row"><button type="button" class="primary grow" id="stNewSave">Toptancıyı ekle</button><button type="button" id="stNewCancel">Vazgeç</button></div>
    </div>
    <div class="col" id="stAll">
      <div class="kpis" id="kpis"></div>
      <div class="grid2">
        <button type="button" class="primary addbtn" id="btnAdd">+ Ürün girişi</button>
        <button type="button" class="addbtn" id="btnCount">Sayım gir</button>
      </div>
      <div class="list" id="brands"></div>
      <h2>Toptancılar</h2>
      <div class="tbl" id="stSupTbl"></div>
      <h2>Son girişler</h2>
      <div class="list" id="recent"></div>
      <button type="button" id="recentMore" hidden>Daha fazla göster</button>
    </div>
    <div class="col" id="stSup" hidden></div>
  </section>`);

// stSup: seçili toptancı ('' = Tümü)
var stSup = '', stNew = false;
function renderStock() {
  if (stSup && !supOf(stSup)) stSup = '';
  $('stTabs').innerHTML = '<button type="button" data-stsup="" aria-pressed="' + !stSup + '">Tümü</button>'
    + supsSorted().map(function (t) { return '<button type="button" data-stsup="' + t.id + '" aria-pressed="' + (stSup === t.id) + '">' + esc(t.name) + '</button>'; }).join('')
    + '<button type="button" class="add" data-stnew>+ Toptancı</button>';
  $('stNew').hidden = !stNew;
  $('stAll').hidden = !!stSup; $('stSup').hidden = !stSup;
  if (stSup) renderSupPanel(supOf(stSup)); else renderStockAll();
}
function pickSup(id) {
  stSup = id; stLimit = 15; payOpen = null;
  renderStock(); window.scrollTo(0, 0);
}
function addSup() {
  var name = clean($('stNewName').value);
  if (!name) { $('stNewErr').textContent = 'Toptancının adını yaz.'; return; }
  if (findSup(name)) { $('stNewErr').textContent = findSup(name).name + ' zaten var.'; return; }
  var t = ensureSup(name);
  if (!persist()) return;
  stNew = false; $('stNewName').value = ''; $('stNewErr').textContent = '';
  pickSup(t.id); toast(t.name + ' eklendi. Ürünlerini ve palet çeşitlerini ekleyebilirsin.');
}
// Tümü: bütün stok, toptancıların özeti ve bütün girişler
function renderStockAll() {
  var all = db.entries, totalKoli = 0, nProd = 0, debt = supDebt(), month = today().slice(0, 7), mon = 0;
  Object.keys(db.products).forEach(function (id) { if (inUse(id)) { totalKoli += stockOf(id); nProd++; } });
  all.forEach(function (e) { if (e.date.slice(0, 7) === month && e.total != null) mon += e.total; });
  var last = lastEntry(all);
  $('kpis').innerHTML =
    '<div class="kpi"><span>Toplam stok</span><b>' + fmt(totalKoli) + ' koli</b><small>' + nProd + ' çeşit ürün</small></div>'
    + '<div class="kpi"><span>Son giriş</span><b>' + (last ? dateTR(last.date) : '—') + '</b><small>' + (last ? esc(pname(last.pid)) + ' · ' + ago(last.date) : 'Henüz giriş yok') + '</small></div>'
    + '<div class="kpi"><span>Bu ay alım</span><b>' + money(mon) + '</b></div>'
    + '<div class="kpi' + (debt > 0 ? ' bad' : '') + '"><span>Toptancıya kalan borç</span><b>' + money(debt) + '</b></div>';

  var bs = brands(true);
  if (!bs.length) {
    $('brands').innerHTML = '<div class="empty">Henüz ürün yok. İlk tır geldiğinde <b>+ Ürün girişi</b> ile ekle.</div>';
  } else {
    $('brands').innerHTML = bs.map(function (b) {
      var sum = b.ids.reduce(function (t, id) { return t + stockOf(id); }, 0);
      return '<section class="brand"><h3>' + esc(b.name) + '<span>' + b.ids.length + ' çeşit · ' + fmt(sum) + ' koli</span></h3>'
        + b.ids.map(function (id) {
          var p = db.products[id], q = stockOf(id), l = lastEntry(entriesOf(id));
          return '<button type="button" class="prod' + ((p.kpp ? q < p.kpp : q <= 0) ? ' low' : '') + '" data-prod="' + id + '">'
            + '<span class="l"><span class="v">' + esc(p.variety) + '</span><span class="m">Son giriş ' + (l ? dateTR(l.date) + ' · ' + ago(l.date) : '—') + (p.kpp ? ' · palette ' + p.kpp + ' koli' : '') + '</span></span>'
            + '<span class="q"><b>' + fmt(q) + '</b> koli<small>' + palTxt(q, p.kpp) + '</small></span></button>';
        }).join('') + '</section>';
    }).join('');
  }

  // toptancılar: giriş, borç, iadesi beklenen palet parası; satıra dokununca toptancının sayfası açılır
  var rows = supsSorted().map(function (t) {
    var ss = shipsOf(t.id), l = lastEntry(ss), d = supDebt(t.id), pl = palLedger(t).open;
    return '<tr class="tap" data-stsup="' + t.id + '"><td><b>' + esc(t.name) + '</b>' + (l ? '<small class="unk"> · ' + dateTR(l.date) + '</small>' : '') + '</td>'
      + '<td>' + ss.length + '</td><td' + (d > 0.004 ? ' class="neg"' : '') + '>' + (d < -0.004 ? 'avans ' + money(-d) : money(d)) + '</td><td>' + (Math.abs(pl) > 0.004 ? sm(pl) : '—') + '</td></tr>';
  });
  var none = shipsOf('');
  if (none.length && rows.length) rows.push('<tr><td class="unk">Toptancısız girişler</td><td>' + none.length + '</td><td>' + money(supDebt('')) + '</td><td>—</td></tr>');
  $('stSupTbl').innerHTML = rows.length
    ? '<table><thead><tr><th>Toptancı</th><th>Giriş</th><th>Borç</th><th>Palet parası</th></tr></thead><tbody>' + rows.join('') + '</tbody></table>'
    : '<div class="empty" style="border:0">Henüz toptancı yok. Yukarıdan <b>+ Toptancı</b> ile ekle; her toptancının ürünleri, boş paletleri ve girişleri ayrı tutulur.</div>';

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
var stLimit = 15, payOpen = null;
function shipHTML(s) {
  // toptancılı girişin ödemesi yok: tutarı toptancı hesabına yazılır, ödemeler hesabın toplamından düşer
  var ls = linesOf(s.id), acc = !!s.sup, tot = acc ? shipDue(s) : shipTotal(s), paid = acc ? 0 : shipPaid(s), rem = acc ? 0 : tot - paid, open = payOpen === s.id;
  var koli = ls.reduce(function (t, e) { return t + e.koli; }, 0);
  var pays = s.pays.slice().sort(function (a, b) { return cmp(a.date + ' ' + a.ts, b.date + ' ' + b.ts); });
  return '<div class="ship' + (rem > 0.004 ? ' due' : '') + '">'
    + '<div class="sh"><span class="d">' + dateTR(s.date) + (s.time ? ' ' + s.time : '') + (s.sup && stSup !== s.sup ? '<small class="sup">' + esc(supName(s.sup)) + '</small>' : '') + '</span>'
    + '<span class="tt"><b>' + (tot ? money(tot) : 'fiyatsız') + '</b><small>' + ls.length + ' çeşit · ' + fmt(koli) + ' koli</small></span></div>'
    + '<ul class="its">' + ls.map(function (e) {
      var k = e.koli;
      return '<li><span><b>' + esc(pname(e.pid)) + '</b><small>' + lineKoliTxt(e) + '</small></span>'
        + '<span>' + (e.total != null ? money(e.total) + (k ? '<small>' + (e.auto ? 'pay · ' : '') + 'koli ' + money(e.total / k) + '</small>' : '')
          + (k && e.extra ? '<small>giderle koli ' + money((e.total + e.extra) / k) + '</small>' : '') : '—') + '</span></li>';
    }).join('') + '</ul>'
    + (shipExtra(s) ? '<span class="xc">' + extraTxt(s) + '<small>maliyete eklendi' + (!acc && shipExtraOut(s) ? '; ayrı ödenenler borca eklenmedi' : '') + '</small></span>' : '')
    + (s.dep > 0 ? '<div class="dep' + (s.depBack ? ' back' : '') + '"><span class="xc">Boş palet parası ' + money(s.dep)
        + ((s.depLines || []).length ? ' <small>(' + depLinesTxt(s.depLines) + ')</small>'
          : s.depPer ? ' <small>(' + fmt(Math.round(s.dep / s.depPer * 100) / 100) + ' palet × ' + money(s.depPer) + ')</small>' : '')
        + (s.depIn ? ' <small>(toplamın içinde)</small>' : '')
        // toptancılı girişin paleti toptancının palet hesabından iade edilir
        + '<small>' + (s.depBack ? 'İade edildi · ' + dateTR(s.depBack) : s.sup ? 'İadesi toptancının palet hesabında' : 'İade bekliyor') + '</small></span>'
      + (s.depBack
        ? '<button type="button" data-depundo="' + s.id + '">Geri al</button>'
        : s.sup ? '' : '<input type="date" data-depd="' + s.id + '" value="' + today() + '" aria-label="İade tarihi"><button type="button" class="paidbtn" data-depback="' + s.id + '">İade edildi</button>')
      + '</div>' : '')
    + (acc && tot ? '<div class="pays"><div class="pst acc">Toptancı hesabına: mal bedeli ' + money(shipGoods(s))
        + (shipExtra(s) ? ' + nakliye/ek gider ' + money(shipExtra(s)) : '') + (s.dep > 0 ? ' + boş palet ' + money(s.dep) : '') + ' = <b>' + money(tot) + '</b></div></div>' : '')
    + (!acc && tot ? '<div class="pays">'
      + pays.map(function (x) {
        return '<div class="pay"><span>' + dateTR(x.date) + ' ödeme</span><b>' + money(x.amount) + '</b>'
          + '<button type="button" class="danger" data-shpdel="' + s.id + '|' + x.id + '">Sil</button>'
          + (x.note ? '<small>' + esc(x.note) + '</small>' : '') + '</div>';
      }).join('')
      + '<div class="pst">' + (rem > 0.004 ? 'Ödenen ' + money(paid) + ' · <span class="debt">kalan ' + money(rem) + '</span>' : 'Tamamı ödendi') + '</div>'
      + '</div>' : '')
    + (s.note ? '<span class="note">' + esc(s.note) + '</span>' : '')
    + (open ? '<div class="payf">'
      + '<div class="grid2"><label class="f">Ödenen tutar (₺)<input id="pAmt" inputmode="decimal" autocomplete="off" placeholder="ör. ' + amt(rem) + '"></label>'
      + '<label class="f">Ödeme tarihi<input type="date" id="pDate" value="' + today() + '"></label></div>'
      + '<label class="f">Not<input id="pNote" autocomplete="off" placeholder="ör. Havale ile, elden verdim"></label>'
      + '<p class="err" id="pErr" role="alert"></p>'
      + '<div class="row"><button type="button" class="paidbtn grow" data-shpsave="' + s.id + '">Ödemeyi kaydet</button><button type="button" data-shpcancel>Vazgeç</button></div>'
      + '</div>' : '')
    + '<div class="acts">'
    + (tot && rem > 0.004 && !open ? '<button type="button" class="paidbtn" data-shpay="' + s.id + '">Ödeme yap</button>' : '')
    + '<button type="button" data-ship="' + s.id + '">Düzenle</button></div>'
    + '</div>';
}
function markDep(sid, back) {
  var s = byId(db.ships, sid); if (!s) return;
  var d = back && document.querySelector('[data-depd="' + sid + '"]');
  s.depBack = back ? (d && d.value) || today() : null;
  if (!persist()) return;
  renderAll(); toast(back ? 'Palet parası iade edildi: ' + money(s.dep) : 'İade geri alındı.');
}
function openPay(sid) { payOpen = sid; renderStock(); if ($('pAmt')) $('pAmt').focus(); }
function savePay(sid) {
  var s = byId(db.ships, sid); if (!s) return;
  var raw = $('pAmt').value.trim(), a = num(raw), d = $('pDate').value, rem = shipTotal(s) - shipPaid(s), err = '';
  if (!raw) err = 'Ödediğin tutarı yaz.';
  else if (a == null || a <= 0) err = 'Tutarı sayı olarak yaz, ör. 5000.';
  else if (a > rem + 0.004) err = 'Kalan borçtan (' + money(rem) + ') fazla olamaz.';
  else if (!d) err = 'Ödeme tarihini seç.';
  if (err) { $('pErr').textContent = err; return; }
  s.pays.push({ id: 'o' + uid(), ts: Date.now(), date: d, amount: a, note: clean($('pNote').value) });
  if (!persist()) return;
  payOpen = null; renderAll();
  toast(money(a) + ' ödeme kaydedildi · ' + (rem - a > 0.004 ? 'kalan ' + money(rem - a) : 'tamamı ödendi'));
}
function deletePay(ref) {
  var k = ref.split('|'), s = byId(db.ships, k[0]); if (!s) return;
  s.pays = s.pays.filter(function (x) { return x.id !== k[1]; });
  persist(); renderAll(); toast('Ödeme silindi.');
}

$('recentMore').addEventListener('click', function () { stLimit += 15; renderStock(); });
$('btnAdd').addEventListener('click', function () { openEntry(null, null); });
$('btnCount').addEventListener('click', function () { openCount(null); });
$('stNewSave').addEventListener('click', addSup);
$('stNewCancel').addEventListener('click', function () { stNew = false; renderStock(); });
$('stNewName').addEventListener('keydown', function (ev) { if (ev.key === 'Enter') addSup(); });
$('p-stok').addEventListener('click', function (ev) {
  var b = ev.target.closest('[data-stsup],[data-stnew]'); if (!b) return;
  if (b.dataset.stnew != null) {
    stNew = !stNew; $('stNewErr').textContent = ''; renderStock();
    if (stNew) $('stNewName').focus();
  } else pickSup(b.dataset.stsup);
});
// giriş kartları Stok sayfasında, ürün detayında ve toptancı sayfasında
document.addEventListener('click', function (ev) {
  var b = ev.target.closest('[data-prod],[data-ship],[data-shpay],[data-shpsave],[data-shpcancel],[data-shpdel],[data-depback],[data-depundo]');
  if (!b) return;
  if (b.dataset.prod) openProd(b.dataset.prod);
  else if (b.dataset.ship) openEntry(b.dataset.ship);
  else if (b.dataset.shpay) openPay(b.dataset.shpay);
  else if (b.dataset.shpsave) savePay(b.dataset.shpsave);
  else if (b.dataset.shpcancel != null) { payOpen = null; renderStock(); }
  else if (b.dataset.depback) markDep(b.dataset.depback, true);
  else if (b.dataset.depundo) markDep(b.dataset.depundo, false);
  else if (b.dataset.shpdel) arm(b, function () { deletePay(b.dataset.shpdel); });
});
document.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' && (ev.target.id === 'pAmt' || ev.target.id === 'pNote')) { var b = document.querySelector('[data-shpsave]'); if (b) savePay(b.dataset.shpsave); } });
