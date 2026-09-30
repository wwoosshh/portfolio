import type { MotionMode } from './mode';

export interface SceneContext {
  mode: MotionMode;
}

export type Cleanup = () => void;
export type SceneSetup = (root: HTMLElement, ctx: SceneContext) => Cleanup | void;

const scenes = new Map<string, SceneSetup>();

export function registerScene(name: string, setup: SceneSetup): void {
  scenes.set(name, setup);
}

export function sceneSetup(name: string): SceneSetup | undefined {
  return scenes.get(name);
}
