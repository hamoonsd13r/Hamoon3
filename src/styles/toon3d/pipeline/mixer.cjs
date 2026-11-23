// Toon3D: a float-PCM mixer for a film's sound (narration + an edited score ducked under the voice + effects on the
// picture's beats + ambience beds), written as stems + mix (master.mjs then sets -14 LUFS for tools/finalize.mjs).
// A film's build-audio.cjs is only its cue list (see pipeline/build-audio.cjs, the demo's):
//   const { mixer } = require("./mixer.cjs");                 // (path from your script)
//   const mx = mixer({ total: FRAMES / 30, vo: FILM + "/dlg/vo.json" });
//   const { W, place, loop, roar, hiss } = mx;                 // W("word", line) = onset (s), like the film's timing
//   const music = mx.musicEdit(FILM + "/music/m.mp3", [[0, bar26], [bar29, bar47], ...]);   // pieces cut on bar lines
//   const voice = mx.voice(FILM + "/vo.wav"), fx = mx.track(), amb = mx.track();
//   place(fx, file, t, { db, rate, lp, from, dur, fi, fo, pan }); loop(amb, file, t0, t1, { db, lp, fi, fo });
//   roar(fx, [[t, dB], ...], { lp, lp2, gain });               // brown-noise rumble on an envelope (thunder, swell)
//   hiss(amb, [[t, dB], ...], { hp, lp });                     // white-noise bed on an envelope (rain, wind, spray)
//   mx.duck(music, voice, { db: -6, also: [[amb, 0.6]] });     // music dips under the words; amb keeps 60 %
//   mx.duckWords(voice, 7.6, [[music, -11]], [[fx, -13], [amb, -9]]);   // then word by word: every word >= 12 dB over the bed
//   mx.write(FILM + "/audio", [["voice", voice, 7.6], ["music", music, -11], ["fx", fx, -13], ["amb", amb, -9]]);
// Env G_VOICE / G_MUSIC / G_FX / G_AMB add dB to a stem without editing the script (quick level tests).
const fs = require("fs"), { execFileSync } = require("child_process");

