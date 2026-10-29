'use strict';
/* ürünler, girişler, stok ve satış hesapları */

function findProduct(brand, variety) {
  var k = pkey(brand, variety);
  for (var id in db.products) if (pkey(db.products[id].brand, db.products[id].variety) === k) return id;
  return null;
}
function ensureProduct(brand, variety) {
  var id = findProduct(brand, variety);
  if (id) return id;
  // marka zaten varsa onun yazılışını kullan ("MAYSU" -> "Maysu")
  var same = brands().filter(function (b) { return fold(b.name) === fold(brand); })[0];
  id = 'p' + uid();
  db.products[id] = { brand: same ? same.name : clean(brand), variety: clean(variety), kpp: null, price: null };
  return id;
}
function entriesOf(pid) { return db.entries.filter(function (e) { return e.pid === pid; }); }
// giriş (sevkiyat): bir seferde gelen ürün satırları + toptancıya yapılan ödemeler
function linesOf(sid) { return db.entries.filter(function (e) { return e.sid === sid; }); }
// toptancıya borç: mal bedeli + toplam fiyatın içinde işaretli nakliye, ek gider ve boş palet
function shipTotal(s) { return linesOf(s.id).reduce(function (t, e) { return t + (e.total || 0); }, 0) + shipIn(s); }
function shipIn(s) {
  return (s.nakIn ? s.nak || 0 : 0) + (s.costs || []).reduce(function (t, c) { return t + (c.inc ? c.amount : 0); }, 0) + (s.depIn ? s.dep || 0 : 0);
}
// nakliye + ek giderler maliyete eklenir; toplamın içinde değilse giriş günü ayrıca ödenmiş sayılır
function shipExtra(s) { return (s.nak || 0) + (s.costs || []).reduce(function (t, c) { return t + c.amount; }, 0); }
function shipExtraOut(s) { return (s.nakIn ? 0 : s.nak || 0) + (s.costs || []).reduce(function (t, c) { return t + (c.inc ? 0 : c.amount); }, 0); }
function extraTxt(s) {
  return (s.nak ? [{ desc: 'Nakliye', amount: s.nak, inc: s.nakIn }] : []).concat(s.costs || [])
    .map(function (c) { return esc(c.desc) + ' ' + money(c.amount) + (c.inc ? ' (toplamın içinde)' : ''); }).join(' · ');
}
// ek gider tutarı çeşitlere koli sayısına göre dağıtılır
function extraShares(lines, amount) {
  return amount > 0 ? spread(lines.map(function (l) { return { koli: l.koli, total: null }; }), amount).lines.map(function (x) { return x.total; }) : lines.map(function () { return 0; });
}
// boş palet parası: paletler geri verilince iade edilir, maliyete girmez; toplamın içindeyse toptancı borcunda, değilse giriş günü ödenmiş.
// Toptancısı olan girişlerin palet parası toptancının palet hesabından iade edilir (palLedger); burada sadece toptancısızlar
function depOpen(s) { return s.dep > 0 && !s.depBack && !s.sup; }
// boş palet satırları: "5 × Euro palet (250 ₺)"
function depLinesTxt(lines) { return (lines || []).map(function (l) { return fmt(l.n) + ' × ' + esc(l.name) + ' (' + money(l.price) + ')'; }).join(' · '); }
function shipPaid(s) { return s.pays.reduce(function (t, p) { return t + p.amount; }, 0); }
// toptancıya kalan borç; supId verilirse sadece o toptancının girişleri
function supDebt(supId) {
  return db.ships.reduce(function (t, s) { return supId != null && (s.sup || '') !== supId ? t : t + Math.max(0, shipTotal(s) - shipPaid(s)); }, 0);
}

