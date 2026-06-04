import * as THREE from "https://unpkg.com/three@0.165.0/build/three.module.js";

const scene = new THREE.Scene();

let last = performance.now();
let currentAction = null;
let gameRunning = false;

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
let playerHealth = 100;

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

  return {
    group,
    shadow: enemyShadow,
    walkTime: 0,
    grenadeCooldown: 4 + Math.random() * 3,
  };
}

function spawnEnemy() {
  const angle = Math.random() * Math.PI * 2;
  const distance = 15 + Math.random() * 10; // 15–25 units away

  const x = player.position.x + Math.cos(angle) * distance;
  const z = player.position.z + Math.sin(angle) * distance;

  enemies.push(createEnemy(x, z));
}

const enemySpawns = [
  [15, -15],
  [-20, 10],
  [25, 20],
];

const enemies = enemySpawns.map(([x, z]) => createEnemy(x, z));

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

// UI Overlay
const style = document.createElement("style");
style.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400;700&display=swap');

  #overlay {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.72);
    backdrop-filter: blur(3px);
    z-index: 10;
    font-family: 'Pixelify Sans', monospace;
  }

  #overlay h1 {
    color: #fff;
    font-size: clamp(2rem, 6vw, 4rem);
    letter-spacing: 0.15em;
    margin: 0 0 0.25em;
    text-shadow: 0 0 30px #8844ff, 0 0 60px #8844ff88;
  }

  #overlay p {
    color: #aaa;
    font-size: clamp(0.75rem, 2vw, 1rem);
    letter-spacing: 0.1em;
    margin: 0 0 2.5em;
  }

  .ui-btn {
    font-family: 'Pixelify Sans', monospace;
    font-size: clamp(1rem, 2.5vw, 1.3rem);
    letter-spacing: 0.2em;
    padding: 0.65em 2.2em;
    border: 2px solid #8844ff;
    background: transparent;
    color: #fff;
    cursor: pointer;
    transition: background 0.15s, box-shadow 0.15s, transform 0.1s;
    text-transform: uppercase;
  }

  .ui-btn:hover {
    background: #8844ff;
    box-shadow: 0 0 24px #8844ffaa;
    transform: scale(1.04);
  }

  .ui-btn:active { transform: scale(0.97); }

  #resetBtn {
    position: fixed;
    top: 18px;
    right: 22px;
    z-index: 9;
    font-family: 'Pixelify Sans', monospace;
    font-size: 0.85rem;
    letter-spacing: 0.15em;
    padding: 0.4em 1.1em;
    border: 1.5px solid rgba(255,255,255,0.25);
    background: rgba(0,0,0,0.45);
    color: rgba(255,255,255,0.6);
    cursor: pointer;
    text-transform: uppercase;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
  }

  #resetBtn:hover {
    border-color: #ff4444;
    color: #ff4444;
    background: rgba(255,68,68,0.1);
  }
  #diedScreen {
    position: fixed;
    inset: 0;
    display: none;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.0);
    z-index: 11;
    font-family: 'Pixelify Sans', monospace;
    pointer-events: none;
    transition: background 0.4s;
  }

  #diedScreen.visible {
    background: rgba(80, 0, 0, 0.65);
    backdrop-filter: blur(2px);
    pointer-events: all;
  }

  #diedScreen h2 {
    color: #ff2222;
    font-size: clamp(2.5rem, 8vw, 5rem);
    letter-spacing: 0.2em;
    margin: 0 0 0.2em;
    text-shadow: 0 0 40px #ff0000, 0 0 80px #ff000066;
    opacity: 0;
    transform: scale(0.6);
    transition: opacity 0.35s 0.1s, transform 0.35s 0.1s;
  }

  #diedScreen.visible h2 {
    opacity: 1;
    transform: scale(1);
  }

  #diedScreen p {
    color: #ffaaaa;
    font-size: clamp(0.8rem, 2vw, 1.1rem);
    letter-spacing: 0.12em;
    margin: 0 0 2em;
    opacity: 0;
    transition: opacity 0.3s 0.35s;
  }

  #diedScreen.visible p { opacity: 1; }

  #diedScreen .ui-btn {
    border-color: #ff4444;
    opacity: 0;
    transition: opacity 0.3s 0.5s, background 0.15s, box-shadow 0.15s, transform 0.1s;
  }

  #diedScreen.visible .ui-btn { opacity: 1; }

  #diedScreen .ui-btn:hover {
    background: #ff4444;
    box-shadow: 0 0 24px #ff4444aa;
  }
  #healthBar {
    position: fixed;
    bottom: 24px;
    left: 24px;
    z-index: 9;
    font-family: 'Pixelify Sans', monospace;
    color: #fff;
    font-size: 0.85rem;
    letter-spacing: 0.1em;
  }

  #healthBar label {
    display: block;
    margin-bottom: 5px;
    color: #aaa;
  }

  #healthBarOuter {
    width: 160px;
    height: 14px;
    background: rgba(0,0,0,0.5);
    border: 1.5px solid rgba(255,255,255,0.2);
  }

  #healthBarInner {
    height: 100%;
    width: 100%;
    background: #44ff88;
    transition: width 0.2s, background 0.3s;
  }
