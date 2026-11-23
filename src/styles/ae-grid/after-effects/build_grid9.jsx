// =====================================================================
//  GRID 9 — 3x3 animated 360x360 tiles in a 1080x1920 frame, 30fps, 8s seamless loop
//  Builds a fully layered After Effects project: native shape layers,
//  nulls and keyframes only (no expressions, no footage).
//  Run: File > Scripts > Run Script File...  (or AfterFX.exe -r <this file>)
// =====================================================================
(function () {

// everything is written next to this script: the project, a build log and three QC stills
var HERE = File($.fileName).parent.fsName.replace(/\\/g, "/");
var OUT_AEP = HERE + "/Grid9_Tiles.aep";
var LOGF    = HERE + "/build_log.txt";
var QCDIR   = HERE + "/qc";

var FPS = 30, DUR = 8, CW = 360, CH = 360;
var KAPPA = 0.5523;
var LOG = [];
function log(s) { LOG.push(String(s)); }
function flushLog() {
    try { var f = new File(LOGF); f.encoding = "UTF-8"; f.open("w"); f.write(LOG.join("\n")); f.close(); } catch (e) {}
}

// ---------- palette ----------
function hex(h) {
    h = h.replace("#", "");
    return [parseInt(h.substr(0, 2), 16) / 255, parseInt(h.substr(2, 2), 16) / 255, parseInt(h.substr(4, 2), 16) / 255, 1];
}
// Three complementary colours. Switch palette here and re-run the script.
var PALETTES = {
    P1: { name: "Aubergine / Saffron / Ivory", D: "#23153C", V: "#FFB21E", L: "#F5EFE6" },
    P2: { name: "Forest / Tomato / Blush",     D: "#12332C", V: "#FF5638", L: "#F7DCCF" },
    P3: { name: "Ink / Signal Red / Ice",      D: "#121418", V: "#FF3B30", L: "#D9E8FF" }
};
var PAL = "P2";   // chosen: Forest / Tomato / Blush
var C = { D: hex(PALETTES[PAL].D), V: hex(PALETTES[PAL].V), L: hex(PALETTES[PAL].L) };   // D = dark, V = vivid, L = light
// ---------- keyframe helpers ----------
var KI = KeyframeInterpolationType;
function K(frame, value, spec, opts) { return [frame / FPS, value, spec || "ee", opts || {}]; }
function nEase(prop) {
    var t = prop.propertyValueType;
    if (t == PropertyValueType.TwoD) return 2;
    if (t == PropertyValueType.ThreeD) return 3;
    return 1;
}
function easeArr(n, sp, inf) {
    var a = [];
    inf = Math.max(0.1, Math.min(100, inf));
    for (var i = 0; i < n; i++) a.push(new KeyframeEase(sp, inf));
    return a;
}
function itype(c) { return c == "l" ? KI.LINEAR : (c == "h" ? KI.HOLD : KI.BEZIER); }
function zeros(n) { var z = []; for (var i = 0; i < n; i++) z.push(0); return z; }

// keys: [t, value, "io", {inf, ii, oi, is, os}]   i/o: e=ease  l=linear  h=hold(out only)
function anim(prop, keys, defInf, label) {
    if (defInf == null) defInf = 75;
    try {
        var ts = [], vs = [], i;
        for (i = 0; i < keys.length; i++) { ts.push(keys[i][0]); vs.push(keys[i][1]); }
        prop.setValuesAtTimes(ts, vs);
        var n = nEase(prop);
        for (i = 0; i < keys.length; i++) {
            var k = keys[i], spec = k[2], o = k[3];
            var idx = prop.nearestKeyIndex(k[0]);
            var it = itype(spec.charAt(0)), ot = itype(spec.charAt(1));
            if (it == KI.HOLD) it = KI.LINEAR;
            prop.setInterpolationTypeAtKey(idx, it, ot);
            if (it == KI.BEZIER || ot == KI.BEZIER) {
                var ii = (o.ii != null) ? o.ii : ((o.inf != null) ? o.inf : defInf);
                var oi = (o.oi != null) ? o.oi : ((o.inf != null) ? o.inf : defInf);
                var inE  = (it == KI.BEZIER) ? easeArr(n, o.is || 0, ii) : prop.keyInTemporalEase(idx);
                var outE = (ot == KI.BEZIER) ? easeArr(n, o.os || 0, oi) : prop.keyOutTemporalEase(idx);
                prop.setTemporalEaseAtKey(idx, inE, outE);
                prop.setInterpolationTypeAtKey(idx, it, ot);
            }
            if (prop.isSpatial) {
                try {
                    var z = zeros(prop.value.length);
                    prop.setSpatialContinuousAtKey(idx, false);
                    prop.setSpatialAutoBezierAtKey(idx, false);
                    prop.setSpatialTangentsAtKey(idx, z, z);
                } catch (es) {}
            }
        }
    } catch (e) {
        log("ANIM ERROR [" + (label || prop.name) + "] line " + e.line + ": " + e.toString());
    }
}

// ---------- shape helpers ----------
function shp(comp, name, pos) {
    var l = comp.layers.addShape();
    l.name = name;
    l.transform.anchorPoint.setValue([0, 0]);
    l.transform.position.setValue(pos || [0, 0]);
    return l;
}
function grp(l, name) {
    var g = l.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
    g.name = name;
    return g.property("ADBE Vectors Group");
}
function gc(l, gname) { return l.property("ADBE Root Vectors Group").property(gname).property("ADBE Vectors Group"); }
function rectIn(c, size, pos, round, name) {
    var r = c.addProperty("ADBE Vector Shape - Rect");
    if (name) r.name = name;
    r.property("ADBE Vector Rect Size").setValue(size);
    r.property("ADBE Vector Rect Position").setValue(pos || [0, 0]);
    r.property("ADBE Vector Rect Roundness").setValue(round || 0);
}
function ellIn(c, d, pos, name) {
    var e = c.addProperty("ADBE Vector Shape - Ellipse");
    if (name) e.name = name;
    e.property("ADBE Vector Ellipse Size").setValue([d, d]);
    e.property("ADBE Vector Ellipse Position").setValue(pos || [0, 0]);
}
function mkShape(v, it, ot, closed) {
    var s = new Shape();
    var zs = [];
    for (var i = 0; i < v.length; i++) zs.push([0, 0]);
    s.vertices = v; s.inTangents = it || zs; s.outTangents = ot || zs; s.closed = !!closed;
    return s;
}
function pathIn(c, shape, name) {
    var p = c.addProperty("ADBE Vector Shape - Group");
    if (name) p.name = name;
    p.property("ADBE Vector Shape").setValue(shape);
}
function fillIn(c, col, name) {
    var f = c.addProperty("ADBE Vector Graphic - Fill");
    if (name) f.name = name;
    f.property("ADBE Vector Fill Color").setValue(col);
}
function strokeIn(c, col, w, cap, name) {
    var s = c.addProperty("ADBE Vector Graphic - Stroke");
    if (name) s.name = name;
    s.property("ADBE Vector Stroke Color").setValue(col);
    s.property("ADBE Vector Stroke Width").setValue(w);
    s.property("ADBE Vector Stroke Line Cap").setValue(cap || 1);
}
function trimIn(c, name) { var t = c.addProperty("ADBE Vector Filter - Trim"); if (name) t.name = name; }
function mergeIn(c, mode, name) {
    var m = c.addProperty("ADBE Vector Filter - Merge");
    if (name) m.name = name;
    m.property("ADBE Vector Merge Type").setValue(mode);
}
// half disc, radius r, side: top | bottom | right
function semi(r, side) {
    var k = r * KAPPA;
    if (side == "top")    return mkShape([[-r, 0], [0, -r], [r, 0]], [[0, 0], [-k, 0], [0, -k]], [[0, -k], [k, 0], [0, 0]], true);
    if (side == "bottom") return mkShape([[r, 0], [0, r], [-r, 0]], [[0, 0], [k, 0], [0, k]], [[0, k], [-k, 0], [0, 0]], true);
    return mkShape([[0, -r], [r, 0], [0, r]], [[0, 0], [0, -k], [k, 0]], [[k, 0], [0, k], [0, 0]], true); // right
}
function poly(pts) { return mkShape(pts, null, null, true); }
function bg(comp, col) {
    var l = shp(comp, "BG", [CW / 2, CH / 2]);
    var c = grp(l, "Fill");
    rectIn(c, [CW, CH], [0, 0], 0);
    fillIn(c, col);
    l.label = 0;
    return l;
}
function nul(comp, name, pos) {
    var n = comp.layers.addNull(DUR);
    n.name = name;
    n.transform.anchorPoint.setValue([50, 50]);
    n.transform.position.setValue(pos);
    n.label = 2;
    return n;
}
function parentTo(child, par, posInParent) {
    child.parent = par;
    child.transform.position.setValue(posInParent);
    child.transform.rotation.setValue(0);
    child.transform.scale.setValue([100, 100, 100]);
}
function S(v) { return [v, v, 100]; }
function newComp(name) { return app.project.items.addComp(name, CW, CH, 1, DUR, FPS); }

// =====================================================================
// R1C1  ARCHES — three concentric arches draw on / flow off   (bg L)
// =====================================================================
function buildArches(comp) {
    bg(comp, C.L);
    var radii = [138, 100, 62], cols = [C.V, C.D, C.V], cx = 180, cy = 205, i, c;
    function archShape(r) {
        var k = r * KAPPA;
        return mkShape([[cx - r, 420], [cx - r, cy], [cx, cy - r], [cx + r, cy], [cx + r, 420]],
                       [[0, 0], [0, 0], [-k, 0], [0, -k], [0, 0]],
                       [[0, 0], [0, -k], [k, 0], [0, 0], [0, 0]], false);
    }
    // faint tracks so the tile is never empty
    var tracks = shp(comp, "Arch Tracks", [0, 0]);
    for (i = 0; i < 3; i++) {
        var gtk = grp(tracks, "Track " + (i + 1));
        pathIn(gtk, archShape(radii[i]), "Path");
        strokeIn(gtk, C.D, 28, 1, "Stroke");
    }
    tracks.transform.opacity.setValue(9);
    tracks.label = 0;
    for (i = 0; i < 3; i++) {
        var l = shp(comp, "Arch " + (i + 1), [0, 0]);
        var g = grp(l, "Arch");
        pathIn(g, archShape(radii[i]), "Path");
        trimIn(g, "Trim Paths");
        strokeIn(g, cols[i], 28, 1, "Stroke");
        var tr = gc(l, "Arch").property("Trim Paths");
        var st = tr.property("ADBE Vector Trim Start"), en = tr.property("ADBE Vector Trim End");
        var d = i * 3, sk = [], ek = [];
        for (c = 0; c < 4; c++) {
            var T = c * 60 + d;
            ek.push(K(T, 0, "le", { oi: 70 }));        ek.push(K(T + 22, 100, "eh", { ii: 88 }));
            sk.push(K(T, 0, "lh"));
            sk.push(K(T + 30, 0, "le", { oi: 70 }));   sk.push(K(T + 52, 100, "eh", { ii: 88 }));
        }
        anim(en, ek, 75, "arch end " + i);
        anim(st, sk, 75, "arch start " + i);
        l.label = 11;
    }
    var sun = shp(comp, "Sun", [cx, cy]);
    var gs = grp(sun, "Sun");
    ellIn(gs, 44, [0, 0]);
    fillIn(gs, C.D);
    var sk2 = [];
    for (c = 0; c < 4; c++) {
        var B = c * 60;
        sk2.push(K(B + 16, S(55)));  sk2.push(K(B + 24, S(125), "ee", { inf: 60 }));
        sk2.push(K(B + 29, S(100))); sk2.push(K(B + 44, S(100)));
        sk2.push(K(B + 54, S(55), "ee", { ii: 85 }));
    }
    anim(sun.transform.scale, sk2, 70, "sun scale");
    sun.label = 9;
}

// =====================================================================
// R1C2 + R2C2  LINKED GEARS — one 360x720 comp spanning two tiles.
// The big gear (top tile) meshes across the shared edge with the gear
// in the tile below, which drives a third gear running off the frame.
// Every 0.5s the whole train ticks exactly one tooth.
// =====================================================================
function gearShape(N, R, m, phaseDeg) {
    var p = 2 * Math.PI / N, Ro = R + 0.9 * m, Rr = R - 1.15 * m, v = [], ph = phaseDeg * Math.PI / 180;
    for (var i = 0; i < N; i++) {
        var c = ph + i * p, a = [c - 0.30 * p, c - 0.17 * p, c + 0.17 * p, c + 0.30 * p], rr = [Rr, Ro, Ro, Rr];
        for (var j = 0; j < 4; j++) v.push([rr[j] * Math.cos(a[j]), rr[j] * Math.sin(a[j])]);
    }
    return poly(v);
}
function gearLayer(comp, name, pos, N, R, m, phase, body, deco) {
    var l = shp(comp, name, pos);
    // decorations first (they sit on top of the body)
    for (var i = 0; i < deco.length; i++) {
        var gd = grp(l, deco[i].name);
        ellIn(gd, deco[i].d, deco[i].p);
        fillIn(gd, deco[i].c);
    }
    var gb = grp(l, "Gear Body");
    pathIn(gb, gearShape(N, R, m, phase), "Teeth");
    var rc = gb.addProperty("ADBE Vector Filter - RC");
    rc.property("ADBE Vector RoundCorner Radius").setValue(3);
    fillIn(gb, body);
    l.motionBlur = true;
    return l;
}
function ring(n, r, d, c, nm, a0) {
    var out = [];
    for (var i = 0; i < n; i++) {
        var a = (a0 || 0) + i * 2 * Math.PI / n;
        out.push({ name: nm + " " + (i + 1), d: d, p: [r * Math.cos(a), r * Math.sin(a)], c: c });
    }
    return out;
}
function buildGears(comp) {
    var b1 = shp(comp, "BG Top Tile", [180, 180]);
    var g1 = grp(b1, "Fill"); rectIn(g1, [360, 360], [0, 0], 0); fillIn(g1, C.D); b1.label = 0;
    var b2 = shp(comp, "BG Bottom Tile", [180, 540]);
    var g2 = grp(b2, "Fill"); rectIn(g2, [360, 360], [0, 0], 0); fillIn(g2, C.V); b2.label = 0;

    var M = 16;
    var T = { N: 16, R: 128 }, B = { N: 12, R: 96 }, X = { N: 8, R: 64 };
    var tC = [180, 360 - T.R], bC = [180, 360 + B.R];
    var dd = (B.R + X.R) / Math.SQRT2, xC = [bC[0] + dd, bC[1] + dd];

    var gx = gearLayer(comp, "Gear C (runs off frame)", xC, X.N, X.R, M, 225, C.D,
        [{ name: "Axle", d: 12, p: [0, 0], c: C.D }, { name: "Hub", d: 34, p: [0, 0], c: C.V }]);
    var gbm = gearLayer(comp, "Gear B (bottom tile)", bC, B.N, B.R, M, 270, C.L,
        [{ name: "Axle", d: 14, p: [0, 0], c: C.V }, { name: "Hub", d: 40, p: [0, 0], c: C.D }].concat(ring(3, 52, 34, C.D, "Window", -Math.PI / 2)));
    var gt = gearLayer(comp, "Gear A (top tile)", tC, T.N, T.R, M, 90 - 360 / T.N / 2, C.L,
        [{ name: "Axle", d: 16, p: [0, 0], c: C.D }, { name: "Hub", d: 56, p: [0, 0], c: C.V }].concat(ring(6, 74, 30, C.D, "Hole", 0)));
    gt.label = 9; gbm.label = 9; gx.label = 13;

    // ticks: every 15 frames each gear advances exactly one tooth (with a small overshoot)
    function ticks(layer, step) {
        var keys = [];
        for (var k = 0; k < 16; k++) {
            var F = 15 * k;
            keys.push(K(F, step * k, "ee", { oi: 65 }));
            keys.push(K(F + 8, step * (k + 1.06), "ee", { ii: 70, oi: 45 }));
            keys.push(K(F + 12, step * (k + 1), "ee", { inf: 60 }));
        }
        anim(layer.transform.rotation, keys, 65, layer.name + " ticks");
    }
    ticks(gt, 360 / T.N);
    ticks(gbm, -360 / B.N);
    ticks(gx, 360 / X.N);
}

// =====================================================================
// R1C3  HOURGLASS — sand drains, glass flips 180°, repeat   (bg V)
// =====================================================================
function buildHourglass(comp) {
    bg(comp, C.V);
    var cx = 180, cy = 180, HW = 85, HH = 130, c;
    var TRI_U = [[-HW, -HH], [HW, -HH], [3, 0], [-3, 0]];
    var TRI_D = [[-3, 0], [3, 0], [HW, HH], [-HW, HH]];
    var glass = shp(comp, "Glass", [0, 0]);
    var gt = grp(glass, "Top Chamber");
    pathIn(gt, poly(TRI_U), "Tri");
    fillIn(gt, C.D);
    var gb = grp(glass, "Bottom Chamber");
    pathIn(gb, poly(TRI_D), "Tri");
    fillIn(gb, C.D);

    var stream = shp(comp, "Sand Stream", [cx, cy]);
    var gs = grp(stream, "Stream");
    pathIn(gs, mkShape([[0, 2], [0, HH + 2]], null, null, false), "Path");
    trimIn(gs, "Trim Paths");
    strokeIn(gs, C.L, 4, 1, "Stroke");

    function sandLayer(name, tri) {
        var l = shp(comp, name, [0, 0]);
        var g = grp(l, "Sand");
        rectIn(g, [220, 0], [0, 0], 0, "Box");
        pathIn(g, poly(tri), "Chamber");
        mergeIn(g, 4, "Intersect");
        fillIn(g, C.L, "Fill");
        l.label = 9;
        return l;
    }
    var sandD = sandLayer("Sand B", TRI_D);
    var sandU = sandLayer("Sand A", TRI_U);

    var caps = shp(comp, "Caps", [0, 0]);
    var gc1 = grp(caps, "Cap Top");
    rectIn(gc1, [190, 16], [0, -HH - 9], 8);
    fillIn(gc1, C.L);
    var gc2 = grp(caps, "Cap Bottom");
    rectIn(gc2, [190, 16], [0, HH + 9], 8);
    fillIn(gc2, C.L);

    var nh = nul(comp, "Hourglass_CTRL", [cx, cy]);
    parentTo(glass, nh, [50, 50]);
    parentTo(sandD, nh, [50, 50]);
    parentTo(sandU, nh, [50, 50]);
    parentTo(caps, nh, [50, 50]);
    glass.label = 13; caps.label = 13;

    function reg(a, b) { return { p: [0, (a + b) / 2], s: [220, b - a] }; }
    var FULL = -100, LOWFULL = 83;     // equal sand volume in both chambers
    var U = [], D = [];
    function push(arr, f, r, spec, o) { arr.push({ f: f, r: r, spec: spec, o: o || {} }); }
    for (c = 0; c < 4; c++) {
        var b0 = 60 * c;
        if (c % 2 == 0) {
            push(U, b0 + 2,  reg(FULL, 3), "ee", { inf: 25 });
            push(U, b0 + 44, reg(0, 3),    "eh", { inf: 25 });
            push(D, b0 + 2,  reg(HH + 6, HH + 10), "le", { oi: 25 });
            push(D, b0 + 44, reg(LOWFULL, HH + 10), "ee", { inf: 25 });
            push(D, b0 + 48, reg(LOWFULL, HH + 10), "ee", { inf: 60 });
            push(D, b0 + 58, reg(-3, -FULL),       "ee", { inf: 60 });
        } else {
            push(D, b0 + 2,  reg(-3, -FULL), "ee", { inf: 25 });
            push(D, b0 + 44, reg(-3, 0),     "eh", { inf: 25 });
            push(U, b0 + 2,  reg(-HH - 10, -HH - 6),   "le", { oi: 25 });
            push(U, b0 + 44, reg(-HH - 10, -LOWFULL),  "ee", { inf: 25 });
            push(U, b0 + 48, reg(-HH - 10, -LOWFULL),  "ee", { inf: 60 });
            push(U, b0 + 58, reg(FULL, 3),             "ee", { inf: 60 });
        }
    }
    function animSand(layer, list, nm) {
        var box = gc(layer, "Sand").property("Box");
        var pk = [], sk = [];
        for (var i = 0; i < list.length; i++) {
            pk.push(K(list[i].f, list[i].r.p, list[i].spec, list[i].o));
            sk.push(K(list[i].f, list[i].r.s, list[i].spec, list[i].o));
        }
        anim(box.property("ADBE Vector Rect Position"), pk, 40, nm + " pos");
        anim(box.property("ADBE Vector Rect Size"), sk, 40, nm + " size");
    }
    animSand(sandU, U, "sandA");
    animSand(sandD, D, "sandB");

    var rk = [];
    for (c = 0; c < 4; c++) {
        var b1 = 60 * c, Rr = 180 * c;
        rk.push(K(b1 + 44, Rr, "le", { oi: 60 }));
        rk.push(K(b1 + 49, Rr - 8, "ee", { inf: 60 }));
        rk.push(K(b1 + 58, Rr + 186, "ee", { ii: 80, oi: 50 }));
        rk.push(K(b1 + 60, Rr + 180, "ee", { inf: 60 }));
    }
    anim(nh.transform.rotation, rk, 70, "hourglass rot");

    var str = gc(stream, "Stream").property("Trim Paths");
    var ek = [], sk2 = [];
    for (c = 0; c < 4; c++) {
        var b2 = 60 * c;
        ek.push(K(b2, 0, "le", { oi: 50 }));  ek.push(K(b2 + 6, 100, "eh", { ii: 60 }));
        sk2.push(K(b2, 0, "lh"));  sk2.push(K(b2 + 40, 0, "le", { oi: 50 }));  sk2.push(K(b2 + 46, 100, "eh", { ii: 60 }));
    }
    anim(str.property("ADBE Vector Trim End"), ek, 60, "stream end");
    anim(str.property("ADBE Vector Trim Start"), sk2, 60, "stream start");
    stream.label = 9;
    glass.motionBlur = true; sandU.motionBlur = true; sandD.motionBlur = true; caps.motionBlur = true;
}

// =====================================================================
// R2C1  DISCS — 2x2 half-moon discs flip 180° in a diagonal wave   (bg D)
// =====================================================================
function buildDiscs(comp) {
    bg(comp, C.D);
    var xs = [96, 264], ys = [96, 264], r, c, w;
    for (r = 0; r < 2; r++) for (c = 0; c < 2; c++) {
        var l = shp(comp, "Disc " + (r + 1) + "-" + (c + 1), [xs[c], ys[r]]);
        var g1 = grp(l, "Top Half");
        pathIn(g1, semi(74, "top"), "Half");
        fillIn(g1, C.V);
        var g2 = grp(l, "Bottom Half");
        pathIn(g2, semi(74, "bottom"), "Half");
        fillIn(g2, C.L);
        var dl = 4 * (r + c), rk = [], sk = [];
        for (w = 0; w < 8; w++) {
            var F = 30 * w + dl;
            rk.push(K(F, 180 * w, "ee", { inf: 80 }));
            rk.push(K(F + 15, 180 * (w + 1), "ee", { inf: 80 }));
            sk.push(K(F, S(100), "ee", { inf: 60 }));
            sk.push(K(F + 7, S(86), "ee", { inf: 60 }));
            sk.push(K(F + 15, S(100), "ee", { inf: 60 }));
        }
        anim(l.transform.rotation, rk, 80, "disc rot");
        anim(l.transform.scale, sk, 60, "disc scale");
        l.label = 11;
        l.motionBlur = true;
    }
}

// =====================================================================
// R2C3  TOGGLES — three vertical UI switches flicking on/off   (bg L)
// =====================================================================
function buildToggles(comp) {
    bg(comp, C.L);
    var xs = [90, 180, 270], UP = 66, DOWN = 294, i, j, cyc;
    var EV = [[0, 0, 1], [12, 1, 1], [24, 2, 1], [36, 0, 0], [48, 1, 0], [60, 2, 0],
              [72, 1, 1], [84, 0, 1], [84, 2, 1], [96, 1, 0], [108, 0, 0], [108, 2, 0]];
    for (i = 0; i < 3; i++) {
        var tr = shp(comp, "Track " + (i + 1), [xs[i], 180]);
        var gt = grp(tr, "Track");
        rectIn(gt, [72, 300], [0, 0], 36);
        fillIn(gt, C.D, "Fill");
        tr.label = 13;
        var kn = shp(comp, "Knob " + (i + 1), [xs[i], DOWN]);
        var gk = grp(kn, "Knob");
        ellIn(gk, 56, [0, 0]);
        fillIn(gk, C.L);
        kn.label = 9;
        kn.motionBlur = true;
        kn.transform.position.dimensionsSeparated = true;
        var yk = [], sk = [], ck = [K(0, C.D, "lh")];
        for (cyc = 0; cyc < 2; cyc++) {
            for (j = 0; j < EV.length; j++) {
                if (EV[j][1] != i) continue;
                var F = EV[j][0] + 120 * cyc, on = EV[j][2];
                var from = on ? DOWN : UP, to = on ? UP : DOWN;
                yk.push(K(F, from, "ee", { oi: 70 }));
                yk.push(K(F + 11, to, "ee", { ii: 88 }));
                sk.push(K(F, [100, 100, 100], "ee", { inf: 50 }));
                sk.push(K(F + 4, [86, 118, 100], "ee", { inf: 50 }));
                sk.push(K(F + 9, [110, 90, 100], "ee", { inf: 50 }));
                sk.push(K(F + 12, [100, 100, 100], "ee", { inf: 50 }));
                ck.push(K(F + 5, on ? C.V : C.D, "lh"));   // colour snaps as the knob passes the middle
            }
        }
        anim(kn.transform.property("ADBE Position_1"), yk, 80, "knob y " + i);
        anim(kn.transform.scale, sk, 50, "knob scale " + i);
        anim(gc(tr, "Track").property("Fill").property("ADBE Vector Fill Color"), ck, 60, "track color " + i);
    }
}

// =====================================================================
// R3C1  WAVES — four sine lines flowing sideways and breathing   (bg V)
// =====================================================================
function wave(x0, x1, A, lam) {
    var h = lam / 2, n = Math.ceil((x1 - x0) / h), hl = h * 0.39;
    var v = [], it = [], ot = [];
    for (var j = 0; j <= n; j++) {
        v.push([x0 + j * h, (j % 2 == 0) ? -A : A]);
        it.push([-hl, 0]); ot.push([hl, 0]);
    }
    return mkShape(v, it, ot, false);
}
function buildWaves(comp) {
    bg(comp, C.V);
    var LAM = 180, AH = 20, AL = 6, i, t;
    for (i = 0; i < 4; i++) {
        var y = 72 + 72 * i, dir = (i % 2 == 0) ? -1 : 1, n = (i % 2 == 0) ? 2 : 3;
        var D = n * LAM, ph = (i * 45) % LAM;
        var x0 = (dir < 0) ? (-LAM - ph) : (-LAM - D - ph);
        var x1 = (dir < 0) ? (CW + LAM + D) : (CW + LAM);
        var l = shp(comp, "Wave " + (i + 1), [0, y]);
        var g = grp(l, "Wave");
        pathIn(g, wave(x0, x1, AH, LAM), "Path");
        strokeIn(g, (i % 2 == 0) ? C.D : C.L, 14, 2, "Stroke");
        l.transform.position.dimensionsSeparated = true;
        anim(l.transform.property("ADBE Position_0"), [K(0, 0, "ll"), K(240, dir * D, "ll")], 75, "wave x " + i);
        var pk = [];
        for (t = 0; t <= 8; t++) {
            var hi = ((t + i) % 2 == 0);
            pk.push(K(30 * t, wave(x0, x1, hi ? AH : AL, LAM), "ee", { inf: 55 }));
        }
        anim(gc(l, "Wave").property("Path").property("ADBE Vector Shape"), pk, 55, "wave path " + i);
        l.label = (i % 2 == 0) ? 13 : 9;
    }
}

// =====================================================================
// R3C2  STAIRS — a block somersaults up an endless staircase   (bg L)
// =====================================================================
function buildStairs(comp) {
    bg(comp, C.L);
    var s = 60, QX = 210, QY = 160, j, i;
    var pts = [];
    for (j = -12; j <= 14; j++) {
        pts.push([QX - s + s * j, QY + s - s * j]);
        pts.push([QX + s * j, QY + s - s * j]);
    }
    var last = pts[pts.length - 1], first = pts[0];
    pts.push([1400, last[1]]); pts.push([1400, 1600]); pts.push([first[0], 1600]);
    var st = shp(comp, "Stairs", [0, 0]);
    var gs = grp(st, "Stairs");
    pathIn(gs, poly(pts), "Steps");
    fillIn(gs, C.D);
    st.label = 13;

    var bl = shp(comp, "Block", [QX, QY]);       // anchor = block's top-right corner (pivot)
    var gb = grp(bl, "Block");
    rectIn(gb, [s, s], [-s / 2, s / 2], 6);
    fillIn(gb, C.V);
    bl.label = 9;
    bl.motionBlur = true;

    var spk = [], bpk = [], brk = [];
    for (i = 0; i < 8; i++) {
        var F = 30 * i;
        spk.push(K(F, [-s * i, s * i], "ee", { inf: 72 }));
        spk.push(K(F + 16, [-s * (i + 1), s * (i + 1)], "ee", { inf: 72 }));
        bpk.push(K(F, [QX, QY], "ee", { inf: 72 }));
        bpk.push(K(F + 16, [QX - s, QY + s], "eh", { inf: 72 }));
        brk.push(K(F, 0, "ee", { inf: 72 }));
        brk.push(K(F + 16, 180, "eh", { inf: 72 }));
    }
    anim(st.transform.position, spk, 72, "stairs pos");
    anim(bl.transform.position, bpk, 72, "block pos");
    anim(bl.transform.rotation, brk, 72, "block rot");
}

// =====================================================================
// R3C3  PENDULUM — swinging bob, pulse at each end, scanner dots   (bg D)
// =====================================================================
function buildPendulum(comp) {
    bg(comp, C.D);
    var px = 180, py = 34, L = 250, AMP = 26, BOB = 64, i, k;
    var DOTA = [-18, -12, -6, 0, 6, 12, 18], RD = 298, dots = [];
    for (i = 0; i < DOTA.length; i++) {
        var a = DOTA[i] * Math.PI / 180;
        var d = shp(comp, "Dot " + (i + 1), [px - RD * Math.sin(a), py + RD * Math.cos(a)]);
        var gd = grp(d, "Dot");
        ellIn(gd, 9, [0, 0]);
        fillIn(gd, C.V);
        d.transform.opacity.setValue(75);
        d.label = 9;
        dots.push(d);
    }
    var pr = shp(comp, "End Pulse", [px - L * Math.sin(AMP * Math.PI / 180), py + L * Math.cos(AMP * Math.PI / 180)]);
    var gp = grp(pr, "Ring");
    ellIn(gp, BOB, [0, 0]);
    strokeIn(gp, C.V, 3, 1, "Stroke");
    pr.label = 9;
    var pd = shp(comp, "Pendulum", [px, py]);
    var g1 = grp(pd, "Pivot");
    ellIn(g1, 20, [0, 0]);
    fillIn(g1, C.L);
    var g2 = grp(pd, "Bob");
    ellIn(g2, BOB, [0, L]);
    fillIn(g2, C.V);
    var g3 = grp(pd, "Rod");
    pathIn(g3, mkShape([[0, 0], [0, L - BOB / 2]], null, null, false), "Path");
    strokeIn(g3, C.L, 5, 2, "Stroke");
    pd.label = 11;
    pd.motionBlur = true;

    var rk = [];
    for (k = 0; k <= 8; k++) rk.push(K(30 * k, (k % 2 == 0) ? AMP : -AMP, "ee", { inf: 55 }));
    var rot = pd.transform.rotation;
    anim(rot, rk, 55, "pendulum rot");

    var pp = [], ps = [], po = [];
    for (k = 0; k < 8; k++) {
        var th = ((k % 2 == 0) ? AMP : -AMP) * Math.PI / 180;
        pp.push(K(30 * k, [px - L * Math.sin(th), py + L * Math.cos(th)], "lh"));
        ps.push(K(30 * k, S(100), "le", { oi: 20 }));  ps.push(K(30 * k + 16, S(190), "eh", { ii: 60 }));
        po.push(K(30 * k, 80, "le", { oi: 20 }));      po.push(K(30 * k + 16, 0, "eh", { ii: 40 }));
    }
    anim(pr.transform.position, pp, 60, "pulse pos");
    anim(pr.transform.scale, ps, 60, "pulse scale");
    anim(pr.transform.opacity, po, 60, "pulse op");

    for (i = 0; i < DOTA.length; i++) {
        var phi = DOTA[i], prev = rot.valueAtTime(0, false) - phi, cr = [], f;
        for (f = 1; f <= 240 * 4; f++) {
            var tt = f / (FPS * 4), cur = rot.valueAtTime(tt, false) - phi;
            if ((prev > 0 && cur <= 0) || (prev < 0 && cur >= 0)) cr.push(Math.round(tt * FPS));
            prev = cur;
        }
        var keys = [], lastF = -100;
        for (var c = 0; c < cr.length; c++) {
            var cf = cr[c];
            if (cf - lastF < 16) continue;
            if (cf - 4 < 0 || cf + 9 > 240) continue;
            keys.push(K(cf - 4, S(100), "ee", { inf: 50 }));
            keys.push(K(cf, S(240), "ee", { inf: 50 }));
            keys.push(K(cf + 9, S(100), "ee", { inf: 60 }));
            lastF = cf;
        }
        if (keys.length) anim(dots[i].transform.scale, keys, 55, "dot " + i);
    }
}

// =====================================================================
// MAIN — 1080x1920; the 1080x1080 grid sits in the middle (y 420–1500)
// =====================================================================
var GRID_TOP = 420;
app.beginSuppressDialogs();
try {
    log("AE " + app.version + "  palette " + PAL + "  start " + new Date().toString());
    try { app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES); } catch (e0) {}
    app.newProject();
    var proj = app.project;
    proj.bitsPerChannel = 8;

    var fMain = proj.items.addFolder("01_MAIN");
    var fCells = proj.items.addFolder("02_TILES (360x360)");

    // [name, builder, row, col, rows spanned]
    var CELLS = [
        ["R1C1_Arches", buildArches, 0, 0, 1],
        ["R1C2+R2C2_Gears (linked pair, 360x720)", buildGears, 0, 1, 2],
        ["R1C3_Hourglass", buildHourglass, 0, 2, 1],
        ["R2C1_Discs", buildDiscs, 1, 0, 1],
        ["R2C3_Toggles", buildToggles, 1, 2, 1],
        ["R3C1_Waves", buildWaves, 2, 0, 1],
        ["R3C2_Stairs", buildStairs, 2, 1, 1],
        ["R3C3_Pendulum", buildPendulum, 2, 2, 1]
    ];
    var comps = [], i;
    for (i = 0; i < CELLS.length; i++) {
        var cc = app.project.items.addComp(CELLS[i][0], CW, CH * CELLS[i][4], 1, DUR, FPS);
        cc.parentFolder = fCells;
        cc.bgColor = [C.D[0], C.D[1], C.D[2]];
        cc.motionBlur = true;
        try { CELLS[i][1](cc); log("built " + CELLS[i][0] + "  layers=" + cc.numLayers); }
        catch (eb) { log("BUILD ERROR " + CELLS[i][0] + " line " + eb.line + ": " + eb.toString()); }
        comps.push(cc);
    }

    var main = proj.items.addComp("GRID_9  1080x1920", 1080, 1920, 1, DUR, FPS);
    main.parentFolder = fMain;
    main.bgColor = [C.D[0] * 0.62, C.D[1] * 0.62, C.D[2] * 0.62];
    main.motionBlur = true;
    var mbg = main.layers.addShape();
    mbg.name = "BG (top & bottom empty)";
    mbg.transform.anchorPoint.setValue([0, 0]);
    mbg.transform.position.setValue([540, 960]);
    var gmb = grp(mbg, "Fill");
    rectIn(gmb, [1080, 1920], [0, 0], 0);
    fillIn(gmb, [C.D[0] * 0.62, C.D[1] * 0.62, C.D[2] * 0.62, 1]);   // a darker shade of D so the grid edge reads
    mbg.label = 0;
    for (i = comps.length - 1; i >= 0; i--) {
        var lay = main.layers.add(comps[i]);
        var r = CELLS[i][2], c = CELLS[i][3], span = CELLS[i][4];
        lay.transform.position.setValue([180 + 360 * c, GRID_TOP + 360 * r + 180 * span]);
        lay.motionBlur = true;
        lay.label = (span > 1) ? 1 : 8;
    }
    var gd = main.layers.addShape();
    gd.name = "GUIDE grid (not rendered)";
    gd.transform.anchorPoint.setValue([0, 0]);
    gd.transform.position.setValue([0, 0]);
    var gg = grp(gd, "Lines");
    pathIn(gg, mkShape([[360, GRID_TOP], [360, GRID_TOP + 1080]], null, null, false), "V1");
    pathIn(gg, mkShape([[720, GRID_TOP], [720, GRID_TOP + 1080]], null, null, false), "V2");
    for (i = 0; i < 4; i++) pathIn(gg, mkShape([[0, GRID_TOP + 360 * i], [1080, GRID_TOP + 360 * i]], null, null, false), "H" + i);
    strokeIn(gg, [0.2, 0.9, 1, 1], 2, 1, "Stroke");
    gd.guideLayer = true;
    gd.enabled = false;
    gd.label = 14;

    main.openInViewer();
    new Folder(new File(OUT_AEP).path).create();
    proj.save(new File(OUT_AEP));
    log("saved " + OUT_AEP);

    try {
        var times = [0, 0.25, 0.5, 1.2, 2.0, 2.9, 4.4, 6.6];
        new Folder(QCDIR).create();
        for (i = 0; i < times.length; i++) main.saveFrameToPng(times[i], new File(QCDIR + "/" + PAL + "_still_" + i + ".png"));
        log("stills requested");
    } catch (eq) { log("saveFrameToPng failed: " + eq.toString()); }
} catch (e) {
    log("FATAL line " + e.line + ": " + e.toString());
}
app.endSuppressDialogs(false);
log("end " + new Date().toString());
flushLog();
})();
