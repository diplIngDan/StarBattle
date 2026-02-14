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

  const boundary = MeshBuilder.CreateLines("boundary", {
    points: [
      new Vector3(-size, 0.5, -size), new Vector3(size, 0.5, -size),
      new Vector3(size, 0.5, size), new Vector3(-size, 0.5, size),
      new Vector3(-size, 0.5, -size),
    ],
  }, scene);
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
    inst.scaling.setAll(0.3 + Math.random() * 0.8);
    inst.isPickable = false;
  }
}

function createShipMesh(scene, color, id, shipClass) {
  const root = new TransformNode("ship_" + id, scene);

  const hullMat = new StandardMaterial("hMat_" + id, scene);
  hullMat.emissiveColor = color.scale(0.35);
  hullMat.diffuseColor = color.scale(0.15);

  const accentMat = new StandardMaterial("aMat_" + id, scene);
  accentMat.emissiveColor = color;

  if (shipClass === 'leviathan') {
    // Organic alien ship design
    const body = MeshBuilder.CreateSphere("body_" + id, { diameter: 2.5, segments: 12 }, scene);
    body.scaling.set(1, 0.4, 1.6);
    body.material = hullMat; body.parent = root; body.isPickable = false;

    // Organic tendrils/appendages
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI / 2) + Math.PI / 4;
      const tendril = MeshBuilder.CreateCylinder("tend_" + id + "_" + i, {
        height: 2.5, diameterTop: 0.15, diameterBottom: 0.4, tessellation: 8
      }, scene);
      tendril.position.x = Math.cos(angle) * 1.2;
      tendril.position.z = Math.sin(angle) * 1.2 - 0.5;
      tendril.rotation.z = Math.cos(angle) * 0.4;
      tendril.rotation.x = Math.sin(angle) * 0.4;
      tendril.material = accentMat; tendril.parent = root; tendril.isPickable = false;
    }

    // Front mandibles
    for (const xOff of [-0.5, 0.5]) {
      const mandible = MeshBuilder.CreateBox("mand_" + id + "_" + xOff, {
        width: 0.2, height: 0.15, depth: 1.5
      }, scene);
      mandible.position.set(xOff, 0, 1.8);
      mandible.rotation.y = xOff > 0 ? 0.2 : -0.2;
      mandible.material = accentMat; mandible.parent = root; mandible.isPickable = false;
    }

    root.scaling.setAll(1.25);
  } else {
    // Standard mechanical ship design
    const hull = MeshBuilder.CreateBox("hull_" + id, { width: 1.2, height: 0.3, depth: 3 }, scene);
    hull.material = hullMat; hull.parent = root; hull.isPickable = false;

    const nose = MeshBuilder.CreateBox("nose_" + id, { width: 0.5, height: 0.35, depth: 1.2 }, scene);
    nose.position.z = 1.8; nose.material = accentMat; nose.parent = root; nose.isPickable = false;

    const wingL = MeshBuilder.CreateBox("wL_" + id, { width: 1.8, height: 0.12, depth: 1.3 }, scene);
    wingL.position.x = -0.9; wingL.position.z = -0.3;
    wingL.material = hullMat; wingL.parent = root; wingL.isPickable = false;

    const wingR = MeshBuilder.CreateBox("wR_" + id, { width: 1.8, height: 0.12, depth: 1.3 }, scene);
    wingR.position.x = 0.9; wingR.position.z = -0.3;
    wingR.material = hullMat; wingR.parent = root; wingR.isPickable = false;

    for (const xOff of [-0.4, 0.4]) {
      const eng = MeshBuilder.CreateSphere("eng_" + id + "_" + xOff, { diameter: 0.45, segments: 8 }, scene);
      eng.position.set(xOff, 0, -1.5); eng.material = accentMat; eng.parent = root; eng.isPickable = false;
    }

    if (shipClass === 'dreadnought') {
      root.scaling.setAll(1.35);
    }
  }

  return root;
}