/* ---------- toptancılar ---------- */
// toptancı: { id, name, note, pids: kendi ürün listesi, pals: boş palet çeşitleri {id, name, price}, rets: palet iadeleri }
function supOf(id) { return id ? byId(db.sups, id) || null : null; }
function supName(id) { var s = supOf(id); return s ? s.name : ''; }
function findSup(name) { var k = fold(name); return db.sups.filter(function (s) { return fold(s.name) === k; })[0] || null; }
function ensureSup(name) {
  var s = findSup(name);
  if (!s) { s = { id: 't' + uid(), ts: Date.now(), name: clean(name), note: '', pids: [], pals: [], rets: [] }; db.sups.push(s); }
  return s;
}
function supsSorted() { return db.sups.slice().sort(function (a, b) { return cmp(a.name, b.name); }); }
function supAddPid(sup, pid) { if (sup.pids.indexOf(pid) < 0) sup.pids.push(pid); }
function shipsOf(supId) { return db.ships.filter(function (s) { return (s.sup || '') === supId; }); }
// toptancının ürün listesi markalara göre (brands() gibi)
function supBrands(sup) {
  return brands().map(function (b) {
    return { name: b.name, ids: b.ids.filter(function (id) { return sup.pids.indexOf(id) >= 0; }) };
  }).filter(function (b) { return b.ids.length; });
}
function findPal(sup, name) { var k = fold(name); return sup.pals.filter(function (p) { return fold(p.name) === k; })[0] || null; }
function ensurePal(sup, name, price) {
  var p = findPal(sup, name);
  if (!p) { p = { id: 'b' + uid(), name: clean(name), price: price }; sup.pals.push(p); }
  return p;
}
// Toptancının palet hesabı: girişlerde ödenen boş palet parası ve paletler, iadelerde geri alınanlar.
// Çeşit başına alınan / iade edilen palet; para olarak ödenen, geri alınan ve bekleyen
function palLedger(sup) {
  var m = {}, order = [], R = { out: 0, back: 0 };
  function row(l) {
    var k = l.pal || 'n:' + fold(l.name);
    if (!m[k]) { m[k] = { name: l.name, out: 0, back: 0 }; order.push(k); }
    return m[k];
  }
  sup.pals.forEach(function (p) { row({ pal: p.id, name: p.name }).name = p.name; });
  shipsOf(sup.id).forEach(function (s) {
    if (!(s.dep > 0)) return;
    R.out += s.dep;
    if (s.depBack) R.back += s.dep; // toptancı eklenmeden önce girişten iade edilmiş
    (s.depLines || []).forEach(function (l) { row(l).out += l.n; });
  });
  sup.rets.forEach(function (r) {
    R.back += r.amount;
    r.lines.forEach(function (l) { row(l).back += l.n; });
  });
  R.rows = order.map(function (k) { return m[k]; }).filter(function (x, i) { return x.out || x.back || sup.pals.some(function (p) { return p.id === order[i]; }); });
  R.open = R.out - R.back;
  return R;
}
// iadesi beklenen palet parası: toptancısız girişler + toptancıların palet hesapları
function depWaiting() {
  var t = 0;
  db.ships.forEach(function (s) { if (depOpen(s)) t += s.dep; });
  db.sups.forEach(function (s) { t += palLedger(s).open; });
  return t;
}
function salesOf(pid) { return db.sales.filter(function (s) { return s.items.some(function (i) { return i.pid === pid; }); }); }
function soldOf(pid, skipId) {
  return db.sales.reduce(function (t, s) {
    return s.id === skipId ? t : t + s.items.reduce(function (a, i) { return i.pid === pid ? a + i.n : a; }, 0);
  }, 0);
}
function countsOf(pid) { return db.counts.filter(function (c) { return c.pid === pid; }); }
// Son sayım + sonrasında giren koli − sonrasında satılan koli (sayım yoksa en baştan).
// skipId: düzenlenen giriş ya da satış hesaba katılmaz
function stockOf(pid, skipId) {
  var c = lastEntry(countsOf(pid)), from = c ? entKey(c) : '', t = c ? c.koli : 0;
  entriesOf(pid).forEach(function (e) { if (e.id !== skipId && e.sid !== skipId && entKey(e) > from) t += e.koli; });
  db.sales.forEach(function (s) {
    if (s.id === skipId || entKey(s) <= from) return;
    s.items.forEach(function (i) { if (i.pid === pid) t -= i.n; });
  });
  return t;
}
function lastEntry(list) {
  return list.reduce(function (a, e) { return !a || entKey(e) > entKey(a) ? e : a; }, null);
}
// girişi, satışı ya da sayımı olan ürün (sadece toptancı listesinde duranlar değil)
function inUse(id) { return db.entries.some(function (e) { return e.pid === id; }) || salesOf(id).length > 0 || countsOf(id).length > 0; }
function onSupList(id) { return db.sups.some(function (s) { return s.pids.indexOf(id) >= 0; }); }
// Ne girişi ne satışı kalan ürünü sil (toptancı listesindeyse kalır); palet içi koliyi son girişten, fiyatı (yoksa) son satıştan al
function tidy() {
  Object.keys(db.products).forEach(function (id) {
    var p = db.products[id], l = lastEntry(entriesOf(id)), ss = salesOf(id);
    if (!l && !ss.length && !countsOf(id).length && !onSupList(id)) { delete db.products[id]; return; }
    var k = lastEntry(entriesOf(id).filter(function (e) { return e.kpp; }));
    if (k) p.kpp = k.kpp;
    if (p.price == null && ss.length) p.price = lastEntry(ss).items.filter(function (i) { return i.pid === id; })[0].price;
  });
}
function pname(pid) { var p = db.products[pid]; return p ? p.brand + ' ' + p.variety : '?'; }
// used: sadece girişi/satışı/sayımı olan ürünler (toptancı listesinde bekleyenler satışta ve stokta görünmesin)
function brands(used) {
  var m = {};
  Object.keys(db.products).forEach(function (id) {
    if (used && !inUse(id)) return;
    var p = db.products[id], k = fold(p.brand);
    (m[k] = m[k] || { name: p.brand, ids: [] }).ids.push(id);
  });
  return Object.keys(m).map(function (k) {
    m[k].ids.sort(function (x, y) { return cmp(db.products[x].variety, db.products[y].variety); });
    return m[k];
  }).sort(function (a, b) { return cmp(a.name, b.name); });
}
function palTxt(koli, kpp) {
  if (!kpp) return '';
  var p = koli / kpp;
  return (Number.isInteger(p) ? p : fmt(Math.floor(p * 10) / 10)) + ' palet';
}

