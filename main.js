import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js";

const canvasHost = document.querySelector("#game-canvas");
const hud = document.querySelector("#hud");
const welcomeScreen = document.querySelector("#welcome-screen");
const completeScreen = document.querySelector("#complete-screen");
const startButton = document.querySelector("#start-button");
const restartButton = document.querySelector("#restart-button");
const flowerCount = document.querySelector("#flower-count");
const flowerTotal = document.querySelector("#flower-total");
const progressFill = document.querySelector("#progress-fill");
const nearbyMessage = document.querySelector("#nearby-message");
const toast = document.querySelector("#toast");
const touchControls = document.querySelector("#touch-controls");
const joystick = document.querySelector("#joystick");
const joystickKnob = document.querySelector("#joystick-knob");
const collectButton = document.querySelector("#collect-button");
const desktopHint = document.querySelector("#desktop-hint");

const clock = new THREE.Clock();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb9dcae);
scene.fog = new THREE.Fog(0xb9dcae, 26, 68);

const camera = new THREE.PerspectiveCamera(47, window.innerWidth / window.innerHeight, 0.1, 150);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
canvasHost.appendChild(renderer.domElement);

const materials = {
  ground: new THREE.MeshStandardMaterial({ color: 0x79a86a, roughness: 1 }),
  path: new THREE.MeshStandardMaterial({ color: 0xd8c18c, roughness: 1 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x4f874f, roughness: .9 }),
  leafLight: new THREE.MeshStandardMaterial({ color: 0x78aa59, roughness: .9 }),
  stem: new THREE.MeshStandardMaterial({ color: 0x477b46, roughness: .9 }),
  yellow: new THREE.MeshStandardMaterial({ color: 0xffca42, roughness: .75 }),
  yellowLight: new THREE.MeshStandardMaterial({ color: 0xffdf68, roughness: .75 }),
  flowerCenter: new THREE.MeshStandardMaterial({ color: 0x9a5f25, roughness: .8 }),
  skin: new THREE.MeshStandardMaterial({ color: 0xd89872, roughness: .8 }),
  skinLight: new THREE.MeshStandardMaterial({ color: 0xe8aa82, roughness: .8 }),
  hair: new THREE.MeshStandardMaterial({ color: 0x3f261d, roughness: 1 }),
  hairLight: new THREE.MeshStandardMaterial({ color: 0x5a3423, roughness: 1 }),
  dress: new THREE.MeshStandardMaterial({ color: 0xf5d878, roughness: .85 }),
  blouse: new THREE.MeshStandardMaterial({ color: 0xfff4dc, roughness: .9 }),
  shoe: new THREE.MeshStandardMaterial({ color: 0x6c4839, roughness: .9 }),
  basket: new THREE.MeshStandardMaterial({ color: 0xb9793b, roughness: 1 }),
};

const state = {
  playing: false,
  flowersCollected: 0,
  nearestFlower: null,
  bouquet: null,
  celebration: 0,
};

const keys = new Set();
const joystickState = { active: false, id: null, x: 0, y: 0 };
const flowers = [];
const particles = [];
const world = new THREE.Group();
const pointerMoveState = { active: false, id: null, x: 0, y: 0, startX: 0, startY: 0 };
scene.add(world);

const player = createPlayer();
player.position.set(0, 0, 14);
player.rotation.y = Math.PI;
world.add(player);

createLighting();
createWorld();
createCollectibles();
createDecorations();
updateCounter();

camera.position.set(0, 4.2, 20);
camera.lookAt(0, 1.1, 14);

startButton.addEventListener("click", () => {
  state.playing = true;
  welcomeScreen.classList.add("is-hidden");
  hud.classList.remove("is-hidden");
  touchControls.classList.remove("is-hidden");
  desktopHint.classList.remove("is-hidden");
  showToast("Busca las flores amarillas del jardín 💛");
});

restartButton.addEventListener("click", resetGame);
collectButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  collectNearestFlower();
});

window.addEventListener("keydown", (event) => {
  keys.add(event.key.toLowerCase());
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(event.key.toLowerCase())) event.preventDefault();
  if (event.key.toLowerCase() === "e" || event.key === " ") collectNearestFlower();
});
window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
window.addEventListener("blur", () => keys.clear());

