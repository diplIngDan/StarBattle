export default function HUD({ player }) {
  const isDreadnought = player.shipClass === 'dreadnought';
  const isLeviathan = player.shipClass === 'leviathan';
  const maxHull = player.maxHull || 100;
  const maxShields = player.maxShields || 100;
  const maxEnergy = player.maxEnergy || 100;

  let abilities = [];
  let passiveInfo = null;

  if (isDreadnought) {
    abilities = [
      { key: 'Q', name: 'SHIELDS', cd: player.emergencyShieldsCd || 0, maxCd: 20 },
      {
        key: 'W', name: 'YAMATO', cd: player.yamatoCd || 0, maxCd: 15,
        channeling: player.isChanneling,
        channelProgress: player.isChanneling ? 1 - ((player.channelTimer || 0) / 2) : 0,
      },
      { key: 'E', name: 'REPAIR', cd: player.repairBotsCd || 0, maxCd: 25 },
      { key: 'R', name: 'BOMBARD', cd: player.bombardmentCd || 0, maxCd: 45 },
    ];
    passiveInfo = { name: 'REINFORCED HULL', value: '-15% DMG' };
  } else if (isLeviathan) {
    abilities = [
      { key: 'Q', name: 'STASIS', cd: player.bioStasisCd || 0, maxCd: 12 },
      { key: 'W', name: 'SPORES', cd: player.sporeCloudCd || 0, maxCd: 18 },
      { key: 'E', name: 'MUTALISKS', cd: player.mutaliskCd || 0, maxCd: 30 },
      { key: 'R', name: 'BILE', cd: player.bileSwellCd || 0, maxCd: 50 },
    ];
    passiveInfo = { name: 'BIO-REGEN', value: 'HEAL/5s' };
  } else {
    // Vanguard
    abilities = [
      { key: 'Q', name: 'WARP', cd: player.warpCooldown || 0, maxCd: 3 },
      { key: 'W', name: 'MISSILES', cd: player.missileCooldown || 0, maxCd: 10 },
    ];
  }

  // Status debuffs
  const isStunned = (player.stunTimer || 0) > 0;
  const isSlowed = (player.slowTimer || 0) > 0;
  const hasArmorDebuff = (player.armorDebuffTimer || 0) > 0;

  return (
    <div className={`hud ${isLeviathan ? 'leviathan-hud' : ''}`} data-testid="game-hud">
      <div className="hud-status" data-testid="ship-status">
        {passiveInfo && (
          <div className={`passive-indicator ${isLeviathan ? 'leviathan-passive-ind' : ''}`} data-testid="passive-indicator">
            <span>{passiveInfo.name}</span>
            <span className="passive-value">{passiveInfo.value}</span>
          </div>
        )}
        {(isStunned || isSlowed || hasArmorDebuff) && (
          <div className="debuff-indicators" data-testid="debuff-indicators">
            {isStunned && <span className="debuff stunned">STUNNED</span>}
            {isSlowed && <span className="debuff slowed">SLOWED</span>}
            {hasArmorDebuff && <span className="debuff armor-debuff">-ARMOR</span>}
          </div>
        )}
        <div className="stat-bar">
          <label>HULL</label>
          <div className={`bar hull-bar ${isLeviathan ? 'leviathan-hull' : ''}`} data-testid="hull-bar">
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
          <div className={`bar energy-bar ${isLeviathan ? 'leviathan-energy' : ''}`} data-testid="energy-bar">
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
            className={`ability ${ab.cd > 0 ? 'on-cooldown' : 'ready'} ${ab.channeling ? 'channeling' : ''} ${isLeviathan ? 'leviathan-ability' : ''}`}
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
