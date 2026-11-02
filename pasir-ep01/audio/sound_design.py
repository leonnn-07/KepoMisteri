#!/usr/bin/env python3
"""PASIR Ep.01 — procedural sound design (no external samples).

Synthesises every SFX, the ambience beds and the score with numpy, places them on the
timeline from src/timeline.js (exported to audio/timeline.json by tools/export_timeline.mjs),
and writes stems:
    output/audio/sfx_amb.wav   – sound effects + ambience
    output/audio/music.wav     – score (already ducked under the planned voice lines)
    output/audio/mix_novo.wav  – stereo mix without voice-over
"""
import json, math, os, sys
import numpy as np

SR = 48000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'output', 'audio')
rng = np.random.default_rng(7)

# ----------------------------------------------------------------------------- helpers
def t_(d): return np.arange(int(d * SR)) / SR
def noise(d): return rng.standard_normal(int(d * SR))
def env_adsr(n, a=0.005, d=0.05, s=0.6, r=0.1):
    a, d, r = int(a * SR), int(d * SR), int(r * SR); a = max(a, 1); r = max(r, 1)
    sus = max(n - a - d - r, 0)
    e = np.concatenate([np.linspace(0, 1, a), np.linspace(1, s, d), np.full(sus, s), np.linspace(s, 0, r)])
    return np.pad(e, (0, max(0, n - len(e))))[:n]
def expdec(n, tau): return np.exp(-np.arange(n) / (tau * SR))
def onepole_lp(x, fc):
    a = math.exp(-2 * math.pi * fc / SR); y = np.empty_like(x); acc = 0.0
    # vectorised via lfilter-equivalent using cumulative trick is unstable; use simple loop on decimated blocks
    from numpy.lib.stride_tricks import sliding_window_view  # noqa (kept for clarity)
    b = 1 - a
    # IIR via FFT is not exact; do it in python but in chunks with numpy (fast enough for our lengths)
    for i in range(len(x)):
        acc = b * x[i] + a * acc; y[i] = acc
    return y
def fft_filter(x, lo=None, hi=None, slope=2):
    """zero-phase spectral band filter (smooth butterworth-like magnitude)."""
    n = len(x); N = 1 << (n - 1).bit_length()
    X = np.fft.rfft(x, N); f = np.fft.rfftfreq(N, 1 / SR); H = np.ones_like(f)
    if hi: H *= 1 / np.sqrt(1 + (f / hi) ** (2 * slope))
    if lo: H *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** (2 * slope))
    return np.fft.irfft(X * H, N)[:n]
def bandpass(x, lo, hi, slope=2): return fft_filter(x, lo, hi, slope)
def lowpass(x, hi, slope=2): return fft_filter(x, None, hi, slope)
def highpass(x, lo, slope=2): return fft_filter(x, lo, None, slope)
def conv(x, ir):
    n = len(x) + len(ir) - 1; N = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, N) * np.fft.rfft(ir, N), N)[:n]
def make_ir(dur=2.0, tau=0.5, bright=6000, pre=0.01):
    n = int(dur * SR); ir = rng.standard_normal(n) * np.exp(-np.arange(n) / (tau * SR)); ir = lowpass(ir, bright)
    ir[:int(pre * SR)] = 0; ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9; return ir
IR_HALL = make_ir(3.5, 0.9, 5000); IR_ROOM = make_ir(0.8, 0.12, 7000); IR_BIG = make_ir(5.0, 1.4, 3500)
def reverb(x, ir=IR_HALL, wet=0.3):
    y = conv(x, ir); out = np.zeros(len(y)); out[:len(x)] += x * (1 - wet); out += y * wet; return out
def sine(f, d, ph=0):
    t = t_(d)
    if callable(f): return np.sin(2 * np.pi * np.cumsum(f(t)) / SR + ph)
    return np.sin(2 * np.pi * f * t + ph)
def saw(f, d):
    t = t_(d); ph = (f * t) % 1.0 if not callable(f) else (np.cumsum(f(t)) / SR) % 1.0
    return 2 * ph - 1
def norm(x, peak=1.0): m = np.max(np.abs(x)) + 1e-9; return x / m * peak
def db(v): return 10 ** (v / 20)
def softclip(x, k=1.5): return np.tanh(k * x) / np.tanh(k)
def pan(x, p=0.0):  # -1 left .. 1 right, equal power
    a = (p + 1) * math.pi / 4; return np.stack([x * math.cos(a), x * math.sin(a)], 1)
