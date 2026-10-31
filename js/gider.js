'use strict';
/* Gelir-Gider sayfası */

mountPage(`
  <section class="page split" id="p-gider" hidden>
    <header class="top"><h1>Gelir-Gider</h1><span class="hint" id="cPerTxt"></span></header>
    <div class="sform" id="cForm">
      <div class="editbar" id="cEditBar" hidden><span id="cEditTxt"></span><button type="button" id="cCancel">Vazgeç</button></div>
      <label class="f">Açıklama<input id="cDesc" autocomplete="off" placeholder="ör. Mazot, kira, babam sattı"></label>
      <label class="f">Tutar (₺)<input id="cAmt" inputmode="decimal" autocomplete="off" placeholder="ör. 1500"></label>
      <details class="more" id="cOpt"><summary><span id="cMoreT"></span></summary><div class="morein">
        <div class="grid2">
          <label class="f"><span id="cDateL">Tarih</span><input type="date" id="cDate"></label>
          <label class="f">Saat<input type="time" id="cTime"></label>
        </div>
        <label class="f">Not<textarea id="cNote" rows="2" placeholder="ör. Fatura kesilecek"></textarea></label>
      </div></details>
      <p class="err" id="cErr" role="alert"></p>
      <div class="savebar gb">
        <button type="button" class="bgider" id="cGider">Gider kaydet</button>
        <button type="button" class="bgelir" id="cGelir">Gelir kaydet</button>
      </div>
    </div>

    <div class="col">
    <div class="chips" id="cPer">
      <button type="button" data-per="bugun" aria-pressed="false">Bugün</button>
      <button type="button" data-per="7" aria-pressed="false">Son 7 gün</button>
      <button type="button" data-per="ay" aria-pressed="true">Bu ay</button>
      <button type="button" data-per="gecen" aria-pressed="false">Geçen ay</button>
      <button type="button" data-per="tum" aria-pressed="false">Tümü</button>
    </div>
    <div class="kpis" id="cKpis"></div>
    <div class="list" id="cList"></div>
    <button type="button" id="cMore" hidden>Daha fazla göster</button>
    </div>
  </section>`);

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
  return more('cash.' + x.id, '<span class="shm"><span class="sh"><span class="ds">' + esc(x.desc) + '</span><b>' + (gelir ? '+' : '−') + money(x.amount) + '</b></span></span>',
    '<div class="sh"><span class="tm">' + esc(x.time || '--:--') + '</span><span class="k">' + (gelir ? 'Gelir' : 'Gider') + '</span></div>'
    + (x.note ? '<div class="note">' + esc(x.note) + '</div>' : '')
    + '<div class="acts"><button type="button" data-cedit="' + x.id + '">Düzenle</button>'
    + '<button type="button" class="danger" data-cxdel="' + x.id + '">Sil</button></div>',
    'item cash' + (gelir ? '' : ' out') + (cEdit === x.id ? ' editing' : ''));
}
function cMarkPast() {
  var past = $('cDate').value && $('cDate').value !== today(), L = [];
  $('cDate').classList.toggle('past', !!past);
  $('cDateL').textContent = past ? 'Tarih (bugün değil!)' : 'Tarih';
  if (past) { $('cOpt').open = true; L.push('Tarih ' + dateTR($('cDate').value)); }
  if ($('cNote').value.trim()) L.push('Not var');
  $('cMoreT').textContent = L.join(' · ') || 'Tarih, saat, not';
}
function resetCash() {
  cEdit = null; cTimeTouched = false;
  $('cDesc').value = ''; $('cNote').value = ''; $('cAmt').value = ''; $('cErr').textContent = '';
  $('cDate').value = today(); $('cTime').value = nowHM();
  $('cEditBar').hidden = true;
  $('cGider').textContent = 'Gider kaydet'; $('cGelir').textContent = 'Gelir kaydet';
  $('cOpt').open = false;
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
  if (err) { $('cErr').textContent = err; if (!date) $('cOpt').open = true; return; }
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

// gelir-gider formu
$('cGider').addEventListener('click', function () { saveCash('gider'); });
$('cGelir').addEventListener('click', function () { saveCash('gelir'); });
$('cCancel').addEventListener('click', function () { resetCash(); renderCash(); });
$('cPer').addEventListener('click', function (ev) { var b = ev.target.closest('[data-per]'); if (!b) return; cPer = b.dataset.per; cLimit = 40; pressChip(this, 'per', cPer); renderCash(); });
$('cMore').addEventListener('click', function () { cLimit += 40; renderCash(); });
$('cDate').addEventListener('change', cMarkPast);
$('cTime').addEventListener('input', function () { cTimeTouched = true; });
$('cNote').addEventListener('input', cMarkPast);
['cDesc', 'cAmt'].forEach(function (id) { $(id).addEventListener('input', function () { $('cErr').textContent = ''; }); });
document.addEventListener('click', function (ev) {
  var b = ev.target.closest('[data-cedit],[data-cxdel]'); if (!b) return;
  if (b.dataset.cedit) startCashEdit(b.dataset.cedit);
  else arm(b, function () { deleteCash(b.dataset.cxdel); });
});
