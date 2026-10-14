import { InteractiveGlassObject, type InteractiveGlassObjectProps } from './InteractiveGlassObject';

export interface HeroProps {
  eyebrow: string;
  title: string;
  glass?: Omit<InteractiveGlassObjectProps, 'onReady'>;
  onReady?: () => void;
}

/**
 * Two-column hero: crisp HTML text on the left (~45%), the WebGL glass object
 * on the right. Layout lives in styles.css (.hero, .hero__object).
 */
export function Hero({ eyebrow, title, glass, onReady }: HeroProps) {
  return (
    <section className="hero">
      <div className="hero__statement">
        <p className="hero__breadcrumb" data-hero-fade>
          <span className="t-caption">{eyebrow}</span>
          <span className="t-arrow-small" aria-hidden="true">
            ↓
          </span>
        </p>
        <h1 className="hero__title t-heading-lead" data-hero-title>
          {title}
        </h1>
      </div>
      <div className="hero__object" aria-hidden="true">
        <InteractiveGlassObject {...glass} onReady={onReady} />
      </div>
    </section>
  );
}