renderer.domElement.addEventListener("pointerdown", (event) => {
  if (!state.playing || event.button === 2) return;
  pointerMoveState.active = true;
  pointerMoveState.id = event.pointerId;
  pointerMoveState.startX = event.clientX;
  pointerMoveState.startY = event.clientY;
  pointerMoveState.x = 0;
  pointerMoveState.y = 0;
  renderer.domElement.setPointerCapture(event.pointerId);
});
renderer.domElement.addEventListener("pointermove", (event) => {
  if (!pointerMoveState.active || pointerMoveState.id !== event.pointerId) return;
  const reach = event.pointerType === "mouse" ? 90 : 75;
  pointerMoveState.x = THREE.MathUtils.clamp((event.clientX - pointerMoveState.startX) / reach, -1, 1);
  pointerMoveState.y = THREE.MathUtils.clamp((event.clientY - pointerMoveState.startY) / reach, -1, 1);
});
const releasePointerMove = (event) => {
  if (pointerMoveState.id !== null && event.pointerId !== pointerMoveState.id) return;
  pointerMoveState.active = false;
  pointerMoveState.id = null;
  pointerMoveState.x = 0;
  pointerMoveState.y = 0;
};
renderer.domElement.addEventListener("pointerup", releasePointerMove);
renderer.domElement.addEventListener("pointercancel", releasePointerMove);
renderer.domElement.addEventListener("contextmenu", (event) => event.preventDefault());

joystick.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  joystickState.active = true;
  joystickState.id = event.pointerId;
  joystick.setPointerCapture(event.pointerId);
  updateJoystick(event);
});
joystick.addEventListener("pointermove", (event) => {
  if (joystickState.active && event.pointerId === joystickState.id) updateJoystick(event);
});
const releaseJoystick = () => {
  joystickState.active = false;
  joystickState.id = null;
  joystickState.x = 0;
  joystickState.y = 0;
  joystickKnob.style.transform = "translate(-50%, -50%)";
};
joystick.addEventListener("pointerup", releaseJoystick);
joystick.addEventListener("pointercancel", releaseJoystick);

window.addEventListener("resize", onResize);
requestAnimationFrame(animate);

function createLighting() {
  scene.add(new THREE.HemisphereLight(0xfff4d6, 0x4c744d, 2.2));
  const sun = new THREE.DirectionalLight(0xfff4cf, 3.3);
  sun.position.set(-12, 22, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 70;
  sun.shadow.camera.left = -30;
  sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -30;
  scene.add(sun);

  const warmFill = new THREE.PointLight(0xffd078, 1.3, 26, 2);
  warmFill.position.set(5, 6, 4);
  scene.add(warmFill);
}

function createWorld() {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), materials.ground);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  world.add(ground);

  const path = new THREE.Mesh(new THREE.PlaneGeometry(7, 65), materials.path);
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, .012, -8);
  path.receiveShadow = true;
  world.add(path);

  const pond = new THREE.Mesh(
    new THREE.CylinderGeometry(5.5, 6.1, .12, 32),
    new THREE.MeshStandardMaterial({ color: 0x76c4c2, roughness: .25, metalness: .05, transparent: true, opacity: .9 }),
  );
  pond.position.set(-12, .08, -12);
  pond.scale.z = .62;
  pond.receiveShadow = true;
  world.add(pond);

  for (let i = 0; i < 5; i += 1) {
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(.42 + Math.random() * .2, 0), new THREE.MeshStandardMaterial({ color: 0x9bb392, roughness: 1 }));
    stone.position.set(-15 + i * 1.35, .25, -12 + Math.sin(i * 2) * 2.3);
    stone.scale.set(1.4, .65, .9);
    stone.rotation.y = i;
    stone.castShadow = true;
    world.add(stone);
  }

  const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(3.5, 20, 20), new THREE.MeshBasicMaterial({ color: 0xffdd86, transparent: true, opacity: .8 }));
  sunDisc.position.set(-27, 23, -48);
  scene.add(sunDisc);
}

function createDecorations() {
  const treeSpots = [
    [-18, -5, 1.1], [15, -13, 1.25], [19, 4, .9], [-19, 11, 1.3], [16, 17, 1], [-14, 20, .8],
  ];
  treeSpots.forEach(([x, z, scale], index) => createTree(x, z, scale, index));

  const bushSpots = [
    [-8, 2], [10, -3], [-14, 4], [9, 11], [-6, -20], [13, -22], [5, 22], [-20, -20],
  ];
  bushSpots.forEach(([x, z], index) => createBush(x, z, index));

  for (let i = 0; i < 28; i += 1) {
    const x = -24 + Math.random() * 48;
    const z = -27 + Math.random() * 53;
    if (Math.abs(x) < 4 && z > -27 && z < 20) continue;
    createGrassTuft(x, z, .7 + Math.random() * .5);
  }
}

