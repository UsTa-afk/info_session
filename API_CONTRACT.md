# API Sözleşmesi

`src/api/client.js` bu belgeyle birebir uyumludur; `src/api/mockServer.js` aynı gövde ve hata kodlarını taklit eder. Sunucu tarafında `src/lib/matching.js` (dağıtım), `src/lib/validate.js` (doğrulama) ve `src/lib/csv.js` (CSV) doğrudan yeniden kullanılabilir.

- Tüm gövdeler `application/json; charset=utf-8` (CSV ucu hariç).
- Zaman damgaları ISO 8601 (UTC).
- Masa kapasitesi **6**, en fazla **12 masa** (72 koltuk). Fazlası bekleme listesine girer.

## Kimlik doğrulama (admin)

Admin uçları `Authorization: Bearer <token>` ister. Token, `POST /api/admin/login` ile alınır (bu uç sözleşmeye yardımcı olarak eklenmiştir). Geçersiz/eksik token → `401`.

### POST /api/admin/login

İstek:
```json
{ "password": "gizli-parola" }
```
Yanıt `200`:
```json
{ "token": "eyJhbGciOi..." }
```
Hatalı parola → `401`.

## Hata formatı

```json
{ "error": { "code": "invalid_data", "message": "Geçersiz veri", "details": { "fields": ["name"] } } }
```

| HTTP | `code` | Ne zaman |
|------|--------|----------|
| 400 | `invalid_data` | İsim boş/çok uzun (>60), cevap eksik veya geçersiz, `tableNumber` geçersiz/yok. `details.fields` hatalı alanları listeler (`name`, `answers.crowd`, `tableNumber` …) |
| 401 | `unauthorized` | Admin token yok/geçersiz, hatalı parola |
| 404 | `not_found` | Katılımcı bulunamadı |
| 409 | `already_registered` | Bu cihaz zaten kayıtlı. `details.participantId` mevcut kaydı verir |
| 409 | `table_full` | Taşıma hedef masası dolu. `details.tableNumber` |

> Masalar doluysa `POST /api/participants` hata **değildir**: `200` ve `status: "waitlist"` döner.

---

## POST /api/participants

Anket cevaplarıyla kayıt olur ve masa atanır. `deviceId` (isteğe bağlı) aynı cihazın ikinci kez katılmasını engeller.

İstek:
```json
{
  "name": "Ayşe",
  "deviceId": "7d9f3c1e-5b52-4a39-9d0e-1c3a8f2b6a10",
  "answers": {
    "crowd": 4,
    "starter": 3,
    "interests": ["tech", "art"],
    "style": "talker",
    "goal": "network",
    "dept": "engineering",
    "friday": "out",
    "drink": "coffee"
  }
}
```
Cevap tipleri: `crowd`, `starter` → tam sayı 1–5; `interests` → en fazla 2 değerli dizi (`tech|art|sport|startup|musicGame`); `style` → `listener|talker|funny`; `goal` → `network|friend|learn`; `dept` → opsiyonel (`engineering|business|design|science|social|other`); `friday` → `home|game|out|study`; `drink` → `coffee|tea|cold|energy`.

Yanıt `201` (masaya oturdu):
```json
{
  "id": "ulq2k8f1a",
  "name": "Ayşe",
  "status": "seated",
  "tableNumber": 3,
  "tablemates": [{ "id": "ulq2k7zz0", "name": "Mehmet" }, { "id": "ulq2k80b2", "name": "Elif" }],
  "theme": "Teknoloji meraklıları 🚀",
  "iceBreaker": "Hayatını en çok kolaylaştıran uygulama hangisi, neden?"
}
```
`tablemates` kişinin kendisini içermez.

Yanıt `200` (masalar dolu):
```json
{
  "id": "ulq2k8f1b",
  "name": "Can",
  "status": "waitlist",
  "waitlistPosition": 2,
  "tableNumber": null,
  "tablemates": [],
  "theme": null,
  "iceBreaker": null
}
```

Hatalar: `400 invalid_data`, `409 already_registered`:
```json
{ "error": { "code": "already_registered", "message": "Bu cihaz zaten kayıtlı", "details": { "participantId": "ulq2k8f1a" } } }
```

## GET /api/participants/:id

Kaydın **güncel** durumunu verir (admin taşıma/yeniden dağıtma sonrası masa değişebilir; tablemates güncellenir). Yanıt `200`, `POST /api/participants` ile aynı şekil (`seated` ya da `waitlist`). Bilinmeyen id → `404 not_found`.

