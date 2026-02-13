import { useEffect, useRef } from 'react';
import {
  Engine,
  Scene,
  ArcRotateCamera,
  Vector3,
  Color3,
  Color4,
  HemisphericLight,
  MeshBuilder,
  StandardMaterial,
  GlowLayer,
  ParticleSystem,
  Texture,
  TransformNode,
} from '@babylonjs/core';

const LASER_RANGE = 80;
const FLARE_URL = "https://assets.babylonjs.com/textures/flare.png";

function screenToWorld(scene, camera, sx, sy) {
  const ray = scene.createPickingRay(sx, sy, null, camera);
  if (Math.abs(ray.direction.y) < 0.001) return null;
  const t = -ray.origin.y / ray.direction.y;
  if (t < 0) return null;
  return new Vector3(
    ray.origin.x + ray.direction.x * t,
    0,
    ray.origin.z + ray.direction.z * t
  );
}

function setupArena(scene, size) {
  const gridLines = [];
  const spacing = 50;
  for (let i = -size; i <= size; i += spacing) {
    gridLines.push([new Vector3(i, -0.1, -size), new Vector3(i, -0.1, size)]);
    gridLines.push([new Vector3(-size, -0.1, i), new Vector3(size, -0.1, i)]);
  }
  const grid = MeshBuilder.CreateLineSystem("grid", { lines: gridLines }, scene);
  grid.color = new Color3(0, 0.06, 0.08);
  grid.isPickable = false;

  const boundaryPoints = [
    new Vector3(-size, 0.5, -size),
    new Vector3(size, 0.5, -size),
    new Vector3(size, 0.5, size),
    new Vector3(-size, 0.5, size),
    new Vector3(-size, 0.5, -size),
  ];
  const boundary = MeshBuilder.CreateLines("boundary", { points: boundaryPoints }, scene);
  boundary.color = new Color3(0, 0.35, 0.45);
  boundary.isPickable = false;

  const starMesh = MeshBuilder.CreateSphere("starTpl", { diameter: 0.3, segments: 4 }, scene);
  const starMat = new StandardMaterial("starMat", scene);
  starMat.emissiveColor = new Color3(0.7, 0.75, 0.9);
  starMat.disableLighting = true;
  starMesh.material = starMat;
  starMesh.isVisible = false;

  for (let i = 0; i < 250; i++) {
    const inst = starMesh.createInstance("star_" + i);
    inst.position.x = (Math.random() - 0.5) * size * 3;
    inst.position.y = -6 - Math.random() * 25;
    inst.position.z = (Math.random() - 0.5) * size * 3;
    const s = 0.3 + Math.random() * 0.8;
    inst.scaling.setAll(s);
    inst.isPickable = false;
  }
}

function createShipMesh(scene, color, id) {
  const root = new TransformNode("ship_" + id, scene);

  const hullMat = new StandardMaterial("hMat_" + id, scene);
  hullMat.emissiveColor = color.scale(0.35);
  hullMat.diffuseColor = color.scale(0.15);

  const accentMat = new StandardMaterial("aMat_" + id, scene);
  accentMat.emissiveColor = color;

  const hull = MeshBuilder.CreateBox("hull_" + id, { width: 1.2, height: 0.3, depth: 3 }, scene);
  hull.material = hullMat;
  hull.parent = root;
  hull.isPickable = false;

  const nose = MeshBuilder.CreateBox("nose_" + id, { width: 0.5, height: 0.35, depth: 1.2 }, scene);
  nose.position.z = 1.8;
  nose.material = accentMat;
  nose.parent = root;
  nose.isPickable = false;

  const wingL = MeshBuilder.CreateBox("wL_" + id, { width: 1.8, height: 0.12, depth: 1.3 }, scene);
  wingL.position.x = -0.9;
  wingL.position.z = -0.3;
  wingL.material = hullMat;
  wingL.parent = root;
  wingL.isPickable = false;

  const wingR = MeshBuilder.CreateBox("wR_" + id, { width: 1.8, height: 0.12, depth: 1.3 }, scene);
  wingR.position.x = 0.9;
  wingR.position.z = -0.3;
  wingR.material = hullMat;
  wingR.parent = root;
  wingR.isPickable = false;

  for (const xOff of [-0.4, 0.4]) {
    const eng = MeshBuilder.CreateSphere("eng_" + id + "_" + xOff, { diameter: 0.45, segments: 8 }, scene);
    eng.position.set(xOff, 0, -1.5);
    eng.material = accentMat;
    eng.parent = root;
    eng.isPickable = false;
  }

  return root;
}

