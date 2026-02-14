import asyncio
import uuid
import math
import time
import json
import random
import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

# Game Constants
TICK_RATE = 20
TICK_INTERVAL = 1.0 / TICK_RATE
ARENA_SIZE = 300

# Ship Constants
SHIP_RADIUS = 1.5
SHIP_MAX_SPEED = 3.0
SHIP_ACCELERATION = 0.08
SHIP_DRAG = 0.98
SHIP_ROTATION_SPEED = 1.5

# Base Combat Constants
SHIELD_REGEN_RATE = 8.0
SHIELD_REGEN_DELAY = 5.0
ENERGY_REGEN_RATE = 8.0
LASER_DAMAGE = 20.0
LASER_ENERGY_COST = 15.0
LASER_RANGE = 80.0
RESPAWN_TIME = 10.0

# Vanguard Ability Constants
WARP_DISTANCE = 25.0
WARP_ENERGY_COST = 40.0
WARP_COOLDOWN = 3.0
MISSILE_DAMAGE = 12.0
MISSILE_SPEED = 10.0
MISSILE_COUNT = 5
MISSILE_COOLDOWN = 10.0
MISSILE_LIFETIME = 5.0

# Dreadnought Ability Constants
EMERGENCY_SHIELDS_RESTORE = 300.0
EMERGENCY_SHIELDS_CD = 20.0
YAMATO_CHANNEL_TIME = 2.0
YAMATO_DAMAGE = 150.0
YAMATO_RANGE = 100.0
YAMATO_CD = 15.0
REPAIR_BOTS_DURATION = 6.0
REPAIR_BOTS_HEAL_PCT = 0.05
REPAIR_BOTS_CD = 25.0
BOMBARDMENT_RADIUS = 40.0
BOMBARDMENT_DELAY = 3.0
BOMBARDMENT_DAMAGE = 120.0
BOMBARDMENT_ENERGY_COST = 80.0
BOMBARDMENT_CD = 45.0

# Leviathan Ability Constants
BIO_REGEN_DELAY = 5.0
BIO_REGEN_RATE = 10.0
BIO_STASIS_RANGE = 60.0
BIO_STASIS_DURATION = 2.5
BIO_STASIS_CD = 12.0
BIO_STASIS_ENERGY = 30.0
SPORE_CLOUD_RADIUS = 35.0
SPORE_CLOUD_DURATION = 5.0
SPORE_CLOUD_CD = 18.0
SPORE_CLOUD_ENERGY = 40.0
SPORE_CLOUD_SLOW_PCT = 0.5
MUTALISK_SPAWN_COUNT = 3
MUTALISK_CD = 30.0
MUTALISK_ENERGY = 50.0
MUTALISK_HEALTH = 40.0
MUTALISK_DAMAGE = 8.0
MUTALISK_SPEED = 4.0
MUTALISK_LIFETIME = 12.0
MUTALISK_ATTACK_RANGE = 15.0
BILE_SWELL_RADIUS = 45.0
BILE_SWELL_DAMAGE = 100.0
BILE_SWELL_ARMOR_DEBUFF = 0.25
BILE_SWELL_DEBUFF_DURATION = 6.0
BILE_SWELL_CD = 50.0
BILE_SWELL_ENERGY = 85.0

# Ship Class Definitions
SHIP_CLASSES = {
    "vanguard": {
        "max_hull": 100.0,
        "max_shields": 100.0,
        "max_energy": 100.0,
        "damage_reduction": 0.0,
    },
    "dreadnought": {
        "max_hull": 150.0,
        "max_shields": 200.0,
        "max_energy": 100.0,
        "damage_reduction": 0.15,
    },
    "leviathan": {
        "max_hull": 180.0,
        "max_shields": 120.0,
        "max_energy": 120.0,
        "damage_reduction": 0.0,
    },
}


