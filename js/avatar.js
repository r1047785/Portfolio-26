import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const canvas = document.querySelector("#heroAvatar");
const wrapper = canvas?.parentElement;
if (!canvas || !wrapper) throw new Error("The hero avatar canvas is missing.");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const mobileQuality = window.matchMedia("(pointer: coarse)").matches;
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
// Supersample ordinary desktop screens as well as rendering sharply on Retina.
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobileQuality ? 1.5 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
const room = new RoomEnvironment();
const environment = pmrem.fromScene(room, 0.04);
scene.environment = environment.texture;
scene.environmentIntensity = 0.65;
room.dispose();
pmrem.dispose();
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
camera.position.set(0, 0, 6.4);
scene.add(new THREE.HemisphereLight(0xfff8ed, 0x7c7168, 0.5));

const keyLight = new THREE.DirectionalLight(0xffeee0, 2.5);
keyLight.position.set(-3.8, 5, 6);
keyLight.castShadow = true;
const shadowSize = mobileQuality ? 1024 : 2048;
keyLight.shadow.mapSize.set(shadowSize, shadowSize);
Object.assign(keyLight.shadow.camera, {
  left: -2.2, right: 2.2, top: 2.2, bottom: -2.2, near: 0.1, far: 18,
});
keyLight.shadow.bias = -0.0001;
keyLight.shadow.normalBias = 0.012;
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xe8efff, 0.65);
fillLight.position.set(4, 0.5, 3);
scene.add(fillLight);
const rimLight = new THREE.DirectionalLight(0xfff1e2, 1.1);
rimLight.position.set(-2, 1, -3);
scene.add(rimLight);

let avatar;
let targetX = 0;
let targetY = 0;
let frame = 0;
let avatarVisible = true;
let wake = () => {};
let layoutFrame = 0;

// Keep a layout anchor in the hero while the one live canvas travels between sections.
const destination = document.querySelector("#aboutAvatarDestination");
const origin = document.createElement("div");
origin.className = "hero-avatar-wrap avatar-origin";
origin.setAttribute("aria-hidden", "true");
wrapper.before(origin);
document.body.append(wrapper);
wrapper.classList.add("avatar-travelling");
let journey;
const measureJourney = () => {
  if (!destination) return;
  const start = origin.getBoundingClientRect();
  if (!start.width || !start.height) return;
  const end = destination.getBoundingClientRect();
  const scroll = window.scrollY;
  const scale = Math.min(end.width / start.width, end.height / start.height);
  journey = {
    x: start.left, y: start.top + scroll,
    endX: end.left + (end.width - start.width * scale) / 2,
    endY: end.top + scroll + (end.height - start.height * scale) / 2,
    scale,
    finish: Math.max(1, end.top + scroll + end.height / 2 - window.innerHeight * 0.52),
  };
  wrapper.style.width = `${start.width}px`;
  wrapper.style.height = `${start.height}px`;
  positionAvatar();
};
const positionAvatar = () => {
  if (!journey) return;
  const progress = THREE.MathUtils.clamp(window.scrollY / journey.finish, 0, 1);
  const t = reducedMotion ? Number(progress >= 0.5) : progress * progress * (3 - 2 * progress);
  const x = THREE.MathUtils.lerp(journey.x, journey.endX, t);
  const y = THREE.MathUtils.lerp(journey.y, journey.endY, t) - window.scrollY;
  const scale = THREE.MathUtils.lerp(1, journey.scale, t);
  wrapper.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
  avatarVisible = y < window.innerHeight && y + wrapper.clientHeight * scale > 0;
  wake();
};
measureJourney();
positionAvatar();
window.addEventListener("resize", measureJourney, { passive: true });
document.fonts.ready.then(measureJourney);
window.addEventListener("scroll", () => {
  if (layoutFrame) return;
  layoutFrame = requestAnimationFrame(() => {
    layoutFrame = 0;
    positionAvatar();
  });
}, { passive: true });

const resize = () => {
  const width = wrapper.clientWidth;
  const height = wrapper.clientHeight;
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  wake();
};
new ResizeObserver(resize).observe(wrapper);
resize();

if (!reducedMotion) {
  wrapper.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse") return;
    const bounds = wrapper.getBoundingClientRect();
    targetY = ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.7;
    targetX = ((event.clientY - bounds.top) / bounds.height - 0.5) * -0.36;
  });
  wrapper.addEventListener("pointerleave", () => {
    targetX = 0;
    targetY = 0;
  });
}

const loader = new GLTFLoader();
loader.load(
  "assets/models/yente-avatar.glb",
  ({ scene: model }) => {
    const tunedMaterials = new Set();
    model.traverse((object) => {
      if (!object.isMesh) return;
      object.castShadow = true;
      object.receiveShadow = true;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (tunedMaterials.has(material)) continue;
        tunedMaterials.add(material);
        // Preserve authored vertex colours; only tune the surface response.
        if (/Hair/.test(material.name)) {
          material.roughness = 0.26;
          material.clearcoat = 0.42;
          material.clearcoatRoughness = 0.16;
        } else if (/vinyl|Ear|porcelain/.test(material.name)) {
          material.roughness = 0.32;
          material.clearcoat = 0.28;
          material.clearcoatRoughness = 0.22;
        } else if (/Eyes|Iris|Pupils/.test(material.name)) {
          material.clearcoatRoughness = 0.12;
        }
      }
    });
    avatar = new THREE.Group();
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = 3.1 / Math.max(size.x, size.y, size.z);
    model.scale.setScalar(scale);
    model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
    avatar.add(model);
    scene.add(avatar);
    wrapper.classList.add("is-ready");
    wake();
    window.dispatchEvent(new CustomEvent("avatar-progress", { detail: { progress: 100, ready: true } }));
  },
  (event) => {
    const progress = event.lengthComputable ? 25 + (event.loaded / event.total) * 65 : 45;
    window.dispatchEvent(new CustomEvent("avatar-progress", { detail: { progress } }));
  },
  (error) => {
    console.error("Could not load the 3D portrait.", error);
    wrapper.classList.add("has-error");
    window.dispatchEvent(new CustomEvent("avatar-progress", { detail: { progress: 100, ready: true } }));
  },
);

let lastRender = -Infinity;
const frameInterval = 1000 / (mobileQuality ? 30 : 60);
const render = (time) => {
  frame = 0;
  if (document.hidden || !avatarVisible || !avatar) return;
  if (!reducedMotion) frame = requestAnimationFrame(render);
  if (time - lastRender < frameInterval - 1) return;
  const blend = 1 - Math.exp(-2.8 * Math.min((time - lastRender) / 1000, 0.1));
  lastRender = time;
  if (avatar && !reducedMotion) {
    avatar.rotation.x += (targetX - avatar.rotation.x) * blend;
    avatar.rotation.y += (targetY - avatar.rotation.y) * blend;
    avatar.position.y = Math.sin(time * 0.0008) * 0.035;
  }
  renderer.render(scene, camera);
};
wake = () => {
  if (!frame && avatar && avatarVisible && !document.hidden) {
    lastRender = -Infinity;
    frame = requestAnimationFrame(render);
  }
};
document.addEventListener("visibilitychange", () => {
  cancelAnimationFrame(frame);
  frame = 0;
  wake();
});
// Keep the WebGL context intact when the browser stores the page for Back navigation.
window.addEventListener("pagehide", () => {
  cancelAnimationFrame(frame);
  cancelAnimationFrame(layoutFrame);
  frame = 0;
  layoutFrame = 0;
});
window.addEventListener("pageshow", () => { measureJourney(); wake(); });