function createBeamMesh(scene, id) {
  const beam = MeshBuilder.CreateBox("beam_" + id, { width: 0.2, height: 0.1, depth: 1 }, scene);
  const mat = new StandardMaterial("bMat_" + id, scene);
  mat.emissiveColor = new Color3(0, 0.7, 1);
  mat.alpha = 0.8;
  mat.disableLighting = true;
  beam.material = mat; beam.isPickable = false;
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
  m.material = mat; m.isPickable = false;
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
  ps.minSize = 0.4; ps.maxSize = 1.5;
  ps.minLifeTime = 0.15; ps.maxLifeTime = 0.5;
  ps.emitRate = 300;
  ps.createSphereEmitter(2);
  ps.color1 = new Color4(0, 0.95, 1, 1);
  ps.color2 = new Color4(0, 0.3, 1, 0.4);
  ps.minEmitPower = 5; ps.maxEmitPower = 15;
  ps.targetStopDuration = 0.15;
  ps.disposeOnStop = true;
  ps.start();
}

function spawnShieldFlash(scene, x, z) {
  const sphere = MeshBuilder.CreateSphere("sf", { diameter: 8, segments: 12 }, scene);
  sphere.position.set(x, 0.5, z);
  const mat = new StandardMaterial("sfMat", scene);
  mat.emissiveColor = new Color3(0, 0.5, 1);
  mat.alpha = 0.45;
  mat.disableLighting = true;
  mat.backFaceCulling = false;
  sphere.material = mat;
  sphere.isPickable = false;
  setTimeout(() => { try { sphere.dispose(); } catch (e) { /* noop */ } }, 600);
}

function spawnYamatoFire(scene, sx, sz, ex, ez, texture) {
  const dx = ex - sx; const dz = ez - sz;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist < 1) return;
  const angle = Math.atan2(dx, dz);
  const beam = MeshBuilder.CreateBox("yamato_beam", { width: 0.6, height: 0.3, depth: 1 }, scene);
  beam.position.x = (sx + ex) / 2;
  beam.position.y = 0.8;
  beam.position.z = (sz + ez) / 2;
  beam.rotation.y = angle;
  beam.scaling.z = dist;
  const mat = new StandardMaterial("yamatoMat", scene);
  mat.emissiveColor = new Color3(1, 0.7, 0);
  mat.alpha = 0.9;
  mat.disableLighting = true;
  beam.material = mat;
  beam.isPickable = false;
  spawnExplosion(scene, ex, ez, 'large', texture);
  setTimeout(() => { try { beam.dispose(); } catch (e) { /* noop */ } }, 400);
}

function spawnBombardmentExplosions(scene, x, z, radius, texture) {
  for (let i = 0; i < 6; i++) {
    const ox = x + (Math.random() - 0.5) * radius * 1.2;
    const oz = z + (Math.random() - 0.5) * radius * 1.2;
    setTimeout(() => spawnExplosion(scene, ox, oz, 'large', texture), i * 150);
  }
}

// --- Leviathan Effect Functions ---
function spawnBioStasisEffect(scene, x, z, texture) {
  // Green stasis web/cocoon effect
  const sphere = MeshBuilder.CreateSphere("stasis", { diameter: 6, segments: 12 }, scene);
  sphere.position.set(x, 0.5, z);
  const mat = new StandardMaterial("stasisMat", scene);
  mat.emissiveColor = new Color3(0.2, 0.8, 0.2);
  mat.alpha = 0.5;
  mat.disableLighting = true;
  mat.backFaceCulling = false;
  mat.wireframe = true;
  sphere.material = mat;
  sphere.isPickable = false;

  const ps = new ParticleSystem("stasisPs", 50, scene);
  ps.emitter = new Vector3(x, 0.5, z);
  ps.particleTexture = texture;
  ps.minSize = 0.2; ps.maxSize = 0.6;
  ps.minLifeTime = 0.3; ps.maxLifeTime = 0.8;
  ps.emitRate = 60;
  ps.createSphereEmitter(3);
  ps.color1 = new Color4(0.2, 1, 0.3, 0.8);
  ps.color2 = new Color4(0, 0.6, 0.2, 0.3);
  ps.minEmitPower = 0.5; ps.maxEmitPower = 2;
  ps.targetStopDuration = 2.5;
  ps.disposeOnStop = true;
  ps.start();

  setTimeout(() => { try { sphere.dispose(); } catch (e) { /* noop */ } }, 2500);
}

