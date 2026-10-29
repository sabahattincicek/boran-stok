# Boran Stok Satış — Kurallar

- Her oturum açılışında önce `devlog.md` dosyasının **ilk 150 satırını** oku. Son yapılanları oradan öğren; bütün kodu baştan okumaya gerek yok, sadece işin gerektirdiği yerlere bak.
- Her adımda / her değişiklikte `devlog.md`'ye tarih ve saatiyle (YYYY-AA-GG SS:DD) ne yaptığını yaz. **En yeni kayıt en üstte** olsun.
- Uygulama tek sayfa, dosyalara bölünmüş (derleme yok, düz `<script>`): `index.html` sadece kabuk; her sayfa/pencere HTML'i ve kodu kendi dosyasında `js/` (core, store, model, satis, kayitlar, stok, toptanci, gider, yedek, giris, urun, sube, app), stiller `css/`. Fonksiyonlar dosyalar arasında ortak (global).
- Veriler tarayıcıda localStorage'da, şube başına ayrı: ilk şube `boran.v1`, diğerleri `boran.v1.<id>`; şube listesi `boran.meta` içinde `accts`.