function createTree(x, z, scale, index) {
  const tree = new THREE.Group();
  tree.position.set(x, 0, z);
  tree.scale.setScalar(scale);

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.32, .48, 2.7, 7), new THREE.MeshStandardMaterial({ color: 0x72513a, roughness: 1 }));
  trunk.position.y = 1.35;
  trunk.castShadow = true;
  tree.add(trunk);

  const crownMat = index % 2 ? materials.leaf : materials.leafLight;
  [[0, 3.3, 0, 1.55], [-.9, 3, .1, 1.1], [.9, 3.05, -.1, 1.12], [0, 4.2, 0, 1.05]].forEach(([px, py, pz, size]) => {
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 1), crownMat);
    crown.position.set(px, py, pz);
    crown.rotation.set(.2 * index, .6 * index, .1);
    crown.castShadow = true;
    tree.add(crown);
  });
  world.add(tree);
}

function createBush(x, z, index) {
  const bush = new THREE.Group();
  bush.position.set(x, 0, z);
  [[0, .5, 0, .75], [-.65, .42, .18, .56], [.6, .38, .15, .58]].forEach(([px, py, pz, size], i) => {
    const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 1), i === index % 2 ? materials.leafLight : materials.leaf);
    blob.position.set(px, py, pz);
    blob.scale.y = .82;
    blob.castShadow = true;
    bush.add(blob);
  });
  world.add(bush);
}

function createGrassTuft(x, z, scale) {
  const grass = new THREE.Group();
  grass.position.set(x, .03, z);
  for (let i = 0; i < 3; i += 1) {
    const blade = new THREE.Mesh(new THREE.ConeGeometry(.09, .8, 4), materials.leafLight);
    blade.position.set((i - 1) * .13, .4, (i % 2) * .1);
    blade.rotation.z = (i - 1) * .3;
    blade.scale.setScalar(scale);
    grass.add(blade);
  }
  world.add(grass);
}

function createCollectibles() {
  const positions = [
    [-5, 8], [5, 7], [-7, -1], [7, -5], [-5, -13], [6, -17],
  ];
  flowerTotal.textContent = String(positions.length);
  positions.forEach(([x, z], index) => {
    const flower = createFlower(index);
    flower.position.set(x, 0, z);
    flower.userData.baseY = 0;
    flower.userData.phase = index * .72;
    flower.userData.collected = false;
    world.add(flower);
    flowers.push(flower);
  });
}

function createFlower(index = 0) {
  const flower = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.035, .05, 1.25, 6), materials.stem);
  stem.position.y = .62;
  stem.castShadow = true;
  flower.add(stem);

  const leaf = new THREE.Mesh(new THREE.SphereGeometry(.18, 8, 5), materials.leafLight);
  leaf.position.set(.17, .5, 0);
  leaf.scale.set(1.35, .35, .55);
  leaf.rotation.z = -.35;
  flower.add(leaf);

  const head = new THREE.Group();
  head.position.y = 1.3;
  for (let i = 0; i < 6; i += 1) {
    const petal = new THREE.Mesh(new THREE.SphereGeometry(.24, 8, 6), i % 2 ? materials.yellow : materials.yellowLight);
    const angle = (i / 6) * Math.PI * 2;
    petal.position.set(Math.cos(angle) * .22, 0, Math.sin(angle) * .22);
    petal.scale.set(1.05, .36, .68);
    petal.rotation.y = -angle;
    petal.castShadow = true;
    head.add(petal);
  }
  const center = new THREE.Mesh(new THREE.SphereGeometry(.19, 8, 6), materials.flowerCenter);
  center.castShadow = true;
  head.add(center);
  flower.add(head);

  const glow = new THREE.PointLight(0xffd34d, .5, 2.5, 2);
  glow.position.y = 1.35;
  flower.add(glow);
  flower.userData.head = head;
  flower.userData.index = index;
  return flower;
}

