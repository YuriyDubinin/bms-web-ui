import { useMemo, useState } from 'react';
import { Boxes, Layers, Search } from 'lucide-react';
import { Card, Chip, Input, Skeleton } from '@shared/ui';
import { cn } from '@shared/lib';
import { formatBytes, formatRelative } from '@entities/system';
import type { ImageInfo, ImagesSnapshot } from '@entities/containers';
import { PanelTitle } from './PanelTitle';

export type ImagesListProps = {
  data: ImagesSnapshot | undefined;
  isLoading: boolean;
  error: Error | null;
};

function Unavailable({ reason }: { reason?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <Boxes size={20} aria-hidden className="text-fg-muted" />
      <p className="font-mono text-xs text-fg-muted">Docker images unavailable</p>
      {reason ? (
        <p className="max-w-md break-words font-mono text-[10px] leading-relaxed text-fg-muted/80">
          {reason}
        </p>
      ) : null}
    </div>
  );
}

function Loading() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

/** Сортировка: in-use → tagged-but-unused → dangling; внутри групп — по алфавиту тегов/ID. */
function sortImages(images: ImageInfo[]): ImageInfo[] {
  return [...images].sort((a, b) => {
    if (a.dangling !== b.dangling) return a.dangling ? 1 : -1;
    if ((a.containers > 0) !== (b.containers > 0)) return a.containers > 0 ? -1 : 1;
    const aKey = a.repo_tags?.[0] ?? a.short_id;
    const bKey = b.repo_tags?.[0] ?? b.short_id;
    return aKey.localeCompare(bKey);
  });
}

function ImageRow({ image }: { image: ImageInfo }) {
  const [labelsOpen, setLabelsOpen] = useState(false);
  const tags = image.repo_tags ?? [];
  const primaryTag = tags[0];
  const extraTags = tags.length - 1;
  const labels = image.labels ?? {};
  const labelEntries = Object.entries(labels);

  return (
    <li
      className={cn(
        'group flex flex-col gap-1.5 border-l-2 py-3 pl-3 pr-2 transition-colors',
        image.dangling
          ? 'border-l-state-warning bg-state-warning-muted/30'
          : image.containers > 0
            ? 'border-l-state-success/60 hover:bg-bg-1'
            : 'border-l-border-subtle hover:bg-bg-1',
      )}
    >
      {/* Шапка строки */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="flex min-w-0 items-center gap-2">
          {image.dangling ? (
            <Chip tone="warning" mono>
              dangling
            </Chip>
          ) : (
            <span className="truncate font-mono text-sm text-fg-primary">
              {primaryTag ?? image.short_id}
            </span>
          )}
          {extraTags > 0 ? (
            <span
              className="font-mono text-[10px] text-fg-muted"
              title={tags.slice(1).join('\n')}
            >
              +{extraTags} {extraTags === 1 ? 'tag' : 'tags'}
            </span>
          ) : null}
          <span className="font-mono text-[10px] text-fg-muted">{image.short_id}</span>
        </div>
        <div className="flex shrink-0 items-baseline gap-2 font-mono text-[11px] tabular-nums">
          <Chip tone={image.containers > 0 ? 'success' : 'neutral'} mono>
            {image.containers > 0 ? `${image.containers} in use` : 'unused'}
          </Chip>
          <span className="text-fg-secondary">{formatBytes(image.size_bytes)}</span>
          {image.shared_size && image.shared_size > 0 ? (
            <span className="text-fg-muted" title="Bytes shared with other images">
              · shared {formatBytes(image.shared_size)}
            </span>
          ) : null}
          <span className="text-fg-muted">· {formatRelative(image.created)}</span>
        </div>
      </div>

      {/* Лейблы — свёрнуты по умолчанию */}
      {labelEntries.length > 0 ? (
        <div className="flex flex-wrap items-baseline gap-1.5">
          <button
            type="button"
            onClick={() => setLabelsOpen((v) => !v)}
            className="font-mono text-[10px] uppercase tracking-wider text-fg-muted hover:text-fg-secondary"
          >
            labels ({labelEntries.length}) {labelsOpen ? '▾' : '▸'}
          </button>
          {labelsOpen
            ? labelEntries.map(([k, v]) => (
                <span
                  key={k}
                  className="inline-flex items-baseline gap-1 rounded-sm border border-border-subtle bg-bg-2 px-1.5 py-0.5 font-mono text-[10px]"
                  title={`${k}=${v}`}
                >
                  <span className="text-fg-muted">{k}</span>
                  <span className="text-fg-secondary">=</span>
                  <span className="max-w-[200px] truncate text-fg-primary">{v}</span>
                </span>
              ))
            : null}
        </div>
      ) : null}

      {/* Доп. теги, если несколько */}
      {extraTags > 0 ? (
        <div className="flex flex-wrap items-baseline gap-1">
          {tags.slice(1).map((tag) => (
            <Chip key={tag} tone="neutral" mono>
              {tag}
            </Chip>
          ))}
        </div>
      ) : null}
    </li>
  );
}

/**
 * Детальный список Docker-образов сервера с поиском по тегу / ID / digest / лейблу.
 * Презентационная панель — данные поставляются извне.
 *
 * Слева у каждой строки цветная полоса:
 *  - 🟩 зелёная — используется ≥1 контейнером (intro: ведёт к контейнерам),
 *  - 🟨 жёлтая — dangling (можно удалять),
 *  - ⬜ серая  — просто лежит в кеше.
 */
export function ImagesList({ data, isLoading, error }: ImagesListProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const all = data?.images ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return sortImages(all);
    return sortImages(
      all.filter((img) => {
        if (img.short_id.toLowerCase().includes(q)) return true;
        if (img.id.toLowerCase().includes(q)) return true;
        if (img.repo_tags?.some((t) => t.toLowerCase().includes(q))) return true;
        if (img.repo_digests?.some((d) => d.toLowerCase().includes(q))) return true;
        if (img.labels) {
          for (const [k, v] of Object.entries(img.labels)) {
            if (k.toLowerCase().includes(q) || v.toLowerCase().includes(q)) return true;
          }
        }
        return false;
      }),
    );
  }, [data, search]);

  const total = data?.count ?? 0;

  return (
    <Card className="flex flex-col gap-4">
      <PanelTitle
        title="Images"
        subtitle={`// ${total} on host`}
        actions={
          data ? (
            <Chip tone={data.available ? 'success' : 'error'} mono>
              {data.available ? 'AVAILABLE' : 'UNAVAILABLE'}
            </Chip>
          ) : undefined
        }
      />

      <Input
        placeholder="Search by tag, ID, digest or label…"
        leftIcon={<Search size={14} aria-hidden />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Search images"
      />

      {isLoading && !data ? (
        <Loading />
      ) : !data ? (
        <div className="py-8 text-center font-mono text-xs text-fg-muted">
          {error instanceof Error ? error.message : 'Failed to load images'}
        </div>
      ) : !data.available ? (
        <Unavailable reason={data.reason} />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
          <Layers size={20} aria-hidden className="text-fg-muted" />
          <p className="font-mono text-xs text-fg-muted">
            {search ? 'No images match the search' : 'No images on this host'}
          </p>
        </div>
      ) : (
        <ul className="max-h-[480px] divide-y divide-border-subtle overflow-y-auto rounded-md border border-border-subtle bg-bg-0/30">
          {filtered.map((img) => (
            <ImageRow key={img.id} image={img} />
          ))}
        </ul>
      )}
    </Card>
  );
}
