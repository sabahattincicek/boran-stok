'use strict';
/* Yedek: dışa ve içe aktarma */

mountPage(`
  <section class="page" id="p-yedek" hidden>
    <header class="top"><h1>Yedek</h1><span class="hint" id="bAcct"></span></header>
    <p class="hint">Kayıtlar sadece bu tarayıcının hafızasında durur. Tarayıcı verisini silersen veya telefon değiştirirsen kaybolur; ara ara dışa aktar. Her şubenin yedeği ayrı alınır; içe aktarma açık olan şubeye yapılır.</p>
    <div class="card">
      <h2>Dışa aktar</h2>
      <p class="hint" id="lastBackup"></p>
      <div class="row">
        <button type="button" class="primary grow" id="expDl">Dosya indir</button>
        <button type="button" id="expShare" hidden>Paylaş</button>
        <button type="button" id="expCopy">Kopyala</button>
      </div>
      <textarea id="expOut" readonly spellcheck="false"></textarea>
    </div>
    <div class="card">
      <h2>İçe aktar</h2>
      <p class="hint">Daha önce aldığın .txt yedeğini seç ya da metnini aşağıya yapıştır.</p>
      <input type="file" id="impFile" accept=".txt,text/plain">
      <textarea id="impIn" rows="6" spellcheck="false" autocapitalize="off" placeholder="Yedek metnini buraya yapıştır"></textarea>
      <button type="button" id="impRead">Oku</button>
      <div class="res" id="impRes" hidden></div>
      <div class="row" id="impActs" hidden>
        <button type="button" class="primary grow" id="impMerge">Mevcutlara ekle</button>
        <button type="button" class="danger" id="impReplace">Hepsini değiştir</button>
      </div>
    </div>
  </section>`);

