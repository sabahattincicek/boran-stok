# Devlog

En yeni kayıt en üstte.

## 2026-10-29 10:12 — Satış özeti tablosu tam genişlik
- `.tbl.sum`'daki 520px genişlik sınırı kaldırıldı; masaüstünde de listeyle aynı genişlikte. Küçük yazı ve dar satır aralığı aynı kaldı.

## 2026-10-29 10:05 — Kayıtlar > Satışlar listesinin üstüne koli sayısı ve çeşit özeti
- Liste üstündeki sayım satırına (`#rCount`) toplam koli eklendi: "N satış · X koli · tutar · alacak".
- Altına küçük bir özet tablo (`#rSum`, `.tbl.sum`): çeşit başına Koli · Tutar · Ort. koli fiyatı, Toplam satırıyla. Dönem, Borçlu/Nakit/Havale filtresi ve aramaya göre değişiyor (`renderRecordList`). Sıra marka/çeşit sırası; silinmiş ürünler sona ekleniyor.

## 2026-10-29 09:50 — Giriş formunda Kaydet'in üstünde genel özet
- `calc` içindeki alt özet (`#fCalc`, Not'un altında, Kaydet'in üstünde) genişletildi: birden fazla çeşitse çeşit tablosu (Koli · Maliyet · Koli başı, Toplam satırıyla; maliyet = fiyat + nakliye/ek gider payı, `.tbl` stili).
- Altında: çeşit · koli · palet sayısı (paleti bilinmeyen çeşit sayısı), mal bedeli (toptancıya), nakliye + ek gider, toplam maliyet, ortalama koli başı maliyet, şimdi ödenen / kalan borç.
- Fiyatı olmayan çeşit varsa uyarı; toplam ve ortalama onlarsız hesaplanıyor.

## 2026-10-29 09:34 — Stok girişine nakliye ve ek giderler
- Giriş formuna "Nakliye (₺)" (`#fNak`, `s.nak`) ve istendiği kadar satır eklenebilen "Ek gider" listesi (`#fCosts`, `#fAddCost`, `s.costs = [{desc, amount}]`) eklendi. Açıklama boşsa "Ek gider" yazılıyor.
- Nakliye + ek giderlerin toplamı çeşitlere koli sayısına göre dağıtılıyor (`extraShares`, `spread` ile), her girişte `e.extra` olarak tutuluyor. Koli başı maliyet artık `(total + extra) / koli` (`unitCost`).
- Bu giderler toptancı borcuna (`shipTotal`) eklenmiyor; giriş günü ödenmiş sayılıp Kayıtlar'daki "Kasa hareketi"nden düşülüyor, "Stok alımı" kutusunda ayrıca yazıyor (`shipExtra`).
- Giriş kartında giderler listeleniyor; çeşit satırında "giderle koli" fiyatı görünüyor. Formda her çeşidin altında gider payı ve giderle koli başı görünüyor.
- Yedek: `nakliye X tl` ve `ek gider X tl: açıklama` satırları; içe aktarma okuyup dağıtımı tekrar yapıyor, `shipSig`'e eklendi.

## 2026-10-29 09:29 — Stok girişi: koli esas, palet bilgi; girişin toplam fiyatı ve paylaştırma
- Her çeşitte üç kutu var: Toplam koli, Palette koli, Palet sayısı. Hangisi boşsa diğer ikisinden hesaplanıyor; hesaplanan değer boş kutuda "= …" diye görünüyor. Sadece biri yazılırsa palette koli ürünün son girişinden alınıyor. Üçü yazılır ve tutmazsa kayıt hata veriyor (`readRow`).
- Stok artık `e.koli` üzerinden sayılıyor (`palet × kpp` değil). `migrate` eski girişlere `koli` ekliyor. `kpp`/`palet` boş kalabilir (null).
- Formda "Girişin toplam fiyatı" (`#fTotal`, ship'te `s.total`) eklendi. Yazılırsa, fiyatı yazılan çeşitler düşülüp kalan para fiyatı boş çeşitlere koli sayısına göre paylaştırılıyor (koli başı aynı); kuruş artığı sondakine ekleniyor (`spread`). Paylaştırılan satırlarda `e.auto = true`; kartlarda "pay" diye gösteriliyor, düzenlemede bu kutular boş açılıyor.
- Çeşit fiyatları toplamdan fazlaysa, ya da hepsinin fiyatı yazılı olup toplam tutmuyorsa hata.
- Yedek: koli satırı palet yoksa sadece "216 koli"; paylaştırılan çeşitlerin "toplam" satırı yazılmıyor, girişin sonuna "giriş toplamı X tl" ekleniyor. İçe aktarma bunları okuyor ve paylaştırmayı tekrar yapıyor; `shipSig` koli + kpp + giriş toplamıyla çalışıyor.
- Değişen yerler: `app.js` (migrate, stockOf, tidy, costTable/unitCost, lineKoliTxt, entHTML, shipHTML, giriş formu, exportText, parseBackup, shipSig, applyImport), `index.html` (#fTotal), `style.css` (.grid3).

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
