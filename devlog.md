# Devlog

En yeni kayıt en üstte.

## 2026-10-29 15:20 — Toptancısız giriş kaldırıldı
- Giriş formundaki "Toptancısız" seçeneği kalktı; seçenekler sadece toptancılar ve "+ Yeni toptancı…". Toptancı seçilmeden kaydedilmiyor.
- Toptancısı olmayan eski giriş düzenlenince toptancı kutusu boş ve kırmızı açılıyor, "Bu girişin toptancısı yok; kaydetmek için toptancı seç." yazıyor. Eski girişler silinmedi/değişmedi; görüntüleme, ödeme ve palet iadesi eskisi gibi.
- jsdom denemesi 56 adım geçti.

## 2026-10-29 15:05 — Her ekleme/düzeltme pencereden; listeler tek sütun; palet verdimde "bende kalan"
- Kural (kullanıcı): her ekleme ve düzeltme pencere (dialog) ile yapılır; dinamik listeler tek sütun, tam genişlik.
- Stok sayfasında kalan satır içi formlar pencereye taşındı (`dlgSup`, yeni modlar): "+ Toptancı" (`yeni`), toptancısız girişe "Ödeme yap" (`shpay`), toptancısız girişin palet parası "İade edildi" (`depback`, tarih pencerede). `stNew`, `payOpen`, `openPay`/`savePay`/`markDep` kalktı; geri alma `undoDep`.
- Masaüstündeki ızgaralar kaldırıldı: Son girişler, toptancının girişleri ve stok (marka) listesi her satır tek sütun, tam genişlik.
- Toptancı butonları (+ Ürün girişi, Ödeme yap, Boş palet verdim, Palet parası aldım) ve Tümü'deki (+ Ürün girişi, Sayım gir) `.supacts`: sığdığı kadar yan yana (masaüstünde tek satır, telefonda 2×2).
- Boş palet verdim penceresi: her çeşitte "Verdim" ve "Bende kalan" kutuları; biri yazılınca diğeri "= …" olarak hesaplanıyor. Bende kalan bendekinden fazlaysa hata; 0 verilen çeşit atlanıyor.
- jsdom denemesi 53 adım geçti.

## 2026-10-29 14:30 — Toptancı hesabı: ödemeler toplamdan, palet verme ve para iadesi ayrı, palet fiyatı girişte
- **Toptancı hesabı:** toptancılı girişin tamamı (mal bedeli + nakliye + ek giderler + boş palet parası) toptancı hesabına borç yazılır (`shipDue`, `supAccount`). Ödemeler girişe bağlı değil, `t.pays`'te; toplamdan düşer. "Toplam fiyatın içinde" işaretleri sadece mal bedelinin hesabını etkiler. Giriş formundaki "Şimdi ödediğim" toptancı hesabına ödeme olarak yazılır (not: "giriş günü"); özette "Toptancı hesabına yazılacak" ve "önceki kalan → kalan" var.
- Toptancılı giriş kartında ödeme/kalan yok; "Toptancı hesabına: mal bedeli + nakliye/ek gider + boş palet = X" satırı var. Toptancısız (eski) girişler eski usul: girişe ödeme, ayrı ödenen nakliye/palet giriş günü kasadan.
- Toptancı sayfası baştan: KPI'lar (kalan borç/avans, bu ay alım, bendeki boş palet, palet parası alacağım), butonlar (+ Ürün girişi, Ödeme yap, Boş palet verdim, Palet parası aldım), **Hesap** tablosu (tarih · hareket · borç · ödeme · kalan, en yeni üstte; ödeme satırında sil; giriş satırına dokununca giriş açılır), palet hesabı, ürünler, palet çeşitleri, girişler.
- **Ekleme pencereden:** satır içi ekleme formları kalktı; listelerin başlığındaki butonlar tek bir pencere açıyor (`dlgSup`, `openSd`/`saveSd`): toptancı bilgisi (ad, not, sil), ürün ekle (pencere açık kalır, marka durur), palet çeşidi ekle/düzenle/sil, ödeme, palet verdim, palet parası aldım.
- **Boş palet:** iade iki ayrı kayıt: `t.gives` (tarih, çeşit başına adet) ve `t.refs` (tarih, tutar). `palLedger`: çeşit başına alınan / verdim / bende; verdiğim paletlerin parası en eski alımın fiyatından başlayarak (FIFO) hesaplanıyor, `claim` = bu − geri alınan.
- **Palet fiyatı girişte:** palet çeşidinde fiyat yok (sadece ad). Girişte satır "Bu alımda palet başı" boş gelir, son fiyat öneri olarak (`lastPalPrice`). Tek çeşitte adet boşsa palet sayısı ancak fiyat yazılınca alınır.
- Kayıtlar: kasa hareketinde toptancı ödemeleri `t.pays`'ten, geri alınan palet parası `t.refs`'ten; toptancılı girişlerin nakliye/palet parası kasadan ayrıca düşülmüyor (ödemeyle düşüyor).
- `migrate`: önceki sürümün `rets`'i → `gives` + `refs`; palet çeşidindeki `price` silinir; toptancılı girişin ödemeleri toptancıya taşınır.
- Yedek: `== TOPTANCI HAREKETLERİ ==` (`[ödeme]`, `[palet verdim]` + `palet Ad N adet`, `[palet parası]`, `toptancı`, `tutar`); toptancıda `palet Ad` fiyatsız. Eski `[palet iade]` okunursa ikisine bölünüyor.
- `liveNum` (binlik nokta) core.js'e taşındı, iki pencerede kullanılıyor.
- jsdom denemesi 46 adım geçti (hesap, ikinci giriş + toplamdan ödeme, palet verdim/para aldım FIFO, yedek, önceki sürüm verisinin taşınması).

