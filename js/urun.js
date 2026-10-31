'use strict';
/* Ürün detayı, sayım, ad düzeltme */

mountDialog(`
<dialog id="dlgProd" aria-labelledby="prT"><div class="sheet">
  <header><h2 id="prT"></h2><button type="button" data-close>Kapat</button></header>
  <div class="big" id="prQty"></div>
  <div class="row">
    <button type="button" class="primary grow" id="prAdd">Bu üründen giriş ekle</button>
    <button type="button" id="prCnt">Sayım yap</button>
  </div>
  <details class="more" id="prMore"><summary><span>Ayrıntılar, girişler ve sayımlar</span></summary><div class="morein">
    <p class="hint" id="prMeta"></p>
    <button type="button" id="prRen">Adı düzelt</button>
    <div class="card" id="prRenBox" hidden>
      <div class="grid2">
        <label class="f">Marka<input id="rnBrand" autocomplete="off"></label>
        <label class="f">Çeşit<input id="rnVar" autocomplete="off"></label>
      </div>
      <p class="hint" id="rnHint"></p>
      <button type="button" class="primary" id="rnSave">Adı kaydet</button>
    </div>
    <div class="list" id="prList"></div>
  </div></details>
</div></dialog>

<dialog id="dlgCount" aria-labelledby="cntT"><div class="sheet">
  <header><h2 id="cntT">Stok sayımı</h2><button type="button" data-close>Kapat</button></header>
  <p class="hint">Saydığın koliyi yaz, saymadığını boş bırak.</p>
  <details class="more"><summary><span>Sayım ne yapar?</span></summary><div class="morein"><p class="hint">Stok bu sayıdan devam eder; önceki giriş ve satışlar kayıtlarda kalır ama stoğu artık etkilemez.</p></div></details>
  <div id="cntList"></div>
  <p class="err" id="cntErr" role="alert"></p>
  <button type="button" class="primary" id="cntSave">Sayımı kaydet</button>
</div></dialog>`);

var curProd = null;
function openProd(pid) {
  curProd = pid;
  var p = db.products[pid], list = entriesOf(pid).sort(function (a, b) { return cmp(entKey(b), entKey(a)); });
  var q = stockOf(pid), sold = soldOf(pid);
  $('prT').textContent = p.brand + ' ' + p.variety;
  $('prQty').textContent = fmt(q) + ' koli';
  var l = list[0];
  $('prMeta').textContent = [palTxt(q, p.kpp), p.kpp ? 'palette ' + p.kpp + ' koli' : '', l ? 'son giriş ' + dateTR(l.date) + ' (' + ago(l.date) + ')' : '', list.length + ' giriş', 'satılan ' + fmt(sold) + ' koli', p.price != null ? 'satış fiyatı ' + money(p.price) : ''].filter(Boolean).join(' · ');
  var lc = lastEntry(countsOf(pid));
  if (lc) $('prMeta').textContent += ' · son sayım ' + dateTR(lc.date) + ' (' + fmt(lc.koli) + ' koli)';
  var ts = supsSorted().filter(function (t) { return t.pids.indexOf(pid) >= 0; });
  if (ts.length) $('prMeta').textContent += ' · toptancı: ' + ts.map(function (t) { return t.name; }).join(', ');
  var rows = list.map(function (e) { return { k: entKey(e), h: entHTML(e) }; })
    .concat(countsOf(pid).map(function (c) { return { k: entKey(c), h: cntHTML(c) }; }))
    .sort(function (a, b) { return cmp(b.k, a.k); });
  $('prList').innerHTML = rows.length ? rows.map(function (r) { return r.h; }).join('') : '<div class="empty">Giriş yok.</div>';
  $('prRenBox').hidden = true;
  if (!$('dlgProd').open) { $('prMore').open = false; $('dlgProd').showModal(); }
}
function cntHTML(c) {
  return '<div class="ent cnt"><span class="h"><b>Sayım: ' + fmt(c.koli) + ' koli</b><span class="d">' + dateTR(c.date) + (c.time ? ' ' + c.time : '') + '</span></span>'
    + '<span class="p">Stok bu andan itibaren bu sayıdan devam eder.</span>'
    + '<div class="acts"><button type="button" class="danger" data-cdel="' + c.id + '">Sayımı sil</button></div></div>';
}

