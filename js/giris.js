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
    <div class="fh"><span>Boş palet</span><span class="info" tabindex="0" role="button" aria-label="Açıklama">i<span class="tip">Toptancının palet çeşitleri satır satır gelir; bu alımdaki palet başı fiyatı ve adedi yaz (tek çeşitte adet boşsa çeşitlerdeki palet sayısı alınır). Çeşit yoksa palet başı ya da toplamı yazman yeter. Bu para paletler geri verilince iade edilir, maliyete eklenmez ve toptancı hesabına yazılır. <b>Toplam fiyatın içinde</b> işaretliyse aşağıdaki toplam fiyata dahildir, mal bedeli hesaplanırken düşülür.</span></span><label class="inc"><input type="checkbox" id="fDepIn"> toplam fiyatın içinde</label></div>
    <div class="grid3" id="fDepOld">
      <div class="f ro"><span>Palet sayısı</span><output id="fPalN">—</output></div>
      <label class="f">Palet başı (₺)<input id="fDepPer" inputmode="decimal" autocomplete="off" placeholder="ör. 250"></label>
      <label class="f">Toplam (₺)<input id="fDepTot" inputmode="decimal" autocomplete="off" placeholder="ör. 1.500"></label>
    </div>
    <div class="list" id="fPals"></div>
    <p class="hint" id="fPalHint"></p>
    <button type="button" class="dash" id="fAddPal">+ Palet çeşidi ekle</button>
  </div>
  <div class="fblk">
    <div class="fh"><span>Nakliye (₺)</span><span class="info" tabindex="0" role="button" aria-label="Açıklama">i<span class="tip">Koli sayısına göre çeşitlerin maliyetine eklenir ve toptancı hesabına yazılır. <b>Toplam fiyatın içinde</b> işaretliyse aşağıdaki toplam fiyata dahildir, mal bedeli hesaplanırken düşülür.</span></span><label class="inc"><input type="checkbox" id="fNakIn"> toplam fiyatın içinde</label></div>
    <input id="fNak" inputmode="decimal" autocomplete="off" placeholder="Boşsa nakliye yok" aria-label="Nakliye">
  </div>
  <div class="fblk">
    <div class="fh"><span>Ek giderler</span><span class="info" tabindex="0" role="button" aria-label="Açıklama">i<span class="tip">Hammaliye, yükleme gibi giderler. Nakliye gibi koli sayısına göre maliyete eklenir ve toptancı hesabına yazılır. <b>İçinde</b> işaretliyse toplam fiyata dahildir.</span></span></div>
    <div class="list" id="fCosts"></div>
    <button type="button" id="fAddCost">+ Ek gider ekle (hammaliye, yükleme…)</button>
  </div>
  <div class="fblk">
    <div class="fh"><span>Girişin toplam fiyatı (₺)</span><span class="info" tabindex="0" role="button" aria-label="Açıklama">i<span class="tip">Toptancının verdiği tek fiyat. İçinde işaretli boş palet, nakliye ve ek giderler önce düşülür; kalan mal bedeli, fiyatı boş bırakılan çeşitlere koli sayısına göre paylaştırılır (hepsinde koli başı aynı olur). Boş bırakırsan çeşit fiyatları toplanır, işaretli giderler toptancı borcuna ayrıca eklenir.</span></span></div>
    <input id="fTotal" inputmode="decimal" autocomplete="off" placeholder="Toptancı tek fiyat verdiyse" aria-label="Girişin toplam fiyatı">
  </div>
  <div class="fblk" id="fPaidL">
    <div class="fh"><span>Şimdi ödediğim (₺)</span><span class="info" tabindex="0" role="button" aria-label="Açıklama">i<span class="tip">Toptancıya bu gün ödediğin. Toptancının hesabına ödeme olarak yazılır, hesabın toplamından düşer; sonraki ödemeleri toptancının sayfasından “Ödeme yap” ile girersin.</span></span></div>
    <input id="fPaid" inputmode="decimal" autocomplete="off" placeholder="Boşsa ödenmedi" aria-label="Şimdi ödediğim">
  </div>
  <label class="f">Not<textarea id="fNote" rows="2" placeholder="ör. Fatura no"></textarea></label>
  <div class="calc" id="fCalc" aria-live="polite"></div>
  <p class="err" id="fErr" role="alert"></p>
  <div class="row">
    <button type="button" class="primary grow" id="fSave">Kaydet</button>
    <button type="button" class="danger" id="fDel" hidden>Sil</button>
  </div>