function createPlayer() {
  const character = new THREE.Group();
  character.userData.walkTime = 0;
  character.userData.velocity = new THREE.Vector3();

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(.5, 24), new THREE.MeshBasicMaterial({ color: 0x365737, transparent: true, opacity: .23, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = .025;
  character.add(shadow);

  const body = new THREE.Group();
  body.position.y = .55;
  character.add(body);

  const skirt = new THREE.Mesh(new THREE.ConeGeometry(.48, .62, 12), materials.dress);
  skirt.position.y = .28;
  skirt.scale.set(1.08, 1, .9);
  skirt.castShadow = true;
  body.add(skirt);

  const blouse = new THREE.Mesh(new THREE.CapsuleGeometry(.28, .3, 6, 12), materials.blouse);
  blouse.position.y = .76;
  blouse.scale.set(1.03, 1, .84);
  blouse.castShadow = true;
  body.add(blouse);

  const belt = new THREE.Mesh(new THREE.TorusGeometry(.33, .035, 6, 16), materials.dress);
  belt.rotation.x = Math.PI / 2;
  belt.position.y = .53;
  belt.scale.z = .86;
  body.add(belt);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.11, .13, .13, 10), materials.skinLight);
  neck.position.y = 1.02;
  body.add(neck);

  const headGroup = new THREE.Group();
  headGroup.position.y = 1.18;
  body.add(headGroup);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.4, 18, 14), materials.skin);
  head.scale.set(.98, 1.02, .92);
  head.castShadow = true;
  headGroup.add(head);

  const face = new THREE.Mesh(new THREE.SphereGeometry(.33, 16, 12), materials.skinLight);
  face.position.set(0, -.04, -.16);
  face.scale.set(.92, 1, .56);
  headGroup.add(face);

  // Soft cap plus many short, layered curls: fuller hair without the noodle silhouette.
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(.43, 18, 14, 0, Math.PI * 2, 0, Math.PI * .67), materials.hair);
  hairCap.position.set(0, .09, .015);
  hairCap.castShadow = true;
  headGroup.add(hairCap);
  [
    [-.38, .24, .15, .47, .1, .9], [-.26, .28, .23, .55, 1.3, 1], [-.1, .3, .29, .6, 2.4, .92],
    [.1, .3, .29, .6, 3.4, .95], [.26, .28, .23, .55, 4.1, 1], [.38, .24, .15, .47, 5.1, .9],
    [-.46, .1, .06, .4, 2.2, .78], [.46, .1, .06, .4, 1.1, .78],
    [-.18, .15, .34, .45, 3.4, .82], [.18, .15, .34, .45, 5.2, .82],
  ].forEach(([x, y, z, length, phase, size], index) => {
    const lock = createCurlyLock(x, y, z, length, phase, index % 3 ? materials.hair : materials.hairLight, size);
    headGroup.add(lock);
  });

  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x3f2926 });
  [-.115, .115].forEach((x) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(.045, 10, 8), eyeMat);
    eye.position.set(x, -.045, -.345);
    headGroup.add(eye);
  });
  const blushMat = new THREE.MeshBasicMaterial({ color: 0xf0a28f, transparent: true, opacity: .72 });
  [-.22, .22].forEach((x) => {
    const blush = new THREE.Mesh(new THREE.SphereGeometry(.055, 8, 6), blushMat);
    blush.position.set(x, -.13, -.315);
    blush.scale.set(1.3, .55, .3);
    headGroup.add(blush);
  });
  const smile = new THREE.Mesh(new THREE.TorusGeometry(.065, .012, 5, 12, Math.PI), new THREE.MeshBasicMaterial({ color: 0x9b4e4a }));
  smile.position.set(0, -.17, -.34);
  smile.rotation.x = Math.PI;
  headGroup.add(smile);

  const bow = new THREE.Group();
  bow.position.set(0, 1.02, -.31);
  const bowMat = new THREE.MeshStandardMaterial({ color: 0xf0b835, roughness: .8 });
  [-1, 1].forEach((side) => {
    const loop = new THREE.Mesh(new THREE.SphereGeometry(.13, 10, 7), bowMat);
    loop.position.x = side * .1;
    loop.scale.set(.95, .55, .3);
    bow.add(loop);
  });
  const knot = new THREE.Mesh(new THREE.SphereGeometry(.065, 8, 6), bowMat);
  bow.add(knot);
  body.add(bow);

  const armL = createArm(-1);
  const armR = createArm(1);
  armL.position.set(-.36, .84, -.01);
  armR.position.set(.36, .84, -.01);
  body.add(armL, armR);
  character.userData.armL = armL;
  character.userData.armR = armR;

  const legL = createLeg(-1);
  const legR = createLeg(1);
  legL.position.set(-.16, .38, 0);
  legR.position.set(.16, .38, 0);
  character.add(legL, legR);
  character.userData.legL = legL;
  character.userData.legR = legR;

  const basket = createBasket();
  basket.position.set(-.58, .66, -.1);
  basket.rotation.z = -.16;
  character.add(basket);
  character.userData.basket = basket;

  character.userData.bouquetAnchor = new THREE.Group();
  character.userData.bouquetAnchor.position.set(-.58, .87, -.24);
  character.add(character.userData.bouquetAnchor);
  return character;
}

