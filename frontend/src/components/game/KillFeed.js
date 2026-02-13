export default function KillFeed({ events }) {
  if (!events || events.length === 0) return null;

  return (
    <div className="kill-feed" data-testid="kill-feed">
      {events.slice(0, 6).map((event, i) => (
        <div
          key={`${event.killer}-${event.victim}-${i}`}
          className="kill-entry"
          style={{ opacity: 1 - i * 0.12 }}
        >
          <span className="killer">{event.killer}</span>
          <span className="separator"> &gt; </span>
          <span className="victim">{event.victim}</span>
        </div>
      ))}
    </div>
  );
}