class Player:
    def __init__(self, player_id: str, name: str, ship_class: str = "vanguard"):
        self.id = player_id
        self.name = name
        self.ship_class = ship_class

        cfg = SHIP_CLASSES.get(ship_class, SHIP_CLASSES["vanguard"])
        self.max_hull = cfg["max_hull"]
        self.max_shields = cfg["max_shields"]
        self.max_energy = cfg["max_energy"]
        self.damage_reduction = cfg["damage_reduction"]

        self.x = 0.0
        self.z = 0.0
        self.rotation = 0.0
        self.vx = 0.0
        self.vz = 0.0
        self.hull = self.max_hull
        self.shields = self.max_shields
        self.energy = self.max_energy
        self.alive = True
        self.respawn_timer = 0.0
        self.move_target_x = 0.0
        self.move_target_z = 0.0
        self.has_move_target = False
        self.is_firing = False
        self.fire_target_x = 0.0
        self.fire_target_z = 0.0
        self.shield_broken = False
        self.shield_regen_timer = 0.0

        # Vanguard abilities
        self.warp_cooldown = 0.0
        self.missile_cooldown = 0.0

        # Dreadnought abilities
        self.emergency_shields_cd = 0.0
        self.yamato_cd = 0.0
        self.repair_bots_cd = 0.0
        self.bombardment_cd = 0.0
        self.is_channeling = False
        self.channel_timer = 0.0
        self.channel_target_id = None
        self.repair_bots_timer = 0.0

        # Leviathan abilities
        self.bio_stasis_cd = 0.0
        self.spore_cloud_cd = 0.0
        self.mutalisk_cd = 0.0
        self.bile_swell_cd = 0.0
        self.bio_regen_timer = 0.0
        self.last_damage_time = 0.0
        self.armor_debuff_timer = 0.0
        self.armor_debuff_amount = 0.0
        self.stun_timer = 0.0
        self.slow_timer = 0.0
        self.slow_amount = 0.0
        self.in_spore_cloud = False

        self.kills = 0
        self.deaths = 0

    def spawn(self):
        self.x = random.uniform(-ARENA_SIZE * 0.7, ARENA_SIZE * 0.7)
        self.z = random.uniform(-ARENA_SIZE * 0.7, ARENA_SIZE * 0.7)
        self.rotation = random.uniform(0, math.pi * 2)
        self.vx = 0.0
        self.vz = 0.0
        self.hull = self.max_hull
        self.shields = self.max_shields
        self.energy = self.max_energy
        self.alive = True
        self.is_firing = False
        self.shield_broken = False
        self.shield_regen_timer = 0.0
        self.has_move_target = False
        self.respawn_timer = 0.0
        self.warp_cooldown = 0.0
        self.missile_cooldown = 0.0
        self.emergency_shields_cd = 0.0
        self.yamato_cd = 0.0
        self.repair_bots_cd = 0.0
        self.bombardment_cd = 0.0
        self.is_channeling = False
        self.channel_timer = 0.0
        self.channel_target_id = None
        self.repair_bots_timer = 0.0
        # Leviathan resets
        self.bio_stasis_cd = 0.0
        self.spore_cloud_cd = 0.0
        self.mutalisk_cd = 0.0
        self.bile_swell_cd = 0.0
        self.bio_regen_timer = 0.0
        self.last_damage_time = 0.0
        self.armor_debuff_timer = 0.0
        self.armor_debuff_amount = 0.0
        self.stun_timer = 0.0
        self.slow_timer = 0.0
        self.slow_amount = 0.0
        self.in_spore_cloud = False

    def to_dict(self):
        d = {
            "id": self.id,
            "name": self.name,
            "shipClass": self.ship_class,
            "x": round(self.x, 2),
            "z": round(self.z, 2),
            "rotation": round(self.rotation, 3),
            "vx": round(self.vx, 3),
            "vz": round(self.vz, 3),
            "hull": round(self.hull, 1),
            "maxHull": self.max_hull,
            "shields": round(self.shields, 1),
            "maxShields": self.max_shields,
            "energy": round(self.energy, 1),
            "maxEnergy": self.max_energy,
            "alive": self.alive,
            "isFiring": self.is_firing,
            "fireTargetX": round(self.fire_target_x, 2),
            "fireTargetZ": round(self.fire_target_z, 2),
            "respawnTimer": round(self.respawn_timer, 1),
            "kills": self.kills,
            "deaths": self.deaths,
            "stunTimer": round(self.stun_timer, 2),
            "slowTimer": round(self.slow_timer, 2),
            "armorDebuffTimer": round(self.armor_debuff_timer, 2),
        }
        if self.ship_class == "vanguard":
            d["warpCooldown"] = round(self.warp_cooldown, 1)
            d["missileCooldown"] = round(self.missile_cooldown, 1)
        elif self.ship_class == "dreadnought":
            d["emergencyShieldsCd"] = round(self.emergency_shields_cd, 1)
            d["yamatoCd"] = round(self.yamato_cd, 1)
            d["repairBotsCd"] = round(self.repair_bots_cd, 1)
            d["bombardmentCd"] = round(self.bombardment_cd, 1)
            d["isChanneling"] = self.is_channeling
            d["channelTimer"] = round(self.channel_timer, 2)
            d["channelTargetId"] = self.channel_target_id
            d["repairBotsTimer"] = round(self.repair_bots_timer, 1)
        elif self.ship_class == "leviathan":
            d["bioStasisCd"] = round(self.bio_stasis_cd, 1)
            d["sporeCloudCd"] = round(self.spore_cloud_cd, 1)
            d["mutaliskCd"] = round(self.mutalisk_cd, 1)
            d["bileSwellCd"] = round(self.bile_swell_cd, 1)
            d["bioRegenTimer"] = round(self.bio_regen_timer, 2)
        return d


