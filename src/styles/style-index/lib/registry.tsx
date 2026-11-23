// Style Index · the twenty styles in reel order: Persian name (list + voice), English name (under the card), the poster.
import React from "react";
import type { PosterProps } from "./kit";
import { Minimal } from "./posters/minimal";
import { Maxi } from "./posters/maxi";
import { Future } from "./posters/future";
import { Vector } from "./posters/vector";
import { Collage } from "./posters/collage";
import { Retro } from "./posters/retro";
import { Cyber } from "./posters/cyber";
import { Pop } from "./posters/pop";
import { Glass } from "./posters/glass";
import { Clay } from "./posters/clay";
import { Pixel } from "./posters/pixel";
import { Editorial } from "./posters/editorial";
import { Y2K } from "./posters/y2k";
import { Swiss } from "./posters/swiss";
import { Surreal } from "./posters/surreal";
import { Boho } from "./posters/boho";
import { Victorian } from "./posters/victorian";
import { Graffiti } from "./posters/graffiti";
import { Aurora } from "./posters/aurora";
import { Handwritten } from "./posters/handwritten";

export type StyleDef = { id: string; fa: string; en: string; name: string; tag: string; C: React.FC<PosterProps>; three?: boolean; from?: number };

export const STYLES: StyleDef[] = [
  { id: "minimal", tag: "NEGATIVE SPACE", name: "Minimalism", fa: "مینیمالیسم", en: "MINIMALISM", C: Minimal, from: 0.3 },
  { id: "maxi", tag: "MORE IS MORE", name: "Maximalism", fa: "ماکسیمالیسم", en: "MAXIMALISM", C: Maxi, from: 0.2 },
  { id: "future", tag: "IRIDESCENT · HUD", name: "Futuristic", fa: "فیوچریستیک", en: "FUTURISTIC", C: Future, from: 0.3 },
  { id: "vector", tag: "FLAT SHAPES", name: "Vector Art", fa: "وکتور آرت", en: "VECTOR ART", C: Vector, from: 0.25 },
  { id: "collage", tag: "CUT & PASTE", name: "Collage Art", fa: "کلاژ آرت", en: "COLLAGE ART", C: Collage, from: 0.2 },
  { id: "retro", tag: "CITY POP · 1984", name: "Retro", fa: "رترو", en: "RETRO", C: Retro, from: 0.22 },
  { id: "cyber", tag: "NEON · GLITCH", name: "Cyberpunk", fa: "سایبرپانک", en: "CYBERPUNK", C: Cyber, from: 0.15 },
  { id: "pop", tag: "BEN-DAY DOTS", name: "Pop Art", fa: "پاپ آرت", en: "POP ART", C: Pop, from: 0.28 },
  { id: "glass", tag: "FROSTED LAYERS", name: "Glassmorphism", fa: "گلس‌مورفیسم", en: "GLASSMORPHISM", C: Glass, from: 0.2 },
  { id: "clay", tag: "SOFT 3D", name: "Claymorphism", fa: "کلِی‌مورفیسم", en: "CLAYMORPHISM", C: Clay, three: true, from: 0.18 },
  { id: "pixel", tag: "8-BIT · 12 FPS", name: "Pixel Art", fa: "پیکسل آرت", en: "PIXEL ART", C: Pixel, from: 0.3 },
  { id: "editorial", tag: "MAGAZINE GRID", name: "Editorial", fa: "ادیتوریال", en: "EDITORIAL", C: Editorial, from: 0.25 },
  { id: "y2k", tag: "LIQUID CHROME", name: "Y2K", fa: "وای‌تو‌کی", en: "Y2K", C: Y2K, three: true, from: 0.25 },
  { id: "swiss", tag: "GRID · GROTESK", name: "Swiss Design", fa: "سوییس دیزاین", en: "SWISS DESIGN", C: Swiss, from: 0.3 },
  { id: "surreal", tag: "DREAM LOGIC", name: "Surreal", fa: "سورئال", en: "SURREAL", C: Surreal, from: 0.35 },
  { id: "boho", tag: "EARTHY · FREE", name: "Bohemian", fa: "بوهمین", en: "BOHEMIAN", C: Boho, from: 0.45 },
  { id: "victorian", tag: "GILT · ENGRAVING", name: "Victorian", fa: "ویکتوریایی", en: "VICTORIAN", C: Victorian, from: 0.45 },
  { id: "graffiti", tag: "SPRAY · DRIPS", name: "Graffiti", fa: "گرافیتی", en: "GRAFFITI", C: Graffiti, from: 0.3 },
  { id: "aurora", tag: "LIGHT CURTAINS", name: "Aurora", fa: "آرورا", en: "AURORA", C: Aurora, three: true, from: 0.15 },
  { id: "hand", tag: "INK · SCRIBBLE", name: "Handwritten", fa: "دست‌نویس", en: "HANDWRITTEN", C: Handwritten, from: 0.1 },
];
