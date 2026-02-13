import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Crosshair, Rocket } from 'lucide-react';

const NEBULA_BG = "https://images.unsplash.com/photo-1615392030676-6c532fe0c302?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjh8MHwxfHNlYXJjaHwxfHxzY2ktZmklMjBzcGFjZSUyMGJhY2tncm91bmQlMjBkaWdpdGFsJTIwYXJ0JTIwYmx1ZSUyMHB1cnBsZSUyMG5lYnVsYXxlbnwwfHx8fDE3NzA5Nzc0NzR8MA&ixlib=rb-4.1.0&q=85";

export default function LobbyPage() {
  const [name, setName] = useState('');
  const navigate = useNavigate();

  const handleLaunch = (e) => {
    e.preventDefault();
    if (name.trim()) {
      navigate('/game', { state: { playerName: name.trim() } });
    }
  };

  return (
    <div className="lobby-page" data-testid="lobby-page">
      <div className="lobby-bg" style={{ backgroundImage: `url(${NEBULA_BG})` }} />
      <div className="lobby-overlay" />
      <div className="lobby-content">
        <div className="lobby-card" data-testid="lobby-card">
          <div className="lobby-icon">
            <Crosshair size={48} strokeWidth={1} />
          </div>
          <h1 className="lobby-title">WARP BATTLE</h1>
          <p className="lobby-subtitle">TACTICAL SPACE COMBAT</p>
          <form onSubmit={handleLaunch}>
            <Input
              data-testid="callsign-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ENTER CALLSIGN"
              maxLength={20}
              autoFocus
            />
            <Button
              data-testid="launch-btn"
              type="submit"
              disabled={!name.trim()}
              className="lobby-launch-btn"
            >
              <Rocket className="mr-2" size={18} />
              LAUNCH
            </Button>
          </form>
          <div className="lobby-controls-info">
            <p><span className="key">LEFT CLICK</span> Move Ship</p>
            <p><span className="key">RIGHT CLICK</span> Fire Laser</p>
            <p><span className="key">Q</span> Warp Jump</p>
            <p><span className="key">W</span> Missile Barrage</p>
          </div>
        </div>
      </div>
    </div>
  );
}