function mixer({ total, sr = 48000, vo = null }) {
  const SR = sr, N = Math.ceil(total * SR);
  const dB = (x) => Math.pow(10, x / 20);

  // ---------- io ----------
  const cache = new Map();
  const decode = (file) => {
    if (cache.has(file)) return cache.get(file);
    const buf = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-f", "f32le", "-ac", "2", "-ar", String(SR), "-"], { maxBuffer: 1 << 30 });
    const f = new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length));
    cache.set(file, f);
    return f;
  };
  const writeWav = (file, L, R) => {
    const n = L.length, b = Buffer.alloc(44 + n * 4);
    b.write("RIFF", 0); b.writeUInt32LE(36 + n * 4, 4); b.write("WAVE", 8); b.write("fmt ", 12); b.writeUInt32LE(16, 16);
    b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34);
    b.write("data", 36); b.writeUInt32LE(n * 4, 40);
    for (let i = 0; i < n; i++) {
      b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(L[i] * 32767))), 44 + i * 4);
      b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(R[i] * 32767))), 46 + i * 4);
    }
    fs.writeFileSync(file, b);
  };
  const track = () => ({ L: new Float32Array(N), R: new Float32Array(N) });

  // ---------- the narration's words (same matching as the kit's timeline) ----------
  const VO = vo ? JSON.parse(fs.readFileSync(vo, "utf8")) : { words: [] };
  const bare = (s) => s.replace(/[.،؛,!?؟«»"]/g, "").replace(/\u200c/g, "");
  const hits = (w, line) => VO.words.filter((x) => x.line === line && bare(x.w) === bare(w));
  const W = (w, line, occ = 0) => { const h = hits(w, line); if (!h[occ]) throw new Error(w + " " + line); return h[occ].s; };
  const WE = (w, line, occ = 0) => { const h = hits(w, line); if (!h[occ]) throw new Error(w + " " + line); return h[occ].e; };

  /** a sound at t: gain (db), playback rate, one-pole low-pass (lp Hz), start offset (from s), length (dur s), fades, pan -1..1 */
  function place(tr, file, t, o = {}) {
    const src = decode(file), ns = src.length / 2, rate = o.rate ?? 1, g = dB(o.db ?? 0);
    const from = Math.round((o.from ?? 0) * SR), len = Math.min(ns - from, Math.round((o.dur ?? 1e9) * SR * rate)) / rate;
    const fi = Math.max(1, (o.fi ?? 0.005) * SR), fo = Math.max(1, (o.fo ?? 0.02) * SR), t0 = Math.round(t * SR);
    const a = o.lp ? 1 - Math.exp((-2 * Math.PI * o.lp) / SR) : 1, pan = o.pan ?? 0, gl = g * Math.min(1, 1 - pan), gr = g * Math.min(1, 1 + pan);
    let yl = 0, yr = 0;
    for (let i = 0; i < len; i++) {
      const k = t0 + i;
      if (k < 0) continue;
      if (k >= N) break;
      const p = from + i * rate, p0 = Math.floor(p), fr = p - p0;
      if (p0 + 1 >= ns) break;
      let l = src[p0 * 2] * (1 - fr) + src[p0 * 2 + 2] * fr, r = src[p0 * 2 + 1] * (1 - fr) + src[p0 * 2 + 3] * fr;
      yl += a * (l - yl); yr += a * (r - yr);
      const env = Math.min(1, i / fi, (len - i) / fo);
      tr.L[k] += yl * gl * env; tr.R[k] += yr * gr * env;
    }
  }
  /** a looping bed from t0 to t1 (0.6 s crossfaded loops; a third of the file for files under 1.8 s), with fades.
   *  (a film once lost 6 s of its whole mix here: a 0.27 s file made the loop length negative -> NaN.) */
  function loop(tr, file, t0, t1, o = {}) {
    const src = decode(file), ns = src.length / 2, xf = Math.min(Math.round(0.6 * SR), Math.floor(ns / 3)), seg = ns - xf, g = dB(o.db ?? 0);
    if (seg < 1) throw new Error(`loop: ${file} is too short to loop`);
    const a = o.lp ? 1 - Math.exp((-2 * Math.PI * o.lp) / SR) : 1, fi = (o.fi ?? 1) * SR, fo = (o.fo ?? 1) * SR;
    const k0 = Math.round(t0 * SR), k1 = Math.min(N, Math.round(t1 * SR));
    let yl = 0, yr = 0;
    for (let k = k0; k < k1; k++) {
      const i = k - k0, c = i % seg, n = Math.floor(i / seg);
      let l = src[c * 2], r = src[c * 2 + 1];
      if (c < xf && n > 0) { const w = c / xf, q = (seg + c) * 2; l = l * w + src[q] * (1 - w); r = r * w + src[q + 1] * (1 - w); }
      yl += a * (l - yl); yr += a * (r - yr);
      const env = Math.min(1, i / fi, (k1 - k) / fo);
      tr.L[k] += yl * g * env; tr.R[k] += yr * g * env;
    }
  }
  /** a deep rumble / roar: brown noise through two low-passes, shaped by an envelope of [t, dB] keys */
  function roar(tr, keys, o = {}) {
    const t0 = keys[0][0], t1 = keys[keys.length - 1][0], a1 = 1 - Math.exp((-2 * Math.PI * (o.lp ?? 160)) / SR), a2 = 1 - Math.exp((-2 * Math.PI * (o.lp2 ?? 420)) / SR);
    let bl = 0, br = 0, l1 = 0, r1 = 0, l2 = 0, r2 = 0, seed = 12345;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x3fffffff - 1; };
    const lev = (t) => { for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const [ta, va] = keys[i - 1], [tb, vb] = keys[i], u = (t - ta) / (tb - ta); return va + (vb - va) * u * u * (3 - 2 * u); } return keys[keys.length - 1][1]; };
    for (let k = Math.round(t0 * SR); k < Math.min(N, Math.round(t1 * SR)); k++) {
      bl = 0.995 * bl + 0.05 * rnd(); br = 0.995 * br + 0.05 * rnd();
      l1 += a1 * (bl - l1); r1 += a1 * (br - r1); l2 += a2 * (bl - l2); r2 += a2 * (br - r2);
      const g = dB(lev(k / SR)) * (o.gain ?? 3);
      tr.L[k] += (l1 * 0.8 + l2 * 0.35) * g; tr.R[k] += (r1 * 0.8 + r2 * 0.35) * g;
    }
  }
  /** a noise bed (rain, wind, spray): white noise through a one-pole high-pass (hp Hz) and low-pass (lp Hz), shaped by
   *  an envelope of [t, dB] keys (smoothstep between keys); seed changes the grain */
  function hiss(tr, keys, o = {}) {
    const t0 = keys[0][0], t1 = keys[keys.length - 1][0], ah = Math.exp((-2 * Math.PI * (o.hp ?? 900)) / SR), al = 1 - Math.exp((-2 * Math.PI * (o.lp ?? 7000)) / SR);
    let seed = o.seed ?? 777, pl = 0, pr = 0, hl = 0, hr = 0, ll = 0, lr = 0;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x3fffffff - 1; };
    const lev = (t) => { for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const [ta, va] = keys[i - 1], [tb, vb] = keys[i], u = (t - ta) / (tb - ta); return va + (vb - va) * u * u * (3 - 2 * u); } return keys[keys.length - 1][1]; };
    for (let k = Math.max(0, Math.round(t0 * SR)); k < Math.min(N, Math.round(t1 * SR)); k++) {
      const xl = rnd(), xr = rnd();
      hl = ah * (hl + xl - pl); hr = ah * (hr + xr - pr); pl = xl; pr = xr;   // high-pass
      ll += al * (hl - ll); lr += al * (hr - lr);                             // low-pass
      const g = dB(lev(k / SR)) * (o.gain ?? 0.5);
      tr.L[k] += ll * g; tr.R[k] += lr * g;
    }
  }
  /** the score cut into pieces [[from s, to s], ...] laid end to end (cut on bar lines; xf s equal-time crossfades) */
  function musicEdit(file, segs, xf = 0.02) {
    const M = decode(file), MN = M.length / 2, out = track(), XF = Math.round(xf * SR);
    let at = 0;
    for (const [a, b] of segs) {
      const s0 = Math.round(a * SR), s1 = Math.round(b * SR), k0 = Math.round(at * SR);
      for (let i = 0; i < s1 - s0 + XF && s0 + i < MN; i++) {
        const k = k0 + i;
        if (k >= N) break;
        const w = Math.min(1, (i + 1) / XF, (s1 - s0 + XF - i) / XF);
        out.L[k] += M[(s0 + i) * 2] * Math.sqrt(Math.max(0, w)); out.R[k] += M[(s0 + i) * 2 + 1] * Math.sqrt(Math.max(0, w));
      }
      at += b - a;
    }
    out.length = at;
    return out;
  }
  /** a narration (or any finished file) as a track from t = 0 */
  function voice(file) {
    const v = decode(file), tr = track();
    for (let i = 0; i < Math.min(N, v.length / 2); i++) { tr.L[i] = v[i * 2]; tr.R[i] = v[i * 2 + 1]; }
    return tr;
  }
  /** duck `target` under `key` (the voice): db when the key is on (rms > thr over win s), attack / release s;
   *  `also` = [[track, keep]] dipped partly (keep = the share that stays) */
  function duck(target, key, { db = -6, attack = 0.04, release = 0.45, thr = 0.01, win: winS = 0.02, also = [] } = {}) {
    const win = Math.round(winS * SR), env = new Float32Array(Math.ceil(N / win));
    for (let j = 0; j < env.length; j++) { let s = 0; for (let i = j * win; i < Math.min(N, (j + 1) * win); i++) s += key.L[i] * key.L[i]; env[j] = Math.sqrt(s / win); }
    let g = 1; const att = 1 - Math.exp(-winS / attack), rel = 1 - Math.exp(-winS / release), DUCK = dB(db);
    const gain = new Float32Array(env.length);
    for (let j = 0; j < env.length; j++) { const on = env[j] > thr ? 1 : 0, tgt = on ? DUCK : 1; g += (tgt - g) * (tgt < g ? att : rel); gain[j] = g; }
    for (let i = 0; i < N; i++) {
      const j = Math.min(gain.length - 1, Math.floor(i / win));
      target.L[i] *= gain[j]; target.R[i] *= gain[j];
      for (const [tr, keep] of also) { tr.L[i] *= keep + (1 - keep) * gain[j]; tr.R[i] *= keep + (1 - keep) * gain[j]; }
    }
    return gain;
  }
  /** word-by-word dip (after duck): for every narration word, lower `targets` just enough that the spoken part of the
   *  word sits `margin` dB over the whole bed (targets + others), at most `max` dB, ramped in/out. The level duck alone
   *  lets the music swell back on soft sentence endings (the voice drops under its threshold exactly there).
   *  voiceDb / beds' dB = the levels they get in write(). Returns the number of words it dipped. */
  function duckWords(voiceTr, voiceDb, targets, others = [], { margin = 12, max = 10, pre = 0.05, post = 0.12, ramp = 0.1 } = {}) {
    const gain = new Float32Array(N).fill(1), F = Math.round(0.01 * SR), gV = dB(voiceDb), R = Math.round(ramp * SR);
    const beds = [...targets, ...others];
    let n = 0;
    for (const w of VO.words) {
      const i0 = Math.max(0, Math.round(w.s * SR)), i1 = Math.min(N, Math.max(i0 + F, Math.round(w.e * SR)));
      const fr = [];
      for (let k = i0; k + F <= i1; k += F) {
        let v = 0, b = 0;
        for (let i = k; i < k + F; i++) {
          const x = (voiceTr.L[i] + voiceTr.R[i]) * 0.5 * gV; v += x * x;
          let y = 0; for (const [tr, db] of beds) y += (tr.L[i] + tr.R[i]) * 0.5 * dB(db); b += y * y;
        }
        fr.push([v, b]);
      }
      if (!fr.length) continue;
      const top = Math.max(...fr.map((p) => p[0]));
      if (top <= 1e-12) continue;
      const sp = fr.filter((p) => p[0] >= top * 0.1); // the spoken frames (within 10 dB of the word's peak)
      const v = sp.reduce((s, p) => s + p[0], 0), b = sp.reduce((s, p) => s + p[1], 0) + 1e-12;
      const need = Math.min(max, margin - 10 * Math.log10(v / b));
      if (need <= 0) continue;
      n++;
      const g = dB(-need), a0 = Math.round((w.s - pre) * SR), a1 = Math.round((w.e + post) * SR);
      for (let k = Math.max(0, a0 - R); k < Math.min(N, a1 + R); k++) {
        const e = k < a0 ? (k - (a0 - R)) / R : k > a1 ? (a1 + R - k) / R : 1, s = e * e * (3 - 2 * e);
        gain[k] = Math.min(gain[k], 1 - (1 - g) * s);
      }
    }
    for (const [tr] of targets) for (let i = 0; i < N; i++) { tr.L[i] *= gain[i]; tr.R[i] *= gain[i]; }
    console.log(`duckWords: ${n} of ${VO.words.length} words dipped (margin ${margin} dB, max ${max} dB)`);
    return n;
  }
  /** stems at their levels (dB) + the mix: <dir>/stem-<name>.wav and <dir>/mix.wav. Refuses to write a stem with
   *  NaN / Infinity samples (they would be written as silence and silence the whole mix there). */
  function write(dir, stems) {
    fs.mkdirSync(dir, { recursive: true });
    const mix = track();
    for (const [name, tr] of stems) {
      let bad = 0, first = -1;
      for (let i = 0; i < N; i++) if (!Number.isFinite(tr.L[i]) || !Number.isFinite(tr.R[i])) { bad++; if (first < 0) first = i; }
      if (bad) throw new Error(`stem ${name}: ${bad} broken samples (NaN/Inf) from ${(first / SR).toFixed(2)} s: check the cue placed there`);
    }
    for (const [name, tr, db] of stems) {
      const g = dB(db) * dB(Number(process.env["G_" + name.toUpperCase()] || 0));
      for (let i = 0; i < N; i++) { tr.L[i] *= g; tr.R[i] *= g; mix.L[i] += tr.L[i]; mix.R[i] += tr.R[i]; }
      writeWav(`${dir}/stem-${name}.wav`, tr.L, tr.R);
    }
    writeWav(`${dir}/mix.wav`, mix.L, mix.R);
    console.log("wrote", dir, (N / SR).toFixed(2), "s");
  }
  return { SR, N, dB, decode, writeWav, track, VO, W, WE, place, loop, roar, hiss, musicEdit, voice, duck, duckWords, write };
}
module.exports = { mixer };