## GET /api/tables

Tüm masalar ve bekleme listesi (projektör görünümü ve admin paneli kullanır). Yanıt `200`:
```json
{
  "tables": [
    {
      "number": 1,
      "capacity": 6,
      "count": 5,
      "theme": "Karma çılgınlar 🎲",
      "members": [{ "id": "ulq2k8f1a", "name": "Ayşe" }, { "id": "ulq2k7zz0", "name": "Mehmet" }]
    }
  ],
  "waitlist": [{ "id": "ulq2k8f1b", "name": "Can", "position": 1 }],
  "totals": {
    "participants": 31,
    "seated": 30,
    "waitlisted": 1,
    "tableCount": 5,
    "capacity": 72,
    "occupancy": 0.417
  }
}
```
`occupancy` = `seated / capacity` (0–1). Bu uç herkese açıktır ve yalnızca isim içerir; gizlenmesi gerekirse admin korumasına alınabilir.

## PATCH /api/participants/:id/table  🔒 admin

Kişiyi başka masaya taşır (bekleme listesindeki kişi de masaya alınabilir). Kapasite kontrolü sunucudadır.

İstek:
```json
{ "tableNumber": 4 }
```
Yanıt `200`: güncel katılımcı (`GET /api/participants/:id` şekli):
```json
{
  "id": "ulq2k8f1a",
  "name": "Ayşe",
  "status": "seated",
  "tableNumber": 4,
  "tablemates": [{ "id": "ulq2k7zz0", "name": "Mehmet" }],
  "theme": "Karma çılgınlar 🎲",
  "iceBreaker": "Üç kelimeyle kendini anlat, masa tahmin etsin! 🎲"
}
```
Hatalar: `400 invalid_data` (olmayan/geçersiz masa), `401`, `404` (katılımcı), `409 table_full`.

## DELETE /api/participants/:id  🔒 admin

Katılımcıyı sistemden tamamen siler. Oturduğu masadaki yer boşalır; eğer bekleme listesindeyse kalan bekleyenlerin sırası güncellenir. Bu kişinin cihazı tekrar kayıt olabilir hale gelir.

Yanıt `200`:
```json
{
  "status": "ok",
  "deleted": { "id": "ulq2k8f1a", "name": "Ayşe" }
}
```
Hatalar: `401 unauthorized`, `404 not_found`.

## POST /api/admin/rebalance  🔒 admin

Herkesi (masadakiler + bekleyenler) toplu dağıtım algoritmasıyla baştan dağıtır. Katılım sırası korunur (72'den fazlaysa son gelenler bekleme listesine girer). Elle yapılan taşımalar sıfırlanır. Gövde gerekmez.

Yanıt `200`:
```json
{
  "status": "ok",
  "tables": [ { "number": 1, "capacity": 6, "count": 6, "theme": "…", "members": [ { "id": "…", "name": "…" } ] } ],
  "waitlist": [],
  "totals": { "participants": 30, "seated": 30, "waitlisted": 0, "tableCount": 5, "capacity": 72, "occupancy": 0.417 }
}
```

## POST /api/admin/reset  🔒 admin

Tüm katılımcıları ve yerleşimi siler. **Geri alınamaz.** Gövde gerekmez.

Yanıt `200`:
```json
{ "status": "ok" }
```
(Silinen katılımcıların `GET /api/participants/:id` çağrısı `404` döner; istemci bu durumda hoş geldin ekranına döner.)

## GET /api/admin/export.csv  🔒 admin

Yanıt `200`, `Content-Type: text/csv; charset=utf-8`. Satır sonu CRLF, ayraç virgül. `=`, `+`, `-`, `@` ile başlayan hücrelerin başına `'` eklenir (CSV formül enjeksiyonu koruması). İstemci Excel için dosyanın başına BOM ekler.

```csv
id,name,status,table_number,waitlist_position,joined_at,crowd,starter,interests,style,goal,dept,friday,drink
ulq2k8f1a,Ayşe,seated,3,,2026-10-10T12:30:11.000Z,4,3,tech;art,talker,network,engineering,out,coffee
ulq2k8f1b,Can,waitlist,,1,2026-10-10T12:41:02.000Z,2,2,sport,listener,friend,,home,tea
```

## GET /api/health

Kimlik doğrulama gerektirmez. Yanıt `200`:
```json
{ "status": "ok", "time": "2026-10-10T12:45:00.000Z" }
```
