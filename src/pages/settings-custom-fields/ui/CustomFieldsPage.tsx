import { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { ENTITY_TYPE_OPTIONS, type EntityType } from '@shared/api';
import { Button, Card, Chip, ConfirmDialog, IconButton, Select, Tooltip, notify } from '@shared/ui';
import { useDocumentTitle } from '@shared/lib';
import { PageHeader } from '@widgets/page-header';
import {
  CUSTOM_FIELD_TYPE_LABELS,
  selectChoicesFromOptions,
  useDefinitionsQuery,
  useDeleteDefinition,
  type CustomFieldDefinition,
} from '@entities/custom-field';
import { CustomFieldDefinitionDialog } from '@features/manage-custom-field';

export function CustomFieldsPage() {
  useDocumentTitle('Custom fields');

  const [entityType, setEntityType] = useState<EntityType>('PROJECT');
  const { data, isLoading } = useDefinitionsQuery({ entity_type: entityType, order: 'asc' });
  const deleteMut = useDeleteDefinition();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomFieldDefinition | null>(null);
  const [deleting, setDeleting] = useState<CustomFieldDefinition | null>(null);

  const definitions = useMemo(
    () => [...(data?.items ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [data],
  );

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (d: CustomFieldDefinition) => {
    setEditing(d);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteMut.mutateAsync(deleting.id);
      notify.success('Field deleted', { description: deleting.label });
      setDeleting(null);
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Could not delete field');
    }
  };

  return (
    <>
      <PageHeader
        title="Custom fields"
        subtitle={'// per-entity field definitions'}
        actions={
          <Button leftIcon={<Plus size={14} aria-hidden />} onClick={openCreate}>
            New field
          </Button>
        }
      />

      <div className="mb-4">
        <Select
          label="Entity type"
          options={ENTITY_TYPE_OPTIONS}
          value={entityType}
          onChange={(e) => setEntityType(e.target.value as EntityType)}
          containerClassName="w-56"
        />
      </div>

      <Card>
        {isLoading ? (
          <p className="py-10 text-center text-sm text-fg-secondary">Loading…</p>
        ) : definitions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <p className="text-sm text-fg-secondary">No custom fields for this entity type</p>
            <Button leftIcon={<Plus size={14} aria-hidden />} onClick={openCreate}>
              New field
            </Button>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border-subtle">
            {definitions.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="w-8 shrink-0 font-mono text-[11px] text-fg-muted">{d.sort_order}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm text-fg-primary">{d.label}</span>
                      {d.is_required ? (
                        <Chip tone="warning" mono>
                          required
                        </Chip>
                      ) : null}
                    </div>
                    <span className="font-mono text-[11px] text-fg-muted">{d.field_key}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Chip tone="neutral" mono>
                    {CUSTOM_FIELD_TYPE_LABELS[d.field_type]}
                  </Chip>
                  {d.field_type === 'SELECT' ? (
                    <span className="hidden font-mono text-[11px] text-fg-muted sm:inline">
                      {selectChoicesFromOptions(d.options).join(', ') || '—'}
                    </span>
                  ) : null}
                  <Tooltip content="Edit">
                    <IconButton aria-label="Edit field" size="sm" onClick={() => openEdit(d)}>
                      <Pencil size={13} aria-hidden />
                    </IconButton>
                  </Tooltip>
                  <Tooltip content="Delete">
                    <IconButton aria-label="Delete field" size="sm" onClick={() => setDeleting(d)}>
                      <Trash2 size={13} aria-hidden />
                    </IconButton>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <CustomFieldDefinitionDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        entityType={entityType}
        definition={editing}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete field?"
        description={deleting ? `"${deleting.label}" and its values will be removed.` : undefined}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={confirmDelete}
      />
    </>
  );
}
