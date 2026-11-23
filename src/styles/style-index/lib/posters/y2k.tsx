// 13 · Y2K — liquid-chrome bubble letters swing in over a baby-blue-to-pink sky, the chrome android rises under them,
// a grid floor rushes, chrome bubbles orbit, butterflies flap, sparkles twinkle, a millennium pop-up slides in.
import React from "react";
import * as THREE from "three";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import type { Font } from "three/examples/jsm/loaders/FontLoader.js";
import { F, PW, ease, mix, tween } from "../theme";
import { Img } from "remotion";
import { Frame, Grain, ar, img, type PosterProps } from "../kit";
import { ThreeLayer, gradientEnv, loadFont, type BuildArgs } from "../three";

const build = ({ gl, scene, camera, assets }: BuildArgs<Font>) => {
  gl.setClearColor(0x000000, 0);
  gl.toneMapping = THREE.ACESFilmicToneMapping;
  gl.toneMappingExposure = 1.1;
  camera.fov = 32;
  camera.position.set(0, 0, 12);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  const env = gradientEnv(gl, [[0, "#FFFFFF"], [0.16, "#9AD8FF"], [0.3, "#FF9ED8"], [0.44, "#1B1F5A"], [0.5, "#05061A"], [0.535, "#FFFFFF"], [0.64, "#B8A6FF"], [0.8, "#2A2F7A"], [1, "#0B0D2A"]]);
  scene.environment = env;
  const chrome = new THREE.MeshStandardMaterial({ color: "#ffffff", metalness: 1, roughness: 0.07, envMapIntensity: 1.25 });
  const g = new TextGeometry("Y2K", { font: assets, size: 1.04, depth: 0.5, curveSegments: 16, bevelEnabled: true, bevelThickness: 0.22, bevelSize: 0.12, bevelSegments: 10 });
  g.computeBoundingBox();
  const b = g.boundingBox!;
  g.translate(-(b.min.x + b.max.x) / 2, -(b.min.y + b.max.y) / 2, -(b.min.z + b.max.z) / 2);
  const word = new THREE.Mesh(g, chrome);
  scene.add(word);
  const bubbles = [0, 1, 2, 3].map((i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry([0.36, 0.22, 0.28, 0.17][i], 64, 48), chrome);
    scene.add(m);
    return m;
  });
  const key = new THREE.DirectionalLight("#ffffff", 0.6);
  key.position.set(3, 5, 6);
  scene.add(key);
  return {
    update: (t: number) => {
      const s = tween(t, 0, 0.42, (u) => ease.outBack(u, 1.7));
      word.scale.setScalar(Math.max(0.001, s));
      word.rotation.set(Math.sin(t * 1.3) * 0.12, mix(-0.95, 0, tween(t, 0, 0.6, ease.out)) + Math.sin(t * 1.1) * 0.22, Math.sin(t * 0.9) * 0.05);
      word.position.y = 2.15 + Math.sin(t * 2) * 0.08;
      // the bubbles keep to the margins, bobbing, so the face stays clear
      bubbles.forEach((m, i) => {
        const side = i % 2 ? 1 : -1, a = t * (1.1 + i * 0.2) + i * 1.7;
        m.position.set(side * (1.45 + 0.18 * Math.sin(a * 0.7)), [0.9, -0.2, -1.3, 0.3][i] + Math.sin(a) * 0.22, 0.6 + Math.cos(a) * 0.3);
        m.scale.setScalar(tween(t, 0.2 + i * 0.06, 0.45 + i * 0.06, (u) => ease.outBack(u, 2.4)) + 1e-3);
      });
    },
    render: () => gl.render(scene, camera),
  };
};
const load = () => loadFont("BagelFatOne-Regular");

const Sparkle: React.FC<{ x: number; y: number; s: number }> = ({ x, y, s }) => (
  <path d={`M${x},${y - s} C${x + s * 0.12},${y - s * 0.12} ${x + s * 0.12},${y - s * 0.12} ${x + s},${y} C${x + s * 0.12},${y + s * 0.12} ${x + s * 0.12},${y + s * 0.12} ${x},${y + s} C${x - s * 0.12},${y + s * 0.12} ${x - s * 0.12},${y + s * 0.12} ${x - s},${y} C${x - s * 0.12},${y - s * 0.12} ${x - s * 0.12},${y - s * 0.12} ${x},${y - s} Z`} fill="#fff" style={{ filter: "drop-shadow(0 0 6px #fff)" }} />
);

const Butterfly: React.FC<{ t: number; x: number; y: number; s: number; ph: number }> = ({ t, x, y, s, ph }) => {
  const f = 0.35 + 0.65 * Math.abs(Math.sin(t * 12 + ph));
  return (
    <g transform={`translate(${x + Math.sin(t * 1.4 + ph) * 30}, ${y + Math.cos(t * 1.9 + ph) * 22}) scale(${s}) rotate(${Math.sin(t * 2 + ph) * 12})`}>
      <g transform={`scale(${f}, 1)`}>
        <path d="M0,0 C-30,-60 -90,-50 -70,0 C-90,40 -40,50 0,6 Z" fill="url(#y2kw)" stroke="#fff" strokeWidth={2} />
        <path d="M0,0 C30,-60 90,-50 70,0 C90,40 40,50 0,6 Z" fill="url(#y2kw)" stroke="#fff" strokeWidth={2} />
      </g>
      <rect x={-3} y={-22} width={6} height={44} rx={3} fill="#3B3F8F" />
    </g>
  );
};