def phone_eq(x): return softclip(bandpass(x, 320, 3300, 3) * 1.6, 1.2)

# ----------------------------------------------------------------------------- SFX library
def sfx_whoosh(d=0.45, f0=300, f1=2500, amp=1.0):
    n = noise(d); t = t_(d); e = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    out = np.zeros_like(n); seg = 12
    for k in range(seg):
        a, b = int(k * len(n) / seg), int((k + 1) * len(n) / seg); fc = f0 + (f1 - f0) * k / seg
        out[a:b] = bandpass(n, fc * 0.6, fc * 1.4)[a:b]
    return norm(out * e) * amp

def S(name, **kw):
    d = None
    if name == 'logo_hit':
        sub = sine(lambda t: 70 * np.exp(-t * 2.2) + 32, 3.0) * expdec(int(3 * SR), 1.0)
        n = lowpass(noise(3.0), 900) * expdec(int(3 * SR), 0.25)
        d = reverb(norm(sub + 0.6 * n) * 0.9, IR_BIG, 0.35); return norm(d) * db(-10)
    if name == 'title_hit':
        d = S('logo_hit'); sh = sine(1318, 3) * expdec(int(3 * SR), 0.8) * 0.15 + sine(1975, 3) * expdec(int(3 * SR), 0.6) * 0.1
        x = np.zeros(max(len(d), len(sh))); x[:len(d)] += d; x[:len(sh)] += reverb(sh, IR_HALL, 0.5)[:len(sh)]; return norm(x) * db(-9)
    if name == 'golf_swing': return sfx_whoosh(0.32, 400, 3500, db(-8))
    if name == 'golf_hit':
        n = int(0.4 * SR); click = highpass(noise(0.4), 2000) * expdec(n, 0.004)
        ping = (sine(3150, 0.4) + 0.5 * sine(4870, 0.4)) * expdec(n, 0.05)
        thump = sine(180, 0.4) * expdec(n, 0.02)
        return norm(click + 0.6 * ping + 0.5 * thump) * db(-4)
    if name == 'ball_whoosh': return sfx_whoosh(1.4, 2500, 900, db(-22))
    if name == 'notif':
        x = np.zeros(int(0.8 * SR))
        for i, f in enumerate([1318.5, 1975.5]):
            o = int(i * 0.13 * SR); tone = (sine(f, 0.6) + 0.3 * sine(f * 2, 0.6)) * env_adsr(int(0.6 * SR), 0.004, 0.08, 0.3, 0.4)
            x[o:o + len(tone)] += tone
        return reverb(x, IR_ROOM, 0.15) * db(-10)
    if name == 'msg':
        x = (sine(880, 0.25) * 0.6 + sine(1760, 0.25) * 0.3) * env_adsr(int(0.25 * SR), 0.002, 0.04, 0.2, 0.15)
        y = (sine(1320, 0.3) * 0.6) * env_adsr(int(0.3 * SR), 0.002, 0.05, 0.2, 0.2)
        out = np.zeros(int(0.5 * SR)); out[:len(x)] += x; out[int(0.09 * SR):int(0.09 * SR) + len(y)] += y; return out * db(-11)
    if name == 'vibrate':
        out = np.zeros(int(1.0 * SR))
        for o in (0.0, 0.5):
            dd = 0.32; b = (np.sign(sine(172, dd)) * 0.5 + sine(172, dd)) * env_adsr(int(dd * SR), 0.01, 0.02, 0.9, 0.04)
            b = lowpass(b + 0.3 * highpass(noise(dd), 2000) * 0.1, 1800); s = int(o * SR); out[s:s + len(b)] += b
        return out * db(-17)
    if name in ('cloth',): return bandpass(noise(0.5), 800, 6000) * env_adsr(int(0.5 * SR), 0.05, 0.1, 0.4, 0.3) * db(-26)
    if name in ('pickup', 'tap', 'ring_pick'):
        dd = 0.12; n = int(dd * SR)
        if name == 'ring_pick': x = (sine(4200, dd) + sine(6100, dd) * 0.6) * expdec(n, 0.03) * 0.5 + highpass(noise(dd), 3000) * expdec(n, 0.003)
        else: x = bandpass(noise(dd), 600, 5000) * expdec(n, 0.01) + sine(220, dd) * expdec(n, 0.01) * 0.5
        return norm(x) * (db(-20) if name == 'tap' else db(-16))
    if name == 'alarm_alert':
        out = np.zeros(int(1.4 * SR))
        for i in range(4):
            f = 1046 if i % 2 == 0 else 1568; tone = (np.sign(sine(f, 0.16)) * 0.3 + sine(f, 0.16)) * env_adsr(int(0.16 * SR), 0.003, 0.01, 0.9, 0.02)
            s = int(i * 0.2 * SR); out[s:s + len(tone)] += lowpass(tone, 5000)
        return reverb(out, IR_ROOM, 0.1) * db(-13)
    if name == 'impact_low':
        n = int(2.5 * SR); x = sine(lambda t: 55 * np.exp(-t * 1.5) + 30, 2.5) * expdec(n, 0.7) + lowpass(noise(2.5), 300) * expdec(n, 0.35) * 0.6
        return reverb(norm(x), IR_BIG, 0.3) * db(-12)
    if name == 'impact_boom':
        n = int(4 * SR); x = softclip(sine(lambda t: 90 * np.exp(-t * 3) + 28, 4) * expdec(n, 1.1) * 1.6, 2) + lowpass(noise(4), 600) * expdec(n, 0.2)
        return reverb(norm(x), IR_BIG, 0.4) * db(-10)
    if name == 'riser':
        dd = kw.get('d', 3.0); t = t_(dd); n = noise(dd); out = np.zeros_like(n); seg = 20
        for k in range(seg):
            a, b = int(k * len(n) / seg), int((k + 1) * len(n) / seg); fc = 300 * (12 ** (k / seg)); out[a:b] = bandpass(n, fc * 0.7, fc * 1.3)[a:b]
        tone = sine(lambda t: 110 * 4 ** (t / dd), dd) * 0.25 + sine(lambda t: 116 * 4 ** (t / dd), dd) * 0.2
        e = (t / dd) ** 2.2
        return norm((out * 0.6 + tone) * e) * db(-13)
    if name == 'sting':
        dd = 3.0; x = np.zeros(int(dd * SR))
        for f in (146.8, 155.6, 207.7, 220.0, 311.1):
            v = saw(f * (1 + rng.uniform(-0.004, 0.004)), dd); x += lowpass(v, 2400) * 0.2
        x *= env_adsr(len(x), 0.005, 0.3, 0.4, 2.0); x += sine(55, dd) * expdec(len(x), 0.4)
        return reverb(norm(x), IR_HALL, 0.45) * db(-13)
    if name in ('ringback', 'ringback_short'):
        cyc = [(0, 1.0), (3.0, 1.0)] if name == 'ringback' else [(0, 0.45)]
        out = np.zeros(int(4.2 * SR))
        for s0, dd in cyc:
            tone = sine(425, dd) * env_adsr(int(dd * SR), 0.01, 0.01, 1, 0.02); s = int(s0 * SR); out[s:s + len(tone)] += tone
        return phone_eq(out) * db(-20)
    if name == 'call_end':
        out = np.zeros(int(0.9 * SR))
        for i in range(3):
            tone = sine(480, 0.14) * env_adsr(int(0.14 * SR), 0.003, 0.01, 1, 0.01); s = int(i * 0.28 * SR); out[s:s + len(tone)] += tone
        return phone_eq(out) * db(-19)
    if name == 'call_drop':
        click = highpass(noise(0.05), 1500) * expdec(int(0.05 * SR), 0.005); x = np.zeros(int(1.2 * SR)); x[:len(click)] += click * 0.7
        e = S('call_end'); x[int(0.15 * SR):int(0.15 * SR) + len(e)] += e * db(19) * 0.6
        return phone_eq(x) * db(-16)
    if name == 'sit_tone':
        out = np.zeros(int(1.3 * SR))
        for i, f in enumerate([913.8, 1370.6, 1776.7]):
            tone = sine(f, 0.33) * env_adsr(int(0.33 * SR), 0.005, 0.01, 1, 0.01); s = int(i * 0.34 * SR); out[s:s + len(tone)] += tone
        return phone_eq(out) * db(-17)
    if name == 'ringtone':
        dd = kw.get('d', 1.9); notes = [659, 784, 988, 784, 659, 784, 988, 1175]; out = np.zeros(int(dd * SR) + SR)
        for i in range(int(dd / 0.16)):
            f = notes[i % len(notes)]; n = int(0.3 * SR); tone = (sine(f, 0.3) + 0.4 * sine(f * 3, 0.3) * expdec(n, 0.02)) * expdec(n, 0.09)
            s = int(i * 0.16 * SR); out[s:s + n] += tone
        out = out[:int(dd * SR)] * env_adsr(int(dd * SR), 0.01, 0.01, 1, 0.08)
        return reverb(out, IR_ROOM, 0.12) * db(-15)
    if name == 'keys':
        dd = 0.6; out = np.zeros(int(dd * SR))
        for i in range(14):
            f = rng.uniform(3000, 9000); n = int(0.12 * SR); s = int(rng.uniform(0, 0.45) * SR); out[s:s + n] += sine(f, 0.12) * expdec(n, 0.02) * rng.uniform(0.3, 1)
        return norm(out) * db(-22)
    if name == 'car_chirp':
        out = np.zeros(int(0.7 * SR))
        for o in (0, 0.18):
            tone = sine(2800, 0.09) * env_adsr(int(0.09 * SR), 0.003, 0.01, 1, 0.01); s = int(o * SR); out[s:s + len(tone)] += tone
        clunk = lowpass(noise(0.08), 900) * expdec(int(0.08 * SR), 0.015); out[int(0.4 * SR):int(0.4 * SR) + len(clunk)] += clunk
        return reverb(out, IR_HALL, 0.25) * db(-22)
    if name == 'car_pass':
        dd = 3.5; t = t_(dd); tc = 1.5; dist = np.sqrt((t - tc) ** 2 * 120 + 4)
        f = 60 * (1 + 0.08 * np.tanh((tc - t) * 3)); eng = lowpass(saw(lambda tt: 60 * (1 + 0.08 * np.tanh((tc - tt) * 3)), dd), 500)
        rd = bandpass(noise(dd), 200, 3000); x = (eng * 0.6 + rd * 0.5) / dist * 3
        st = np.stack([x * np.clip(0.5 - (t - tc) * 0.4, 0.1, 1), x * np.clip(0.5 + (t - tc) * 0.4, 0.1, 1)], 1)
        return st * db(-8)
    if name == 'car_brake':
        dd = 1.0; sq = bandpass(saw(lambda t: 1800 + 200 * np.sin(t * 30), dd), 1500, 3000) * env_adsr(int(dd * SR), 0.1, 0.2, 0.3, 0.4) * 0.15
        return (sq + lowpass(noise(dd), 400) * env_adsr(int(dd * SR), 0.05, 0.3, 0.3, 0.5) * 0.4) * db(-16)
    if name == 'engine_off':
        dd = 1.2; e = lowpass(saw(lambda t: 42 * np.exp(-t * 1.2), dd), 300) * expdec(int(dd * SR), 0.3); return e * db(-14)
    if name in ('car_door_open', 'car_door_close'):
        dd = 0.5; n = int(dd * SR); th = lowpass(noise(dd), 500 if name.endswith('close') else 1500) * expdec(n, 0.05) + sine(90, dd) * expdec(n, 0.06) * 0.8
        lt = highpass(noise(dd), 2500) * expdec(n, 0.006) * 0.4
        return reverb(norm(th + lt), IR_HALL, 0.2) * (db(-12) if name.endswith('close') else db(-18))
    if name in ('door_creak', 'door_open_soft'):
        dd = 2.3 if name == 'door_creak' else 0.8; t = t_(dd)
        rate = 18 + 40 * np.abs(np.sin(t * 2.1)) + 15 * np.sin(t * 7.3)
        ph = np.cumsum(rate) / SR; pulses = (np.diff(np.floor(ph), prepend=0) > 0).astype(float)
        exc = conv(pulses, sine(1, 0.004) * 0 + np.hanning(int(0.004 * SR)))[:len(t)]
        body = bandpass(exc * (1 + 0.5 * noise(dd)), 500, 2600, 3) + 0.4 * bandpass(exc, 2600, 5000)
        x = body * env_adsr(len(t), 0.15, 0.2, 0.8, 0.4)
        return reverb(norm(x), IR_HALL, 0.3) * (db(-10) if name == 'door_creak' else db(-20))
    if name == 'glint':
        dd = 1.5; x = np.zeros(int(dd * SR))
        for f in (2637, 3520, 4186, 5274):
            x += sine(f, dd) * expdec(len(x), 0.35) * rng.uniform(0.3, 0.7)
        return reverb(x * env_adsr(len(x), 0.02, 0.05, 1, 0.5), IR_HALL, 0.5) * db(-22)
    if name == 'sand_pour':
        dd = kw.get('d', 2.8); n = int(dd * SR); clicks = (rng.random(n) < 0.03) * rng.standard_normal(n)
        x = bandpass(clicks + 0.15 * noise(dd), 1800, 9000) * env_adsr(n, 0.3, 0.2, 0.8, 0.8)
        return x / (np.max(np.abs(x)) + 1e-9) * db(-18)
    if name == 'drone_dark':
        dd = 4.5; x = lowpass(saw(41.2, dd) + saw(41.6, dd) + 0.5 * saw(61.7, dd), 260) * env_adsr(int(dd * SR), 1.2, 0.5, 0.8, 1.5)
        return reverb(norm(x), IR_BIG, 0.4) * db(-12)
    if name == 'shutter':
        out = np.zeros(int(0.3 * SR))
        for o in (0, 0.07):
            c = bandpass(noise(0.04), 1200, 8000) * expdec(int(0.04 * SR), 0.006); s = int(o * SR); out[s:s + len(c)] += c
        return out * db(-14)
    if name == 'house_alarm':
        dd = 1.6; x = saw(lambda t: 750 + 650 * (0.5 - 0.5 * np.cos(2 * np.pi * t / 0.8)), dd)
        x = lowpass(x, 4000) * env_adsr(int(dd * SR), 0.01, 0.05, 1, 0.05)
        return reverb(x, IR_HALL, 0.35) * db(-14)
    raise KeyError(name)

