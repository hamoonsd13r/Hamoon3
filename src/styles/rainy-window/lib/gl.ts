// Rainy Window · the WebGL2 pass: the plate (with the cub's pose cross-fade), ripples on the wet street, drops on the
// window glass, three layers of falling rain, lantern flicker, glow and grade. One draw per frame.

const VS = /* glsl */ `#version 300 es
void main(){ vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2); gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;

const FS = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D tA; uniform sampler2D tB; uniform sampler2D tC; uniform sampler2D tG;
uniform vec2 uRes; uniform vec2 uPlate;
uniform float uT; uniform float uL;
uniform vec3 uW;        // pose weights A, B, C
uniform float uBreath;  // -1..1
uniform float uFlick;
uniform vec3 uCam;      // offset x, y (plate px), zoom
uniform vec4 uCub;      // pose region
uniform vec4 uWin;      // window glass
uniform vec4 uRip[96];  // x, y, age, k*strength packed: k + floor(s*100)*10
uniform int uNRip;
out vec4 frag;

float h11(float p){ p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 h22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float rectMask(vec2 P, vec4 r, float f){ return clamp(min(min(P.x - r.x, r.z - P.x), min(P.y - r.y, r.w - P.y)) / f, 0.0, 1.0); }

vec3 plate(vec2 P){
  float m = rectMask(P, uCub, 30.0);
  // breathing: a tiny vertical stretch of the cub around its seat
  vec2 Q = P - vec2(0.0, (P.y - 1690.0) * 0.0035 * uBreath * m);
  vec2 uv = Q / uPlate;
  vec3 a = texture(tA, uv).rgb;
  if (m <= 0.0 || uW.x >= 0.999) return a;
  vec3 c = uW.x * a + uW.y * texture(tB, uv).rgb + uW.z * texture(tC, uv).rgb;
  return mix(a, c, m);
}

float ground(vec2 P){
  float a = (1.0 - step(540.0, P.x)) * smoothstep(1712.0, 1742.0, P.y);
  float b = step(540.0, P.x) * smoothstep(1982.0, 1998.0, P.y);
  return max(a, b);
}

void ripples(vec2 P, out vec2 disp, out float hl){
  disp = vec2(0.0); hl = 0.0;
  for (int i = 0; i < 96; i++){
    if (i >= uNRip) break;
    vec4 e = uRip[i];
    float s = floor(e.w / 10.0) / 100.0;
    float k = e.w - floor(e.w / 10.0) * 10.0;
    float asp = mix(0.30, 0.46, clamp((e.y - 1720.0) / 1000.0, 0.0, 1.0));
    vec2 rel = P - e.xy;
    vec2 rr = vec2(rel.x, rel.y / asp);
    float dist = length(rr);
    float age = e.z;
    float R = age * 80.0 * k + 1.5;
    float dd = dist - R;
    float wv = 8.0 * k;
    if (abs(dd) > 2.6 * wv) continue;
    float env = exp(-dd * dd / (wv * wv)) * exp(-age * 2.7) * smoothstep(0.0, 0.06, age) * s;
    float w = sin(dd * 0.6 / k) * env;
    vec2 dir = rr / max(dist, 0.001);
    disp += vec2(dir.x, dir.y * asp) * w * 9.0 * k;
    hl += max(w, 0.0) * env;
  }
}

// drops resting on the glass and a few sliding down (periodic in uL)
vec2 glass(vec2 P, out float edge, out float spec, out float trail){
  vec2 offs = vec2(0.0); edge = 0.0; spec = 0.0; trail = 0.0;
  const float C = 24.0;
  vec2 cell = floor(P / C);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){
    vec2 c = cell + vec2(float(i), float(j));
    if (h21(c + 7.3) < 0.68) continue;
    vec2 ctr = (c + 0.2 + h22(c) * 0.6) * C;
    float rad = mix(1.8, 6.0, pow(h21(c + 3.1), 2.0));
    vec2 d = P - ctr;
    float l = length(d * vec2(1.0, 0.9));
    if (l < rad){
      float z = sqrt(max(0.0, 1.0 - l * l / (rad * rad)));
      offs = -d * (2.6 - 1.2 * z);
      edge = smoothstep(rad * 0.5, rad, l);
      spec = smoothstep(rad * 0.45, 0.0, length(d - vec2(-0.32, -0.38) * rad));
    }
  }
  // sliding drops: columns 70 px wide, 0..2 passes per loop
  float cw = 70.0;
  float col = floor(P.x / cw);
  float pass = floor(h11(col * 4.7) * 2.5);
  if (pass > 0.5){
    float ph = h11(col * 9.1);
    float u = fract(ph + pass * uT / uL);
    float H = uWin.w - uWin.y + 160.0;
    float wob = 0.012 * sin(u * 63.0 + col);
    float y = uWin.y - 80.0 + (u + wob) * H;
    float x = (col + 0.3 + 0.4 * h11(col * 2.3)) * cw + 3.0 * sin(u * 17.0 + col);
    float rad = 6.0 + 3.0 * h11(col * 5.5);
    vec2 d = P - vec2(x, y);
    float l = length(d * vec2(1.0, 0.82));
    if (l < rad){
      float z = sqrt(max(0.0, 1.0 - l * l / (rad * rad)));
      offs = -d * (2.8 - 1.2 * z);
      edge = smoothstep(rad * 0.5, rad, l);
      spec = smoothstep(rad * 0.45, 0.0, length(d - vec2(-0.3, -0.4) * rad));
    } else if (P.y < y && P.y > y - 240.0 && abs(P.x - x + 2.0 * sin(P.y * 0.05)) < 2.2){
      trail = (1.0 - (y - P.y) / 240.0) * 0.6;
    }
  }
  return offs;
}

float rainLayer(vec2 q, float cw, float ch, float cyc8, float lenPx, float wid, float prob, float seed){
  float cyc = floor(cyc8 * uL / 8.0 + 0.5); // whole cycles per loop keep the seam invisible
  vec2 p = vec2(q.x + q.y * 0.075, q.y);
  float col = floor(p.x / cw);
  float v = p.y / ch - uT / uL * cyc + h11(col * 1.31 + seed) * 37.0;
  float row = floor(v);
  vec2 id = vec2(col, mod(row, cyc)) + seed;
  if (h21(id) > prob) return 0.0;
  float xo = (0.25 + 0.5 * h21(id + 5.1)) * cw;
  float dx = abs(mod(p.x, cw) - xo);
  float lf = lenPx / ch;
  float o = h21(id + 9.7) * (1.0 - lf);
  float s = (fract(v) - o) / lf;
  if (s < 0.0 || s > 1.0) return 0.0;
  float along = smoothstep(0.0, 0.8, s) * (1.0 - smoothstep(0.88, 1.0, s));
  return along * exp(-dx * dx / (wid * wid)) * (0.55 + 0.45 * h21(id + 2.2));
}

void main(){
  vec2 q = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float sc = uRes.x / uPlate.x * uCam.z;
  vec2 P = uPlate * 0.5 + (q - uRes * 0.5) / sc + uCam.xy;

  vec3 col;
  float g = ground(P);
  float wm = rectMask(P, uWin, 6.0);
  vec2 disp; float hl;
  if (g > 0.0){
    ripples(P, disp, hl);
    col = plate(P + disp * g);
    vec3 gl = texture(tG, P / uPlate).rgb;
    col += hl * g * (vec3(0.17, 0.21, 0.30) + gl * 2.4);
  } else if (wm > 0.0){
    float edge, spec, trail;
    vec2 o = glass(P, edge, spec, trail);
    col = plate(P + o * wm);
    col *= 1.0 - edge * 0.38 * wm;
    col += wm * (spec * vec3(1.0, 0.93, 0.80) * 0.55 + trail * vec3(0.9, 0.75, 0.55) * 0.12);
  } else {
    col = plate(P);
  }

  // lantern flicker on the warm light, then glow
  vec3 gl = texture(tG, P / uPlate).rgb;
  float warm = smoothstep(0.04, 0.22, col.r - col.b);
  col *= mix(1.0, uFlick, warm);
  col += gl * 0.30 * uFlick;

  // rain, lit by what is behind it
  float r1 = rainLayer(q, 64.0, 520.0, 26.0, 170.0, 2.0, 0.46, 1.0);
  float r2 = rainLayer(q, 31.0, 300.0, 32.0, 84.0, 1.3, 0.50, 7.0);
  float r3 = rainLayer(q, 17.0, 170.0, 40.0, 40.0, 0.9, 0.55, 13.0);
  vec3 rc = (vec3(0.60, 0.68, 0.86) * 0.42 + gl * 1.4 + col * 0.5) * (1.0 - 0.45 * wm); // calmer over the window
  col += rc * (r1 * 0.80 + r2 * 0.52 + r3 * 0.30);

  // grade: a touch of contrast, vignette, grain
  col = pow(max(col, 0.0), vec3(1.04));
  vec2 vq = (q / uRes - 0.5) * vec2(1.0, 0.82);
  col *= 1.0 - 0.38 * smoothstep(0.32, 0.78, length(vq));
  col += (h21(q + fract(uT * 13.37) * 1000.0) - 0.5) * 0.022;
  frag = vec4(col, 1.0);
}`;

