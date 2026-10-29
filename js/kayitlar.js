'use strict';
/* Kayıtlar sayfası */

mountPage(`
  <section class="page" id="p-kayit" hidden>
    <header class="top"><h1>Kayıtlar</h1><span class="hint" id="rPerTxt"></span></header>
    <div class="chips" id="rPer">
      <button type="button" data-per="bugun" aria-pressed="false">Bugün</button>
      <button type="button" data-per="7" aria-pressed="false">Son 7 gün</button>
      <button type="button" data-per="ay" aria-pressed="true">Bu ay</button>
      <button type="button" data-per="gecen" aria-pressed="false">Geçen ay</button>
      <button type="button" data-per="tum" aria-pressed="false">Tümü</button>
    </div>
    <div class="kpis" id="rKpis"></div>
    <h2>Stok durumu <small class="hint">(şu an)</small></h2>
    <div class="tbl" id="rProd"></div>
    <h2>Genel durum <small class="hint">(tüm zamanlar)</small></h2>
    <div class="kpis" id="rGen"></div>
    <h2>Satışlar</h2>
    <input type="search" id="rQ" autocomplete="off" placeholder="Ara: ürün, not, tarih (ör. serinyol, 19.09)">
    <div class="chips" id="rPay">
      <button type="button" data-rpay="" aria-pressed="true">Hepsi</button>
      <button type="button" data-rpay="borclu" aria-pressed="false">Borçlu</button>
      <button type="button" data-rpay="nakit" aria-pressed="false">Nakit</button>
      <button type="button" data-rpay="havale" aria-pressed="false">Havale</button>
      <button type="button" id="rRefresh" class="refresh" title="Ödendi işaretlenenleri listeden düşür">↻ Yenile</button>
    </div>
    <p class="hint" id="rCount"></p>
    <div class="tbl sum" id="rSum" hidden></div>
    <div class="list" id="rList"></div>
    <button type="button" id="rMore" hidden>Daha fazla göster</button>
  </section>`);

