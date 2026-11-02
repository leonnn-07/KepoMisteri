// Exports src/timeline.js to audio/timeline.json for the python audio tools.
import fs from 'node:fs';
import { SHOTS, CUES, SFX, TOTAL, LINES, SCENES } from '../src/timeline.js';
fs.writeFileSync(new URL('../audio/timeline.json', import.meta.url), JSON.stringify({ total: TOTAL, shots: SHOTS, cues: CUES, sfx: SFX, lines: LINES, scenes: SCENES }, null, 1));
console.log('exported', SHOTS.length, 'shots,', CUES.length, 'voice cues,', SFX.length, 'sfx cues; total', TOTAL, 's');
