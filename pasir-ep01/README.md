# PASIR — Episode 01: ALARM

Video animasi 3D sinematik (mystery thriller) untuk **KepoMisteri** — POV **Nando** (sebelumnya "Onel").

| | |
|---|---|
| File utama | `final_video.mp4` (1920×1080, 16:9, 30 fps, H.264 + AAC, durasi **3:15**) |
| Subtitle | `subtitle.srt` (Bahasa Indonesia) — juga sudah *burn-in* di video |
| Naskah VO | `vo/VOICE_SCRIPT_ElevenLabs.txt` (36 baris, ±1.150 karakter) |
| Konfigurasi | `project.config.json` |
| Manifest aset | `ASSET_MANIFEST.md` |

## Isi video (7 scene, 61 shot)

| Scene | Waktu | Lokasi |
|---|---|---|
| 01 Hari yang Biasa | 00:00–00:26.9 | Lapangan golf (bumper logo KepoMisteri, swing, notifikasi alarm) |
| 02 Tidak Ada Jawaban | 00:26.9–00:51.9 | Lapangan golf (telepon Papa, telepon satpam, kunci mobil) |
| 03 Perjalanan Pulang | 00:51.9–01:22.9 | Jalan raya Tambun (billboard, spanduk, ruko) |
| 04 Pintu yang Terbuka | 01:22.9–01:49.3 | Rumah: eksterior → ruang tamu berantakan, kamar, ruang keluarga |
| 05 Sesuatu di Lantai | 01:49.3–02:18.7 | Cincin akik, pasir, jejak kaki |
| 06 Pesan dari Orang Asing | 02:18.7–02:43.2 | Pesan & telepon misterius (identitas tidak ditampilkan) |
| 07 Cliffhanger | 02:43.2–03:15.0 | Simbol di pasir, foto basement + jam tangan Papa, kartu judul |

## Voice-over (ElevenLabs gratis)

`edge-tts` dan layanan TTS lain diblokir oleh network policy environment ini, jadi video yang
sudah dirender berisi musik + SFX + subtitle **tanpa** suara. Untuk menambahkan suara:

1. Buka `vo/VOICE_SCRIPT_ElevenLabs.txt` — berisi pilihan suara, setting, emosi, target durasi.
2. Generate tiap baris di ElevenLabs, simpan sebagai `vo/L01.mp3` … `vo/L36.mp3`.
3. Jalankan `python3 tools/mix_vo.py` → `output/final_video_vo.mp4`
   (efek telepon, gema ruangan, ducking musik, dan subtitle mengikuti durasi take asli — otomatis).
   Butuh Python 3 + numpy, Node 18+, ffmpeg dengan libass.
   Atau impor manual ke CapCut/Premiere pada timecode yang tertera.

## Cara membangun ulang

```bash
cd pasir-ep01
npm install                    # three@0.169
bash tools/render_all.sh 3     # 3 worker render paralel → final_video.mp4
```
Perlu Chromium + Playwright (render WebGL headless, CPU/SwiftShader), Python 3 + numpy, ffmpeg.
Render penuh ±5.850 frame memakan ~1–2 jam di CPU 4 core.

## Struktur

```
src/        timeline.js (sumber waktu tunggal), shots.js (sutradara: kamera/animasi per shot),
            characters.js (rig Nando & Papa, IK 2-tulang), set_*.js (golf, jalan, rumah, basement),
            engine.js (render HDR + shader post), phone.js (UI ponsel), textures.js (tekstur prosedural & banner)
render/     render.mjs (Chromium headless → ffmpeg), server.mjs
audio/      sound_design.py (SFX, ambience, skor — numpy), timeline.json (ekspor)
tools/      render_all.sh, make_subs.mjs, make_voice_script.mjs, mix_vo.py, export_timeline.mjs
assets/     kepomisteri_logo.png
vo/         naskah VO (+ tempat file ElevenLabs)
output/     parts, audio stems, subtitle.ass, video_nosub.mp4, final_video.mp4
```

## Catatan jujur tentang gaya visual
Semua dibuat secara prosedural dengan Three.js (tidak ada AI video / aset 3D berbayar). Karakter
mengikuti desain turnaround PASIR (kepala bulat besar, mata cincin, badan kotak, tangan-kaki stik)
dengan pencahayaan PBR, bayangan lembut, depth-of-field, color grading, dan grain agar terasa
sinematik — tetapi ini *stylized 3D*, bukan fotorealistis.
