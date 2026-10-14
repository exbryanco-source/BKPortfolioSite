import { Component, Suspense, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Box3, Euler, Group, Mesh, Object3D, Sphere, Vector3 } from 'three';
import { createLayerGeometry, paintDisc, type DiscStyle, type GeometryDetail } from './discs/geometry';
import { createDiscMaterial } from './discs/materials';
import { GRADIENT_DIRECTION, type DiscSpec } from './discs/discs';
import {
  isSettled,
  layerMotion,
  layerTarget,
  spring,
  stepSpring,
  type LayerMotion,
  type PointerState,
} from './discs/interaction';

/**
 * Faces turned towards the lower-left so the stack recedes up and to the
 * right, with a slight roll — the reference's three-quarter view.
 */
const STACK_ROTATION = new Euler(0.42, -0.8, 0.1);

/** Where the front disc sits, as fractions of the canvas, and how big it is. */
export interface Composition {
  /** Front disc centre, 0 = left edge, 1 = right edge. */
  x: number;
  /** Front disc centre, 0 = top edge, 1 = bottom edge. */
  y: number;
  /** Front disc radius as a fraction of the canvas height (capped by width). */
  size: number;
}

interface LayerHandle {
  object: Object3D;
  radius: number;
  restPosition: Vector3;
  restRotation: Euler;
  motion: LayerMotion;
}

const toHandle = (object: Object3D, radius: number): LayerHandle => ({
  object,
  radius,
  restPosition: object.position.clone(),
  restRotation: object.rotation.clone(),
  motion: layerMotion(),
});

export interface DiscStackProps {
  styles: DiscStyle[];
  discs: DiscSpec[];
  detail: GeometryDetail;
  composition: Composition;
  /** 0 = static, 1 = default, >1 = livelier. */
  intensity: number;
  /** Multiplier on the composed size. */
  scale: number;
  reducedMotion: boolean;
  /** False while the canvas is off-screen — stops requesting frames. */
  activeRef: RefObject<boolean>;
  /** Optional .glb; each mesh becomes an independently reacting layer. */
  modelUrl?: string;
}

