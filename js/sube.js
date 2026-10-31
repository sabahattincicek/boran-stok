'use strict';
/* Şubeler: üstteki seçimle şubeler arası geçiş. Her şubenin ürünleri, girişleri, satışları ve yedeği ayrı; toptancılar ortak (store.js) */

mountDialog(`
<dialog id="dlgAcct" aria-labelledby="acT"><div class="sheet">
  <header><h2 id="acT">Şubeler</h2><button type="button" data-close>Kapat</button></header>
  <div class="list" id="acList"></div>
  <div class="row"><input id="acNew" class="grow" autocomplete="off" placeholder="Yeni şube adı, ör. Merkez" aria-label="Yeni şube adı"><button type="button" class="primary" id="acAdd">Şube ekle</button></div>
  <p class="err" id="acErr" role="alert"></p>
  <details class="more"><summary><span>Şubeler nasıl çalışır?</span></summary><div class="morein"><p class="hint">Her şubenin girişleri, satışları ve diğer kayıtları birbirinden bağımsızdır; toptancılar bütün şubelerde ortaktır (hesabı şube şube tutulur). Üstteki seçimle şubeler arasında geçersin. Adı kutuda değiştirince kaydedilir. Silinen şubenin kayıtları geri gelmez; silmeden önce o şubenin yedeğini al.</p></div></details>
</div></dialog>`);

function renderAcct() {
  $('acSel').innerHTML = accts().map(function (a) { return '<option value="' + a.id + '"' + (a.id === acct.id ? ' selected' : '') + '>' + esc(a.name) + '</option>'; }).join('');
  document.title = 'Boran Stok · ' + acct.name;
  // tek şube varken seçim gereksiz, sadece "Şubeler" kalır
  var many = accts().length > 1;
  $('acSel').hidden = !many; document.querySelector('.acct label').hidden = !many;
}
function renderAcctList() {
  var l = accts();
  $('acList').innerHTML = l.map(function (a) {
    var cur = a.id === acct.id, d = cur ? db : acctData(a.id) || {};
    var info = (d.sales || []).length + ' satış · ' + (d.ships || []).length + ' giriş';
    return '<div class="acr' + (cur ? ' on' : '') + '" data-acid="' + a.id + '"><input data-acname value="' + esc(a.name) + '" autocomplete="off" aria-label="Şube adı">'
      + '<small>' + (cur ? '<b>Açık</b> · ' : '') + info + '</small>'
      + '<div class="acts">' + (cur ? '' : '<button type="button" data-acopen>Aç</button><button type="button" class="danger" data-acdel>Sil</button>') + '</div></div>';
  }).join('');
  $('acErr').textContent = '';
}
// açık formlar ve seçimler şubeye özel; şube değişince sıfırlanır
function switchAcct(id) {
  if (id === acct.id) return;
  meta('acct', id); load();
  document.querySelectorAll('dialog[open]').forEach(function (d) { if (d.id !== 'dlgAcct') d.close(); });
  view = today(); rKeep = {}; parsed = null;
  stSup = ''; stLimit = 15;
  resetSaleForm(); resetCash(); renderAcct(); renderAll();
  if ($('dlgAcct').open) renderAcctList();
  toast(acct.name + ' açıldı.');
}
function addAcctUI() {
  var name = clean($('acNew').value);
  if (!name) { $('acErr').textContent = 'Şubenin adını yaz.'; return; }
  if (accts().some(function (a) { return fold(a.name) === fold(name); })) { $('acErr').textContent = name + ' zaten var.'; return; }
  var a = addAcct(name);
  $('acNew').value = '';
  switchAcct(a.id);
}

$('acSel').addEventListener('change', function () { switchAcct(this.value); });
$('acEdit').addEventListener('click', function () { renderAcctList(); $('dlgAcct').showModal(); });
$('acAdd').addEventListener('click', addAcctUI);
$('acNew').addEventListener('keydown', function (ev) { if (ev.key === 'Enter') addAcctUI(); });
$('acList').addEventListener('change', function (ev) {
  var row = ev.target.closest('[data-acid]'); if (!row || ev.target.dataset.acname == null) return;
  var id = row.dataset.acid, name = clean(ev.target.value);
  var same = accts().filter(function (a) { return a.id !== id && fold(a.name) === fold(name); })[0];
  if (!name || same) { $('acErr').textContent = !name ? 'Şube adı boş olamaz.' : name + ' zaten var.'; renderAcctList(); return; }
  renameAcct(id, name); renderAcct(); toast('Şube adı kaydedildi: ' + name);
});
$('acList').addEventListener('click', function (ev) {
  var b = ev.target.closest('button'), row = b && b.closest('[data-acid]'); if (!row) return;
  var id = row.dataset.acid;
  if (b.dataset.acopen != null) switchAcct(id);
  else if (b.dataset.acdel != null) arm(b, function () {
    var a = byId(accts(), id);
    deleteAcct(id); renderAcct(); renderAcctList(); toast((a ? a.name : 'Şube') + ' silindi.');
  });
});