var rPer = 'ay', rPay = '', rLimit = 40, rKeep = {};
function renderRecords() {
  var p = period(), ct = costTable();
  $('rPerTxt').textContent = p.txt;
  var S = { n: 0, koli: 0, ciro: 0, rem: 0, paid: 0, nakit: 0, havale: 0, cost: 0, knownRev: 0, unkRev: 0, unkKoli: 0 };
  db.sales.forEach(function (s) {
    // tahsilat, satış tarihine değil paranın alındığı tarihe göre sayılır
    saleCollected(s).forEach(function (x) { if (inPer(x.date, p)) { S.paid += x.amount; S[s.pay === 'havale' ? 'havale' : 'nakit'] += x.amount; } });
    if (!inPer(s.date, p)) return;
    S.n++; S.ciro += saleTotal(s); S.rem += saleTotal(s) - salePaid(s);
    s.items.forEach(function (i) {
      var r = i.n * i.price, c = unitCost(ct, i.pid, s.date);
      S.koli += i.n;
      if (c == null) { S.unkRev += r; S.unkKoli += i.n; }
      else { S.cost += c * i.n; S.knownRev += r; }
    });
  });
  var inc = 0, out = 0, buy = 0, supPaid = 0, extra = 0, dep = 0;
  db.cash.forEach(function (x) { if (inPer(x.date, p)) { if (x.kind === 'gelir') inc += x.amount; else out += x.amount; } });
  db.entries.forEach(function (e) { if (inPer(e.date, p) && e.total != null) buy += e.total; });
  db.ships.forEach(function (s) {
    s.pays.forEach(function (x) { if (inPer(x.date, p)) supPaid += x.amount; });
    if (inPer(s.date, p)) extra += shipExtraOut(s);
    if (s.dep > 0 && !s.depIn && inPer(s.date, p)) dep -= s.dep;
    if (s.dep > 0 && s.depBack && inPer(s.depBack, p)) dep += s.dep;
  });
  // toptancıya boş palet verilince geri alınan para
  db.sups.forEach(function (t) { t.rets.forEach(function (r) { if (inPer(r.date, p)) dep += r.amount; }); });
  var gross = S.knownRev - S.cost, net = gross + inc - out, flow = S.paid + inc - out - supPaid - extra + dep, rem = S.rem;
  var unkTxt = S.unkKoli ? fmt(S.unkKoli) + ' koli alış fiyatı bilinmiyor (' + money(S.unkRev) + ' ciro hariç)' : '';
  $('rKpis').innerHTML =
    kpi('Ciro', money(S.ciro), S.n + ' satış · ' + fmt(S.koli) + ' koli')
    + kpi('Tahsil edilen', money(S.paid), 'ödeme tarihine göre · nakit ' + money(S.nakit) + ' · havale ' + money(S.havale), 'ok')
    + kpi('Alacak', money(rem), 'bu dönemin satışlarından', rem > 0.004 ? 'bad' : '')
    + kpi('Malın maliyeti', money(S.cost), unkTxt || 'alış fiyatı + nakliye/ek gider payı', unkTxt ? 'warn' : '')
    + kpi('Brüt kâr', sm(gross), (S.knownRev ? 'kâr oranı %' + fmt(gross / S.knownRev * 100) : 'ciro − maliyet') + (unkTxt ? ' · bilinmeyenler hariç' : ''), gross < 0 ? 'bad' : 'ok')
    + kpi('Ek gelir', money(inc), 'Gelir-Gider sayfasından', 'ok')
    + kpi('Gider', money(out), 'Gelir-Gider sayfasından', 'bad')
    + kpi('Stok alımı', money(buy), 'toptancıya ödenen ' + money(supPaid) + (extra ? ' · nakliye/ek gider ' + money(extra) : ''))
    + kpi('Net kâr', sm(net), 'brüt kâr + ek gelir − gider', 'wide hero ' + (net < 0 ? 'bad' : 'ok'))
    + kpi('Kasa hareketi', sm(flow), 'tahsilat + ek gelir − gider − toptancıya ödenen' + (extra ? ' − nakliye/ek gider' : '') + (dep ? ' ' + (dep < 0 ? '−' : '+') + ' boş palet parası ' + money(Math.abs(dep)) : ''), 'wide ' + (flow < 0 ? 'bad' : 'ok'));

  // stok durumu (şu an): son sayım + sonrasında giren − sonrasında satılan
  var rows = '', T = { cnt: 0, in: 0, out: 0, now: 0 };
  brands(true).forEach(function (b) {
    rows += '<tr class="g"><td colspan="5">' + esc(b.name) + '</td></tr>';
    b.ids.forEach(function (id) {
      var c = lastEntry(countsOf(id)), from = c ? entKey(c) : '', gin = 0, out = 0;
      entriesOf(id).forEach(function (e) { if (entKey(e) > from) gin += e.koli; });
      db.sales.forEach(function (s) { if (entKey(s) > from) s.items.forEach(function (x) { if (x.pid === id) out += x.n; }); });
      var now = (c ? c.koli : 0) + gin - out;
      T.cnt += c ? c.koli : 0; T.in += gin; T.out += out; T.now += now;
      rows += '<tr><td>' + esc(db.products[id].variety) + '</td>'
        + (c ? '<td>' + fmt(c.koli) + '<small class="unk"> · ' + dateTR(c.date) + '</small></td>' : '<td class="unk">sayım yok</td>')
        + '<td>' + (gin ? '+' + fmt(gin) : '0') + '</td><td>' + (out ? '−' + fmt(out) : '0') + '</td>'
        + '<td' + (now < 0 ? ' class="neg"' : '') + '><b>' + fmt(now) + '</b></td></tr>';
    });
  });
  $('rProd').innerHTML = rows
    ? '<table><thead><tr><th>Ürün</th><th>Son sayım</th><th>Sonra giren</th><th>Sonra satılan</th><th>Şimdiki stok</th></tr></thead><tbody>' + rows + '</tbody>'
      + '<tfoot><tr><td>Toplam</td><td>' + fmt(T.cnt) + '</td><td>+' + fmt(T.in) + '</td><td>−' + fmt(T.out) + '</td><td>' + fmt(T.now) + '</td></tr></tfoot></table>'
      + '<p class="hint" style="padding:8px 10px">Koli olarak. Sayımı olmayan üründe en baştan beri giren ve satılan sayılır. Dönem seçiminden etkilenmez.</p>'
    : '<div class="empty" style="border:0">Henüz ürün yok.</div>';

  // genel durum
  var allRem = 0, nOpen = 0, allCiro = 0, debt = 0, val = 0, valKoli = 0, valUnk = 0;
  db.sales.forEach(function (s) { var t = saleTotal(s); allCiro += t; if (saleOpen(s)) { nOpen++; allRem += t - salePaid(s); } });
  debt = supDebt();
  // iadesi beklenen palet parası: toptancısız girişler tek tek, toptancılı olanlar toptancının palet hesabından
  var depWait = depWaiting(), depN = 0, depAny = false;
  db.ships.forEach(function (s) { if (s.dep > 0) depAny = true; if (depOpen(s)) depN++; });
  db.sups.forEach(function (t) { if (palLedger(t).open > 0.004) depN++; });
  Object.keys(db.products).forEach(function (id) {
    var q = Math.max(0, stockOf(id)), c = unitCost(ct, id, today());
    if (!q) return;
    if (c == null) valUnk += q; else { val += q * c; valKoli += q; }
  });
  $('rGen').innerHTML =
    kpi('Müşterilerden alacak', money(allRem), nOpen + ' satış ödenmedi', allRem > 0.004 ? 'bad' : 'ok')
    + kpi('Toptancıya borç', money(debt), '', debt > 0.004 ? 'bad' : '')
    + kpi('Elimdeki stok değeri', money(val), fmt(valKoli) + ' koli, alış fiyatıyla' + (valUnk ? ' · ' + fmt(valUnk) + ' koli fiyatsız' : ''))
    + kpi('Toplam ciro', money(allCiro), db.sales.length + ' satış')
    + (depAny ? kpi('İadesi beklenen palet parası', money(depWait), depN ? depN + ' giriş / toptancıda boş palet geri verilmedi' : 'hepsi iade edildi', depWait > 0.004 ? 'warn' : 'ok') : '');

  renderRecordList(p);
}
function saleText(s) {
  return [dateTR(s.date), s.time, s.pay, s.note].concat(s.items.map(function (i) { return pname(i.pid); })).join(' ');
}
function renderRecordList(p) {
  var q = fold($('rQ').value.trim());
  var list = db.sales.filter(function (s) {
    if (!inPer(s.date, p)) return false;
    if (rPay === 'borclu' && !saleOpen(s) && !rKeep[s.id]) return false;
    if ((rPay === 'nakit' || rPay === 'havale') && (s.pay || 'nakit') !== rPay) return false;
    return !q || fold(saleText(s)).indexOf(q) >= 0;
  }).sort(function (a, b) { return cmp(entKey(b), entKey(a)); });
  var tot = 0, rem = 0, koli = 0, by = {}, ct = costTable(), P = { prof: 0, unk: false };
  list.forEach(function (s) {
    tot += saleTotal(s); rem += saleTotal(s) - salePaid(s);
    s.items.forEach(function (i) {
      var o = by[i.pid] = by[i.pid] || { n: 0, t: 0, prof: 0, known: 0, unk: 0 }, r = i.n * i.price, c = unitCost(ct, i.pid, s.date);
      o.n += i.n; o.t += r; koli += i.n;
      if (c == null) { o.unk += i.n; P.unk = true; } else { o.prof += r - c * i.n; o.known += i.n; P.prof += r - c * i.n; }
    });
  });
  $('rCount').textContent = list.length ? list.length + ' satış · ' + fmt(koli) + ' koli · ' + money(tot) + (rem > 0.004 ? ' · alacak ' + money(rem) : '') : '';
  // listedeki satışların çeşit özeti (filtre ve aramaya göre)
  var rows = '', ids = [];
  brands().forEach(function (b) { b.ids.forEach(function (id) { if (by[id]) ids.push(id); }); });
  Object.keys(by).forEach(function (id) { if (ids.indexOf(id) < 0) ids.push(id); }); // silinmiş ürünler
  ids.forEach(function (id) {
    var o = by[id];
    rows += '<tr><td>' + esc(pname(id)) + '</td><td>' + fmt(o.n) + '</td><td>' + money(o.t) + '</td><td>' + (o.n ? money(o.t / o.n) : '—') + '</td>'
      + (o.known ? '<td' + (o.prof < 0 ? ' class="neg"' : '') + '>' + sm(o.prof) + (o.unk ? '*' : '') + '</td>' : '<td class="unk">?</td>') + '</tr>';
  });
  $('rSum').hidden = !rows;
  $('rSum').innerHTML = rows
    ? '<div class="tblh">Satış tablosu</div>'
      + '<table><thead><tr><th>Çeşit</th><th>Koli</th><th>Tutar</th><th>Ort. koli</th><th>Kâr</th></tr></thead><tbody>' + rows + '</tbody>'
      + '<tfoot><tr><td>Toplam</td><td>' + fmt(koli) + '</td><td>' + money(tot) + '</td><td>' + (koli ? money(tot / koli) : '—') + '</td><td' + (P.prof < 0 ? ' class="neg"' : '') + '>' + sm(P.prof) + '</td></tr></tfoot></table>'
      + (P.unk ? '<p class="hint" style="padding:6px 8px">? ve *: alış fiyatı bilinmeyen koliler kâra katılmadı.</p>' : '')
    : '';
  if (!list.length) { $('rList').innerHTML = '<div class="empty">Satış bulunamadı.</div>'; $('rMore').hidden = true; return; }
  var dayTot = {};
  list.forEach(function (s) { var d = dayTot[s.date] = dayTot[s.date] || { n: 0, t: 0, r: 0 }; d.n++; d.t += saleTotal(s); d.r += saleTotal(s) - salePaid(s); });
  var h = '', day = null;
  list.slice(0, rLimit).forEach(function (s) {
    if (s.date !== day) {
      day = s.date; var d = dayTot[day];
      h += '<div class="dayh"><b>' + dateTR(day) + ' ' + weekday(day) + '</b><span>' + d.n + ' satış · ' + money(d.t) + (d.r > 0.004 ? ' · alacak ' + money(d.r) : '') + '</span></div>';
    }
    h += saleHTML(s);
  });
  $('rList').innerHTML = h;
  $('rMore').hidden = list.length <= rLimit;
  $('rMore').textContent = 'Daha fazla göster (' + (list.length - rLimit) + ' satış daha)';
}

$('rPer').addEventListener('click', function (ev) { var b = ev.target.closest('[data-per]'); if (!b) return; rPer = b.dataset.per; rLimit = 40; pressChip(this, 'per', rPer); renderRecords(); });
$('rPay').addEventListener('click', function (ev) { var b = ev.target.closest('[data-rpay]'); if (!b) return; rPay = b.dataset.rpay; rLimit = 40; rKeep = {}; pressChip(this, 'rpay', rPay); renderRecordList(period()); });
$('rRefresh').addEventListener('click', function () { rKeep = {}; renderRecordList(period()); toast('Liste yenilendi.'); });
$('rQ').addEventListener('input', function () { rLimit = 40; renderRecordList(period()); });
$('rMore').addEventListener('click', function () { rLimit += 40; renderRecordList(period()); });
