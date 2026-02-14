import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import GameCanvas from '@/components/game/GameCanvas';
import HUD from '@/components/game/HUD';
import KillFeed from '@/components/game/KillFeed';
import Minimap from '@/components/game/Minimap';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const WS_URL = BACKEND_URL.replace(/^http/, 'ws');

export default function GamePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const playerName = location.state?.playerName;
  const shipClass = location.state?.shipClass || 'vanguard';

  const [connected, setConnected] = useState(false);
  const [playerId, setPlayerId] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [arenaSize, setArenaSize] = useState(300);
  const [killEvents, setKillEvents] = useState([]);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!playerName) {
      navigate('/');
      return;
    }

    const ws = new WebSocket(
      `${WS_URL}/api/ws/default?name=${encodeURIComponent(playerName)}&ship_class=${shipClass}`
    );
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'init') {
          setPlayerId(msg.playerId);
          setArenaSize(msg.arenaSize);
        } else if (msg.type === 'state') {
          setGameState(msg);
          const kills = (msg.effects || []).filter(e => e.type === 'kill');
          if (kills.length > 0) {
            setKillEvents(prev => [...kills, ...prev].slice(0, 10));
          }
        }
      } catch (err) {
        console.error('WS parse error:', err);
      }
    };

    return () => ws.close();
  }, [playerName, shipClass, navigate]);

  const sendMessage = useCallback((msg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const localPlayer = gameState?.players?.find(p => p.id === playerId);

  return (
    <div className="game-container" data-testid="game-page">
      <GameCanvas
        gameState={gameState}
        playerId={playerId}
        arenaSize={arenaSize}
        onSendMessage={sendMessage}
      />
      {localPlayer && <HUD player={localPlayer} />}
      <Minimap
        players={gameState?.players || []}
        localPlayerId={playerId}
        arenaSize={arenaSize}
      />
      <KillFeed events={killEvents} />
      {localPlayer && !localPlayer.alive && (
        <div className="respawn-overlay" data-testid="respawn-overlay">
          <h2>DESTROYED</h2>
          <div className="timer">RESPAWNING IN {Math.ceil(localPlayer.respawnTimer)}s</div>
          <div className="hint">Prepare for re-entry</div>
        </div>
      )}
      {!connected && playerId && (
        <div className="disconnect-overlay" data-testid="disconnect-overlay">
          <p>CONNECTION LOST</p>
          <button onClick={() => navigate('/')}>RETURN TO HANGAR</button>
        </div>
      )}
      {!connected && !playerId && (
        <div className="connecting-overlay" data-testid="connecting-overlay">
          <p>ESTABLISHING LINK...</p>
        </div>
      )}
    </div>
  );
}