export function DiscStack({
  styles,
  discs,
  detail,
  composition,
  intensity,
  scale,
  reducedMotion,
  activeRef,
  modelUrl,
}: DiscStackProps) {
  const tilt = useRef<Group>(null);
  const float = useRef<Group>(null);
  const handles = useRef<LayerHandle[]>([]);
  const pointer = useRef<PointerState>({ x: 0, y: 0, index: 0, hovering: false });
  const whole = useRef({ rx: spring(), ry: spring() });

  const invalidate = useThree((s) => s.invalidate);
  const size = useThree((s) => s.size);
  const viewport = useThree((s) => s.viewport);

  // Place the front disc by canvas fractions; the rest of the stack is free
  // to run past the canvas edge, as in the reference composition.
  const placement = useMemo(() => {
    const worldPerPx = viewport.height / size.height;
    const radiusPx = Math.min(size.height * composition.size, size.width * composition.size * 1.25) * scale;
    return {
      position: [(composition.x - 0.5) * viewport.width, (0.5 - composition.y) * viewport.height, 0] as const,
      scale: radiusPx * worldPerPx,
    };
  }, [size.width, size.height, viewport.width, viewport.height, composition, scale]);

  const response = reducedMotion ? intensity * 0.35 : intensity;
  const dampingRatio = reducedMotion ? 1 : 0.78;

  useFrame(({ clock }, delta) => {
    // Fixed sub-steps keep the springs stable and real-time on slow devices too.
    const elapsed = Math.min(delta, 0.1);
    const substeps = Math.max(1, Math.ceil(elapsed * 120));
    const dt = elapsed / substeps;
    const p = pointer.current;
    const count = handles.current.length;
    let moving = false;

    handles.current.forEach((h, index) => {
      const t = layerTarget(p, index, count, response);
      const { rx, ry, z } = h.motion;
      for (let i = 0; i < substeps; i++) {
        stepSpring(rx, t.rx, t.stiffness, dampingRatio, dt);
        stepSpring(ry, t.ry, t.stiffness, dampingRatio, dt);
        stepSpring(z, t.z, t.stiffness, dampingRatio, dt);
      }
      h.object.rotation.set(h.restRotation.x + rx.value, h.restRotation.y + ry.value, h.restRotation.z);
      h.object.position.z = h.restPosition.z + z.value;
      moving ||= !isSettled(rx, t.rx) || !isSettled(ry, t.ry) || !isSettled(z, t.z);
    });

    // Gentle whole-stack parallax on a softer spring than the discs.
    const w = whole.current;
    const wx = p.hovering ? -p.y * 0.05 * response : 0;
    const wy = p.hovering ? p.x * 0.05 * response : 0;
    for (let i = 0; i < substeps; i++) {
      stepSpring(w.rx, wx, 7, dampingRatio, dt);
      stepSpring(w.ry, wy, 7, dampingRatio, dt);
    }
    tilt.current?.rotation.set(w.rx.value, w.ry.value, 0);
    moving ||= !isSettled(w.rx, wx) || !isSettled(w.ry, wy);

    // Barely-there float; off entirely for reduced motion.
    const floating = !reducedMotion && intensity > 0;
    if (float.current) float.current.position.y = floating ? Math.sin(clock.elapsedTime * 0.55) * 0.015 : 0;

    if (activeRef.current && (moving || floating)) invalidate();
  });

  // The raycaster reports the nearest disc under the pointer; its index and
  // the hit point in that disc's own plane drive every layer's response.
  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const index = handles.current.findIndex((h) => h.object === e.object || h.object === e.object.parent);
    if (index < 0) return;
    const local = e.object.worldToLocal(e.point.clone());
    const radius = handles.current[index].radius;
    Object.assign(pointer.current, { x: local.x / radius, y: local.y / radius, index, hovering: true });
    invalidate();
  };
  const onPointerOut = () => {
    pointer.current.hovering = false;
    invalidate();
  };

  const register = (next: LayerHandle[]) => {
    handles.current = next;
    invalidate();
  };

  const procedural = <ProceduralDiscs styles={styles} discs={discs} detail={detail} onLayers={register} />;

  return (
    <group position={placement.position} scale={placement.scale}>
      <group ref={float}>
        <group rotation={STACK_ROTATION}>
          <group ref={tilt} onPointerMove={onPointerMove} onPointerOut={onPointerOut}>
            {modelUrl ? (
              <ModelBoundary fallback={procedural}>
                <Suspense fallback={procedural}>
                  <GltfLayers url={modelUrl} onLayers={register} />
                </Suspense>
              </ModelBoundary>
            ) : (
              procedural
            )}
          </group>
        </group>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */

interface ProceduralDiscsProps {
  styles: DiscStyle[];
  discs: DiscSpec[];
  detail: GeometryDetail;
  onLayers: (handles: LayerHandle[]) => void;
}

function ProceduralDiscs({ styles, discs, detail, onLayers }: ProceduralDiscsProps) {
  const groups = useRef<(Group | null)[]>([]);

  const parts = useMemo(
    () =>
      discs.map((spec, i) => ({
        spec,
        geometry: paintDisc(
          createLayerGeometry({ ...spec, inner: 0 }, detail),
          styles[i % styles.length],
          spec.outer,
          GRADIENT_DIRECTION
        ),
        material: createDiscMaterial(),
      })),
    [discs, styles, detail]
  );

  useEffect(
    () => () =>
      parts.forEach(({ geometry, material }) => {
        geometry.dispose();
        material.dispose();
      }),
    [parts]
  );

  useLayoutEffect(() => {
    onLayers(
      parts.flatMap(({ spec }, i) => {
        const g = groups.current[i];
        return g ? [toHandle(g, spec.outer)] : [];
      })
    );
  }, [parts]);

  return (
    <>
      {parts.map(({ spec, geometry, material }, i) => (
        <group
          key={i}
          ref={(g) => void (groups.current[i] = g)}
          position={[0, spec.lift, -spec.depth]}
          rotation={[spec.turn[0], spec.turn[1], 0]}
        >
          <mesh geometry={geometry} material={material} />
        </group>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */

function GltfLayers({ url, onLayers }: { url: string; onLayers: (handles: LayerHandle[]) => void }) {
  const { scene } = useGLTF(url);
  const model = useMemo(() => scene.clone(true), [scene]);

  useLayoutEffect(() => {
    // Normalise so the model's bounding sphere matches the procedural stack (~radius 1.6).
    const sphere = new Box3().setFromObject(model).getBoundingSphere(new Sphere());
    const k = 1.6 / sphere.radius;
    model.scale.setScalar(k);
    model.position.copy(sphere.center).multiplyScalar(-k);
    model.updateMatrixWorld(true);

    const meshes: Object3D[] = [];
    model.traverse((o) => (o as Mesh).isMesh && meshes.push(o));
    onLayers(
      meshes.map((m) => {
        const box = new Box3().setFromObject(m);
        return toHandle(m, Math.max((box.max.y - box.min.y) / 2, 0.01));
      })
    );
  }, [model]);

  return <primitive object={model} />;
}

/** Falls back to the procedural stack if a .glb fails to load. */
class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn('[discs] model failed to load, using procedural stack.', error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
