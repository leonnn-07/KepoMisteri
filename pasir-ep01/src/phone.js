// Smartphone UI rendered to a canvas texture (lock-screen alerts, calls, chat, camera, photo viewer).
import * as THREE from 'three';
import { logoImg } from './textures.js';

const PW = 540, PH = 1166;
const F = (w, s) => `${w} ${s}px Inter, "DejaVu Sans", sans-serif`;
const ease = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

export class Phone {
  constructor() {
    this.c = document.createElement('canvas'); this.c.width = PW; this.c.height = PH; this.x = this.c.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.c); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8;
    this.avatar = null; this.cameraView = null; this.basementPhoto = null;
  }
  rr(x0, y0, w, h, r) { const x = this.x; x.beginPath(); x.moveTo(x0 + r, y0); x.arcTo(x0 + w, y0, x0 + w, y0 + h, r); x.arcTo(x0 + w, y0 + h, x0, y0 + h, r); x.arcTo(x0, y0 + h, x0, y0, r); x.arcTo(x0, y0, x0 + w, y0, r); x.closePath(); }
  status(time = '15:42', dark = true) {
    const x = this.x; x.fillStyle = dark ? '#fff' : '#111'; x.font = F(600, 24); x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText(time, 34, 34);
    x.textAlign = 'right'; x.fillText('4G  ▮▮▮  78%', PW - 30, 34);
  }
  wallpaper(t = 0) {
    const x = this.x; const g = x.createLinearGradient(0, 0, PW, PH); g.addColorStop(0, '#1b2433'); g.addColorStop(0.6, '#2b2030'); g.addColorStop(1, '#120f14'); x.fillStyle = g; x.fillRect(0, 0, PW, PH);
    x.globalAlpha = 0.18; if (logoImg()) x.drawImage(logoImg(), PW / 2 - 200, PH * 0.55, 400, 400); x.globalAlpha = 1;
  }
  card(y, { app, title, body, color = '#e8463a', alpha = 1, icon = 'shield', pulse = 0 }) {
    const x = this.x; x.save(); x.globalAlpha = alpha;
    this.rr(24, y, PW - 48, 150, 26); x.fillStyle = 'rgba(245,245,247,0.93)'; x.fill();
    if (pulse > 0) { x.strokeStyle = `rgba(230,40,40,${pulse})`; x.lineWidth = 6; x.stroke(); }
    x.fillStyle = color; this.rr(44, y + 22, 52, 52, 12); x.fill();
    x.fillStyle = '#fff'; x.font = F(800, 30); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(icon === 'shield' ? '⛨' : '!', 70, y + 49);
    x.textAlign = 'left'; x.fillStyle = '#555'; x.font = F(600, 19); x.fillText(app, 112, y + 36);
    x.textAlign = 'right'; x.fillText('sekarang', PW - 46, y + 36);
    x.textAlign = 'left'; x.fillStyle = color === '#e8463a' ? '#c41d1d' : '#111'; x.font = F(800, 26); x.fillText(title, 112, y + 76);
    x.fillStyle = '#222'; x.font = F(500, 22); x.fillText(body, 44, y + 120);
    x.restore();
  }
  lock(t, notifs = [], time = '15:42') {
    const x = this.x; this.wallpaper(t); this.status(time);
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = F(300, 130); x.fillText(time, PW / 2, 210); x.font = F(500, 28); x.fillText('Sabtu, 2 November', PW / 2, 300);
    let y = 400; for (const n of notifs) { const a = ease((t - n.at) / 0.35); if (a <= 0) continue; this.card(y + (1 - a) * -40, { ...n, alpha: a, pulse: n.pulse ? 0.5 + 0.5 * Math.sin(t * 9) : 0 }); y += 170; }
  }
  alarmFull(t) { // opened alert
    const x = this.x; const g = x.createLinearGradient(0, 0, 0, PH); g.addColorStop(0, '#3a0b0b'); g.addColorStop(1, '#120404'); x.fillStyle = g; x.fillRect(0, 0, PW, PH); this.status('15:42');
    const p = 0.5 + 0.5 * Math.sin(t * 8);
    x.fillStyle = `rgba(232,40,40,${0.25 + 0.35 * p})`; x.beginPath(); x.arc(PW / 2, 380, 150 + p * 20, 0, 7); x.fill();
    x.fillStyle = '#e82828'; x.beginPath(); x.arc(PW / 2, 380, 110, 0, 7); x.fill();
    x.fillStyle = '#fff'; x.font = F(900, 120); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('!', PW / 2, 385);
    x.font = F(800, 24); x.fillStyle = '#ff9a8a'; x.fillText('HOME SECURITY SYSTEM', PW / 2, 580);
    x.font = F(900, 52); x.fillStyle = '#fff'; x.fillText('ALARM', PW / 2, 650); x.fillText('ACTIVATED', PW / 2, 710);
    x.font = F(500, 24); x.fillStyle = '#f2d0cc'; x.fillText('Gerakan terdeteksi — Ruang Tamu', PW / 2, 790); x.fillText('Rumah • Tambun • 15:41', PW / 2, 828);
    this.rr(60, 930, PW - 120, 84, 42); x.fillStyle = '#fff'; x.fill(); x.fillStyle = '#c41d1d'; x.font = F(800, 28); x.fillText('LIHAT DETAIL', PW / 2, 973);
  }
  avatarAt(cx, cy, rad, img, initial = 'P') {
    const x = this.x; x.save(); x.beginPath(); x.arc(cx, cy, rad, 0, 7); x.clip();
    if (img) { const s = Math.min(img.width, img.height); x.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, cx - rad, cy - rad, rad * 2, rad * 2); } else { x.fillStyle = '#6a6f78'; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2); x.fillStyle = '#fff'; x.font = F(600, rad); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(initial, cx, cy + 4); }
    x.restore();
  }
  call(t, { name, status = '', mode = 'outgoing', avatar = null, secs = 0, number = '' }) {
    const x = this.x; const g = x.createLinearGradient(0, 0, 0, PH); g.addColorStop(0, '#2c3442'); g.addColorStop(1, '#14171d'); x.fillStyle = g; x.fillRect(0, 0, PW, PH); this.status('15:43');
    this.avatarAt(PW / 2, 300, 110, avatar, name[0]);
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = F(600, 50); x.fillText(name, PW / 2, 480);
    x.font = F(500, 26); x.fillStyle = '#b8c0cc';
    if (number) { x.fillText(number, PW / 2, 528); }
    let st = status; if (mode === 'incall') { const m = Math.floor(secs / 60), s = Math.floor(secs % 60); st = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; }
    if (mode === 'outgoing' && !status.includes('tidak')) st = status + '.'.repeat(1 + (Math.floor(t * 2) % 3));
    x.fillStyle = status.includes('tidak') || status.includes('Tidak') ? '#ff7a6a' : '#b8c0cc'; x.fillText(st, PW / 2, number ? 570 : 530);
    if (mode === 'incoming') {
      const p = 0.5 + 0.5 * Math.sin(t * 6);
      x.fillStyle = '#e8463a'; x.beginPath(); x.arc(150, 960, 56, 0, 7); x.fill(); x.fillStyle = `rgba(52,199,89,${0.3 * p})`; x.beginPath(); x.arc(390, 960, 70 + p * 10, 0, 7); x.fill(); x.fillStyle = '#34c759'; x.beginPath(); x.arc(390, 960, 56, 0, 7); x.fill();
      x.fillStyle = '#fff'; x.font = F(700, 40); x.fillText('✆', 390, 962); x.save(); x.translate(150, 962); x.rotate(2.36); x.fillText('✆', 0, 0); x.restore();
      x.font = F(500, 22); x.fillText('Tolak', 150, 1050); x.fillText('Terima', 390, 1050);
    } else {
      const btn = ['Bisukan', 'Keypad', 'Speaker']; btn.forEach((b, i) => { const cx = 120 + i * 150; x.fillStyle = 'rgba(255,255,255,0.14)'; x.beginPath(); x.arc(cx, 760, 50, 0, 7); x.fill(); x.fillStyle = '#ddd'; x.font = F(500, 20); x.fillText(b, cx, 835); });
      x.fillStyle = '#e8463a'; x.beginPath(); x.arc(PW / 2, 990, 58, 0, 7); x.fill(); x.fillStyle = '#fff'; x.font = F(700, 40); x.save(); x.translate(PW / 2, 992); x.rotate(2.36); x.fillText('✆', 0, 0); x.restore();
    }
  }
  chat(t, { contact = 'Nomor Tidak Dikenal', number = '+62 8•• •••• ••17', msgs = [], photo = null }) {
    const x = this.x; x.fillStyle = '#0f1216'; x.fillRect(0, 0, PW, PH); this.status('15:58');
    x.fillStyle = '#1b2028'; x.fillRect(0, 60, PW, 110); this.avatarAt(80, 115, 34, null, '?');
    x.fillStyle = '#fff'; x.textAlign = 'left'; x.textBaseline = 'middle'; x.font = F(700, 26); x.fillText(contact, 130, 102); x.font = F(500, 19); x.fillStyle = '#9aa3ad'; x.fillText(number, 130, 132);
    let y = 220;
    for (const m of msgs) {
      const a = ease((t - m.at) / 0.25); if (a <= 0) continue;
      x.save(); x.globalAlpha = a; x.translate(0, (1 - a) * 20);
      if (m.photo) {
        const w = 330, h = 420; this.rr(30, y, w + 16, h + 50, 22); x.fillStyle = '#232a33'; x.fill();
        x.save(); this.rr(38, y + 8, w, h, 16); x.clip(); if (m.photo) x.drawImage(m.photo, 0, 0, m.photo.width, m.photo.height, 38, y + 8, w, h); x.restore();
        x.fillStyle = '#9aa3ad'; x.font = F(500, 18); x.fillText(m.time || '15:59', 46, y + h + 32); y += h + 70;
      } else {
        x.font = F(500, 28); const words = m.text.split(' '); const lines = []; let line = '';
        for (const w of words) { const tt = line ? line + ' ' + w : w; if (x.measureText(tt).width > 360) { lines.push(line); line = w; } else line = tt; } lines.push(line);
        const bh = 40 + lines.length * 38; this.rr(30, y, 400, bh, 24); x.fillStyle = '#2a313b'; x.fill();
        x.fillStyle = '#f2f2f2'; lines.forEach((l, i) => x.fillText(l, 54, y + 38 + i * 38));
        x.fillStyle = '#8a939e'; x.font = F(500, 17); x.textAlign = 'right'; x.fillText(m.time || '15:58', 418, y + bh - 16); x.textAlign = 'left';
        y += bh + 22;
      }
      x.restore();
    }
    x.fillStyle = '#1b2028'; x.fillRect(0, PH - 110, PW, 110); this.rr(24, PH - 90, PW - 48, 64, 32); x.fillStyle = '#2a313b'; x.fill(); x.fillStyle = '#7b848f'; x.font = F(500, 22); x.fillText('Ketik pesan', 56, PH - 57);
  }
  camera(t, { view, flash = 0 }) {
    const x = this.x; x.fillStyle = '#000'; x.fillRect(0, 0, PW, PH);
    if (view) { const s = Math.min(view.width, view.height); x.drawImage(view, (view.width - s * 0.75) / 2, (view.height - s) / 2, s * 0.75, s, 0, 120, PW, PH - 330); }
    x.strokeStyle = 'rgba(255,255,255,0.35)'; x.lineWidth = 1.5; for (const f of [1 / 3, 2 / 3]) { x.beginPath(); x.moveTo(PW * f, 120); x.lineTo(PW * f, PH - 210); x.stroke(); x.beginPath(); x.moveTo(0, 120 + (PH - 330) * f); x.lineTo(PW, 120 + (PH - 330) * f); x.stroke(); }
    x.strokeStyle = '#ffd34a'; x.lineWidth = 3; x.strokeRect(PW / 2 - 70, PH / 2 - 120, 140, 140);
    x.fillStyle = '#ffd34a'; x.font = F(600, 22); x.textAlign = 'center'; x.fillText('FOTO', PW / 2, PH - 175);
    x.fillStyle = '#fff'; x.beginPath(); x.arc(PW / 2, PH - 100, 50, 0, 7); x.fill(); x.strokeStyle = '#000'; x.lineWidth = 4; x.beginPath(); x.arc(PW / 2, PH - 100, 42, 0, 7); x.stroke();
    if (flash > 0) { x.fillStyle = `rgba(255,255,255,${flash})`; x.fillRect(0, 0, PW, PH); }
  }
  photo(t, { img, zoom = 1, cx = 0.5, cy = 0.5 }) {
    const x = this.x; x.fillStyle = '#000'; x.fillRect(0, 0, PW, PH);
    if (img) { const vw = img.width / zoom, vh = (img.width * (PH - 240) / PW) / zoom; const sx = Math.min(Math.max(0, img.width * cx - vw / 2), img.width - vw), sy = Math.min(Math.max(0, img.height * cy - vh / 2), Math.max(0, img.height - vh)); x.drawImage(img, sx, sy, vw, Math.min(vh, img.height), 0, 120, PW, PH - 240); }
    x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillRect(0, 60, PW, 60); x.fillStyle = '#fff'; x.font = F(600, 22); x.textAlign = 'left'; x.fillText('‹  Nomor Tidak Dikenal', 24, 92);
  }
  dark() { this.x.fillStyle = '#000'; this.x.fillRect(0, 0, PW, PH); }
  commit() { this.tex.needsUpdate = true; }
}
