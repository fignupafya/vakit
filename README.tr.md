<div align="center">

[English](README.md) · **Türkçe**

<br>

<img src="app/assets/icon-192.png" width="88" height="88" alt="Vakit simgesi">

# Vakit

T.C. Diyanet İşleri Başkanlığı verileriyle namaz vakitleri:<br>
içinde bulunduğunuz vakit, canlı geri sayım ve bütün yılın takvimi.

### [Uygulamayı aç →](https://fignupafya.github.io/vakit/)

<img src="app/assets/screenshots/desktop-light.png" width="820" alt="Masaüstünde Vakit: şu an öğle vakti; 13:01'de girdi, 16:24'te ikindiyle bitiyor; 1 sa 13 dk kaldı">

</div>

## Neler yapar

- **Günün neresindesiniz?** Ekranın üstünde içinde bulunduğunuz vakit (ör. *Öğle vakti*), ne zaman girdiği,
  ne zaman çıkacağı ve sıradaki vakit yazar; yanında da canlı geri sayım. Tek bakışta şu soruların cevabı:
  hangi vakitteyiz, ne zamana kadar, ne kadar kaldı.
- **Konumunuzu bulur.** İlk açılışta konum izni ister ve Diyanet'in en uygun vakit noktasını seçer. Kendi kaydı
  olmayan ilçelerde il merkezi kullanılır ve bu size söylenir. Başka bir şehre gittiğinizde yeni yere geçmeyi önerir.
- **Takvim.** İstediğiniz ay ya da bütün yıl; hicrî tarihler ve cumalar işaretli. Yılı yazdırınca her ay
  ayrı sayfaya çıkar.
- **Uygulama olarak yüklenir (PWA).** Ana ekrana ekleyin: uygulama gibi açılır, internet yokken de son
  indirilen vakitlerle çalışır.
- **Temalar.** Sistem, açık, koyu ya da *güneşe göre*: güneş doğunca açık, akşam vakti girince koyu.
- **Ramazan.** İftar ve sahur etiketleri, iftara kalan süre ve Ramazan'ın kaçıncı günü olduğu.
- **Sunucuya kurulacak bir şey yok.** Düz HTML, CSS ve JavaScript modülleri: derleme adımı, paket ya da izleme kodu yok.

<p align="center">
  <img src="app/assets/screenshots/mobile-dark.png" height="380" alt="Telefonda koyu tema: akşam vakti, yatsıya 43 dakika var">
  &nbsp;&nbsp;
  <img src="app/assets/screenshots/focus-dark.png" height="380" alt="Duvar ekranı ya da ikinci monitör için Odak düzeni">
</p>

<p align="center">
  <img src="app/assets/screenshots/calendar-light.png" width="820" alt="Takvim sayfası: hicrî tarihlerle bütün ay">
</p>

## Telefona yükleme

| Cihaz | Nasıl |
|---|---|
| Android (Chrome, Edge, Samsung Internet) | Bağlantıyı açın; çıkan öneriden ya da ⋮ menüsünden **Uygulamayı yükle**'yi seçin. Uygulama bunu *Ayarlar → Uygulama* altında da sunar. |
| iPhone / iPad (Safari) | **Paylaş** düğmesine, ardından **Ana Ekrana Ekle**'ye dokunun. |
| Bilgisayar (Chrome, Edge) | Adres çubuğundaki yükleme simgesine tıklayın. |

## Nasıl çalışır

```
vakit API'si (adapter) → servis + önbellek → durum → görünüm modeli → sayfa
tarayıcı konumu → yer adları → veri kaynağındaki konum
```

