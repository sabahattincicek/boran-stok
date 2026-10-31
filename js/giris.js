'use strict';
/* Ürün girişi penceresi */

mountDialog(`
<dialog id="dlgEntry" aria-labelledby="entT"><div class="sheet">
  <header><h2 id="entT">Ürün girişi</h2><button type="button" data-close>Kapat</button></header>
  <div class="grid2">
    <label class="f">Tarih<input type="date" id="fDate"></label>
    <label class="f">Toptancı<select id="fSup"></select></label>
  </div>
  <label class="f" id="fSupNewL" hidden>Yeni toptancının adı<input id="fSupNew" autocomplete="off" placeholder="ör. Yıldız Toptan"></label>
  <div class="list" id="fLines"></div>
  <button type="button" id="fAddLine">+ Başka ürün ekle</button>
  <div class="fblk">
    <div class="fh"><span>Girişin toplam fiyatı (₺)</span><span class="info" tabindex="0" role="button" aria-label="Açıklama">i<span class="tip">Toptancının verdiği tek fiyat. İçinde işaretli palet parası, nakliye ve ek giderler önce düşülür; kalan mal bedeli, fiyatı boş bırakılan çeşitlere koli sayısına göre paylaştırılır (hepsinde koli başı aynı olur). Boş bırakırsan çeşit fiyatları toplanır, işaretli giderler toptancı borcuna ayrıca eklenir.</span></span></div>
    <input id="fTotal" inputmode="decimal" autocomplete="off" placeholder="Toptancı tek fiyat verdiyse" aria-label="Girişin toplam fiyatı">
  </div>
  <details class="more" id="fXtra"><summary><span id="fXtraT"></span></summary><div class="morein">
  <div class="fblk">
    <div class="fh"><span>Palet parası</span><span class="info" tabindex="0" role="button" aria-label="Açıklama">i<span class="tip">Palet başı ya da toplamı yaz; diğeri ürünlerdeki palet sayısından hesaplanır. Maliyete eklenmez, toptancı hesabına yazılır; paletleri iade edince toptancının sayfasından "Palet iadesi" ile borçtan düşer. <b>Toplam fiyatın içinde</b> işaretliyse toplam fiyata dahildir, mal bedeli hesaplanırken düşülür.</span></span><label class="inc"><input type="checkbox" id="fDepIn"> toplam fiyatın içinde</label></div>
    <div class="grid2">
      <label class="f">Palet başı (₺)<input id="fDepPer" inputmode="decimal" autocomplete="off" placeholder="ör. 250"></label>
      <label class="f">Toplam palet parası (₺)<input id="fDep" inputmode="decimal" autocomplete="off" placeholder="Boşsa yok"></label>
    </div>
  </div>
  <div class="fblk">
    <div class="fh"><span>Nakliye (₺)</span><span class="info" tabindex="0" role="button" aria-label="Açıklama">i<span class="tip">Koli sayısına göre çeşitlerin maliyetine eklenir ve toptancı hesabına yazılır. <b>Toplam fiyatın içinde</b> işaretliyse toplam fiyata dahildir, mal bedeli hesaplanırken düşülür.</span></span><label class="inc"><input type="checkbox" id="fNakIn"> toplam fiyatın içinde</label></div>
    <input id="fNak" inputmode="decimal" autocomplete="off" placeholder="Boşsa nakliye yok" aria-label="Nakliye">
  </div>
  <div class="fblk">
    <div class="fh"><span>Ek giderler</span><span class="info" tabindex="0" role="button" aria-label="Açıklama">i<span class="tip">Hammaliye, yükleme gibi giderler. Nakliye gibi koli sayısına göre maliyete eklenir ve toptancı hesabına yazılır. <b>İçinde</b> işaretliyse toplam fiyata dahildir.</span></span></div>
    <div class="list" id="fCosts"></div>
    <button type="button" id="fAddCost">+ Ek gider ekle (hammaliye, yükleme…)</button>
  </div>
  </div></details>
  <details class="more" id="fOther"><summary><span id="fOtherT"></span></summary><div class="morein">
  <div class="fblk" id="fPaidL">
    <div class="fh"><span>Şimdi ödediğim (₺)</span><span class="info" tabindex="0" role="button" aria-label="Açıklama">i<span class="tip">Toptancıya bu gün ödediğin. Toptancının hesabına ödeme olarak yazılır, hesabın toplamından düşer; sonraki ödemeleri toptancının sayfasından “Ödeme yap” ile girersin.</span></span></div>
    <input id="fPaid" inputmode="decimal" autocomplete="off" placeholder="Boşsa ödenmedi" aria-label="Şimdi ödediğim">
  </div>
  <label class="f">Not<textarea id="fNote" rows="2" placeholder="ör. Fatura no"></textarea></label>
  </div></details>
  <div class="calc" id="fBrief" aria-live="polite"></div>
  <details class="more" id="fCalcD" hidden><summary><span>Hesap ayrıntısı</span></summary><div class="morein"><div class="calc" id="fCalc"></div></div></details>
  <p class="err" id="fErr" role="alert"></p>
  <div class="row">
    <button type="button" class="primary grow" id="fSave">Kaydet</button>
    <button type="button" class="danger" id="fDel" hidden>Sil</button>
  </div>
</div></dialog>
<datalist id="dlBrand"></datalist>
<datalist id="dlVar"></datalist>`);

