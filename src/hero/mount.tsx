import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Hero, type HeroProps } from './Hero';

/** Hero copy and glass settings — edit here. */
export const heroContent: Omit<HeroProps, 'onReady'> = {
  eyebrow: 'Hey! I’m Bryan',
  title: 'A Creative Director at the intersection of Brand & Product.',
  glass: {
    intensity: 1,
    scale: 1,
    // composition: { x: 0.3, y: 0.67, size: 0.34 }, // front disc position/size in the right column
    // styles: [...],                              // gradient + rim colours per disc (src/hero/discs/discs.ts)
    // modelUrl: '/models/hero.glb',               // optional: each mesh becomes a reacting layer
  },
};

/**
 * Renders the hero into `container` synchronously (so GSAP can find the
 * text straight away) and resolves once the glass object's first frame is
 * drawn. Never blocks longer than `timeout`.
 */
export function mountHero(container: HTMLElement, timeout = 6000): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, timeout);
    const root = createRoot(container);
    flushSync(() =>
      root.render(
        <StrictMode>
          <Hero {...heroContent} onReady={resolve} />
        </StrictMode>
      )
    );
  });
}
