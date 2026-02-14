import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Crosshair, Rocket, Zap, Shield } from 'lucide-react';

const NEBULA_BG = "https://images.unsplash.com/photo-1615392030676-6c532fe0c302?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjh8MHwxfHNlYXJjaHwxfHxzY2ktZmklMjBzcGFjZSUyMGJhY2tncm91bmQlMjBkaWdpdGFsJTIwYXJ0JTIwYmx1ZSUyMHB1cnBsZSUyMG5lYnVsYXxlbnwwfHx8fDE3NzA5Nzc0NzR8MA&ixlib=rb-4.1.0&q=85";

export default function LobbyPage() {
  const [name, setName] = useState('');
  const [shipClass, setShipClass] = useState('vanguard');
  const navigate = useNavigate();

  const handleLaunch = (e) => {
    e.preventDefault();
    if (name.trim()) {
      navigate('/game', { state: { playerName: name.trim(), shipClass } });
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

          <div className="class-selection" data-testid="class-selection">
            <div
              className={`class-card ${shipClass === 'vanguard' ? 'selected' : ''}`}
              data-testid="class-vanguard"
              onClick={() => setShipClass('vanguard')}
            >
              <div className="class-icon"><Zap size={22} /></div>
              <h3>VANGUARD</h3>
              <p className="class-role">Strike Craft</p>
              <div className="class-abilities">
                <span>Q: Warp Jump</span>
                <span>W: Missiles</span>
              </div>
            </div>
            <div
              className={`class-card ${shipClass === 'dreadnought' ? 'selected' : ''}`}
              data-testid="class-dreadnought"
              onClick={() => setShipClass('dreadnought')}
            >
              <div className="class-icon"><Shield size={22} /></div>
              <h3>DREADNOUGHT</h3>
              <p className="class-role">Heavy Assault</p>
              <div className="class-abilities">
                <span>Q: Em. Shields</span>
                <span>W: Yamato</span>
                <span>E: Repair Bots</span>
                <span>R: Bombardment</span>
              </div>
              <div className="class-passive">-15% DMG TAKEN</div>
            </div>
          </div>

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
            <p><span className="key">Q / W / E / R</span> Abilities</p>
            <p><span className="key">MOUSE AIM</span> Aim Laser</p>
          </div>
        </div>
      </div>
    </div>
  );
}
