/**
 * Damped-spring layer response, kept out of React state so pointer movement
 * never triggers a re-render. Everything here is mutated in useFrame.
 */

export interface PointerState {
  /** Pointer position on the hovered disc, in its plane, radius-normalised (-1…1). */
  x: number;
  y: number;
  /** Index of the disc under the pointer (0 = front). */
  index: number;
  hovering: boolean;
}

export interface Spring {
  value: number;
  velocity: number;
}

export const spring = (value = 0): Spring => ({ value, velocity: 0 });

/**
 * Semi-implicit Euler step towards `target`. A damping ratio just under 1
 * gives the soft, slightly liquid overshoot without visible wobble.
 */
export function stepSpring(s: Spring, target: number, stiffness: number, dampingRatio: number, dt: number) {
  const damping = 2 * Math.sqrt(stiffness) * dampingRatio;
  s.velocity += ((target - s.value) * stiffness - s.velocity * damping) * dt;
  s.value += s.velocity * dt;
}

export const isSettled = (s: Spring, target: number) =>
  Math.abs(s.velocity) < 1e-4 && Math.abs(target - s.value) < 1e-4;

export interface LayerMotion {
  rx: Spring;
  ry: Spring;
  z: Spring;
}

export const layerMotion = (): LayerMotion => ({ rx: spring(), ry: spring(), z: spring() });

export interface LayerTarget {
  rx: number;
  ry: number;
  z: number;
  stiffness: number;
}

/**
 * Per-disc target while the pointer is at (x, y) on disc `pointer.index`.
 * - The disc under the pointer gets the stiffest spring and moves first;
 *   neighbours follow on softer springs — a cascading ripple through the stack.
 * - Response is strongest near a disc's centre and fades towards its rim.
 * - Discs further back tilt a little more, but more slowly.
 */
export function layerTarget(pointer: PointerState, index: number, count: number, intensity: number): LayerTarget {
  const depth = count > 1 ? index / (count - 1) : 0;
  const d = Math.min(Math.hypot(pointer.x, pointer.y), 1);
  const proximity = pointer.hovering ? Math.exp(-(((index - pointer.index) / 1.3) ** 2)) : 0;
  const centreWeight = 1 - 0.5 * d;
  const amp = pointer.hovering ? intensity * centreWeight * (0.13 + 0.06 * depth) * (0.45 + 0.55 * proximity) : 0;

  return {
    // Tilt so the surface under the pointer dips away, like pressing into gel.
    rx: -pointer.y * amp,
    ry: pointer.x * amp,
    z: -0.09 * intensity * proximity * centreWeight,
    stiffness: (28 - 12 * depth) * (0.5 + 0.9 * proximity),
  };
}
