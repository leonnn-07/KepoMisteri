// Single source of truth for timing: shots, voice lines and sound cues.
// Shared by the renderer (browser) and the audio / subtitle tools (node).
export const FPS = 30;

// Voice lines. `est` = target duration in seconds (keep ElevenLabs takes close to this).
// kind: 'dialog' (on-screen Nando), 'narasi' (Nando inner voice-over), 'phone' (voice through a phone speaker)
export const LINES = {
  L01: { who: 'NANDO', kind: 'dialog', text: 'Hah? Rumah?', est: 1.1 },
  L02: { who: 'NANDO', kind: 'narasi', text: 'Awalnya gue pikir itu cuma kesalahan sistem.', est: 3.0 },
  L03: { who: 'NANDO', kind: 'narasi', text: 'Tapi gue nggak tahu… kalau hari itu bakal jadi hari yang paling gue sesali.', est: 4.8 },
  L04: { who: 'NANDO', kind: 'dialog', text: 'Angkat, Pa…', est: 1.3 },
  L05: { who: 'NANDO', kind: 'narasi', text: 'Papa bukan orang yang suka mengabaikan telepon. Apalagi kalau gue menelepon berkali-kali.', est: 5.6 },
  L06: { who: 'NANDO', kind: 'dialog', text: 'Pak, bisa tolong cek rumah saya? Alarmnya tiba-tiba aktif.', est: 3.6 },
  L07: { who: 'SATPAM', kind: 'phone', text: 'Baik, Pak. Saya coba periksa.', est: 1.9 },
  L08: { who: 'NANDO', kind: 'dialog', text: 'Tolong kabari saya secepatnya.', est: 1.8 },
  L09: { who: 'NANDO', kind: 'dialog', text: 'Halo? Gimana rumah saya?', est: 1.6 },
  L10: { who: 'SATPAM', kind: 'phone', text: 'Maaf, Pak. Saya belum berhasil menghubungi orang di rumah.', est: 3.4 },
  L11: { who: 'NANDO', kind: 'dialog', text: 'Terus sekarang gimana?', est: 1.3 },
  L12: { who: 'SATPAM', kind: 'phone', text: 'Saya sarankan Bapak segera pulang dan memeriksanya.', est: 2.9 },
  L13: { who: 'NANDO', kind: 'dialog', text: 'Iya. Saya sudah menuju ke sana.', est: 1.9 },
  L14: { who: 'NANDO', kind: 'narasi', text: 'Gue mulai berpikir macam-macam.', est: 2.0 },
  L15: { who: 'NANDO', kind: 'narasi', text: 'Tapi satu hal yang terus ada di kepala gue…', est: 2.6 },
  L16: { who: 'NANDO', kind: 'narasi', text: 'Papa ada di rumah. Setidaknya, seharusnya begitu.', est: 3.4 },
  L17: { who: 'NANDO', kind: 'dialog', text: 'Papa?', est: 0.8 },
  L18: { who: 'NANDO', kind: 'dialog', text: 'Papa!?', est: 1.0 },
  L19: { who: 'NANDO', kind: 'narasi', text: 'Gue udah periksa hampir seluruh rumah.', est: 2.4 },
  L20: { who: 'NANDO', kind: 'narasi', text: 'Tapi Papa nggak ada.', est: 1.6 },
  L21: { who: 'NANDO', kind: 'dialog', text: 'Ini… punya Papa.', est: 1.8 },
  L22: { who: 'NANDO', kind: 'dialog', text: 'Pasir?', est: 0.9 },
  L23: { who: 'NANDO', kind: 'dialog', text: 'Siapa yang masuk ke rumah ini?', est: 1.9 },
  L24: { who: 'NANDO', kind: 'narasi', text: 'Gue nggak ngerti.', est: 1.2 },
  L25: { who: 'NANDO', kind: 'narasi', text: 'Kenapa rumah gue berantakan?', est: 1.7 },
  L26: { who: 'NANDO', kind: 'narasi', text: 'Kenapa Papa nggak ada?', est: 1.5 },
  L27: { who: 'NANDO', kind: 'narasi', text: 'Dan yang paling aneh…', est: 1.6 },
  L28: { who: 'NANDO', kind: 'narasi', text: 'Kenapa ada pasir sebanyak ini?', est: 2.0 },
  L29: { who: 'NANDO', kind: 'dialog', text: 'Siapa yang ngirim ini?!', est: 1.4 },
  L30: { who: 'NANDO', kind: 'dialog', text: 'HEI! LO SIAPA?! PAPA GUE DI MANA?!', est: 2.4 },
  L31: { who: 'MISTERIUS', kind: 'phone', text: 'Sepertinya kamu sudah menemukan petunjuknya.', est: 3.0 },
  L32: { who: 'NANDO', kind: 'dialog', text: 'PETUNJUK APA?!', est: 1.1 },
  L33: { who: 'MISTERIUS', kind: 'phone', text: 'Perhatikan pasirnya.', est: 1.6 },
  L34: { who: 'NANDO', kind: 'narasi', text: 'Sejak saat itu, gue tahu…', est: 1.9 },
  L35: { who: 'NANDO', kind: 'narasi', text: 'Ini bukan sekadar pencurian.', est: 1.9 },
  L36: { who: 'NANDO', kind: 'dialog', text: 'Gue bakal temuin Papa. Siapa pun yang melakukan ini, bakal gue cari.', est: 4.3 },
};