`;
document.head.appendChild(style);

const overlay = document.createElement("div");
overlay.id = "overlay";
overlay.innerHTML = `
  <h1>AXOMAN</h1>
  <p>WASD to move &nbsp;·&nbsp; Mouse to aim &nbsp;·&nbsp; Click to shoot</p>
  <button class="ui-btn" id="playBtn">▶ &nbsp;PLAY</button>
`;
document.body.appendChild(overlay);

const diedScreen = document.createElement("div");
diedScreen.id = "diedScreen";
diedScreen.innerHTML = `
  <h2>YOU DIED</h2>
  <p>You succumbed to your injuries.</p>
  <button class="ui-btn" id="diedResetBtn">↺ &nbsp;TRY AGAIN</button>
`;
document.body.appendChild(diedScreen);

const explosionFlashEl = document.createElement("div");
explosionFlashEl.id = "explosionFlash";
document.body.appendChild(explosionFlashEl);

const healthBarEl = document.createElement("div");
healthBarEl.id = "healthBar";
healthBarEl.innerHTML = `
  <label>HEALTH</label>
  <div id="healthBarOuter">
    <div id="healthBarInner"></div>
  </div>
`;
healthBarEl.style.display = "none";
document.body.appendChild(healthBarEl);
const healthBarInner = document.getElementById("healthBarInner");

const resetBtn = document.createElement("button");
resetBtn.id = "resetBtn";
resetBtn.textContent = "↺  RESET";
resetBtn.style.display = "none";
document.body.appendChild(resetBtn);

function startGame() {
  gameRunning = true;
  overlay.style.display = "none";
  resetBtn.style.display = "block";
  healthBarEl.style.display = "block";
  last = performance.now();
}

function damagePlayer(amount) {
  playerHealth = Math.max(0, playerHealth - amount);
  updateHealthBar();
  if (playerHealth <= 0) killPlayer();
}

function killPlayer() {
  if (!gameRunning) return;
  gameRunning = false; // ← stops the game loop AND prevents re-entry immediately

  spawnDebris(player.position, [0x8844ff, 0xaa66ff, 0xffff00, 0xcc88ff]);

  player.visible = false;
  shadow.visible = false;
  resetBtn.style.display = "none";

  // Debris keeps animating because updateDebris still runs outside the gameRunning gate
  setTimeout(() => {
    diedScreen.style.display = "flex";
    requestAnimationFrame(() => diedScreen.classList.add("visible"));
  }, 1000);
}

function resetGame() {
  // Hide died screen
  diedScreen.classList.remove("visible");
  diedScreen.style.display = "none";

  // Remove existing enemies
  for (const enemy of enemies) {
    scene.remove(enemy.group);
    scene.remove(enemy.shadow);
  }
  enemies.length = 0;

  // Remove projectiles
  for (const p of projectiles) scene.remove(p.mesh);
  projectiles.length = 0;

  // Remove debris
  for (const d of debrisPieces) scene.remove(d.mesh);
  debrisPieces.length = 0;

  // Reset player
  player.visible = true;
  shadow.visible = true;
  player.position.set(0, 1, 0);
  player.rotation.set(0, 0, 0);
  walkTime = 0;
  shadow.position.set(0, 0.01, 0);

  // Spawn fresh enemies
  enemySpawns.forEach(([x, z]) => enemies.push(createEnemy(x, z)));

  // Show overlay again
  gameRunning = false;
  resetBtn.style.display = "none";
  overlay.style.display = "flex";

  // Player health
  playerHealth = 100;
  updateHealthBar();
  healthBarEl.style.display = "none";
}

document.getElementById("playBtn").addEventListener("click", startGame);
resetBtn.addEventListener("click", resetGame);
document.getElementById("diedResetBtn").addEventListener("click", resetGame);

// Projectile storage
const projectiles = [];

// Debris storage
const debrisPieces = [];

// Grenade storage
const grenades = [];

function flashExplosion() {
  explosionFlashEl.classList.add("flash");
  setTimeout(() => explosionFlashEl.classList.remove("flash"), 120);
}

function explodeGrenade(grenade) {
  const pos = grenade.mesh.position.clone();

  // Damage based on distance
  const dist = pos.distanceTo(player.position);
  const blastRadius = 5;
  if (dist < blastRadius) {
    const damage = Math.round(35 * (1 - dist / blastRadius));
    damagePlayer(damage);
    flashExplosion();
  }

  // Big debris burst
  spawnDebris(pos, [0xff8800, 0xffcc00, 0xff4400, 0xffffff, 0x888888]);

  // Remove grenade mesh + warning ring
  scene.remove(grenade.mesh);
  scene.remove(grenade.ring);
}

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
  if (!gameRunning) return;

  raycaster.setFromCamera(mouse, camera);

  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  const target = new THREE.Vector3();

  if (raycaster.ray.intersectPlane(groundPlane, target)) {
    shoot(target);
  }
});

function updateHealthBar() {
  healthBarInner.style.width = playerHealth + "%";
  // Green → yellow → red based on health
  const r = Math.round(255 * (1 - playerHealth / 100));
  const g = Math.round(255 * (playerHealth / 100));
  healthBarInner.style.background = `rgb(${r}, ${g}, 68)`;
}

function updatePlayer(dt) {
  const speed = 10;
  const dir = new THREE.Vector3();

  // Isometric screen axes — tune the angle to match your camera yaw (typically 45°)
  const isoAngle = Math.PI / 4; // 45 degrees
  const forward = new THREE.Vector3(
    -Math.sin(isoAngle),
    0,
    -Math.cos(isoAngle),
  );
  const right = new THREE.Vector3(Math.cos(isoAngle), 0, -Math.sin(isoAngle));

  if (keys["w"]) dir.add(forward);
  if (keys["s"]) dir.sub(forward);
  if (keys["d"]) dir.add(right);
  if (keys["a"]) dir.sub(right);

  if (dir.lengthSq() > 0) {
    dir.normalize();
    player.position.addScaledVector(dir, speed * dt);
    walkTime += dt * 10;
    player.position.y = 1 + Math.abs(Math.sin(walkTime)) * 0.15;
  }

  shadow.position.set(player.position.x, 0.01, player.position.z);

  const snapInterval = 10;
  ground.position.x =
    Math.round(player.position.x / snapInterval) * snapInterval;
  ground.position.z =
    Math.round(player.position.z / snapInterval) * snapInterval;
}

function updateEnemies(dt) {
  const speed = 2.5;

  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    const dir = new THREE.Vector3()
      .subVectors(player.position, enemy.group.position)
      .setY(0);

    const dist = dir.length();

    if (dist < 0.8) {
      damagePlayer(25);
      spawnDebris(enemy.group.position);
      scene.remove(enemy.group);
      scene.remove(enemy.shadow);
      enemies.splice(i, 1);
      spawnEnemy();
      continue; // ← not return, so other enemies keep updating
    }

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

    // Grenade throw: only from medium range (5–20 units), on cooldown
    enemy.grenadeCooldown -= dt;
    if (enemy.grenadeCooldown <= 0 && dist > 5 && dist < 20) {
      throwGrenade(enemy.group.position.clone(), player.position.clone());
      enemy.grenadeCooldown = 6 + Math.random() * 4; // 6–10s cooldown
    }

    enemy.shadow.position.set(
      enemy.group.position.x,
      0.01,
      enemy.group.position.z,
    );
  }
}

function shoot(target) {
  const bullet = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 8, 8),
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

function spawnDebris(position, colors) {
  colors = colors || [0xff3333, 0xff5555, 0xffff00, 0xff8800];
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

        spawnEnemy();

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

function throwGrenade(fromPosition, toPosition) {
  // Grenade mesh — small dark olive sphere
  const grenadeMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 8, 8),
    new THREE.MeshLambertMaterial({ color: 0x556b2f }),
  );
  grenadeMesh.position.copy(fromPosition);
  grenadeMesh.position.y = 1.5;
  scene.add(grenadeMesh);

  // Warning ring on the ground at the target
  const ringGeo = new THREE.RingGeometry(0.1, 5, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xff4400,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(toPosition.x, 0.02, toPosition.z);
  scene.add(ring);

  // Arc physics: compute velocity to land on target
  const fuseTime = 2.0; // seconds until boom
  const gravity = 18;
  const dx = toPosition.x - fromPosition.x;
  const dz = toPosition.z - fromPosition.z;
  const vy = (gravity * fuseTime) / 2; // peak arc height
  const vx = dx / fuseTime;
  const vz = dz / fuseTime;

  grenades.push({
    mesh: grenadeMesh,
    ring,
    vx,
    vy,
    vz,
    gravity,
    age: 0,
    fuseTime,
    bounced: false,
  });
}

function updateGrenades(dt) {
  for (let i = grenades.length - 1; i >= 0; i--) {
    const g = grenades[i];
    g.age += dt;

    // Physics
    g.vy -= g.gravity * dt;
    g.mesh.position.x += g.vx * dt;
    g.mesh.position.y += g.vy * dt;
    g.mesh.position.z += g.vz * dt;

    // Tumble
    g.mesh.rotation.x += dt * 5;
    g.mesh.rotation.z += dt * 3;

    // Bounce once off the floor
    if (!g.bounced && g.mesh.position.y < 0.2) {
      g.mesh.position.y = 0.2;
      g.vy = Math.abs(g.vy) * 0.3;
      g.vx *= 0.5;
      g.vz *= 0.5;
      g.bounced = true;
    }

    // Pulse the warning ring as fuse runs out
    const fuseRatio = g.age / g.fuseTime;
    const pulse =
      0.2 + 0.3 * Math.abs(Math.sin(fuseRatio * Math.PI * (4 + fuseRatio * 6)));
    g.ring.material.opacity = pulse;
    // Shrink ring toward impact point to hint at explosion
    const scale = 0.4 + 0.6 * (1 - fuseRatio);
    g.ring.scale.set(scale, scale, scale);

    // BOOM
    if (g.age >= g.fuseTime) {
      explodeGrenade(g);
      grenades.splice(i, 1);
    }
  }
}

function animate(now) {
  requestAnimationFrame(animate);

  const dt = (now - last) / 1000;
  last = now;

  if (gameRunning) {
    updatePlayer(dt);
    updateProjectiles(dt);
    updateEnemies(dt);
    updateGrenades(dt);
  }

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
