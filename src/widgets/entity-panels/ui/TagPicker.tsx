import { useMemo, useState } from 'react';
import { Settings2, Tag as TagIcon, X } from 'lucide-react';
import { Chip, IconButton, Select, Tooltip, notify } from '@shared/ui';
import { cn } from '@shared/lib';
import { useAttachTag, useDetachTag, useTagsQuery } from '@entities/tag';
import { TagManagerDialog } from '@features/manage-tag';

export type TagPickerProps = {
  entityId: string;
  className?: string;
};

export function TagPicker({ entityId, className }: TagPickerProps) {
  const { data: attachedData, isLoading } = useTagsQuery({ entity_id: entityId });
  const { data: allData } = useTagsQuery({ page_size: 100 });
  const attachMut = useAttachTag();
  const detachMut = useDetachTag();
  const [managerOpen, setManagerOpen] = useState(false);
  const [picking, setPicking] = useState('');

  const attached = useMemo(() => attachedData?.items ?? [], [attachedData]);
  const attachedIds = useMemo(() => new Set(attached.map((t) => t.id)), [attached]);
  const available = (allData?.items ?? []).filter((t) => !attachedIds.has(t.id));

  const handleAttach = async (tagId: string) => {
    try {
      await attachMut.mutateAsync({ tag_id: tagId, entity_id: entityId });
      setPicking('');
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Could not attach tag');
    }
  };

  const handleDetach = async (tagId: string) => {
    try {
      await detachMut.mutateAsync({ tag_id: tagId, entity_id: entityId });
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Could not remove tag');
    }
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <TagIcon size={13} aria-hidden className="text-fg-muted" />
      {isLoading ? (
        <span className="text-xs text-fg-muted">Loading…</span>
      ) : (
        attached.map((tag) => (
          <Chip key={tag.id} tone="accent" mono className="inline-flex items-center gap-1">
            {tag.color ? (
              <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
            ) : null}
            {tag.name}
            <button
              type="button"
              aria-label={`Remove tag ${tag.name}`}
              onClick={() => handleDetach(tag.id)}
              className="ml-0.5 inline-flex items-center justify-center text-accent/70 hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            >
              <X size={10} aria-hidden />
            </button>
          </Chip>
        ))
      )}

      {available.length > 0 ? (
        <Select
          aria-label="Attach tag"
          placeholder="Add tag…"
          options={available.map((t) => ({ value: t.id, label: t.name }))}
          value={picking}
          onChange={(e) => {
            setPicking(e.target.value);
            if (e.target.value) void handleAttach(e.target.value);
          }}
          containerClassName="w-32"
          className="h-6 py-0 text-xs"
        />
      ) : null}

      <Tooltip content="Manage tags">
        <IconButton aria-label="Manage tags" size="sm" onClick={() => setManagerOpen(true)}>
          <Settings2 size={13} aria-hidden />
        </IconButton>
      </Tooltip>

      <TagManagerDialog open={managerOpen} onOpenChange={setManagerOpen} />
    </div>
  );
}