function createBeamMesh(scene, id) {
  const beam = MeshBuilder.CreateBox("beam_" + id, { width: 0.2, height: 0.1, depth: 1 }, scene);
  const mat = new StandardMaterial("bMat_" + id, scene);
  mat.emissiveColor = new Color3(0, 0.7, 1);
  mat.alpha = 0.8;
  mat.disableLighting = true;
  beam.material = mat;
  beam.isPickable = false;
  return beam;
}

function updateBeamVisual(beamMesh, p) {
  const dx = p.fireTargetX - p.x;
  const dz = p.fireTargetZ - p.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist < 0.5) { beamMesh.setEnabled(false); return; }

  const maxDist = Math.min(dist, LASER_RANGE);
  const ndx = dx / dist;
  const ndz = dz / dist;
  const endX = p.x + ndx * maxDist;
  const endZ = p.z + ndz * maxDist;
  const angle = Math.atan2(dx, dz);

  beamMesh.position.x = (p.x + endX) / 2;
  beamMesh.position.y = 0.5;
  beamMesh.position.z = (p.z + endZ) / 2;
  beamMesh.rotation.y = angle;
  beamMesh.scaling.z = maxDist;
  beamMesh.setEnabled(true);
}

function createMissileMesh(scene) {
  const m = MeshBuilder.CreateSphere("missile", { diameter: 0.5, segments: 6 }, scene);
  const mat = new StandardMaterial("mMat", scene);
  mat.emissiveColor = new Color3(1, 0.5, 0);
  mat.disableLighting = true;
  m.material = mat;
  m.isPickable = false;
  return m;
}

function spawnExplosion(scene, x, z, size, texture) {
  const ps = new ParticleSystem("exp", size === 'large' ? 300 : 100, scene);
  ps.emitter = new Vector3(x, 0.5, z);
  ps.particleTexture = texture;
  ps.minSize = size === 'large' ? 0.8 : 0.3;
  ps.maxSize = size === 'large' ? 3 : 1;
  ps.minLifeTime = 0.2;
  ps.maxLifeTime = size === 'large' ? 1.2 : 0.6;
  ps.emitRate = 500;
  ps.createSphereEmitter(size === 'large' ? 3 : 1.5);
  ps.color1 = new Color4(1, 0.6, 0, 1);
  ps.color2 = new Color4(1, 0.1, 0, 0.6);
  ps.colorDead = new Color4(0.2, 0, 0, 0);
  ps.minEmitPower = 2;
  ps.maxEmitPower = size === 'large' ? 12 : 5;
  ps.targetStopDuration = 0.25;
  ps.disposeOnStop = true;
  ps.start();
}

function spawnWarpEffect(scene, x, z, texture) {
  const ps = new ParticleSystem("warp", 80, scene);
  ps.emitter = new Vector3(x, 0.5, z);
  ps.particleTexture = texture;
  ps.minSize = 0.4;
  ps.maxSize = 1.5;
  ps.minLifeTime = 0.15;
  ps.maxLifeTime = 0.5;
  ps.emitRate = 300;
  ps.createSphereEmitter(2);
  ps.color1 = new Color4(0, 0.95, 1, 1);
  ps.color2 = new Color4(0, 0.3, 1, 0.4);
  ps.minEmitPower = 5;
  ps.maxEmitPower = 15;
  ps.targetStopDuration = 0.15;
  ps.disposeOnStop = true;
  ps.start();
}

