import { Component, useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { NeutralToneMapping } from 'three';
import { DiscStack, type Composition } from './DiscStack';
import { DETAIL_HIGH, DETAIL_LOW, type DiscStyle } from './discs/geometry';
import { DEFAULT_DISCS, DEFAULT_STYLES, type DiscSpec } from './discs/discs';

export interface InteractiveGlassObjectProps {
  /** Gradient + rim colours per disc, front → back (cycled if shorter than `discs`). */
  styles?: DiscStyle[];
  /** Disc geometry and spacing, front → back. */
  discs?: DiscSpec[];
  /** Front-disc placement and size within the canvas (desktop/tablet). */
  composition?: Partial<Composition>;
  /** Placement used at ≤720px, where the canvas sits below the text. */
  compactComposition?: Partial<Composition>;
  /** Multiplier on the composed size. */
  scale?: number;
  /** Pointer response strength. 0 disables motion. */
  intensity?: number;
  /** Optional .glb to use instead of the procedural layers. */
  modelUrl?: string;
  className?: string;
  /** Called once the first frame has been drawn (or WebGL is unavailable). */
  onReady?: () => void;
}

// Front disc centred at ~30% / 67% of the right-hand column, as in the reference;
// the larger discs behind it run off the top-right edge.
const DEFAULT_COMPOSITION: Composition = { x: 0.3, y: 0.67, size: 0.34 };
// Mobile (Figma 84:657): canvas fills the 700px hero behind the text; stack sits mid-right above the headline.
const DEFAULT_COMPACT_COMPOSITION: Composition = { x: 0.56, y: 0.55, size: 0.125 };

const COMPACT_QUERY = '(max-width: 720px)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (notify) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', notify);
      return () => mql.removeEventListener('change', notify);
    },
    () => window.matchMedia(query).matches
  );
}

/**
 * Transparent WebGL canvas containing the glass sculpture. Fills its parent;
 * size and place it with CSS (see .hero__object in styles.css).
 */
export function InteractiveGlassObject({
  styles = DEFAULT_STYLES,
  discs = DEFAULT_DISCS,
  composition,
  compactComposition,
  scale = 1,
  intensity = 1,
  modelUrl,
  className,
  onReady,
}: InteractiveGlassObjectProps) {
  const compact = useMediaQuery(COMPACT_QUERY);
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const container = useRef<HTMLDivElement>(null);
  const active = useRef(true);
  const invalidateRef = useRef<() => void>(() => {});

  const placement = useMemo(
    () =>
      compact
        ? { ...DEFAULT_COMPACT_COMPOSITION, ...compactComposition }
        : { ...DEFAULT_COMPOSITION, ...composition },
    [compact, composition, compactComposition]
  );

  // Stop requesting frames while scrolled out of view.
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      active.current = entry.isIntersecting;
      if (entry.isIntersecting) invalidateRef.current();
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={container} className={className ?? 'glass-object'}>
      <WebGLBoundary onError={onReady}>
        <Canvas
          frameloop="demand"
          dpr={compact ? [1, 1.5] : [1, 2]}
          camera={{ fov: 28, position: [0, 0, 7], near: 0.1, far: 50 }}
          gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
          style={{ touchAction: 'pan-y' }}
          onCreated={({ gl, scene, invalidate }) => {
            gl.setClearColor(0x000000, 0); // fully transparent: the page shows through
            gl.toneMapping = NeutralToneMapping; // keeps the gradient hues true
            scene.background = null;
            invalidateRef.current = invalidate;
          }}
        >
          <StudioLighting />
          <DiscStack
            styles={styles}
            discs={discs}
            detail={compact ? DETAIL_LOW : DETAIL_HIGH}
            composition={placement}
            intensity={intensity}
            scale={scale}
            reducedMotion={reducedMotion}
            activeRef={active}
            modelUrl={modelUrl}
          />
          <FirstFrame onReady={onReady} />
        </Canvas>
      </WebGLBoundary>
    </div>
  );
}

/**
 * Soft key from the upper-left, cool fill from the right, rim from behind,
 * plus a procedural studio environment for the satin sheen. The environment
 * only lights the scene — it is never used as the background.
 */
function StudioLighting() {
  return (
    <>
      <hemisphereLight args={['#ffffff', '#f3e9ff', 0.9]} />
      <directionalLight position={[-4, 5, 5]} intensity={1.4} />
      <directionalLight position={[5, -1, 3]} intensity={0.4} color="#e6efff" />
      <directionalLight position={[1, 3, -6]} intensity={1.2} />
      <Environment resolution={256} frames={1}>
        {/* Large softbox, upper-left */}
        <Lightformer form="rect" intensity={2} position={[-5, 4, 5]} scale={[8, 6, 1]} target={[0, 0, 0]} />
        {/* Fill, right */}
        <Lightformer form="rect" intensity={0.6} position={[6, 0, 3]} scale={[4, 7, 1]} target={[0, 0, 0]} />
        {/* Rim strip behind — catches the disc edges */}
        <Lightformer form="rect" intensity={1.6} position={[0, 2, -6]} scale={[12, 1.5, 1]} target={[0, 0, 0]} />
      </Environment>
    </>
  );
}

function FirstFrame({ onReady }: { onReady?: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    requestAnimationFrame(() => onReady?.());
  });
  return null;
}

/** If WebGL is unavailable the hero simply shows its text. */
class WebGLBoundary extends Component<{ onError?: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn('[glass] WebGL unavailable.', error);
    this.props.onError?.();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
