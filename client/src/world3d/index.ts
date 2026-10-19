// Mundo 3D (Three.js): outro desenho para o mesmo escritório. Usa o mesmo store e cumpre o mesmo contrato
// (world/api.ts) que o mundo em pixel art, então a UI (barra lateral, terminal, Gestão) não muda.
// Escolha do visual: localStorage "habblaud.visual" = "3d" (ver app.ts e o botão da barra superior).
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { AgentInfo, OfficeSnapshot, RoomInfo } from '../../../shared/types';
import type { OfficeStore } from '../net/store';
import { DEFAULT_WORLD_OPTIONS, type Selection, type ViewInsets, type WorldApi, type WorldOptions } from '../world/api';

const ROOM_W = 10;
const ROOM_D = 8;
const WALL_H = 1.6;
const CORRIDOR = 4;
const GAP = 1;
const HEAD_Y = 2.1;
const SPEED = 2.4;
const VISIBLE = new Set(['working', 'waiting', 'shell', 'idle']);

const PALETTE = [0xff2d95, 0x00c2ff, 0xffd23f, 0x7c5cff, 0x3ddc84, 0xff7a3d, 0x25d0c0];
const SKIN = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Texto num sprite (nomes e placas). */
function textSprite(text: string, opts: { size?: number; color?: string; bg?: string; scale?: number } = {}): THREE.Sprite {
  const size = opts.size ?? 48;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d')!;
  ctx.font = `700 ${size}px system-ui, sans-serif`;
  const w = Math.ceil(ctx.measureText(text).width) + size;
  c.width = w;
  c.height = Math.ceil(size * 1.6);
  ctx.font = `700 ${size}px system-ui, sans-serif`;
  if (opts.bg) {
    ctx.fillStyle = opts.bg;
    const r = c.height / 2;
    ctx.beginPath();
    ctx.roundRect(0, 0, c.width, c.height, r);
    ctx.fill();
  }
  ctx.fillStyle = opts.color ?? '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width / 2, c.height / 2 + 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false }));
  const k = (opts.scale ?? 0.5) / size;
  sp.scale.set(c.width * k, c.height * k, 1);
  return sp;
}

function box(w: number, h: number, d: number, color: number, emissive = 0): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, emissive, roughness: 0.8 }),
  );
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

interface Character {
  id: string;
  group: THREE.Group;
  legs: [THREE.Mesh, THREE.Mesh];
  arms: [THREE.Mesh, THREE.Mesh];
  label: THREE.Sprite;
  alert: THREE.Sprite;
  ring: THREE.Mesh;
  target: THREE.Vector3;
  facing: number;
  status: string;
  walkT: number;
}

interface Room3D {
  id: string;
  group: THREE.Group;
  floor: THREE.Mesh;
  origin: THREE.Vector3;
  /** +1: abre para o corredor no sentido +z (lado norte); -1: lado sul. */
  dir: number;
  desks: { seat: THREE.Vector3; screen: THREE.MeshStandardMaterial }[];
  lounge: THREE.Vector3[];
}