function createCurlyLock(x, y, z, length, phase, material, size = 1) {
  const points = [];
  const segments = 12;
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const curl = Math.sin(t * Math.PI * 2.7 + phase) * .065 * size;
    const depth = Math.cos(t * Math.PI * 2.7 + phase) * .04 * size;
    points.push(new THREE.Vector3(x + curl, y - t * length, z + depth));
  }
  const curve = new THREE.CatmullRomCurve3(points);
  const lock = new THREE.Group();
  const strand = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, .034 * size, 5, false), material);
  strand.castShadow = true;
  lock.add(strand);

  // Small overlapping curl clumps break the continuous tube into soft hair sections.
  [0.16, 0.42, 0.68, 0.9].forEach((t, index) => {
    const clump = new THREE.Mesh(new THREE.SphereGeometry(.062 * size, 9, 7), material);
    clump.position.copy(curve.getPointAt(t));
    clump.scale.set(1.08, .82 + (index % 2) * .12, .9);
    clump.castShadow = true;
    lock.add(clump);
  });

  const curlTip = new THREE.Mesh(new THREE.TorusGeometry(.06 * size, .018 * size, 5, 9, Math.PI * 1.45), material);
  curlTip.position.copy(curve.getPointAt(1));
  curlTip.rotation.set(Math.PI / 2, phase, .2);
  curlTip.castShadow = true;
  lock.add(curlTip);
  return lock;
}

function createArm(side) {
  const arm = new THREE.Group();
  const sleeve = new THREE.Mesh(new THREE.SphereGeometry(.15, 10, 8), materials.blouse);
  sleeve.scale.set(.85, 1, .8);
  sleeve.position.y = -.08;
  sleeve.castShadow = true;
  arm.add(sleeve);
  const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(.075, .2, 4, 8), materials.skin);
  forearm.position.y = -.27;
  forearm.rotation.z = side * -.08;
  forearm.castShadow = true;
  arm.add(forearm);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(.095, 9, 7), materials.skinLight);
  hand.position.y = -.44;
  hand.castShadow = true;
  arm.add(hand);
  return arm;
}

function createLeg(side) {
  const leg = new THREE.Group();
  const lower = new THREE.Mesh(new THREE.CapsuleGeometry(.1, .25, 4, 8), materials.skin);
  lower.position.y = -.1;
  lower.castShadow = true;
  leg.add(lower);
  const shoe = new THREE.Mesh(new THREE.SphereGeometry(.16, 10, 8), materials.shoe);
  shoe.position.set(0, -.31, -.09);
  shoe.scale.set(1, .58, 1.42);
  shoe.castShadow = true;
  leg.add(shoe);
  return leg;
}

function createBasket() {
  const basket = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.22, .29, .22, 10), materials.basket);
  base.scale.z = .82;
  base.rotation.x = Math.PI / 2;
  base.position.z = .06;
  base.castShadow = true;
  basket.add(base);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(.22, .028, 6, 16, Math.PI), materials.basket);
  handle.rotation.z = Math.PI / 2;
  handle.position.y = .1;
  basket.add(handle);
  return basket;
}

function createBouquetFlower(index) {
  const flower = createFlower(index);
  flower.scale.setScalar(.42);
  flower.position.set((index % 3 - 1) * .12, .1 + Math.floor(index / 3) * .08, (index % 2) * .08);
  flower.rotation.z = (index - 2) * .13;
  return flower;
}

