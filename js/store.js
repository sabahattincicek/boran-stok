'use strict';
/* kayıt: localStorage. Her şubenin kayıtları ayrı anahtarda durur; ilk şube eski anahtarı (boran.v1) kullanır */

var KEY = 'boran.v1', META = 'boran.meta', SUPS = 'boran.sups';
function emptyDb() { return { v: 1, products: {}, entries: [], ships: [], sales: [], counts: [], cash: [], sups: [] }; }
var db = emptyDb();
var acct = null; // açık şube: { id, name }

/* ---------- şubeler ---------- */
function accts() { var l = meta('accts'); return Array.isArray(l) && l.length ? l : [{ id: 'main', name: 'Şube 1' }]; }
function acctKey(id) { return id === 'main' ? KEY : KEY + '.' + id; }
// şubeye özel ayar (son yedek tarihi gibi); ilk şube eski adları kullanır
function ameta(k, v) { var mk = acct.id === 'main' ? k : k + '.' + acct.id; return arguments.length < 2 ? meta(mk) : meta(mk, v); }
function acctData(id) {
  try { return JSON.parse(localStorage.getItem(acctKey(id)) || 'null'); } catch (e) { return null; }
}
function addAcct(name) {
  var l = accts(), a = { id: 'a' + uid(), name: name };
  l.push(a); meta('accts', l);
  return a;
}
function renameAcct(id, name) {
  var l = accts(); l.forEach(function (a) { if (a.id === id) a.name = name; });
  meta('accts', l);
  if (acct && acct.id === id) acct.name = name;
}
function deleteAcct(id) {
  var l = accts().filter(function (a) { return a.id !== id; });
  if (!l.length) return;
  meta('accts', l);
  try { localStorage.removeItem(acctKey(id)); } catch (e) {}
}

function load() {
  var l = accts();
  acct = byId(l, meta('acct')) || l[0];
  if (!sharedSups()) shareSups();
  db = emptyDb();
  var j = acctData(acct.id);
  if (j && j.products && Array.isArray(j.entries)) {
    db = j;
    ['sales', 'counts', 'cash', 'ships', 'sups'].forEach(function (k) { db[k] = db[k] || []; });
  }
  joinSups();
  migrate();
}
// Eski tek ürünlü girişler kendi girişine (sevkiyatına) taşınır; ödenen tutar giriş günü yapılmış ödeme sayılır
function migrate() {
  var n = 0;
  db.entries.forEach(function (e) {
    // eski girişlerde koli palet × palette koli'den hesaplanıyordu
    if (e.koli == null) { e.koli = e.palet * e.kpp; n++; }
    if (e.sid) return;
    n++;
    var s = { id: 'h' + uid(), ts: e.ts, date: e.date, time: e.time || '', note: e.note || '', pays: [] };
    if (e.paid > 0) s.pays.push({ id: 'o' + uid(), ts: e.ts, date: e.date, amount: e.paid });
    db.ships.push(s); e.sid = s.id; delete e.paid; delete e.note;
  });
  // toptancı hesabı: ödemeler toptancıda
  db.sups.forEach(function (t) {
    ['pays', 'backs', 'refs'].forEach(function (k) { if (!t[k]) { t[k] = []; n++; } });
    // en eski kayıt: tek satırda hem palet hem para
    (t.rets || []).forEach(function (r) {
      if (r.lines.length) (t.gives = t.gives || []).push({ id: 'v' + r.id, ts: r.ts, date: r.date, lines: r.lines, note: r.note });
      if (r.amount > 0) t.refs.push({ id: 'i' + r.id, ts: r.ts, date: r.date, amount: r.amount, note: r.note });
    });
    if (t.rets) { delete t.rets; n++; }
  });
  db.ships.forEach(function (s) {
    var t = supOf(s.sup);
    if (t && s.pays.length) { t.pays = t.pays.concat(s.pays); s.pays = []; n++; }
  });
  n += simplifyPal();
  if (n) persist();
}
// Palet sadeleşti: çeşitler kalktı, "palet verdim" kayıtları palet iadesi oldu (tutarı ortalama palet fiyatından, borçtan düşer)
function simplifyPal() {
  var n = 0;
  db.sups.forEach(function (t) {
    if (t.pals) { delete t.pals; n++; }
    if (!t.gives) return;
    var cnt = 0, sum = 0;
    shipsOf(t.id).forEach(function (s) {
      var k = (s.depLines || []).reduce(function (a, l) { return a + l.n; }, 0) || shipPals(s);
      if (s.dep > 0 && k) { cnt += k; sum += s.dep; }
    });
    t.gives.forEach(function (g) {
      var q = g.lines.reduce(function (a, l) { return a + l.n; }, 0);
      t.backs.push({ id: 'd' + g.id, ts: g.ts, date: g.date, n: q, amount: cnt ? Math.round(q * sum / cnt * 100) / 100 : 0, note: g.note || '' });
    });
    delete t.gives; n++;
  });
  db.ships.forEach(function (s) {
    ['depLines', 'depPer', 'depPerIn'].forEach(function (k) { if (k in s) { delete s[k]; n++; } });
  });
  return n;
}
function persist() {
  var full = db.sups, ok = true;
  try {
    localStorage.setItem(SUPS, JSON.stringify(full.map(function (t) { return supShared(t, db.products); })));
    db.sups = full.map(supLocal);
    localStorage.setItem(acctKey(acct.id), JSON.stringify(db));
  } catch (e) { toast('Kaydedilemedi! Tarayıcı hafızası kapalı ya da dolu.'); ok = false; }
  db.sups = full;
  return ok;
}