function spawnMutaliskSpawnEffect(scene, x, z, texture) {
  const ps = new ParticleSystem("mutaSpawn", 100, scene);
  ps.emitter = new Vector3(x, 0.5, z);
  ps.particleTexture = texture;
  ps.minSize = 0.3; ps.maxSize = 1;
  ps.minLifeTime = 0.2; ps.maxLifeTime = 0.6;
  ps.emitRate = 200;
  ps.createSphereEmitter(3);
  ps.color1 = new Color4(0.6, 0.3, 0.8, 1);
  ps.color2 = new Color4(0.3, 0.1, 0.5, 0.5);
  ps.minEmitPower = 3; ps.maxEmitPower = 8;
  ps.targetStopDuration = 0.3;
  ps.disposeOnStop = true;
  ps.start();
}

function spawnBileSwellEffect(scene, x, z, radius, texture) {
  // Toxic green explosion
  const disc = MeshBuilder.CreateDisc("bile_disc", { radius: radius, tessellation: 24 }, scene);
  disc.rotation.x = Math.PI / 2;
  disc.position.set(x, 0.2, z);
  const mat = new StandardMaterial("bileMat", scene);
  mat.emissiveColor = new Color3(0.4, 0.7, 0);
  mat.alpha = 0.4;
  mat.disableLighting = true;
  mat.backFaceCulling = false;
  disc.material = mat;
  disc.isPickable = false;

  // Rising toxic particles
  const ps = new ParticleSystem("bilePs", 200, scene);
  ps.emitter = new Vector3(x, 0.3, z);
  ps.particleTexture = texture;
  ps.minSize = 0.5; ps.maxSize = 2;
  ps.minLifeTime = 0.5; ps.maxLifeTime = 1.5;
  ps.emitRate = 300;
  ps.createCylinderEmitter(radius * 0.8, 0.5, 0, 0);
  ps.color1 = new Color4(0.5, 0.8, 0, 1);
  ps.color2 = new Color4(0.2, 0.5, 0, 0.5);
  ps.colorDead = new Color4(0.1, 0.2, 0, 0);
  ps.minEmitPower = 2; ps.maxEmitPower = 6;
  ps.gravity = new Vector3(0, 2, 0);
  ps.targetStopDuration = 0.5;
  ps.disposeOnStop = true;
  ps.start();

  setTimeout(() => { try { disc.dispose(); } catch (e) { /* noop */ } }, 800);
}

function createMutaliskMesh(scene, id) {
  const root = new TransformNode("mutalisk_" + id, scene);

  const bodyMat = new StandardMaterial("mutaMat_" + id, scene);
  bodyMat.emissiveColor = new Color3(0.4, 0.2, 0.6);
  bodyMat.diffuseColor = new Color3(0.2, 0.1, 0.3);

  // Small organic body
  const body = MeshBuilder.CreateSphere("mutaBody_" + id, { diameter: 1.2, segments: 8 }, scene);
  body.scaling.set(0.8, 0.5, 1.2);
  body.material = bodyMat; body.parent = root; body.isPickable = false;

  // Wings
  for (const xOff of [-0.6, 0.6]) {
    const wing = MeshBuilder.CreateDisc("mutaWing_" + id + "_" + xOff, { radius: 0.8, tessellation: 6 }, scene);
    wing.position.set(xOff, 0.1, 0);
    wing.rotation.x = Math.PI / 2;
    wing.rotation.z = xOff > 0 ? 0.3 : -0.3;
    wing.material = bodyMat; wing.parent = root; wing.isPickable = false;
  }

  return root;
}

function spawnMutaliskAttackEffect(scene, mx, mz, tx, tz, texture) {
  // Small green projectile
  const dx = tx - mx; const dz = tz - mz;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist < 1) return;
  const angle = Math.atan2(dx, dz);
  const proj = MeshBuilder.CreateSphere("mutaProj", { diameter: 0.4, segments: 6 }, scene);
  const mat = new StandardMaterial("mutaProjMat", scene);
  mat.emissiveColor = new Color3(0.3, 0.9, 0.2);
  mat.disableLighting = true;
  proj.material = mat;
  proj.position.set(mx, 0.5, mz);
  proj.isPickable = false;

  let progress = 0;
  const anim = setInterval(() => {
    progress += 0.15;
    if (progress >= 1) {
      clearInterval(anim);
      try { proj.dispose(); } catch (e) { /* noop */ }
      spawnExplosion(scene, tx, tz, 'small', texture);
      return;
    }
    proj.position.x = mx + dx * progress;
    proj.position.z = mz + dz * progress;
  }, 30);
}

