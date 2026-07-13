import { useEffect, useState } from 'react';

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatUtc(date: Date): string {
  return (
    `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())} ` +
    `${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(date.getUTCSeconds())} UTC`
  );
}

export function UtcClock() {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const iso = now.toISOString();
  return (
    <time className="font-mono text-[10px] text-fg-muted" dateTime={iso}>
      {formatUtc(now)}
    </time>
  );
}