function addBouquetFlower() {
  if (!state.bouquet) {
    state.bouquet = new THREE.Group();
    state.bouquet.position.set(0, .08, -.06);
    player.userData.bouquetAnchor.add(state.bouquet);
  }
  const flower = createBouquetFlower(state.flowersCollected - 1);
  state.bouquet.add(flower);
  createSparkles(player.position.clone().add(new THREE.Vector3(-.6, 1.5, -.2)));
}

function collectNearestFlower() {
  if (!state.playing || !state.nearestFlower) return;
  const flower = state.nearestFlower;
  flower.userData.collected = true;
  flower.userData.collectTime = 0;
  state.flowersCollected += 1;
  state.nearestFlower = null;
  addBouquetFlower();
  updateCounter();
  showToast(state.flowersCollected === flowers.length ? "Tu ramo está listo 💐" : "¡Una flor más para tu ramo! ✿");
  if (state.flowersCollected === flowers.length) {
    state.celebration = 0;
    setTimeout(() => finishGame(), 850);
  }
}

function finishGame() {
  if (!state.playing) return;
  state.playing = false;
  completeScreen.classList.remove("is-hidden");
  touchControls.classList.add("is-hidden");
  desktopHint.classList.add("is-hidden");
  createConfetti();
}

function resetGame() {
  flowers.forEach((flower) => {
    flower.userData.collected = false;
    flower.userData.collectTime = 0;
    flower.visible = true;
    flower.scale.setScalar(1);
  });
  if (state.bouquet) {
    player.userData.bouquetAnchor.remove(state.bouquet);
    state.bouquet = null;
  }
  state.flowersCollected = 0;
  state.nearestFlower = null;
  state.celebration = 0;
  player.position.set(0, 0, 14);
  player.rotation.y = Math.PI;
  updateCounter();
  completeScreen.classList.add("is-hidden");
  welcomeScreen.classList.remove("is-hidden");
  hud.classList.add("is-hidden");
  touchControls.classList.add("is-hidden");
  desktopHint.classList.add("is-hidden");
}

function updateCounter() {
  flowerCount.textContent = String(state.flowersCollected);
  progressFill.style.width = `${(state.flowersCollected / flowers.length) * 100}%`;
}

function updateJoystick(event) {
  const rect = joystick.getBoundingClientRect();
  const max = rect.width * .31;
  let x = event.clientX - (rect.left + rect.width / 2);
  let y = event.clientY - (rect.top + rect.height / 2);
  const distance = Math.hypot(x, y);
  if (distance > max) {
    x = (x / distance) * max;
    y = (y / distance) * max;
  }
  joystickState.x = x / max;
  joystickState.y = y / max;
  joystickKnob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
}

function getMovementInput() {
  let x = 0;
  let z = 0;
  if (keys.has("a") || keys.has("arrowleft")) x -= 1;
  if (keys.has("d") || keys.has("arrowright")) x += 1;
  if (keys.has("w") || keys.has("arrowup")) z -= 1;
  if (keys.has("s") || keys.has("arrowdown")) z += 1;
  x += joystickState.x;
  z += joystickState.y;
  x += pointerMoveState.x;
  z += pointerMoveState.y;
  const length = Math.hypot(x, z);
  return length > 1 ? { x: x / length, z: z / length, amount: 1 } : { x, z, amount: length };
}

function updatePlayer(delta) {
  const input = getMovementInput();
  const moving = input.amount > .08;
  const speed = 5.1;
  if (moving) {
    const desiredAngle = Math.atan2(input.x, input.z) + Math.PI;
    player.rotation.y = dampAngle(player.rotation.y, desiredAngle, 12, delta);
    const direction = new THREE.Vector3(input.x, 0, input.z);
    player.position.addScaledVector(direction, speed * input.amount * delta);
    player.position.x = THREE.MathUtils.clamp(player.position.x, -22, 22);
    player.position.z = THREE.MathUtils.clamp(player.position.z, -26, 20);
    player.userData.walkTime += delta * (8 + 4 * input.amount);
  } else {
    player.userData.walkTime += delta * 2;
  }

  const walk = moving ? Math.sin(player.userData.walkTime) : Math.sin(player.userData.walkTime) * .15;
  player.userData.legL.rotation.x = walk * .55;
  player.userData.legR.rotation.x = -walk * .55;
  player.userData.armL.rotation.x = -walk * .25;
  player.userData.armR.rotation.x = walk * .25;
  player.position.y = moving ? Math.abs(Math.sin(player.userData.walkTime * 1.02)) * .035 : 0;

  const cameraDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(player.quaternion);
  const cameraDistance = window.innerWidth < 700 ? 10 : 8;
  const cameraHeight = window.innerWidth < 700 ? 4.15 : 3.7;
  const desiredCameraPosition = player.position.clone().addScaledVector(cameraDirection, cameraDistance).add(new THREE.Vector3(0, cameraHeight, 0));
  camera.position.lerp(desiredCameraPosition, 1 - Math.pow(.001, delta));
  const lookTarget = player.position.clone().add(new THREE.Vector3(0, 1.2, 0));
  camera.lookAt(lookTarget);
}

