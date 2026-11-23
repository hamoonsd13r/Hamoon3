// Shader Transitions — twelve GLSL transitions between two frames (domain warp, ridged burn, whip pan, SDF iris,
// ripple waves, gravitational lens, cinematic zoom, chromatic split, glitch, swirl vortex, thermal distortion,
// cross-warp morph), from @hyperframes/shader-transitions (Apache-2.0), on a small WebGL stage for Remotion.
export { H, NQ, SHADERS, SHADER_NAMES, vertSrc, type ShaderName } from "./lib/shaders";
export { ShaderStage, type Slide } from "./lib/ShaderStage";
export { DUR, LOOK, SLIDES, TransitionReel } from "./demo/Video";
export { Compositions } from "./Compositions";