/* ---------- sayım ---------- */
var cntOnly = null;
function openCount(pid) {
  cntOnly = pid || null;
  $('cntList').innerHTML = brands(true).map(function (b) {
    var ids = b.ids.filter(function (id) { return !cntOnly || id === cntOnly; });
    if (!ids.length) return '';
    return '<div class="cgrp"><h3>' + esc(b.name) + '</h3>' + ids.map(function (id) {
      return '<div class="crow"><span class="l"><b>' + esc(db.products[id].variety) + '</b><small>Kayda göre ' + fmt(stockOf(id)) + ' koli</small></span>'
        + '<input data-cnt="' + id + '" inputmode="numeric" autocomplete="off" placeholder="koli" aria-label="' + esc(pname(id)) + ' sayılan koli"></div>';
    }).join('') + '</div>';
  }).join('') || '<div class="empty">Ürün yok.</div>';
  $('cntErr').textContent = '';
  if ($('dlgProd').open) $('dlgProd').close();
  $('dlgCount').showModal();
}
function saveCount() {
  var inputs = Array.prototype.slice.call(document.querySelectorAll('#cntList [data-cnt]')).filter(function (i) { return i.value.trim(); });
  if (!inputs.length) { $('cntErr').textContent = 'En az bir ürünün sayısını yaz.'; return; }
  var bad = inputs.filter(function (i) { return num(i.value) == null; })[0];
  if (bad) { $('cntErr').textContent = pname(bad.dataset.cnt) + ' için sayıyı rakamla yaz.'; return; }
  var d = today(), t = nowHM(), ts = Date.now();
  inputs.forEach(function (i, k) { db.counts.push({ id: 'c' + uid() + k, ts: ts + k, pid: i.dataset.cnt, date: d, time: t, koli: num(i.value) }); });
  if (!persist()) return;
  $('dlgCount').close(); renderAll();
  toast(inputs.length + ' ürünün sayımı kaydedildi.');
  if (cntOnly) openProd(cntOnly);
}
function deleteCount(id) {
  var c = byId(db.counts, id); if (!c) return;
  db.counts = db.counts.filter(function (x) { return x.id !== id; });
  tidy(); persist(); renderAll();
  if (db.products[c.pid]) openProd(c.pid); else $('dlgProd').close();
  toast('Sayım silindi.');
}

function renHint() {
  var b = clean($('rnBrand').value), v = clean($('rnVar').value), o = findProduct(b, v);
  $('rnHint').textContent = !b || !v ? 'Marka ve çeşit boş olamaz.' : o && o !== curProd ? pname(o) + ' zaten var. Kaydedersen iki ürün birleşir.' : '';
}
function saveRename() {
  var b = clean($('rnBrand').value), v = clean($('rnVar').value);
  if (!b || !v) return renHint();
  var o = findProduct(b, v);
  if (o && o !== curProd) {
    db.entries.forEach(function (e) { if (e.pid === curProd) e.pid = o; });
    db.sales.forEach(function (s) { s.items.forEach(function (i) { if (i.pid === curProd) i.pid = o; }); });
    db.counts.forEach(function (c) { if (c.pid === curProd) c.pid = o; });
    db.sups.forEach(function (t) { if (t.pids.indexOf(curProd) >= 0) { t.pids = t.pids.filter(function (x) { return x !== curProd; }); supAddPid(t, o); } });
    delete db.products[curProd]; curProd = o;
  } else {
    db.products[curProd].brand = b; db.products[curProd].variety = v;
  }
  tidy(); persist(); renderAll(); openProd(curProd); toast('Ürün adı kaydedildi.');
}

$('prCnt').addEventListener('click', function () { openCount(curProd); });
$('cntSave').addEventListener('click', saveCount);
// toptancı: Stok'ta seçili olan, yoksa bu ürünün son geldiği toptancı
$('prAdd').addEventListener('click', function () {
  var l = lastEntry(entriesOf(curProd)), s = l && byId(db.ships, l.sid);
  openEntry(null, db.products[curProd], stSup || (s && s.sup) || '');
});
$('prRen').addEventListener('click', function () {
  var p = db.products[curProd]; $('rnBrand').value = p.brand; $('rnVar').value = p.variety; renHint();
  $('prRenBox').hidden = !$('prRenBox').hidden; if (!$('prRenBox').hidden) $('rnBrand').focus();
});
$('rnBrand').addEventListener('input', renHint); $('rnVar').addEventListener('input', renHint);
$('rnSave').addEventListener('click', saveRename);
document.addEventListener('click', function (ev) {
  var b = ev.target.closest('[data-cdel]'); if (b) arm(b, function () { deleteCount(b.dataset.cdel); });
});
