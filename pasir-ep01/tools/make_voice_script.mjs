// Writes vo/VOICE_SCRIPT_ElevenLabs.txt — the line-by-line voice-over sheet.
import fs from 'node:fs';
import { CUES } from '../src/timeline.js';
const root = new URL('..', import.meta.url).pathname;
const MOOD = {
  L01: 'kaget kecil, bingung, setengah bergumam', L02: 'narasi tenang, mengenang, agak berat', L03: 'narasi pelan, penuh penyesalan; jeda di "…"',
  L04: 'cemas, berbisik ke diri sendiri', L05: 'narasi, khawatir tapi terkontrol', L06: 'sopan tapi mendesak', L07: 'satpam, sigap, logat Betawi/Bekasi ringan',
  L08: 'tegas, buru-buru', L09: 'langsung, cemas', L10: 'satpam, tidak enak hati', L11: 'mulai frustrasi', L12: 'satpam, serius', L13: 'tegas, menahan panik',
  L14: 'narasi, gelisah', L15: 'narasi, menggantung; jeda di "…"', L16: 'narasi, ragu, suara merendah di "seharusnya begitu"',
  L17: 'memanggil pelan, ragu', L18: 'berteriak memanggil, panik', L19: 'narasi, lelah, napas berat', L20: 'narasi, hampa',
  L21: 'lirih, tercekat; jeda di "…"', L22: 'heran, pelan', L23: 'marah tertahan, curiga', L24: 'narasi, bingung', L25: 'narasi', L26: 'narasi, suara sedikit pecah',
  L27: 'narasi, merendah; jeda di "…"', L28: 'narasi, misterius', L29: 'marah', L30: 'BERTERIAK, marah & panik', L31: 'MISTERIUS: tenang, dingin, pelan, sedikit tersenyum',
  L32: 'berteriak', L33: 'MISTERIUS: berbisik dingin, lambat', L34: 'narasi, pelan, sadar akan sesuatu', L35: 'narasi, dingin, tegas', L36: 'tekad bulat, rendah, menahan amarah — bukan teriak',
};
const ts = (s) => { const m = Math.floor(s / 60), x = (s % 60).toFixed(2).padStart(5, '0'); return `${String(m).padStart(2, '0')}:${x}`; };
const total = CUES.reduce((a, c) => a + c.text.length, 0);
let out = `PASIR — EPISODE 01: ALARM
NASKAH VOICE-OVER UNTUK ELEVENLABS (paket gratis)
=====================================================================

Total: ${CUES.length} baris, ${total} karakter (paket gratis ElevenLabs = 10.000 kredit/bulan,
1 karakter ≈ 1 kredit → cukup, masih sisa untuk take ulang).

PENGATURAN UMUM
- Model: "Eleven Multilingual v2" (paling stabil untuk Bahasa Indonesia).
  Alternatif: "Eleven v3" — lebih ekspresif & bisa pakai tag seperti [whispers], [shouting], [sighs].
- Output: MP3 44.1 kHz (default) sudah cukup.
- Simpan setiap baris sebagai file terpisah dengan NAMA PERSIS seperti kolom "FILE"
  (contoh L01.mp3) ke folder:  pasir-ep01/vo/
- Jangan tambahkan musik/efek di ElevenLabs — semua efek (suara telepon, gema ruangan)
  diproses otomatis oleh tools/mix_vo.py.
- Usahakan durasi tiap take mendekati "TARGET". Kalau jauh lebih panjang, naikkan Speed
  sedikit (1.05–1.1) atau generate ulang.

PEMILIHAN SUARA (3 orang)
1) NANDO  — pria dewasa, natural, tegas, sedikit berat. Dipakai untuk DIALOG dan NARASI.
   • Cari di Voice Library: filter Language = Indonesian, Gender = Male, Age = Middle aged /
     Young, Use case = Narrative / Conversational. Pilih yang suaranya berat & tidak "iklan".
   • Kalau tidak menemukan, pakai voice bawaan "Brian" (deep) atau "Liam" dengan Multilingual v2.
   • Setting DIALOG : Stability 35–45%, Similarity 75%, Style 20–30%, Speaker boost ON.
   • Setting NARASI : Stability 55–65%, Similarity 75%, Style 0–10% (lebih datar, intim, dekat mic).
     → Narasi dan dialog memakai SUARA YANG SAMA, hanya beda setting & cara bicara.
2) SATPAM (Pos Satpam Komplek, suara telepon) — pria 40–50an, sopan, sigap.
   • Voice Library Indonesian male yang berbeda dari Nando, atau voice bawaan "Bill"/"George".
   • Stability 50%, Style 10%. Efek "suara telepon" ditambahkan otomatis.
3) SOSOK MISTERIUS (suara telepon) — pria, tenang, dingin, pelan, identitas tidak terungkap.
   • Voice bawaan "Callum" (husky) atau Voice Library male yang paling dalam & tenang.
   • Stability 70–80%, Style 0%, Speed 0.9. Pitch akan diturunkan & diberi gema otomatis.

CATATAN LISENSI: paket gratis ElevenLabs mewajibkan atribusi ("Voice by ElevenLabs" / elevenlabs.io)
dan tidak memberi lisensi komersial. Kalau video dimonetisasi, gunakan paket berbayar.

CARA MEMASUKKAN VO KE VIDEO
  cd pasir-ep01
  python3 tools/mix_vo.py         → membuat output/final_video_vo.mp4 (VO + musik di-ducking + SFX + subtitle)
  (atau impor manual ke CapCut/Premiere: taruh tiap file pada TIMECODE di bawah)

=====================================================================
`;
for (const c of CUES) {
  out += `\n[${c.id}]  FILE: ${c.id}.mp3   TIMECODE: ${ts(c.start)}   TARGET: ±${c.est.toFixed(1)} detik
SUARA : ${c.who === 'NANDO' ? (c.kind === 'narasi' ? 'NANDO — NARASI (voice-over batin)' : 'NANDO — DIALOG') : c.who === 'SATPAM' ? 'SATPAM (via telepon)' : 'SOSOK MISTERIUS (via telepon)'}
EMOSI : ${MOOD[c.id] || ''}
TEKS  : ${c.text}
`;
}
fs.mkdirSync(root + 'vo', { recursive: true });
fs.writeFileSync(root + 'vo/VOICE_SCRIPT_ElevenLabs.txt', out);
console.log('voice script written');