export type Plates = { a: HTMLImageElement; b: HTMLImageElement; c: HTMLImageElement; glow: HTMLImageElement };
export type FrameParams = {
  t: number; L: number; w: [number, number, number]; breath: number; flick: number;
  cam: { x: number; y: number; z: number };
  cub: [number, number, number, number]; win: [number, number, number, number];
  rip: Float32Array; nRip: number;
};

export const createGL = (canvas: HTMLCanvasElement, plates: Plates, plateSize: { w: number; h: number }) => {
  const gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true, antialias: false, premultipliedAlpha: false });
  if (!gl) throw new Error("WebGL2 not available");
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader");
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || "link");
  gl.useProgram(prog);
  gl.bindVertexArray(gl.createVertexArray());
  const U = (n: string) => gl.getUniformLocation(prog, n);
  const tex = (img: HTMLImageElement, unit: number, name: string) => {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(U(name), unit);
  };
  tex(plates.a, 0, "tA");
  tex(plates.b, 1, "tB");
  tex(plates.c, 2, "tC");
  tex(plates.glow, 3, "tG");
  gl.uniform2f(U("uPlate"), plateSize.w, plateSize.h);
  const loc = {
    res: U("uRes"), t: U("uT"), L: U("uL"), w: U("uW"), breath: U("uBreath"), flick: U("uFlick"), cam: U("uCam"),
    cub: U("uCub"), win: U("uWin"), rip: U("uRip[0]"), nRip: U("uNRip"),
  };
  return (p: FrameParams) => {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(loc.res, canvas.width, canvas.height);
    gl.uniform1f(loc.t, p.t);
    gl.uniform1f(loc.L, p.L);
    gl.uniform3f(loc.w, ...p.w);
    gl.uniform1f(loc.breath, p.breath);
    gl.uniform1f(loc.flick, p.flick);
    gl.uniform3f(loc.cam, p.cam.x, p.cam.y, p.cam.z);
    gl.uniform4f(loc.cub, ...p.cub);
    gl.uniform4f(loc.win, ...p.win);
    gl.uniform4fv(loc.rip, p.rip);
    gl.uniform1i(loc.nRip, p.nRip);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.finish();
  };
};