// Shots in order. dur in seconds. vo: [lineId, offsetInShot]. sfx: [cueName, offsetInShot, gainDb?]
export const SHOTS = [
  // ---------- SCENE 01 — HARI YANG BIASA (golf) ----------
  { id: 's01', sc: 1, dur: 4.6, sfx: [['logo_hit', 0.4]] },
  { id: 's02', sc: 1, dur: 3.0 },
  { id: 's03', sc: 1, dur: 2.9, sfx: [['golf_swing', 1.45], ['golf_hit', 1.75]] },
  { id: 's04', sc: 1, dur: 2.4, sfx: [['ball_whoosh', 0.0]] },
  { id: 's05', sc: 1, dur: 1.5 },
  { id: 's06', sc: 1, dur: 2.0, sfx: [['notif', 0.3], ['vibrate', 0.3]] },
  { id: 's07', sc: 1, dur: 2.3, vo: [['L01', 1.0]], sfx: [['cloth', 0.3], ['pickup', 0.75]] },
  { id: 's08', sc: 1, dur: 2.0, vo: [['L02', 0.3]], sfx: [['alarm_alert', 0.15], ['impact_low', 0.15]] },
  { id: 's09', sc: 1, dur: 4.0, vo: [['L03', 1.45]], sfx: [['riser', 0.0]] },
  { id: 's10', sc: 1, dur: 2.2, sfx: [['impact_boom', 0.0]] }, // cut to black
  // ---------- SCENE 02 — TIDAK ADA JAWABAN ----------
  { id: 's11', sc: 2, dur: 2.4, sfx: [['tap', 0.2], ['ringback', 0.5]] },
  { id: 's12', sc: 2, dur: 3.2, sfx: [['call_end', 2.9]] },
  { id: 's13', sc: 2, dur: 1.7, sfx: [['tap', 0.2], ['ringback', 0.4]] },
  { id: 's14', sc: 2, dur: 2.6, vo: [['L04', 0.9]] },
  { id: 's15', sc: 2, dur: 6.2, vo: [['L05', 0.3]], sfx: [['call_end', 0.2]] },
  { id: 's16', sc: 2, dur: 6.0, vo: [['L06', 0.5], ['L07', 4.2]], sfx: [['tap', 0.1], ['ringback_short', 0.2]] },
  { id: 's17', sc: 2, dur: 2.9, vo: [['L08', 0.2]], sfx: [['call_end', 2.0], ['keys', 2.2], ['car_chirp', 2.6]] },
  // ---------- SCENE 03 — PERJALANAN PULANG ----------
  { id: 's18', sc: 3, dur: 3.2, sfx: [['car_pass', 0.6]] },
  { id: 's19', sc: 3, dur: 2.5, sfx: [['ringback', 0.3]] },
  { id: 's20', sc: 3, dur: 2.3 },
  { id: 's21', sc: 3, dur: 2.3, sfx: [['ringtone', 0.15], ['tap', 2.05]] },
  { id: 's22', sc: 3, dur: 7.4, vo: [['L09', 0.15], ['L10', 1.95], ['L11', 5.5]] },
  { id: 's23', sc: 3, dur: 5.0, vo: [['L12', 0.0], ['L13', 3.0]], sfx: [['call_end', 4.85]] },
  { id: 's24', sc: 3, dur: 4.4, vo: [['L14', 0.1], ['L15', 2.2]] },
  { id: 's25', sc: 3, dur: 3.9, vo: [['L16', 0.5]] },
  // ---------- SCENE 04 — PINTU YANG TERBUKA ----------
  { id: 's26', sc: 4, dur: 3.9, sfx: [['car_brake', 0.7], ['engine_off', 1.8], ['car_door_open', 2.2], ['car_door_close', 3.4]] },
  { id: 's27', sc: 4, dur: 3.0 },
  { id: 's28', sc: 4, dur: 2.4, vo: [['L17', 1.2]] },
  { id: 's29', sc: 4, dur: 3.0, sfx: [['door_creak', 0.25]] },
  { id: 's30', sc: 4, dur: 3.6, sfx: [['impact_low', 1.0]] },
  { id: 's31', sc: 4, dur: 2.6, vo: [['L18', 0.4]] },
  { id: 's32', sc: 4, dur: 2.5, sfx: [['door_open_soft', 0.3]] },
  { id: 's33', sc: 4, dur: 2.8, vo: [['L19', 0.2]] },
  { id: 's34', sc: 4, dur: 2.6, vo: [['L20', 0.4]] },
  // ---------- SCENE 05 — SESUATU DI LANTAI ----------
  { id: 's35', sc: 5, dur: 3.0, sfx: [['glint', 2.0]] },
  { id: 's36', sc: 5, dur: 2.8, sfx: [['cloth', 0.3], ['ring_pick', 1.9]] },
  { id: 's37', sc: 5, dur: 3.2, vo: [['L21', 0.6]], sfx: [['sting', 0.0]] },
  { id: 's38', sc: 5, dur: 2.5 },
  { id: 's39', sc: 5, dur: 2.5, sfx: [['impact_low', 0.3]] },
  { id: 's40', sc: 5, dur: 2.9, vo: [['L22', 1.6]], sfx: [['sand_pour', 0.2]] },
  { id: 's41', sc: 5, dur: 2.6, vo: [['L23', 0.5]] },
  { id: 's42', sc: 5, dur: 5.3, vo: [['L24', 0.3], ['L25', 1.75], ['L26', 3.65]] },
  { id: 's43', sc: 5, dur: 4.6, vo: [['L27', 0.3], ['L28', 2.3]], sfx: [['riser', 2.0]] },
  // ---------- SCENE 06 — PESAN DARI ORANG ASING ----------
  { id: 's44', sc: 6, dur: 2.5, sfx: [['vibrate', 0.25], ['msg', 0.3]] },
  { id: 's45', sc: 6, dur: 1.9, sfx: [['impact_low', 0.2]] },
  { id: 's46', sc: 6, dur: 2.7, sfx: [['tap', 0.15], ['sit_tone', 0.55]] },
  { id: 's47', sc: 6, dur: 2.6, sfx: [['vibrate', 0.2], ['msg', 0.25]] },
  { id: 's48', sc: 6, dur: 1.9, vo: [['L29', 0.2]] },
  { id: 's49', sc: 6, dur: 1.5, sfx: [['ringtone', 0.05], ['vibrate', 0.05]] },
  { id: 's50', sc: 6, dur: 4.4, vo: [['L30', 0.25]], sfx: [['tap', 0.05]] },
  { id: 's51', sc: 6, dur: 3.4, vo: [['L31', 0.2]], sfx: [['sand_pour', 0.0], ['drone_dark', 0.0]] },
  { id: 's52', sc: 6, dur: 3.6, vo: [['L32', 0.1], ['L33', 1.55]], sfx: [['call_drop', 3.3]] },
  // ---------- SCENE 07 — CLIFFHANGER ----------
  { id: 's53', sc: 7, dur: 2.9 },
  { id: 's54', sc: 7, dur: 3.0, sfx: [['impact_boom', 0.6], ['sting', 0.6]] },
  { id: 's55', sc: 7, dur: 2.6, sfx: [['shutter', 1.6]] },
  { id: 's56', sc: 7, dur: 2.2, sfx: [['msg', 0.4], ['vibrate', 0.4]] },
  { id: 's57', sc: 7, dur: 4.0, sfx: [['riser', 0.4], ['impact_boom', 3.0]] },
  { id: 's58', sc: 7, dur: 4.4, vo: [['L34', 0.3], ['L35', 2.4]] },
  { id: 's59', sc: 7, dur: 5.0, vo: [['L36', 0.3]] },
  { id: 's60', sc: 7, dur: 1.8, sfx: [['house_alarm', 0.2]] }, // black + alarm once more
  { id: 's61', sc: 7, dur: 5.9, sfx: [['title_hit', 0.3]] }, // title card
];

