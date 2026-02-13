export default function HUD({ player }) {
  return (
    <div className="hud" data-testid="game-hud">
      <div className="hud-status" data-testid="ship-status">
        <div className="stat-bar">
          <label>HULL</label>
          <div className="bar hull-bar" data-testid="hull-bar">
            <div style={{ width: `${player.hull}%` }} />
          </div>
          <span className="stat-value">{Math.round(player.hull)}</span>
        </div>
        <div className="stat-bar">
          <label>SHIELDS</label>
          <div className="bar shield-bar" data-testid="shield-bar">
            <div style={{ width: `${player.shields}%` }} />
          </div>
          <span className="stat-value">{Math.round(player.shields)}</span>
        </div>
        <div className="stat-bar">
          <label>ENERGY</label>
          <div className="bar energy-bar" data-testid="energy-bar">
            <div style={{ width: `${player.energy}%` }} />
          </div>
          <span className="stat-value">{Math.round(player.energy)}</span>
        </div>
        <div className="stat-kd" data-testid="kd-display">
          K: {player.kills} / D: {player.deaths}
        </div>
      </div>

      <div className="hud-abilities" data-testid="abilities-panel">
        <div
          className={`ability ${player.warpCooldown > 0 ? 'on-cooldown' : 'ready'}`}
          data-testid="ability-warp"
        >
          <div className="ability-key">Q</div>
          <div className="ability-name">WARP</div>
          {player.warpCooldown > 0 && (
            <div
              className="cooldown-overlay"
              style={{ height: `${(player.warpCooldown / 3) * 100}%` }}
            />
          )}
        </div>
        <div
          className={`ability ${player.missileCooldown > 0 ? 'on-cooldown' : 'ready'}`}
          data-testid="ability-missile"
        >
          <div className="ability-key">W</div>
          <div className="ability-name">MISSILES</div>
          {player.missileCooldown > 0 && (
            <div
              className="cooldown-overlay"
              style={{ height: `${(player.missileCooldown / 10) * 100}%` }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
