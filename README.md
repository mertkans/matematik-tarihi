# Matematik Tarihi · Giriş — Animasyon

| Dosya | Ne işe yarar |
|---|---|
| `cikti/matematik_tarihi_giris_sessiz.mp4` | 1920×1080, 30 fps sessiz animasyon (~5,5 dk) |
| `seslendirme_elevenlabs.md` | ElevenLabs için sahne sahne seslendirme metni + kullanım |
| `seslendirme_tek_parca.txt` | Aynı metin, tek parça düz yazı |
| `scenes.json` | Sahne metinleri ve süreleri (tek doğruluk kaynağı) |
| `animasyon/index.html` | Animasyonun kaynağı — tarayıcıda açıp oynatabilir, ileri/geri sarabilirsiniz |
| `render.mjs` | Kare kare MP4 üretir |

## Komutlar

```bash
npm run render          # sessiz videoyu yeniden üretir
npm run render:ses      # ses/01_….mp3 … ses/12_….mp3 dosyalarına göre senkronlar ve sesi gömer
node render.mjs --stills 30,95,200   # belirli saniyelerden kontrol kareleri (cikti/kare_*.png)
```

Metni değiştirirseniz `scenes.json` içindeki `text` alanını düzenleyin; görseller metindeki ilgili
kelimelerin geçtiği ana göre otomatik zamanlanır. Render için Google Chrome yüklü olmalıdır.

---

# Bölüm 02 · Mısır Dönemi

Her şey `bolum02/` klasöründe; animasyon kökteki `animasyon/vendor/` dosyalarını kullanır.

| Dosya | Ne işe yarar |
|---|---|
| `bolum02/scenes.json` | 15 sahnenin anlatım metni ve tahmini süreleri |
| `bolum02/animasyon/index.html` | Animasyonun kaynağı (tarayıcıda açılabilir) |
| `bolum02/seslendirme_elevenlabs.md` | Sahne sahne seslendirme metni, dosya adları, sessiz videodaki zamanlar |
| `bolum02/seslendirme_tek_parca.txt` | Aynı metin, tek parça |

```bash
npm run render:02                                   # sessiz video → bolum02/cikti/matematik_tarihi_misir_donemi_sessiz.mp4
python3 ses_bol.py bolum02 ~/Downloads/misir.mp3    # tek parça sesi bolum02/ses/01_… 15_… olarak böler
npm run render:02:ses                               # sesli video → bolum02/cikti/matematik_tarihi_misir_donemi_sesli.mp4
node render.mjs --bolum bolum02 --stills 30,95      # kontrol kareleri
```