export function createWorld3D(canvas: HTMLCanvasElement, store: OfficeStore): WorldApi {
  let options: WorldOptions = { ...DEFAULT_WORLD_OPTIONS };
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  canvas.style.imageRendering = 'auto';

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 500);
  camera.position.set(18, 22, 26);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.45;
  controls.minDistance = 6;
  controls.maxDistance = 120;

  const hemi = new THREE.HemisphereLight(0xffffff, 0x445566, 1.4);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(30, 50, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -80, right: 80, top: 80, bottom: -80, far: 200 });
  scene.add(sun, sun.target);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: 0x6fae5a, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  scene.add(ground);
  const corridor = new THREE.Mesh(new THREE.PlaneGeometry(1, CORRIDOR), new THREE.MeshStandardMaterial({ color: 0x3a3550, roughness: 0.9 }));
  corridor.rotation.x = -Math.PI / 2;
  corridor.position.y = 0.01;
  corridor.receiveShadow = true;
  scene.add(corridor);
  const trees = new THREE.Group();
  scene.add(trees);

  const rooms = new Map<string, Room3D>();
  const chars = new Map<string, Character>();
  let selection: Selection = null;
  let hover: string | null = null;
  let insets: ViewInsets = { top: 0, right: 0, bottom: 0, left: 0 };
  const selectCbs = new Set<(s: Selection) => void>();
  const hoverCbs = new Set<(id: string | null) => void>();
  let focus: { target: THREE.Vector3; dist: number; follow?: string } | null = null;
  let framed = false;

  // ------------------------------------------------------------------ salas

  function roomOrigin(slot: number): { origin: THREE.Vector3; dir: number } {
    const col = Math.floor(slot / 2);
    const north = slot % 2 === 0;
    const x = col * (ROOM_W + GAP);
    const z = north ? -(CORRIDOR / 2 + ROOM_D / 2) : CORRIDOR / 2 + ROOM_D / 2;
    return { origin: new THREE.Vector3(x, 0, z), dir: north ? 1 : -1 };
  }

  function buildRoom(r: RoomInfo): Room3D {
    const { origin, dir } = roomOrigin(r.slot);
    const color = PALETTE[hash(r.id) % PALETTE.length];
    const g = new THREE.Group();
    g.position.copy(origin);
    const floor = box(ROOM_W, 0.1, ROOM_D, new THREE.Color(color).lerp(new THREE.Color(0xf4efe6), 0.82).getHex());
    floor.position.y = 0.05;
    floor.userData = { room: r.id };
    g.add(floor);
    const wallColor = 0xf7f3ee;
    const back = box(ROOM_W, WALL_H, 0.2, wallColor);
    back.position.set(0, WALL_H / 2, -dir * ROOM_D / 2);
    const left = box(0.2, WALL_H, ROOM_D, wallColor);
    left.position.set(-ROOM_W / 2, WALL_H / 2, 0);
    const right = left.clone();
    right.position.x = ROOM_W / 2;
    // Frente com porta: dois pedaços de parede baixa.
    const frontA = box(ROOM_W / 2 - 1, 0.5, 0.15, wallColor);
    frontA.position.set(-ROOM_W / 4 - 0.5, 0.25, dir * ROOM_D / 2);
    const frontB = frontA.clone();
    frontB.position.x = ROOM_W / 4 + 0.5;
    const stripe = box(ROOM_W, 0.25, 0.22, color, color);
    (stripe.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.35;
    stripe.position.set(0, WALL_H - 0.12, -dir * ROOM_D / 2);
    g.add(back, left, right, frontA, frontB, stripe);

    // Mesas com monitor (3 x 2), viradas para a porta.
    const desks: Room3D['desks'] = [];
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < 3; i++) {
        const x = -3 + i * 3;
        const z = -dir * (2.3 - row * 2.2);
        const desk = box(1.8, 0.1, 0.9, 0x8b5e3c);
        desk.position.set(x, 0.8, z);
        const legsMesh = box(1.6, 0.75, 0.7, 0x5b3d27);
        legsMesh.position.set(x, 0.4, z);
        const screenMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x000000 });
        const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.06), screenMat);
        monitor.position.set(x, 1.18, z - dir * 0.3);
        monitor.castShadow = true;
        const chair = box(0.6, 0.5, 0.6, 0x2b2b3a);
        chair.position.set(x, 0.25, z + dir * 0.85);
        g.add(desk, legsMesh, monitor, chair);
        desks.push({ seat: new THREE.Vector3(x, 0, z + dir * 0.75).add(origin), screen: screenMat });
      }
    }
    // Sofá e planta na frente (ociosos ficam por ali).
    const sofa = box(3, 0.6, 0.9, color);
    sofa.position.set(-2.5, 0.3, dir * (ROOM_D / 2 - 1.1));
    const plantPot = box(0.5, 0.5, 0.5, 0x9a6b4f);
    plantPot.position.set(ROOM_W / 2 - 0.7, 0.25, dir * (ROOM_D / 2 - 0.8));
    const plant = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), new THREE.MeshStandardMaterial({ color: 0x2f9e44, flatShading: true }));
    plant.position.set(ROOM_W / 2 - 0.7, 0.95, dir * (ROOM_D / 2 - 0.8));
    plant.castShadow = true;
    g.add(sofa, plantPot, plant);
    const lounge = [-3.4, -2.5, -1.6, 0.4, 1.4].map((x) => new THREE.Vector3(x, 0, dir * (ROOM_D / 2 - 1.9)).add(origin));

    const sign = textSprite(r.name, { size: 56, color: '#fff', bg: 'rgba(20,17,31,0.85)', scale: 0.7 });
    sign.position.set(0, WALL_H + 0.7, -dir * ROOM_D / 2);
    g.add(sign);
    scene.add(g);
    return { id: r.id, group: g, floor, origin, dir, desks, lounge };
  }

  function disposeGroup(g: THREE.Object3D): void {
    g.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      for (const x of Array.isArray(mat) ? mat : mat ? [mat] : []) {
        (x as THREE.SpriteMaterial).map?.dispose();
        x.dispose();
      }
    });
    g.removeFromParent();
  }

  function layoutExtras(): void {
    const cols = Math.max(1, ...[...rooms.values()].map((r) => Math.round(r.origin.x / (ROOM_W + GAP)) + 1));
    const len = cols * (ROOM_W + GAP) + 6;
    corridor.scale.x = len;
    corridor.position.x = (cols - 1) * (ROOM_W + GAP) / 2;
    for (const t of [...trees.children]) disposeGroup(t);
    for (let i = 0; i < cols + 2; i++) {
      for (const side of [-1, 1]) {
        const tg = new THREE.Group();
        const trunk = box(0.35, 1.2, 0.35, 0x6b4a2f);
        trunk.position.y = 0.6;
        const top = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 0), new THREE.MeshStandardMaterial({ color: 0x3f8f3a, flatShading: true }));
        top.position.y = 1.9;
        top.castShadow = true;
        tg.add(trunk, top);
        tg.position.set((i - 1) * (ROOM_W + GAP) + (side > 0 ? 3 : -2), 0, side * (CORRIDOR / 2 + ROOM_D + 3 + (i % 2)));
        trees.add(tg);
      }
    }
  }

  // ------------------------------------------------------------------ personagens

  function buildChar(a: AgentInfo): Character {
    const h = hash(a.id);
    const shirt = PALETTE[h % PALETTE.length];
    const skin = SKIN[(h >> 3) % SKIN.length];
    const g = new THREE.Group();
    const scale = a.kind === 'sub' ? 0.8 : 1;
    const legL = box(0.22, 0.6, 0.25, 0x2d3047);
    legL.position.set(-0.13, 0.3, 0);
    const legR = legL.clone();
    legR.position.x = 0.13;
    const torso = box(0.6, 0.7, 0.35, shirt);
    torso.position.y = 0.95;
    const armL = box(0.16, 0.6, 0.18, shirt);
    armL.position.set(-0.4, 0.95, 0);
    const armR = armL.clone();
    armR.position.x = 0.4;
    const head = box(0.5, 0.5, 0.5, skin);
    head.position.y = 1.55;
    const hair = box(0.54, 0.16, 0.54, a.look === 'f' ? 0x5a2e1a : 0x222222);
    hair.position.y = 1.86;
    for (const m of [legL, legR, torso, armL, armR, head, hair]) m.userData = { agent: a.id };
    g.add(legL, legR, torso, armL, armR, head, hair);
    g.scale.setScalar(scale);
    const label = textSprite(a.name, { size: 40, bg: 'rgba(20,17,31,0.8)', scale: 0.32 });
    label.position.y = 2.25;
    const alert = textSprite('!', { size: 64, color: '#14111f', bg: '#ffd23f', scale: 0.45 });
    alert.position.y = 2.75;
    alert.visible = false;
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.6, 32), new THREE.MeshBasicMaterial({ color: 0xff2d95, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.04;
    ring.visible = false;
    g.add(label, alert, ring);
    scene.add(g);
    return { id: a.id, group: g, legs: [legL, legR], arms: [armL, armR], label, alert, ring, target: new THREE.Vector3(), facing: 0, status: a.status, walkT: 0 };
  }

  // ------------------------------------------------------------------ snapshot -> cena

  function apply(snap: OfficeSnapshot): void {
    const seenRooms = new Set<string>();
    for (const r of snap.rooms) {
      seenRooms.add(r.id);
      const old = rooms.get(r.id);
      const { origin } = roomOrigin(r.slot);
      if (old && old.origin.equals(origin)) continue;
      if (old) disposeGroup(old.group);
      rooms.set(r.id, buildRoom(r));
    }
    for (const [id, r] of rooms) if (!seenRooms.has(id)) { disposeGroup(r.group); rooms.delete(id); }
    layoutExtras();

    const seen = new Set<string>();
    const byRoom = new Map<string, AgentInfo[]>();
    for (const a of snap.agents) {
      if (!VISIBLE.has(a.status) || !rooms.has(a.roomId)) continue;
      seen.add(a.id);
      (byRoom.get(a.roomId) ?? byRoom.set(a.roomId, []).get(a.roomId)!).push(a);
    }
    for (const [id, c] of chars) if (!seen.has(id)) { disposeGroup(c.group); chars.delete(id); }
    for (const room of rooms.values()) for (const d of room.desks) { d.screen.emissive.setHex(0); d.screen.color.setHex(0x111111); }

    for (const [roomId, list] of byRoom) {
      const room = rooms.get(roomId)!;
      list.sort((x, y) => x.id.localeCompare(y.id));
      let desk = 0;
      let lounge = 0;
      for (const a of list) {
        let c = chars.get(a.id);
        const fresh = !c;
        if (!c) { c = buildChar(a); chars.set(a.id, c); }
        c.status = a.status;
        if (a.status === 'idle' || desk >= room.desks.length) {
          const p = room.lounge[lounge++ % room.lounge.length];
          c.target.copy(p);
          c.facing = room.dir > 0 ? Math.PI : 0;
        } else {
          const d = room.desks[desk++];
          c.target.copy(d.seat);
          c.facing = room.dir > 0 ? Math.PI : 0;
          const col = a.status === 'waiting' ? 0xffb020 : a.status === 'shell' ? 0x3ddc84 : 0x00c2ff;
          d.screen.color.setHex(col);
          d.screen.emissive.setHex(col);
        }
        if (fresh) c.group.position.copy(c.target).add(new THREE.Vector3(0, 0, room.dir * 6));
        c.alert.visible = a.status === 'waiting' && options.bubbles !== 'none';
        c.label.visible = options.showNames;
      }
    }
    refreshSelection();
    if (!framed && rooms.size) { framed = true; overview(); }
  }

  // ------------------------------------------------------------------ seleção e câmera

  function refreshSelection(): void {
    for (const c of chars.values()) c.ring.visible = selection?.type === 'agent' && selection.id === c.id;
    for (const r of rooms.values()) {
      const mat = r.floor.material as THREE.MeshStandardMaterial;
      mat.emissive.setHex(selection?.type === 'room' && selection.id === r.id ? 0x331122 : 0);
    }
  }

  function setSelection(sel: Selection): void {
    selection = sel;
    refreshSelection();
    for (const cb of selectCbs) cb(sel);
  }

  function lookAt(target: THREE.Vector3, dist: number, follow?: string): void {
    focus = { target: target.clone(), dist, follow };
  }

  function overview(): void {
    if (!rooms.size) return;
    const b = new THREE.Box3();
    for (const r of rooms.values()) b.expandByPoint(r.origin.clone().add(new THREE.Vector3(ROOM_W / 2, 0, ROOM_D / 2))).expandByPoint(r.origin.clone().sub(new THREE.Vector3(ROOM_W / 2, 0, ROOM_D / 2)));
    const size = b.getSize(new THREE.Vector3());
    lookAt(b.getCenter(new THREE.Vector3()), Math.max(18, Math.max(size.x, size.z) * 1.15));
  }

  // ------------------------------------------------------------------ entrada

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pick(ev: PointerEvent): { agent?: string; room?: string } {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const objs: THREE.Object3D[] = [];
    for (const c of chars.values()) objs.push(c.group);
    for (const r of rooms.values()) objs.push(r.floor);
    for (const hit of raycaster.intersectObjects(objs, true)) {
      const ud = hit.object.userData as { agent?: string; room?: string };
      if (ud.agent || ud.room) return ud;
    }
    return {};
  }
  let downAt: { x: number; y: number } | null = null;
  const abort = new AbortController();
  canvas.addEventListener('pointerdown', (e) => { downAt = { x: e.clientX, y: e.clientY }; }, { signal: abort.signal });
  canvas.addEventListener('pointerup', (e) => {
    if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 5) return;
    const p = pick(e);
    setSelection(p.agent ? { type: 'agent', id: p.agent } : p.room ? { type: 'room', id: p.room } : null);
    if (p.agent && options.followSelected) api.focusAgent(p.agent, { follow: true });
  }, { signal: abort.signal });
  canvas.addEventListener('pointermove', (e) => {
    if (e.buttons) return;
    const id = pick(e).agent ?? null;
    canvas.style.cursor = id ? 'pointer' : 'grab';
    if (id !== hover) { hover = id; for (const cb of hoverCbs) cb(id); }
  }, { signal: abort.signal });
  controls.addEventListener('start', () => { if (focus && !focus.follow) focus = null; });

  const resize = () => {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  };
  addEventListener('resize', resize, { signal: abort.signal });
  resize();

  // ------------------------------------------------------------------ laço

  function updateDaylight(): void {
    const mode = options.daylight ?? (options.dayNight ? 'auto' : 'day');
    const h = new Date().getHours();
    const night = mode === 'night' || (mode === 'auto' && (h < 6 || h >= 18));
    scene.background = new THREE.Color(night ? 0x0f1424 : 0x9fd3f0);
    scene.fog = new THREE.Fog(scene.background.getHex(), 90, 260);
    hemi.intensity = night ? 0.55 : 1.4;
    sun.intensity = night ? 0.35 : 2.2;
    sun.color.setHex(night ? 0x8899ff : 0xffffff);
  }
  updateDaylight();
  let lastLight = 0;

  const clock = new THREE.Clock();
  let raf = 0;
  const tmp = new THREE.Vector3();
  function frame(): void {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.1);
    const t = clock.elapsedTime;
    if (t - lastLight > 30) { lastLight = t; updateDaylight(); }
    for (const c of chars.values()) {
      const pos = c.group.position;
      tmp.copy(c.target).sub(pos);
      tmp.y = 0;
      const d = tmp.length();
      if (d > 0.05) {
        const step = Math.min(d, SPEED * dt);
        pos.addScaledVector(tmp.normalize(), step);
        c.group.rotation.y = Math.atan2(tmp.x, tmp.z);
        c.walkT += dt * 9;
        const s = Math.sin(c.walkT) * 0.5;
        c.legs[0].rotation.x = s; c.legs[1].rotation.x = -s;
        c.arms[0].rotation.x = -s; c.arms[1].rotation.x = s;
        pos.y = 0;
      } else {
        c.group.rotation.y += (c.facing - c.group.rotation.y) * Math.min(1, dt * 6);
        c.legs[0].rotation.x = c.legs[1].rotation.x = 0;
        if (c.status === 'working') {
          const k = Math.sin(t * 18 + hash(c.id)) * 0.25;
          c.arms[0].rotation.x = -0.9 + k; c.arms[1].rotation.x = -0.9 - k;
        } else {
          c.arms[0].rotation.x = c.arms[1].rotation.x = 0;
        }
        pos.y = c.status === 'idle' ? Math.abs(Math.sin(t * 1.5 + hash(c.id))) * 0.03 : 0;
      }
      if (c.alert.visible) c.alert.position.y = 2.75 + Math.sin(t * 4) * 0.08;
    }
    if (focus) {
      if (focus.follow) { const c = chars.get(focus.follow); if (c) focus.target.copy(c.group.position); }
      controls.target.lerp(focus.target, Math.min(1, dt * 4));
      const dir = camera.position.clone().sub(controls.target).normalize();
      const want = controls.target.clone().addScaledVector(dir, focus.dist);
      camera.position.lerp(want, Math.min(1, dt * 4));
      if (!focus.follow && controls.target.distanceTo(focus.target) < 0.05) focus = null;
    }
    controls.update();
    renderer.render(scene, camera);
  }
  frame();

  const off = store.on('snapshot', apply);
  if (store.snapshot) apply(store.snapshot);

  // ------------------------------------------------------------------ contrato

  const api: WorldApi = {
    select(sel, opts) {
      setSelection(sel);
      if (opts?.focus && sel?.type === 'agent') api.focusAgent(sel.id);
      if (opts?.focus && sel?.type === 'room') api.focusRoom(sel.id);
    },
    getSelection: () => selection,
    onSelect(cb) { selectCbs.add(cb); return () => selectCbs.delete(cb); },
    onHover(cb) { hoverCbs.add(cb); return () => hoverCbs.delete(cb); },
    focusAgent(id, opts) {
      const c = chars.get(id);
      if (c) lookAt(c.group.position, 9, opts?.follow ? id : undefined);
    },
    focusRoom(id) {
      const r = rooms.get(id);
      if (r) lookAt(r.origin, 16);
    },
    overview,
    zoomBy(factor) {
      const dir = camera.position.clone().sub(controls.target);
      const len = THREE.MathUtils.clamp(dir.length() / factor, controls.minDistance, controls.maxDistance);
      camera.position.copy(controls.target).addScaledVector(dir.normalize(), len);
    },
    getOptions: () => ({ ...options }),
    setOptions(o) {
      options = { ...options, ...o };
      updateDaylight();
      if (store.snapshot) apply(store.snapshot);
    },
    screenPositionOf(agentId) {
      const c = chars.get(agentId);
      if (!c) return null;
      const p = c.group.position.clone().setY(HEAD_Y + 0.4).project(camera);
      if (p.z > 1 || Math.abs(p.x) > 1.1 || Math.abs(p.y) > 1.1) return null;
      return { x: (p.x + 1) / 2 * innerWidth, y: (1 - p.y) / 2 * innerHeight };
    },
    setViewInsets(i) { insets = { ...insets, ...i }; void insets; },
    destroy() {
      cancelAnimationFrame(raf);
      off();
      abort.abort();
      controls.dispose();
      renderer.dispose();
    },
  };
  return api;
}
