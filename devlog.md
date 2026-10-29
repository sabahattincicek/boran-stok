# Devlog

En yeni kayıt en üstte.

## 2026-10-29 12:10 — Giriş formu: "toplamın içinde" işaretleri, i ipuçları, kırmızı uyarı, binlik nokta
- Sıra: ürünler → Boş palet → Nakliye → Ek giderler → Girişin toplam fiyatı → Şimdi ödediğim → Not. Her blok `.fblk` + başlık `.fh`.
- Boş palet, Nakliye ve her ek gider satırında "toplam fiyatın içinde" kutusu (`#fDepIn` varsayılan işaretli, `#fNakIn`, ek giderde `inc`). İşaretliyse tutar girişin toplam fiyatından düşülür, kalan mal bedeli paylaştırılır (`readForm`: `inSum`, `goods`). Toplam fiyat boşsa işaretliler çeşit fiyatlarının üstüne toptancı borcuna eklenir.
- Veri: `s.nakIn`, `s.depIn`, `cost.inc`. `shipTotal` = mal bedeli + `shipIn` (toptancı borcu). Kayıtlar'da kasa hareketinden sadece ayrı ödenenler düşülüyor (`shipExtraOut`, palet `!depIn`). Nakliye/ek gider her durumda maliyette; palet hiç maliyette değil.
- Boş palet bloğunda çeşitlerden hesaplanan toplam palet sayısı gösteriliyor (`#fPalN`).
- Formdaki açıklama paragrafları kaldırıldı; başlıkların yanında "i" (`.info .tip`), fareyle üstüne gelince ya da tıklayınca açılıyor.
- Hesap tutmayan ya da sayı olmayan kutular kırmızı (`input.bad`, `bad()`): koli/palette koli/palet çelişkisi, çeşit fiyatları ile toplam, palet başı ile toplam, içindekiler toplamdan fazla, ödenen borçtan fazla.
- Formdaki sayı kutularında yazarken binlik nokta (`gnum`, dialog'da capture `input` dinleyicisi); nokta tuşu kuruş virgülü sayılıyor, yapıştırılan sayı düzeltiliyor.
- Yedek: işaretli olanlara `(toplamda)` ekleniyor (`nakliye X tl (toplamda)`, `ek gider X tl (toplamda): …`, `boş palet X tl (toplamda) / iade …`); içe aktarma okuyup toplamdan düşerek paylaştırıyor; `shipSig` güncellendi.
- Örnek veriyle Node'da denendi: 60.000 toplam, içinde 2.000 nakliye + 5×250 palet → mal bedeli 56.750, koliye göre 34.050 / 22.700; yedek yaz-oku aynı.

## 2026-10-29 11:30 — Stok girişine boş palet parası (iade edilecek)
- Giriş formuna yan yana "Boş palet, palet başı (₺)" (`#fDepPer`) ve "Boş palet, toplam (₺)" (`#fDepTot`). Biri yazılınca diğeri çeşitlerdeki palet sayısı toplamından hesaplanıp boş kutuda "= …" görünüyor (`readDep`, `palCount`). Palet sayısı yokken sadece palet başı yazılırsa ya da ikisi tutmazsa hata.
- Girişte `s.dep` (toplam), `s.depPer` (palet başı, bilinmiyorsa null), `s.depPerIn` (palet başı mı yazıldı; düzenlemede o kutu dolu açılır), `s.depBack` (iade tarihi ya da null).
- Maliyete ve toptancı borcuna girmiyor. Giriş günü ödenmiş sayılıyor: Kayıtlar'da Kasa hareketinden giriş tarihinde düşüyor, iade tarihinde geri ekleniyor.
- Giriş kartında "Boş palet parası X (N palet × Y) · İade bekliyor" + tarih kutusu + "İade edildi" butonu; iade edilince tarih ve "Geri al" (`markDep`).
- Kayıtlar > Genel durum'a "İadesi beklenen palet parası" kutusu (hiç palet parası yoksa görünmüyor).
- Yedek: `boş palet X tl` ve iade edildiyse `boş palet X tl / iade GG.AA.YYYY`; içe aktarma okuyor, `shipSig`'e eklendi.

## 2026-10-29 11:05 — Kayıtlar: "Ürünlere göre satış" yerine Stok durumu; satış tablosuna Kâr
- Kayıtlar'daki "Ürünlere göre satış" tablosu (`#rProd`) kaldırıldı, yerine "Stok durumu (şu an)" geldi: marka/çeşit başına Son sayım (koli · tarih) · Sonra giren · Sonra satılan · Şimdiki stok, Toplam satırıyla. Hesap `stockOf` ile aynı; sayım yoksa en baştan. Dönem seçiminden etkilenmiyor.
- `renderRecords` içindeki ürün özeti (`prod`) artık kullanılmadığı için kaldırıldı.
- Satış listesinin üstündeki küçük tabloya "Satış tablosu" başlığı (`.tblh`) ve Kâr sütunu eklendi (koli başı maliyet `unitCost`, satış tarihine göre). Alış fiyatı bilinmeyen çeşit "?", kısmen bilinmeyen "*".

## 2026-10-29 10:50 — Kutu dökümleri geri alındı
- Kullanıcı karışık buldu: Kayıtlar'daki tıklanabilir kutular ve açılan dökümler (aşağıdaki 10:25 ve 10:40 kayıtları) tamamen kaldırıldı. `app.js`, `index.html`, `style.css` commit d9ff3c8 haline döndürüldü; kutular tıklanmıyor. 10:25 ve 10:40 kayıtları artık geçerli değil.

## 2026-10-29 10:40 — Nakliye ve ek giderler Malın maliyeti dökümüne taşındı
- "Malın maliyeti" kutusu da tıklanabilir (`rDet = 'maliyet'`). Döküm: satılan ürün başına Koli · Alış · Nakliye/ek gider · Toplam, Toplam satırı kutudaki tutarla aynı. Fiyatı bilinmeyen koliler * ile not ediliyor.
- Altında dönemin stok girişlerindeki Nakliye ve Ek giderler kalem kalem (tarih, açıklama, tutar), bunların kolilere paylaştırıldığı notuyla.
- Gider dökümünde artık sadece elle girilen giderler var; Gider kutusunun alt yazısındaki "nakliye/ek gider … maliyette" kaldırıldı.
- `unitCostParts` eklendi (koli başı alış ve gider payını ayrı veriyor); `unitCost` onu kullanıyor. Ürün özetinde `buy`, `extra`, `unkKoli` tutuluyor. Ortak grup satırları `detRows`.

## 2026-10-29 10:25 — Kayıtlar: Ek gelir ve Gider kutularına döküm
- Kayıtlar'daki "Ek gelir" ve "Gider" kutularına basınca (ya da Enter) KPI ızgarasının altında döküm açılıyor (`#rDet`, `renderDetail`, durum `rDet`). Aynı kutuya ya da "Kapat"a basınca kapanıyor. Seçili döneme göre.
- Gider dökümü gruplar: Elle girilen giderler (Gelir-Gider sayfası), Nakliye, Stok girişi ek giderleri. Her grubun başında kalem sayısı ve toplamı, altında Tarih · Açıklama · Tutar.
- Ek gelir dökümü: Elle girilen gelirler.
- Nakliye ve ek giderler malın maliyetinde olduğu için Gider kutusunun toplamına katılmıyor (iki kez düşülmesin); dökümde * ile not var, kutunun alt yazısında da "nakliye/ek gider X maliyette" yazıyor.
- `kpi()` 5. parametre `det` alıyor (tıklanabilir kutu). Stil: `.kpi.tap`, `.tbl.det`.
- Önceki iş commit edildi (d9ff3c8).

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
