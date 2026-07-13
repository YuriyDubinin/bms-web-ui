import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { IconButton, Tooltip } from '@shared/ui';
import { cn } from '@shared/lib';
import type { Server } from '@entities/server';
import { ServerSshKeyDialog } from './ServerSshKeyDialog';

export type ServerSshKeyIndicatorProps = {
  server: Server;
};

/**
 * Индикатор «установлен ли публичный SSH-ключ приложения на этом сервере».
 * Визуально и поведенчески — точный аналог `SshKeyIndicator` из Core:
 *  - зелёный (акцент со свечением) — ключ установлен, клик открывает модалку «reinstall»;
 *  - красный — ключ не установлен, клик открывает модалку «install».
 */
export function ServerSshKeyIndicator({ server }: ServerSshKeyIndicatorProps) {
  const [open, setOpen] = useState(false);
  const installed = !!server.ssh_key_installed;
  const tooltip = installed
    ? 'App SSH key installed — view & reinstall'
    : 'App SSH key not installed — click to install';

  return (
    <>
      <Tooltip content={tooltip}>
        <IconButton
          aria-label={tooltip}
          size="sm"
          onClick={() => setOpen(true)}
          className={cn(
            'border',
            installed
              ? 'border-accent/40 bg-accent-muted'
              : 'border-state-error/40 bg-state-error-muted',
          )}
        >
          <KeyRound
            size={13}
            aria-hidden
            className={
              installed
                ? 'text-accent drop-shadow-[0_0_5px_currentColor]'
                : 'text-state-error'
            }
          />
        </IconButton>
      </Tooltip>

      <ServerSshKeyDialog open={open} onOpenChange={setOpen} server={server} />
    </>
  );
}
