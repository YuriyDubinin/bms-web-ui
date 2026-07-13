import { useEffect, useMemo, useState } from 'react';
import { Download, Image as ImageIcon, Lock, Search, Star } from 'lucide-react';
import { ApiError } from '@shared/api';
import { Chip, Dialog, Input, Spinner } from '@shared/ui';
import { cn } from '@shared/lib';
import {
  useRegistryImagesQuery,
  type Registry,
  type RegistryImage,
  type RegistryImagesResponse,
} from '@entities/registry';

export type RegistryImagesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registry: Registry;
  /**
   * Если передан — строки списка становятся кликабельными, и клик по строке
   * вызывает колбэк (вызывающая сторона обычно закрывает диалог).
   */
  onSelect?: (image: RegistryImage) => void;
};

function fmtNum(n?: number): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

function fmtDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code as string) {
      case 'REGISTRY_AUTH_FAILED':
        return 'Registry rejected credentials. Check login/password.';
      case 'REGISTRY_UNREACHABLE':
        return 'Registry unreachable. Check URL and network.';
      case 'REGISTRY_UNSUPPORTED':
        return 'No namespace set, or registry does not support listing.';
      case 'REGISTRY_NOT_FOUND':
        return 'Registry not found.';
      default:
        return err.message || 'Failed to load images.';
    }
  }
  return 'Failed to load images.';
}

function ImageRow({
  image,
  onSelect,
}: {
  image: RegistryImage;
  onSelect?: (img: RegistryImage) => void;
}) {
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
      aria-label={interactive ? `Select image ${image.name}` : undefined}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 truncate">
          <span className="truncate font-mono text-sm text-fg-primary">{image.name}</span>
          {image.is_private != null ? (
            <Chip tone={image.is_private ? 'warning' : 'neutral'} mono>
              {image.is_private ? 'private' : 'public'}
            </Chip>
          ) : null}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
          {image.tag_count} tag{image.tag_count === 1 ? '' : 's'}
        </span>
      </div>

      {image.tags.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {image.tags.map((t) => (
            <Chip key={t} tone="accent" mono>
              {t}
            </Chip>
          ))}
        </div>
      ) : null}

      {image.description ? (
        <p className="mt-2 line-clamp-2 text-xs text-fg-secondary">{image.description}</p>
      ) : null}

      {/* DockerHub-метрики (для registry_v2 отсутствуют — скрываем) */}
      {image.pull_count != null || image.star_count != null || image.last_updated ? (
        <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[11px] text-fg-muted">
          {image.pull_count != null ? (
            <span className="inline-flex items-center gap-1">
              <Download size={11} aria-hidden /> {fmtNum(image.pull_count)}
            </span>
          ) : null}
          {image.star_count != null ? (
            <span className="inline-flex items-center gap-1">
              <Star size={11} aria-hidden /> {fmtNum(image.star_count)}
            </span>
          ) : null}
          {image.last_updated ? <span>updated {fmtDate(image.last_updated)}</span> : null}
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
  data: RegistryImagesResponse | undefined;
  search: string;
  onSelect?: (img: RegistryImage) => void;
}) {
  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-fg-secondary">
        <Spinner size={16} /> <span className="text-sm">Loading images…</span>
      </div>
    );
  }
  if (error && !data) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <Lock size={18} aria-hidden className="text-state-error" />
        <p className="max-w-md text-sm text-fg-secondary">{errorMessage(error)}</p>
      </div>
    );
  }
  const images = data?.images ?? [];
  const q = search.trim().toLowerCase();
  const filtered = q ? images.filter((i) => i.name.toLowerCase().includes(q)) : images;

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <ImageIcon size={18} aria-hidden className="text-fg-muted" />
        <p className="font-mono text-xs text-fg-muted">
          {q ? 'No images match your search.' : 'No images found.'}
        </p>
      </div>
    );
  }

  return (
    <ul>
      {filtered.map((img) => (
        <ImageRow key={img.name} image={img} onSelect={onSelect} />
      ))}
    </ul>
  );
}

export function RegistryImagesDialog({
  open,
  onOpenChange,
  registry,
  onSelect,
}: RegistryImagesDialogProps) {
  const [search, setSearch] = useState('');
  const { data, isLoading, isFetching, error } = useRegistryImagesQuery(registry.id, open);

  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  const subtitle = useMemo(() => {
    if (!data) return `${registry.url}`;
    const shown = data.count;
    const total = data.total;
    return `${data.namespace} · ${shown}${total > shown ? ` of ${total}` : ''} image${shown === 1 ? '' : 's'} · ${data.source}`;
  }, [data, registry.url]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Images — ${registry.name}`}
      description={subtitle}
      className="w-[min(94vw,640px)]"
    >
      <div className="flex flex-col gap-3">
        <Input
          placeholder="Search images by name…"
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