function updateFlowers(delta, elapsed) {
  let nearest = null;
  let nearestDistance = Infinity;
  flowers.forEach((flower) => {
    if (flower.userData.collected) {
      flower.userData.collectTime += delta;
      const progress = Math.min(flower.userData.collectTime / .45, 1);
      flower.scale.setScalar(1 - progress);
      flower.position.y = Math.sin(progress * Math.PI) * .8;
      if (progress >= 1) flower.visible = false;
      return;
    }
    flower.visible = true;
    flower.position.y = Math.sin(elapsed * 2.1 + flower.userData.phase) * .045;
    flower.userData.head.rotation.y = elapsed * .4 + flower.userData.phase;
    const distance = player.position.distanceTo(flower.position);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = flower;
    }
  });

  state.nearestFlower = nearestDistance < 2.7 ? nearest : null;
  collectButton.classList.toggle("is-ready", Boolean(state.nearestFlower));
  if (state.nearestFlower) {
    nearbyMessage.textContent = "Hay una flor cerca · pulsa recoger";
    nearbyMessage.classList.add("visible");
  } else {
    nearbyMessage.classList.remove("visible");
  }
}

function createSparkles(position) {
  for (let i = 0; i < 10; i += 1) {
    const sparkle = new THREE.Mesh(new THREE.SphereGeometry(.045, 6, 6), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xfff0a1 : 0xffffff, transparent: true }));
    sparkle.position.copy(position);
    sparkle.userData.velocity = new THREE.Vector3((Math.random() - .5) * 2, .8 + Math.random() * 1.3, (Math.random() - .5) * 2);
    sparkle.userData.life = .65 + Math.random() * .3;
    world.add(sparkle);
    particles.push(sparkle);
  }
}

function createConfetti() {
  for (let i = 0; i < 50; i += 1) {
    const color = [0xffd34f, 0xfff2a4, 0x91bb72, 0xf39a76][i % 4];
    const confetti = new THREE.Mesh(new THREE.PlaneGeometry(.13, .25), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true }));
    confetti.position.copy(player.position).add(new THREE.Vector3((Math.random() - .5) * 8, 1 + Math.random() * 5, (Math.random() - .5) * 8));
    confetti.userData.velocity = new THREE.Vector3((Math.random() - .5) * 1.5, 1 + Math.random() * 2, (Math.random() - .5) * 1.5);
    confetti.userData.life = 3 + Math.random() * 2;
    confetti.userData.spin = (Math.random() - .5) * 8;
    world.add(confetti);
    particles.push(confetti);
  }
}

function updateParticles(delta) {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const particle = particles[i];
    particle.userData.life -= delta;
    particle.userData.velocity.y -= delta * 2.2;
    particle.position.addScaledVector(particle.userData.velocity, delta);
    particle.rotation.x += particle.userData.spin ? particle.userData.spin * delta : delta * 4;
    particle.rotation.z += delta * 2;
    particle.material.opacity = Math.max(0, Math.min(1, particle.userData.life * 2));
    if (particle.userData.life <= 0) {
      world.remove(particle);
      particle.geometry.dispose();
      particle.material.dispose();
      particles.splice(i, 1);
    }
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.remove("visible"), 2500);
}

function dampAngle(current, target, smoothing, delta) {
  let difference = target - current;
  difference = Math.atan2(Math.sin(difference), Math.cos(difference));
  return current + difference * (1 - Math.exp(-smoothing * delta));
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), .05);
  const elapsed = clock.elapsedTime;
  if (state.playing) updatePlayer(delta);
  updateFlowers(delta, elapsed);
  updateParticles(delta);
  renderer.render(scene, camera);
}
