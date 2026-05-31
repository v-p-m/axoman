import * as THREE from "https://unpkg.com/three@0.165.0/build/three.module.js";
import { FBXLoader } from "https://unpkg.com/three@0.165.0/examples/jsm/loaders/FBXLoader.js";

const loader = new FBXLoader();

const scene = new THREE.Scene();

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Ground
const groundTexture = new THREE.TextureLoader().load(
  "assets/imgp5487_seamless.jpg",
);

groundTexture.wrapS = THREE.RepeatWrapping;
groundTexture.wrapT = THREE.RepeatWrapping;

groundTexture.repeat.set(20, 20);

groundTexture.colorSpace = THREE.SRGBColorSpace;
groundTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

const groundMaterial = new THREE.MeshLambertMaterial({
  map: groundTexture,
});

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  groundMaterial,
);

ground.rotation.x = -Math.PI / 2;

scene.add(ground);

// Orthographic camera (axonometric)
const aspect = window.innerWidth / window.innerHeight;
const frustumSize = 20;

const camera = new THREE.OrthographicCamera(
  (frustumSize * aspect) / -2,
  (frustumSize * aspect) / 2,
  frustumSize / 2,
  frustumSize / -2,
  0.1,
  1000,
);

camera.position.set(15, 15, 15);
camera.lookAt(0, 0, 0);

// Light
const sun = new THREE.DirectionalLight(0xffffff, 2);
sun.position.set(10, 20, 10);
scene.add(sun);

scene.add(new THREE.AmbientLight(0xffffff, 0.5));

// Projectile storage
const projectiles = [];

// Character
const player = new THREE.Group();

scene.add(player);

loader.load("assets/SM_StaticJohn.fbx", (fbx) => {
  fbx.scale.set(0.01, 0.01, 0.01);
  fbx.rotation.x = -Math.PI / 2;
  player.add(fbx);
});

// Input
const keys = {};

window.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;
});

window.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();

window.addEventListener("mousemove", (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

window.addEventListener("mousedown", () => {
  raycaster.setFromCamera(mouse, camera);

  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  const target = new THREE.Vector3();

  if (raycaster.ray.intersectPlane(groundPlane, target)) {
    shoot(target);
  }
});

function updatePlayer(dt) {
  if (!player) return;

  const speed = 5;

  if (keys["w"]) player.position.z -= speed * dt;
  if (keys["s"]) player.position.z += speed * dt;
  if (keys["a"]) player.position.x -= speed * dt;
  if (keys["d"]) player.position.x += speed * dt;
}

let last = performance.now();

function shoot(target) {
  const bullet = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 8, 8),
    new THREE.MeshLambertMaterial({
      color: 0xffff00,
    }),
  );

  bullet.position.copy(player.position);

  bullet.position.y = 1;

  target.y = bullet.position.y;

  const direction = new THREE.Vector3()
    .subVectors(target, bullet.position)
    .normalize();

  projectiles.push({
    mesh: bullet,
    direction,
  });

  scene.add(bullet);
}

function updateProjectiles(dt) {
  const speed = 30;

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];

    p.mesh.position.addScaledVector(p.direction, speed * dt);

    if (p.mesh.position.distanceTo(player.position) > 50) {
      scene.remove(p.mesh);
      projectiles.splice(i, 1);
    }
  }
}

function animate(now) {
  requestAnimationFrame(animate);

  const dt = (now - last) / 1000;
  last = now;

  updatePlayer(dt);
  updateProjectiles(dt);

  camera.position.set(player.position.x + 15, 15, player.position.z + 15);

  camera.lookAt(player.position.x, 0, player.position.z);

  raycaster.setFromCamera(mouse, camera);

  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  const target = new THREE.Vector3();

  if (raycaster.ray.intersectPlane(plane, target)) {
    player.lookAt(target.x, player.position.y, target.z);
  }

  renderer.render(scene, camera);
}

animate(performance.now());

window.addEventListener("resize", () => {
  const aspect = window.innerWidth / window.innerHeight;

  camera.left = (-frustumSize * aspect) / 2;
  camera.right = (frustumSize * aspect) / 2;
  camera.top = frustumSize / 2;
  camera.bottom = -frustumSize / 2;

  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
