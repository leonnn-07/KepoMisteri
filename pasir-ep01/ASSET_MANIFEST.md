# Asset manifest — PASIR Ep.01

Semua aset dibuat di project ini (prosedural). Satu-satunya file eksternal adalah logo dari pengguna.

| Aset | Sumber / cara dibuat | File |
|---|---|---|
| Logo KepoMisteri | diberikan pengguna (PNG transparan 500×500) | `assets/kepomisteri_logo.png` |
| Referensi karakter | `pasir_character_turnaround.mp4` (pengguna) — dipakai sebagai acuan desain, tidak dimasukkan ke video | – |
| Nando (eks-Onel) | Three.js: kepala bola + mata cincin (spherical caps), rambut shell dengan hairline shader, torso rounded-box meruncing, jas navy + dasi merah, lengan/kaki stik IK 2-tulang | `src/characters.js` → `makeNando()` |
| Papa | sama; batik coklat motif cincin (tekstur kanvas), ulos, kumis, rambut uban, cincin akik, jam tangan | `makePapa()` — tampil di foto keluarga & avatar kontak |
| Sosok misterius | tidak divisualkan (hanya suara + sekuens pasir di basement) | – |
| Props | ponsel (UI kanvas dinamis), stik golf, bola, kunci mobil, cincin akik, jam tangan, mobil MPV | `characters.js`, `set_road.js` |
| Set golf | terrain, fairway bergaris, bunker, kolam, ±150 pohon/palem, clubhouse, rumput instanced bergoyang, bendera berkibar | `src/set_golf.js` |
| Set jalan Tambun | jalan 700 m, ±140 ruko dengan papan toko, tiang & kabel listrik, lalu lintas, motor parkir | `src/set_road.js` |
| Set rumah | fasad, pagar, interior ruang tamu berantakan (kursi jatuh, laci terbuka, kertas), kamar, ruang keluarga, gorga Batak, jam dinding, pasir + jejak kaki + simbol | `src/set_house.js` |
| Basement mal | pilar, garis parkir, lampu neon berkedip, aliran pasir | `buildBasement()` |
| Tekstur | rumput, pasir, aspal, keramik, kayu, plester, beton, kain, batik, ulos, langit berawan, banner | `src/textures.js` |
| Branding (iklan) | billboard ×6, roll-up banner, feather flag ×3, papan pagar, spanduk melintang ×3, banner tiang ×14, ruko KepoMisteri, poster, wallpaper ponsel, bumper & kartu judul | `brandTex()` + `common.js` |
| SFX (64 cue) + ambience + langkah kaki | disintesis numpy | `audio/sound_design.py` |
| Musik skor | piano, pad, pulse, heartbeat — numpy | `audio/sound_design.py` |
| Voice-over | ElevenLabs (oleh pengguna) | `vo/VOICE_SCRIPT_ElevenLabs.txt`, `tools/mix_vo.py` |
| Font | Inter (OFL) dari sistem | – |