def footstep(surface='tile', loud=0.0):
    dd = 0.25; n = int(dd * SR)
    if surface == 'grass': x = bandpass(noise(dd), 900, 7000) * expdec(n, 0.03) * 0.8 + lowpass(noise(dd), 200) * expdec(n, 0.02) * 0.4; g = -30
    elif surface == 'asphalt': x = bandpass(noise(dd), 300, 5000) * expdec(n, 0.02) + sine(110, dd) * expdec(n, 0.015) * 0.5; g = -27
    else: x = bandpass(noise(dd), 400, 6000) * expdec(n, 0.012) + sine(140, dd) * expdec(n, 0.012) * 0.7 + highpass(noise(dd), 4000) * expdec(n, 0.003) * 0.6; g = -25
    return norm(x) * db(g + loud)

# ----------------------------------------------------------------------------- ambience
def amb_golf(d):
    t = t_(d); w = lowpass(noise(d), 500) * (0.6 + 0.4 * np.sin(2 * np.pi * t / 7.3)) * 0.5 + bandpass(noise(d), 1500, 5000) * (0.3 + 0.3 * np.sin(2 * np.pi * t / 4.1 + 1)) * 0.25
    x = norm(w) * db(-30)
    for k in range(int(d / 2.2)):  # birds
        s = int(rng.uniform(0, d - 1) * SR); dd = rng.uniform(0.08, 0.2); f0 = rng.uniform(2800, 4800)
        for j in range(rng.integers(2, 5)):
            ch = sine(lambda tt: f0 + 1400 * np.sin(tt * 60) * np.exp(-tt * 10), dd) * env_adsr(int(dd * SR), 0.01, 0.02, 0.6, 0.05) * db(-36)
            o = s + int(j * dd * 1.3 * SR); x[o:o + len(ch)] += ch[:max(0, len(x) - o)]
    return pan(x, -0.1) * 0.5 + pan(np.roll(x, 2400), 0.3) * 0.5

