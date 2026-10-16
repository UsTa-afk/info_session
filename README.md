# Info Session — Masa Eşleştirme ☕

Bu proje, bir kafede gerçekleştirilen ilk topluluk etkinliği için geliştirilmiş bir masa eşleştirme uygulamasıdır. Katılımcılar telefonlarından veya web üzerinden uygulamaya girip 8 soruluk bir anketi doldurur. Sistem, verilen cevaplara göre katılımcıları "en uyumlu" ve "çeşitlilik açısından en dengeli" karma masalara otomatik olarak atar. 

Hem modern bir kullanıcı arayüzü (Frontend) hem de Postgres tabanlı bir API (Backend) içerir. Canlı sürüm Vercel + Neon üzerinde çalışır.

---

## 🚀 Canlı Yayın & Hızlı Erişim

Uygulama Vercel üzerinde aktiftir. Aşağıdaki linklere tıklayarak veya QR kodları telefonunuzun kamerasıyla okutarak hemen deneyebilirsiniz:

| 📱 Katılımcı Uygulaması (Masanı Bul) | 🔐 Yönetici Paneli (Admin) |
| :---: | :---: |
| [![Info Session · Masanı Bul](docs/qr/qr-app.png)](https://info-session-psi.vercel.app/) | [![Admin · Info Session](docs/qr/qr-admin.png)](https://info-session-psi.vercel.app/admin) |
| 👉 **[Info Session · Masanı Bul](https://info-session-psi.vercel.app/)** | 👉 **[Admin · Info Session](https://info-session-psi.vercel.app/admin)** |
| *Katılımcıların 8 soruluk anketi doldurup masasını öğrendiği ana ekran* | *Masa dağılımları, canlı doluluk, kişi taşıma, silme ve projektör görünümü* |

---

## İçindekiler
1. [Canlı Yayın & Hızlı Erişim](#-canlı-yayın--hızlı-erişim)
2. [Ekran Görüntüleri](#ekran-görüntüleri)
3. [Kullanılan Teknolojiler](#kullanılan-teknolojiler)
4. [Özellikler ve Şu Anki Durum](#özellikler-ve-şu-anki-durum)
5. [Proje Yapısı](#proje-yapısı)
6. [Yerel Kurulum ve Çalıştırma](#yerel-kurulum-ve-çalıştırma)
7. [Ortam Değişkenleri (.env)](#ortam-değişkenleri-env)
8. [Eşleştirme Algoritması](#eşleştirme-algoritması)
9. [Canlıya Alma Rehberi (Deployment)](#canlıya-alma-rehberi-deployment)
10. [Bilinen Eksikler](#bilinen-eksikler)

---

## Ekran Görüntüleri
> *Buraya eklenecek: Uygulamanın ana ekranı, anket arayüzü ve admin panelinin ekran görüntüleri.*

---

## Kullanılan Teknolojiler

| Bölüm | Teknoloji | Açıklama |
|---|---|---|
| **Frontend** | React (v19) + Vite (v8) | Modern ve hızlı arayüz kütüphanesi. |
| **Stil / UI** | Tailwind CSS (v4) + Framer Motion | Hızlı biçimlendirme ve akıcı animasyonlar. |
| **Backend** | Node.js + Express (v5) | API; Vercel serverless fonksiyonu olarak çalışır. |
| **Veritabanı** | Neon Postgres (`pg`) | Serverless uyumlu, kalıcı Postgres. Yerleştirme işlemleri advisory lock ile sıraya alınır. |
| **Doğrulama (Validation)**| Zod | Gelen isteklerin yapısal bütünlüğünü doğrulamak için (tip güvenliği). |
| **Test** | Vitest + Supertest + PGlite | Frontend mantığı ve backend API entegrasyon testleri (süreç içi Postgres ile). |
| **Barındırma** | Vercel + Neon | Frontend + API tek projede, veritabanı Neon Frankfurt. |


---

## Özellikler ve Şu Anki Durum

| Özellik | Durum |
|---------|-------|
| 🎨 **Kullanıcı Arayüzü (UI)** | ✅ Tamamlandı (Responsive, modern, açık/koyu tema) |
| 📊 **Anket ve Eşleştirme Mantığı** | ✅ Tamamlandı (8 soru, akıllı puanlama) |
| 💾 **Backend ve Veritabanı** | ✅ Tamamlandı (Express + Neon Postgres, transaction + advisory lock) |
| 🔒 **Admin Paneli & Güvenlik** | ✅ Tamamlandı (Token tabanlı doğrulama, IP Rate Limit, kişi silme, masa taşıma ve canlı 30 kişilik test simülasyonu) |
| 📱 **Geç Gelenler (Latecomer)** | ✅ Tamamlandı (Dolu masalara karışmadan boş yere veya bekleme listesine) |
| 🧪 **Otomatik Testler** | ✅ Tamamlandı (Frontend ve Backend testleri geçiyor) |

---

## Proje Yapısı

Proje Frontend (`src/`), Vercel fonksiyon girişi (`api/`) ve Backend kodu (`backend/`) olarak ayrılmıştır. Tüm bağımlılıklar kökteki tek `package.json` içindedir:

```text
info-session/
├── README.md               # Projenin ana dokümantasyonu
├── API_CONTRACT.md         # Frontend ve Backend arasındaki iletişim kuralları
├── package.json            # Tüm bağımlılıklar ve scriptler (frontend + backend)
├── vite.config.js          # Vite ayarları, test ayarları ve yerel API proxy'si
├── vercel.json             # Vercel yönlendirmeleri ve fonksiyon bölgesi (fra1)
├── .env.example            # Frontend için örnek ortam değişkenleri
├── api/
│   └── index.js            # Vercel serverless giriş noktası (Express uygulamasını dışa aktarır)
├── src/                    # Frontend Kodları
│   ├── api/                # Backend iletişimi (client.js ve mockServer.js)
│   ├── components/         # Yeniden kullanılabilir UI bileşenleri
│   ├── lib/                # Eşleştirme algoritması (matching.js) ve testleri
│   └── pages/              # Sayfalar (Admin, Home, Result vb.)
└── backend/                # Backend Kodları
    ├── .env.example        # Backend için örnek ortam değişkenleri
    ├── src/
    │   ├── server.js       # Express uygulaması
    │   ├── db.js           # Postgres bağlantısı (pg / testte PGlite)
    │   ├── routes/         # API uç noktaları (admin.js, participants.js, tables.js)
    │   └── services/       # İş mantığı (placement.js vb.)
    └── tests/              # Backend entegrasyon testleri
```

---

## Yerel Kurulum ve Çalıştırma

Projeyi bilgisayarınızda çalıştırmak için NodeJS (v20+) kurulu olmalıdır. Backend ve frontend **tek bir `package.json`** kullanır.

### 1. Bağımlılıkları kurun
Kök dizinde:
```bash
npm install
```

### 2. Backend'i başlatın
API için bir Postgres veritabanı gerekir (örn. ücretsiz bir Neon veritabanı). `backend/.env` dosyasına `DATABASE_URL` ve `ADMIN_PASSWORD` yazın, sonra:
```bash
npm run dev:api
```
*(API varsayılan olarak `http://localhost:3000` portunda çalışır. Tablo ilk istekte otomatik oluşturulur.)*

### 3. Frontend'i başlatın
Farklı bir terminalde:
```bash
npm run dev
```
*(Frontend `http://localhost:5173` portunda açılır ve `/api` isteklerini otomatik olarak 3000 portuna yönlendirir.)*

### 4. Diğer Yararlı Komutlar (Kök Dizinde)
- `npm test`: Frontend ve backend (API) testlerini çalıştırır. Backend testleri gerçek veritabanı gerektirmez; süreç içi Postgres (PGlite) kullanır.
- `npm run seed`: Rastgele test verisi (katılımcı) üretir. (Örn: `npm run seed 30` ile 30 kişi)
- `npm run build`: Projenin üretime (production) hazır halini derler.

---

## Ortam Değişkenleri (.env)

Güvenlik sebebiyle parolalar asla kod içine yazılmaz. Yerelde kök dizinde `.env` (frontend) ve `backend/.env` (API) dosyaları kullanılır; Vercel'de bu değerler panelden girilir.

**Kök Dizin (Frontend) `.env` Değişkenleri:**
| Değişken Adı | Açıklama | Örnek Değer |
|--------------|----------|-------------|
| `VITE_USE_MOCK` | Backend olmadan sahte verilerle test etmek için `true` yapılır. Gerçek kullanımda `false` olmalıdır. | `false` |
| `VITE_API_BASE_URL` | İsteklerin gönderileceği ana adres. Vercel'de **boş bırakılır** (API aynı alan adında). Yerelde boşsa Vite proxy'si `localhost:3000`'e yönlendirir. | *(boş)* |
| `VITE_ADMIN_PASSWORD` | Sadece Mock (sahte) modda test ederken kullanılan admin şifresi. | *(İstediğiniz bir şifre)* |

**Backend (`backend/.env` ve Vercel) Değişkenleri:**
| Değişken Adı | Açıklama | Örnek Değer |
|--------------|----------|-------------|
| `DATABASE_URL` | Postgres bağlantı adresi. Vercel'de Neon entegrasyonu otomatik ekler. | `postgres://...` |
| `ADMIN_PASSWORD` | **Gerçek Admin Paneli parolası.** Güçlü bir şifre seçmelisiniz. | *(Güçlü bir şifre)* |
| `PORT` | Yerelde API sunucusunun portu. | `3000` |
| `FRONTEND_ORIGIN` | (İsteğe bağlı) Frontend farklı bir alan adındaysa CORS izni; virgülle birden fazla eklenebilir. Vercel'de gerekmez. | `http://localhost:5173` |

---

## Eşleştirme Algoritması ve Etkinlik Akışı

Eşleştirme mantığı `src/lib/matching.js` içerisinde yer alır ve algoritma katılımcıların 8 farklı soruya verdiği yanıtları bir **vektör** olarak değerlendirir.

1. **Katılımcı Vektörü:** Sosyallik puanı (`social ∈ [-1,1]`), ilgi alanları, sohbet tarzı, etkinlik beklentisi ve bölüm gibi veriler işlenir.
2. **Bekleme Havuzu ve Toplu Dağıtım (Batch Matching):** Katılımcılar testi çözdüklerinde önce güvenli bir bekleme havuzuna (`waiting`) alınır ve ekranlarında *"Cevapların kaydedildi, masalar birazdan dağıtılacak"* bilgisi yer alır. Admin panelinden **"✨ Masaları Dağıt"** butonuna basıldığında, havuzdaki tüm katılımcılar tek seferde algoritmaya girer. Birbirine en uzak profiller farklı masalara tohum (seed) olarak dağıtılır, ardından greedy yerleştirme ve yüzlerce swap (yerel iyileştirme) adımıyla dengeli masalar kurulur. Katılımcıların ekranları otomatik polling ile anında güncellenir ve masalarını gösterir.
3. **Puanlama Kriterleri:**
   - Masadaki **ortak ilgi alanı** fazlalığı (+ puan)
   - İçe/Dışa dönüklük oranının **dengeli** olması (+ puan)
   - İnsanların farklı sohbet tarzlarında olması (çeşitlilik) (+ puan)
   - Birebir aynı bölümde olan kişilerin aynı masada fazlaca kümelenmemesi (- puan)
4. **Geç Gelenler (Latecomer):** İlk toplu dağıtımdan sonra gelen katılımcılar (`placeLatecomer`), mevcut oturan kimsenin yerini değiştirmeden kendilerine karakter ve ilgi alanı bakımından en uyumlu boş masaya anında yerleştirilir.
5. **Kapasite ve Bekleme Listesi:** Varsayılan olarak maksimum masa sayısı 12, masa başı kapasite 6'dır (Toplam 72 kişi). 72 kişiden sonra gelenler "Bekleme Listesi" (Waitlist) sırasına alınır.

---

## Canlıya Alma Rehberi (Deployment)

Proje tek bir **Vercel** projesi olarak yayınlanır: frontend statik dosyalar, backend ise `api/index.js` üzerinden Vercel serverless fonksiyonu olarak çalışır. Veritabanı **Neon Postgres**'tir.

1. **Vercel projesi:** vercel.com'da GitHub reposunu içe aktarın (Framework: Vite, Build: `npm run build`, Output: `dist`).
2. **Veritabanı:** Vercel panelinden Neon'u (Marketplace) projeye bağlayın. `DATABASE_URL` otomatik eklenir. Özel önek (prefix) alanını **boş** bırakın.
3. **Ortam değişkenleri:** `ADMIN_PASSWORD` (güçlü bir parola) ve `VITE_USE_MOCK=false` ekleyin. `VITE_ADMIN_PASSWORD` **eklenmez** (tarayıcı paketine gömülür).
4. **Bölge:** `vercel.json` içindeki `regions: ["fra1"]` fonksiyonları Frankfurt'a alır (Neon ile aynı bölge, düşük gecikme).
5. **Deploy:** Git push ile otomatik ya da `npx vercel deploy --prod --yes` ile elle.
6. **Kontrol:** `https://<proje>.vercel.app/api/health` → `{"status":"ok"}`.

Frontend ve API aynı alan adında olduğundan CORS ayarı gerekmez.

---

## Bilinen Eksikler
- **Gerçek zamanlı güncellemeler:** Masalardaki güncellemeleri Admin paneli her 15 saniyede bir çekmektedir. Çok büyük bir katılımcı trafiğinde WebSockets/Server-Sent Events'e (SSE) geçilmesi gerekebilir.
