// Light Swarm Epic — a long music film made of light (the light-swarm engine at full scale: two swarms of 65k
// particles, 40 shapes from a seed and a galaxy to a globe, a painted wave, a lighthouse, a rocket, particle words and
// your logo), kinetic words on the beats, lower thirds, a typed prompt, optional footage windows, and a countdown that
// runs to zero. Everything is one score on the song grid (demo/score.ts).
export * from "./lib/theme";
export { buildEpicEngine, type EpicEngine } from "./lib/engine";
export { EPIC_EXTRA, EPIC_SHAPES, type EpicShape } from "./lib/shapes";
export { LightSwarmEpic, LOOK } from "./demo/Video";
export { Compositions } from "./Compositions";
