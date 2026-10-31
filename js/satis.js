'use strict';
/* Satış sayfası */

mountPage(`
  <section class="page split" id="p-satis">
    <header class="top"><h1>Satış</h1><span class="hint" id="vDay"></span></header>
    <div class="sform" id="sForm">
      <div class="editbar" id="sEditBar" hidden><span id="sEditTxt"></span><button type="button" id="sCancel">Vazgeç</button></div>
      <div class="list" id="sBrands"></div>
      <div class="seg" id="sPay">
        <button type="button" data-pay="nakit" aria-pressed="true">Nakit</button>
        <button type="button" data-pay="havale" aria-pressed="false">Havale</button>
      </div>
      <details class="more" id="sMore"><summary><span id="sMoreT"></span></summary><div class="morein">
        <label class="f">Ödenen tutar (₺)<input id="sPaid" inputmode="decimal" autocomplete="off" placeholder="Boşsa tamamı"></label>
        <div class="grid2">
          <label class="f"><span id="sDateL">Tarih</span><input type="date" id="sDate"></label>
          <label class="f">Saat<input type="time" id="sTime"></label>
        </div>
        <label class="f">Not<textarea id="sNote" rows="2" placeholder="ör. Parasını sonra verecek"></textarea></label>
      </div></details>
      <p class="err" id="sErr" role="alert"></p>
      <div class="savebar"><span class="tot" id="sTot">0 ₺</span><button type="button" class="primary" id="sSave">Kaydet</button></div>
    </div>

    <div class="col">
    <div class="daynav">
      <button type="button" id="dPrev" aria-label="Önceki gün">‹</button>
      <input type="date" id="vDate" aria-label="Gösterilen gün">
      <button type="button" id="dNext" aria-label="Sonraki gün">›</button>
    </div>
    <div class="dsum" id="dSum"></div>
    <div class="list" id="sList"></div>
    </div>
  </section>`);

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
  var koli = s.items.reduce(function (n, i) { return n + i.n; }, 0);
  var head = '<span class="shm"><span class="sh"><span class="tm">' + esc(s.time || '--:--') + '</span><span class="pm">' + (s.pay === 'havale' ? 'Havale' : 'Nakit') + '</span><b>' + money(t) + '</b></span>'
    + '<span class="brief">' + (s.items.length === 1 ? fmt(koli) + ' × ' + esc(pname(s.items[0].pid)) : fmt(koli) + ' koli · ' + s.items.length + ' çeşit')
    + (open ? ' · <span class="rem">kalan ' + money(t - p) + '</span>' : '') + '</span></span>';
  return more('sale.' + s.id, head, '<ul class="its">' + s.items.map(function (i) {
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
    + '<button type="button" class="danger" data-sdel="' + s.id + '">Sil</button></div>',
    'item sale' + (open ? ' no' : '') + (sEdit === s.id ? ' editing' : ''));
}

/* ---------- satış sayfası: form ---------- */
var sEdit = null, sQty = {}, sPrice = {}, sPay = 'nakit', sOpen = {}, timeTouched = false;
function priceOf(pid) { return sPrice[pid] !== undefined ? num(sPrice[pid]) : db.products[pid].price; }
function renderSaleForm() {
  var bs = brands(true);
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
  brands(true).forEach(function (b) { b.ids.forEach(function (id) { if (sQty[id] > 0) items.push({ pid: id, n: sQty[id], price: priceOf(id) }); }); });
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
// kapalı bölümün başlığı girilenleri söyler; bugün olmayan tarih gizli kalmaz
function markPast() {
  var past = $('sDate').value && $('sDate').value !== today(), paid = $('sPaid').value.trim(), L = [];
  $('sDate').classList.toggle('past', !!past);
  $('sDateL').textContent = past ? 'Tarih (bugün değil!)' : 'Tarih';
  if (past) { $('sMore').open = true; L.push('Tarih ' + dateTR($('sDate').value)); }
  if (paid) L.push('Ödenen ' + paid + ' ₺');
  if ($('sNote').value.trim()) L.push('Not var');
  $('sMoreT').textContent = L.join(' · ') || 'Ödenen tutar, tarih, not';
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
  $('sMore').open = false;
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
  if (err) {
    $('sErr').textContent = err;
    if (items.length && !noPrice) $('sMore').open = true; // kalan hatalar ödenen tutar ve tarih
    return;
  }

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
$('sPaid').addEventListener('input', function () { $('sErr').textContent = ''; markPast(); });
$('sNote').addEventListener('input', markPast);
$('sSave').addEventListener('click', saveSale);
$('sCancel').addEventListener('click', function () { resetSaleForm(); renderSalesDay(); });
function setView(iso) {
  if (!iso) return;
  view = iso;
  if (!sEdit) $('sDate').value = view;
  markPast(); renderSalesDay();
}
// satış kartları Kayıtlar sayfasında da görünür
document.addEventListener('click', function (ev) {
  var b = ev.target.closest('[data-spaid],[data-sedit],[data-sdel]'); if (!b) return;
  if (b.dataset.spaid) markPaid(b.dataset.spaid, b);
  else if (b.dataset.sedit) {
    var se = byId(db.sales, b.dataset.sedit); if (!se) return;
    if ($('p-satis').hidden) go('satis');
    setView(se.date); startSaleEdit(se.id);
  }
  else if (b.dataset.sdel) arm(b, function () { deleteSale(b.dataset.sdel); });
});