class Missile:
    def __init__(self, missile_id: str, owner_id: str, x: float, z: float, target_id: str):
        self.id = missile_id
        self.owner_id = owner_id
        self.x = x
        self.z = z
        self.target_id = target_id
        self.alive = True
        self.lifetime = MISSILE_LIFETIME

    def to_dict(self):
        return {
            "id": self.id,
            "x": round(self.x, 2),
            "z": round(self.z, 2),
            "ownerId": self.owner_id,
            "targetId": self.target_id,
        }


class BombardmentZone:
    def __init__(self, zone_id: str, owner_id: str, x: float, z: float):
        self.id = zone_id
        self.owner_id = owner_id
        self.x = x
        self.z = z
        self.radius = BOMBARDMENT_RADIUS
        self.timer = BOMBARDMENT_DELAY
        self.exploded = False

    def to_dict(self):
        return {
            "id": self.id,
            "x": round(self.x, 2),
            "z": round(self.z, 2),
            "radius": self.radius,
            "timer": round(self.timer, 2),
        }


class SporeCloud:
    def __init__(self, cloud_id: str, owner_id: str, x: float, z: float):
        self.id = cloud_id
        self.owner_id = owner_id
        self.x = x
        self.z = z
        self.radius = SPORE_CLOUD_RADIUS
        self.timer = SPORE_CLOUD_DURATION

    def to_dict(self):
        return {
            "id": self.id,
            "x": round(self.x, 2),
            "z": round(self.z, 2),
            "radius": self.radius,
            "timer": round(self.timer, 2),
        }


class Mutalisk:
    def __init__(self, mutalisk_id: str, owner_id: str, x: float, z: float):
        self.id = mutalisk_id
        self.owner_id = owner_id
        self.x = x
        self.z = z
        self.health = MUTALISK_HEALTH
        self.alive = True
        self.lifetime = MUTALISK_LIFETIME
        self.target_id = None
        self.attack_cooldown = 0.0

    def to_dict(self):
        return {
            "id": self.id,
            "x": round(self.x, 2),
            "z": round(self.z, 2),
            "ownerId": self.owner_id,
            "health": round(self.health, 1),
        }