// Bir girişte birden fazla ürün olur; satırlar fRows'ta yazıldığı haliyle tutulur.
// fSup: toptancı id'si, '' seçilmedi, '__new' yeni toptancı (toptancısız giriş yok)
var editing = null, fRows = [], fSup = '';
function fillDatalists(brand) {
  var seen = {}, bk = fold(brand || '');
  $('dlBrand').innerHTML = brands().map(function (b) { return '<option value="' + esc(b.name) + '">'; }).join('');
  $('dlVar').innerHTML = Object.keys(db.products).filter(function (id) { return !bk || fold(db.products[id].brand) === bk; })
    .map(function (id) { var v = db.products[id].variety; if (seen[fold(v)]) return ''; seen[fold(v)] = 1; return '<option value="' + esc(v) + '">'; }).join('');
}
function newRow(p) { return { brand: p ? p.brand : '', variety: p ? p.variety : '', koli: '', kpp: '', palet: '', total: '' }; }
// toptancı seçimi: listedekiler ya da yeni; her girişin toptancısı olmalı
function renderSupSel() {
  $('fSup').innerHTML = '<option value="">— Toptancı seç —</option>'
    + supsSorted().map(function (t) { return '<option value="' + t.id + '">' + esc(t.name) + '</option>'; }).join('')
    + '<option value="__new">+ Yeni toptancı…</option>';
  $('fSup').value = fSup;
  $('fSupNewL').hidden = fSup !== '__new';
  $('fSup').classList.toggle('bad', false);
}
// toptancı değişince ürünler onun listesinden seçilir
function setSup(v) {
  fSup = v;
  fRows.forEach(function (r) { r.bNew = r.vNew = false; });
  renderSupSel(); renderRows(); calc();
  if (v === '__new') $('fSupNew').focus();
}
function openEntry(shipId, preset, supId) {
  editing = shipId || null;
  var s = editing && byId(db.ships, editing);
  // yeni girişte: verilen toptancı, tek toptancı varsa o, yoksa seçtirilir
  // toptancısı olmayan eski giriş düzenlenirken toptancı seçtirilir
  fSup = s ? s.sup || '' : supId ? supId : db.sups.length === 1 ? db.sups[0].id : '';
  $('fSupNew').value = '';
  renderSupSel();
  // palet sayısı koli ve palette koliden yeniden hesaplanır; paylaştırılmış fiyatlar boş gelir
  fRows = s
    ? linesOf(s.id).map(function (e) {
      var p = db.products[e.pid];
      return { brand: p.brand, variety: p.variety, koli: gnum(amt(e.koli)), kpp: e.kpp ? gnum(amt(e.kpp)) : '', palet: !e.kpp && e.palet ? gnum(amt(e.palet)) : '', total: e.total != null && !e.auto ? gnum(amt(e.total)) : '' };
    })
    : [newRow(preset)];
  $('entT').textContent = s ? 'Girişi düzenle' : 'Ürün girişi';
  $('fDate').value = s ? s.date : today();
  $('fNote').value = s ? s.note || '' : '';
  $('fTotal').value = s && s.total != null ? gnum(amt(s.total)) : '';
  $('fNak').value = s && s.nak ? gnum(amt(s.nak)) : '';
  $('fNakIn').checked = !!(s && s.nakIn);
  // palet parası çoğunlukla toplamın içinde
  $('fDep').value = s && s.dep > 0 ? gnum(amt(s.dep)) : '';
  $('fDepPer').value = '';
  $('fDepIn').checked = s && s.dep > 0 ? !!s.depIn : true;
  fCosts = s && s.costs ? s.costs.map(function (c) { return { desc: c.desc, amount: gnum(amt(c.amount)), inc: !!c.inc }; }) : [];
  renderCosts();
  $('fPaid').value = '';
  $('fPaidL').hidden = !!s;
  $('fXtra').open = $('fOther').open = $('fCalcD').open = false;
  $('fErr').textContent = '';
  $('fDel').hidden = !s; disarm($('fDel'));
  $('fSave').textContent = s ? 'Değişikliği kaydet' : 'Kaydet';
  fillDatalists(); renderRows(); calc();
  if ($('dlgProd').open) $('dlgProd').close();
  $('dlgEntry').showModal();
  var first = !fSup ? $('fSup') : $('fLines').querySelector(preset ? '[data-f="koli"]' : '[data-f="brand"]');
  if (!s && first) first.focus();
  if (s && !fSup) { $('fSup').classList.add('bad'); $('fErr').textContent = 'Bu girişin toptancısı yok; kaydetmek için toptancı seç.'; $('fSup').focus(); }
}
var fCosts = [];
function renderCosts() {
  $('fCosts').innerHTML = fCosts.map(function (c, i) {
    return '<div class="xrow" data-ci="' + i + '">'
      + '<label class="f">Ek gider<input data-c="desc" value="' + esc(c.desc) + '" autocomplete="off" placeholder="ör. Hammaliye"></label>'
      + '<label class="f">Tutar (₺)<input data-c="amount" value="' + esc(c.amount) + '" inputmode="decimal" autocomplete="off" placeholder="ör. 500"></label>'
      + '<label class="inc" title="Toplam fiyatın içinde"><input type="checkbox" data-c="inc"' + (c.inc ? ' checked' : '') + '> içinde</label>'
      + '<button type="button" data-crm="' + i + '">Çıkar</button></div>';
  }).join('');
}
// boş satırlar atlanır; açıklamasız gider "Ek gider" olur
function readCosts() {
  var nakRaw = $('fNak').value.trim(), r = { nak: num(nakRaw), nakIn: $('fNakIn').checked, list: [], err: '' };
  if (nakRaw && r.nak == null) r.err = 'Nakliyeyi sayı olarak yaz, ör. 1500.';
  fCosts.forEach(function (c) {
    var d = clean(c.desc), raw = c.amount.trim(), a = num(raw);
    if (!d && !raw) return;
    if (!r.err && (a == null || a <= 0)) r.err = (d ? '"' + d + '"' : 'Ek gider') + ' için tutarı sayı olarak yaz.';
    r.list.push({ desc: d || 'Ek gider', amount: a || 0, inc: !!c.inc });
  });
  r.sum = (r.nak || 0) + r.list.reduce(function (t, c) { return t + c.amount; }, 0);
  r.inSum = (r.nakIn ? r.nak || 0 : 0) + r.list.reduce(function (t, c) { return t + (c.inc ? c.amount : 0); }, 0);
  return r;
}
// Palet başı ve toplamdan sadece biri dolu olur; diğeri ürünlerdeki palet sayısından hesaplanır.
function readDep(rows) {
  var perRaw = $('fDepPer').value.trim(), raw = $('fDep').value.trim(), palN = 0, miss = 0;
  rows.forEach(function (f) { if (f.palet && !f.bad) palN += f.palet; else if (f.koli) miss++; });
  var known = palN && !miss, d = { tot: num(raw), inc: $('fDepIn').checked, err: '' };
  if (perRaw) {
    var per = num(perRaw);
    d.tot = per != null && known ? Math.round(per * palN * 100) / 100 : null;
    d.totCalc = per != null && known;
    if (per == null) d.err = 'Palet başını sayı olarak yaz, ör. 250.';
    else if (!known) { d.err = 'Palet başından toplamı hesaplamak için her ürünün palet sayısını yaz ya da toplam palet parasını yaz.'; d.noPal = true; }
  } else if (raw && d.tot == null) d.err = 'Palet parasını sayı olarak yaz, ör. 1500.';
  else if (d.tot && known) d.perCalc = d.tot / palN;
  return d;
}
var PH = { koli: 'ör. 216', kpp: 'ör. 72', palet: 'ör. 3', total: 'boşsa toplamdan pay' };
// seçili toptancının ürün listesi (markalara göre); listesi boşsa ya da toptancı yoksa marka ve çeşit yazılır
function supCat() { var t = supOf(fSup); return t && t.pids.length ? supBrands(t) : null; }
function catBrand(cat, name) { return cat && name ? cat.filter(function (b) { return fold(b.name) === fold(name); })[0] : null; }
function optSel(f, opts, val, ph, newTxt, off) {
  return '<select data-f="' + f + '"' + (off ? ' disabled' : '') + '><option value="">' + ph + '</option>'
    + opts.map(function (o) { return '<option value="' + esc(o) + '"' + (fold(o) === fold(val) ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('')
    + (off ? '' : '<option value="__new">' + newTxt + '</option>') + '</select>';
}
function renderRows() {
  var cat = supCat();
  $('fLines').innerHTML = fRows.map(function (r, i) {
    function inp(f, label, extra) { return '<label class="f">' + label + '<input data-f="' + f + '" value="' + esc(gnum(r[f])) + '" autocomplete="off" placeholder="' + PH[f] + '" ' + extra + '></label>'; }
    // listede olmayan marka/çeşit yazılı açılır (kaydedince toptancının listesine eklenir)
    if (cat && r.brand && !catBrand(cat, r.brand)) r.bNew = true;
    var b = cat && !r.bNew ? catBrand(cat, r.brand) : null, vars = b ? b.ids.map(function (id) { return db.products[id].variety; }) : [];
    if (b && r.variety && !vars.some(function (v) { return fold(v) === fold(r.variety); })) r.vNew = true;
    var pickB = cat && r.bNew ? ' <button type="button" class="lnk" data-pick="brand">listeden seç</button>' : '';
    var pickV = b && r.vNew ? ' <button type="button" class="lnk" data-pick="variety">listeden seç</button>' : '';
    var brandF = cat && !r.bNew ? optSel('brand', cat.map(function (x) { return x.name; }), r.brand, 'Marka seç', '+ Yeni marka…')
      : '<input data-f="brand" value="' + esc(r.brand) + '" autocomplete="off" list="dlBrand" autocapitalize="words" placeholder="ör. Maysu">';
    var varF = b && !r.vNew ? optSel('variety', vars, r.variety, 'Çeşit seç', '+ Yeni çeşit…')
      : cat && !r.bNew && !b ? optSel('variety', [], '', 'Önce marka seç', '', true)
      : '<input data-f="variety" value="' + esc(r.variety) + '" autocomplete="off" list="dlVar" placeholder="ör. 0.5">';
    return '<div class="eline" data-i="' + i + '">'
      + '<div class="elh"><b>' + (i + 1) + '. ürün</b>' + (fRows.length > 1 ? '<button type="button" data-lrm="' + i + '">Çıkar</button>' : '') + '</div>'
      + '<div class="grid2">'
      + '<div class="f"><span>Marka' + pickB + '</span>' + brandF + '</div>'
      + '<div class="f"><span>Çeşit' + pickV + '</span>' + varF + '</div></div>'
      + '<div class="grid2">' + inp('koli', 'Toplam koli', 'inputmode="decimal"') + inp('palet', 'Palet sayısı', 'inputmode="decimal"') + '</div>'
      + '<div class="calc" data-lw></div>'
      + '<details class="more" data-lm' + (r.open ? ' open' : '') + '><summary><span data-ls></span></summary><div class="morein">'
      + '<div class="grid2">' + inp('kpp', 'Palette koli', 'inputmode="decimal"') + inp('total', 'Bu çeşidin fiyatı (₺)', 'inputmode="decimal"') + '</div>'
      + '<div class="calc" data-lc></div></div></details></div>';
  }).join('');
}
// Toplam koli, palette koli, palet sayısı: hangisi boşsa diğer ikisinden hesaplanır.
// Sadece biri yazılmışsa palette koli ürünün son girişinden alınır.
function readRow(r) {
  var pid = clean(r.brand) && clean(r.variety) ? findProduct(r.brand, r.variety) : null;
  var f = { brand: clean(r.brand), variety: clean(r.variety), pid: pid, koli: num(r.koli), kpp: num(r.kpp), palet: num(r.palet), totalRaw: r.total.trim(), total: num(r.total), calc: {} };
  if (!f.kpp && pid && db.products[pid].kpp && !(f.koli && f.palet)) { f.kpp = db.products[pid].kpp; f.calc.kpp = 'eski'; }
  if (f.koli && f.kpp && f.palet) f.bad = Math.abs(f.palet * f.kpp - f.koli) > 0.01;
  else if (f.koli && f.palet) { f.kpp = Math.round(f.koli / f.palet * 100) / 100; f.calc.kpp = 1; }
  else if (f.koli && f.kpp) { f.palet = Math.round(f.koli / f.kpp * 100) / 100; f.calc.palet = 1; }
  else if (f.palet && f.kpp) { f.koli = f.palet * f.kpp; f.calc.koli = 1; }
  return f;
}
// Girişin toplam fiyatından fiyatı yazılmış çeşitler düşülür; kalan para fiyatı boş çeşitlere
// koli başı aynı olacak şekilde (koli sayısına göre) paylaştırılır. Kuruş artığı sondakine eklenir.
function spread(lines, grand) {
  var out = lines.map(function (l) { return { total: l.total, auto: false }; });
  if (grand == null) return { lines: out };
  var known = 0, rest = [], restKoli = 0;
  lines.forEach(function (l, i) { if (l.total != null) known += l.total; else { rest.push(i); restKoli += l.koli || 0; } });
  var left = grand - known;
  if (left < -0.004) return { lines: out, err: 'Çeşit fiyatlarının toplamı (' + money(known) + '), girişin toplam fiyatından (' + money(grand) + ') fazla.' };
  if (!rest.length) {
    if (Math.abs(left) > 0.004) return { lines: out, err: 'Çeşit fiyatlarının toplamı ' + money(known) + ', girişin toplam fiyatı ' + money(grand) + '. Birini düzelt ya da bir çeşidin fiyatını boş bırak.' };
    return { lines: out };
  }
  var acc = 0;
  rest.forEach(function (i, k) {
    var w = restKoli ? (lines[i].koli || 0) / restKoli : 1 / rest.length;
    var v = k === rest.length - 1 ? Math.round((left - acc) * 100) / 100 : Math.round(left * w * 100) / 100;
    acc += v; out[i] = { total: v, auto: true };
  });
  return { lines: out };
}
// formun tamamı: satırlar, giderler, palet parası; toplam fiyatın içindekiler düşülünce kalan mal bedeli paylaştırılır
function readForm() {
  var F = { rows: fRows.map(readRow), grandRaw: $('fTotal').value.trim() };
  F.grand = num(F.grandRaw);
  F.xc = readCosts(); F.dp = readDep(F.rows);
  F.inSum = F.xc.inSum + (F.dp.inc && F.dp.tot ? F.dp.tot : 0);
  F.goods = F.grand == null ? null : Math.round((F.grand - F.inSum) * 100) / 100;
  if (F.goods != null && F.goods < -0.004) F.inErr = 'Toplam fiyatın içinde işaretlenenler (' + money(F.inSum) + '), toplam fiyattan (' + money(F.grand) + ') fazla.';
  F.sp = spread(F.rows, F.inErr ? null : F.goods);
  if (F.sp.err && F.inSum && F.goods != null) F.sp.err += ' (Toplam fiyattan içindeki ' + money(F.inSum) + ' düşüldü, mal bedeli ' + money(F.goods) + '.)';
  F.xs = extraShares(F.rows, F.xc.sum);
  F.total = F.sp.lines.reduce(function (t, l) { return t + (l.total || 0); }, 0); // mal bedeli
  F.debt = F.total + F.inSum; // toptancısız girişte toptancıya
  F.due = F.total + F.xc.sum + (F.dp.tot || 0); // toptancı hesabına: mal + nakliye/ek gider + palet parası
  return F;
}
function bad(el, on) { if (el) el.classList.toggle('bad', !!on || (!!el.value.trim() && num(el.value) == null)); }
// her satırın altındaki hesap, kutuların kırmızısı ve en alttaki girişin özeti
function calc() {
  var F = readForm(), rows = F.rows, sp = F.sp, xc = F.xc, xs = F.xs, dp = F.dp, koliSum = 0, priced = 0, sum = 0;
  var tSup = supOf(fSup);
  document.querySelectorAll('#fLines .eline').forEach(function (el) {
    var i = +el.dataset.i, f = rows[i], t = sp.lines[i], out = [], warn = [], ls = [];
    // boş kutuda hesaplanan değer görünür; elle yazılanlar tutmuyorsa kırmızı
    ['koli', 'kpp', 'palet'].forEach(function (k) {
      var x = el.querySelector('[data-f="' + k + '"]');
      x.placeholder = f.calc[k] && f[k] ? '= ' + fmt(f[k]) : PH[k];
      bad(x, f.bad);
    });
    el.querySelector('[data-f="total"]').placeholder = t.auto ? '= ' + fmt(t.total) + ' (pay)' : PH.total;
    bad(el.querySelector('[data-f="total"]'), sp.err && f.total != null);
    var koli = f.koli || 0;
    if (f.brand && f.variety) {
      if (f.pid) {
        var cur = stockOf(f.pid, editing);
        out.push('<span class="ex">Mevcut ürüne eklenecek: ' + esc(pname(f.pid)) + '</span>');
        out.push('<span class="n">' + fmt(cur) + ' koli → ' + fmt(cur + koli) + ' koli</span>');
      } else warn.push('<span class="new">Yeni ürün oluşturulacak: ' + esc(f.brand + ' ' + f.variety) + '</span>');
      if (fSup === '__new' || (tSup && (!f.pid || tSup.pids.indexOf(f.pid) < 0))) out.push('<span class="ex">Toptancının ürün listesine eklenecek</span>');
    }
    if (f.bad) warn.push('<span class="new">' + fmt(f.palet) + ' palet × ' + fmt(f.kpp) + ' koli = ' + fmt(f.palet * f.kpp) + ' koli, toplam koliyle (' + fmt(f.koli) + ') tutmuyor. Birini boş bırak.</span>');
    else if (koli) out.push('<span class="n">' + lineKoliTxt(f) + (f.calc.kpp === 'eski' ? ' (palette koli son girişten)' : '') + '</span>');
    if (t.total != null && koli) out.push('<span>' + (t.auto ? 'toplamdan payı ' + money(t.total) + ' · ' : '') + 'koli başı ' + money(t.total / koli) + '</span>');
    if (koli && xs[i]) out.push('<span>nakliye/ek gider payı ' + money(xs[i]) + (t.total != null ? ' · giderle koli başı <b>' + money((t.total + xs[i]) / koli) + '</b>' : '') + '</span>');
    el.querySelector('[data-lc]').innerHTML = out.join('');
    el.querySelector('[data-lw]').innerHTML = warn.join('');
    if (f.kpp) ls.push('Palette ' + fmt(f.kpp) + ' koli');
    if (t.total != null) ls.push(money(t.total));
    el.querySelector('[data-ls]').textContent = ls.join(' · ') || 'Palette koli, çeşit fiyatı';
    koliSum += koli;
    if (t.total != null) { sum += t.total; priced++; }
  });
  bad($('fTotal'), sp.err || F.inErr);
  $('fDepPer').placeholder = dp.perCalc ? '= ' + fmt(dp.perCalc) : 'ör. 250';
  $('fDep').placeholder = dp.totCalc ? '= ' + fmt(dp.tot) : 'Boşsa yok';
  bad($('fDepPer'), dp.noPal);
  bad($('fDep'));
  bad($('fNak'));
  document.querySelectorAll('#fCosts [data-c="amount"]').forEach(function (x) { bad(x); });
  var paid = num($('fPaid').value);
  bad($('fPaid'), !editing && !supOf(fSup) && fSup !== '__new' && paid != null && paid > F.debt + 0.004);
  // kapalı bölümlerin başlığı içlerinde yazılanları söyler
  var xt = [], ot = [], note = $('fNote').value.trim();
  if (dp.tot) xt.push('Palet ' + money(dp.tot));
  if (xc.nak) xt.push('Nakliye ' + money(xc.nak));
  if (xc.list.length) xt.push('Ek gider ' + money(xc.sum - (xc.nak || 0)));
  $('fXtraT').textContent = xt.join(' · ') || 'Palet parası, nakliye, ek gider';
  if (!editing && paid) ot.push('Ödenen ' + money(paid));
  if (note) ot.push('Not var');
  $('fOtherT').textContent = ot.join(' · ') || (editing ? 'Not' : 'Şimdi ödediğim, not');
  // top: her zaman görünen kısa özet; all: ok ile açılan çeşit tablosu, mal bedeli, giderler, maliyet, önceki hesap
  var all = [], top = [];
  if (koliSum) {
    var palN = 0, noPal = 0, pKoli = 0, pCost = 0, trs = '';
    rows.forEach(function (f, i) {
      var t = sp.lines[i], k = f.koli || 0, c = t.total != null ? t.total + xs[i] : null;
      if (f.palet && !f.bad) palN += f.palet; else if (k) noPal++;
      if (c != null && k) { pKoli += k; pCost += c; }
      trs += '<tr><td>' + esc(f.brand && f.variety ? f.brand + ' ' + f.variety : (i + 1) + '. ürün') + '</td><td>' + fmt(k) + '</td>'
        + '<td>' + (c != null ? money(c) : '—') + '</td><td>' + (c != null && k ? money(c / k) : '—') + '</td></tr>';
    });
    if (rows.length > 1) {
      all.push('<div class="tbl"><table><thead><tr><th>Çeşit</th><th>Koli</th><th>Maliyet</th><th>Koli başı</th></tr></thead><tbody>' + trs + '</tbody>'
        + '<tfoot><tr><td>Toplam</td><td>' + fmt(koliSum) + '</td><td>' + (pKoli ? money(pCost) : '—') + '</td><td>' + (pKoli ? money(pCost / pKoli) : '—') + '</td></tr></tfoot></table></div>');
    }
    top.push('<span><b>' + rows.length + ' çeşit · ' + fmt(koliSum) + ' koli' + (palN ? ' · ' + fmt(palN) + ' palet' : '') + '</b>'
      + (palN && noPal ? ' (' + noPal + ' çeşidin paleti bilinmiyor)' : '') + '</span>');
    if (F.grand != null && F.inSum && !F.inErr) all.push('<span class="n">Toplam fiyat ' + money(F.grand) + ' − içindekiler ' + money(F.inSum) + ' = mal bedeli <b>' + money(F.goods) + '</b></span>');
    else if (priced) all.push('<span class="n">Mal bedeli <b>' + money(sum) + '</b></span>');
    if (xc.sum) {
      var xin = xc.inSum, xout = xc.sum - xc.inSum;
      all.push('<span class="n">Nakliye + ek gider <b>' + money(xc.sum) + '</b> <small>(maliyete eklenir'
        + (xin ? '; ' + money(xin) + ' toplamın içinde' : '') + (xout ? '; ' + money(xout) + ' ayrı ödendi' : '') + ')</small></span>');
    }
    if (dp.tot) all.push('<span class="n">Palet parası <b>' + money(dp.tot) + '</b> <small>(' + (palN ? fmt(palN) + ' palet, palet başı ' + money(dp.tot / palN) + '; ' : '') + (dp.inc ? 'toplamın içinde' : 'toplamın dışında') + '; maliyete eklenmez)</small></span>');
    if (pKoli) {
      all.push('<span class="n">Toplam maliyet <b>' + money(pCost) + '</b></span>');
      all.push('<span class="n">Ortalama koli başı maliyet <b>' + money(pCost / pKoli) + '</b></span>');
    }
    if (priced < rows.length) all.push('<span class="new">' + (rows.length - priced) + ' çeşidin fiyatı yok' + (pKoli ? '; toplam ve ortalama onlarsız hesaplandı' : '') + '.</span>');
    if (tSup || fSup === '__new') {
      // toptancı hesabı: bu giriş eklenince önceki kalan + bu giriş − şimdi ödenen
      var prev = tSup ? supAccount(tSup).rem - (editing ? shipDue(byId(db.ships, editing)) : 0) : 0, now = prev + F.due - (!editing && paid ? paid : 0);
      top.push('<span>Toptancı hesabına yazılacak <b>' + money(F.due) + '</b></span>');
      all.push('<span class="n">Hesapta önceki kalan ' + sm(prev) + (!editing && paid ? ' − şimdi ödenen ' + money(paid) : '') + ' → kalan <b>' + sm(now) + '</b></span>');
    }
    else if (!editing && F.debt && paid != null) top.push('<span>Şimdi ödenen ' + money(paid) + (F.debt - paid > 0.004 ? ' · toptancıya kalan borç <b>' + money(F.debt - paid) + '</b>' : ' · borç kalmıyor') + '</span>');
    else if (!editing && F.debt) top.push('<span>Toptancıya borç <b>' + money(F.debt) + '</b></span>');
  }
  if (F.inErr) top.push('<span class="new">' + F.inErr + '</span>');
  if (sp.err) top.push('<span class="new">' + sp.err + '</span>');
  if (dp.err) top.push('<span class="new">' + dp.err + '</span>');
  $('fBrief').innerHTML = top.join('');
  $('fCalc').innerHTML = all.join('');
  $('fCalcD').hidden = !all.length;
  openBad($('dlgEntry'));
}
function addRow() {
  var last = fRows[fRows.length - 1], r = newRow(null);
  if (last) r.brand = clean(last.brand);
  fRows.push(r); renderRows(); calc();
  $('fLines').lastElementChild.querySelector(r.brand ? '[data-f="variety"]' : '[data-f="brand"]').focus();
}
function saveEntry() {
  var F = readForm(), rows = F.rows, date = $('fDate').value, err = '';
  var s = editing && byId(db.ships, editing), isNew = !s;
  var grandRaw = F.grandRaw, grand = F.grand;
  rows.some(function (f, i) {
    var w = rows.length > 1 ? (i + 1) + '. ürün: ' : '';
    if (!f.brand) err = w + 'Marka yaz.';
    else if (!f.variety) err = w + 'Çeşit yaz.';
    else if (f.bad) err = w + 'Palet sayısı × palette koli, toplam koliyi tutmuyor. Birini boş bırak, hesaplansın.';
    else if (!f.koli) err = w + 'Toplam koliyi yaz (ya da palet sayısı ile palette koliyi).';
    else if (f.totalRaw && f.total == null) err = w + 'Fiyatı sayı olarak yaz, ör. 18000.';
    return !!err;
  });
  // toptancılı girişte tutarın tamamı toptancı hesabına yazılır, ödeme hesaba yapılır
  var hasSup = fSup !== '';
  var sp = F.sp, xc = F.xc, dp = F.dp, total = hasSup ? F.due : F.debt;
  var paidRaw = $('fPaid').value.trim(), paid = num(paidRaw), supNew = clean($('fSupNew').value);
  if (err) { /* satır hatası */ }
  else if (!fSup) err = 'Toptancıyı seç; listede yoksa "+ Yeni toptancı…" ile ekle.';
  else if (fSup === '__new' && !supNew) err = 'Yeni toptancının adını yaz.';
  else if (grandRaw && grand == null) err = 'Girişin toplam fiyatını sayı olarak yaz, ör. 50000.';
  else if (F.inErr) err = F.inErr;
  else if (sp.err) err = sp.err;
  else if (xc.err) err = xc.err;
  else if (dp.err) err = dp.err;
  else if (!date) err = 'Tarihi seç.';
  else if (isNew && paidRaw && paid == null) err = 'Ödediğin tutarı sayı olarak yaz.';
  else if (isNew && paidRaw && !hasSup && !total) err = 'Ödenen tutar için önce fiyatı yaz.';
  else if (isNew && paidRaw && !hasSup && paid > total + 0.004) err = 'Ödenen, girişin toplamından (' + money(total) + ') fazla olamaz.';
  else if (!isNew && !hasSup && shipPaid(s) > total + 0.004) err = 'Bu girişe ' + money(shipPaid(s)) + ' ödenmiş; toplam bundan az olamaz. Önce ödemeyi sil.';
  if (err) {
    $('fErr').textContent = err; $('fSup').classList.toggle('bad', !fSup || (fSup === '__new' && !supNew));
    if (err === xc.err || err === dp.err) $('fXtra').open = true;
    if (/Öde/.test(err) && !/Çeşit/.test(err)) $('fOther').open = true;
    return;
  }

  var sup = fSup === '__new' ? ensureSup(supNew) : supOf(fSup), nNew = 0;
  if (isNew) { s = { id: 'h' + uid(), ts: Date.now(), time: date === today() ? nowHM() : '', pays: [] }; db.ships.push(s); }
  s.date = date; s.note = $('fNote').value.split('\n').map(clean).filter(Boolean).join('\n');
  s.total = grandRaw ? grand : null;
  s.nak = xc.nak || null; s.nakIn = !!(xc.nak && xc.nakIn); s.costs = xc.list;
  s.sup = sup ? sup.id : null;
  s.dep = dp.tot || null; s.depIn = !!(dp.tot && dp.inc);
  if (!s.dep) s.depBack = null;
  var xs = F.xs;
  if (isNew && paid > 0) (sup ? sup.pays : s.pays).push({ id: 'o' + uid(), ts: s.ts, date: date, amount: paid, note: sup ? 'giriş günü' : '' });
  // toptancıya bağlanan eski girişin ödemeleri toptancı hesabına geçer
  if (sup && s.pays.length) { sup.pays = sup.pays.concat(s.pays); s.pays = []; }
  db.entries = db.entries.filter(function (e) { return e.sid !== s.id; });
  var koli = 0;
  rows.forEach(function (f, i) {
    var pid = ensureProduct(f.brand, f.variety);
    // girişte yazılan yeni ürün toptancının listesine eklenir
    if (sup && sup.pids.indexOf(pid) < 0) { supAddPid(sup, pid); nNew++; }
    db.entries.push({ id: 'e' + uid() + i, ts: s.ts, sid: s.id, pid: pid, date: s.date, time: s.time,
      koli: f.koli, kpp: f.kpp || null, palet: f.palet || null, total: sp.lines[i].total, auto: sp.lines[i].auto, extra: xs[i] });
    koli += f.koli;
  });
  tidy();
  if (!persist()) return;
  $('dlgEntry').close();
  renderAll();
  toast((isNew ? rows.length + ' ürün, +' + fmt(koli) + ' koli eklendi' : 'Giriş güncellendi') + (total ? ' · toplam ' + money(total) : '')
    + (nNew ? ' · ' + nNew + ' ürün ' + sup.name + ' listesine eklendi' : ''));
}
function deleteEntry() {
  db.entries = db.entries.filter(function (x) { return x.sid !== editing; });
  db.ships = db.ships.filter(function (x) { return x.id !== editing; });
  tidy(); persist();
  $('dlgEntry').close(); renderAll(); toast('Giriş silindi.');
}

// giriş formu
$('fSup').addEventListener('change', function () { $('fErr').textContent = ''; setSup(this.value); });
$('fSupNew').addEventListener('input', function () { $('fErr').textContent = ''; $('fSup').classList.remove('bad'); calc(); });
$('fLines').addEventListener('input', function (ev) {
  var f = ev.target.dataset.f, el = ev.target.closest('.eline'); if (!f || !el || ev.target.tagName === 'SELECT') return;
  var r = fRows[+el.dataset.i]; r[f] = ev.target.value;
  if (f === 'brand') fillDatalists(r.brand);
  $('fErr').textContent = ''; calc();
});
// satırın ok ile açılan kısmı liste yeniden çizilince de açık kalır
$('fLines').addEventListener('toggle', function (ev) {
  if (ev.target.dataset.lm == null) return;
  var el = ev.target.closest('.eline'), r = el && fRows[+el.dataset.i]; if (r) r.open = ev.target.open;
}, true);
// çeşit önerileri o satırın markasına göre
$('fLines').addEventListener('focusin', function (ev) { var el = ev.target.closest('.eline'); if (el && ev.target.dataset.f === 'variety') fillDatalists(fRows[+el.dataset.i].brand); });
// listeden seçim: "+ Yeni …" seçilirse yazı kutusu açılır; marka değişince çeşit yeniden seçilir (tek çeşit varsa o)
$('fLines').addEventListener('change', function (ev) {
  var x = ev.target, f = x.dataset.f, el = x.closest('.eline'); if (x.tagName !== 'SELECT' || !el) return;
  var i = +el.dataset.i, r = fRows[i], isNew = x.value === '__new';
  if (f === 'brand') {
    r.bNew = isNew; r.brand = isNew ? '' : x.value; r.variety = ''; r.vNew = false;
    var b = !isNew && catBrand(supCat(), r.brand);
    if (b && b.ids.length === 1) r.variety = db.products[b.ids[0]].variety;
  } else { r.vNew = isNew; r.variety = isNew ? '' : x.value; }
  $('fErr').textContent = ''; renderRows(); calc();
  var row = $('fLines').children[i], next = isNew ? row.querySelector('[data-f="' + f + '"]') : f === 'brand' && !r.variety ? row.querySelector('[data-f="variety"]') : row.querySelector('[data-f="koli"]');
  if (next) next.focus();
});
$('fLines').addEventListener('click', function (ev) {
  var p = ev.target.closest('[data-pick]');
  if (p) {
    var i = +p.closest('.eline').dataset.i, r = fRows[i];
    if (p.dataset.pick === 'brand') { r.bNew = false; r.brand = ''; r.variety = ''; r.vNew = false; } else { r.vNew = false; r.variety = ''; }
    renderRows(); calc(); $('fLines').children[i].querySelector('[data-f="' + p.dataset.pick + '"]').focus();
    return;
  }
  var b = ev.target.closest('[data-lrm]'); if (!b) return;
  fRows.splice(+b.dataset.lrm, 1); renderRows(); calc();
});
$('fAddLine').addEventListener('click', addRow);
$('fPaid').addEventListener('input', function () { $('fErr').textContent = ''; calc(); });
$('fTotal').addEventListener('input', function () { $('fErr').textContent = ''; calc(); });
$('fNak').addEventListener('input', function () { $('fErr').textContent = ''; calc(); });
// palet başı ve toplam: yazılan kutu esas, öteki boşalır ve hesaplanan değeri gösterir
[['fDepPer', 'fDep'], ['fDep', 'fDepPer']].forEach(function (p) {
  $(p[0]).addEventListener('input', function () { if (this.value.trim()) $(p[1]).value = ''; $('fErr').textContent = ''; calc(); });
});
['fDepIn', 'fNakIn'].forEach(function (id) { $(id).addEventListener('change', function () { $('fErr').textContent = ''; calc(); }); });
$('fNote').addEventListener('input', calc);
$('dlgEntry').addEventListener('input', liveNum, true);
$('fCosts').addEventListener('input', function (ev) {
  var k = ev.target.dataset.c, el = ev.target.closest('.xrow'); if (!k || !el) return;
  fCosts[+el.dataset.ci][k] = k === 'inc' ? ev.target.checked : ev.target.value; $('fErr').textContent = ''; calc();
});
$('fCosts').addEventListener('change', function (ev) {
  var el = ev.target.closest('.xrow'); if (ev.target.dataset.c !== 'inc' || !el) return;
  fCosts[+el.dataset.ci].inc = ev.target.checked; calc();
});
$('fCosts').addEventListener('click', function (ev) {
  var b = ev.target.closest('[data-crm]'); if (!b) return;
  fCosts.splice(+b.dataset.crm, 1); renderCosts(); calc();
});
$('fAddCost').addEventListener('click', function () {
  fCosts.push({ desc: '', amount: '', inc: false }); renderCosts(); calc();
  $('fCosts').lastElementChild.querySelector('[data-c="desc"]').focus();
});
$('fSave').addEventListener('click', saveEntry);
$('fDel').addEventListener('click', function () { arm(this, deleteEntry); });
