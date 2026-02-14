from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import json
from pathlib import Path

from game_engine import room_manager, ARENA_SIZE

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@api_router.get("/")
async def root():
    return {"message": "Warp Battle Server Online"}


@api_router.get("/rooms")
async def get_rooms():
    rooms = []
    for room in room_manager.rooms.values():
        rooms.append({
            "id": room.id,
            "playerCount": len(room.players),
            "playerNames": [p.name for p in room.players.values()]
        })
    return rooms


app.include_router(api_router)


@app.websocket("/api/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await websocket.accept()
    name = websocket.query_params.get("name", "Pilot")
    ship_class = websocket.query_params.get("ship_class", "vanguard")
    player_id = str(uuid.uuid4())[:8]

    room = room_manager.get_or_create_room(room_id)
    player = room.add_player(player_id, name, websocket, ship_class)

    try:
        await websocket.send_json({
            "type": "init",
            "playerId": player_id,
            "arenaSize": ARENA_SIZE,
            "shipClass": ship_class,
        })

        room.effects.append({"type": "player_joined", "name": name})

        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                room.queue_message(player_id, msg)
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        player_obj = room.players.get(player_id)
        player_name = player_obj.name if player_obj else "Unknown"
        room.remove_player(player_id)
        room.effects.append({"type": "player_left", "name": player_name})
        if not room.players:
            room_manager.remove_empty_rooms()


app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown():
    for room in room_manager.rooms.values():
        room.stop()
    client.close()
