'use strict';
/* kayıt: localStorage. Her şubenin kayıtları ayrı anahtarda durur; ilk şube eski anahtarı (boran.v1) kullanır */

var KEY = 'boran.v1', META = 'boran.meta';
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
  db = emptyDb();
  var j = acctData(acct.id);
  if (j && j.products && Array.isArray(j.entries)) {
    db = j;
    ['sales', 'counts', 'cash', 'ships', 'sups'].forEach(function (k) { db[k] = db[k] || []; });
  }
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
  if (n) persist();
}
function persist() {
  try { localStorage.setItem(acctKey(acct.id), JSON.stringify(db)); return true; }
  catch (e) { toast('Kaydedilemedi! Tarayıcı hafızası kapalı ya da dolu.'); return false; }
}
function meta(k, v) {
  var m = {};
  try { m = JSON.parse(localStorage.getItem(META) || '{}') || {}; } catch (e) {}
  if (arguments.length < 2) return m[k];
  m[k] = v;
  try { localStorage.setItem(META, JSON.stringify(m)); } catch (e) {}
}