/* ---------- toptancılar bütün şubelerde ortak ----------
   boran.sups: [{id, ts, name, note, prods: [[marka, çeşit]]}] (ürünler adıyla, çünkü her şubenin ürün kimlikleri ayrı).
   Hesap hareketleri şubenin kaydında kalır: db.sups = [{id, pays, backs, refs}]. Açık şubede db.sups ikisinin birleşimi */
var SUP_SHARED = ['ts', 'name', 'note', 'pids'];
function sharedSups() {
  try { var l = JSON.parse(localStorage.getItem(SUPS) || 'null'); return Array.isArray(l) ? l : null; } catch (e) { return null; }
}
function supShared(t, products) {
  return {
    id: t.id, ts: t.ts, name: t.name, note: t.note || '',
    prods: t.pids.map(function (id) { return products[id]; }).filter(Boolean).map(function (p) { return [p.brand, p.variety]; })
  };
}
function supLocal(t) {
  var o = {};
  Object.keys(t).forEach(function (k) { if (SUP_SHARED.indexOf(k) < 0) o[k] = t[k]; });
  return o;
}
// ortak listeyi şubenin hareketleriyle birleştir; listedeki ürünler bu şubede yoksa eklenir (girişi olmadıkça görünmez)
function joinSups() {
  var loc = db.sups;
  db.sups = (sharedSups() || []).map(function (s) {
    var t = supLocal(byId(loc, s.id) || {});
    t.id = s.id; t.ts = s.ts; t.name = s.name; t.note = s.note || '';
    ['pays', 'backs', 'refs'].forEach(function (k) { t[k] = t[k] || []; });
    t.pids = [];
    s.prods.forEach(function (p) { supAddPid(t, ensureProduct(p[0], p[1])); });
    return t;
  });
}
// Bir kez: şubelerdeki ayrı toptancılar ortak listeye taşınır. Aynı adlı toptancılar birleşir
function shareSups() {
  var out = [], datas = [];
  accts().forEach(function (a) {
    var d = acctData(a.id);
    if (!d || !Array.isArray(d.sups) || !d.sups.length) return;
    datas.push({ id: a.id, d: d });
    d.sups.forEach(function (t, i) {
      if (!t.name) return;
      var sh = supShared({ id: t.id, ts: t.ts, name: t.name, note: t.note, pids: t.pids || [] }, d.products || {});
      var s = byId(out, t.id) || out.filter(function (x) { return fold(x.name) === fold(t.name); })[0];
      if (!s) out.push(s = sh);
      else {
        if (s.id !== t.id) (d.ships || []).forEach(function (h) { if (h.sup === t.id) h.sup = s.id; });
        if (!s.note && sh.note) s.note = sh.note;
        sh.prods.forEach(function (p) { if (!s.prods.some(function (q) { return pkey(q[0], q[1]) === pkey(p[0], p[1]); })) s.prods.push(p); });
      }
      var l = supLocal(t); l.id = s.id;
      d.sups[i] = l;
    });
  });
  try {
    localStorage.setItem(SUPS, JSON.stringify(out));
    datas.forEach(function (x) { localStorage.setItem(acctKey(x.id), JSON.stringify(x.d)); });
  } catch (e) {}
}
// toptancının başka bir şubede girişi ya da hesap hareketi varsa o şubenin adı
function supUsedIn(id) {
  var a = accts().filter(function (a) {
    if (a.id === acct.id) return false;
    var d = acctData(a.id) || {};
    return (d.ships || []).some(function (s) { return s.sup === id; })
      || (d.sups || []).some(function (t) { return t.id === id && ((t.pays || []).length + (t.backs || []).length + (t.gives || []).length + (t.refs || []).length + (t.rets || []).length) > 0; });
  })[0];
  return a ? a.name : '';
}
function meta(k, v) {
  var m = {};
  try { m = JSON.parse(localStorage.getItem(META) || '{}') || {}; } catch (e) {}
  if (arguments.length < 2) return m[k];
  m[k] = v;
  try { localStorage.setItem(META, JSON.stringify(m)); } catch (e) {}
}