function byDayBlocks(list, L, write) {
  var byDay = {};
  list.forEach(function (x) { (byDay[x.date] = byDay[x.date] || []).push(x); });
  Object.keys(byDay).sort().forEach(function (d, i) {
    if (i) L.push('', '', '', '');
    L.push(dateTR(d), '--------------------------');
    byDay[d].sort(function (a, b) { return cmp(entKey(a), entKey(b)); }).forEach(function (x, j) {
      if (j) L.push('');
      if (x.time) L.push(x.time);
      write(x);
      (x.note || '').split('\n').forEach(function (n) { if (n.trim()) L.push('(' + n.trim() + ')'); });
    });
  });
}
function exportText() {
  var L = ['BORAN STOK SATIŞ YEDEĞİ', 'Şube: ' + acct.name, 'Oluşturma: ' + dateTR(today()) + ' ' + nowHM(), '', '', '', ''];
  // toptancılar: ürün listesi ve boş palet çeşitleri
  if (db.sups.length) {
    L.push('== TOPTANCILAR ==', '');
    supsSorted().forEach(function (t, i) {
      if (i) L.push('');
      L.push('[toptancı]', t.name);
      t.pids.forEach(function (id) { var p = db.products[id]; if (p) L.push('ürün ' + p.brand + ' / ' + p.variety); });
      t.pals.forEach(function (p) { L.push('palet ' + p.name); });
      if (t.note) L.push('(' + t.note + ')');
    });
    L.push('', '', '', '');
  }
  L.push('== STOK GİRİŞLERİ ==', '');
  byDayBlocks(db.ships, L, function (s) {
    L.push('[giriş]');
    if (s.sup) L.push('toptancı ' + supName(s.sup));
    linesOf(s.id).forEach(function (e) {
      var p = db.products[e.pid];
      L.push(p.brand + ' / ' + p.variety, (e.palet && e.kpp ? amt(e.palet) + ' palet x ' + amt(e.kpp) + ' koli = ' : '') + amt(e.koli) + ' koli');
      if (e.total != null && !e.auto) L.push('toplam ' + amt(e.total) + ' tl');
    });
    if (s.total != null) L.push('giriş toplamı ' + amt(s.total) + ' tl');
    if (s.nak) L.push('nakliye ' + amt(s.nak) + ' tl' + (s.nakIn ? ' (toplamda)' : ''));
    if (s.dep > 0) L.push('boş palet ' + amt(s.dep) + ' tl' + (s.depIn ? ' (toplamda)' : '') + (s.depBack ? ' / iade ' + dateTR(s.depBack) : ''));
    (s.depLines || []).forEach(function (l) { L.push('palet ' + l.name + ' ' + amt(l.n) + ' x ' + amt(l.price) + ' tl'); });
    (s.costs || []).forEach(function (c) { L.push('ek gider ' + amt(c.amount) + ' tl' + (c.inc ? ' (toplamda)' : '') + ': ' + c.desc); });
    s.pays.slice().sort(function (a, b) { return cmp(a.date + ' ' + a.ts, b.date + ' ' + b.ts); })
      .forEach(function (x) { L.push('ödeme ' + dateTR(x.date) + ' ' + amt(x.amount) + ' tl' + (x.note ? ': ' + x.note : '')); });
  });
  // toptancı hesabı: ödemeler, geri verilen boş paletler, geri alınan palet parası
  var mv = [];
  db.sups.forEach(function (t) {
    t.pays.forEach(function (x) { mv.push({ k: 'odeme', date: x.date, ts: x.ts, time: '', note: x.note, sup: t.name, amount: x.amount }); });
    t.gives.forEach(function (x) { mv.push({ k: 'palet verdim', date: x.date, ts: x.ts, time: '', note: x.note, sup: t.name, lines: x.lines }); });
    t.refs.forEach(function (x) { mv.push({ k: 'palet parası', date: x.date, ts: x.ts, time: '', note: x.note, sup: t.name, amount: x.amount }); });
  });
  if (mv.length) {
    L.push('', '', '', '', '== TOPTANCI HAREKETLERİ ==', '');
    byDayBlocks(mv, L, function (x) {
      L.push('[' + (x.k === 'odeme' ? 'ödeme' : x.k) + ']', 'toptancı ' + x.sup);
      (x.lines || []).forEach(function (l) { L.push('palet ' + l.name + ' ' + amt(l.n) + ' adet'); });
      if (x.amount != null) L.push('tutar ' + amt(x.amount) + ' tl');
    });
  }
  L.push('', '', '', '', '== SAYIMLAR ==', '');
  byDayBlocks(db.counts, L, function (c) {
    var p = db.products[c.pid];
    L.push('[sayım]', p.brand + ' / ' + p.variety, amt(c.koli) + ' koli');
  });
  L.push('', '', '', '', '== SATIŞLAR ==', '');
  byDayBlocks(db.sales, L, function (s) {
    L.push('[' + (s.pay || 'nakit') + ']');
    s.items.forEach(function (i) { var p = db.products[i.pid]; L.push(amt(i.n) + 'x ' + p.brand + ' / ' + p.variety + ' @ ' + amt(i.price) + ' tl'); });
    L.push('toplam ' + amt(saleTotal(s)) + ' tl / ödenen ' + amt(salePaid(s)) + ' tl');
    (s.cols || []).forEach(function (x) { L.push('tahsilat ' + dateTR(x.date) + ' ' + amt(x.amount) + ' tl'); });
  });
  L.push('', '', '', '', '== GELİR GİDER ==', '');
  byDayBlocks(db.cash, L, function (x) {
    L.push('[' + x.kind + ']', x.desc, amt(x.amount) + ' tl');
  });
  return L.join('\n') + '\n';
}
function fileName() { return 'boran-yedek-' + (fold(acct.name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'sube') + '-' + today() + '.txt'; }
function markBackup() { ameta('lastBackup', today() + ' ' + nowHM()); renderBackup(); }
function renderBackup() {
  $('expOut').value = exportText();
  var lb = ameta('lastBackup');
  $('bAcct').textContent = acct.name;
  $('lastBackup').textContent = acct.name + ': ' + db.sales.length + ' satış, ' + db.ships.length + ' giriş, ' + db.counts.length + ' sayım, ' + db.cash.length + ' gelir/gider, ' + Object.keys(db.products).length + ' ürün, ' + db.sups.length + ' toptancı. '
    + (lb ? 'Son yedek: ' + dateTR(lb.slice(0, 10)) + ' ' + lb.slice(11) + ' (' + ago(lb.slice(0, 10)) + ').' : 'Henüz yedek alınmadı.');
  $('expShare').hidden = !(navigator.canShare && navigator.canShare({ files: [new File(['x'], 'a.txt', { type: 'text/plain' })] }));
}

/* ---------- içe aktarma ---------- */
// Eski defter (cikti.txt) satırları: "3x0.5 maysu", "1x beypazari", "1x maysu bardaksu", "1x avşar meyveli", "1x5.0"
// O defterde fiyat yok; aktarırken bu fiyatlar kullanılır.
var LEGACY_PRICE = { su: 100, beypazari: 240, avsar: 280 };
function legacyItem(f) {
  var m = f.match(/^(\d+)\s*x\s*(.*)$/), n, r, z;
  if (!m) return null;
  n = +m[1]; r = m[2].trim();
  if (/bardak/.test(r)) return { n: n, brand: 'Maysu', variety: '0.2', price: LEGACY_PRICE.su };
  if (/beypazar/.test(r)) return { n: n, brand: 'Beypazarı', variety: 'Sade', price: LEGACY_PRICE.beypazari };
  if (/avsar/.test(r)) return { n: n, brand: 'Avşar', variety: 'Karadut', price: LEGACY_PRICE.avsar };
  if ((z = r.match(/^(\d+(?:\.\d+)?)\s*(maysu|sersu)?$/))) {
    var v = z[1].indexOf('.') < 0 ? z[1] + '.0' : z[1];
    return { n: n, brand: z[2] === 'sersu' ? 'Sersu' : 'Maysu', variety: v, price: LEGACY_PRICE.su };
  }
  return null;
}
function parseBackup(text) {
  var ents = [], sales = [], counts = [], cash = [], sups = [], rets = [], acctName = '', section = null, date = null, time = '', cur = null, lastSale = null;
  function inSec(name) { return !section || section.indexOf(name) === 0; }
  String(text).replace(/^﻿/, '').split(/\r?\n/).forEach(function (raw) {
    var t = raw.trim(), f = fold(t), m;
    if (!t) { cur = null; time = ''; return; }
    if ((m = t.match(/^==+\s*(.+?)\s*==+$/))) { section = fold(m[1]); date = null; cur = null; return; }
    if (/^[-–—_=]{3,}$/.test(t)) return;
    if ((m = t.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})$/))) { date = m[3] + '-' + pad2(m[2]) + '-' + pad2(m[1]); cur = null; time = ''; lastSale = null; return; }
    if ((m = t.match(/^(\d{1,2}):(\d{2})$/))) { time = pad2(m[1]) + ':' + m[2]; cur = null; return; }
    if (!section && (m = t.match(/^[şŞsS]ube:\s*(.+)$/))) { acctName = clean(m[1]); return; }
    if (f === '[toptanci]' && inSec('toptanci')) { cur = { kind: 't', name: '', pids: [], pals: [], note: [] }; sups.push(cur); return; }
    // toptancı hareketleri; eski "[palet iade]" kaydı hem palet verdim hem para iadesi sayılır
    if ((m = f.match(/^\[(odeme|palet verdim|palet parasi|palet iade)\]$/)) && (inSec('toptanci hareket') || inSec('palet'))) {
      cur = { kind: 'r', type: m[1], date: date, time: time, sup: '', lines: [], amount: null, note: [] }; rets.push(cur); time = ''; return;
    }
    if (f === '[sayim]' && inSec('sayim')) { cur = { kind: 'c', date: date, time: time, brand: '', variety: '', koli: null }; counts.push(cur); time = ''; return; }
    if (f === '[odenmedi]' && inSec('satis')) { cur = lastSale = { kind: 's', date: date, time: time, pay: 'nakit', items: [], paid: 0, note: [], cols: [] }; sales.push(cur); time = ''; return; }
    if ((m = f.match(/^\[(gelir|gider)\]$/)) && inSec('gelir')) { cur = { kind: 'g', type: m[1], date: date, time: time, desc: '', amount: null, note: [] }; cash.push(cur); time = ''; return; }
    if (f === '[giris]' && inSec('stok')) { cur = { kind: 'e', date: date, time: time, sup: '', lines: [], pays: [], paid: null, total: null, nak: null, dep: null, depBack: null, depLines: [], costs: [], note: [] }; ents.push(cur); time = ''; return; }
    if ((m = f.match(/^\[(nakit|havale)\]$/)) && inSec('satis')) { cur = lastSale = { kind: 's', date: date, time: time, pay: m[1], items: [], paid: null, note: [], cols: [] }; sales.push(cur); time = ''; return; }
    // eski defterde boş satırdan sonra tek başına kalan not: o günün bir önceki satışına eklenir
    if (!cur && lastSale && (m = t.match(/^\((.*)\)$/))) { if (m[1].trim()) lastSale.note.push(m[1].trim()); return; }
    if (!cur) return;
    if ((m = t.match(/^\((.*)\)$/))) { if (m[1].trim()) cur.note.push(m[1].trim()); return; }
    if (cur.kind === 'e' && (m = f.match(/^giris toplami\s+([\d.,]+)/))) { cur.total = num(m[1]); return; }
    if (cur.kind === 'e' && (m = f.match(/^nakliye\s+([\d.,]+)/))) { cur.nak = num(m[1]); cur.nakIn = /\(toplamda\)/.test(f); return; }
    if (cur.kind === 'e' && (m = f.match(/^bos palet\s+([\d.,]+)\s*(?:tl|₺)?\s*(\(toplamda\))?(?:\s*\/\s*iade\s+(\d{1,2})[.\/](\d{1,2})[.\/](\d{4}))?/))) {
      cur.dep = num(m[1]); cur.depIn = !!m[2]; cur.depBack = m[3] ? m[5] + '-' + pad2(m[4]) + '-' + pad2(m[3]) : null; return;
    }
    if (cur.kind === 'e' && (m = t.match(/^ek gider\s+([\d.,]+)\s*(?:tl|₺)?\s*(\(toplamda\))?\s*(?::\s*(.*))?$/i))) { cur.costs.push({ desc: clean(m[3] || '') || 'Ek gider', amount: num(m[1]), inc: !!m[2] }); return; }
    // toptancı ve boş palet satırları (giriş, palet iadesi, toptancı bilgisi)
    if ((cur.kind === 'e' || cur.kind === 'r') && (m = t.match(/^toptanc[ıi]\s+(.+)$/i))) { cur.sup = clean(m[1]); return; }
    if ((cur.kind === 'e' || cur.kind === 'r') && (m = t.match(/^palet\s+(.+?)\s+([\d.,]+)\s*[x×]\s*([\d.,]+)\s*(?:tl|₺)?$/i))) {
      (cur.kind === 'e' ? cur.depLines : cur.lines).push({ name: clean(m[1]), n: num(m[2]), price: num(m[3]) }); return;
    }
    if (cur.kind === 'r' && (m = t.match(/^palet\s+(.+?)\s+([\d.,]+)\s*adet$/i))) { cur.lines.push({ name: clean(m[1]), n: num(m[2]) }); return; }
    if (cur.kind === 'r' && (m = f.match(/^tutar\s+([\d.,]+)/))) { cur.amount = num(m[1]); return; }
    if (cur.kind === 'r') { cur.bad = true; return; }
    if (cur.kind === 't') {
      if ((m = t.match(/^[üÜuU]r[üÜuU]n\s+(.+?)\s+\/\s+(.+)$/))) cur.pids.push({ brand: clean(m[1]), variety: clean(m[2]) });
      else if ((m = t.match(/^palet\s+(.+?)(?:\s+[\d.,]+\s*(?:tl|₺)?)?$/i))) cur.pals.push({ name: clean(m[1]) });
      else if (!cur.name) cur.name = clean(t);
      return;
    }
    if (/^(toplam|odenen)\b/.test(f)) {
      var ln = cur.kind === 'e' && cur.lines[cur.lines.length - 1];
      if (ln && (m = f.match(/toplam\s+([\d.,]+)/))) ln.total = num(m[1]);
      // eski yedeklerde ödenen tutar "toplam ... / ödenen ..." satırındaydı
      if ((m = f.match(/odenen\s+([\d.,]+)/))) cur.paid = num(m[1]);
      return;
    }
    if (cur.kind === 'e' && (m = t.match(/^[öÖoO]deme\s+(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})\s+([\d.,]+)\s*(?:tl|₺)?\s*(?::\s*(.*))?$/i))) {
      cur.pays.push({ date: m[3] + '-' + pad2(m[2]) + '-' + pad2(m[1]), amount: num(m[4]), note: clean(m[5] || '') }); return;
    }
    if (cur.kind === 's' && (m = f.match(/^tahsilat\s+(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})\s+([\d.,]+)\s*(?:tl|₺)?$/))) {
      cur.cols.push({ date: m[3] + '-' + pad2(m[2]) + '-' + pad2(m[1]), amount: num(m[4]) }); return;
    }
    if (cur.kind === 'g') {
      if (cur.desc && (m = f.match(/^([\d.,]+)\s*(tl|₺)$/))) cur.amount = num(m[1]);
      else if (!cur.desc) cur.desc = clean(t);
      return;
    }
    if (cur.kind === 'c') {
      if ((m = f.match(/^([\d.,]+)\s*koli$/))) cur.koli = num(m[1]);
      else if (!cur.brand && (m = t.match(/^(.+?)\s+\/\s+(.+)$/))) { cur.brand = clean(m[1]); cur.variety = clean(m[2]); }
    } else if (cur.kind === 'e') {
      var last = cur.lines[cur.lines.length - 1];
      if ((m = f.match(/^([\d.,]+)\s*palet\s*[x×*]\s*([\d.,]+)\s*koli(?:\s*=\s*([\d.,]+)\s*koli)?/))) {
        if (last) { last.palet = num(m[1]); last.kpp = num(m[2]); last.koli = m[3] ? num(m[3]) : last.palet * last.kpp; } else cur.bad = true; return;
      }
      if ((m = f.match(/^([\d.,]+)\s*koli$/))) { if (last) last.koli = num(m[1]); else cur.bad = true; return; }
      if ((m = t.match(/^(.+?)\s+\/\s+(.+)$/))) cur.lines.push({ brand: clean(m[1]), variety: clean(m[2]), koli: null, palet: null, kpp: null, total: null });
    } else if ((m = t.match(/^([\d.,]+)\s*x\s+(.+?)\s+\/\s+(.+?)\s+@\s*([\d.,]+)\s*(tl|₺)?$/i))) {
      cur.items.push({ n: num(m[1]), brand: clean(m[2]), variety: clean(m[3]), price: num(m[4]) });
    } else if ((m = legacyItem(f))) {
      cur.items.push(m);
    } else cur.bad = true;
  });
  var bad = 0;
  ents = ents.filter(function (e) {
    var ok = e.date && !e.bad && e.lines.length && e.lines.every(function (l) { return l.brand && l.variety && l.koli > 0; });
    if (!ok) bad++; return ok;
  });
  ents.forEach(function (e) {
    // giriş toplamı varsa içindeki giderler düşülür, kalan fiyatsız çeşitlere yine paylaştırılır
    var inSum = (e.nakIn ? e.nak || 0 : 0) + (e.depIn ? e.dep || 0 : 0) + e.costs.reduce(function (t, c) { return t + (c.inc ? c.amount : 0); }, 0);
    var sp = spread(e.lines, e.total == null ? null : e.total - inSum);
    if (sp.err) e.total = null;
    else e.lines.forEach(function (l, i) { l.total = sp.lines[i].total; l.auto = sp.lines[i].auto; });
    e.costs = e.costs.filter(function (c) { return c.amount > 0; });
    var xs = extraShares(e.lines, (e.nak || 0) + e.costs.reduce(function (t, c) { return t + c.amount; }, 0));
    e.lines.forEach(function (l, i) { l.extra = xs[i]; });
    if (e.paid > 0 && e.lines.some(function (l) { return l.total != null; })) e.pays.push({ date: e.date, amount: e.paid });
    e.pays = e.pays.filter(function (x) { return x.amount > 0; });
    e.depLines = e.dep > 0 ? e.depLines.filter(function (l) { return l.n > 0 && l.price != null; }) : [];
  });
  sups = sups.filter(function (t) {
    if (!t.name) bad++; return !!t.name;
  });
  rets = rets.filter(function (r) {
    r.lines = r.lines.filter(function (l) { return l.n > 0; });
    var ok = r.date && !r.bad && r.sup && (r.type === 'palet verdim' ? r.lines.length : r.amount > 0); if (!ok) bad++; return ok;
  });
  sales = sales.filter(function (s) {
    var ok = s.date && !s.bad && s.items.length && s.items.every(function (i) { return i.n > 0 && i.price != null; });
    if (!ok) bad++; return ok;
  });
  counts = counts.filter(function (c) { var ok = c.date && c.brand && c.variety && c.koli != null; if (!ok) bad++; return ok; });
  cash = cash.filter(function (x) { var ok = x.date && x.desc && x.amount > 0; if (!ok) bad++; return ok; });
  return { entries: ents, sales: sales, counts: counts, cash: cash, sups: sups, rets: rets, acct: acctName, bad: bad };
}
function shipSig(date, time, note, total, nak, costs, lines, pays, dep, depBack, nakIn, depIn, sup, depLines) {
  return ['e', date, time || '', note || '', total == null ? '' : total, nak || '', nakIn ? 'i' : '', dep || '', depIn ? 'i' : '', depBack || '', fold(sup || '')]
    .concat((depLines || []).map(function (l) { return 'p:' + fold(l.name) + ':' + l.n + ':' + l.price; }).sort())
    .concat((costs || []).map(function (c) { return 'x:' + fold(c.desc) + ':' + c.amount + (c.inc ? ':i' : ''); }).sort())
    .concat(lines.map(function (l) { return pkey(l.brand, l.variety) + ':' + l.koli + ':' + (l.kpp || '') + ':' + l.total; }).sort())
    .concat(pays.map(function (x) { return 'o:' + x.date + ':' + x.amount + ':' + (x.note || ''); }).sort()).join('|');
}
function movSig(type, date, sup, amount, note, lines) {
  return ['r', type, date, fold(sup), amount == null ? '' : amount, note || ''].concat((lines || []).map(function (l) { return fold(l.name) + ':' + l.n; }).sort()).join('|');
}
function cntSig(date, time, brand, variety, koli) { return ['c', date, time || '', pkey(brand, variety), koli].join('|'); }
function cashSig(date, time, type, desc, amount, note) { return ['g', date, time || '', type, fold(desc), amount, note || ''].join('|'); }
function saleSig(date, time, pay, paid, note, items) {
  return ['s', date, time || '', pay, paid, note || ''].concat(items.map(function (i) { return pkey(i.brand, i.variety) + ':' + i.n + ':' + i.price; }).sort()).join('|');
}
var parsed = null;
function readImport() {
  parsed = parseBackup($('impIn').value);
  var n = parsed.entries.length, ns = parsed.sales.length, nc = parsed.counts.length, ng = parsed.cash.length, nt = parsed.sups.length, nr = parsed.rets.length, prods = {};
  var any = n + ns + nc + ng + nt + nr;
  parsed.counts.forEach(function (c) { prods[pkey(c.brand, c.variety)] = 1; });
  parsed.entries.forEach(function (e) { e.lines.forEach(function (l) { prods[pkey(l.brand, l.variety)] = 1; }); });
  parsed.sales.forEach(function (s) { s.items.forEach(function (i) { prods[pkey(i.brand, i.variety)] = 1; }); });
  var newP = Object.keys(prods).filter(function (k) { var s = k.split('|'); return !findProduct(s[0], s[1]); }).length;
  $('impRes').hidden = false;
  $('impRes').innerHTML = any
    ? (parsed.acct && fold(parsed.acct) !== fold(acct.name) ? '<b class="warnt">Bu yedek "' + esc(parsed.acct) + '" şubesinin; şu an açık olan "' + esc(acct.name) + '". Doğru şubeye aktardığından emin ol.</b><br>' : '')
      + [[nt, 'toptancı'], [n, 'stok girişi'], [nr, 'toptancı hareketi'], [ns, 'satış'], [nc, 'sayım'], [ng, 'gelir/gider']].filter(function (x) { return x[0]; }).map(function (x) { return '<b>' + x[0] + ' ' + x[1] + '</b>'; }).join(', ') + ' bulundu'
      + (Object.keys(prods).length ? ' (' + Object.keys(prods).length + ' ürün, ' + newP + ' tanesi yeni)' : '') + '.'
      + (parsed.bad ? '<br>' + parsed.bad + ' kayıt eksik ya da tanınmayan bilgi yüzünden atlanacak.' : '')
      + '<br><small>"Mevcutlara ekle" aynı kayıtları ikinci kez eklemez. "Hepsini değiştir" şu anki tüm kayıtları siler.</small>'
    : 'Bu metinde kayıt bulunamadı.' + (parsed.bad ? ' (' + parsed.bad + ' kayıt tanınmadı.)' : '');
  $('impActs').hidden = !any; disarm($('impReplace'));
}
function applyImport(replace) {
  if (!parsed || !(parsed.entries.length + parsed.sales.length + parsed.counts.length + parsed.cash.length + parsed.sups.length + parsed.rets.length)) return;
  if (replace) db = emptyDb();
  var have = {}, added = 0, skipped = 0, base = Date.now();
  // toptancılar adıyla eşleşir; eksik ürün ve palet çeşitleri eklenir
  parsed.sups.forEach(function (x) {
    var t = findSup(x.name);
    if (t) skipped++; else added++;
    t = ensureSup(x.name);
    if (!t.note && x.note.length) t.note = x.note.join(' ');
    x.pids.forEach(function (p) { supAddPid(t, ensureProduct(p.brand, p.variety)); });
    x.pals.forEach(function (p) { ensurePal(t, p.name); });
  });
  function palOf(t, l) { return { pal: t ? ensurePal(t, l.name).id : null, name: l.name, price: l.price, n: l.n }; }
  // mevcut kayıtlar adetleriyle sayılır; dosyadaki aynı iki satış ayrı ayrı eklenir
  function seen(k) { have[k] = (have[k] || 0) + 1; }
  db.ships.forEach(function (s) {
    seen(shipSig(s.date, s.time, s.note, s.total, s.nak, s.costs, linesOf(s.id).map(function (e) { var p = db.products[e.pid]; return { brand: p.brand, variety: p.variety, koli: e.koli, kpp: e.kpp, total: e.total }; }), s.pays, s.dep, s.depBack, s.nakIn, s.depIn, supName(s.sup), s.depLines));
  });
  db.sups.forEach(function (t) {
    t.pays.forEach(function (x) { seen(movSig('odeme', x.date, t.name, x.amount, x.note)); });
    t.gives.forEach(function (x) { seen(movSig('palet verdim', x.date, t.name, null, x.note, x.lines)); });
    t.refs.forEach(function (x) { seen(movSig('palet parasi', x.date, t.name, x.amount, x.note)); });
  });
  function addMov(type, x, i, t, note) {
    var sig = type === 'palet verdim' ? movSig(type, x.date, x.sup, null, note, x.lines) : movSig(type, x.date, x.sup, x.amount, note);
    if (have[sig] > 0) { have[sig]--; skipped++; return; }
    added++;
    var o = { id: uid() + i, ts: base + i, date: x.date, note: note };
    if (type === 'palet verdim') { o.lines = x.lines.map(function (l) { return { pal: ensurePal(t, l.name).id, name: l.name, n: l.n }; }); t.gives.push(o); }
    else { o.amount = x.amount; (type === 'odeme' ? t.pays : t.refs).push(o); }
  }
  parsed.rets.forEach(function (x, i) {
    var note = x.note.join(' '), t = ensureSup(x.sup);
    if (x.type === 'palet iade') { if (x.lines.length) addMov('palet verdim', x, i, t, note); addMov('palet parasi', x, i, t, note); }
    else addMov(x.type, x, i, t, note);
  });
  db.sales.forEach(function (s) {
    seen(saleSig(s.date, s.time, s.pay, s.paid, s.note, s.items.map(function (i) { var p = db.products[i.pid]; return { brand: p.brand, variety: p.variety, n: i.n, price: i.price }; })));
  });
  db.counts.forEach(function (c) { var p = db.products[c.pid]; seen(cntSig(c.date, c.time, p.brand, p.variety, c.koli)); });
  db.cash.forEach(function (x) { seen(cashSig(x.date, x.time, x.kind, x.desc, x.amount, x.note)); });
  parsed.cash.forEach(function (x, i) {
    var note = x.note.join('\n'), s = cashSig(x.date, x.time, x.type, x.desc, x.amount, note);
    if (have[s] > 0) { have[s]--; skipped++; return; }
    added++;
    db.cash.push({ id: 'g' + uid() + i, ts: base + i, kind: x.type, date: x.date, time: x.time || '', desc: x.desc, amount: x.amount, note: note });
  });
  parsed.counts.forEach(function (x, i) {
    var s = cntSig(x.date, x.time, x.brand, x.variety, x.koli);
    if (have[s] > 0) { have[s]--; skipped++; return; }
    added++;
    db.counts.push({ id: 'c' + uid() + i, ts: base + i, pid: ensureProduct(x.brand, x.variety), date: x.date, time: x.time || '', koli: x.koli });
  });
  parsed.entries.forEach(function (x, i) {
    var note = x.note.join('\n'), sig = shipSig(x.date, x.time, note, x.total, x.nak, x.costs, x.lines, x.pays, x.dep, x.depBack, x.nakIn, x.depIn, x.sup, x.depLines);
    if (have[sig] > 0) { have[sig]--; skipped++; return; }
    added++;
    var t = x.sup ? ensureSup(x.sup) : null;
    var s = { id: 'h' + uid() + i, ts: base + i, date: x.date, time: x.time || '', note: note, total: x.total, nak: x.nak || null, nakIn: !!(x.nak && x.nakIn), costs: x.costs,
      sup: t ? t.id : null, dep: x.dep || null, depIn: !!(x.dep && x.depIn), depBack: x.dep ? x.depBack : null, depPerIn: false,
      depLines: x.depLines.length ? x.depLines.map(function (l) { return palOf(t, l); }) : null,
      pays: x.pays.map(function (o, j) { return { id: 'o' + uid() + i + '_' + j, ts: base + i, date: o.date, amount: o.amount, note: o.note || '' }; }) };
    // toptancılı girişin ödemeleri toptancı hesabına
    if (t && s.pays.length) { t.pays = t.pays.concat(s.pays); s.pays = []; }
    db.ships.push(s);
    x.lines.forEach(function (l, j) {
      var pid = ensureProduct(l.brand, l.variety);
      if (t) supAddPid(t, pid);
      db.entries.push({ id: 'e' + uid() + i + '_' + j, ts: s.ts, sid: s.id, pid: pid, date: s.date, time: s.time,
        koli: l.koli, kpp: l.kpp || null, palet: l.palet || null, total: l.total, auto: !!l.auto, extra: l.extra || 0 });
    });
  });
  parsed.sales.forEach(function (x, i) {
    var total = x.items.reduce(function (t, it) { return t + it.n * it.price; }, 0);
    var paid = x.paid == null ? total : x.paid, note = x.note.join('\n');
    var s = saleSig(x.date, x.time, x.pay, paid, note, x.items);
    if (have[s] > 0) { have[s]--; skipped++; return; }
    added++;
    db.sales.push({ id: 's' + uid() + i, ts: base + i, date: x.date, time: x.time || '', pay: x.pay, paid: paid, note: note, cols: x.cols,
      items: x.items.map(function (it) { return { pid: ensureProduct(it.brand, it.variety), n: it.n, price: it.price }; }) });
  });
  tidy(); persist();
  parsed = null; $('impIn').value = ''; $('impFile').value = ''; $('impRes').hidden = true; $('impActs').hidden = true;
  resetSaleForm(); resetCash(); renderAll();
  toast(added + ' kayıt eklendi' + (skipped ? ', ' + skipped + ' tanesi zaten vardı' : '') + '.');
}

$('expDl').addEventListener('click', function () {
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([exportText()], { type: 'text/plain;charset=utf-8' }));
  a.download = fileName(); document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  markBackup(); toast('Yedek indirildi: ' + fileName());
});
$('expShare').addEventListener('click', function () {
  var file = new File([exportText()], fileName(), { type: 'text/plain' });
  navigator.share({ files: [file], title: 'Boran stok yedeği' }).then(markBackup, function () {});
});
$('expCopy').addEventListener('click', function () {
  var txt = exportText();
  (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { markBackup(); toast('Kopyalandı.'); }, function () {
    $('expOut').focus(); $('expOut').select();
    try { document.execCommand('copy'); markBackup(); toast('Kopyalandı.'); } catch (e) { toast('Kopyalanamadı, metni elle seç.'); }
  });
});
$('impFile').addEventListener('change', function () {
  var f = this.files && this.files[0]; if (!f) return;
  var r = new FileReader();
  r.onload = function () { $('impIn').value = r.result; readImport(); };
  r.readAsText(f, 'utf-8');
});
$('impRead').addEventListener('click', readImport);
$('impMerge').addEventListener('click', function () { applyImport(false); });
$('impReplace').addEventListener('click', function () { arm(this, function () { applyImport(true); }); });
