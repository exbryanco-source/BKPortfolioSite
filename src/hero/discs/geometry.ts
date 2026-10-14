import { BufferAttribute, Color, LatheGeometry, Vector2, type BufferGeometry } from 'three';

/**
 * Cross-section of one glass layer, revolved around the object's axis.
 * Units are relative to the object's outer radius (1).
 */
export interface LayerShape {
  /** Inner radius. 0 makes a solid lens-like disc. */
  inner: number;
  outer: number;
  thickness: number;
  /** Corner radius of the rounded cross-section. Clamped to what fits. */
  bevel: number;
  /** Pillowing of the front/back faces (convex lens or soft ring crown). */
  crown: number;
  /** Shell curvature: y offset = dish * r². Negative bends the rim away from the viewer. */
  dish: number;
}

export interface GeometryDetail {
  radialSegments: number;
  /** Points per straight edge and per rounded corner of the profile. */
  profileSteps: number;
}

export const DETAIL_HIGH: GeometryDetail = { radialSegments: 160, profileSteps: 14 };
export const DETAIL_LOW: GeometryDetail = { radialSegments: 72, profileSteps: 7 };

/**
 * Closed (r, y) profile: a rounded rectangle for rings, or a rounded slab from
 * the axis outwards for a solid disc. Traversed bottom → outer → top → inner so
 * LatheGeometry's normals point out of the solid.
 */
export function layerProfile(shape: LayerShape, steps: number): Vector2[] {
  const { inner, outer, thickness, crown, dish } = shape;
  const solid = inner <= 0;
  const h = thickness / 2;
  const width = outer - Math.max(inner, 0);
  const b = Math.min(shape.bevel, h, solid ? outer : width / 2);
  const pts: Vector2[] = [];

  const line = (r0: number, y0: number, r1: number, y1: number) => {
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      pts.push(new Vector2(r0 + (r1 - r0) * t, y0 + (y1 - y0) * t));
    }
  };
  const arc = (cr: number, cy: number, a0: number, a1: number) => {
    for (let i = 0; i < steps; i++) {
      const a = a0 + ((a1 - a0) * i) / steps;
      pts.push(new Vector2(cr + Math.cos(a) * b, cy + Math.sin(a) * b));
    }
  };

  const r0 = solid ? 0 : inner;
  line(solid ? 0 : r0 + b, -h, outer - b, -h); //             back face
  arc(outer - b, -h + b, -Math.PI / 2, 0); //                  back outer corner
  line(outer, -h + b, outer, h - b); //                        rim
  arc(outer - b, h - b, 0, Math.PI / 2); //                    front outer corner
  if (solid) {
    line(outer - b, h, 0, h); //                               front face to axis
    pts.push(new Vector2(0, h));
  } else {
    line(outer - b, h, r0 + b, h); //                          front face
    arc(r0 + b, h - b, Math.PI / 2, Math.PI); //               front inner corner
    line(r0, h - b, r0, -h + b); //                            inner wall
    arc(r0 + b, -h + b, Math.PI, (Math.PI * 3) / 2); //        back inner corner
    pts.push(pts[0].clone()); //                               close the loop
  }

  // Soft crown on the faces and an overall shell curvature.
  for (const p of pts) {
    const u = solid ? p.x / outer : (p.x - r0) / width;
    const swell = solid ? 1 - u * u : Math.sin(Math.PI * Math.min(Math.max(u, 0), 1));
    p.y += (p.y / h) * crown * swell + dish * p.x * p.x;
  }
  return pts;
}

/** Lathe the profile and turn the axis from +Y to +Z so the front faces the camera. */
export function createLayerGeometry(shape: LayerShape, detail: GeometryDetail): LatheGeometry {
  const geometry = new LatheGeometry(layerProfile(shape, detail.profileSteps), detail.radialSegments);
  geometry.rotateX(Math.PI / 2);
  geometry.computeBoundingSphere();
  return geometry;
}

/** Colour treatment of one disc: a three-stop face gradient plus a rim colour. */
export interface DiscStyle {
  from: string;
  via: string;
  to: string;
  /** Thin bright edge seen on the disc's rim. */
  rim: string;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * Bakes the gradient into vertex colours. `direction` is the gradient axis in
 * the disc's own plane (from → to); the rim is blended in where the surface
 * turns edge-on, so the colour follows the real geometry rather than a decal.
 */
export function paintDisc(geometry: BufferGeometry, style: DiscStyle, radius: number, direction: [number, number]) {
  const pos = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const [dx, dy] = direction;
  const len = Math.hypot(dx, dy) || 1;
  const from = new Color(style.from);
  const via = new Color(style.via);
  const to = new Color(style.to);
  const rim = new Color(style.rim);
  const c = new Color();
  const colors = new Float32Array(pos.count * 3);

  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(Math.max(0.5 + ((pos.getX(i) * dx + pos.getY(i) * dy) / len / radius) * 0.5, 0), 1);
    if (t < 0.5) c.copy(from).lerp(via, smooth(t * 2));
    else c.copy(via).lerp(to, smooth((t - 0.5) * 2));
    const edgeOn = 1 - Math.min(Math.abs(normal.getZ(i)) / 0.6, 1);
    c.lerp(rim, edgeOn);
    c.toArray(colors, i * 3);
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  return geometry;
}
