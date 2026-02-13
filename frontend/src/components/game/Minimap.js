import { useEffect, useRef } from 'react';

export default function Minimap({ players, localPlayerId, arenaSize }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const scale = w / (arenaSize * 2);

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = 'rgba(2, 2, 4, 0.7)';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.08)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    const gridStep = w / 6;
    for (let i = gridStep; i < w; i += gridStep) {
      ctx.moveTo(i, 0); ctx.lineTo(i, h);
      ctx.moveTo(0, i); ctx.lineTo(w, i);
    }
    ctx.stroke();

    // Border
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);

    // Players
    for (const p of players) {
      if (!p.alive) continue;
      const x = (p.x + arenaSize) * scale;
      const y = (p.z + arenaSize) * scale;
      const isLocal = p.id === localPlayerId;

      ctx.beginPath();
      ctx.arc(x, y, isLocal ? 4 : 2.5, 0, Math.PI * 2);
      ctx.fillStyle = isLocal ? '#00f3ff' : '#ff3333';
      ctx.fill();

      if (isLocal) {
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }, [players, localPlayerId, arenaSize]);

  return (
    <div className="minimap-container" data-testid="minimap">
      <canvas ref={canvasRef} width={140} height={140} />
      <span className="minimap-label">RADAR</span>
    </div>
  );
}
