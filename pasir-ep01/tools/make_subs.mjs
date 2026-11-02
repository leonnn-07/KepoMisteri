// Builds subtitle.srt (Bahasa Indonesia) + subtitle.ass (burn-in styling) from the timeline.
// Optional: if vo/durations.json exists (written by tools/mix_vo.py), real clip lengths are used.
import fs from 'node:fs';
import { CUES } from '../src/timeline.js';
const root = new URL('..', import.meta.url).pathname;
let real = {}; try { real = JSON.parse(fs.readFileSync(root + 'vo/durations.json', 'utf8')); } catch {}
const label = (c) => c.who === 'SATPAM' ? '[Telepon] ' : c.who === 'MISTERIUS' ? '[Suara misterius] ' : '';
const items = [];
for (const c of CUES) {
  const dur = real[c.id] || c.est;
  // split long lines at sentence boundaries, time proportional to characters
  const parts = c.text.length > 62 ? c.text.split(/(?<=[.?!])\s+/) : [c.text];
  const total = parts.reduce((a, p) => a + p.length, 0); let t = c.start;
  for (const p of parts) { const d = dur * p.length / total; items.push({ start: t, end: t + d, text: (parts.length > 1 || true ? label(c) : '') + p, kind: c.kind, who: c.who }); t += d; }
}
for (let i = 0; i < items.length; i++) { // readable minimum, never overlapping the next cue
  const it = items[i], nx = items[i + 1]; it.end = Math.max(it.end + 0.25, it.start + 1.0); if (nx) it.end = Math.min(it.end, nx.start - 0.04);
}
const ts = (s, sep = ',') => { const ms = Math.round(s * 1000); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, ss = Math.floor(ms / 1000) % 60, x = ms % 1000; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}${sep}${String(x).padStart(3, '0')}`; };
const srt = items.map((it, i) => `${i + 1}\n${ts(it.start)} --> ${ts(it.end)}\n${it.kind === 'narasi' ? `<i>${it.text}</i>` : it.text}\n`).join('\n');
fs.writeFileSync(root + 'subtitle.srt', srt);
const assT = (s) => { const cs = Math.round(s * 100); const h = Math.floor(cs / 360000), m = Math.floor(cs / 6000) % 60, ss = Math.floor(cs / 100) % 60, x = cs % 100; return `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${String(x).padStart(2, '0')}`; };
const ass = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Dialog,Inter SemiBold,44,&H00FFFFFF,&H000000FF,&H00000000,&H64000000,0,0,0,0,100,100,0.3,0,1,2.2,1,2,160,160,34,1
Style: Narasi,Inter SemiBold,44,&H00D9ECF5,&H000000FF,&H00000000,&H64000000,0,1,0,0,100,100,0.3,0,1,2.2,1,2,160,160,34,1
Style: Phone,Inter SemiBold,44,&H00B8E0FF,&H000000FF,&H00000000,&H64000000,0,0,0,0,100,100,0.3,0,1,2.2,1,2,160,160,34,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${items.map(it => `Dialogue: 0,${assT(it.start)},${assT(it.end)},${it.kind === 'narasi' ? 'Narasi' : it.kind === 'phone' ? 'Phone' : 'Dialog'},${it.who},0,0,0,,{\\fad(120,120)}${it.text}`).join('\n')}
`;
fs.writeFileSync(root + 'output/subtitle.ass', ass);
console.log('subtitles:', items.length, 'entries');
