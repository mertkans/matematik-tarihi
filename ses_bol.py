"""Tek parça seslendirmeyi sahnelere böler.

Kullanım:
  python3 ses_bol.py bolum02 seslendirme.mp3          → bolum02/ses/01_giris.mp3 … 15_kapanis.mp3
  python3 ses_bol.py bolum02 parca1.wav parca2.wav parca3.wav   → parçalar sırayla birleştirilir
  python3 ses_bol.py . ses/video1.mp3                 → Bölüm 01 (kök klasör)

Whisper (faster-whisper) kelime zaman damgalarını scenes.json metniyle hizalar,
her sahnenin ilk kelimesinden hemen önceki sessizliğin ortasından keser.
Gerekenler: pip install faster-whisper
"""
import json, os, re, subprocess, sys, difflib
from pathlib import Path

ROOT = Path(__file__).resolve().parent
base = (ROOT / sys.argv[1]).resolve()
FF = str(ROOT / 'node_modules/ffmpeg-static/ffmpeg')
model_name = os.environ.get('WHISPER_MODEL', 'medium')
inputs = [Path(a).resolve() for a in sys.argv[2:]]
if len(inputs) == 1:
    src = inputs[0]
else:  # birden çok parça: sırayla tek dosyada birleştir
    src = base / 'ses_birlesik.wav'
    cmd = [FF, '-y', '-hide_banner', '-loglevel', 'error']
    for f in inputs: cmd += ['-i', str(f)]
    cmd += ['-filter_complex', ''.join(f'[{i}:a]' for i in range(len(inputs))) + f'concat=n={len(inputs)}:v=0:a=1[a]', '-map', '[a]', '-ar', '48000', str(src)]
    subprocess.run(cmd, check=True)

scenes = json.loads((base / 'scenes.json').read_text('utf8'))
TR = str.maketrans('İIÂÎÛ', 'iıâîû')
norm = lambda w: re.sub(r"[^\wçğıöşüâîû]", '', w.translate(TR).lower())

# metin kelimeleri ve sahne başlangıç indeksleri
script, starts = [], []
for sc in scenes:
    starts.append(len(script))
    script += [n for n in (norm(w) for w in sc['text'].split()) if n]

# Whisper
cache = src.with_suffix('.kelimeler.json')
if cache.exists():
    words = json.loads(cache.read_text('utf8'))
else:
    from faster_whisper import WhisperModel
    m = WhisperModel(model_name, device='cpu', compute_type='int8')
    segs, _ = m.transcribe(str(src), language='tr', word_timestamps=True, vad_filter=False,
                           initial_prompt=' '.join(sc['text'] for sc in scenes)[:800])
    words = [{'w': w.word, 's': w.start, 'e': w.end} for sg in segs for w in sg.words]
    cache.write_text(json.dumps(words, ensure_ascii=False), 'utf8')
heard = [norm(w['w']) for w in words]

# hizalama
sm = difflib.SequenceMatcher(None, script, heard, autojunk=False)
s2h = {}
for a, b, n in sm.get_matching_blocks():
    for k in range(n): s2h[a + k] = b + k
print(f'Eşleşen kelime: {len(s2h)}/{len(script)}')

def heard_index(si):
    # sahnenin ilk birkaç kelimesinden eşleşen ilkini bul, kaydırmayı geri al
    for k in range(8):
        if si + k in s2h: return max(0, s2h[si + k] - k)
    raise SystemExit(f'Sahne başlangıcı bulunamadı (kelime {si}: {script[si]})')

cuts = [0.0]
for si in starts[1:]:
    hi = heard_index(si)
    prev_end = words[hi - 1]['e'] if hi > 0 else 0
    cuts.append(round((prev_end + words[hi]['s']) / 2, 3))

out = base / 'ses'; out.mkdir(exist_ok=True)
for i, sc in enumerate(scenes):
    a = cuts[i]; b = cuts[i + 1] if i + 1 < len(cuts) else None
    name = sc.get('file') or '%02d_%s' % (i + 1, sc['id'])
    f = out / (name + '.mp3')
    cmd = [FF, '-y', '-hide_banner', '-loglevel', 'error', '-i', str(src), '-ss', str(a)] + (['-to', str(b)] if b else []) + ['-c:a', 'libmp3lame', '-q:a', '2', str(f)]
    subprocess.run(cmd, check=True)
    print(f'{f.name:28s} {a:8.2f} → {b if b else "son"}')