def amb_road(d, interior_mask):
    t = t_(d); rpm = 38 + 3 * np.sin(t * 0.5)
    eng = lowpass(saw(lambda tt: 38 + 3 * np.sin(tt * 0.5), d) + 0.5 * saw(lambda tt: 76 + 6 * np.sin(tt * 0.5), d), 400)
    road = lowpass(noise(d), 900) * 0.8 + bandpass(noise(d), 1000, 4000) * 0.2
    city = bandpass(noise(d), 200, 2000) * (0.5 + 0.5 * np.sin(t * 0.3))
    ext = norm(eng * 0.5 + road * 0.7 + city * 0.4) * db(-24)
    inn = lowpass(norm(eng * 0.9 + road * 0.5), 350) * db(-25)
    for k in range(int(d / 4)):  # horns / motorbikes
        s = int(rng.uniform(0, d - 1.5) * SR)
        if rng.random() < 0.5: h = (np.sign(sine(415, 0.35)) + np.sign(sine(523, 0.35))) * 0.25 * env_adsr(int(0.35 * SR), 0.01, 0.02, 1, 0.05) * db(-40)
        else: h = lowpass(saw(lambda tt: 110 + 30 * np.sin(tt * 2), 1.5), 1200) * np.sin(np.pi * np.linspace(0, 1, int(1.5 * SR))) * db(-38)
        ext[s:s + len(h)] += lowpass(h, 3000)[:len(ext[s:s + len(h)])]
    m = interior_mask
    return pan(ext * (1 - m) + inn * m, 0.0)

