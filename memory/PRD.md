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

3. **Leviathan** (Bio-Organic) - Hull 180, Shields 120, Energy 120
   - Passive: Bio-Regen (heal hull after 5s without taking damage)
   - Q: Bio-Stasis (stun target for 2.5s, 30 energy, 12s CD)
   - W: Spore Cloud (AoE slow zone, 50% slow, 5s duration, 40 energy, 18s CD)
   - E: Spawn Mutalisks (3 AI-controlled attackers, 12s lifetime, 50 energy, 30s CD)
   - R: Bile Swell (AoE damage + 25% armor debuff for 6s, 100 damage, 85 energy, 50s CD)

### Features
- Class selection in lobby (3 ship classes)
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
- Leviathan visual effects (bio-stasis web, spore cloud, mutalisk spawn, bile swell)
- Debuff indicators (stunned, slowed, armor debuff)

## File Structure
```
/app
├── backend/
│   ├── .env
│   ├── requirements.txt
│   ├── server.py       # FastAPI app hosting WebSocket game rooms
│   ├── game_engine.py  # Core game logic (Ship classes, abilities, game loop)
│   └── tests/
│       └── test_leviathan.py
├── frontend/
│   ├── .env
│   ├── package.json
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── App.js          # Main router
│       ├── App.css         # Game styles
│       ├── index.css       # Base styles
│       ├── pages/
│       │   ├── LobbyPage.js   # Ship selection
│       │   └── GamePage.js    # Game container
│       └── components/
│           └── game/
│               ├── GameCanvas.js  # Babylon.js 3D rendering
│               ├── HUD.js         # Ship status and abilities
│               ├── KillFeed.js    # Kill notifications
│               └── Minimap.js     # Radar display
├── memory/
│   └── PRD.md
└── test_reports/
    ├── iteration_1.json
    └── iteration_2.json
```

## Prioritized Backlog

### P0 (Completed)
- [x] Core multiplayer game foundation
- [x] Vanguard ship class
- [x] Dreadnought ship class  
- [x] Leviathan ship class

### P1 (Future)
- [ ] Leaderboard with MongoDB persistence
- [ ] Multiple game rooms with room browser
- [ ] Sound effects and music

### P2 (Future)
- [ ] Additional ship classes (Support/Healer, Interceptor/Assassin)
- [ ] Ship customization/skins
- [ ] Team-based game modes

## Testing Status
- Backend: 100% (16/16 pytest tests passed)
- Frontend: 100% (all UI tests passed)
- Test files: `/app/backend/tests/test_leviathan.py`, `/app/test_reports/iteration_2.json`

## Key Technical Details
- WebSocket URL: `/api/ws/{room_id}?name={name}&ship_class={class}`
- Game tick rate: 20Hz
- Arena size: 300 units
- Ship physics: high mass, low drag, slow rotation for tactical feel
