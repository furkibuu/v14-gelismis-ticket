# v14‑Gelişmiş Ticket Sistemi

Gelişmiş ticket (destek) sistemi — kullanıcıların kolayca destek talepleri oluşturmasını ve yönetmesini sağlar.

## Özellikler
- Ticket açma ve kapatma komutları  
- Rollere göre izin kontrolü  
- Otomatik bildirim ve loglama  
- Özelleştirilebilir yanıt şablonları

## Kurulum
```bash
git clone https://github.com/furkibuu/v14-gelismis-ticket.git
cd v14-gelismis-ticket
npm install
```

## Yapılandırma
`config.json` veya `database.js` dosyasında aşağıdaki alanları doldurun:
| Alan           | Açıklama                  |
|----------------|---------------------------|
| `PREFIX`       | Bot komutlarının öneki    |
| `TOKEN`        | Discord bot token'ı      |
| `TICKET_CATEGORY` | Ticket kanal kategorisi ID'si |
| `LOG_CHANNEL`  | Ticket loglarının gönderileceği kanal ID'si |

## Kullanım
Bot’u şu komutla çalıştırın:
```bash
node index.js
```
Örnek komutlar:
- `!ticket aç mail` – yeni bir ticket oluşturur  
- `!ticket kapat` – mevcut ticket’ı kapatır

## Katkıda Bulunma
Katkı fikirlerinizi memnuniyetle karşılıyoruz! Lütfen bir issue açın veya pull request gönderin.

## Lisans
MIT Lisansı. Detaylar LICENSE dosyasında.

## İletişim
Geliştirici: [furkibuu](https://github.com/furkibuu)