function syncScene(r, state) {
  const { scene, camera, shipMeshes, missileMeshes, beamMeshes, playerId, flareTex } = r;

  const activeIds = new Set();
  for (const p of state.players) {
    activeIds.add(p.id);

    if (!p.alive) {
      if (shipMeshes[p.id]) shipMeshes[p.id].setEnabled(false);
      if (beamMeshes[p.id]) beamMeshes[p.id].setEnabled(false);
      continue;
    }

    if (!shipMeshes[p.id]) {
      const isLocal = p.id === playerId;
      const color = isLocal ? new Color3(0, 0.95, 1) : new Color3(1, 0.15, 0.15);
      shipMeshes[p.id] = createShipMesh(scene, color, p.id);
    }

    const mesh = shipMeshes[p.id];
    mesh.setEnabled(true);
    mesh.position.x += (p.x - mesh.position.x) * 0.25;
    mesh.position.z += (p.z - mesh.position.z) * 0.25;
    mesh.rotation.y = p.rotation;

    if (p.isFiring) {
      if (!beamMeshes[p.id]) beamMeshes[p.id] = createBeamMesh(scene, p.id);
      updateBeamVisual(beamMeshes[p.id], p);
    } else if (beamMeshes[p.id]) {
      beamMeshes[p.id].setEnabled(false);
    }
  }

  for (const id of Object.keys(shipMeshes)) {
    if (!activeIds.has(id)) {
      shipMeshes[id].dispose();
      delete shipMeshes[id];
      if (beamMeshes[id]) { beamMeshes[id].dispose(); delete beamMeshes[id]; }
    }
  }

  const activeMissiles = new Set();
  for (const m of (state.missiles || [])) {
    activeMissiles.add(m.id);
    if (!missileMeshes[m.id]) missileMeshes[m.id] = createMissileMesh(scene);
    const mesh = missileMeshes[m.id];
    mesh.position.x += (m.x - mesh.position.x) * 0.4;
    mesh.position.y = 0.3;
    mesh.position.z += (m.z - mesh.position.z) * 0.4;
  }
  for (const id of Object.keys(missileMeshes)) {
    if (!activeMissiles.has(id)) {
      missileMeshes[id].dispose();
      delete missileMeshes[id];
    }
  }

  const local = state.players.find(p => p.id === playerId);
  if (local) {
    camera.target.x += (local.x - camera.target.x) * 0.08;
    camera.target.z += (local.z - camera.target.z) * 0.08;
  }

  for (const effect of (state.effects || [])) {
    if (effect.type === 'explosion') {
      spawnExplosion(scene, effect.x, effect.z, effect.size, flareTex);
    } else if (effect.type === 'warp') {
      spawnWarpEffect(scene, effect.x, effect.z, flareTex);
    }
  }

  if (r.moveIndicator && r.moveIndicator.isEnabled() && local && local.alive) {
    const dx = local.x - r.moveIndicator.position.x;
    const dz = local.z - r.moveIndicator.position.z;
    if (Math.sqrt(dx * dx + dz * dz) < 3) {
      r.moveIndicator.setEnabled(false);
    }
  }
}

