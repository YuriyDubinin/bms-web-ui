import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { ApiError, isExistsError } from '@shared/api';
import { Button, ConfirmDialog, Dialog, IconButton, Input, Tooltip, notify } from '@shared/ui';
import { useCreateTag, useDeleteTag, useTagsQuery, useUpdateTag, type Tag } from '@entities/tag';
import { tagFormSchema, type TagFormValues } from '../model/schema';

export type TagManagerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const FORM_ID = 'tag-manager-form';

export function TagManagerDialog({ open, onOpenChange }: TagManagerDialogProps) {
  const { data, isLoading } = useTagsQuery({ page_size: 100 });
  const createMut = useCreateTag();
  const updateMut = useUpdateTag();
  const deleteMut = useDeleteTag();
  const [editing, setEditing] = useState<Tag | null>(null);
  const [deleting, setDeleting] = useState<Tag | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TagFormValues>({
    resolver: zodResolver(tagFormSchema),
    defaultValues: { name: '', color: '' },
  });

  useEffect(() => {
    if (!open) {
      setEditing(null);
      reset({ name: '', color: '' });
    }
  }, [open, reset]);

  const startEdit = (tag: Tag) => {
    setEditing(tag);
    reset({ name: tag.name, color: tag.color ?? '' });
  };

  const cancelEdit = () => {
    setEditing(null);
    reset({ name: '', color: '' });
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, name: values.name.trim(), color: values.color.trim() || undefined });
        notify.success('Tag updated');
      } else {
        await createMut.mutateAsync({ name: values.name.trim(), color: values.color.trim() || undefined });
        notify.success('Tag created');
      }
      cancelEdit();
    } catch (err) {
      if (err instanceof ApiError) {
        if (isExistsError(err.code)) {
          setError('name', { type: 'server', message: 'Tag already exists' });
          return;
        }
        if (err.code === 'VALIDATION_ERROR' && err.details) {
          for (const d of err.details) {
            if (d.field === 'name' || d.field === 'color') setError(d.field, { type: 'server', message: d.message });
          }
          return;
        }
        notify.error(err.message || 'Request failed', { code: err.code });
        return;
      }
      notify.error('Something went wrong');
    }
  });

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteMut.mutateAsync(deleting.id);
      notify.success('Tag deleted', { description: deleting.name });
      setDeleting(null);
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Could not delete tag');
    }
  };

  const tags = data?.items ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Manage tags" className="w-[min(94vw,480px)]">
      <div className="flex flex-col gap-4 pb-4">
        <form id={FORM_ID} onSubmit={onSubmit} noValidate className="flex items-end gap-2">
          <Input
            label="Name"
            error={errors.name?.message}
            disabled={isSubmitting}
            containerClassName="flex-1"
            {...register('name')}
          />
          <Input
            label="Color"
            placeholder="#22d3ee"
            error={errors.color?.message}
            disabled={isSubmitting}
            containerClassName="w-32"
            {...register('color')}
          />
          {editing ? (
            <Button variant="ghost" type="button" onClick={cancelEdit} disabled={isSubmitting}>
              <X size={14} aria-hidden />
            </Button>
          ) : null}
          <Button type="submit" loading={isSubmitting} leftIcon={editing ? undefined : <Plus size={14} aria-hidden />}>
            {editing ? 'Save' : 'Add'}
          </Button>
        </form>

        <div className="flex flex-col gap-1.5">
          {isLoading ? (
            <p className="py-3 text-center text-xs text-fg-muted">Loading…</p>
          ) : tags.length === 0 ? (
            <p className="py-3 text-center text-xs text-fg-muted">No tags yet</p>
          ) : (
            tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border-subtle bg-bg-1 px-3 py-1.5"
              >
                <span className="inline-flex items-center gap-2">
                  <span
                    aria-hidden
                    className="inline-block h-2.5 w-2.5 rounded-full border border-border-subtle"
                    style={{ backgroundColor: tag.color || 'transparent' }}
                  />
                  <span className="text-sm text-fg-primary">{tag.name}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Tooltip content="Edit">
                    <IconButton aria-label="Edit tag" size="sm" onClick={() => startEdit(tag)}>
                      <Pencil size={13} aria-hidden />
                    </IconButton>
                  </Tooltip>
                  <Tooltip content="Delete">
                    <IconButton aria-label="Delete tag" size="sm" onClick={() => setDeleting(tag)}>
                      <Trash2 size={13} aria-hidden />
                    </IconButton>
                  </Tooltip>
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => {
          if (!o) setDeleting(null);
        }}
        title="Delete tag?"
        description={deleting ? `"${deleting.name}" will be removed from all entities.` : undefined}
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
      />
    </Dialog>
  );
}