/* ---------- satış: hesaplar ---------- */
function saleTotal(s) { return s.items.reduce(function (t, i) { return t + i.n * i.price; }, 0); }
function salePaid(s) { var t = saleTotal(s); return Math.min(s.paid == null ? t : s.paid, t); }
function saleOpen(s) { return saleTotal(s) - salePaid(s) > 0.004; }
// paranın alındığı günler: satış anında ödenen satış gününe, sonraki tahsilatlar kendi tarihine
function saleCollected(s) {
  var left = salePaid(s), cols = s.cols || [];
  var first = left - cols.reduce(function (t, x) { return t + x.amount; }, 0), out = [];
  if (first > 0.004) { out.push({ date: s.date, amount: first }); left -= first; }
  cols.forEach(function (x) { var a = Math.min(x.amount, left); if (a > 0.004) { out.push({ date: x.date, amount: a }); left -= a; } });
  return out;
}
function salesOn(date) { return db.sales.filter(function (s) { return s.date === date; }).sort(function (a, b) { return cmp(entKey(b), entKey(a)); }); }

// koli başı alış maliyeti: satış gününden önceki son stok girişinin fiyatı + nakliye/ek gider payı (öncesinde giriş yoksa ilk girişin)
function costTable() {
  var m = {};
  db.entries.forEach(function (e) { if (e.total != null && e.koli > 0) (m[e.pid] = m[e.pid] || []).push(e); });
  Object.keys(m).forEach(function (k) { m[k].sort(function (a, b) { return cmp(entKey(a), entKey(b)); }); });
  return m;
}
function unitCost(ct, pid, date) {
  var es = ct[pid]; if (!es) return null;
  var c = (es[0].total + (es[0].extra || 0)) / es[0].koli;
  es.forEach(function (e) { if (e.date <= date) c = (e.total + (e.extra || 0)) / e.koli; });
  return c;
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
