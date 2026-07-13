import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Boxes,
  RefreshCw,
  Search,
  Terminal as TerminalIcon,
} from 'lucide-react';
import { ApiError } from '@shared/api';
import { Button, Checkbox, Chip, Dialog, Input, Select, Spinner } from '@shared/ui';
import { cn } from '@shared/lib';
import { formatBytes } from '@entities/system';
import {
  useRemoteContainerLogsQuery,
  type ContainerLogsData,
} from '@entities/containers';

export type ContainerLogsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverId: string;
  /** Имя или ID контейнера. */
  container: string;
};

// ---------- Опции фильтров ----------

const TAIL_OPTIONS = [
  { value: '100', label: 'Last 100' },
  { value: '500', label: 'Last 500' },
  { value: '1000', label: 'Last 1000' },
  { value: '10000', label: 'Last 10000' },
  { value: '-1', label: 'All' },
];

const SINCE_OPTIONS = [
  { value: '', label: 'No time filter' },
  { value: '15m', label: 'Last 15 minutes' },
  { value: '1h', label: 'Last 1 hour' },
  { value: '6h', label: 'Last 6 hours' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
];

// Максимум строк, которые мы рендерим в DOM. Хвост (последние). Поверх — баннер.
const MAX_RENDERED_LINES = 5000;

// ---------- Парсинг и подсветка строк ----------

const TS_RE = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)\s+(.*)$/;

/**
 * Префикс времени в логах из `docker logs --timestamps` приходит в RFC3339 с
 * долями и `Z`: `2026-05-29T17:25:00.123Z`. Разбиваем на дату и время в UTC,
 * чтобы в UI показать компактно: на мобиле — только время до секунды,
 * на >= sm — дату + время. Без долей, без `T`/`Z`. Полный исходник остаётся
 * доступен в tooltip (`title`).
 */