## 2026-10-29 13:40 — Branch `subeler-toptancilar`: dosyalara bölme, şubeler, toptancılar, palet çeşitleri
- Önceki iş (12:10 kaydı) bu branch'in ilk commit'i olarak kaydedildi.
- **Dosyalara bölündü:** `app.js` ve `style.css` silindi. `js/`: core (yardımcılar, `mountPage`/`mountDialog`), store (localStorage, şubeler), model (ürün/giriş/stok/toptancı hesapları), satis, kayitlar, stok, toptanci, gider, yedek, giris, urun, sube, app (geçiş + başlatma). Her sayfanın ve pencerenin HTML'i kendi dosyasında, yüklenirken `.wrap`/`body`'ye ekleniyor. `css/`: base + sayfa başına dosya. `.gitignore` klasörlere izin veriyor.
- **Şubeler:** en üstte "Şube" seçimi + "Şubeler" penceresi (ekle, ad değiştir, aç, sil — açık şube silinemez). Her şubenin db'si ayrı anahtarda (`acctKey`); mevcut veri "Şube 1" (`boran.v1`) olarak kaldı. Son yedek tarihi şubeye özel (`ameta`). Şube değişince formlar ve seçimler sıfırlanıyor (`switchAcct`).
- **Toptancılar:** `db.sups = [{id, name, note, pids, pals: [{id,name,price}], rets}]`, girişte `s.sup`. Stok sayfasında üstte "Tümü | toptancılar | + Toptancı". Tümü: eski görünüm + Toptancılar tablosu (giriş, borç, palet parası). Toptancı sayfası (`toptanci.js`): borç/alım/palet KPI'ları, + Ürün girişi, Boş palet iade, ürün listesi (ekle/çıkar), palet çeşitleri (ad/fiyat kutuda değişince kaydedilir), palet hesabı tablosu (alınan/iade/bende), iadeler, girişleri.
- **Giriş formu:** Toptancı seçimi (seç / toptancılar / Toptancısız / + Yeni toptancı; seçmeden kaydedilmez). Toptancının listesi varsa marka ve çeşit açılır listeden seçiliyor, "+ Yeni …" ile yazılabiliyor; listede olmayan ürün kaydedince toptancının listesine ekleniyor. Boş palet: toptancının palet çeşitleri satır satır (palet başı + adet; tek çeşitte adet boşsa çeşitlerdeki palet sayısı), "+ Palet çeşidi ekle" ile elle çeşit, kaydedince toptancıya ekleniyor. `s.depLines = [{pal,name,price,n}]`. Çeşit yoksa eski palet başı/toplam kutuları.
- **Palet iadesi:** toptancılı girişlerde iade girişten değil toptancının palet hesabından (`palLedger`, `rets`). Kayıtlar'da kasa hareketine iade tarihinde ekleniyor; "İadesi beklenen palet parası" `depWaiting()`. Toptancısız eski girişlerde "İade edildi" butonu aynen duruyor.
- Sadece toptancı listesinde duran (girişi/satışı/sayımı olmayan) ürünler satışta, stok listesinde ve sayımda görünmüyor (`brands(true)`, `inUse`); `tidy` onları silmiyor.
- **Yedek:** başa `Şube: ad`; `== TOPTANCILAR ==` (`[toptancı]`, `ürün Marka / Çeşit`, `palet Ad 250 tl`), girişte `toptancı Ad` ve `palet Ad 3 x 250 tl`, `== PALET İADELERİ ==` (`[palet iade]`, `toptancı`, `palet …`, `tutar X tl`). İçe aktarma bunları okuyor, başka şubenin yedeğiyse uyarıyor; dosya adı şube adını içeriyor.
- jsdom ile 38 adımlık uçtan uca deneme geçti (eski veri, toptancı, giriş, iade, düzenleme, yedek yaz-oku-tekrar oku, şube geçişi, satış). Tarayıcıda görsel kontrol yapılamadı.

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
