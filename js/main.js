import * as THREE from "https://unpkg.com/three@0.165.0/build/three.module.js";

const scene = new THREE.Scene();

let last = performance.now();
let currentAction = null;
let state = "Idle";

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

// Player
const player = new THREE.Group();
const material = new THREE.MeshLambertMaterial({
  color: 0x8844ff,
});
const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2, 0.5), material);

let walkTime = 0;

body.position.y = 1;

const nose = new THREE.Mesh(
  new THREE.BoxGeometry(0.2, 0.2, 0.2),
  new THREE.MeshLambertMaterial({ color: 0xffff00 }),
);

nose.position.set(0, 1.5, 0.4);

player.add(body);
player.add(nose);

const shadow = new THREE.Mesh(
  new THREE.CircleGeometry(0.5, 16),
  new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.25,
  }),
);

shadow.rotation.x = -Math.PI / 2;
shadow.position.y = 0.01;

scene.add(shadow);
scene.add(player);

// Enemy
function createEnemy(x, z) {
  const group = new THREE.Group();

  const enemyMaterial = new THREE.MeshLambertMaterial({ color: 0xff3333 });
  const enemyBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 2, 0.5),
    enemyMaterial,
  );
  enemyBody.position.y = 1;

  const enemyNose = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.2, 0.2),
    new THREE.MeshLambertMaterial({ color: 0xffff00 }),
  );
  enemyNose.position.set(0, 1.5, 0.4);

  group.add(enemyBody);
  group.add(enemyNose);
  group.position.set(x, 1, z);

  const enemyShadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 16),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.25,
    }),
  );
  enemyShadow.rotation.x = -Math.PI / 2;
  enemyShadow.position.set(x, 0.01, z);

  scene.add(enemyShadow);
  scene.add(group);

  return { group, shadow: enemyShadow, walkTime: 0 };
}

const enemies = [
  createEnemy(15, -15),
  createEnemy(-20, 10),
  createEnemy(25, 20),
];

// Orthographic camera (axonometric)
const aspect = window.innerWidth / window.innerHeight;
const frustumSize = 30;

const camera = new THREE.OrthographicCamera(
  frustumSize / -2,
  frustumSize / 2,
  frustumSize / aspect / 2,
  frustumSize / aspect / -2,
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

// Debris storage
const debrisPieces = [];

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

  const speed = 7;
  let moving = false;

  if (keys["w"]) {
    player.position.z -= speed * dt;
    moving = true;
  }
  if (keys["s"]) {
    player.position.z += speed * dt;
    moving = true;
  }
  if (keys["a"]) {
    player.position.x -= speed * dt;
    moving = true;
  }
  if (keys["d"]) {
    player.position.x += speed * dt;
    moving = true;
  }

  if (moving) {
    walkTime += dt * 10;

    player.position.y = 1 + Math.abs(Math.sin(walkTime)) * 0.15;

    player.rotation.z = Math.sin(walkTime) * 0.05;
  } else {
    player.position.y = 1;
    player.rotation.z = 0;
  }

  shadow.position.set(player.position.x, 0.01, player.position.z);
}

function updateEnemies(dt) {
  const speed = 2.5;

  for (const enemy of enemies) {
    const dir = new THREE.Vector3()
      .subVectors(player.position, enemy.group.position)
      .setY(0);

    const dist = dir.length();

    if (dist > 0.6) {
      dir.normalize();
      enemy.group.position.addScaledVector(dir, speed * dt);

      enemy.walkTime += dt * 10;
      enemy.group.position.y = 1 + Math.abs(Math.sin(enemy.walkTime)) * 0.15;
      enemy.group.rotation.z = Math.sin(enemy.walkTime) * 0.05;
    } else {
      enemy.group.position.y = 1;
      enemy.group.rotation.z = 0;
    }

    enemy.group.lookAt(
      player.position.x,
      enemy.group.position.y,
      player.position.z,
    );

    enemy.shadow.position.set(
      enemy.group.position.x,
      0.01,
      enemy.group.position.z,
    );
  }
}

function shoot(target) {
  const bullet = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 8, 8),
    new THREE.MeshLambertMaterial({
      color: 0x000000,
    }),
  );

  bullet.position.copy(player.position);

  bullet.position.y = 2;

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

function spawnDebris(position) {
  const colors = [0xff3333, 0xff5555, 0xffff00, 0xff8800];
  const count = 10 + Math.floor(Math.random() * 6);

  for (let i = 0; i < count; i++) {
    const size = 0.1 + Math.random() * 0.2;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(size, size, size),
      new THREE.MeshLambertMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
      }),
    );

    mesh.position.copy(position);
    mesh.position.y = 0.5 + Math.random() * 1.5;

    // Random outward velocity + upward arc
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 5;
    const vy = 3 + Math.random() * 4;

    const vx = Math.cos(angle) * speed;
    const vz = Math.sin(angle) * speed;

    mesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI,
    );

    scene.add(mesh);

    debrisPieces.push({
      mesh,
      vx,
      vy,
      vz,
      lifetime: 1.5 + Math.random() * 1.0,
      age: 0,
    });
  }
}

function updateDebris(dt) {
  const gravity = 12;

  for (let i = debrisPieces.length - 1; i >= 0; i--) {
    const d = debrisPieces[i];

    d.age += dt;

    d.vy -= gravity * dt;
    d.mesh.position.x += d.vx * dt;
    d.mesh.position.y += d.vy * dt;
    d.mesh.position.z += d.vz * dt;

    // Bounce & settle on ground
    if (d.mesh.position.y < 0.05) {
      d.mesh.position.y = 0.05;
      d.vy *= -0.3;
      d.vx *= 0.6;
      d.vz *= 0.6;
    }

    // Tumble while airborne
    d.mesh.rotation.x += d.vx * dt * 2;
    d.mesh.rotation.z += d.vz * dt * 2;

    // Fade out near end of life
    if (d.age > d.lifetime * 0.6) {
      const t = (d.age - d.lifetime * 0.6) / (d.lifetime * 0.4);
      d.mesh.material.transparent = true;
      d.mesh.material.opacity = 1 - t;
    }

    if (d.age >= d.lifetime) {
      scene.remove(d.mesh);
      debrisPieces.splice(i, 1);
    }
  }
}

function updateProjectiles(dt) {
  const speed = 30;

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];

    p.mesh.position.addScaledVector(p.direction, speed * dt);

    // Hit detection against enemies
    let hit = false;
    for (let j = enemies.length - 1; j >= 0; j--) {
      const enemy = enemies[j];
      const dx = p.mesh.position.x - enemy.group.position.x;
      const dz = p.mesh.position.z - enemy.group.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < 0.8) {
        spawnDebris(enemy.group.position);

        scene.remove(enemy.group);
        scene.remove(enemy.shadow);
        enemies.splice(j, 1);

        hit = true;
        break;
      }
    }

    if (hit || p.mesh.position.distanceTo(player.position) > 50) {
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
  updateEnemies(dt);
  updateDebris(dt);

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

  camera.left = frustumSize / -2;
  camera.right = frustumSize / 2;
  camera.top = frustumSize / aspect / 2;
  camera.bottom = frustumSize / aspect / -2;

  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
