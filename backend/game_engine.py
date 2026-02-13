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

# Combat Constants
MAX_HULL = 100.0
MAX_SHIELDS = 100.0
MAX_ENERGY = 100.0
SHIELD_REGEN_RATE = 8.0
SHIELD_REGEN_DELAY = 5.0
ENERGY_REGEN_RATE = 8.0
LASER_DAMAGE = 20.0
LASER_ENERGY_COST = 15.0
LASER_RANGE = 80.0
WARP_DISTANCE = 25.0
WARP_ENERGY_COST = 40.0
WARP_COOLDOWN = 3.0
MISSILE_DAMAGE = 12.0
MISSILE_SPEED = 10.0
MISSILE_COUNT = 5
MISSILE_COOLDOWN = 10.0
MISSILE_LIFETIME = 5.0
RESPAWN_TIME = 10.0


class Player:
    def __init__(self, player_id: str, name: str):
        self.id = player_id
        self.name = name
        self.x = 0.0
        self.z = 0.0
        self.rotation = 0.0
        self.vx = 0.0
        self.vz = 0.0
        self.hull = MAX_HULL
        self.shields = MAX_SHIELDS
        self.energy = MAX_ENERGY
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
        self.warp_cooldown = 0.0
        self.missile_cooldown = 0.0
        self.kills = 0
        self.deaths = 0

    def spawn(self):
        self.x = random.uniform(-ARENA_SIZE * 0.7, ARENA_SIZE * 0.7)
        self.z = random.uniform(-ARENA_SIZE * 0.7, ARENA_SIZE * 0.7)
        self.rotation = random.uniform(0, math.pi * 2)
        self.vx = 0.0
        self.vz = 0.0
        self.hull = MAX_HULL
        self.shields = MAX_SHIELDS
        self.energy = MAX_ENERGY
        self.alive = True
        self.is_firing = False
        self.shield_broken = False
        self.shield_regen_timer = 0.0
        self.has_move_target = False
        self.respawn_timer = 0.0

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "x": round(self.x, 2),
            "z": round(self.z, 2),
            "rotation": round(self.rotation, 3),
            "vx": round(self.vx, 3),
            "vz": round(self.vz, 3),
            "hull": round(self.hull, 1),
            "shields": round(self.shields, 1),
            "energy": round(self.energy, 1),
            "alive": self.alive,
            "isFiring": self.is_firing,
            "fireTargetX": round(self.fire_target_x, 2),
            "fireTargetZ": round(self.fire_target_z, 2),
            "respawnTimer": round(self.respawn_timer, 1),
            "warpCooldown": round(self.warp_cooldown, 1),
            "missileCooldown": round(self.missile_cooldown, 1),
            "kills": self.kills,
            "deaths": self.deaths,
        }


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