function getLogTimestampParts(iso: string): { date: string; time: string } | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return {
    date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`,
  };
}

type LogLevel = 'error' | 'warn' | 'info' | 'debug' | null;

function detectLevel(text: string): LogLevel {
  if (/\b(error|err|fatal|panic|exception|fail(?:ed|ure)?)\b/i.test(text)) return 'error';
  if (/\b(warn|warning)\b/i.test(text)) return 'warn';
  if (/\b(info|notice)\b/i.test(text)) return 'info';
  if (/\b(debug|trace|verbose)\b/i.test(text)) return 'debug';
  return null;
}

const LEVEL_TEXT_CLASS: Record<NonNullable<LogLevel>, string> = {
  error: 'text-state-error',
  warn: 'text-state-warning',
  info: 'text-state-info',
  debug: 'text-fg-muted',
};

const LEVEL_BADGE_TONE: Record<NonNullable<LogLevel>, 'error' | 'warning' | 'info' | 'neutral'> = {
  error: 'error',
  warn: 'warning',
  info: 'info',
  debug: 'neutral',
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Разбивает строку на куски с подсветкой совпадений запроса как <mark>. */
function highlightSearch(text: string, q: string): React.ReactNode {
  if (!q) return text;
  const re = new RegExp(`(${escapeRegExp(q)})`, 'gi');
  const parts = text.split(re);
  return parts.map((p, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="rounded-sm bg-accent px-0.5 text-accent-on">
        {p}
      </mark>
    ) : (
      <Fragment key={i}>{p}</Fragment>
    ),
  );
}

function LogLine({
  line,
  search,
  stream,
}: {
  line: string;
  search: string;
  stream: 'stdout' | 'stderr';
}) {
  const tsMatch = line.match(TS_RE);
  const ts = tsMatch?.[1] ?? null;
  const rest = tsMatch?.[2] ?? line;
  const level = detectLevel(rest);
  // stderr автоматически = «warn-ish», но не перебиваем явный ERROR/WARN parser.
  const effectiveLevel = level ?? (stream === 'stderr' ? 'warn' : null);

  return (
    <div
      className={cn(
        'flex gap-2 px-2 py-0.5 font-mono text-[11px] leading-relaxed hover:bg-bg-2/60',
        effectiveLevel ? LEVEL_TEXT_CLASS[effectiveLevel] : 'text-fg-secondary',
      )}
    >
      {ts
        ? (() => {
            const parts = getLogTimestampParts(ts);
            if (!parts) return null;
            return (
              <span className="shrink-0 text-fg-muted" title={ts}>
                <span className="hidden sm:inline">{parts.date} </span>
                {parts.time}
              </span>
            );
          })()
        : null}
      {effectiveLevel ? (
        <span className="shrink-0">
          <Chip tone={LEVEL_BADGE_TONE[effectiveLevel]} mono>
            {effectiveLevel}
          </Chip>
        </span>
      ) : null}
      <span className="min-w-0 break-all whitespace-pre-wrap">
        {highlightSearch(rest, search)}
      </span>
    </div>
  );
}

// ---------- Pane (stdout / stderr) ----------

function StreamPane({
  title,
  stream,
  text,
  bytes,
  truncated,
  search,
}: {
  title: string;
  stream: 'stdout' | 'stderr';
  text: string;
  bytes: number;
  truncated: boolean;
  search: string;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Разбиваем на строки и фильтруем по поисковому запросу.
  const { lines, totalLines, matchedLines } = useMemo(() => {
    if (!text) return { lines: [] as string[], totalLines: 0, matchedLines: 0 };
    // Убираем пустую хвостовую строку, если файл оканчивается \n.
    const all = text.endsWith('\n') ? text.slice(0, -1).split('\n') : text.split('\n');
    const q = search.trim().toLowerCase();
    const filtered = q ? all.filter((l) => l.toLowerCase().includes(q)) : all;
    const head = filtered.length > MAX_RENDERED_LINES
      ? filtered.slice(filtered.length - MAX_RENDERED_LINES)
      : filtered;
    return { lines: head, totalLines: all.length, matchedLines: filtered.length };
  }, [text, search]);

  // Auto-scroll к хвосту при обновлении.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [text]);

  const truncatedByUs = matchedLines > MAX_RENDERED_LINES;

  return (
    <section className="flex min-h-0 flex-col gap-1.5">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <TerminalIcon
            size={12}
            aria-hidden
            className={cn(stream === 'stderr' ? 'text-state-warning' : 'text-state-success')}
          />
          <span
            className={cn(
              'font-mono text-[10px] uppercase tracking-wider',
              stream === 'stderr' ? 'text-state-warning' : 'text-fg-secondary',
            )}
          >
            {title}
          </span>
          <span className="font-mono text-[10px] text-fg-muted">
            {matchedLines}/{totalLines} lines · {formatBytes(bytes)}
          </span>
        </div>
        {truncated ? (
          <Chip tone="warning" mono>
            server-truncated
          </Chip>
        ) : null}
      </header>

      {truncated ? (
        <div className="flex items-start gap-2 rounded-md border border-state-warning/40 bg-state-warning-muted/30 px-2.5 py-2 text-[11px]">
          <AlertTriangle size={12} aria-hidden className="mt-0.5 shrink-0 text-state-warning" />
          <span className="text-fg-secondary">
            Показаны последние 10 MiB из {formatBytes(bytes)}. Используйте Tail / Since для уточнения.
          </span>
        </div>
      ) : null}

      {truncatedByUs ? (
        <div className="flex items-start gap-2 rounded-md border border-border-subtle bg-bg-2 px-2.5 py-2 text-[11px] text-fg-muted">
          <span>
            Render-truncated to last {MAX_RENDERED_LINES.toLocaleString()} of{' '}
            {matchedLines.toLocaleString()} matching lines.
          </span>
        </div>
      ) : null}

      <div
        ref={scrollRef}
        className={cn(
          'min-h-[120px] max-h-[60vh] flex-1 overflow-auto rounded-md border bg-bg-0 py-1',
          stream === 'stderr' ? 'border-state-warning/30' : 'border-border-subtle',
        )}
      >
        {lines.length === 0 ? (
          <p className="px-3 py-6 text-center font-mono text-[11px] text-fg-muted">
            {search ? 'No lines match the search' : '(empty)'}
          </p>
        ) : (
          lines.map((line, i) => <LogLine key={i} line={line} search={search} stream={stream} />)
        )}
      </div>
    </section>
  );
}

// ---------- Корневой диалог ----------

export function ContainerLogsDialog({
  open,
  onOpenChange,
  serverId,
  container,
}: ContainerLogsDialogProps) {
  const [tail, setTail] = useState('10000');
  const [since, setSince] = useState('');
  const [timestamps, setTimestamps] = useState(true);
  const [includeStderr, setIncludeStderr] = useState(true);
  const [search, setSearch] = useState('');

  // Сбрасываем фильтры/поиск при открытии модалки на свежем контейнере.
  useEffect(() => {
    if (open) {
      setSearch('');
    }
  }, [open, container]);

  const body = useMemo(
    () => ({
      server_id: serverId,
      container,
      tail: Number(tail),
      since: since || undefined,
      timestamps,
      include_stderr: includeStderr,
    }),
    [serverId, container, tail, since, timestamps, includeStderr],
  );

  const query = useRemoteContainerLogsQuery(body, open);
  const data = query.data;
  const isFetching = query.isFetching;
  const error = query.error;

  const logs: ContainerLogsData | undefined = data?.logs;

  // Шапка-описание: команда из бэка + статистика.
  const description = useMemo(() => {
    if (!data) return container;
    if (!data.connected) return `${data.status}: ${data.message}`;
    if (!logs?.available) return logs?.reason ?? data.message;
    const parts: string[] = [container];
    if (typeof logs.duration_ms === 'number') parts.push(`${logs.duration_ms} ms`);
    return parts.join(' · ');
  }, [data, logs, container]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isFetching) onOpenChange(next);
      }}
      title={`Logs · ${container}`}
      description={description}
      className="w-[min(96vw,1080px)]"
    >
      <div className="flex flex-col gap-3">
        {/* Тулбар */}
        <div className="flex flex-col gap-2 rounded-md border border-border-subtle bg-bg-1 p-2">
          <div className="flex flex-wrap items-end gap-2">
            <Input
              placeholder="Filter lines… (case-insensitive)"
              leftIcon={<Search size={14} aria-hidden />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Filter log lines"
              containerClassName="w-full sm:w-72"
            />
            <Select
              options={TAIL_OPTIONS}
              value={tail}
              onChange={(e) => setTail(e.target.value)}
              aria-label="Tail (number of lines)"
              containerClassName="w-40"
            />
            <Select
              options={SINCE_OPTIONS}
              value={since}
              onChange={(e) => setSince(e.target.value)}
              aria-label="Since (time filter)"
              containerClassName="w-48"
            />
            <Button
              variant="secondary"
              size="sm"
              leftIcon={
                <RefreshCw
                  size={13}
                  aria-hidden
                  className={isFetching ? 'animate-spin' : ''}
                />
              }
              loading={isFetching && !data}
              onClick={() => void query.refetch()}
              disabled={isFetching}
            >
              Refresh
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Checkbox
              label="Show timestamps"
              checked={timestamps}
              onChange={(e) => setTimestamps(e.target.checked)}
            />
            <Checkbox
              label="Include stderr"
              checked={includeStderr}
              onChange={(e) => setIncludeStderr(e.target.checked)}
            />
            {logs?.command ? (
              <span
                className="ml-auto max-w-full truncate font-mono text-[10px] text-fg-muted"
                title={logs.command}
              >
                $ {logs.command}
              </span>
            ) : null}
          </div>
        </div>

        {/* Состояние загрузки/ошибок/недоступности */}
        {isFetching && !data ? (
          <div className="flex items-center justify-center gap-2 rounded-md border border-border-subtle bg-bg-1 px-3 py-8">
            <Spinner size={16} label="Loading" />
            <span className="text-sm text-fg-secondary">Fetching logs…</span>
          </div>
        ) : !data ? (
          error ? (
            <div className="flex items-start gap-2 rounded-md border border-state-error/40 bg-state-error-muted/30 px-3 py-3">
              <AlertTriangle size={14} aria-hidden className="mt-0.5 shrink-0 text-state-error" />
              <span className="break-words text-xs text-fg-secondary">
                {error instanceof ApiError
                  ? `${error.code} · ${error.message}`
                  : error.message || 'Failed to load logs'}
              </span>
            </div>
          ) : null
        ) : !data.connected ? (
          <div className="flex flex-col items-center gap-2 rounded-md border border-state-error/40 bg-state-error-muted/30 px-3 py-6 text-center">
            <Boxes size={20} aria-hidden className="text-state-error" />
            <p className="font-mono text-xs uppercase tracking-wider text-state-error">
              {data.status}
            </p>
            <p className="max-w-md break-words text-xs text-fg-secondary">{data.message}</p>
          </div>
        ) : !logs?.available ? (
          <div className="flex flex-col items-center gap-2 rounded-md border border-state-error/40 bg-state-error-muted/30 px-3 py-6 text-center">
            <AlertTriangle size={20} aria-hidden className="text-state-error" />
            <p className="text-xs font-medium text-fg-primary">Logs unavailable</p>
            <p className="max-w-md break-words font-mono text-[11px] text-fg-muted">
              {logs?.reason ?? data.message}
            </p>
            {logs?.stderr ? (
              <pre className="mt-1 max-w-full overflow-auto rounded-md bg-bg-0 px-3 py-2 text-left font-mono text-[10px] text-state-error/90">
                {logs.stderr}
              </pre>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <StreamPane
              title="stdout"
              stream="stdout"
              text={logs.stdout}
              bytes={logs.bytes_stdout}
              truncated={logs.truncated_stdout}
              search={search}
            />
            {includeStderr && (logs.stderr ?? '') !== '' ? (
              <StreamPane
                title="stderr"
                stream="stderr"
                text={logs.stderr ?? ''}
                bytes={logs.bytes_stderr}
                truncated={logs.truncated_stderr}
                search={search}
              />
            ) : null}
          </div>
        )}
      </div>
    </Dialog>
  );
}