</div></dialog>
<datalist id="dlBrand"></datalist>
<datalist id="dlVar"></datalist>`);

// Bir girişte birden fazla ürün olur; satırlar fRows'ta yazıldığı haliyle tutulur.
// fSup: toptancı id'si, '' seçilmedi, '__new' yeni toptancı (toptancısız giriş yok). fPals: palet çeşidi satırları
var editing = null, fRows = [], fSup = '', fPals = [];
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
// palet çeşidi satırları: girişte yazılanlar + toptancının diğer çeşitleri (adedi boş)
function palRowsOf(t, lines) {
  var out = (lines || []).map(function (l) { return { pal: l.pal || null, name: l.name, price: gnum(amt(l.price)), n: gnum(amt(l.n)) }; });
  if (t) t.pals.forEach(function (p) { if (!out.some(function (o) { return o.pal === p.id; })) out.push({ pal: p.id, name: p.name, price: '', n: '' }); });
  // palet fiyatı alımdan alıma değişir; son girişteki fiyat sadece öneri
  out.forEach(function (o) { o.last = t && o.pal ? lastPalPrice(t, o.pal) : null; });
  return out;
}
// toptancı değişince ürünler onun listesinden seçilir, palet çeşitleri onunkiler olur (elle eklenenler kalır)
function setSup(v) {
  fSup = v;
  fRows.forEach(function (r) { r.bNew = r.vNew = false; });
  fPals = fPals.filter(function (p) { return !p.pal; }).concat(palRowsOf(supOf(v)));
  renderSupSel(); renderRows(); renderPals(); calc();
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
  // eski usul (çeşitsiz) yazılmış palet parası eski kutularda açılır
  fPals = s && s.dep > 0 && !(s.depLines || []).length ? [] : palRowsOf(supOf(fSup), s && s.depLines);
  renderPals();
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
  // palet başı yazılmışsa o, değilse toplam açılır; diğeri hesaplanır. Palet parası çoğunlukla toplamın içinde
  $('fDepPer').value = s && s.dep > 0 && s.depPerIn ? gnum(amt(s.depPer)) : '';
  $('fDepTot').value = s && s.dep > 0 && !s.depPerIn ? gnum(amt(s.dep)) : '';
  $('fDepIn').checked = s && s.dep > 0 ? !!s.depIn : true;
  fCosts = s && s.costs ? s.costs.map(function (c) { return { desc: c.desc, amount: gnum(amt(c.amount)), inc: !!c.inc }; }) : [];
  renderCosts();
  $('fPaid').value = '';
  $('fPaidL').hidden = !!s;
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
function renderPals() {
  $('fPals').innerHTML = fPals.map(function (p, i) {
    return '<div class="prow" data-pi="' + i + '">'
      + (p.pal ? '<div class="f ro"><span>Palet</span><output>' + esc(p.name) + '</output></div>'
        : '<label class="f">Palet<input data-pf="name" value="' + esc(p.name) + '" autocomplete="off" placeholder="ör. Euro palet"></label>')
      + '<label class="f">Bu alımda palet başı (₺)<input data-pf="price" value="' + esc(p.price) + '" inputmode="decimal" autocomplete="off" placeholder="' + (p.last != null ? 'son ' + fmt(p.last) : 'ör. 250') + '"></label>'
      + '<label class="f">Adet<input data-pf="n" value="' + esc(p.n) + '" inputmode="decimal" autocomplete="off" placeholder="ör. 5"></label>'
      + '<button type="button" data-prm="' + i + '" aria-label="' + esc(p.name || 'Palet') + ' satırını çıkar">×</button></div>';
  }).join('');
  $('fDepOld').hidden = fPals.length > 0;
}
// Boş palet parası. Palet çeşidi satırları varsa: adet × palet başı (tek satırda adet boşsa çeşitlerdeki palet sayısı).
// Yoksa eski usul: palet başı ya da toplam; boş olan palet sayısından hesaplanır
function readDep(pal) {
  if (fPals.length) {
    var r = { per: null, tot: null, perIn: false, inc: $('fDepIn').checked, err: '', lines: [], n: 0 }, sum = 0, one = fPals.length === 1;
    fPals.forEach(function (p, i) {
      var name = clean(p.name), pr = num(p.price), nRaw = String(p.n).trim(), n = num(nRaw);
      if (!nRaw) { if (!one || !pal || !String(p.price).trim()) return; n = pal; r.autoN = true; }
      if (n == null) r.err = r.err || (name || (i + 1) + '. palet') + ' için adedi sayı olarak yaz.';
      else if (!name) r.err = r.err || 'Palet çeşidinin adını yaz.';
      else if (pr == null) r.err = r.err || name + ' için palet başı fiyatı yaz.';
      else if (n > 0) { r.lines.push({ pal: p.pal, name: name, price: pr, n: n }); sum += n * pr; r.n += n; }
    });
    if (r.lines.length) {
      r.tot = Math.round(sum * 100) / 100;
      r.per = r.lines.every(function (l) { return l.price === r.lines[0].price; }) ? r.lines[0].price : null;
    }
    return r;
  }
  var perRaw = $('fDepPer').value.trim(), totRaw = $('fDepTot').value.trim(), per = num(perRaw), tot = num(totRaw), r = { per: null, tot: null, perIn: false, inc: $('fDepIn').checked, err: '' };
  if (perRaw && (per == null || per < 0)) { r.err = 'Palet başı palet parasını sayı olarak yaz, ör. 250.'; return r; }
  if (totRaw && (tot == null || tot < 0)) { r.err = 'Toplam palet parasını sayı olarak yaz, ör. 1500.'; return r; }
  if (perRaw && totRaw) {
    if (pal && Math.abs(per * pal - tot) > 0.004) r.err = fmt(pal) + ' palet × ' + money(per) + ' = ' + money(per * pal) + ', toplam palet parasıyla (' + money(tot) + ') tutmuyor. Birini boş bırak.';
    r.per = per; r.tot = tot; r.perIn = true;
  } else if (perRaw) {
    if (!pal) r.err = 'Palet sayısı bilinmiyor; palet parasının toplamını yaz ya da çeşitlerde palet sayısını gir.';
    else { r.per = per; r.tot = Math.round(per * pal * 100) / 100; r.perIn = true; }
  } else if (totRaw) {
    r.tot = tot; r.per = pal ? tot / pal : null;
  }
  return r;
}
function palCount(rows) { return rows.reduce(function (t, f) { return t + (f.palet && !f.bad ? f.palet : 0); }, 0); }
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
      + '<div class="grid3">' + inp('koli', 'Toplam koli', 'inputmode="decimal"') + inp('kpp', 'Palette koli', 'inputmode="decimal"') + inp('palet', 'Palet sayısı', 'inputmode="decimal"') + '</div>'
      + inp('total', 'Bu çeşidin fiyatı (₺)', 'inputmode="decimal"')
      + '<div class="calc" data-lc></div></div>';
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
// formun tamamı: satırlar, giderler, boş palet; toplam fiyatın içindekiler düşülünce kalan mal bedeli paylaştırılır
function readForm() {
  var F = { rows: fRows.map(readRow), grandRaw: $('fTotal').value.trim() };
  F.grand = num(F.grandRaw); F.pal = palCount(F.rows);
  F.xc = readCosts(); F.dp = readDep(F.pal);
  F.inSum = F.xc.inSum + (F.dp.inc && F.dp.tot ? F.dp.tot : 0);
  F.goods = F.grand == null ? null : Math.round((F.grand - F.inSum) * 100) / 100;
  if (F.goods != null && F.goods < -0.004) F.inErr = 'Toplam fiyatın içinde işaretlenenler (' + money(F.inSum) + '), toplam fiyattan (' + money(F.grand) + ') fazla.';
  F.sp = spread(F.rows, F.inErr ? null : F.goods);
  if (F.sp.err && F.inSum && F.goods != null) F.sp.err += ' (Toplam fiyattan içindeki ' + money(F.inSum) + ' düşüldü, mal bedeli ' + money(F.goods) + '.)';
  F.xs = extraShares(F.rows, F.xc.sum);
  F.total = F.sp.lines.reduce(function (t, l) { return t + (l.total || 0); }, 0); // mal bedeli
  F.debt = F.total + F.inSum; // toptancısız girişte toptancıya
  F.due = F.total + F.xc.sum + (F.dp.tot || 0); // toptancı hesabına: mal + nakliye/ek gider + palet
  return F;
}
function bad(el, on) { if (el) el.classList.toggle('bad', !!on || (!!el.value.trim() && num(el.value) == null)); }
// her satırın altındaki hesap, kutuların kırmızısı ve en alttaki girişin özeti
function calc() {
  var F = readForm(), rows = F.rows, sp = F.sp, xc = F.xc, xs = F.xs, dp = F.dp, koliSum = 0, priced = 0, sum = 0;
  $('fPalN').textContent = F.pal ? fmt(F.pal) : '—';
  $('fDepPer').placeholder = !$('fDepPer').value.trim() && dp.per != null ? '= ' + fmt(Math.round(dp.per * 100) / 100) : 'ör. 250';
  $('fDepTot').placeholder = !$('fDepTot').value.trim() && dp.tot != null ? '= ' + fmt(dp.tot) : 'ör. 1.500';
  // palet çeşidi satırları: tek satırda adet boşsa çeşitlerdeki palet sayısı; hatalı kutular kırmızı
  document.querySelectorAll('#fPals .prow').forEach(function (el) {
    var p = fPals[+el.dataset.pi], n = el.querySelector('[data-pf="n"]'), pr = el.querySelector('[data-pf="price"]');
    n.placeholder = dp.autoN ? '= ' + fmt(F.pal) : 'ör. 5';
    bad(n); bad(pr, String(p.n).trim() && !String(p.price).trim());
  });
  $('fPalHint').innerHTML = fPals.length
    ? (F.pal ? 'Çeşitlerden hesaplanan ' + fmt(F.pal) + ' palet' : 'Çeşitlerde palet sayısı yok')
      + (dp.n ? ' · yazılan ' + fmt(dp.n) + ' boş palet' : '') + (dp.tot ? ' · boş palet parası <b>' + money(dp.tot) + '</b>' : '')
      + (dp.n && F.pal && Math.abs(dp.n - F.pal) > 0.004 ? ' <span class="warn">(palet sayıları farklı)</span>' : '')
    : '';
  var tSup = supOf(fSup);
  document.querySelectorAll('#fLines .eline').forEach(function (el) {
    var i = +el.dataset.i, f = rows[i], t = sp.lines[i], out = [];
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
      } else out.push('<span class="new">Yeni ürün oluşturulacak: ' + esc(f.brand + ' ' + f.variety) + '</span>');
      if (fSup === '__new' || (tSup && (!f.pid || tSup.pids.indexOf(f.pid) < 0))) out.push('<span class="ex">Toptancının ürün listesine eklenecek</span>');
    }
    if (f.bad) out.push('<span class="new">' + fmt(f.palet) + ' palet × ' + fmt(f.kpp) + ' koli = ' + fmt(f.palet * f.kpp) + ' koli, toplam koliyle (' + fmt(f.koli) + ') tutmuyor. Birini boş bırak.</span>');
    else if (koli) out.push('<span class="n">' + lineKoliTxt(f) + (f.calc.kpp === 'eski' ? ' (palette koli son girişten)' : '') + '</span>');
    if (t.total != null && koli) out.push('<span>' + (t.auto ? 'toplamdan payı ' + money(t.total) + ' · ' : '') + 'koli başı ' + money(t.total / koli) + '</span>');
    if (koli && xs[i]) out.push('<span>nakliye/ek gider payı ' + money(xs[i]) + (t.total != null ? ' · giderle koli başı <b>' + money((t.total + xs[i]) / koli) + '</b>' : '') + '</span>');
    el.querySelector('[data-lc]').innerHTML = out.join('');
    koliSum += koli;
    if (t.total != null) { sum += t.total; priced++; }
  });
  bad($('fTotal'), sp.err || F.inErr);
  bad($('fDepPer'), dp.err); bad($('fDepTot'), dp.err && $('fDepTot').value.trim());
  bad($('fNak'));
  document.querySelectorAll('#fCosts [data-c="amount"]').forEach(function (x) { bad(x); });
  var paid = num($('fPaid').value);
  bad($('fPaid'), !editing && !supOf(fSup) && fSup !== '__new' && paid != null && paid > F.debt + 0.004);
  // genel özet: çeşit tablosu, palet, mal bedeli, giderler, toplam ve ortalama koli başı maliyet
  var all = [];
  if (koliSum) {
    var palSum = 0, noPal = 0, pKoli = 0, pCost = 0, trs = '';
    rows.forEach(function (f, i) {
      var t = sp.lines[i], k = f.koli || 0, c = t.total != null ? t.total + xs[i] : null;
      if (f.palet && !f.bad) palSum += f.palet; else if (k) noPal++;
      if (c != null && k) { pKoli += k; pCost += c; }
      trs += '<tr><td>' + esc(f.brand && f.variety ? f.brand + ' ' + f.variety : (i + 1) + '. ürün') + '</td><td>' + fmt(k) + '</td>'
        + '<td>' + (c != null ? money(c) : '—') + '</td><td>' + (c != null && k ? money(c / k) : '—') + '</td></tr>';
    });
    if (rows.length > 1) {
      all.push('<div class="tbl"><table><thead><tr><th>Çeşit</th><th>Koli</th><th>Maliyet</th><th>Koli başı</th></tr></thead><tbody>' + trs + '</tbody>'
        + '<tfoot><tr><td>Toplam</td><td>' + fmt(koliSum) + '</td><td>' + (pKoli ? money(pCost) : '—') + '</td><td>' + (pKoli ? money(pCost / pKoli) : '—') + '</td></tr></tfoot></table></div>');
    }
    all.push('<span><b>' + rows.length + ' çeşit · ' + fmt(koliSum) + ' koli' + (palSum ? ' · ' + fmt(palSum) + ' palet' : '') + '</b>'
      + (palSum && noPal ? ' (' + noPal + ' çeşidin paleti bilinmiyor)' : '') + '</span>');
    if (F.grand != null && F.inSum && !F.inErr) all.push('<span class="n">Toplam fiyat ' + money(F.grand) + ' − içindekiler ' + money(F.inSum) + ' = mal bedeli <b>' + money(F.goods) + '</b></span>');
    else if (priced) all.push('<span class="n">Mal bedeli <b>' + money(sum) + '</b></span>');
    if (xc.sum) {
      var xin = xc.inSum, xout = xc.sum - xc.inSum;
      all.push('<span class="n">Nakliye + ek gider <b>' + money(xc.sum) + '</b> <small>(maliyete eklenir'
        + (xin ? '; ' + money(xin) + ' toplamın içinde' : '') + (xout ? '; ' + money(xout) + ' ayrı ödendi' : '') + ')</small></span>');
    }
    if (dp.tot) all.push('<span class="n">Boş palet parası <b>' + money(dp.tot) + '</b> <small>(' + ((dp.lines || []).length ? depLinesTxt(dp.lines) + '; ' : '') + (dp.inc ? 'toplamın içinde' : 'ayrı ödendi') + '; paletler verilince iade edilir, maliyete eklenmez)</small></span>');
    if (pKoli) {
      all.push('<span class="n">Toplam maliyet <b>' + money(pCost) + '</b></span>');
      all.push('<span class="n">Ortalama koli başı maliyet <b>' + money(pCost / pKoli) + '</b></span>');
    }
    if (priced < rows.length) all.push('<span class="new">' + (rows.length - priced) + ' çeşidin fiyatı yok' + (pKoli ? '; toplam ve ortalama onlarsız hesaplandı' : '') + '.</span>');
    if (tSup || fSup === '__new') {
      // toptancı hesabı: bu giriş eklenince önceki kalan + bu giriş − şimdi ödenen
      var prev = tSup ? supAccount(tSup).rem - (editing ? shipDue(byId(db.ships, editing)) : 0) : 0, now = prev + F.due - (!editing && paid ? paid : 0);
      all.push('<span>Toptancı hesabına yazılacak <b>' + money(F.due) + '</b></span>');
      all.push('<span class="n">Hesapta önceki kalan ' + sm(prev) + (!editing && paid ? ' − şimdi ödenen ' + money(paid) : '') + ' → kalan <b>' + sm(now) + '</b></span>');
    }
    else if (!editing && F.debt && paid != null) all.push('<span>Şimdi ödenen ' + money(paid) + (F.debt - paid > 0.004 ? ' · toptancıya kalan borç <b>' + money(F.debt - paid) + '</b>' : ' · borç kalmıyor') + '</span>');
    else if (!editing && F.debt) all.push('<span>Toptancıya borç <b>' + money(F.debt) + '</b></span>');
  }
  if (F.inErr) all.push('<span class="new">' + F.inErr + '</span>');
  if (sp.err) all.push('<span class="new">' + sp.err + '</span>');
  if (dp.err) all.push('<span class="new">' + dp.err + '</span>');
  $('fCalc').innerHTML = all.join('');
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
  if (err) { $('fErr').textContent = err; $('fSup').classList.toggle('bad', !fSup || (fSup === '__new' && !supNew)); return; }

  var sup = fSup === '__new' ? ensureSup(supNew) : supOf(fSup), nNew = 0;
  if (isNew) { s = { id: 'h' + uid(), ts: Date.now(), time: date === today() ? nowHM() : '', pays: [] }; db.ships.push(s); }
  s.date = date; s.note = $('fNote').value.split('\n').map(clean).filter(Boolean).join('\n');
  s.total = grandRaw ? grand : null;
  s.nak = xc.nak || null; s.nakIn = !!(xc.nak && xc.nakIn); s.costs = xc.list;
  s.sup = sup ? sup.id : null;
  s.dep = dp.tot || null; s.depIn = !!(dp.tot && dp.inc); s.depPer = dp.tot ? dp.per : null; s.depPerIn = !!(dp.tot && dp.perIn);
  // palet çeşitleri: elle eklenen yeni çeşit toptancının palet listesine de eklenir
  s.depLines = dp.tot && (dp.lines || []).length ? dp.lines.map(function (l) {
    var pal = l.pal || (sup ? ensurePal(sup, l.name).id : null);
    return { pal: pal, name: l.name, price: l.price, n: l.n };
  }) : null;
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
$('fPals').addEventListener('input', function (ev) {
  var k = ev.target.dataset.pf, el = ev.target.closest('.prow'); if (!k || !el) return;
  fPals[+el.dataset.pi][k] = ev.target.value; $('fErr').textContent = ''; calc();
});
$('fPals').addEventListener('click', function (ev) {
  var b = ev.target.closest('[data-prm]'); if (!b) return;
  fPals.splice(+b.dataset.prm, 1); renderPals(); calc();
});
$('fAddPal').addEventListener('click', function () {
  fPals.push({ pal: null, name: '', price: '', n: '' }); renderPals(); calc();
  $('fPals').lastElementChild.querySelector('[data-pf="name"]').focus();
});
$('fAddLine').addEventListener('click', addRow);
$('fPaid').addEventListener('input', function () { $('fErr').textContent = ''; calc(); });
$('fTotal').addEventListener('input', function () { $('fErr').textContent = ''; calc(); });
$('fNak').addEventListener('input', function () { $('fErr').textContent = ''; calc(); });
['fDepPer', 'fDepTot', 'fDepIn', 'fNakIn'].forEach(function (id) { $(id).addEventListener(/In$/.test(id) ? 'change' : 'input', function () { $('fErr').textContent = ''; calc(); }); });
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