function syncScene(r, state) {
  const { scene, camera, shipMeshes, missileMeshes, beamMeshes, playerId, flareTex } = r;

  // --- Ships ---
  const activeIds = new Set();
  for (const p of state.players) {
    activeIds.add(p.id);
    if (!p.alive) {
      if (shipMeshes[p.id]) shipMeshes[p.id].setEnabled(false);
      if (beamMeshes[p.id]) beamMeshes[p.id].setEnabled(false);
      if (r.channelBeams[p.id]) r.channelBeams[p.id].setEnabled(false);
      continue;
    }
    if (!shipMeshes[p.id]) {
      const isLocal = p.id === playerId;
      const color = isLocal ? new Color3(0, 0.95, 1) : new Color3(1, 0.15, 0.15);
      shipMeshes[p.id] = createShipMesh(scene, color, p.id, p.shipClass);
    }
    const mesh = shipMeshes[p.id];
    mesh.setEnabled(true);
    mesh.position.x += (p.x - mesh.position.x) * 0.25;
    mesh.position.z += (p.z - mesh.position.z) * 0.25;
    mesh.rotation.y = p.rotation;

    // Laser beam
    if (p.isFiring) {
      if (!beamMeshes[p.id]) beamMeshes[p.id] = createBeamMesh(scene, p.id);
      updateBeamVisual(beamMeshes[p.id], p);
    } else if (beamMeshes[p.id]) {
      beamMeshes[p.id].setEnabled(false);
    }

    // Yamato channel beam
    if (p.isChanneling && p.channelTargetId) {
      const target = state.players.find(t => t.id === p.channelTargetId);
      if (target && target.alive) {
        if (!r.channelBeams[p.id]) {
          const cb = MeshBuilder.CreateBox("ch_" + p.id, { width: 0.35, height: 0.15, depth: 1 }, scene);
          const mat = new StandardMaterial("chMat_" + p.id, scene);
          mat.emissiveColor = new Color3(1, 0.7, 0);
          mat.alpha = 0.4;
          mat.disableLighting = true;
          cb.material = mat;
          cb.isPickable = false;
          r.channelBeams[p.id] = cb;
        }
        const cb = r.channelBeams[p.id];
        const tdx = target.x - p.x;
        const tdz = target.z - p.z;
        const tdist = Math.sqrt(tdx * tdx + tdz * tdz);
        const tangle = Math.atan2(tdx, tdz);
        cb.position.x = (p.x + target.x) / 2;
        cb.position.y = 0.8;
        cb.position.z = (p.z + target.z) / 2;
        cb.rotation.y = tangle;
        cb.scaling.z = tdist;
        cb.material.alpha = 0.25 + Math.sin(Date.now() * 0.015) * 0.2;
        cb.setEnabled(true);
      }
    } else if (r.channelBeams[p.id]) {
      r.channelBeams[p.id].setEnabled(false);
    }

    // Repair bots particles
    if (p.repairBotsTimer > 0) {
      if (!r.repairEffects[p.id]) {
        const emitPos = new Vector3(p.x, 0.5, p.z);
        const ps = new ParticleSystem("repair_" + p.id, 25, scene);
        ps.emitter = emitPos;
        ps.particleTexture = flareTex;
        ps.minSize = 0.15; ps.maxSize = 0.5;
        ps.minLifeTime = 0.3; ps.maxLifeTime = 0.7;
        ps.emitRate = 12;
        ps.createSphereEmitter(2);
        ps.color1 = new Color4(0, 1, 0.3, 0.7);
        ps.color2 = new Color4(0, 0.5, 0.2, 0.3);
        ps.minEmitPower = 0.3; ps.maxEmitPower = 1.5;
        ps.start();
        r.repairEffects[p.id] = { ps, emitPos };
      }
      const shipPos = shipMeshes[p.id]?.position;
      if (shipPos) {
        r.repairEffects[p.id].emitPos.x = shipPos.x;
        r.repairEffects[p.id].emitPos.z = shipPos.z;
      }
    } else if (r.repairEffects[p.id]) {
      r.repairEffects[p.id].ps.stop();
      r.repairEffects[p.id].ps.dispose();
      delete r.repairEffects[p.id];
    }
  }

  // Cleanup stale
  for (const id of Object.keys(shipMeshes)) {
    if (!activeIds.has(id)) {
      shipMeshes[id].dispose(); delete shipMeshes[id];
      if (beamMeshes[id]) { beamMeshes[id].dispose(); delete beamMeshes[id]; }
      if (r.channelBeams[id]) { r.channelBeams[id].dispose(); delete r.channelBeams[id]; }
      if (r.repairEffects[id]) { r.repairEffects[id].ps.dispose(); delete r.repairEffects[id]; }
    }
  }

  // --- Missiles ---
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
    if (!activeMissiles.has(id)) { missileMeshes[id].dispose(); delete missileMeshes[id]; }
  }

  // --- Bombardment Zones ---
  const activeBombs = new Set();
  for (const b of (state.bombardments || [])) {
    activeBombs.add(b.id);
    if (!r.bombardmentMeshes[b.id]) {
      const disc = MeshBuilder.CreateDisc("bomb_" + b.id, { radius: b.radius, tessellation: 24 }, scene);
      disc.rotation.x = Math.PI / 2;
      disc.position.set(b.x, 0.15, b.z);
      const mat = new StandardMaterial("bombMat_" + b.id, scene);
      mat.emissiveColor = new Color3(1, 0.1, 0);
      mat.alpha = 0.15;
      mat.disableLighting = true;
      mat.backFaceCulling = false;
      disc.material = mat;
      disc.isPickable = false;
      r.bombardmentMeshes[b.id] = disc;
    }
    r.bombardmentMeshes[b.id].material.alpha = 0.1 + Math.sin(Date.now() * 0.008) * 0.1;
  }
  for (const id of Object.keys(r.bombardmentMeshes)) {
    if (!activeBombs.has(id)) {
      r.bombardmentMeshes[id].dispose();
      delete r.bombardmentMeshes[id];
    }
  }

  // --- Spore Clouds (Leviathan) ---
  const activeClouds = new Set();
  for (const cloud of (state.sporeClouds || [])) {
    activeClouds.add(cloud.id);
    if (!r.sporeCloudMeshes[cloud.id]) {
      // Create toxic green cloud
      const disc = MeshBuilder.CreateDisc("spore_" + cloud.id, { radius: cloud.radius, tessellation: 24 }, scene);
      disc.rotation.x = Math.PI / 2;
      disc.position.set(cloud.x, 0.2, cloud.z);
      const mat = new StandardMaterial("sporeMat_" + cloud.id, scene);
      mat.emissiveColor = new Color3(0.3, 0.6, 0.1);
      mat.alpha = 0.2;
      mat.disableLighting = true;
      mat.backFaceCulling = false;
      disc.material = mat;
      disc.isPickable = false;

      // Create particle system
      const ps = new ParticleSystem("sporePs_" + cloud.id, 40, scene);
      ps.emitter = new Vector3(cloud.x, 0.5, cloud.z);
      ps.particleTexture = flareTex;
      ps.minSize = 0.8; ps.maxSize = 2.5;
      ps.minLifeTime = 1; ps.maxLifeTime = 2;
      ps.emitRate = 15;
      ps.createCylinderEmitter(cloud.radius * 0.7, 0.5, 0, 0);
      ps.color1 = new Color4(0.3, 0.7, 0.1, 0.4);
      ps.color2 = new Color4(0.2, 0.5, 0, 0.15);
      ps.colorDead = new Color4(0.1, 0.3, 0, 0);
      ps.minEmitPower = 0.3; ps.maxEmitPower = 1;
      ps.gravity = new Vector3(0, 0.5, 0);
      ps.start();

      r.sporeCloudMeshes[cloud.id] = { disc, ps };
    }
    // Pulsing effect
    r.sporeCloudMeshes[cloud.id].disc.material.alpha = 0.15 + Math.sin(Date.now() * 0.004) * 0.08;
  }
  for (const id of Object.keys(r.sporeCloudMeshes)) {
    if (!activeClouds.has(id)) {
      r.sporeCloudMeshes[id].disc.dispose();
      r.sporeCloudMeshes[id].ps.stop();
      r.sporeCloudMeshes[id].ps.dispose();
      delete r.sporeCloudMeshes[id];
    }
  }

  // --- Mutalisks (Leviathan AI units) ---
  const activeMutalisks = new Set();
  for (const m of (state.mutalisks || [])) {
    activeMutalisks.add(m.id);
    if (!r.mutaliskMeshes[m.id]) {
      r.mutaliskMeshes[m.id] = createMutaliskMesh(scene, m.id);
    }
    const mesh = r.mutaliskMeshes[m.id];
    mesh.position.x += (m.x - mesh.position.x) * 0.3;
    mesh.position.y = 1.5; // Flying height
    mesh.position.z += (m.z - mesh.position.z) * 0.3;
    // Add bobbing motion
    mesh.position.y += Math.sin(Date.now() * 0.005 + m.x) * 0.2;
  }
  for (const id of Object.keys(r.mutaliskMeshes)) {
    if (!activeMutalisks.has(id)) {
      r.mutaliskMeshes[id].dispose();
      delete r.mutaliskMeshes[id];
    }
  }

  // --- Camera ---
  const local = state.players.find(p => p.id === playerId);
  if (local) {
    camera.target.x += (local.x - camera.target.x) * 0.08;
    camera.target.z += (local.z - camera.target.z) * 0.08;
  }

  // --- Effects ---
  for (const effect of (state.effects || [])) {
    if (effect.type === 'explosion') {
      spawnExplosion(scene, effect.x, effect.z, effect.size, flareTex);
    } else if (effect.type === 'warp') {
      spawnWarpEffect(scene, effect.x, effect.z, flareTex);
    } else if (effect.type === 'emergency_shields') {
      spawnShieldFlash(scene, effect.x, effect.z);
    } else if (effect.type === 'yamato_fire') {
      spawnYamatoFire(scene, effect.startX, effect.startZ, effect.endX, effect.endZ, flareTex);
    } else if (effect.type === 'bombardment_explode') {
      spawnBombardmentExplosions(scene, effect.x, effect.z, effect.radius, flareTex);
    } else if (effect.type === 'bio_stasis') {
      spawnBioStasisEffect(scene, effect.x, effect.z, flareTex);
    } else if (effect.type === 'spore_cloud_spawn') {
      // Initial spawn burst handled separately
    } else if (effect.type === 'mutalisk_spawn') {
      spawnMutaliskSpawnEffect(scene, effect.x, effect.z, flareTex);
    } else if (effect.type === 'bile_swell') {
      spawnBileSwellEffect(scene, effect.x, effect.z, effect.radius, flareTex);
    } else if (effect.type === 'mutalisk_attack') {
      spawnMutaliskAttackEffect(scene, effect.x, effect.z, effect.targetX, effect.targetZ, flareTex);
    } else if (effect.type === 'mutalisk_death') {
      spawnExplosion(scene, effect.x, effect.z, 'small', flareTex);
    }
  }

  // Move indicator
  if (r.moveIndicator && r.moveIndicator.isEnabled() && local && local.alive) {
    const dx = local.x - r.moveIndicator.position.x;
    const dz = local.z - r.moveIndicator.position.z;
    if (Math.sqrt(dx * dx + dz * dz) < 3) r.moveIndicator.setEnabled(false);
  }
}

