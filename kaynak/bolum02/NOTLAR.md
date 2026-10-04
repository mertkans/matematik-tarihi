# Bölüm 02 · Mısır Dönemi — devir notları

Kaynak video: https://www.youtube.com/watch?v=fZuenuRBJoc (10:05)

Bu klasörde:
- `video.mp4` — orijinal video (720p). Slayt metinleri için gerektiğinde yüksek çözünürlüklü kare çıkar:
  `node_modules/ffmpeg-static/ffmpeg -ss 00:00:15 -i kaynak/bolum02/video.mp4 -frames:v 1 kare.png`
- `transkript.txt` — anlatımın Whisper (medium) dökümü, zaman damgalı. Özel adlarda hatalar olabilir (ör. "Kajori" = Cajori).
- `kareler/sayfa_*.jpg` — her 10 saniyeden bir kare, 3×3 tablolar, üzerlerinde zaman damgası.
- `bilgi.txt` — başlık | süre | YouTube açıklaması (bölüm başlıkları).

## Yapılacaklar (Bölüm 01 ile aynı akış)
1. Transkript + slaytlardan sahne sahne, ElevenLabs'e uygun Türkçe anlatım metni yaz
   (sayılar yazıyla, M.Ö. → "milattan önce", içerik aynı kalsın, slayttaki yazım hatalarını düzelt).
2. Bölüm 01'in yapısını kopyala: `bolum02/` altında `scenes.json`, `animasyon/index.html` (aynı tasarım dili,
   aynı `vendor/` dosyaları, `cue()` ile metne bağlı zamanlama), `seslendirme_elevenlabs.md`, `seslendirme_tek_parca.txt`.
   `render.mjs` şu an kökteki `scenes.json` ve `animasyon/` yolunu kullanıyor; bölüm klasörünü parametre alacak şekilde genelleştir
   (ör. `--bolum bolum02`), Bölüm 01'i bozmadan.
3. Sessiz videoyu render et → `bolum02/cikti/…_sessiz.mp4`, kullanıcıya ulaştır.
4. Kullanıcı tek parça ses dosyası verirse: Whisper kelime zaman damgalarıyla metne hizala, sahne başlangıçlarından
   12 parçaya böl (`ses/01_….mp3`), `--audio` ile render et (Bölüm 01'de böyle yapıldı).

## Ortam
- `npm install` sonra bulutta Chrome yoksa: `npx playwright-core install --with-deps chromium` (render.mjs otomatik Chromium'a düşer).
- Whisper gerekirse: `pip install faster-whisper`.