def amb_house_ext(d):
    t = t_(d); x = lowpass(noise(d), 700) * db(-36) + bandpass(noise(d), 300, 1500) * db(-44)
    cr = (sine(4300, d) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 18 * t))) * (0.5 + 0.5 * np.sin(2 * np.pi * t / 1.7))) * db(-50)
    return pan(x + cr, 0.0)

def amb_room(d, clock=True, t0=0.0):
    t = t_(d); x = lowpass(noise(d), 400) * db(-44) + sine(50, d) * db(-52) + sine(100, d) * db(-58)
    if clock:
        for k in range(int(d) + 2):
            s = int((k - (t0 % 1.0) + 1.0) * SR)
            if 0 <= s < len(x) - 2000:
                tick = bandpass(noise(0.03), 2000, 8000) * expdec(int(0.03 * SR), 0.004) * (db(-34) if k % 2 else db(-37))
                x[s:s + len(tick)] += tick
    return pan(reverb(x, IR_ROOM, 0.25)[:len(x)], 0.15)

def amb_basement(d):
    t = t_(d); hum = (sine(100, d) + 0.5 * sine(200, d) + 0.3 * sine(300, d)) * db(-40) * (1 + 0.3 * np.sign(np.sin(t * 37)))
    return pan(reverb(hum + lowpass(noise(d), 200) * db(-40), IR_BIG, 0.5)[:len(t)], 0)