export default function GameCanvas({ gameState, playerId, arenaSize, onSendMessage }) {
  const canvasRef = useRef(null);
  const r = useRef({
    engine: null, scene: null, camera: null,
    shipMeshes: {}, missileMeshes: {}, beamMeshes: {},
    channelBeams: {}, repairEffects: {}, bombardmentMeshes: {},
    moveIndicator: null, flareTex: null,
    isFiring: false, lastAimTime: 0, lastMouseWorld: null,
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
      diameter: 2, thickness: 0.12, tessellation: 16,
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
      const world = screenToWorld(refs.scene, refs.camera, e.offsetX, e.offsetY);
      if (world) refs.lastMouseWorld = world;
      if (!refs.isFiring) return;
      const now = Date.now();
      if (now - refs.lastAimTime < 50) return;
      refs.lastAimTime = now;
      if (world && refs.onSendMessage) {
        refs.onSendMessage({ type: 'fire_aim', x: world.x, z: world.z });
      }
    };

    const onKeyDown = (e) => {
      if (!refs.onSendMessage) return;
      const key = e.key.toLowerCase();
      if (key === 'q') {
        refs.onSendMessage({ type: 'ability', id: 'q' });
      } else if (key === 'w') {
        refs.onSendMessage({ type: 'ability', id: 'w' });
      } else if (key === 'e') {
        refs.onSendMessage({ type: 'ability', id: 'e' });
      } else if (key === 'r') {
        const w = refs.lastMouseWorld;
        refs.onSendMessage({ type: 'ability', id: 'r', x: w ? w.x : 0, z: w ? w.z : 0 });
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
