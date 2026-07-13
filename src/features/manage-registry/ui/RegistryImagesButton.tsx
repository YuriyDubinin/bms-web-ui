import { useState } from 'react';
import { Layers } from 'lucide-react';
import { IconButton, Tooltip } from '@shared/ui';
import type { Registry } from '@entities/registry';
import { RegistryImagesDialog } from './RegistryImagesDialog';

export type RegistryImagesButtonProps = {
  registry: Registry;
  size?: 'sm' | 'md' | 'lg';
};

/** Кнопка «Образы» — открывает модалку со списком образов реестра и поиском. */
export function RegistryImagesButton({ registry, size = 'sm' }: RegistryImagesButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Tooltip content="View images">
        <IconButton aria-label="View images" size={size} onClick={() => setOpen(true)}>
          <Layers size={13} aria-hidden />
        </IconButton>
      </Tooltip>
      <RegistryImagesDialog open={open} onOpenChange={setOpen} registry={registry} />
    </>
  );
}
