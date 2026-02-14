export default function HUD({ player }) {
  const isDreadnought = player.shipClass === 'dreadnought';
  const maxHull = player.maxHull || 100;
  const maxShields = player.maxShields || 100;
  const maxEnergy = player.maxEnergy || 100;

  const abilities = isDreadnought
    ? [
        { key: 'Q', name: 'SHIELDS', cd: player.emergencyShieldsCd || 0, maxCd: 20 },
        {
          key: 'W', name: 'YAMATO', cd: player.yamatoCd || 0, maxCd: 15,
          channeling: player.isChanneling,
          channelProgress: player.isChanneling ? 1 - ((player.channelTimer || 0) / 2) : 0,
        },
        { key: 'E', name: 'REPAIR', cd: player.repairBotsCd || 0, maxCd: 25 },
        { key: 'R', name: 'BOMBARD', cd: player.bombardmentCd || 0, maxCd: 45 },
      ]
    : [
        { key: 'Q', name: 'WARP', cd: player.warpCooldown || 0, maxCd: 3 },
        { key: 'W', name: 'MISSILES', cd: player.missileCooldown || 0, maxCd: 10 },
      ];

  return (
    <div className="hud" data-testid="game-hud">
      <div className="hud-status" data-testid="ship-status">
        {isDreadnought && (
          <div className="passive-indicator" data-testid="passive-indicator">
            <span>REINFORCED HULL</span>
            <span className="passive-value">-15% DMG</span>
          </div>
        )}
        <div className="stat-bar">
          <label>HULL</label>
          <div className="bar hull-bar" data-testid="hull-bar">
            <div style={{ width: `${(player.hull / maxHull) * 100}%` }} />
          </div>
          <span className="stat-value">{Math.round(player.hull)}</span>
        </div>
        <div className="stat-bar">
          <label>SHIELDS</label>
          <div className="bar shield-bar" data-testid="shield-bar">
            <div style={{ width: `${(player.shields / maxShields) * 100}%` }} />
          </div>
          <span className="stat-value">{Math.round(player.shields)}</span>
        </div>
        <div className="stat-bar">
          <label>ENERGY</label>
          <div className="bar energy-bar" data-testid="energy-bar">
            <div style={{ width: `${(player.energy / maxEnergy) * 100}%` }} />
          </div>
          <span className="stat-value">{Math.round(player.energy)}</span>
        </div>
        <div className="stat-kd" data-testid="kd-display">
          K: {player.kills} / D: {player.deaths}
        </div>
      </div>

      <div className="hud-abilities" data-testid="abilities-panel">
        {abilities.map((ab) => (
          <div
            key={ab.key}
            className={`ability ${ab.cd > 0 ? 'on-cooldown' : 'ready'} ${ab.channeling ? 'channeling' : ''}`}
            data-testid={`ability-${ab.key.toLowerCase()}`}
          >
            <div className="ability-key">{ab.key}</div>
            <div className="ability-name">{ab.name}</div>
            {ab.cd > 0 && !ab.channeling && (
              <div
                className="cooldown-overlay"
                style={{ height: `${(ab.cd / ab.maxCd) * 100}%` }}
              />
            )}
            {ab.channeling && (
              <div
                className="channel-progress"
                style={{ height: `${ab.channelProgress * 100}%` }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
