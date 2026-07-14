import { useEffect, useMemo, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import type { EntityType } from '@shared/api';
import { Button, Card, Checkbox, Input, Select, Textarea, notify } from '@shared/ui';
import { fromDateTimeLocalInput, toDateTimeLocalInput } from '@shared/lib';
import {
  selectChoicesFromOptions,
  useDefinitionsQuery,
  useSetValue,
  useUnsetValue,
  useValuesQuery,
  type CustomFieldDefinition,
} from '@entities/custom-field';

export type DynamicFieldsFormProps = {
  entityType: EntityType;
  entityId: string;
  className?: string;
};

type Draft = Record<string, string | boolean>;

function draftDefault(def: CustomFieldDefinition): string | boolean {
  return def.field_type === 'BOOLEAN' ? false : '';
}

function draftFromValue(def: CustomFieldDefinition, raw: unknown): string | boolean {
  if (raw == null) return draftDefault(def);
  if (def.field_type === 'BOOLEAN') return !!raw;
  if (def.field_type === 'DATETIME') return toDateTimeLocalInput(String(raw));
  if (def.field_type === 'JSON') return JSON.stringify(raw, null, 2);
  return String(raw);
}

export function DynamicFieldsForm({ entityType, entityId, className }: DynamicFieldsFormProps) {
  const { data: defsData, isLoading: defsLoading } = useDefinitionsQuery({ entity_type: entityType, order: 'asc' });
  const { data: valuesData, isLoading: valuesLoading } = useValuesQuery(entityId);
  const setMut = useSetValue();
  const unsetMut = useUnsetValue();

  const definitions = useMemo(
    () => [...(defsData?.items ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [defsData],
  );
  const valueByDefId = useMemo(() => {
    const map = new Map<string, unknown>();
    for (const v of valuesData?.items ?? []) map.set(v.field_definition_id, v.value);
    return map;
  }, [valuesData]);

  const [draft, setDraft] = useState<Draft>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next: Draft = {};
    for (const def of definitions) next[def.id] = draftFromValue(def, valueByDefId.get(def.id));
    setDraft(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- пересчитываем только когда реально сменился набор определений/значений
  }, [definitions, valueByDefId]);

  const isDirty = definitions.some((def) => {
    const current = draft[def.id];
    const original = draftFromValue(def, valueByDefId.get(def.id));
    return current !== original;
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const def of definitions) {
        const current = draft[def.id];
        const original = draftFromValue(def, valueByDefId.get(def.id));
        if (current === original) continue;

        if (def.field_type === 'BOOLEAN') {
          await setMut.mutateAsync({ entity_id: entityId, field_definition_id: def.id, value: !!current });
          continue;
        }

        const text = String(current).trim();
        if (!text) {
          await unsetMut.mutateAsync({ entity_id: entityId, field_definition_id: def.id });
          continue;
        }

        if (def.field_type === 'NUMBER') {
          const num = Number(text);
          if (Number.isNaN(num)) {
            notify.error(`"${def.label}" must be a number`);
            continue;
          }
          await setMut.mutateAsync({ entity_id: entityId, field_definition_id: def.id, value: num });
        } else if (def.field_type === 'DATETIME') {
          const iso = fromDateTimeLocalInput(text);
          if (!iso) {
            notify.error(`"${def.label}" has an invalid date/time`);
            continue;
          }
          await setMut.mutateAsync({ entity_id: entityId, field_definition_id: def.id, value: iso });
        } else if (def.field_type === 'JSON') {
          try {
            const parsed = JSON.parse(text);
            await setMut.mutateAsync({ entity_id: entityId, field_definition_id: def.id, value: parsed });
          } catch {
            notify.error(`"${def.label}" is not valid JSON`);
          }
        } else {
          await setMut.mutateAsync({ entity_id: entityId, field_definition_id: def.id, value: text });
        }
      }
      notify.success('Custom fields updated');
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Could not save custom fields');
    } finally {
      setSaving(false);
    }
  };

  if (!defsLoading && definitions.length === 0) return null;

  return (
    <Card className={className}>
      <div className="mb-3 flex items-center gap-2">
        <SlidersHorizontal size={14} aria-hidden className="text-fg-muted" />
        <h3 className="text-sm font-semibold text-fg-primary">Custom fields</h3>
      </div>

      {defsLoading || valuesLoading ? (
        <p className="py-3 text-center text-xs text-fg-muted">Loading…</p>
      ) : (
        <div className="flex flex-col gap-3">
          {definitions.map((def) => {
            const value = draft[def.id];
            if (def.field_type === 'BOOLEAN') {
              return (
                <Checkbox
                  key={def.id}
                  label={def.label}
                  hint={def.is_required ? 'Required' : undefined}
                  checked={!!value}
                  onChange={(e) => setDraft((d) => ({ ...d, [def.id]: e.target.checked }))}
                />
              );
            }
            if (def.field_type === 'SELECT') {
              const choices = selectChoicesFromOptions(def.options);
              return (
                <Select
                  key={def.id}
                  label={def.label}
                  required={def.is_required}
                  placeholder="—"
                  options={choices.map((c) => ({ value: c, label: c }))}
                  value={String(value)}
                  onChange={(e) => setDraft((d) => ({ ...d, [def.id]: e.target.value }))}
                />
              );
            }
            if (def.field_type === 'JSON') {
              return (
                <Textarea
                  key={def.id}
                  label={def.label}
                  required={def.is_required}
                  rows={3}
                  className="font-mono text-xs"
                  value={String(value)}
                  onChange={(e) => setDraft((d) => ({ ...d, [def.id]: e.target.value }))}
                />
              );
            }
            const inputType =
              def.field_type === 'DATE' ? 'date' : def.field_type === 'DATETIME' ? 'datetime-local' : def.field_type === 'NUMBER' ? 'text' : 'text';
            return (
              <Input
                key={def.id}
                label={def.label}
                required={def.is_required}
                type={inputType}
                inputMode={def.field_type === 'NUMBER' ? 'decimal' : undefined}
                value={String(value)}
                onChange={(e) => setDraft((d) => ({ ...d, [def.id]: e.target.value }))}
              />
            );
          })}

          <div className="flex justify-end border-t border-border-subtle pt-3">
            <Button loading={saving} disabled={!isDirty} onClick={handleSave}>
              Save fields
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