class GameRoom:
    def __init__(self, room_id: str):
        self.id = room_id
        self.players: Dict[str, Player] = {}
        self.missiles: List[Missile] = []
        self.effects: List[dict] = []
        self.connections: Dict[str, any] = {}
        self.running = False
        self.tick = 0
        self._task = None
        self._pending_messages: List[tuple] = []

    def add_player(self, player_id: str, name: str, websocket) -> Player:
        player = Player(player_id, name)
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
                if ability_id == "warp":
                    self._use_warp(player)
                elif ability_id == "missile":
                    self._use_missiles(player)

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
        self.effects.append({
            "type": "warp",
            "playerId": player.id,
            "x": player.x,
            "z": player.z,
        })

    def _use_missiles(self, player: Player):
        if player.missile_cooldown > 0:
            return
        player.missile_cooldown = MISSILE_COOLDOWN

        nearest = None
        nearest_dist = float('inf')
        for other in self.players.values():
            if other.id == player.id or not other.alive:
                continue
            dist = math.sqrt((other.x - player.x)**2 + (other.z - player.z)**2)
            if dist < nearest_dist:
                nearest = other
                nearest_dist = dist

        if nearest is None:
            return

        for i in range(MISSILE_COUNT):
            angle_offset = (i - MISSILE_COUNT // 2) * 0.3
            missile = Missile(
                str(uuid.uuid4())[:8],
                player.id,
                player.x + math.sin(player.rotation + angle_offset) * 2,
                player.z + math.cos(player.rotation + angle_offset) * 2,
                nearest.id
            )
            self.missiles.append(missile)

    def _update(self, dt: float):
        for player in self.players.values():
            if not player.alive:
                player.respawn_timer -= dt
                if player.respawn_timer <= 0:
                    player.spawn()
                    self.effects.append({"type": "respawn", "playerId": player.id})
                continue

            # Movement physics
            if player.has_move_target:
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

            # Clamp speed
            speed = math.sqrt(player.vx ** 2 + player.vz ** 2)
            if speed > SHIP_MAX_SPEED:
                player.vx = (player.vx / speed) * SHIP_MAX_SPEED
                player.vz = (player.vz / speed) * SHIP_MAX_SPEED

            # Update position
            player.x += player.vx
            player.z += player.vz

            # Arena bounds
            if abs(player.x) > ARENA_SIZE:
                player.x = max(-ARENA_SIZE, min(ARENA_SIZE, player.x))
                player.vx *= -0.5
            if abs(player.z) > ARENA_SIZE:
                player.z = max(-ARENA_SIZE, min(ARENA_SIZE, player.z))
                player.vz *= -0.5

            # Shield regeneration
            if player.shield_broken:
                player.shield_regen_timer -= dt
                if player.shield_regen_timer <= 0:
                    player.shield_broken = False

            if not player.shield_broken and player.shields < MAX_SHIELDS:
                player.shields = min(MAX_SHIELDS, player.shields + SHIELD_REGEN_RATE * dt)

            # Energy
            if player.is_firing:
                player.energy -= LASER_ENERGY_COST * dt
                if player.energy <= 0:
                    player.energy = 0
                    player.is_firing = False
            else:
                player.energy = min(MAX_ENERGY, player.energy + ENERGY_REGEN_RATE * dt)

            # Cooldowns
            if player.warp_cooldown > 0:
                player.warp_cooldown = max(0, player.warp_cooldown - dt)
            if player.missile_cooldown > 0:
                player.missile_cooldown = max(0, player.missile_cooldown - dt)

        # Laser damage
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

        # Missiles
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
                nearest = None
                nearest_dist = float('inf')
                for p in self.players.values():
                    if p.id == missile.owner_id or not p.alive:
                        continue
                    d = math.sqrt((p.x - missile.x) ** 2 + (p.z - missile.z) ** 2)
                    if d < nearest_dist:
                        nearest = p
                        nearest_dist = d
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
                self.effects.append({
                    "type": "explosion",
                    "x": missile.x,
                    "z": missile.z,
                    "size": "small"
                })
            else:
                missile.x += (mdx / dist) * MISSILE_SPEED * dt
                missile.z += (mdz / dist) * MISSILE_SPEED * dt

        for m in missiles_to_remove:
            if m in self.missiles:
                self.missiles.remove(m)

    def _apply_damage(self, target: Player, damage: float, attacker: Optional[Player] = None):
        if not target.alive:
            return

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

            if attacker:
                attacker.kills += 1

            self.effects.append({
                "type": "explosion",
                "x": target.x,
                "z": target.z,
                "size": "large",
            })
            self.effects.append({
                "type": "kill",
                "killer": attacker.name if attacker else "Unknown",
                "victim": target.name,
            })

    async def _broadcast_state(self):
        state = {
            "type": "state",
            "tick": self.tick,
            "players": [p.to_dict() for p in self.players.values()],
            "missiles": [m.to_dict() for m in self.missiles if m.alive],
            "effects": self.effects.copy(),
        }
        self.effects.clear()

        state_json = json.dumps(state)

        disconnected = []
        for player_id, ws in self.connections.items():
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
