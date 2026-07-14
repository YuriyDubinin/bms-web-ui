import { useMemo, useState } from 'react';
import { Link2, Plus, Trash2 } from 'lucide-react';
import { ApiError, isExistsError } from '@shared/api';
import { Button, Card, Chip, IconButton, Input, Select, Tooltip, notify } from '@shared/ui';
import { useAllProjectsQuery } from '@entities/project';
import { useServicesQuery } from '@entities/service';
import { useAllClientsQuery, clientDisplayName } from '@entities/client';
import { useTasksQuery } from '@entities/task';
import { useCalendarEventsQuery } from '@entities/calendar-event';
import { useAllUsersQuery } from '@entities/user';
import {
  DEFAULT_RELATION_TYPE,
  ENTITY_TYPE_LABELS,
  ENTITY_TYPE_OPTIONS,
  useCreateLink,
  useDeleteLink,
  useLinksQuery,
  type EntityType,
} from '@entities/link';

export type LinkedEntitiesPanelProps = {
  /** ID текущей сущности — связи показываются с обеих сторон. */
  entityId: string;
  className?: string;
};

const BIG_PAGE = { page: 1, page_size: 100 } as const;

export function LinkedEntitiesPanel({ entityId, className }: LinkedEntitiesPanelProps) {
  const { data: linksData, isLoading } = useLinksQuery(entityId);
  const createMut = useCreateLink();
  const deleteMut = useDeleteLink();

  const { data: projectsData } = useAllProjectsQuery();
  const { data: servicesData } = useServicesQuery(BIG_PAGE);
  const { data: clientsData } = useAllClientsQuery();
  const { data: tasksData } = useTasksQuery(BIG_PAGE);
  const { data: eventsData } = useCalendarEventsQuery(BIG_PAGE);
  const { data: usersData } = useAllUsersQuery();

  const optionsByType = useMemo<Record<EntityType, { value: string; label: string }[]>>(
    () => ({
      PROJECT: (projectsData?.items ?? []).map((p) => ({ value: p.id, label: p.name })),
      SERVICE: (servicesData?.items ?? []).map((s) => ({ value: s.id, label: s.name })),
      CLIENT: (clientsData?.items ?? []).map((c) => ({ value: c.id, label: clientDisplayName(c) })),
      TASK: (tasksData?.items ?? []).map((t) => ({ value: t.id, label: t.title })),
      CALENDAR_EVENT: (eventsData?.items ?? []).map((e) => ({ value: e.id, label: e.title })),
      CUSTOMER_USER: (usersData?.items ?? []).map((u) => ({ value: u.id, label: u.full_name })),
    }),
    [projectsData, servicesData, clientsData, tasksData, eventsData, usersData],
  );

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const opts of Object.values(optionsByType)) {
      for (const o of opts) map.set(o.value, o.label);
    }
    return map;
  }, [optionsByType]);

  const [targetType, setTargetType] = useState<EntityType>('PROJECT');
  const [targetId, setTargetId] = useState('');
  const [relationType, setRelationType] = useState(DEFAULT_RELATION_TYPE);

  const targetOptions = optionsByType[targetType].filter((o) => o.value !== entityId);
  const links = linksData?.items ?? [];

  const handleAdd = async () => {
    if (!targetId) return;
    try {
      await createMut.mutateAsync({
        src_entity_id: entityId,
        dst_entity_id: targetId,
        relation_type: relationType.trim() || undefined,
      });
      setTargetId('');
      notify.success('Link created');
    } catch (err) {
      if (err instanceof ApiError && isExistsError(err.code)) {
        notify.error('Already linked');
        return;
      }
      notify.error(err instanceof Error ? err.message : 'Could not create link');
    }
  };

  const handleRemove = async (linkId: string) => {
    try {
      await deleteMut.mutateAsync(linkId);
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Could not remove link');
    }
  };

  return (
    <Card className={className}>
      <div className="mb-3 flex items-center gap-2">
        <Link2 size={14} aria-hidden className="text-fg-muted" />
        <h3 className="text-sm font-semibold text-fg-primary">Linked entities</h3>
      </div>

      <div className="flex flex-col gap-2">
        {isLoading ? (
          <p className="py-3 text-center text-xs text-fg-muted">Loading…</p>
        ) : links.length === 0 ? (
          <p className="py-3 text-center text-xs text-fg-muted">No links yet</p>
        ) : (
          links.map((l) => (
            <div
              key={l.link_id}
              className="flex items-center justify-between gap-2 rounded-md border border-border-subtle bg-bg-1 px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <Chip tone="accent" mono>
                  {ENTITY_TYPE_LABELS[l.linked_type]}
                </Chip>
                <span className="truncate text-sm text-fg-primary">
                  {nameById.get(l.linked_entity_id) ?? l.linked_entity_id}
                </span>
                <Chip tone="neutral" mono>
                  {l.relation_type}
                </Chip>
              </div>
              <Tooltip content="Remove link">
                <IconButton aria-label="Remove link" size="sm" onClick={() => handleRemove(l.link_id)}>
                  <Trash2 size={13} aria-hidden />
                </IconButton>
              </Tooltip>
            </div>
          ))
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-border-subtle pt-3">
        <Select
          label="Type"
          options={ENTITY_TYPE_OPTIONS}
          value={targetType}
          onChange={(e) => {
            setTargetType(e.target.value as EntityType);
            setTargetId('');
          }}
          containerClassName="w-40"
        />
        <Select
          label="Entity"
          placeholder="Select…"
          options={targetOptions}
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          containerClassName="min-w-[160px] flex-1"
        />
        <Input
          label="Relation"
          value={relationType}
          onChange={(e) => setRelationType(e.target.value)}
          containerClassName="w-36"
        />
        <Button
          leftIcon={<Plus size={14} aria-hidden />}
          disabled={!targetId || createMut.isPending}
          loading={createMut.isPending}
          onClick={handleAdd}
        >
          Link
        </Button>
      </div>
    </Card>
  );
}
