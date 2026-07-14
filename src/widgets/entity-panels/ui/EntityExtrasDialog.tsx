import type { EntityType } from '@shared/api';
import { Dialog } from '@shared/ui';
import { TagPicker } from './TagPicker';
import { LinkedEntitiesPanel } from './LinkedEntitiesPanel';
import { DynamicFieldsForm } from './DynamicFieldsForm';

export type EntityExtrasDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  entityType: EntityType;
  entityId: string | null;
};

/**
 * Общий диалог "доп. атрибуты" сущности — теги, связи и кастомные поля.
 * Переиспользуется всеми страницами-списками (у сущностей нет отдельного get-by-id
 * роута в API, поэтому не строим полноценные detail-страницы для каждой из них).
 */
export function EntityExtrasDialog({ open, onOpenChange, title, entityType, entityId }: EntityExtrasDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} description="Tags, links & custom fields" className="w-[min(94vw,560px)]">
      {entityId ? (
        <div className="flex flex-col gap-4 pb-4">
          <TagPicker entityId={entityId} />
          <LinkedEntitiesPanel entityId={entityId} />
          <DynamicFieldsForm entityType={entityType} entityId={entityId} />
        </div>
      ) : null}
    </Dialog>
  );
}
