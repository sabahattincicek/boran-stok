# Devlog

En yeni kayıt en üstte.

## 2026-10-28 09:25 — Tahsilat ödeme tarihine göre sayılıyor; md dosyaları repoda
- Kayıtlar raporunda "Tahsil edilen" (nakit/havale ayrımı ve Kasa hareketi dahil) artık paranın alındığı tarihe göre sayılıyor. Satış anında ödenen kısım satış gününe, sonraki tahsilatlar (`s.cols`) kendi tarihine yazılıyor (`saleCollected`).
- "Alacak" KPI'si yine dönemin satışlarının kalan borcu (`S.rem`), tahsilattan bağımsız hesaplanıyor.
- Satış sayfasındaki günlük "Alınan" özeti değişmedi (o günün satışlarından alınan).
- `.gitignore`'a `CLAUDE.md` ve `devlog.md` eklendi.

## 2026-10-28 09:19 — Satış tahsilatı: tutar + tarih, borçlu listesinde Yenile
- Ödenmemiş satış kartına "Ödendi" butonunun yanına tutar kutusu (varsayılan: kalan alacak) ve ödeme tarihi (varsayılan: bugün) eklendi. Eksik ödeme girilirse satış borçlu kalır, kalan güncellenir.
- Her tahsilat satışta `s.cols = [{date, amount}]` olarak tutuluyor; `s.paid` toplam ödeneni tutmaya devam ediyor (eski kayıtlar bozulmaz). Kartta tahsilat satırları ve "Ödendi · tarih" görünüyor.
- Kayıtlar > Borçlu filtresinde ödendi işaretlenen satış listeden düşmüyor (`rKeep`); "↻ Yenile" butonuna basınca ya da filtre değişince düşüyor.
- Yedek metnine `tahsilat GG.AA.YYYY tutar tl` satırları eklendi, içe aktarma bunları okuyor.
- Değişen yerler: `app.js` (saleHTML, markPaid, renderRecordList, exportText, parse/applyImport), `index.html` (#rRefresh), `style.css` (.cols, .colf, .refresh).
- `CLAUDE.md` ve bu dosya oluşturuldu.
