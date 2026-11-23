// Style Index · three.js posters: a ThreeCanvas the size of the poster that builds its scene once (after its assets load),
// updates it from time and renders it itself. A poster passes `build` → { update(t), render() }.
import { ThreeCanvas } from "@remotion/three";
import { useFrame, useThree } from "@react-three/fiber";
import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import * as THREE from "three";
import { FontLoader, type Font } from "three/examples/jsm/loaders/FontLoader.js";
import { PH, PW } from "./theme";

export type Built = { update: (t: number) => void; render: () => void };
export type BuildArgs<A> = { gl: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; w: number; h: number; assets: A };

const Inner = <A,>({ t, build, assets, onReady }: { t: number; build: (a: BuildArgs<A>) => Built; assets: A; onReady: () => void }) => {
  const { gl, scene, camera, size } = useThree();
  const B = useMemo(() => {
    scene.clear();
    return build({ gl, scene, camera: camera as THREE.PerspectiveCamera, w: size.width, h: size.height, assets });
  }, [gl, scene, camera, size.width, size.height, assets, build]);
  useLayoutEffect(() => B.update(t), [t, B]);
  useFrame(() => {
    B.render();
    onReady();
  }, 1);
  return null;
};

/** a full-poster three layer; `load` fetches the assets once (fonts, textures) */
export const ThreeLayer = <A,>({ t, build, load, style }: { t: number; build: (a: BuildArgs<A>) => Built; load: () => Promise<A>; style?: React.CSSProperties }) => {
  const [handle] = useState(() => delayRender("v46 three"));
  const [assets, setAssets] = useState<{ a: A } | null>(null);
  useLayoutEffect(() => {
    let live = true;
    load().then((a) => live && setAssets({ a }));
    return () => {
      live = false;
    };
  }, [load]);
  const [done, setDone] = useState(false);
  const ready = useCallback(() => {
    if (!done) {
      setDone(true);
      requestAnimationFrame(() => continueRender(handle));
    }
  }, [done, handle]);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: PW, height: PH, ...style }}>
      <ThreeCanvas width={PW} height={PH} gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}>
        {assets ? <Inner t={t} build={build} assets={assets.a} onReady={ready} /> : null}
      </ThreeCanvas>
    </div>
  );
};

const fontCache: Record<string, Promise<Font>> = {};
export const loadFont = (name: string) =>
  (fontCache[name] ??= fetch(staticFile(`styles/style-index/type/${name}.json`))
    .then((r) => r.json())
    .then((j) => new FontLoader().parse(j)));

/** an equirect gradient (rows of colour stops, top → bottom) as a PMREM environment */
export const gradientEnv = (gl: THREE.WebGLRenderer, stops: [number, string][]) => {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 512;
  const g = c.getContext("2d")!;
  const lg = g.createLinearGradient(0, 0, 0, 512);
  stops.forEach(([o, col]) => lg.addColorStop(o, col));
  g.fillStyle = lg;
  g.fillRect(0, 0, 64, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  const pm = new THREE.PMREMGenerator(gl);
  const env = pm.fromEquirectangular(tex).texture;
  pm.dispose();
  tex.dispose();
  return env;
};

// Ashima 3D simplex noise (MIT), for vertex displacement
export const SNOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;
