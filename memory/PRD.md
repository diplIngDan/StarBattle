# Warp Battle - PRD

## Problem Statement
3D top-down multiplayer space combat game inspired by Star Battle using Babylon.js for rendering and WebSocket for real-time multiplayer. Ships move on XZ plane, heavy/tactical feel with drift physics.

## Architecture
- **Frontend**: React + Babylon.js (3D engine) + Tailwind CSS
- **Backend**: FastAPI + WebSocket (server-authoritative game loop at 20Hz)
- **Database**: MongoDB (available for future leaderboards)
- **Networking**: WebSocket for real-time game state sync

## Core Requirements
- Top-down 3D space arena with stars, grid, boundary
- Click-to-move with physics (mass, drag, slow rotation)
- Right-click laser beam weapon (drains energy)
- Multiple ship classes with unique abilities
- Hull/Shields/Energy system
- Shield regen with broken-shield delay
- Multiplayer with real-time state sync
- Death/respawn cycle (10s respawn)
- Kill feed, minimap, HUD

## What's Been Implemented (Feb 14, 2026)

### Ship Classes
1. **Vanguard** (Strike Craft) - Hull 100, Shields 100, Energy 100
   - Q: Warp Jump (teleport forward, 40 energy, 3s CD)
   - W: Missile Barrage (5 seeking missiles, 10s CD)

2. **Dreadnought** (Heavy Assault) - Hull 150, Shields 200, Energy 100
   - Passive: Reinforced Hull (-15% damage taken)
   - Q: Emergency Shields (restore 300 shields, 20s CD)
   - W: Yamato Cannon (2s channel, 150 burst damage, 15s CD)
   - E: Repair Bots (5% hull/sec for 6s, 25s CD)
   - R: Orbital Bombardment (AoE zone, 3s delay, 120 damage, 80 energy, 45s CD)

### Features
- Class selection in lobby
- Full 3D arena with Babylon.js (ships, beams, missiles, explosions, particles)
- Server-authoritative physics (20Hz tick rate)
- WebSocket multiplayer
- HUD with dynamic ability display per class
- Minimap radar
- Kill feed
- Respawn overlay
- Move indicator (torus on ground)
- Glow effects (GlowLayer)
- Particle effects (explosions, warp, shield flash, repair bots, bombardment)

## Prioritized Backlog
- P0: Add more ship classes (Support/Healer, Interceptor/Assassin)
- P1: Leaderboard with MongoDB persistence
- P2: Multiple game rooms with room browser
- P3: Sound effects and music
- P4: Ship customization/skins
- P5: Team-based game modes
