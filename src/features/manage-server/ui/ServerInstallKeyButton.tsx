import { KeyRound, RotateCw } from 'lucide-react';
import { ApiError } from '@shared/api';
import { IconButton, Spinner, Tooltip, notify } from '@shared/ui';
import {
  describeServerInstallKey,
  useInstallServerKey,
  type Server,
} from '@entities/server';

export type ServerInstallKeyButtonProps = {
  server: Server;
  size?: 'sm' | 'md' | 'lg';
};

/**
 * Кнопка установки SSH-ключа приложения в authorized_keys сервера.
 * Иконка зависит от текущего флага `ssh_key_installed`:
 *  - false/undefined → KeyRound (Install)
 *  - true            → RotateCw (Reinstall)
 *
 * При успехе сервер сам обновляет `ssh_key_installed`/`last_status`/`last_checked_at`
 * — инвалидируем список, чтобы изменения сразу отразились в UI. Сетевые/auth-провалы
 * возвращаются как 200 OK с подробностями в теле, поэтому интерпретируем результат
 * через `describeServerInstallKey` и показываем соответствующий toast.
 */
export function ServerInstallKeyButton({ server, size = 'sm' }: ServerInstallKeyButtonProps) {
  const mut = useInstallServerKey();
  const installed = !!server.ssh_key_installed;
  const Icon = installed ? RotateCw : KeyRound;
  const label = installed ? 'Reinstall app SSH key' : 'Install app SSH key';

  const handle = () => {
    if (mut.isPending) return;
    mut.mutate(server.id, {
      onSuccess: (res) => {
        const { tone, title } = describeServerInstallKey(res);
        notify[tone](title, { description: res.message, code: res.status });
      },
      onError: (err) => {
        // 422: либо у сервера нет пароля для бутстрапа, либо нет ключа приложения.
        if (err instanceof ApiError) {
          if (err.code === 'VALIDATION_ERROR' && err.details && err.details.length > 0) {
            const d = err.details[0];
            if (d?.field === 'password') {
              notify.error('Server has no password', {
                description: 'Add a password (edit the server) to bootstrap key install.',
                code: 'PASSWORD_REQUIRED',
              });
              return;
            }
            if (d?.field === 'ssh_key') {
              notify.error('App SSH key is missing', {
                description: 'Generate it in Core / Main → SSH key indicator.',
                code: 'SSH_KEY_MISSING',
              });
              return;
            }
            notify.error(d?.message ?? 'Install failed', { code: err.code });
            return;
          }
          notify.error(err.message || 'Install failed', { code: err.code });
          return;
        }
        notify.error('Install failed');
      },
    });
  };

  return (
    <Tooltip content={label}>
      <IconButton
        aria-label={label}
        size={size}
        onClick={handle}
        disabled={mut.isPending}
        aria-busy={mut.isPending || undefined}
      >
        {mut.isPending ? (
          <Spinner size={13} label={installed ? 'Reinstalling' : 'Installing'} />
        ) : (
          <Icon
            size={13}
            aria-hidden
            className={installed ? 'text-accent' : 'text-accent drop-shadow-[0_0_4px_currentColor]'}
          />
        )}
      </IconButton>
    </Tooltip>
  );
}