export const SCENES = { 1: 'HARI YANG BIASA', 2: 'TIDAK ADA JAWABAN', 3: 'PERJALANAN PULANG', 4: 'PINTU YANG TERBUKA', 5: 'SESUATU DI LANTAI', 6: 'PESAN DARI ORANG ASING', 7: 'CLIFFHANGER' };

// absolute times
let acc = 0;
for (const s of SHOTS) { s.t0 = +acc.toFixed(4); acc += s.dur; s.t1 = +acc.toFixed(4); }
export const TOTAL = +acc.toFixed(4);

export const CUES = []; // flattened voice cues with absolute start
for (const s of SHOTS) for (const [id, at] of (s.vo || [])) CUES.push({ id, ...LINES[id], start: +(s.t0 + at).toFixed(3), end: +(s.t0 + at + LINES[id].est).toFixed(3), shot: s.id });
export const SFX = [];
for (const s of SHOTS) for (const [name, at, db] of (s.sfx || [])) SFX.push({ name, t: +(s.t0 + at).toFixed(3), db: db || 0, shot: s.id });

export function shotAt(t) { for (const s of SHOTS) if (t < s.t1) return s; return SHOTS[SHOTS.length - 1]; }
export function lineActive(t, who = 'NANDO', kinds = ['dialog']) { for (const c of CUES) if (c.who === who && kinds.includes(c.kind) && t >= c.start && t <= c.end) return c; return null; }
