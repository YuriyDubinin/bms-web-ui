import { AlertTriangle, KeyRound, RotateCw, ShieldCheck } from 'lucide-react';
import { ApiError } from '@shared/api';
import { Button, Chip, Dialog, Label, notify } from '@shared/ui';
import {
  describeServerInstallKey,
  useInstallServerKey,
  type Server,
} from '@entities/server';

export type ServerSshKeyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  server: Server;
};

/**
 * Модалка установки/переустановки публичного SSH-ключа приложения в authorized_keys
 * конкретного сервера. Аналог `SshKeyDialog` из Core, но для удалённой машины —
 * вместо генерации локального ключа здесь идёт его «доставка» на сервер по паролю
 * с последующей верификацией входа уже по ключу.
 */
export function ServerSshKeyDialog({ open, onOpenChange, server }: ServerSshKeyDialogProps) {
  const installed = !!server.ssh_key_installed;
  const mut = useInstallServerKey();
  const busy = mut.isPending;

  const close = (next: boolean) => {
    if (busy) return;
    onOpenChange(next);
  };

  const handleInstall = () => {
    if (busy) return;
    mut.mutate(server.id, {
      onSuccess: (res) => {
        const { tone, title } = describeServerInstallKey(res);
        notify[tone](title, { description: res.message, code: res.status });
      },
      onError: (err) => {
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
    <Dialog
      open={open}
      onOpenChange={close}
      title="App SSH key on server"
      description={installed ? 'Key is installed — you can re-add it any time' : 'Key is not yet on this server'}
      className="w-[min(94vw,520px)]"
      footer={
        <>
          <Button variant="ghost" onClick={() => close(false)} disabled={busy}>
            Close
          </Button>
          <Button
            loading={busy}
            leftIcon={installed ? <RotateCw size={14} aria-hidden /> : <KeyRound size={14} aria-hidden />}
            onClick={handleInstall}
          >
            {installed ? 'Reinstall key' : 'Install key'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Статус ключа на сервере */}
        <div className="flex items-center gap-2">
          {installed ? (
            <Chip tone="success">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck size={12} aria-hidden /> Installed
              </span>
            </Chip>
          ) : (
            <Chip tone="error">
              <span className="inline-flex items-center gap-1">
                <AlertTriangle size={12} aria-hidden /> Not installed
              </span>
            </Chip>
          )}
          <span className="font-mono text-xs text-fg-muted">{server.name}</span>
        </div>

        {/* Идентичность сервера */}
        <div className="flex flex-col gap-1.5">
          <Label>Target</Label>
          <p className="break-all font-mono text-xs text-fg-secondary">
            {server.username || 'root'}@{server.host}:{server.port}
          </p>
        </div>

        {/* Пояснение */}
        <div className="rounded-md border border-border-subtle bg-bg-2 p-3 text-xs text-fg-secondary">
          {installed ? (
            <>
              <p>
                <strong className="text-fg-primary">Reinstall</strong> rewrites the
                application&apos;s public key into{' '}
                <span className="font-mono">~/.ssh/authorized_keys</span> on this server and
                verifies key-based login. Safe to repeat — the key is deduplicated by its body,
                not the comment.
              </p>
              <p className="mt-2 text-fg-muted">
                Useful after rotating the app SSH key (Core / Main → SSH).
              </p>
            </>
          ) : (
            <>
              <p>
                Bootstraps key-based access: logs in with the server&apos;s stored password,
                appends the application&apos;s public key to{' '}
                <span className="font-mono">~/.ssh/authorized_keys</span>, then verifies that a
                pure key login works. Only after that the server is marked as «key installed».
              </p>
              <p className="mt-2 text-fg-muted">
                Requires the server to have a saved password and the app to have a valid SSH key.
              </p>
            </>
          )}
        </div>
      </div>
    </Dialog>
  );
}