class GameRoom:
    def __init__(self, room_id: str):
        self.id = room_id
        self.players: Dict[str, Player] = {}
        self.missiles: List[Missile] = []
        self.bombardment_zones: List[BombardmentZone] = []
        self.spore_clouds: List[SporeCloud] = []
        self.mutalisks: List[Mutalisk] = []
        self.effects: List[dict] = []
        self.connections: Dict[str, any] = {}
        self.running = False
        self.tick = 0
        self._task = None
        self._pending_messages: List[tuple] = []
        self.current_time = 0.0

    def add_player(self, player_id: str, name: str, websocket, ship_class: str = "vanguard") -> Player:
        player = Player(player_id, name, ship_class)
        player.spawn()
        self.players[player_id] = player
        self.connections[player_id] = websocket
        return player

    def remove_player(self, player_id: str):
        self.players.pop(player_id, None)
        self.connections.pop(player_id, None)

    def queue_message(self, player_id: str, message: dict):
        self._pending_messages.append((player_id, message))

    def start(self):
        if not self.running:
            self.running = True
            self._task = asyncio.create_task(self._game_loop())

    def stop(self):
        self.running = False
        if self._task:
            self._task.cancel()

    async def _game_loop(self):
        logger.info(f"Game loop started for room {self.id}")
        try:
            while self.running:
                start = time.monotonic()
                self._process_inputs()
                self._update(TICK_INTERVAL)
                await self._broadcast_state()
                self.tick += 1
                elapsed = time.monotonic() - start
                await asyncio.sleep(max(0, TICK_INTERVAL - elapsed))
        except asyncio.CancelledError:
            logger.info(f"Game loop cancelled for room {self.id}")
        except Exception as e:
            logger.error(f"Game loop error: {e}", exc_info=True)

    def _process_inputs(self):
        messages = self._pending_messages.copy()
        self._pending_messages.clear()

        for player_id, msg in messages:
            player = self.players.get(player_id)
            if not player or not player.alive:
                continue

            # Block all input during Yamato channeling
            if player.is_channeling:
                continue

            msg_type = msg.get("type")

            if msg_type == "move":
                player.move_target_x = float(msg.get("x", 0))
                player.move_target_z = float(msg.get("z", 0))
                player.has_move_target = True
            elif msg_type == "fire_start":
                player.is_firing = True
                player.fire_target_x = float(msg.get("x", 0))
                player.fire_target_z = float(msg.get("z", 0))
            elif msg_type == "fire_stop":
                player.is_firing = False
            elif msg_type == "fire_aim":
                player.fire_target_x = float(msg.get("x", 0))
                player.fire_target_z = float(msg.get("z", 0))
            elif msg_type == "ability":
                ability_id = msg.get("id")
                self._handle_ability(player, ability_id, msg)

    def _handle_ability(self, player: Player, ability_id: str, msg: dict):
        if player.ship_class == "vanguard":
            if ability_id == "q":
                self._use_warp(player)
            elif ability_id == "w":
                self._use_missiles(player)
        elif player.ship_class == "dreadnought":
            if ability_id == "q":
                self._use_emergency_shields(player)
            elif ability_id == "w":
                self._use_yamato(player)
            elif ability_id == "e":
                self._use_repair_bots(player)
            elif ability_id == "r":
                x = float(msg.get("x", player.x))
                z = float(msg.get("z", player.z))
                self._use_bombardment(player, x, z)
        elif player.ship_class == "leviathan":
            if ability_id == "q":
                self._use_bio_stasis(player)
            elif ability_id == "w":
                x = float(msg.get("x", player.x))
                z = float(msg.get("z", player.z))
                self._use_spore_cloud(player, x, z)
            elif ability_id == "e":
                self._use_spawn_mutalisks(player)
            elif ability_id == "r":
                x = float(msg.get("x", player.x))
                z = float(msg.get("z", player.z))
                self._use_bile_swell(player, x, z)

    # --- Vanguard Abilities ---
    def _use_warp(self, player: Player):
        if player.warp_cooldown > 0 or player.energy < WARP_ENERGY_COST:
            return
        player.energy -= WARP_ENERGY_COST
        player.warp_cooldown = WARP_COOLDOWN
        dx = math.sin(player.rotation)
        dz = math.cos(player.rotation)
        player.x += dx * WARP_DISTANCE
        player.z += dz * WARP_DISTANCE
        player.x = max(-ARENA_SIZE, min(ARENA_SIZE, player.x))
        player.z = max(-ARENA_SIZE, min(ARENA_SIZE, player.z))
        self.effects.append({"type": "warp", "playerId": player.id, "x": player.x, "z": player.z})

    def _use_missiles(self, player: Player):
        if player.missile_cooldown > 0:
            return
        player.missile_cooldown = MISSILE_COOLDOWN
        nearest = self._find_nearest_enemy(player)
        if nearest is None:
            return
        for i in range(MISSILE_COUNT):
            angle_offset = (i - MISSILE_COUNT // 2) * 0.3
            missile = Missile(
                str(uuid.uuid4())[:8], player.id,
                player.x + math.sin(player.rotation + angle_offset) * 2,
                player.z + math.cos(player.rotation + angle_offset) * 2,
                nearest.id
            )
            self.missiles.append(missile)

    # --- Dreadnought Abilities ---
    def _use_emergency_shields(self, player: Player):
        if player.emergency_shields_cd > 0:
            return
        player.emergency_shields_cd = EMERGENCY_SHIELDS_CD
        player.shields = min(player.max_shields, player.shields + EMERGENCY_SHIELDS_RESTORE)
        player.shield_broken = False
        self.effects.append({"type": "emergency_shields", "playerId": player.id, "x": player.x, "z": player.z})

    def _use_yamato(self, player: Player):
        if player.yamato_cd > 0 or player.is_channeling:
            return
        nearest = self._find_nearest_enemy(player, max_range=YAMATO_RANGE)
        if nearest is None:
            return
        player.yamato_cd = YAMATO_CD
        player.is_channeling = True
        player.channel_timer = YAMATO_CHANNEL_TIME
        player.channel_target_id = nearest.id
        player.is_firing = False
        player.has_move_target = False
        self.effects.append({"type": "yamato_channel", "playerId": player.id, "targetId": nearest.id})

    def _use_repair_bots(self, player: Player):
        if player.repair_bots_cd > 0 or player.repair_bots_timer > 0:
            return
        player.repair_bots_cd = REPAIR_BOTS_CD
        player.repair_bots_timer = REPAIR_BOTS_DURATION
        self.effects.append({"type": "repair_bots", "playerId": player.id})

    def _use_bombardment(self, player: Player, x: float, z: float):
        if player.bombardment_cd > 0 or player.energy < BOMBARDMENT_ENERGY_COST:
            return
        player.bombardment_cd = BOMBARDMENT_CD
        player.energy -= BOMBARDMENT_ENERGY_COST
        x = max(-ARENA_SIZE, min(ARENA_SIZE, x))
        z = max(-ARENA_SIZE, min(ARENA_SIZE, z))
        zone = BombardmentZone(str(uuid.uuid4())[:8], player.id, x, z)
        self.bombardment_zones.append(zone)
        self.effects.append({"type": "bombardment_mark", "x": x, "z": z, "radius": BOMBARDMENT_RADIUS, "ownerId": player.id})

    # --- Leviathan Abilities ---
    def _use_bio_stasis(self, player: Player):
        if player.bio_stasis_cd > 0 or player.energy < BIO_STASIS_ENERGY:
            return
        nearest = self._find_nearest_enemy(player, max_range=BIO_STASIS_RANGE)
        if nearest is None:
            return
        player.bio_stasis_cd = BIO_STASIS_CD
        player.energy -= BIO_STASIS_ENERGY
        nearest.stun_timer = BIO_STASIS_DURATION
        nearest.is_firing = False
        nearest.has_move_target = False
        nearest.vx = 0.0
        nearest.vz = 0.0
        self.effects.append({
            "type": "bio_stasis",
            "playerId": player.id,
            "targetId": nearest.id,
            "x": nearest.x,
            "z": nearest.z
        })

    def _use_spore_cloud(self, player: Player, x: float, z: float):
        if player.spore_cloud_cd > 0 or player.energy < SPORE_CLOUD_ENERGY:
            return
        player.spore_cloud_cd = SPORE_CLOUD_CD
        player.energy -= SPORE_CLOUD_ENERGY
        x = max(-ARENA_SIZE, min(ARENA_SIZE, x))
        z = max(-ARENA_SIZE, min(ARENA_SIZE, z))
        cloud = SporeCloud(str(uuid.uuid4())[:8], player.id, x, z)
        self.spore_clouds.append(cloud)
        self.effects.append({
            "type": "spore_cloud_spawn",
            "x": x,
            "z": z,
            "radius": SPORE_CLOUD_RADIUS,
            "ownerId": player.id
        })

    def _use_spawn_mutalisks(self, player: Player):
        if player.mutalisk_cd > 0 or player.energy < MUTALISK_ENERGY:
            return
        player.mutalisk_cd = MUTALISK_CD
        player.energy -= MUTALISK_ENERGY
        for i in range(MUTALISK_SPAWN_COUNT):
            angle_offset = (i - 1) * 0.8
            spawn_x = player.x + math.sin(player.rotation + angle_offset) * 4
            spawn_z = player.z + math.cos(player.rotation + angle_offset) * 4
            mutalisk = Mutalisk(str(uuid.uuid4())[:8], player.id, spawn_x, spawn_z)
            self.mutalisks.append(mutalisk)
        self.effects.append({
            "type": "mutalisk_spawn",
            "playerId": player.id,
            "x": player.x,
            "z": player.z
        })

    def _use_bile_swell(self, player: Player, x: float, z: float):
        if player.bile_swell_cd > 0 or player.energy < BILE_SWELL_ENERGY:
            return
        player.bile_swell_cd = BILE_SWELL_CD
        player.energy -= BILE_SWELL_ENERGY
        x = max(-ARENA_SIZE, min(ARENA_SIZE, x))
        z = max(-ARENA_SIZE, min(ARENA_SIZE, z))
        # Immediate damage and debuff
        for other in self.players.values():
            if other.id == player.id or not other.alive:
                continue
            dist = math.sqrt((other.x - x) ** 2 + (other.z - z) ** 2)
            if dist < BILE_SWELL_RADIUS:
                self._apply_damage(other, BILE_SWELL_DAMAGE, player)
                other.armor_debuff_timer = BILE_SWELL_DEBUFF_DURATION
                other.armor_debuff_amount = BILE_SWELL_ARMOR_DEBUFF
        self.effects.append({
            "type": "bile_swell",
            "x": x,
            "z": z,
            "radius": BILE_SWELL_RADIUS,
            "ownerId": player.id
        })

    # --- Helpers ---
    def _find_nearest_enemy(self, player: Player, max_range: float = float('inf')) -> Optional[Player]:
        nearest = None
        nearest_dist = float('inf')
        for other in self.players.values():
            if other.id == player.id or not other.alive:
                continue
            dist = math.sqrt((other.x - player.x) ** 2 + (other.z - player.z) ** 2)
            if dist < nearest_dist and dist < max_range:
                nearest = other
                nearest_dist = dist
        return nearest

    def _update(self, dt: float):
        self.current_time += dt

        # Update each player
        for player in self.players.values():
            if not player.alive:
                player.respawn_timer -= dt
                if player.respawn_timer <= 0:
                    player.spawn()
                    self.effects.append({"type": "respawn", "playerId": player.id})
                continue

            # --- Stun handling (from Bio-Stasis) ---
            if player.stun_timer > 0:
                player.stun_timer -= dt
                player.vx = 0.0
                player.vz = 0.0
                player.is_firing = False
                player.has_move_target = False
                if player.stun_timer <= 0:
                    player.stun_timer = 0
                continue  # Skip all other updates while stunned

            # --- Slow debuff timer ---
            if player.slow_timer > 0:
                player.slow_timer -= dt
                if player.slow_timer <= 0:
                    player.slow_timer = 0
                    player.slow_amount = 0
                    player.in_spore_cloud = False

            # --- Armor debuff timer (from Bile Swell) ---
            if player.armor_debuff_timer > 0:
                player.armor_debuff_timer -= dt
                if player.armor_debuff_timer <= 0:
                    player.armor_debuff_timer = 0
                    player.armor_debuff_amount = 0

            # --- Leviathan: Bio-Regen passive ---
            if player.ship_class == "leviathan":
                time_since_damage = self.current_time - player.last_damage_time
                if time_since_damage >= BIO_REGEN_DELAY and player.hull < player.max_hull:
                    player.hull = min(player.max_hull, player.hull + BIO_REGEN_RATE * dt)

            # --- Dreadnought: Yamato channeling ---
            if player.is_channeling:
                player.channel_timer -= dt
                player.vx = 0.0
                player.vz = 0.0
                player.has_move_target = False
                if player.channel_timer <= 0:
                    target = self.players.get(player.channel_target_id)
                    if target and target.alive:
                        self._apply_damage(target, YAMATO_DAMAGE, player)
                        self.effects.append({
                            "type": "yamato_fire", "playerId": player.id, "targetId": target.id,
                            "startX": player.x, "startZ": player.z,
                            "endX": target.x, "endZ": target.z,
                        })
                    player.is_channeling = False
                    player.channel_target_id = None

            # --- Dreadnought: Repair Bots ---
            if player.repair_bots_timer > 0:
                player.repair_bots_timer -= dt
                heal = player.max_hull * REPAIR_BOTS_HEAL_PCT * dt
                player.hull = min(player.max_hull, player.hull + heal)

            # --- Movement physics ---
            if player.has_move_target and not player.is_channeling:
                dx = player.move_target_x - player.x
                dz = player.move_target_z - player.z
                dist_to_target = math.sqrt(dx * dx + dz * dz)
                if dist_to_target > 2.0:
                    desired_angle = math.atan2(dx, dz)
                    angle_diff = desired_angle - player.rotation
                    while angle_diff > math.pi:
                        angle_diff -= 2 * math.pi
                    while angle_diff < -math.pi:
                        angle_diff += 2 * math.pi
                    rotation_amount = SHIP_ROTATION_SPEED * dt
                    if abs(angle_diff) < rotation_amount:
                        player.rotation = desired_angle
                    else:
                        player.rotation += rotation_amount * (1 if angle_diff > 0 else -1)
                    player.rotation = player.rotation % (2 * math.pi)
                    thrust_x = math.sin(player.rotation) * SHIP_ACCELERATION
                    thrust_z = math.cos(player.rotation) * SHIP_ACCELERATION
                    player.vx += thrust_x
                    player.vz += thrust_z
                else:
                    player.has_move_target = False

            # Drag
            player.vx *= SHIP_DRAG
            player.vz *= SHIP_DRAG
            speed = math.sqrt(player.vx ** 2 + player.vz ** 2)
            if speed > SHIP_MAX_SPEED:
                player.vx = (player.vx / speed) * SHIP_MAX_SPEED
                player.vz = (player.vz / speed) * SHIP_MAX_SPEED

            # Position
            player.x += player.vx
            player.z += player.vz
            if abs(player.x) > ARENA_SIZE:
                player.x = max(-ARENA_SIZE, min(ARENA_SIZE, player.x))
                player.vx *= -0.5
            if abs(player.z) > ARENA_SIZE:
                player.z = max(-ARENA_SIZE, min(ARENA_SIZE, player.z))
                player.vz *= -0.5

            # Shield regen
            if player.shield_broken:
                player.shield_regen_timer -= dt
                if player.shield_regen_timer <= 0:
                    player.shield_broken = False
            if not player.shield_broken and player.shields < player.max_shields:
                player.shields = min(player.max_shields, player.shields + SHIELD_REGEN_RATE * dt)

            # Energy
            if player.is_firing:
                player.energy -= LASER_ENERGY_COST * dt
                if player.energy <= 0:
                    player.energy = 0
                    player.is_firing = False
            else:
                player.energy = min(player.max_energy, player.energy + ENERGY_REGEN_RATE * dt)

            # Cooldowns - Vanguard
            if player.warp_cooldown > 0:
                player.warp_cooldown = max(0, player.warp_cooldown - dt)
            if player.missile_cooldown > 0:
                player.missile_cooldown = max(0, player.missile_cooldown - dt)
            # Cooldowns - Dreadnought
            if player.emergency_shields_cd > 0:
                player.emergency_shields_cd = max(0, player.emergency_shields_cd - dt)
            if player.yamato_cd > 0:
                player.yamato_cd = max(0, player.yamato_cd - dt)
            if player.repair_bots_cd > 0:
                player.repair_bots_cd = max(0, player.repair_bots_cd - dt)
            if player.bombardment_cd > 0:
                player.bombardment_cd = max(0, player.bombardment_cd - dt)

        # --- Laser damage ---
        for player in self.players.values():
            if not player.alive or not player.is_firing:
                continue
            dx = player.fire_target_x - player.x
            dz = player.fire_target_z - player.z
            ray_len = math.sqrt(dx * dx + dz * dz)
            if ray_len < 0.1:
                continue
            ndx = dx / ray_len
            ndz = dz / ray_len
            for other in self.players.values():
                if other.id == player.id or not other.alive:
                    continue
                to_x = other.x - player.x
                to_z = other.z - player.z
                t = to_x * ndx + to_z * ndz
                if t < 0 or t > LASER_RANGE:
                    continue
                closest_x = player.x + ndx * t
                closest_z = player.z + ndz * t
                dist = math.sqrt((other.x - closest_x) ** 2 + (other.z - closest_z) ** 2)
                if dist < SHIP_RADIUS * 2.5:
                    self._apply_damage(other, LASER_DAMAGE * dt, player)

        # --- Missiles ---
        missiles_to_remove = []
        for missile in self.missiles:
            if not missile.alive:
                missiles_to_remove.append(missile)
                continue
            missile.lifetime -= dt
            if missile.lifetime <= 0:
                missile.alive = False
                missiles_to_remove.append(missile)
                continue
            target = self.players.get(missile.target_id)
            if not target or not target.alive:
                nearest = self._find_nearest_enemy_for_missile(missile)
                if nearest:
                    missile.target_id = nearest.id
                    target = nearest
                else:
                    missile.alive = False
                    missiles_to_remove.append(missile)
                    continue
            mdx = target.x - missile.x
            mdz = target.z - missile.z
            dist = math.sqrt(mdx * mdx + mdz * mdz)
            if dist < SHIP_RADIUS * 2:
                owner = self.players.get(missile.owner_id)
                self._apply_damage(target, MISSILE_DAMAGE, owner)
                missile.alive = False
                missiles_to_remove.append(missile)
                self.effects.append({"type": "explosion", "x": missile.x, "z": missile.z, "size": "small"})
            else:
                missile.x += (mdx / dist) * MISSILE_SPEED * dt
                missile.z += (mdz / dist) * MISSILE_SPEED * dt
        for m in missiles_to_remove:
            if m in self.missiles:
                self.missiles.remove(m)

        # --- Bombardment Zones ---
        zones_to_remove = []
        for zone in self.bombardment_zones:
            if zone.exploded:
                zones_to_remove.append(zone)
                continue
            zone.timer -= dt
            if zone.timer <= 0:
                zone.exploded = True
                owner = self.players.get(zone.owner_id)
                for player in self.players.values():
                    if player.id == zone.owner_id or not player.alive:
                        continue
                    dist = math.sqrt((player.x - zone.x) ** 2 + (player.z - zone.z) ** 2)
                    if dist < zone.radius:
                        self._apply_damage(player, BOMBARDMENT_DAMAGE, owner)
                self.effects.append({"type": "bombardment_explode", "x": zone.x, "z": zone.z, "radius": zone.radius})
                zones_to_remove.append(zone)
        for z in zones_to_remove:
            if z in self.bombardment_zones:
                self.bombardment_zones.remove(z)

    def _find_nearest_enemy_for_missile(self, missile: Missile) -> Optional[Player]:
        nearest = None
        nearest_dist = float('inf')
        for p in self.players.values():
            if p.id == missile.owner_id or not p.alive:
                continue
            d = math.sqrt((p.x - missile.x) ** 2 + (p.z - missile.z) ** 2)
            if d < nearest_dist:
                nearest = p
                nearest_dist = d
        return nearest

    def _apply_damage(self, target: Player, damage: float, attacker: Optional[Player] = None):
        if not target.alive:
            return
        # Dreadnought passive: Reinforced Hull - 15% damage reduction
        damage *= (1 - target.damage_reduction)

        if target.shields > 0:
            shield_dmg = min(target.shields, damage)
            target.shields -= shield_dmg
            damage -= shield_dmg
            if target.shields <= 0:
                target.shield_broken = True
                target.shield_regen_timer = SHIELD_REGEN_DELAY
        if damage > 0:
            target.hull -= damage
        if target.hull <= 0:
            target.hull = 0
            target.alive = False
            target.respawn_timer = RESPAWN_TIME
            target.deaths += 1
            target.is_firing = False
            target.is_channeling = False
            target.channel_target_id = None
            target.repair_bots_timer = 0
            if attacker:
                attacker.kills += 1
            self.effects.append({"type": "explosion", "x": target.x, "z": target.z, "size": "large"})
            self.effects.append({"type": "kill", "killer": attacker.name if attacker else "Unknown", "victim": target.name})

    async def _broadcast_state(self):
        state = {
            "type": "state",
            "tick": self.tick,
            "players": [p.to_dict() for p in self.players.values()],
            "missiles": [m.to_dict() for m in self.missiles if m.alive],
            "bombardments": [b.to_dict() for b in self.bombardment_zones if not b.exploded],
            "effects": self.effects.copy(),
        }
        self.effects.clear()
        state_json = json.dumps(state)
        disconnected = []
        # Create a copy of connections to avoid dictionary changed size during iteration
        connections_copy = dict(self.connections)
        for player_id, ws in connections_copy.items():
            try:
                await ws.send_text(state_json)
            except Exception:
                disconnected.append(player_id)
        for player_id in disconnected:
            self.remove_player(player_id)


class RoomManager:
    def __init__(self):
        self.rooms: Dict[str, GameRoom] = {}

    def get_or_create_room(self, room_id: str = "default") -> GameRoom:
        if room_id not in self.rooms:
            room = GameRoom(room_id)
            self.rooms[room_id] = room
            room.start()
        return self.rooms[room_id]

    def remove_empty_rooms(self):
        empty = [rid for rid, room in self.rooms.items() if not room.players]
        for rid in empty:
            self.rooms[rid].stop()
            del self.rooms[rid]


room_manager = RoomManager()