# ----------------------------------------------------------------------------- score
A4 = 440.0
def mtof(m): return A4 * 2 ** ((m - 69) / 12)
def piano(f, dd=3.0, vel=1.0):
    n = int(dd * SR); x = np.zeros(n)
    for h, a in [(1, 1), (2, 0.45), (3, 0.2), (4, 0.12), (5, 0.06)]:
        x += sine(f * h * (1 + 0.0004 * h * h), dd) * a * expdec(n, 1.6 / h)
    x *= env_adsr(n, 0.004, 0.1, 0.8, 0.3); return x * vel
def pad(freqs, dd, bright=1200, att=1.5, rel=1.5):
    x = np.zeros(int(dd * SR))
    for f in freqs:
        for det in (-0.006, 0.0, 0.007): x += saw(f * (1 + det), dd)
    x = lowpass(x, bright) * env_adsr(len(x), att, 0.2, 1, rel); return norm(x)
def pulse(f, dd, bpm, dec=0.12):
    x = np.zeros(int(dd * SR)); step = 60 / bpm
    for k in range(int(dd / step) + 1):
        s = int(k * step * SR); n = int(0.4 * SR); b = (sine(f, 0.4) + 0.5 * sine(f * 2, 0.4)) * expdec(n, dec); x[s:s + n] += b[:max(0, len(x) - s)]
    return x
def heartbeat(dd, bpm):
    x = np.zeros(int(dd * SR)); step = 60 / bpm
    for k in range(int(dd / step) + 1):
        for o, a in ((0, 1), (0.22, 0.7)):
            s = int((k * step + o) * SR); n = int(0.25 * SR); b = sine(lambda t: 60 * np.exp(-t * 8) + 38, 0.25) * expdec(n, 0.06) * a
            if s < len(x): x[s:s + n] += b[:len(x) - s]
    return x
def ticks(dd, bpm):
    x = np.zeros(int(dd * SR)); step = 60 / bpm / 2
    for k in range(int(dd / step) + 1):
        s = int(k * step * SR); n = int(0.05 * SR); b = highpass(noise(0.05), 6000) * expdec(n, 0.008) * (1 if k % 2 == 0 else 0.5)
        if s < len(x): x[s:s + n] += b[:len(x) - s]
    return x

def place(buf, x, t, gain=1.0):
    s = int(t * SR)
    if x.ndim == 1: x = pan(x, 0)
    if s < 0: x = x[-s:]; s = 0
    e = min(len(buf), s + len(x)); buf[s:e] += x[:e - s] * gain

