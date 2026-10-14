import { MeshPhysicalMaterial } from 'three';

/**
 * Satin, softly glossy material driven by the disc's baked vertex colours.
 * A share of the vertex colour is added as emission so the gradients stay
 * luminous and true to hue instead of being darkened by shading.
 */
export function createDiscMaterial(glow = 0.38): MeshPhysicalMaterial {
  const material = new MeshPhysicalMaterial({
    vertexColors: true,
    roughness: 0.42,
    metalness: 0,
    clearcoat: 0.55,
    clearcoatRoughness: 0.28,
    sheen: 0.35,
    sheenRoughness: 0.6,
    envMapIntensity: 0.7,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.colorGlow = { value: glow };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float colorGlow;')
      .replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vColor.rgb * colorGlow;'
      );
  };
  material.customProgramCacheKey = () => `disc-glow-${glow}`;
  return material;
}