const BW = 620, BY = 420;

export const Y2K: React.FC<PosterProps> = ({ t }) => {
  const scroll = (t * 160) % 80;
  const win = tween(t, 0.38, 0.62, (u) => ease.outBack(u, 1.5));
  const loadK = tween(t, 0.5, 1.8, ease.out);
  return (
    <Frame bg="#B9C8FF">
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, #9ED4FF 0%, #C7B8FF 52%, #FFC3E4 100%)" }} />
      {/* grid floor */}
      <svg width={PW} height={1280} style={{ position: "absolute", left: 0, top: 0, opacity: tween(t, 0, 0.3) }}>
        {Array.from({ length: 16 }, (_, i) => (
          <line key={`v${i}`} x1={360} y1={760} x2={360 + (i - 7.5) * 150} y2={1280} stroke="#fff" strokeWidth={1.5} opacity={0.55} />
        ))}
        {Array.from({ length: 10 }, (_, i) => {
          const k = (i * 80 + scroll) / 800, y = 760 + Math.pow(k, 2.2) * 520;
          return <line key={`h${i}`} x1={0} x2={PW} y1={y} y2={y} stroke="#fff" strokeWidth={1.5} opacity={0.55 * k} />;
        })}
        <defs>
          <linearGradient id="y2kw" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7FD8FF" /><stop offset="0.6" stopColor="#C9A8FF" /><stop offset="1" stopColor="#FF9AD5" />
          </linearGradient>
        </defs>
        <Butterfly t={t} x={130} y={260} s={0.8} ph={0} />
        <Butterfly t={t} x={600} y={860} s={0.6} ph={2} />
        {[[90, 560, 20, 0], [640, 200, 26, 1.2], [560, 520, 14, 2.4], [170, 960, 18, 3.1], [380, 150, 12, 4.2]].map(([x, y, s, p], i) => (
          <Sparkle key={i} x={x} y={y} s={s * (0.5 + 0.5 * Math.abs(Math.sin(t * 4 + p)))} />
        ))}
      </svg>
      {/* the chrome android rises into the frame and breathes */}
      <div style={{ position: "absolute", left: (PW - BW) / 2 + 20, top: BY + mix(500, 0, tween(t, 0.06, 0.5, ease.out)) + Math.sin(t * 1.6) * 6, width: BW, height: BW * ar("Y2K-01"), filter: "drop-shadow(0 30px 40px rgba(60,50,140,0.35))" }}>
        <Img src={img("Y2K-01")} style={{ width: "100%", height: "100%", maxWidth: "none" }} />
      </div>
      <ThreeLayer t={t} build={build} load={load} />
      {/* millennium pop-up */}
      <div style={{ position: "absolute", left: 34, top: 1010, width: 360, height: 168, borderRadius: 14, background: "#F4F6FF", border: "2px solid #6E7BD9", boxShadow: "6px 8px 0 rgba(110,123,217,0.45)", transform: `translateY(${(1 - win) * 300}px) scale(${mix(0.7, 1, win)})`, opacity: t >= 0.38 ? 1 : 0, overflow: "hidden" }}>
        <div style={{ height: 38, background: "linear-gradient(90deg, #5B6CF0, #A98BFF)", display: "flex", alignItems: "center", padding: "0 12px", fontFamily: F.vt, fontSize: 26, color: "#fff" }}>
          <span style={{ flex: 1 }}>new message ♥</span>
          <span style={{ fontSize: 22 }}>_ □ ✕</span>
        </div>
        <div style={{ padding: "12px 14px", fontFamily: F.vt, fontSize: 28, color: "#2A2F6B", lineHeight: 1.1 }}>
          <div>LOADING MILLENNIUM…</div>
          <div style={{ marginTop: 10, height: 24, border: "2px solid #6E7BD9", padding: 2, display: "flex", gap: 3 }}>
            {Array.from({ length: 12 }, (_, i) => (i < loadK * 12 ? <div key={i} style={{ width: 22, height: "100%", background: "#FF6FC8" }} /> : null))}
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 420, top: 1098, fontFamily: F.michroma, fontSize: 30, color: "#2A2F6B", letterSpacing: "0.12em", opacity: tween(t, 0.5, 0.7) }}>{loadK < 1 ? "1999" : "2000"}</div>
      <div style={{ position: "absolute", left: 0, top: 1214, width: PW, textAlign: "center", fontFamily: F.michroma, fontSize: 22, letterSpacing: "0.5em", color: "#2A2F6B", textShadow: "0 0 12px rgba(255,255,255,0.9)", opacity: tween(t, 0.4, 0.7) }}>MILLENNIUM MODE</div>
      <div style={{ position: "absolute", left: 40, top: 46, fontFamily: F.michroma, fontSize: 16, letterSpacing: "0.3em", color: "#2A2F6B", opacity: tween(t, 0.3, 0.5) }}>12.31.99</div>
      <div style={{ position: "absolute", right: 40, top: 46, fontFamily: F.michroma, fontSize: 16, letterSpacing: "0.3em", color: "#2A2F6B", opacity: tween(t, 0.34, 0.54) }}>23:59:{String(Math.floor(t * 9) % 60).padStart(2, "0")}</div>
      <Grain t={t} amt={0.05} />
    </Frame>
  );
};