def build_score(TL, total):
    m = np.zeros((int(total * SR) + SR, 2)); SH = {s['id']: s for s in TL['shots']}
    T = lambda sid, o=0: SH[sid]['t0'] + o
    sc = {k: (min(s['t0'] for s in TL['shots'] if s['sc'] == k), max(s['t1'] for s in TL['shots'] if s['sc'] == k)) for k in range(1, 8)}
    # Scene 1: calm piano motif in A minor over a warm pad, then dissonance at the alarm
    motif = [69, 72, 76, 74, 72, 71, 72, 69]
    for i, n in enumerate(motif * 2):
        t = 0.6 + i * 0.95
        if t > T('s08') - 0.3: break
        place(m, reverb(piano(mtof(n), 3.0, 0.5), IR_HALL, 0.4), t, db(-21))
        if i % 4 == 0: place(m, piano(mtof(n - 24), 3.0, 0.5), t, db(-24))
    place(m, pad([mtof(57), mtof(60), mtof(64)], T('s08') + 0.5, 900, 2.5, 1.0), 0.0, db(-31))
    d = T('s10', 2.2) - T('s08'); place(m, pad([mtof(45), mtof(46), mtof(52)], d, 500, 0.3, 1.0), T('s08'), db(-24))
    # Scene 2: low pulse + heartbeat, tension
    a, b = sc[2]; place(m, pad([mtof(40), mtof(47), mtof(48)], b - a, 400, 2, 1.5), a, db(-28)); place(m, heartbeat(b - a, 66), a, db(-24))
    # Scene 3: driving ostinato + ticks, building
    a, b = sc[3]; d = b - a
    bass = np.zeros(int(d * SR)); step = 60 / 104 / 2; pat = [40, 40, 52, 40, 43, 40, 47, 40]
    for k in range(int(d / step)):
        s = int(k * step * SR); n = int(0.3 * SR); f = mtof(pat[k % 8] - 12); x = lowpass(saw(f, 0.3), 500) * expdec(n, 0.08)
        bass[s:s + n] += x[:max(0, len(bass) - s)]
    grow = np.linspace(0.6, 1.0, len(bass)); place(m, bass * grow, a, db(-25)); place(m, ticks(d, 104) * grow, a, db(-34))
    place(m, pad([mtof(52), mtof(55), mtof(59), mtof(62)], d, 1500, 3, 2), a, db(-32))
    # Scene 4: near silence, low drone + cluster swell on the reveal
    a, b = sc[4]; place(m, pad([mtof(33), mtof(40)], b - a, 260, 2, 2), a, db(-27))
    place(m, reverb(pad([mtof(58), mtof(59), mtof(64), mtof(65)], 5, 2200, 1.0, 3.0), IR_BIG, 0.5), T('s30', 0.8), db(-28))
    # Scene 5: glassy eerie tones
    a, b = sc[5]
    for i in range(int((b - a) / 2.4)):
        f = mtof([81, 82, 77, 76, 81, 84, 83, 77][i % 8]); g = sine(lambda t: f * (1 + 0.004 * np.sin(t * 30)), 3.0) * env_adsr(int(3 * SR), 0.6, 0.3, 0.6, 1.5)
        place(m, reverb(g, IR_HALL, 0.6), a + i * 2.4, db(-34))
    place(m, pad([mtof(38), mtof(45), mtof(46)], b - a, 350, 2, 2), a, db(-28))
    # Scene 6: heartbeat faster; drop out for the silence in the call
    a, b = sc[6]; hb = heartbeat(b - a, 92); cut0, cut1 = T('s50', 2.7) - a, T('s51', 0) - a
    hb[int(cut0 * SR):int(cut1 * SR)] *= 0.0; place(m, hb, a, db(-22))
    place(m, pad([mtof(36), mtof(37), mtof(43)], b - a, 300, 1, 1), a, db(-27))
    # Scene 7: build -> impact at the watch, then the motif returns, resolute
    a, b = sc[7]; place(m, pad([mtof(38), mtof(41), mtof(45)], T('s57', 3.0) - a, 600, 1, 0.5), a, db(-28))
    t = T('s58', 0.2)
    for i, n in enumerate([69, 72, 76, 74, 72, 71, 69, 64, 69]):
        place(m, reverb(piano(mtof(n), 3.0, 0.55), IR_HALL, 0.45), t + i * 1.05, db(-20))
    place(m, pad([mtof(45), mtof(52), mtof(57), mtof(60)], T('s60') - T('s58'), 1600, 2, 1.2), T('s58'), db(-27))
    place(m, pad([mtof(45), mtof(52), mtof(57), mtof(60), mtof(64)], 6.5, 1800, 0.4, 3.0), T('s61', 0.3), db(-25))
    return m

