import type { DiscStyle, LayerShape } from './geometry';

/**
 * Colour per disc, front → back. Cool blue tops melting through lavender into
 * warm or acid bottoms, each with a contrasting rim — after the reference.
 */
export const DEFAULT_STYLES: DiscStyle[] = [
  { from: '#3B5BF2', via: '#C4AAF0', to: '#F07D4C', rim: '#46A6F2' },
  { from: '#4F5AF0', via: '#B7A6E6', to: '#E8EE78', rim: '#86DC6C' },
  { from: '#5A58E6', via: '#7F86C4', to: '#8CDB62', rim: '#7FD9EA' },
  { from: '#3F5CF0', via: '#6F9DE6', to: '#8AE5CF', rim: '#E6F07C' },
  { from: '#3B66F4', via: '#5DAEF0', to: '#78DDF4', rim: '#EEF07E' },
];

export interface DiscSpec extends Omit<LayerShape, 'inner'> {
  /** Distance behind the front disc along the stack's axis. */
  depth: number;
  /** Drift in the disc plane, so the stack arcs instead of running straight. */
  lift: number;
  /** Extra [x, y] rotation: discs further back turn more face-on, fanning the stack. */
  turn: [number, number];
}

/**
 * Five thin, slightly convex discs that grow towards the back. The front one
 * has radius 1; everything else is relative to it.
 */
export const DEFAULT_DISCS: DiscSpec[] = [
  { outer: 1, thickness: 0.07, bevel: 0.035, crown: 0.025, dish: 0, depth: 0, lift: 0, turn: [0, 0] },
  { outer: 1.08, thickness: 0.07, bevel: 0.035, crown: 0.025, dish: 0, depth: 0.72, lift: 0.08, turn: [0.08, 0.08] },
  { outer: 1.18, thickness: 0.075, bevel: 0.037, crown: 0.027, dish: 0, depth: 1.42, lift: 0.3, turn: [0.2, 0.18] },
  { outer: 1.3, thickness: 0.08, bevel: 0.04, crown: 0.03, dish: 0, depth: 2.08, lift: 0.74, turn: [0.34, 0.3] },
  { outer: 1.42, thickness: 0.085, bevel: 0.042, crown: 0.03, dish: 0, depth: 2.7, lift: 1.22, turn: [0.5, 0.42] },
];

/** Gradient axis in each disc's plane: cool top-left → warm bottom-right. */
export const GRADIENT_DIRECTION: [number, number] = [0.6, -1];
