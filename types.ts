export enum TreeMorphState {
  SCATTERED = 'SCATTERED',
  TREE_SHAPE = 'TREE_SHAPE',
}

export interface DualPosition {
  tree: [number, number, number];
  scatter: [number, number, number];
  rotationSpeed: number;
  phaseOffset: number;
  scale: number;
}

export type OrnamentType = 'box' | 'ball' | 'star';
