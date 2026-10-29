(function () {
'use strict';
var KEY = 'boran.v1', META = 'boran.meta';
var db = { v: 1, products: {}, entries: [], ships: [], sales: [], counts: [], cash: [] };
var $ = function (id) { return document.getElementById(id); };

/* ---------- yardımcılar ---------- */
function pad2(n) { return ('0' + n).slice(-2); }
function isoOf(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function today() { return isoOf(new Date()); }
function shiftDay(iso, n) { var p = iso.split('-'); return isoOf(new Date(+p[0], p[1] - 1, +p[2] + n)); }
function nowHM() { var d = new Date(); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
function dateTR(iso) { if (!iso) return ''; var p = iso.split('-'); return p[2] + '.' + p[1] + '.' + p[0]; }
function weekday(iso) { var p = iso.split('-'); return new Date(+p[0], p[1] - 1, +p[2]).toLocaleDateString('tr-TR', { weekday: 'long' }); }
function ago(iso) {
  var p = iso.split('-'), t = today().split('-');
  var d = Math.round((new Date(+t[0], t[1] - 1, +t[2]) - new Date(+p[0], p[1] - 1, +p[2])) / 864e5);
  return d === 0 ? 'bugün' : d === 1 ? 'dün' : d > 1 ? d + ' gün önce' : '';
}
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
// "18.000" -> 18000, "12,5" -> 12.5
function num(raw) {
  raw = String(raw == null ? '' : raw).replace(/\s|₺|tl/gi, '');
  if (!raw) return null;
  if (raw.indexOf(',') >= 0) raw = raw.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(raw)) raw = raw.replace(/\./g, '');
  var v = Number(raw);
  return isFinite(v) && v >= 0 ? v : null;
}
function fmt(v) { return (Math.round(v * 100) / 100).toLocaleString('tr-TR', { maximumFractionDigits: 2 }); }
function money(v) { return fmt(v) + ' ₺'; }
// kutulara ve yedeğe yazılan sade sayı: 1250,5
function amt(v) { return String(Math.round(v * 100) / 100).replace('.', ','); }
// Eşleştirme için: büyük/küçük harf, Türkçe karakter, "0,5"/"0.5", "5.0"/"5", "1.5 lt"/"1.5" aynı sayılır
function fold(s) {
  return String(s).replace(/[İI]/g, 'i').toLowerCase()
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/â/g, 'a')
    .replace(/(\d),(\d)/g, '$1.$2').replace(/(\d+)\.0+\b/g, '$1').replace(/(\d)\s*(lt|litre|l)\b/g, '$1')
    .replace(/\s+/g, ' ').trim();
}
function clean(s) { return String(s).replace(/\s+/g, ' ').trim(); }
function pkey(b, v) { return fold(b) + '|' + fold(v); }
function cmp(a, b) { return a.localeCompare(b, 'tr', { numeric: true, sensitivity: 'base' }); }
function entKey(e) { return e.date + ' ' + (e.time || '') + ' ' + e.ts; }
function byId(list, id) { return list.filter(function (x) { return x.id === id; })[0]; }

/* ---------- kayıt ---------- */
function load() {
  try {
    var j = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (j && j.products && Array.isArray(j.entries)) { db = j; db.sales = db.sales || []; db.counts = db.counts || []; db.cash = db.cash || []; db.ships = db.ships || []; }
  } catch (e) {}
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
  try { localStorage.setItem(KEY, JSON.stringify(db)); return true; }
  catch (e) { toast('Kaydedilemedi! Tarayıcı hafızası kapalı ya da dolu.'); return false; }
}
function meta(k, v) {
  var m = {};
  try { m = JSON.parse(localStorage.getItem(META) || '{}') || {}; } catch (e) {}
  if (arguments.length < 2) return m[k];
  m[k] = v;
  try { localStorage.setItem(META, JSON.stringify(m)); } catch (e) {}
}

/* ---------- ürünler ---------- */
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
function shipTotal(s) { return linesOf(s.id).reduce(function (t, e) { return t + (e.total || 0); }, 0); }
// nakliye + ek giderler: toptancı borcuna girmez, giriş günü ödenmiş sayılır, maliyete eklenir
function shipExtra(s) { return (s.nak || 0) + (s.costs || []).reduce(function (t, c) { return t + c.amount; }, 0); }
function extraTxt(s) {
  return (s.nak ? [{ desc: 'Nakliye', amount: s.nak }] : []).concat(s.costs || []).map(function (c) { return esc(c.desc) + ' ' + money(c.amount); }).join(' · ');
}
// ek gider tutarı çeşitlere koli sayısına göre dağıtılır
function extraShares(lines, amount) {
  return amount > 0 ? spread(lines.map(function (l) { return { koli: l.koli, total: null }; }), amount).lines.map(function (x) { return x.total; }) : lines.map(function () { return 0; });
}
function shipPaid(s) { return s.pays.reduce(function (t, p) { return t + p.amount; }, 0); }
function supDebt() { return db.ships.reduce(function (t, s) { return t + Math.max(0, shipTotal(s) - shipPaid(s)); }, 0); }
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
// Ne girişi ne satışı kalan ürünü sil; palet içi koliyi son girişten, fiyatı (yoksa) son satıştan al
function tidy() {
  Object.keys(db.products).forEach(function (id) {
    var p = db.products[id], l = lastEntry(entriesOf(id)), ss = salesOf(id);
    if (!l && !ss.length && !countsOf(id).length) { delete db.products[id]; return; }
    var k = lastEntry(entriesOf(id).filter(function (e) { return e.kpp; }));
    if (k) p.kpp = k.kpp;
    if (p.price == null && ss.length) p.price = lastEntry(ss).items.filter(function (i) { return i.pid === id; })[0].price;
  });
}
function pname(pid) { var p = db.products[pid]; return p ? p.brand + ' ' + p.variety : '?'; }
function brands() {
  var m = {};
  Object.keys(db.products).forEach(function (id) {
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

/* ---------- satış sayfası: günün listesi ---------- */
var view = today();
function renderSalesDay() {
  $('vDate').value = view;
  $('vDay').textContent = (view === today() ? 'Bugün, ' : '') + weekday(view);
  var list = salesOn(view), tot = 0, paid = 0;
  list.forEach(function (s) { tot += saleTotal(s); paid += salePaid(s); });
  $('dSum').innerHTML = list.length
    ? '<span><b>' + list.length + '</b> satış</span><span>Toplam <b>' + money(tot) + '</b></span><span>Alınan <b>' + money(paid) + '</b></span>'
      + (tot - paid > 0.004 ? '<span class="rem">Alacak <b>' + money(tot - paid) + '</b></span>' : '')
    : '';
  $('sList').innerHTML = list.length ? list.map(saleHTML).join('') : '<div class="empty">Bu gün satış yok.</div>';
}
function saleHTML(s) {
  var t = saleTotal(s), p = salePaid(s), open = saleOpen(s), cols = s.cols || [], last = cols[cols.length - 1];
  return '<div class="sale' + (open ? ' no' : '') + (sEdit === s.id ? ' editing' : '') + '">'
    + '<div class="sh"><span class="tm">' + esc(s.time || '--:--') + '</span><span class="pm">' + (s.pay === 'havale' ? 'Havale' : 'Nakit') + '</span><b>' + money(t) + '</b></div>'
    + '<ul class="its">' + s.items.map(function (i) {
      return '<li><span>' + fmt(i.n) + ' × ' + esc(pname(i.pid)) + '</span><span>' + fmt(i.price) + ' → ' + money(i.n * i.price) + '</span></li>';
    }).join('') + '</ul>'
    + '<div class="ps">' + (open ? (p > 0 ? 'Ödenen ' + money(p) + ' · kalan ' + money(t - p) : 'Ödenmedi · ' + money(t) + ' alacak') : 'Ödendi' + (last ? ' · ' + dateTR(last.date) : '')) + '</div>'
    + (cols.length ? '<ul class="cols">' + cols.map(function (x) { return '<li><span>' + dateTR(x.date) + ' tahsilat</span><span>' + money(x.amount) + '</span></li>'; }).join('') + '</ul>' : '')
    + (s.note ? '<div class="note">' + esc(s.note) + '</div>' : '')
    + (open ? '<div class="colf"><label class="pr"><input data-camt inputmode="decimal" autocomplete="off" value="' + amt(t - p) + '" aria-label="Ödenen tutar">₺</label>'
      + '<input type="date" data-cdate value="' + today() + '" aria-label="Ödeme tarihi">'
      + '<button type="button" class="paidbtn" data-spaid="' + s.id + '">Ödendi</button></div>' : '')
    + '<div class="acts">'
    + '<button type="button" data-sedit="' + s.id + '">Düzenle</button>'
    + '<button type="button" class="danger" data-sdel="' + s.id + '">Sil</button></div>'
    + '</div>';
}

/* ---------- satış sayfası: form ---------- */
var sEdit = null, sQty = {}, sPrice = {}, sPay = 'nakit', sOpen = {}, timeTouched = false;
function priceOf(pid) { return sPrice[pid] !== undefined ? num(sPrice[pid]) : db.products[pid].price; }
function renderSaleForm() {
  var bs = brands();
  if (!bs.length) { $('sBrands').innerHTML = '<div class="empty">Önce Stok sayfasından ürün girişi yap.</div>'; updateSaleCalc(); return; }
  $('sBrands').innerHTML = bs.map(function (b) {
    var bk = fold(b.name);
    return '<details class="bsel" data-brand="' + esc(bk) + '"' + (sOpen[bk] ? ' open' : '') + '><summary>' + esc(b.name) + '<span class="c"></span></summary>'
      + b.ids.map(function (id) {
        var p = db.products[id], pr = sPrice[id] !== undefined ? sPrice[id] : (p.price != null ? amt(p.price) : '');
        return '<div class="srow" data-row="' + id + '">'
          + '<div class="nm"><b>' + esc(p.variety) + '</b><small data-stk="' + id + '"></small></div>'
          + '<div class="step"><button type="button" data-sstep="-1" data-pid="' + id + '" aria-label="' + esc(pname(id)) + ' azalt">−</button>'
          + '<input data-q="' + id + '" inputmode="numeric" pattern="[0-9]*" autocomplete="off" placeholder="0" value="' + (sQty[id] || '') + '" aria-label="' + esc(pname(id)) + ' adet">'
          + '<button type="button" data-sstep="1" data-pid="' + id + '" aria-label="' + esc(pname(id)) + ' artır">+</button></div>'
          + '<label class="pr"><input data-p="' + id + '" inputmode="decimal" autocomplete="off" placeholder="fiyat" value="' + esc(pr) + '" aria-label="' + esc(pname(id)) + ' koli fiyatı">₺</label>'
          + '<span class="lt" data-lt="' + id + '"></span></div>';
      }).join('') + '</details>';
  }).join('');
  updateSaleCalc();
}
function readSaleItems() {
  var items = [];
  brands().forEach(function (b) { b.ids.forEach(function (id) { if (sQty[id] > 0) items.push({ pid: id, n: sQty[id], price: priceOf(id) }); }); });
  return items;
}
function updateSaleCalc() {
  var total = 0;
  document.querySelectorAll('#sBrands [data-row]').forEach(function (row) {
    var id = row.dataset.row, n = sQty[id] || 0, pr = priceOf(id), left = stockOf(id, sEdit) - n;
    row.classList.toggle('on', n > 0);
    row.querySelector('[data-lt]').textContent = n > 0 && pr != null ? money(n * pr) : '';
    var st = row.querySelector('[data-stk]');
    st.textContent = 'stokta ' + fmt(left) + ' koli';
    st.classList.toggle('neg', left < 0);
    if (n > 0 && pr != null) total += n * pr;
  });
  document.querySelectorAll('#sBrands details').forEach(function (d) {
    var c = 0;
    d.querySelectorAll('[data-row]').forEach(function (r) { c += sQty[r.dataset.row] || 0; });
    d.querySelector('.c').textContent = c ? c + ' koli seçili' : '';
  });
  $('sTot').textContent = money(total);
  $('sPaid').placeholder = 'Boşsa tamamı' + (total ? ': ' + money(total) : '');
  $('sSave').textContent = sEdit ? 'Değişikliği kaydet' : 'Kaydet';
}
function markPast() {
  var past = $('sDate').value && $('sDate').value !== today();
  $('sDate').classList.toggle('past', !!past);
  $('sDateL').textContent = past ? 'Tarih (bugün değil!)' : 'Tarih';
}
function setPay(v) {
  sPay = v;
  document.querySelectorAll('#sPay button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.pay === v)); });
}
function resetSaleForm() {
  sEdit = null; sQty = {}; sPrice = {}; timeTouched = false;
  setPay('nakit');
  $('sPaid').value = ''; $('sNote').value = ''; $('sErr').textContent = '';
  $('sDate').value = view; $('sTime').value = nowHM();
  $('sEditBar').hidden = true;
  markPast(); renderSaleForm();
}
function startSaleEdit(id) {
  var s = byId(db.sales, id); if (!s) return;
  sEdit = id; sQty = {}; sPrice = {}; sOpen = {};
  s.items.forEach(function (i) {
    sQty[i.pid] = (sQty[i.pid] || 0) + i.n; sPrice[i.pid] = amt(i.price);
    sOpen[fold(db.products[i.pid].brand)] = true;
  });
  setPay(s.pay || 'nakit');
  var t = saleTotal(s);
  $('sPaid').value = s.paid != null && s.paid < t ? amt(s.paid) : '';
  $('sNote').value = s.note || '';
  $('sDate').value = s.date; $('sTime').value = s.time || ''; timeTouched = true; markPast();
  $('sErr').textContent = '';
  $('sEditTxt').textContent = dateTR(s.date) + ' ' + (s.time || '') + ' satışını düzenliyorsun';
  $('sEditBar').hidden = false;
  renderSalesDay(); renderSaleForm();
  $('sForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function saveSale() {
  var items = readSaleItems(), err = '';
  var noPrice = items.filter(function (i) { return i.price == null; })[0];
  var total = items.reduce(function (t, i) { return t + (i.price || 0) * i.n; }, 0);
  var paidRaw = $('sPaid').value.trim(), paid = paidRaw ? num(paidRaw) : total;
  var date = $('sDate').value;
  var time = $('sTime').value || nowHM();
  if (!sEdit && !timeTouched && date === today()) time = nowHM(); // form açık bekledi ise saati şimdiye çek
  if (!items.length) err = 'En az bir ürünün adedini gir.';
  else if (noPrice) err = pname(noPrice.pid) + ' için fiyat yaz.';
  else if (paid == null) err = 'Ödenen tutarı sayı olarak yaz, ör. 150.';
  else if (paid > total + 0.004) err = 'Ödenen, satış toplamından (' + money(total) + ') fazla olamaz.';
  else if (!date) err = 'Tarihi seç.';
  if (err) { $('sErr').textContent = err; return; }

  var s = sEdit && byId(db.sales, sEdit), isNew = !s;
  if (isNew) { s = { id: 's' + uid(), ts: Date.now() }; db.sales.push(s); }
  s.date = date; s.time = time; s.items = items; s.pay = sPay; s.paid = paid;
  s.note = $('sNote').value.split('\n').map(clean).filter(Boolean).join('\n');
  // yeni satışta girilen fiyat, o ürünün bir sonraki varsayılanı olur
  if (isNew) items.forEach(function (i) { db.products[i.pid].price = i.price; });
  if (!persist()) return;
  view = date;
  resetSaleForm(); renderAll();
  toast((isNew ? 'Satış kaydedildi' : 'Satış güncellendi') + ' · ' + money(total) + (paid < total ? ' · kalan ' + money(total - paid) : ''));
}
// satış kartındaki kutudan: girilen tutar (varsayılan kalanın tamamı) o tarihte tahsil edilir
function markPaid(id, btn) {
  var s = byId(db.sales, id); if (!s) return;
  var box = btn.closest('.colf'), raw = box.querySelector('[data-camt]').value.trim(), a = num(raw), d = box.querySelector('[data-cdate]').value;
  var rem = saleTotal(s) - salePaid(s);
  var err = !raw ? 'Ödenen tutarı yaz.' : a == null || a <= 0 ? 'Tutarı sayı olarak yaz, ör. 150.' : a > rem + 0.004 ? 'Kalan alacaktan (' + money(rem) + ') fazla olamaz.' : !d ? 'Ödeme tarihini seç.' : '';
  if (err) { toast(err); return; }
  s.paid = salePaid(s) + a;
  (s.cols = s.cols || []).push({ date: d, amount: a });
  if (!$('p-kayit').hidden) rKeep[id] = true; // borçlu listesinden yenileyene kadar düşmesin
  if (!persist()) return;
  renderAll();
  toast(money(a) + ' tahsil edildi · ' + (rem - a > 0.004 ? 'kalan ' + money(rem - a) : 'satış ödendi'));
}
function deleteSale(id) {
  db.sales = db.sales.filter(function (s) { return s.id !== id; });
  tidy(); persist();
  if (sEdit === id) resetSaleForm();
  renderAll(); toast('Satış silindi.');
}

/* ---------- kayıtlar ---------- */
var rPer = 'ay', rPay = '', rLimit = 40, rKeep = {};
function period(per) {
  var t = today(), m = t.slice(0, 7);
  per = per || rPer;
  if (per === 'bugun') return { from: t, to: t, txt: dateTR(t) };
  if (per === '7') return { from: shiftDay(t, -6), to: t, txt: dateTR(shiftDay(t, -6)) + ' – ' + dateTR(t) };
  if (per === 'ay') return { from: m + '-01', to: m + '-31', txt: new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }) };
  if (per === 'gecen') { var last = shiftDay(m + '-01', -1); return { from: last.slice(0, 7) + '-01', to: last, txt: dateTR(last.slice(0, 7) + '-01') + ' – ' + dateTR(last) }; }
  return { from: '', to: '', txt: 'Tüm kayıtlar' };
}
function inPer(d, p) { return (!p.from || d >= p.from) && (!p.to || d <= p.to); }
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
function sm(v) { return (v < -0.004 ? '−' : '') + money(Math.abs(v)); }
function kpi(label, val, small, cls) {
  return '<div class="kpi' + (cls ? ' ' + cls : '') + '"><span>' + label + '</span><b>' + val + '</b>' + (small ? '<small>' + small + '</small>' : '') + '</div>';
}
function renderRecords() {
  var p = period(), ct = costTable();
  $('rPerTxt').textContent = p.txt;
  var S = { n: 0, koli: 0, ciro: 0, rem: 0, paid: 0, nakit: 0, havale: 0, cost: 0, knownRev: 0, unkRev: 0, unkKoli: 0 }, prod = {};
  db.sales.forEach(function (s) {
    // tahsilat, satış tarihine değil paranın alındığı tarihe göre sayılır
    saleCollected(s).forEach(function (x) { if (inPer(x.date, p)) { S.paid += x.amount; S[s.pay === 'havale' ? 'havale' : 'nakit'] += x.amount; } });
    if (!inPer(s.date, p)) return;
    S.n++; S.ciro += saleTotal(s); S.rem += saleTotal(s) - salePaid(s);
    s.items.forEach(function (i) {
      var r = i.n * i.price, c = unitCost(ct, i.pid, s.date), o = prod[i.pid] = prod[i.pid] || { koli: 0, ciro: 0, cost: 0, unk: 0 };
      S.koli += i.n; o.koli += i.n; o.ciro += r;
      if (c == null) { S.unkRev += r; S.unkKoli += i.n; o.unk += r; }
      else { S.cost += c * i.n; S.knownRev += r; o.cost += c * i.n; }
    });
  });
  var inc = 0, out = 0, buy = 0, supPaid = 0, extra = 0;
  db.cash.forEach(function (x) { if (inPer(x.date, p)) { if (x.kind === 'gelir') inc += x.amount; else out += x.amount; } });
  db.entries.forEach(function (e) { if (inPer(e.date, p) && e.total != null) buy += e.total; });
  db.ships.forEach(function (s) {
    s.pays.forEach(function (x) { if (inPer(x.date, p)) supPaid += x.amount; });
    if (inPer(s.date, p)) extra += shipExtra(s);
  });
  var gross = S.knownRev - S.cost, net = gross + inc - out, flow = S.paid + inc - out - supPaid - extra, rem = S.rem;
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
    + kpi('Kasa hareketi', sm(flow), 'tahsilat + ek gelir − gider − toptancıya ödenen' + (extra ? ' − nakliye/ek gider' : ''), 'wide ' + (flow < 0 ? 'bad' : 'ok'));

  // ürün tablosu
  var rows = '', T = { koli: 0, ciro: 0, prof: 0, unk: false };
  brands().forEach(function (b) {
    var ids = b.ids.filter(function (id) { return prod[id]; });
    if (!ids.length) return;
    rows += '<tr class="g"><td colspan="4">' + esc(b.name) + '</td></tr>';
    ids.forEach(function (id) {
      var o = prod[id], known = o.ciro - o.unk, pr = known - o.cost;
      T.koli += o.koli; T.ciro += o.ciro;
      if (o.unk) T.unk = true;
      if (known) T.prof += pr;
      rows += '<tr><td>' + esc(db.products[id].variety) + '</td><td>' + fmt(o.koli) + '</td><td>' + money(o.ciro) + '</td>'
        + (known ? '<td' + (pr < 0 ? ' class="neg"' : '') + '>' + sm(pr) + (o.unk ? '*' : '') + '</td>' : '<td class="unk">?</td>') + '</tr>';
    });
  });
  $('rProd').innerHTML = rows
    ? '<table><thead><tr><th>Ürün</th><th>Koli</th><th>Ciro</th><th>Kâr</th></tr></thead><tbody>' + rows + '</tbody>'
      + '<tfoot><tr><td>Toplam</td><td>' + fmt(T.koli) + '</td><td>' + money(T.ciro) + '</td><td' + (T.prof < 0 ? ' class="neg"' : '') + '>' + sm(T.prof) + '</td></tr></tfoot></table>'
      + (T.unk ? '<p class="hint" style="padding:8px 10px">? ve *: alış fiyatı bilinmeyen satışlar kâra katılmadı. O ürüne stok girişi (fiyatlı) yapınca hesaplanır.</p>' : '')
    : '<div class="empty" style="border:0">Bu dönemde satış yok.</div>';

  // genel durum
  var allRem = 0, nOpen = 0, allCiro = 0, debt = 0, val = 0, valKoli = 0, valUnk = 0;
  db.sales.forEach(function (s) { var t = saleTotal(s); allCiro += t; if (saleOpen(s)) { nOpen++; allRem += t - salePaid(s); } });
  debt = supDebt();
  Object.keys(db.products).forEach(function (id) {
    var q = Math.max(0, stockOf(id)), c = unitCost(ct, id, today());
    if (!q) return;
    if (c == null) valUnk += q; else { val += q * c; valKoli += q; }
  });
  $('rGen').innerHTML =
    kpi('Müşterilerden alacak', money(allRem), nOpen + ' satış ödenmedi', allRem > 0.004 ? 'bad' : 'ok')
    + kpi('Toptancıya borç', money(debt), '', debt > 0.004 ? 'bad' : '')
    + kpi('Elimdeki stok değeri', money(val), fmt(valKoli) + ' koli, alış fiyatıyla' + (valUnk ? ' · ' + fmt(valUnk) + ' koli fiyatsız' : ''))
    + kpi('Toplam ciro', money(allCiro), db.sales.length + ' satış');

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
  var tot = 0, rem = 0;
  list.forEach(function (s) { tot += saleTotal(s); rem += saleTotal(s) - salePaid(s); });
  $('rCount').textContent = list.length ? list.length + ' satış · ' + money(tot) + (rem > 0.004 ? ' · alacak ' + money(rem) : '') : '';
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

/* ---------- gelir-gider ---------- */
var cEdit = null, cTimeTouched = false, cPer = 'ay', cLimit = 40;
function cashSign(x) { return x.kind === 'gelir' ? x.amount : -x.amount; }
function renderCash() {
  var p = period(cPer), inc = 0, out = 0;
  var list = db.cash.filter(function (x) { return inPer(x.date, p); }).sort(function (a, b) { return cmp(entKey(b), entKey(a)); });
  list.forEach(function (x) { if (x.kind === 'gelir') inc += x.amount; else out += x.amount; });
  var net = inc - out;
  $('cPerTxt').textContent = p.txt;
  $('cKpis').innerHTML =
    '<div class="kpi ok"><span>Gelir</span><b>' + money(inc) + '</b></div>'
    + '<div class="kpi bad"><span>Gider</span><b>' + money(out) + '</b></div>'
    + '<div class="kpi wide ' + (net < 0 ? 'bad' : 'ok') + '"><span>Net (gelir − gider)</span><b>' + (net < 0 ? '−' : '') + money(Math.abs(net)) + '</b></div>';
  var shown = list.slice(0, cLimit);
  $('cMore').hidden = list.length <= cLimit;
  $('cMore').textContent = 'Daha fazla göster (' + (list.length - cLimit) + ' kayıt daha)';
  if (!shown.length) { $('cList').innerHTML = '<div class="empty">' + (db.cash.length ? 'Bu dönemde kayıt yok.' : 'Henüz gelir ya da gider yok.') + '</div>'; return; }
  var h = '', day = null;
  shown.forEach(function (x) {
    if (x.date !== day) {
      day = x.date;
      var dn = shown.reduce(function (t, y) { return y.date === day ? t + cashSign(y) : t; }, 0);
      h += '<div class="dayh"><b>' + dateTR(day) + ' ' + weekday(day) + '</b><span>' + (dn < 0 ? '−' : '+') + money(Math.abs(dn)) + '</span></div>';
    }
    h += cashHTML(x);
  });
  $('cList').innerHTML = h;
}
function cashHTML(x) {
  var gelir = x.kind === 'gelir';
  return '<div class="cash' + (gelir ? '' : ' out') + (cEdit === x.id ? ' editing' : '') + '">'
    + '<div class="sh"><span class="tm">' + esc(x.time || '--:--') + '</span><span class="k">' + (gelir ? 'Gelir' : 'Gider') + '</span><b>' + (gelir ? '+' : '−') + money(x.amount) + '</b></div>'
    + '<div class="ds">' + esc(x.desc) + '</div>'
    + (x.note ? '<div class="note">' + esc(x.note) + '</div>' : '')
    + '<div class="acts"><button type="button" data-cedit="' + x.id + '">Düzenle</button>'
    + '<button type="button" class="danger" data-cxdel="' + x.id + '">Sil</button></div></div>';
}
function cMarkPast() {
  var past = $('cDate').value && $('cDate').value !== today();
  $('cDate').classList.toggle('past', !!past);
  $('cDateL').textContent = past ? 'Tarih (bugün değil!)' : 'Tarih';
}
function resetCash() {
  cEdit = null; cTimeTouched = false;
  $('cDesc').value = ''; $('cNote').value = ''; $('cAmt').value = ''; $('cErr').textContent = '';
  $('cDate').value = today(); $('cTime').value = nowHM();
  $('cEditBar').hidden = true;
  $('cGider').textContent = 'Gider kaydet'; $('cGelir').textContent = 'Gelir kaydet';
  cMarkPast();
}
function startCashEdit(id) {
  var x = byId(db.cash, id); if (!x) return;
  cEdit = id; cTimeTouched = true;
  $('cDesc').value = x.desc; $('cNote').value = x.note || ''; $('cAmt').value = amt(x.amount);
  $('cDate').value = x.date; $('cTime').value = x.time || ''; $('cErr').textContent = '';
  $('cEditTxt').textContent = dateTR(x.date) + ' ' + (x.time || '') + ' kaydını düzenliyorsun';
  $('cEditBar').hidden = false;
  $('cGider').textContent = 'Gider olarak kaydet'; $('cGelir').textContent = 'Gelir olarak kaydet';
  cMarkPast(); renderCash();
  $('cForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function saveCash(kind) {
  var desc = clean($('cDesc').value), a = num($('cAmt').value), date = $('cDate').value, err = '';
  var time = $('cTime').value || nowHM();
  if (!cEdit && !cTimeTouched && date === today()) time = nowHM();
  if (!desc) err = 'Açıklama yaz.';
  else if (!$('cAmt').value.trim()) err = 'Tutarı yaz.';
  else if (a == null || a <= 0) err = 'Tutarı sayı olarak yaz, ör. 1500.';
  else if (!date) err = 'Tarihi seç.';
  if (err) { $('cErr').textContent = err; return; }
  var x = cEdit && byId(db.cash, cEdit), isNew = !x;
  if (isNew) { x = { id: 'g' + uid(), ts: Date.now() }; db.cash.push(x); }
  x.kind = kind; x.date = date; x.time = time; x.desc = desc; x.amount = a;
  x.note = $('cNote').value.split('\n').map(clean).filter(Boolean).join('\n');
  if (!persist()) return;
  // seçili dönemin dışına düştüyse görünsün diye tümüne geç
  if (!inPer(date, period(cPer))) { cPer = 'tum'; pressChip($('cPer'), 'per', cPer); }
  resetCash(); renderCash();
  toast((kind === 'gelir' ? 'Gelir' : 'Gider') + (isNew ? ' kaydedildi: ' : ' güncellendi: ') + money(a));
}
function deleteCash(id) {
  db.cash = db.cash.filter(function (x) { return x.id !== id; });
  persist();
  if (cEdit === id) resetCash();
  renderCash(); toast('Kayıt silindi.');
}

/* ---------- stok sayfası ---------- */
function renderStock() {
  var all = db.entries, totalKoli = 0, debt = supDebt(), month = today().slice(0, 7), mon = 0;
  Object.keys(db.products).forEach(function (id) { totalKoli += stockOf(id); });
  all.forEach(function (e) { if (e.date.slice(0, 7) === month && e.total != null) mon += e.total; });
  var last = lastEntry(all);
  $('kpis').innerHTML =
    '<div class="kpi"><span>Toplam stok</span><b>' + fmt(totalKoli) + ' koli</b><small>' + Object.keys(db.products).length + ' çeşit ürün</small></div>'
    + '<div class="kpi"><span>Son giriş</span><b>' + (last ? dateTR(last.date) : '—') + '</b><small>' + (last ? esc(pname(last.pid)) + ' · ' + ago(last.date) : 'Henüz giriş yok') + '</small></div>'
    + '<div class="kpi"><span>Bu ay alım</span><b>' + money(mon) + '</b></div>'
    + '<div class="kpi' + (debt > 0 ? ' bad' : '') + '"><span>Toptancıya kalan borç</span><b>' + money(debt) + '</b></div>';

  var bs = brands();
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
  var ls = linesOf(s.id), tot = shipTotal(s), paid = shipPaid(s), rem = tot - paid, open = payOpen === s.id;
  var koli = ls.reduce(function (t, e) { return t + e.koli; }, 0);
  var pays = s.pays.slice().sort(function (a, b) { return cmp(a.date + ' ' + a.ts, b.date + ' ' + b.ts); });
  return '<div class="ship' + (rem > 0.004 ? ' due' : '') + '">'
    + '<div class="sh"><span class="d">' + dateTR(s.date) + (s.time ? ' ' + s.time : '') + '</span>'
    + '<span class="tt"><b>' + (tot ? money(tot) : 'fiyatsız') + '</b><small>' + ls.length + ' çeşit · ' + fmt(koli) + ' koli</small></span></div>'
    + '<ul class="its">' + ls.map(function (e) {
      var k = e.koli;
      return '<li><span><b>' + esc(pname(e.pid)) + '</b><small>' + lineKoliTxt(e) + '</small></span>'
        + '<span>' + (e.total != null ? money(e.total) + (k ? '<small>' + (e.auto ? 'pay · ' : '') + 'koli ' + money(e.total / k) + '</small>' : '')
          + (k && e.extra ? '<small>giderle koli ' + money((e.total + e.extra) / k) + '</small>' : '') : '—') + '</span></li>';
    }).join('') + '</ul>'
    + (shipExtra(s) ? '<span class="xc">' + extraTxt(s) + '<small>maliyete eklendi, borca eklenmedi</small></span>' : '')
    + (tot ? '<div class="pays">'
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

/* ---------- giriş formu ---------- */
// Bir girişte birden fazla ürün olur; satırlar fRows'ta yazıldığı haliyle tutulur
var editing = null, fRows = [];
function fillDatalists(brand) {
  var seen = {}, bk = fold(brand || '');
  $('dlBrand').innerHTML = brands().map(function (b) { return '<option value="' + esc(b.name) + '">'; }).join('');
  $('dlVar').innerHTML = Object.keys(db.products).filter(function (id) { return !bk || fold(db.products[id].brand) === bk; })
    .map(function (id) { var v = db.products[id].variety; if (seen[fold(v)]) return ''; seen[fold(v)] = 1; return '<option value="' + esc(v) + '">'; }).join('');
}
function newRow(p) { return { brand: p ? p.brand : '', variety: p ? p.variety : '', koli: '', kpp: '', palet: '', total: '' }; }
function openEntry(shipId, preset) {
  editing = shipId || null;
  var s = editing && byId(db.ships, editing);
  // palet sayısı koli ve palette koliden yeniden hesaplanır; paylaştırılmış fiyatlar boş gelir
  fRows = s
    ? linesOf(s.id).map(function (e) {
      var p = db.products[e.pid];
      return { brand: p.brand, variety: p.variety, koli: amt(e.koli), kpp: e.kpp ? amt(e.kpp) : '', palet: !e.kpp && e.palet ? amt(e.palet) : '', total: e.total != null && !e.auto ? amt(e.total) : '' };
    })
    : [newRow(preset)];
  $('entT').textContent = s ? 'Girişi düzenle' : 'Ürün girişi';
  $('fDate').value = s ? s.date : today();
  $('fNote').value = s ? s.note || '' : '';
  $('fTotal').value = s && s.total != null ? amt(s.total) : '';
  $('fNak').value = s && s.nak ? amt(s.nak) : '';
  fCosts = s && s.costs ? s.costs.map(function (c) { return { desc: c.desc, amount: amt(c.amount) }; }) : [];
  renderCosts();
  $('fPaid').value = '';
  $('fPaidL').hidden = !!s;
  $('fErr').textContent = '';
  $('fDel').hidden = !s; disarm($('fDel'));
  $('fSave').textContent = s ? 'Değişikliği kaydet' : 'Kaydet';
  fillDatalists(); renderRows(); calc();
  if ($('dlgProd').open) $('dlgProd').close();
  $('dlgEntry').showModal();
  var first = $('fLines').querySelector(preset ? '[data-f="koli"]' : '[data-f="brand"]');
  if (!s && first) first.focus();
}
var fCosts = [];
function renderCosts() {
  $('fCosts').innerHTML = fCosts.map(function (c, i) {
    return '<div class="xrow" data-ci="' + i + '">'
      + '<label class="f">Ek gider<input data-c="desc" value="' + esc(c.desc) + '" autocomplete="off" placeholder="ör. Hammaliye"></label>'
      + '<label class="f">Tutar (₺)<input data-c="amount" value="' + esc(c.amount) + '" inputmode="decimal" autocomplete="off" placeholder="ör. 500"></label>'
      + '<button type="button" data-crm="' + i + '">Çıkar</button></div>';
  }).join('');
}
// boş satırlar atlanır; açıklamasız gider "Ek gider" olur
function readCosts() {
  var nakRaw = $('fNak').value.trim(), r = { nak: num(nakRaw), list: [], err: '' };
  if (nakRaw && r.nak == null) r.err = 'Nakliyeyi sayı olarak yaz, ör. 1500.';
  fCosts.forEach(function (c) {
    var d = clean(c.desc), raw = c.amount.trim(), a = num(raw);
    if (!d && !raw) return;
    if (!r.err && (a == null || a <= 0)) r.err = (d ? '"' + d + '"' : 'Ek gider') + ' için tutarı sayı olarak yaz.';
    r.list.push({ desc: d || 'Ek gider', amount: a || 0 });
  });
  r.sum = (r.nak || 0) + r.list.reduce(function (t, c) { return t + c.amount; }, 0);
  return r;
}
var PH = { koli: 'ör. 216', kpp: 'ör. 72', palet: 'ör. 3', total: 'boşsa toplamdan pay' };
function renderRows() {
  $('fLines').innerHTML = fRows.map(function (r, i) {
    function inp(f, label, extra) { return '<label class="f">' + label + '<input data-f="' + f + '" value="' + esc(r[f]) + '" autocomplete="off" placeholder="' + PH[f] + '" ' + extra + '></label>'; }
    return '<div class="eline" data-i="' + i + '">'
      + '<div class="elh"><b>' + (i + 1) + '. ürün</b>' + (fRows.length > 1 ? '<button type="button" data-lrm="' + i + '">Çıkar</button>' : '') + '</div>'
      + '<div class="grid2">'
      + '<label class="f">Marka<input data-f="brand" value="' + esc(r.brand) + '" autocomplete="off" list="dlBrand" autocapitalize="words" placeholder="ör. Maysu"></label>'
      + '<label class="f">Çeşit<input data-f="variety" value="' + esc(r.variety) + '" autocomplete="off" list="dlVar" placeholder="ör. 0.5"></label></div>'
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
// her satırın altındaki hesap + en alttaki girişin toplamı
function calc() {
  var rows = fRows.map(readRow), sp = spread(rows, num($('fTotal').value)), koliSum = 0, priced = 0, sum = 0;
  var xc = readCosts(), xs = extraShares(rows, xc.sum);
  document.querySelectorAll('#fLines .eline').forEach(function (el) {
    var i = +el.dataset.i, f = rows[i], t = sp.lines[i], out = [];
    // boş kutuda hesaplanan değer görünür
    ['koli', 'kpp', 'palet'].forEach(function (k) { el.querySelector('[data-f="' + k + '"]').placeholder = f.calc[k] && f[k] ? '= ' + fmt(f[k]) : PH[k]; });
    el.querySelector('[data-f="total"]').placeholder = t.auto ? '= ' + fmt(t.total) + ' (pay)' : PH.total;
    var koli = f.koli || 0;
    if (f.brand && f.variety) {
      if (f.pid) {
        var cur = stockOf(f.pid, editing);
        out.push('<span class="ex">Mevcut ürüne eklenecek: ' + esc(pname(f.pid)) + '</span>');
        out.push('<span class="n">' + fmt(cur) + ' koli → ' + fmt(cur + koli) + ' koli</span>');
      } else out.push('<span class="new">Yeni ürün oluşturulacak: ' + esc(f.brand + ' ' + f.variety) + '</span>');
    }
    if (f.bad) out.push('<span class="new">' + fmt(f.palet) + ' palet × ' + fmt(f.kpp) + ' koli = ' + fmt(f.palet * f.kpp) + ' koli, toplam koliyle (' + fmt(f.koli) + ') tutmuyor. Birini boş bırak.</span>');
    else if (koli) out.push('<span class="n">' + lineKoliTxt(f) + (f.calc.kpp === 'eski' ? ' (palette koli son girişten)' : '') + '</span>');
    if (t.total != null && koli) out.push('<span>' + (t.auto ? 'toplamdan payı ' + money(t.total) + ' · ' : '') + 'koli başı ' + money(t.total / koli) + '</span>');
    if (koli && xs[i]) out.push('<span>nakliye/ek gider payı ' + money(xs[i]) + (t.total != null ? ' · giderle koli başı <b>' + money((t.total + xs[i]) / koli) + '</b>' : '') + '</span>');
    el.querySelector('[data-lc]').innerHTML = out.join('');
    koliSum += koli;
    if (t.total != null) { sum += t.total; priced++; }
  });
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
    if (priced) all.push('<span class="n">Mal bedeli (toptancıya) <b>' + money(sum) + '</b></span>');
    if (xc.sum) all.push('<span class="n">Nakliye + ek gider <b>' + money(xc.sum) + '</b> <small>(toptancı borcuna eklenmez)</small></span>');
    if (pKoli) {
      all.push('<span class="n">Toplam maliyet <b>' + money(pCost) + '</b></span>');
      all.push('<span class="n">Ortalama koli başı maliyet <b>' + money(pCost / pKoli) + '</b></span>');
    }
    if (priced < rows.length) all.push('<span class="new">' + (rows.length - priced) + ' çeşidin fiyatı yok' + (pKoli ? '; toplam ve ortalama onlarsız hesaplandı' : '') + '.</span>');
    var paid = num($('fPaid').value);
    if (!editing && priced && paid != null) all.push('<span>Şimdi ödenen ' + money(paid) + (sum - paid > 0.004 ? ' · kalan borç <b>' + money(sum - paid) + '</b>' : ' · borç kalmıyor') + '</span>');
    else if (!editing && priced) all.push('<span>Toptancıya borç <b>' + money(sum) + '</b></span>');
  }
  if (sp.err) all.push('<span class="new">' + sp.err + '</span>');
  $('fCalc').innerHTML = all.join('');
}
function addRow() {
  var last = fRows[fRows.length - 1], r = newRow(null);
  if (last) r.brand = clean(last.brand);
  fRows.push(r); renderRows(); calc();
  $('fLines').lastElementChild.querySelector(r.brand ? '[data-f="variety"]' : '[data-f="brand"]').focus();
}
function saveEntry() {
  var rows = fRows.map(readRow), date = $('fDate').value, err = '';
  var s = editing && byId(db.ships, editing), isNew = !s;
  var grandRaw = $('fTotal').value.trim(), grand = num(grandRaw);
  rows.some(function (f, i) {
    var w = rows.length > 1 ? (i + 1) + '. ürün: ' : '';
    if (!f.brand) err = w + 'Marka yaz.';
    else if (!f.variety) err = w + 'Çeşit yaz.';
    else if (f.bad) err = w + 'Palet sayısı × palette koli, toplam koliyi tutmuyor. Birini boş bırak, hesaplansın.';
    else if (!f.koli) err = w + 'Toplam koliyi yaz (ya da palet sayısı ile palette koliyi).';
    else if (f.totalRaw && f.total == null) err = w + 'Fiyatı sayı olarak yaz, ör. 18000.';
    return !!err;
  });
  var sp = spread(rows, grand), xc = readCosts();
  var total = sp.lines.reduce(function (t, l) { return t + (l.total || 0); }, 0);
  var paidRaw = $('fPaid').value.trim(), paid = num(paidRaw);
  if (err) { /* satır hatası */ }
  else if (grandRaw && grand == null) err = 'Girişin toplam fiyatını sayı olarak yaz, ör. 50000.';
  else if (sp.err) err = sp.err;
  else if (xc.err) err = xc.err;
  else if (!date) err = 'Tarihi seç.';
  else if (isNew && paidRaw && paid == null) err = 'Ödediğin tutarı sayı olarak yaz.';
  else if (isNew && paidRaw && !total) err = 'Ödenen tutar için önce fiyatı yaz.';
  else if (isNew && paidRaw && paid > total + 0.004) err = 'Ödenen, girişin toplamından (' + money(total) + ') fazla olamaz.';
  else if (!isNew && shipPaid(s) > total + 0.004) err = 'Bu girişe ' + money(shipPaid(s)) + ' ödenmiş; toplam bundan az olamaz. Önce ödemeyi sil.';
  if (err) { $('fErr').textContent = err; return; }

  if (isNew) { s = { id: 'h' + uid(), ts: Date.now(), time: date === today() ? nowHM() : '', pays: [] }; db.ships.push(s); }
  s.date = date; s.note = $('fNote').value.split('\n').map(clean).filter(Boolean).join('\n');
  s.total = grandRaw ? grand : null;
  s.nak = xc.nak || null; s.costs = xc.list;
  var xs = extraShares(rows, xc.sum);
  if (isNew && paid > 0) s.pays.push({ id: 'o' + uid(), ts: s.ts, date: date, amount: paid });
  db.entries = db.entries.filter(function (e) { return e.sid !== s.id; });
  var koli = 0;
  rows.forEach(function (f, i) {
    db.entries.push({ id: 'e' + uid() + i, ts: s.ts, sid: s.id, pid: ensureProduct(f.brand, f.variety), date: s.date, time: s.time,
      koli: f.koli, kpp: f.kpp || null, palet: f.palet || null, total: sp.lines[i].total, auto: sp.lines[i].auto, extra: xs[i] });
    koli += f.koli;
  });
  tidy();
  if (!persist()) return;
  $('dlgEntry').close();
  renderAll();
  toast((isNew ? rows.length + ' ürün, +' + fmt(koli) + ' koli eklendi' : 'Giriş güncellendi') + (total ? ' · toplam ' + money(total) : ''));
}
function deleteEntry() {
  db.entries = db.entries.filter(function (x) { return x.sid !== editing; });
  db.ships = db.ships.filter(function (x) { return x.id !== editing; });
  tidy(); persist();
  $('dlgEntry').close(); renderAll(); toast('Giriş silindi.');
}

/* ---------- ürün detayı ---------- */
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
  var rows = list.map(function (e) { return { k: entKey(e), h: entHTML(e) }; })
    .concat(countsOf(pid).map(function (c) { return { k: entKey(c), h: cntHTML(c) }; }))
    .sort(function (a, b) { return cmp(b.k, a.k); });
  $('prList').innerHTML = rows.length ? rows.map(function (r) { return r.h; }).join('') : '<div class="empty">Giriş yok.</div>';
  $('prRenBox').hidden = true;
  if (!$('dlgProd').open) $('dlgProd').showModal();
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
  $('cntList').innerHTML = brands().map(function (b) {
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
    delete db.products[curProd]; curProd = o;
  } else {
    db.products[curProd].brand = b; db.products[curProd].variety = v;
  }
  tidy(); persist(); renderAll(); openProd(curProd); toast('Ürün adı kaydedildi.');
}

/* ---------- dışa aktarma (cikti.txt benzeri) ---------- */
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
  var L = ['BORAN STOK SATIŞ YEDEĞİ', 'Oluşturma: ' + dateTR(today()) + ' ' + nowHM(), '', '', '', '', '== STOK GİRİŞLERİ ==', ''];
  byDayBlocks(db.ships, L, function (s) {
    L.push('[giriş]');
    linesOf(s.id).forEach(function (e) {
      var p = db.products[e.pid];
      L.push(p.brand + ' / ' + p.variety, (e.palet && e.kpp ? amt(e.palet) + ' palet x ' + amt(e.kpp) + ' koli = ' : '') + amt(e.koli) + ' koli');
      if (e.total != null && !e.auto) L.push('toplam ' + amt(e.total) + ' tl');
    });
    if (s.total != null) L.push('giriş toplamı ' + amt(s.total) + ' tl');
    if (s.nak) L.push('nakliye ' + amt(s.nak) + ' tl');
    (s.costs || []).forEach(function (c) { L.push('ek gider ' + amt(c.amount) + ' tl: ' + c.desc); });
    s.pays.slice().sort(function (a, b) { return cmp(a.date + ' ' + a.ts, b.date + ' ' + b.ts); })
      .forEach(function (x) { L.push('ödeme ' + dateTR(x.date) + ' ' + amt(x.amount) + ' tl' + (x.note ? ': ' + x.note : '')); });
  });
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
function fileName() { return 'boran-yedek-' + today() + '.txt'; }
function markBackup() { meta('lastBackup', today() + ' ' + nowHM()); renderBackup(); }
function renderBackup() {
  $('expOut').value = exportText();
  var lb = meta('lastBackup');
  $('lastBackup').textContent = db.sales.length + ' satış, ' + db.ships.length + ' giriş, ' + db.counts.length + ' sayım, ' + db.cash.length + ' gelir/gider, ' + Object.keys(db.products).length + ' ürün. '
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
  var ents = [], sales = [], counts = [], cash = [], section = null, date = null, time = '', cur = null, lastSale = null;
  function inSec(name) { return !section || section.indexOf(name) === 0; }
  String(text).replace(/^﻿/, '').split(/\r?\n/).forEach(function (raw) {
    var t = raw.trim(), f = fold(t), m;
    if (!t) { cur = null; time = ''; return; }
    if ((m = t.match(/^==+\s*(.+?)\s*==+$/))) { section = fold(m[1]); date = null; cur = null; return; }
    if (/^[-–—_=]{3,}$/.test(t)) return;
    if ((m = t.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})$/))) { date = m[3] + '-' + pad2(m[2]) + '-' + pad2(m[1]); cur = null; time = ''; lastSale = null; return; }
    if ((m = t.match(/^(\d{1,2}):(\d{2})$/))) { time = pad2(m[1]) + ':' + m[2]; cur = null; return; }
    if (f === '[sayim]' && inSec('sayim')) { cur = { kind: 'c', date: date, time: time, brand: '', variety: '', koli: null }; counts.push(cur); time = ''; return; }
    if (f === '[odenmedi]' && inSec('satis')) { cur = lastSale = { kind: 's', date: date, time: time, pay: 'nakit', items: [], paid: 0, note: [], cols: [] }; sales.push(cur); time = ''; return; }
    if ((m = f.match(/^\[(gelir|gider)\]$/)) && inSec('gelir')) { cur = { kind: 'g', type: m[1], date: date, time: time, desc: '', amount: null, note: [] }; cash.push(cur); time = ''; return; }
    if (f === '[giris]' && inSec('stok')) { cur = { kind: 'e', date: date, time: time, lines: [], pays: [], paid: null, total: null, nak: null, costs: [], note: [] }; ents.push(cur); time = ''; return; }
    if ((m = f.match(/^\[(nakit|havale)\]$/)) && inSec('satis')) { cur = lastSale = { kind: 's', date: date, time: time, pay: m[1], items: [], paid: null, note: [], cols: [] }; sales.push(cur); time = ''; return; }
    // eski defterde boş satırdan sonra tek başına kalan not: o günün bir önceki satışına eklenir
    if (!cur && lastSale && (m = t.match(/^\((.*)\)$/))) { if (m[1].trim()) lastSale.note.push(m[1].trim()); return; }
    if (!cur) return;
    if ((m = t.match(/^\((.*)\)$/))) { if (m[1].trim()) cur.note.push(m[1].trim()); return; }
    if (cur.kind === 'e' && (m = f.match(/^giris toplami\s+([\d.,]+)/))) { cur.total = num(m[1]); return; }
    if (cur.kind === 'e' && (m = f.match(/^nakliye\s+([\d.,]+)/))) { cur.nak = num(m[1]); return; }
    if (cur.kind === 'e' && (m = t.match(/^ek gider\s+([\d.,]+)\s*(?:tl|₺)?\s*(?::\s*(.*))?$/i))) { cur.costs.push({ desc: clean(m[2] || '') || 'Ek gider', amount: num(m[1]) }); return; }
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
    // giriş toplamı varsa fiyatsız çeşitlere yine paylaştırılır
    var sp = spread(e.lines, e.total);
    if (sp.err) e.total = null;
    else e.lines.forEach(function (l, i) { l.total = sp.lines[i].total; l.auto = sp.lines[i].auto; });
    e.costs = e.costs.filter(function (c) { return c.amount > 0; });
    var xs = extraShares(e.lines, (e.nak || 0) + e.costs.reduce(function (t, c) { return t + c.amount; }, 0));
    e.lines.forEach(function (l, i) { l.extra = xs[i]; });
    if (e.paid > 0 && e.lines.some(function (l) { return l.total != null; })) e.pays.push({ date: e.date, amount: e.paid });
    e.pays = e.pays.filter(function (x) { return x.amount > 0; });
  });
  sales = sales.filter(function (s) {
    var ok = s.date && !s.bad && s.items.length && s.items.every(function (i) { return i.n > 0 && i.price != null; });
    if (!ok) bad++; return ok;
  });
  counts = counts.filter(function (c) { var ok = c.date && c.brand && c.variety && c.koli != null; if (!ok) bad++; return ok; });
  cash = cash.filter(function (x) { var ok = x.date && x.desc && x.amount > 0; if (!ok) bad++; return ok; });
  return { entries: ents, sales: sales, counts: counts, cash: cash, bad: bad };
}
function shipSig(date, time, note, total, nak, costs, lines, pays) {
  return ['e', date, time || '', note || '', total == null ? '' : total, nak || '']
    .concat((costs || []).map(function (c) { return 'x:' + fold(c.desc) + ':' + c.amount; }).sort())
    .concat(lines.map(function (l) { return pkey(l.brand, l.variety) + ':' + l.koli + ':' + (l.kpp || '') + ':' + l.total; }).sort())
    .concat(pays.map(function (x) { return 'o:' + x.date + ':' + x.amount + ':' + (x.note || ''); }).sort()).join('|');
}
function cntSig(date, time, brand, variety, koli) { return ['c', date, time || '', pkey(brand, variety), koli].join('|'); }
function cashSig(date, time, type, desc, amount, note) { return ['g', date, time || '', type, fold(desc), amount, note || ''].join('|'); }
function saleSig(date, time, pay, paid, note, items) {
  return ['s', date, time || '', pay, paid, note || ''].concat(items.map(function (i) { return pkey(i.brand, i.variety) + ':' + i.n + ':' + i.price; }).sort()).join('|');
}
var parsed = null;
function readImport() {
  parsed = parseBackup($('impIn').value);
  var n = parsed.entries.length, ns = parsed.sales.length, nc = parsed.counts.length, ng = parsed.cash.length, prods = {};
  parsed.counts.forEach(function (c) { prods[pkey(c.brand, c.variety)] = 1; });
  parsed.entries.forEach(function (e) { e.lines.forEach(function (l) { prods[pkey(l.brand, l.variety)] = 1; }); });
  parsed.sales.forEach(function (s) { s.items.forEach(function (i) { prods[pkey(i.brand, i.variety)] = 1; }); });
  var newP = Object.keys(prods).filter(function (k) { var s = k.split('|'); return !findProduct(s[0], s[1]); }).length;
  $('impRes').hidden = false;
  $('impRes').innerHTML = n + ns + nc + ng
    ? [[n, 'stok girişi'], [ns, 'satış'], [nc, 'sayım'], [ng, 'gelir/gider']].filter(function (x) { return x[0]; }).map(function (x) { return '<b>' + x[0] + ' ' + x[1] + '</b>'; }).join(', ') + ' bulundu'
      + (Object.keys(prods).length ? ' (' + Object.keys(prods).length + ' ürün, ' + newP + ' tanesi yeni)' : '') + '.'
      + (parsed.bad ? '<br>' + parsed.bad + ' kayıt eksik ya da tanınmayan bilgi yüzünden atlanacak.' : '')
      + '<br><small>"Mevcutlara ekle" aynı kayıtları ikinci kez eklemez. "Hepsini değiştir" şu anki tüm kayıtları siler.</small>'
    : 'Bu metinde kayıt bulunamadı.' + (parsed.bad ? ' (' + parsed.bad + ' kayıt tanınmadı.)' : '');
  $('impActs').hidden = !(n + ns + nc + ng); disarm($('impReplace'));
}
function applyImport(replace) {
  if (!parsed || !(parsed.entries.length + parsed.sales.length + parsed.counts.length + parsed.cash.length)) return;
  if (replace) db = { v: 1, products: {}, entries: [], ships: [], sales: [], counts: [], cash: [] };
  var have = {}, added = 0, skipped = 0, base = Date.now();
  // mevcut kayıtlar adetleriyle sayılır; dosyadaki aynı iki satış ayrı ayrı eklenir
  function seen(k) { have[k] = (have[k] || 0) + 1; }
  db.ships.forEach(function (s) {
    seen(shipSig(s.date, s.time, s.note, s.total, s.nak, s.costs, linesOf(s.id).map(function (e) { var p = db.products[e.pid]; return { brand: p.brand, variety: p.variety, koli: e.koli, kpp: e.kpp, total: e.total }; }), s.pays));
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
    var note = x.note.join('\n'), sig = shipSig(x.date, x.time, note, x.total, x.nak, x.costs, x.lines, x.pays);
    if (have[sig] > 0) { have[sig]--; skipped++; return; }
    added++;
    var s = { id: 'h' + uid() + i, ts: base + i, date: x.date, time: x.time || '', note: note, total: x.total, nak: x.nak || null, costs: x.costs,
      pays: x.pays.map(function (o, j) { return { id: 'o' + uid() + i + '_' + j, ts: base + i, date: o.date, amount: o.amount, note: o.note || '' }; }) };
    db.ships.push(s);
    x.lines.forEach(function (l, j) {
      db.entries.push({ id: 'e' + uid() + i + '_' + j, ts: s.ts, sid: s.id, pid: ensureProduct(l.brand, l.variety), date: s.date, time: s.time,
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

/* ---------- genel ---------- */
var toastT;
function toast(msg) {
  var t = $('toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, 3200);
}
// Silme gibi işlemler için iki dokunuş: ilkinde "Emin misin?" olur
function arm(btn, fn) {
  if (btn.dataset.armed) { disarm(btn); fn(); return; }
  btn.dataset.armed = '1'; btn.dataset.txt = btn.textContent; btn.textContent = 'Emin misin? Tekrar dokun';
  setTimeout(function () { disarm(btn); }, 4000);
}
function disarm(btn) { if (btn.dataset.armed) { delete btn.dataset.armed; btn.textContent = btn.dataset.txt; } }
function renderAll() {
  renderSalesDay(); updateSaleCalc(); renderStock(); renderCash(); renderRecords();
  if (!$('p-yedek').hidden) renderBackup();
}
function setView(iso) {
  if (!iso) return;
  view = iso;
  if (!sEdit) $('sDate').value = view;
  markPast(); renderSalesDay();
}
function go(tab) {
  if (!$('p-' + tab)) tab = 'satis';
  document.querySelectorAll('.page').forEach(function (s) { s.hidden = s.id !== 'p-' + tab; });
  document.querySelectorAll('nav.tabs button').forEach(function (b) { if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  if (tab === 'yedek') renderBackup();
  if (tab === 'kayit') renderRecords();
  if (location.hash !== '#' + tab) history.replaceState(null, '', '#' + tab);
  window.scrollTo(0, 0);
  if (tab === 'gider') {
    if (!cEdit && !cTimeTouched) $('cTime').value = nowHM();
  }
  if (tab === 'satis') {
    if (!sEdit && !timeTouched) $('sTime').value = nowHM();
  }
}

/* ---------- olaylar ---------- */
document.querySelector('nav.tabs').addEventListener('click', function (ev) { var b = ev.target.closest('[data-tab]'); if (b) go(b.dataset.tab); });
$('btnAdd').addEventListener('click', function () { openEntry(null, null); });
$('btnCount').addEventListener('click', function () { openCount(null); });
$('prCnt').addEventListener('click', function () { openCount(curProd); });
$('cntSave').addEventListener('click', saveCount);
document.addEventListener('click', function (ev) {
  var b = ev.target.closest('[data-prod],[data-ship],[data-shpay],[data-shpsave],[data-shpcancel],[data-shpdel],[data-close],[data-spaid],[data-sedit],[data-sdel],[data-cdel],[data-cedit],[data-cxdel]');
  if (!b) return;
  if (b.dataset.close != null) { b.closest('dialog').close(); return; }
  if (b.dataset.prod) openProd(b.dataset.prod);
  else if (b.dataset.ship) openEntry(b.dataset.ship);
  else if (b.dataset.shpay) openPay(b.dataset.shpay);
  else if (b.dataset.shpsave) savePay(b.dataset.shpsave);
  else if (b.dataset.shpcancel != null) { payOpen = null; renderStock(); }
  else if (b.dataset.shpdel) arm(b, function () { deletePay(b.dataset.shpdel); });
  else if (b.dataset.spaid) markPaid(b.dataset.spaid, b);
  else if (b.dataset.sedit) {
    var se = byId(db.sales, b.dataset.sedit); if (!se) return;
    if ($('p-satis').hidden) go('satis');
    setView(se.date); startSaleEdit(se.id);
  }
  else if (b.dataset.sdel) arm(b, function () { deleteSale(b.dataset.sdel); });
  else if (b.dataset.cdel) arm(b, function () { deleteCount(b.dataset.cdel); });
  else if (b.dataset.cedit) startCashEdit(b.dataset.cedit);
  else if (b.dataset.cxdel) arm(b, function () { deleteCash(b.dataset.cxdel); });
});
// pencere dışına dokununca kapat
document.querySelectorAll('dialog').forEach(function (d) {
  d.addEventListener('click', function (ev) { if (ev.target === d) d.close(); });
});

// satış formu
$('dPrev').addEventListener('click', function () { setView(shiftDay(view, -1)); });
$('dNext').addEventListener('click', function () { setView(shiftDay(view, 1)); });
$('vDate').addEventListener('change', function () { setView(this.value); });
$('sBrands').addEventListener('input', function (ev) {
  var el = ev.target;
  if (el.dataset.q) { var n = parseInt(el.value.replace(/\D/g, ''), 10) || 0; sQty[el.dataset.q] = n; }
  else if (el.dataset.p) sPrice[el.dataset.p] = el.value;
  else return;
  $('sErr').textContent = '';
  updateSaleCalc();
});
$('sBrands').addEventListener('click', function (ev) {
  var b = ev.target.closest('[data-sstep]'); if (!b) return;
  var id = b.dataset.pid, n = Math.max(0, (sQty[id] || 0) + Number(b.dataset.sstep));
  sQty[id] = n;
  b.parentNode.querySelector('input').value = n || '';
  $('sErr').textContent = '';
  updateSaleCalc();
});
$('sBrands').addEventListener('toggle', function (ev) {
  if (ev.target.dataset && ev.target.dataset.brand != null) sOpen[ev.target.dataset.brand] = ev.target.open;
}, true);
$('sPay').addEventListener('click', function (ev) { var b = ev.target.closest('[data-pay]'); if (b) setPay(b.dataset.pay); });
$('sDate').addEventListener('change', markPast);
$('sTime').addEventListener('input', function () { timeTouched = true; });
$('sPaid').addEventListener('input', function () { $('sErr').textContent = ''; });
$('sSave').addEventListener('click', saveSale);
$('sCancel').addEventListener('click', function () { resetSaleForm(); renderSalesDay(); });

// kayıtlar
function pressChip(box, attr, v) { box.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset[attr] === v)); }); }
$('rPer').addEventListener('click', function (ev) { var b = ev.target.closest('[data-per]'); if (!b) return; rPer = b.dataset.per; rLimit = 40; pressChip(this, 'per', rPer); renderRecords(); });
$('rPay').addEventListener('click', function (ev) { var b = ev.target.closest('[data-rpay]'); if (!b) return; rPay = b.dataset.rpay; rLimit = 40; rKeep = {}; pressChip(this, 'rpay', rPay); renderRecordList(period()); });
$('rRefresh').addEventListener('click', function () { rKeep = {}; renderRecordList(period()); toast('Liste yenilendi.'); });
$('rQ').addEventListener('input', function () { rLimit = 40; renderRecordList(period()); });
$('rMore').addEventListener('click', function () { rLimit += 40; renderRecordList(period()); });

// gelir-gider formu
$('cGider').addEventListener('click', function () { saveCash('gider'); });
$('cGelir').addEventListener('click', function () { saveCash('gelir'); });
$('cCancel').addEventListener('click', function () { resetCash(); renderCash(); });
$('cPer').addEventListener('click', function (ev) { var b = ev.target.closest('[data-per]'); if (!b) return; cPer = b.dataset.per; cLimit = 40; pressChip(this, 'per', cPer); renderCash(); });
$('cMore').addEventListener('click', function () { cLimit += 40; renderCash(); });
$('cDate').addEventListener('change', cMarkPast);
$('cTime').addEventListener('input', function () { cTimeTouched = true; });
['cDesc', 'cAmt'].forEach(function (id) { $(id).addEventListener('input', function () { $('cErr').textContent = ''; }); });

// giriş formu
$('fLines').addEventListener('input', function (ev) {
  var f = ev.target.dataset.f, el = ev.target.closest('.eline'); if (!f || !el) return;
  var r = fRows[+el.dataset.i]; r[f] = ev.target.value;
  if (f === 'brand') fillDatalists(r.brand);
  $('fErr').textContent = ''; calc();
});
// çeşit önerileri o satırın markasına göre
$('fLines').addEventListener('focusin', function (ev) { var el = ev.target.closest('.eline'); if (el && ev.target.dataset.f === 'variety') fillDatalists(fRows[+el.dataset.i].brand); });
$('fLines').addEventListener('click', function (ev) {
  var b = ev.target.closest('[data-lrm]'); if (!b) return;
  fRows.splice(+b.dataset.lrm, 1); renderRows(); calc();
});
$('fAddLine').addEventListener('click', addRow);
$('fPaid').addEventListener('input', function () { $('fErr').textContent = ''; calc(); });
$('fTotal').addEventListener('input', function () { $('fErr').textContent = ''; calc(); });
$('fNak').addEventListener('input', function () { $('fErr').textContent = ''; calc(); });
$('fCosts').addEventListener('input', function (ev) {
  var k = ev.target.dataset.c, el = ev.target.closest('.xrow'); if (!k || !el) return;
  fCosts[+el.dataset.ci][k] = ev.target.value; $('fErr').textContent = ''; calc();
});
$('fCosts').addEventListener('click', function (ev) {
  var b = ev.target.closest('[data-crm]'); if (!b) return;
  fCosts.splice(+b.dataset.crm, 1); renderCosts(); calc();
});
$('fAddCost').addEventListener('click', function () {
  fCosts.push({ desc: '', amount: '' }); renderCosts(); calc();
  $('fCosts').lastElementChild.querySelector('[data-c="desc"]').focus();
});
$('recentMore').addEventListener('click', function () { stLimit += 15; renderStock(); });
document.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' && (ev.target.id === 'pAmt' || ev.target.id === 'pNote')) { var b = document.querySelector('[data-shpsave]'); if (b) savePay(b.dataset.shpsave); } });
$('fSave').addEventListener('click', saveEntry);
$('fDel').addEventListener('click', function () { arm(this, deleteEntry); });
$('prAdd').addEventListener('click', function () { openEntry(null, db.products[curProd]); });
$('prRen').addEventListener('click', function () {
  var p = db.products[curProd]; $('rnBrand').value = p.brand; $('rnVar').value = p.variety; renHint();
  $('prRenBox').hidden = !$('prRenBox').hidden; if (!$('prRenBox').hidden) $('rnBrand').focus();
});
$('rnBrand').addEventListener('input', renHint); $('rnVar').addEventListener('input', renHint);
$('rnSave').addEventListener('click', saveRename);

// yedek
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

/* ---------- başlat ---------- */
load();
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
resetSaleForm();
resetCash();
renderAll();
go(location.hash.slice(1) || 'satis');
})();
