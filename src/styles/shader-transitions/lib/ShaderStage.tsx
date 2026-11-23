// Shader Transitions · a WebGL stage that holds a list of slides (images, cover-fitted once to the frame size) and
// draws one moment per Remotion frame: slide a → slide b at progress p through one of the twelve shaders. Plain
// WebGL (no three.js): every program is compiled once, the canvas keeps its drawing buffer for the screenshot.
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { continueRender, delayRender, staticFile, useVideoConfig } from "remotion";
import { H, SHADERS, vertSrc, type ShaderName } from "./shaders";

export type Slide = { src: string; focus?: [number, number] };
type GL = WebGLRenderingContext;
const HOLD = "hold";
const HOLD_FRAG = `${H}void main(){ gl_FragColor = vec4(texture2D(u_from, v_uv).rgb, 1.0); }`;

const hexRgb = (h: string): [number, number, number] => {
  const n = parseInt(h.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
/** the image drawn into a w×h canvas like object-fit: cover, around a focus point (0..1) */
const cover = (img: HTMLImageElement, w: number, h: number, focus: [number, number] = [0.5, 0.5]) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
  c.getContext("2d")!.drawImage(img, (w - dw) * focus[0], (h - dh) * focus[1], dw, dh);
  return c;
};
const compile = (gl: GL, type: number, src: string) => {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader compile");
  return s;
};

type State = { gl: GL; progs: Map<string, WebGLProgram>; tex: WebGLTexture[] };

export const ShaderStage: React.FC<{
  slides: Slide[];
  /** the slide shown before the transition, the one after it, and how far along (0..1) */
  a: number;
  b: number;
  p: number;
  shader: ShaderName;
  /** edge colours some shaders use (burn, warp, lens): accent, dark, bright */
  accent?: [string, string, string];
}> = ({ slides, a, b, p, shader, accent = ["#FF7A30", "#401204", "#FFD08A"] }) => {
  const { width, height } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  const st = useRef<State | null>(null);
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender("shader-transitions slides", { timeoutInMilliseconds: 60000 }));
  const released = useRef(false);

  useEffect(() => {
    const canvas = ref.current!;
    const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true, premultipliedAlpha: false, antialias: false });
    if (!gl) throw new Error("WebGL is not available");
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const vs = compile(gl, gl.VERTEX_SHADER, vertSrc);
    const progs = new Map<string, WebGLProgram>();
    for (const [name, frag] of [[HOLD, HOLD_FRAG], ...Object.entries(SHADERS).map(([n, d]) => [n, d.frag])] as [string, string][]) {
      const pr = gl.createProgram()!;
      gl.attachShader(pr, vs);
      gl.attachShader(pr, compile(gl, gl.FRAGMENT_SHADER, frag));
      gl.bindAttribLocation(pr, 0, "a_pos");
      gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(`${name}: ${gl.getProgramInfoLog(pr)}`);
      progs.set(name, pr);
    }
    let alive = true;
    Promise.all(
      slides.map(
        (s) =>
          new Promise<HTMLImageElement>((res, rej) => {
            const img = new Image();
            img.onload = () => res(img);
            img.onerror = () => rej(new Error(`slide ${s.src}`));
            img.src = staticFile(s.src);
          }),
      ),
    )
      .then((imgs) => {
        if (!alive) return;
        const tex = imgs.map((img, i) => {
          const t = gl.createTexture()!;
          gl.bindTexture(gl.TEXTURE_2D, t);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cover(img, width, height, slides[i].focus));
          return t;
        });
        st.current = { gl, progs, tex };
        setReady(true);
      })
      .catch((e) => {
        console.error(e);
        if (!released.current) {
          released.current = true;
          continueRender(handle);
        }
      });
    return () => {
      alive = false;
    };
    // the slides are fixed for the life of the stage
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    const s = st.current;
    if (!ready || !s) return;
    const { gl, progs, tex } = s;
    const pr = progs.get(p <= 0 ? HOLD : shader)!;
    gl.viewport(0, 0, width, height);
    gl.useProgram(pr);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const n = tex.length;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex[((a % n) + n) % n]);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, tex[((b % n) + n) % n]);
    const u = (k: string) => gl.getUniformLocation(pr, k);
    gl.uniform1i(u("u_from"), 0);
    gl.uniform1i(u("u_to"), 1);
    gl.uniform1f(u("u_progress"), Math.min(1, Math.max(0, p)));
    gl.uniform2f(u("u_resolution"), width, height);
    gl.uniform3fv(u("u_accent"), hexRgb(accent[0]));
    gl.uniform3fv(u("u_accent_dark"), hexRgb(accent[1]));
    gl.uniform3fv(u("u_accent_bright"), hexRgb(accent[2]));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (!released.current) {
      released.current = true;
      continueRender(handle);
    }
  }, [ready, a, b, p, shader, width, height, accent, handle]);

  return <canvas ref={ref} width={width} height={height} style={{ position: "absolute", left: 0, top: 0, width, height, display: "block" }} />;
};
