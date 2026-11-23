'use strict';
// boat.js: the demo's one recurring object, a paper boat, shared by every film in this folder (classic script:
// load it after ../engine/core.js). The drawing follows four-looks.html of the hand-drawn engine
// (MIT © 2026 Alexey Fateev, see ../engine/LICENSE-MIT.txt); the draw-on, scale and pose options are ours.
// Keep the boat near the same place on screen in every film (x = CX, y ≈ 1000 in a 1080×1920 frame):
// a cut between two materials reads as one journey when the object does not jump.
const HULL = [[-78, 0], [78, 0], [52, 44], [-52, 44]], SAIL = [[0, -84], [-46, 0], [46, 0]];
const BOAT = { hull: polyPath(HULL), sail: polyPath(SAIL) };
const HULL_LEN = 365, SAIL_LEN = 290;   // outline lengths in boat units (for the draw-on dash)

// mode: 'ink' (filled paper, palette finish) | 'line' (outline only) | 'blueprint' (chalk outline)
// pose: { tilt, draw 0..1 (outline drawn so far), fill 0..1 (fill and finish), note (squiggle writing on the hull), color, width }
// (no pressure option on purpose: a pressure line is stroked segment by segment, so the draw-on dash would not work)
function drawBoat(c, mode, pose = {}, seed = 1) {
  const filled = mode === 'ink', line = pose.color || (mode === 'blueprint' ? PAL.chalk : PAL.ink), p = pose.draw ?? 1, f = pose.fill ?? 1;
  c.save(); c.rotate(pose.tilt || 0); c.lineJoin = 'round'; c.lineCap = 'round';
  if (filled && f > 0) {
    c.save(); c.globalAlpha = f;
    for (const [k, box] of [['sail', [-50, -88, 100, 92]], ['hull', [-82, -2, 164, 50]]]) {
      c.fillStyle = PAL.light; c.fill(BOAT[k]);
      surface(c, BOAT[k], box, { seed: seed + k.length, density: .16, color: PAL.inks[0], gap: 7, len: 12, alpha: .22, grain: 30, cell: 8 });
    }
    c.restore();
  }
  c.strokeStyle = line; c.lineWidth = pose.width || (mode === 'blueprint' ? 2.4 : 2.6);
  if (p > 0) {
    c.save(); if (p < 1) c.setLineDash([HULL_LEN * p, HULL_LEN * 2]); wob(c, HULL, 1.6, seed + 1, true); c.restore();
    const ps = clamp(p * 1.25 - .25, 0, 1);
    if (ps > 0) { c.save(); if (ps < 1) c.setLineDash([SAIL_LEN * ps, SAIL_LEN * 2]); wob(c, SAIL, 1.6, seed + 2, true); c.restore(); }
  }
  if (p >= 1) { c.save(); c.setLineDash([7, 6]); c.lineWidth = 1.6; wob(c, [[0, -84], [0, 44]], 1, seed + 3); c.restore(); }
  if (filled && pose.note && f > .6) { c.save(); c.globalAlpha = (f - .6) / .4; squiggleText(c, -44, 16, 88, 3, { seed: seed + 4, lineH: 9, amp: 2.5, width: 1, color: PAL.ink }); c.restore(); }
  c.restore();
}
// a boat placed in the frame: x, y = the middle of the waterline, s = scale (1 = 156 units wide)
function boatAt(c, x, y, s, mode, pose, seed) { c.save(); c.translate(x, y); c.scale(s, s); drawBoat(c, mode, pose, seed); c.restore(); }
// a gentle bob for a floating boat: [dy, tilt]
const bob = (tau, amp = 6, period = 2.1, phase = 0) => [Math.sin((tau / period + phase) * TAU) * amp, Math.sin((tau / period + phase + .25) * TAU) * .035];
