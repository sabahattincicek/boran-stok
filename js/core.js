'use strict';
/* ortak yardımcılar */

var $ = function (id) { return document.getElementById(id); };
// sayfaların ve pencerelerin HTML'i kendi dosyalarında; dosya yüklenirken yerine konur
function mountPage(html) { document.querySelector('.wrap').insertAdjacentHTML('beforeend', html); }
function mountDialog(html) { document.body.insertAdjacentHTML('beforeend', html); }

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
// kutuda binlik noktalı gösterim: 12500,5 → 12.500,5
function gnum(v) {
  var m = String(v == null ? '' : v).replace(/[^\d,]/g, ''), i = m.indexOf(',');
  var n = (i < 0 ? m : m.slice(0, i)).replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return n + (i < 0 ? '' : ',' + m.slice(i + 1).replace(/,/g, ''));
}
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
function sm(v) { return (v < -0.004 ? '−' : '') + money(Math.abs(v)); }
function kpi(label, val, small, cls) {
  return '<div class="kpi' + (cls ? ' ' + cls : '') + '"><span>' + label + '</span><b>' + val + '</b>' + (small ? '<small>' + small + '</small>' : '') + '</div>';
}

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
function pressChip(box, attr, v) { box.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset[attr] === v)); }); }
