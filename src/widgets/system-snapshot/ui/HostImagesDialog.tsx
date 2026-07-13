import { useEffect, useMemo, useState } from 'react';
import { Boxes, Image as ImageIcon, Search } from 'lucide-react';
import { ApiError } from '@shared/api';
import { Chip, Dialog, Input, Spinner } from '@shared/ui';
import { cn } from '@shared/lib';
import { formatBytes, formatRelative } from '@entities/system';
import { useImagesQuery, type ImageInfo, type ImagesSnapshot } from '@entities/containers';

export type HostImagesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Если передан — строки в списке становятся кликабельными, и клик по строке
   * вызывает колбэк (а вызывающая сторона обычно закрывает диалог).
   */
  onSelect?: (image: ImageInfo) => void;
};

function sortImages(images: ImageInfo[]): ImageInfo[] {
  return [...images].sort((a, b) => {
    if (a.dangling !== b.dangling) return a.dangling ? 1 : -1;
    if ((a.containers > 0) !== (b.containers > 0)) return a.containers > 0 ? -1 : 1;
    const aKey = a.repo_tags?.[0] ?? a.short_id;
    const bKey = b.repo_tags?.[0] ?? b.short_id;
    return aKey.localeCompare(bKey);
  });
}

function ImageRow({
  image,
  onSelect,
}: {
  image: ImageInfo;
  onSelect?: (img: ImageInfo) => void;
}) {
  const [labelsOpen, setLabelsOpen] = useState(false);
  const tags = image.repo_tags ?? [];
  const primaryTag = tags[0];
  const extraTags = tags.length - 1;
  const labels = image.labels ?? {};
  const labelEntries = Object.entries(labels);
  const interactive = !!onSelect;
  const handlePick = () => onSelect?.(image);

  return (
    <li
      className={cn(
        'border-t border-border-subtle py-3 first:border-t-0',
        interactive &&
          '-mx-2 cursor-pointer rounded-md px-2 transition-colors hover:bg-bg-2 focus-visible:bg-bg-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
      )}
      onClick={interactive ? handlePick : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handlePick();
              }
            }
          : undefined
      }
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? `Select image ${primaryTag ?? image.short_id}` : undefined}
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

      {/* Доп. теги, если несколько */}
      {extraTags > 0 ? (
        <div className="mt-2 flex flex-wrap items-baseline gap-1">
          {tags.slice(1).map((tag) => (
            <Chip key={tag} tone="neutral" mono>
              {tag}
            </Chip>
          ))}
        </div>
      ) : null}

      {/* Дайджесты */}
      {image.repo_digests && image.repo_digests.length > 0 ? (
        <div className="mt-2 flex flex-col gap-0.5">
          {image.repo_digests.map((d) => (
            <span
              key={d}
              className="block truncate font-mono text-[10px] text-fg-muted"
              title={d}
            >
              {d}
            </span>
          ))}
        </div>
      ) : null}

      {/* Лейблы — свёрнуты по умолчанию */}
      {labelEntries.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-baseline gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLabelsOpen((v) => !v);
            }}
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
    </li>
  );
}

function Body({
  isLoading,
  error,
  data,
  search,
  onSelect,
}: {
  isLoading: boolean;
  error: unknown;
  data: ImagesSnapshot | undefined;
  search: string;
  onSelect?: (img: ImageInfo) => void;
}) {
  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-fg-secondary">
        <Spinner size={16} /> <span className="text-sm">Loading images…</span>
      </div>
    );
  }
  if (error && !data) {
    const msg = error instanceof ApiError ? error.message : 'Failed to load images.';
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <Boxes size={18} aria-hidden className="text-state-error" />
        <p className="max-w-md text-sm text-fg-secondary">{msg}</p>
      </div>
    );
  }
  if (data && !data.available) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <Boxes size={18} aria-hidden className="text-fg-muted" />
        <p className="font-mono text-xs text-fg-muted">Docker unavailable</p>
        {data.reason ? (
          <p className="max-w-md break-words font-mono text-[10px] leading-relaxed text-fg-muted/80">
            {data.reason}
          </p>
        ) : null}
      </div>
    );
  }

  const all = data?.images ?? [];
  const q = search.trim().toLowerCase();
  const filtered = sortImages(
    !q
      ? all
      : all.filter((img) => {
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

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <ImageIcon size={18} aria-hidden className="text-fg-muted" />
        <p className="font-mono text-xs text-fg-muted">
          {q ? 'No images match your search.' : 'No images on host.'}
        </p>
      </div>
    );
  }

  return (
    <ul>
      {filtered.map((img) => (
        <ImageRow key={img.id} image={img} onSelect={onSelect} />
      ))}
    </ul>
  );
}

/**
 * Модалка с Docker-образами на машине, где работает API (GET /api/system/images/list).
 * Открывается селект-кнопкой «Images» — устроена по аналогии с RegistryImagesDialog:
 * поиск сверху + детальные строки образов (тег, short_id, размер, created, лейблы,
 * дайджесты, счётчик использующих контейнеров, метка `dangling`).
 */
export function HostImagesDialog({ open, onOpenChange, onSelect }: HostImagesDialogProps) {
  const [search, setSearch] = useState('');
  const { data, isLoading, isFetching, error } = useImagesQuery();

  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  const subtitle = useMemo(() => {
    if (!data) return 'Loading…';
    if (!data.available) return data.reason ?? 'Docker unavailable';
    const total = data.count;
    return `${total} image${total === 1 ? '' : 's'} on host`;
  }, [data]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Host images"
      description={subtitle}
      className="w-[min(94vw,640px)]"
    >
      <div className="flex flex-col gap-3">
        <Input
          placeholder="Search by tag, ID, digest or label…"
          leftIcon={<Search size={14} aria-hidden />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search images"
          disabled={isLoading && !data}
        />
        <Body
          isLoading={isLoading || isFetching}
          error={error}
          data={data}
          search={search}
          onSelect={onSelect}
        />
      </div>
    </Dialog>
  );
}
