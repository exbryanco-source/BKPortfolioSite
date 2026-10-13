import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Drop your model at public/models/hero.glb. Until then a placeholder is shown.
const MODEL_URL = '/models/hero.glb';
const MODEL_SIZE = 2.4; // model is scaled so its largest side is this many units

export async function initScene(canvas, { onProgress } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 7);

  // scrollGroup <- driven by scroll, tiltGroup <- driven by pointer
  const scrollGroup = new THREE.Group();
  const tiltGroup = new THREE.Group();
  scrollGroup.add(tiltGroup);
  scene.add(scrollGroup);

  let mixer = null;
  let idleSpin = null;

  try {
    const gltf = await loadModel(onProgress);
    const model = gltf.scene;
    fitAndCenter(model, MODEL_SIZE);
    tiltGroup.add(model);

    // Play baked GLTF animation clips (if the file has any)
    if (gltf.animations.length) {
      mixer = new THREE.AnimationMixer(model);
      gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
    }
  } catch {
    console.info(`[scene] No model at ${MODEL_URL} — showing placeholder.`);
    idleSpin = createPlaceholder();
    tiltGroup.add(idleSpin);
    onProgress?.(1);
  }

  // Scroll-driven motion across the whole page
  gsap
    .timeline({
      scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 1.2 },
      defaults: { ease: 'none' },
    })
    .to(scrollGroup.rotation, { y: Math.PI * 2, duration: 1 }, 0)
    .to(scrollGroup.position, { x: 1.6, y: -0.3 }, 0)
    .to(scrollGroup.position, { x: -1.6 }, 0.5)
    .to(scrollGroup.scale, { x: 0.7, y: 0.7, z: 0.7 }, 0.5);

  // Pointer parallax
  const pointer = { x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  const clock = new THREE.Clock();
  gsap.ticker.add(() => {
    const dt = clock.getDelta();
    mixer?.update(dt);
    if (idleSpin) idleSpin.rotation.x += dt * 0.25;
    tiltGroup.rotation.y += (pointer.x * 0.35 - tiltGroup.rotation.y) * 0.05;
    tiltGroup.rotation.x += (pointer.y * 0.2 - tiltGroup.rotation.x) * 0.05;
    renderer.render(scene, camera);
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function loadModel(onProgress) {
  const draco = new DRACOLoader().setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
  const loader = new GLTFLoader().setDRACOLoader(draco);
  return new Promise((resolve, reject) =>
    loader.load(
      MODEL_URL,
      resolve,
      (e) => e.total && onProgress?.(e.loaded / e.total),
      reject
    )
  );
}

function fitAndCenter(object, size) {
  const box = new THREE.Box3().setFromObject(object);
  const dims = box.getSize(new THREE.Vector3());
  const scale = size / Math.max(dims.x, dims.y, dims.z);
  object.scale.setScalar(scale);
  const center = box.getCenter(new THREE.Vector3()).multiplyScalar(scale);
  object.position.sub(center);
}

function createPlaceholder() {
  return new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.8, 0.28, 220, 32),
    new THREE.MeshPhysicalMaterial({ color: 0xd9d9d9, metalness: 1, roughness: 0.18, clearcoat: 1 })
  );
}
