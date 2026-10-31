'use strict';
/* sayfalar arası geçiş ve başlatma */

function renderAll() {
  renderSalesDay(); updateSaleCalc(); renderStock(); renderCash(); renderRecords();
  if (!$('p-yedek').hidden) renderBackup();
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
    renderSaleForm(); // yeni girilen ürünler listede görünsün
  }
}

document.querySelector('nav.tabs').addEventListener('click', function (ev) { var b = ev.target.closest('[data-tab]'); if (b) go(b.dataset.tab); });
document.addEventListener('click', function (ev) {
  var b = ev.target.closest('[data-close]'); if (b) b.closest('dialog').close();
});
// pencere dışına dokununca kapat
document.querySelectorAll('dialog').forEach(function (d) {
  d.addEventListener('click', function (ev) { if (ev.target === d) d.close(); });
});

load();
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
renderAcct();
resetSaleForm();
resetCash();
renderAll();
go(location.hash.slice(1) || 'satis');
