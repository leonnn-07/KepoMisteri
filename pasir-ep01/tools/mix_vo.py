#!/usr/bin/env python3
"""Drop ElevenLabs takes into vo/ (L01.mp3 … L36.mp3) and run:  python3 tools/mix_vo.py

* decodes each take with ffmpeg, trims silence, applies per-voice processing
  (narasi = dry & close, dialog = light room, phone = telephone EQ, misterius = phone EQ + lower pitch + dark reverb)
* places every take at its timecode from src/timeline.js, ducks the score under the real voice envelope
* rebuilds the subtitles with the real take lengths and renders output/final_video_vo.mp4
Missing takes are simply skipped (the subtitle still shows)."""
import json, os, subprocess, sys, wave
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'audio'))
import sound_design as sd  # noqa: E402
SR = sd.SR

def run(cmd): print('$', ' '.join(cmd)); subprocess.run(cmd, check=True)
def read_wav(p):
    w = wave.open(p); x = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(np.float64) / 32768
    return x.reshape(-1, w.getnchannels())
def write_wav(p, x):
    x = np.clip(x, -1, 1); w = wave.open(p, 'wb'); w.setnchannels(x.shape[1]); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype('<i2').tobytes()); w.close()
def decode(path, pitch=1.0):
    af = f'asetrate={int(44100 * pitch)},aresample=44100,atempo={1 / pitch:.4f},' if pitch != 1.0 else ''
    af += 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse'
    out = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-af', af, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(out, '<i2').astype(np.float64) / 32768

def main():
    run(['node', os.path.join(ROOT, 'tools', 'export_timeline.mjs')])
    TL = json.load(open(os.path.join(ROOT, 'audio', 'timeline.json')))
    total = TL['total']; N = int(total * SR)
    vo = np.zeros((N + SR * 4, 2)); env = np.zeros(N + SR * 4); durations = {}
    cues = TL['cues']
    for i, c in enumerate(cues):
        src = next((os.path.join(ROOT, 'vo', c['id'] + e) for e in ('.mp3', '.wav', '.m4a', '.ogg') if os.path.exists(os.path.join(ROOT, 'vo', c['id'] + e))), None)
        if not src: print(f'  - {c["id"]}: file belum ada, dilewati'); continue
        x = decode(src, 0.9 if c['who'] == 'MISTERIUS' else 1.0)
        x = x / (np.sqrt(np.mean(x ** 2)) + 1e-9) * sd.db(-20)  # level match
        if c['kind'] == 'phone':
            x = sd.phone_eq(x) * 1.2
            if c['who'] == 'MISTERIUS': x = sd.reverb(sd.lowpass(x, 2600), sd.IR_BIG, 0.22)
            p = 0.25
        elif c['kind'] == 'dialog':
            shot = next(s for s in TL['shots'] if s['id'] == c['shot'])
            x = sd.reverb(x, sd.IR_ROOM, 0.16 if shot['sc'] >= 4 else 0.08); p = 0.0
        else:
            x = sd.highpass(x, 70); p = 0.0
        d = len(x) / SR; durations[c['id']] = round(d, 3)
        nxt = cues[i + 1]['start'] if i + 1 < len(cues) else total
        if c['start'] + d > nxt + 0.05: print(f'  ! {c["id"]}: take {d:.2f}s lebih panjang dari slot ({nxt - c["start"]:.2f}s) — pertimbangkan speed 1.1x')
        sd.place(vo, sd.pan(x, p), c['start'], 1.0)
        a = int(c['start'] * SR); env[a:a + len(x)] = 1
        print(f'  + {c["id"]} {d:.2f}s @ {c["start"]:.2f}s')
    json.dump(durations, open(os.path.join(ROOT, 'vo', 'durations.json'), 'w'), indent=1)
    sfx = read_wav(os.path.join(ROOT, 'output', 'audio', 'sfx_amb.wav')); mus = read_wav(os.path.join(ROOT, 'output', 'audio', 'music.wav'))
    n = min(len(sfx), len(mus), N)
    duck = 1 - 0.45 * np.convolve(env[:n], np.ones(7200) / 7200, mode='same')
    mix = sfx[:n] * (1 - 0.25 * (1 - duck))[:, None] + mus[:n] * duck[:, None] + vo[:n] * 1.0
    mix /= max(1.0, np.max(np.abs(mix)) / 0.95)
    out_wav = os.path.join(ROOT, 'output', 'audio', 'mix_vo.wav'); write_wav(out_wav, mix)
    run(['node', os.path.join(ROOT, 'tools', 'make_subs.mjs')])
    run(['ffmpeg', '-y', '-v', 'error', '-i', os.path.join(ROOT, 'output', 'video_nosub.mp4'), '-i', out_wav,
         '-vf', f"ass={os.path.join(ROOT, 'output', 'subtitle.ass')}", '-af', 'loudnorm=I=-16:TP=-1.5:LRA=14',
         '-c:v', 'libx264', '-crf', '17', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-movflags', '+faststart', '-shortest',
         os.path.join(ROOT, 'output', 'final_video_vo.mp4')])
    print('selesai: output/final_video_vo.mp4')

if __name__ == '__main__':
    main()