# ----------------------------------------------------------------------------- assemble
def main():
    TL = json.load(open(os.path.join(ROOT, 'audio', 'timeline.json')))
    total = TL['total']; N = int(total * SR) + SR
    sfx = np.zeros((N, 2)); SH = {s['id']: s for s in TL['shots']}
    T = lambda sid, o=0: SH[sid]['t0'] + o
    # ambience beds (scene-range based, with short crossfades)
    def bed(x, a, b, fade=0.4):
        n = min(int((b - a) * SR), len(x)); x = x[:n] * db(6); e = np.ones(n); f = int(fade * SR); e[:f] = np.linspace(0, 1, f); e[-f:] = np.linspace(1, 0, f); place(sfx, x * e[:, None], a)
    bed(amb_golf(T('s10') - 0 + 0.3), 0, T('s10') + 0.3)
    bed(amb_golf(T('s18') - T('s11')), T('s11'), T('s18') + 0.2)
    a, b = T('s18'), T('s26'); t = t_(b - a) + a
    interior = np.zeros(len(t))
    for sid in ('s19', 's20', 's21', 's22', 's24'):
        interior[(t >= SH[sid]['t0']) & (t < SH[sid]['t1'])] = 1.0
    interior = np.convolve(interior, np.ones(2400) / 2400, mode='same')
    bed(amb_road(b - a, interior), a, b + 0.2, 0.2)
    bed(amb_house_ext(T('s30') - T('s26')), T('s26'), T('s30') + 0.3)
    for (s0, s1) in (('s30', 's51'), ('s52', 's60')):
        bed(amb_room(T(s1) - T(s0), True, T(s0)), T(s0), T(s1) + 0.2, 0.25)
    bed(amb_basement(T('s52') - T('s51')), T('s51'), T('s52'), 0.15)
    # engine idle in house arrival
    place(sfx, pan(lowpass(saw(40, 1.8), 300) * expdec(int(1.8 * SR), 0.9), 0.3), T('s26'), db(-18))
    # footsteps
    FOOT = [('s07', 0.05, 0.8, 0.4, 'grass'), ('s15', 0.0, None, 0.5, 'grass'), ('s16', 0.0, None, 0.6, 'grass'), ('s26', 2.3, None, 0.47, 'asphalt'),
            ('s27', 0.0, None, 0.47, 'tile'), ('s29', 0.6, 2.4, 0.6, 'tile'), ('s30', 0.0, None, 0.52, 'tile'), ('s33', 0.0, None, 0.5, 'tile'), ('s35', 0.0, 1.9, 0.48, 'tile')]
    for sid, a0, a1, step, surf in FOOT:
        s = SH[sid]; end = s['dur'] if a1 is None else a1; k = 0
        while a0 + k * step < end:
            place(sfx, pan(footstep(surf, rng.uniform(-2, 1)), -0.1 if k % 2 else 0.1), s['t0'] + a0 + k * step); k += 1
    # cue sounds
    for c in TL['sfx']:
        name = c['name']; kw = {}
        if name == 'ringtone': kw['d'] = 1.9 if c['shot'] == 's21' else 1.55
        if name == 'riser': kw['d'] = 3.0 if c['shot'] != 's43' else 2.6
        x = S(name, **kw)
        if name in ('ringback',) and c['shot'] in ('s19',): x = lowpass(x, 2500) * 1.6  # through car speakers
        place(sfx, x if x.ndim == 2 else pan(x, 0), c['t'], db(c.get('db', 0)))
    # score + ducking under planned voice lines
    music = build_score(TL, total)[:N]
    duck = np.ones(N)
    for c in TL['cues']:
        a, b = int((c['start'] - 0.15) * SR), int((c['end'] + 0.3) * SR); duck[max(0, a):b] = db(-7)
    duck = np.convolve(duck, np.ones(9600) / 9600, mode='same')
    music *= duck[:, None] * db(7)
    # fades
    for buf in (sfx, music):
        buf[:int(0.05 * SR)] *= np.linspace(0, 1, int(0.05 * SR))[:, None]
        e = int(total * SR); buf[e:] = 0
    os.makedirs(OUT, exist_ok=True)
    def write(path, x):
        import wave
        x = np.clip(x, -1, 1); pcm = (x * 32767).astype('<i2')
        with wave.open(path, 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    mix = sfx + music
    pk = np.max(np.abs(mix)); g = 0.89 / pk if pk > 0.89 else 1.0
    write(os.path.join(OUT, 'sfx_amb.wav'), sfx[:int(total * SR)] * g)
    write(os.path.join(OUT, 'music.wav'), music[:int(total * SR)] * g)
    write(os.path.join(OUT, 'mix_novo.wav'), mix[:int(total * SR)] * g)
    print('audio written, peak', pk, 'gain', g)

if __name__ == '__main__':
    main()