export default function GameCanvas({ gameState, playerId, arenaSize, onSendMessage }) {
  const canvasRef = useRef(null);
  const r = useRef({
    engine: null, scene: null, camera: null,
    shipMeshes: {}, missileMeshes: {}, beamMeshes: {},
    moveIndicator: null, flareTex: null,
    isFiring: false, lastAimTime: 0,
    gameState: null, playerId: null, onSendMessage: null,
  });

  useEffect(() => { r.current.gameState = gameState; }, [gameState]);
  useEffect(() => { r.current.playerId = playerId; }, [playerId]);
  useEffect(() => { r.current.onSendMessage = onSendMessage; }, [onSendMessage]);

  useEffect(() => {
    const refs = r.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    refs.engine = new Engine(canvas, true, { stencil: true });
    refs.scene = new Scene(refs.engine);
    refs.scene.clearColor = new Color4(0.008, 0.008, 0.02, 1);

    refs.camera = new ArcRotateCamera("cam", Math.PI, 0.15, 100, Vector3.Zero(), refs.scene);
    refs.camera.inputs.clear();
    refs.camera.minZ = 0.1;
    refs.camera.maxZ = 2000;
    refs.camera.fov = 0.8;

    const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), refs.scene);
    hemi.intensity = 0.15;
    hemi.diffuse = new Color3(0.4, 0.4, 0.6);

    const glow = new GlowLayer("glow", refs.scene);
    glow.intensity = 1.2;

    refs.flareTex = new Texture(FLARE_URL, refs.scene);
    setupArena(refs.scene, arenaSize);

    const moveMat = new StandardMaterial("moveIndMat", refs.scene);
    moveMat.emissiveColor = new Color3(0, 0.5, 0.3);
    moveMat.alpha = 0.6;
    refs.moveIndicator = MeshBuilder.CreateTorus("moveInd", {
      diameter: 2, thickness: 0.12, tessellation: 16
    }, refs.scene);
    refs.moveIndicator.material = moveMat;
    refs.moveIndicator.position.y = 0.1;
    refs.moveIndicator.setEnabled(false);
    refs.moveIndicator.isPickable = false;

    // Input
    const prevent = e => e.preventDefault();
    canvas.addEventListener('contextmenu', prevent);

    const onPointerDown = (e) => {
      const world = screenToWorld(refs.scene, refs.camera, e.offsetX, e.offsetY);
      if (!world || !refs.onSendMessage) return;
      if (e.button === 0) {
        refs.onSendMessage({ type: 'move', x: world.x, z: world.z });
        refs.moveIndicator.position.x = world.x;
        refs.moveIndicator.position.z = world.z;
        refs.moveIndicator.setEnabled(true);
      } else if (e.button === 2) {
        refs.isFiring = true;
        refs.onSendMessage({ type: 'fire_start', x: world.x, z: world.z });
      }
    };

    const onPointerUp = (e) => {
      if (e.button === 2 && refs.isFiring) {
        refs.isFiring = false;
        refs.onSendMessage?.({ type: 'fire_stop' });
      }
    };

    const onPointerMove = (e) => {
      if (!refs.isFiring) return;
      const now = Date.now();
      if (now - refs.lastAimTime < 50) return;
      refs.lastAimTime = now;
      const world = screenToWorld(refs.scene, refs.camera, e.offsetX, e.offsetY);
      if (world && refs.onSendMessage) {
        refs.onSendMessage({ type: 'fire_aim', x: world.x, z: world.z });
      }
    };

    const onKeyDown = (e) => {
      if (!refs.onSendMessage) return;
      if (e.key === 'q' || e.key === 'Q') {
        refs.onSendMessage({ type: 'ability', id: 'warp' });
      } else if (e.key === 'w' || e.key === 'W') {
        refs.onSendMessage({ type: 'ability', id: 'missile' });
      }
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointermove', onPointerMove);
    window.addEventListener('keydown', onKeyDown);

    refs.engine.runRenderLoop(() => {
      const state = refs.gameState;
      if (state) syncScene(refs, state);
      refs.scene.render();
    });

    const onResize = () => refs.engine.resize();
    window.addEventListener('resize', onResize);

    return () => {
      canvas.removeEventListener('contextmenu', prevent);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
      refs.engine.dispose();
    };
  }, [arenaSize]);

  return (
    <canvas
      ref={canvasRef}
      data-testid="game-canvas"
      style={{ width: '100%', height: '100%', display: 'block', outline: 'none', cursor: 'crosshair' }}
      tabIndex={0}
    />
  );
}