- Statik bir sitedir: `app/` klasörü uygulamanın tamamıdır. GitHub Pages onu sunar; arka uç yoktur.
- Vakitler, Diyanet verisini yeniden yayımlayan gönüllü bir API'den,
  [ezanvakti.imsakiyem.com](https://ezanvakti.imsakiyem.com)'dan gelir. Uygulama ona bir **adapter** üzerinden
  bağlanır; başka bir kaynağa (ör. Diyanet'in resmî Awqat Salah API'si) geçmek için bir adapter yazıp
  `config.js`'te tek satırı değiştirmek yeter.
- İndirilen aylar tarayıcıda 30 gün saklanır; normal kullanımda günde birkaç istekten fazlası gitmez.
  Service worker uygulamanın kendisini de internetsiz açılabilir tutar.
- **Konum ve gizlilik:** Koordinat yaklaşık 100 m'ye yuvarlanıp yalnızca il ve ilçe adını öğrenmek için
  [BigDataCloud](https://www.bigdatacloud.com)'un ücretsiz servisine gönderilir; bu adlar Diyanet'in listesiyle
  eşleştirilir. Cihazdan başka hiçbir şey çıkmaz.

## Bilgisayarda çalıştırma

```bash
node serve.mjs
```

Ardından <http://127.0.0.1:5317> adresini açın. Windows'ta bunun yerine `Baslat.bat`'a çift tıklayabilirsiniz.
Node.js yalnızca bu küçük yerel sunucu için gerekir; paketi yoktur. `app/` klasörünü sunan herhangi bir statik
sunucu da iş görür. `index.html` dosyası doğrudan açılamaz, çünkü tarayıcılar `file://` üzerinden modül çalıştırmaz.

## Klasör yapısı

```
app/                     web uygulamasının tamamı (GitHub Pages'e yayımlanır)
  index.html
  manifest.webmanifest   PWA: ad, simgeler, kısayollar
  sw.js                  service worker: uygulamanın internetsiz kopyası
  styles/                tokens.css (renkler, yazılar) · base · components · layouts · print
  src/
    app.js               kompozisyon kökü: katmanlar yalnızca burada birleşir
    config.js            veri kaynağı, konum servisi, varsayılanlar
    router.js            #/ (Bugün) · #/takvim · #/takvim/2026-09 · #/takvim/2026
    core/                ne arayüzü ne API'yi bilen mantık
      schedule.js          hangi vakitteyiz, sıradaki ne, ne kadar kaldı (saf fonksiyon)
      prayer-service.js    veri kaynağını önbellekle sarar (ay ve bütün yıl)
    providers/           vakit API'leri için adapter'lar
      contract.js          sağlayıcı sözleşmesi ve veri modeli
      imsakiyem.js         ezanvakti.imsakiyem.com (kullanılan)
      ezanvakti.js         ezanvakti.emushaf.net (yedek)
    location/            tarayıcı konumu → yer adları → veri kaynağındaki konum
    state/               kullanıcı ayarları (tarayıcıda saklanır)
    ui/                  görünüm modeli, kabuk, sayfalar (Bugün: Ferah ve Odak; Takvim), bileşenler
tools/                   simge ve ekran görüntüsü üreticileri
serve.mjs                yerel sunucu (yalnızca Node.js'in kendi modülleri)
```

## Geliştirme

**Başka bir veri kaynağı kullanmak.** `app/src/providers/` altına, `contract.js`'te tarif edilen nesneyi
(`listCountries`, `listRegions`, `listDistricts`, `getTimes`, isteğe bağlı `searchDistricts`) döndüren ve
API'nin yanıtını bu modele çeviren bir fabrika yazın. `providers/index.js`'e ekleyip `config.js`'te `provider`
alanını ona çevirin. Diyanet'in konum kimliklerini kullanıyorsa `idScheme: 'diyanet'` verin; kayıtlı konumlar
geçerli kalır. Resmî Awqat Salah API'si kullanıcı adı ve şifre istediği için tarayıcıdaki koda konamaz;
kendi küçük sunucunuz üzerinden eklenmesi gerekir.

**Bugün ekranına yeni bir düzen eklemek.** `app/src/ui/pages/` altına `{ id, label, hint, create(actions) }`
nesnesini yazıp `pages/index.js`'teki `TODAY_LAYOUTS` listesine ekleyin; Ayarlar'da kendiliğinden görünür.
`create`, `{ el, update(vm) }` döndürür; `update` her saniye görünüm modeliyle çağrılır.

**Simgeler ve ekran görüntüleri.** `node tools/make-icons.mjs` uygulama simgelerini yeniden üretir.
`node tools/screenshots.mjs` bu sayfadaki ekran görüntülerini yeniden çeker (yerel sunucu açıkken).

## İşe yarar adres parametreleri

| Parametre | Ne yapar |
|---|---|
| `?now=2026-09-25T21:30` | Saati sabitler (konumun saatiyle): yatsıdan sonrası |
| `?now=2026-03-10T17:45` | Ramazan: iftara kalan süre |
| `?geo=40.9903,29.0289` | Kadıköy'deymiş gibi davranır; İstanbul (merkez) seçilir |
| `?geo=deny` | Konum izni reddedilmiş gibi davranır |
| `?theme=dark` | O açılış için temayı zorlar |

## Yayın

`main` dalına yapılan her gönderim `app/` klasörünü GitHub Pages'e yayımlar
([`.github/workflows/pages.yml`](.github/workflows/pages.yml)).

## Not

Namaz vakitleri T.C. Diyanet İşleri Başkanlığı tarafından yayımlanır. Bu bağımsız bir projedir;
Diyanet İşleri Başkanlığı ile bağlantısı yoktur ve onun tarafından onaylanmamıştır.
