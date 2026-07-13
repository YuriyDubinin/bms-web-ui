import { useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, Check, Copy, KeyRound } from 'lucide-react';
import { Button, Chip, Dialog, Label, Spinner, notify } from '@shared/ui';
import { copyToClipboard } from '@shared/lib';
import {
  formatIsoUtc,
  useCreateSshKey,
  useDeleteSshKey,
  useSshCheckQuery,
  type SshKeyInfo,
  type SshKeyState,
} from '@entities/system';

export type SshKeyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const DESCRIPTION: Record<SshKeyState | 'loading', string> = {
  loading: 'Checking key…',
  valid: 'Application identity for SSH access to servers',
  missing: 'No key has been generated yet',
  invalid: 'The key file is corrupted',
  error: 'Could not verify the key',
};

/** Блок просмотра валидного ключа: отпечаток + public_key с копированием + пути. */
function KeyView({ info }: { info: SshKeyInfo }) {
  const [copied, setCopied] = useState(false);
  // Ссылка на <pre> с ключом — копируем именно его содержимое (видимый элемент
  // внутри Radix-диалога копируется надёжнее, чем скрытая textarea в body).
  const keyRef = useRef<HTMLPreElement>(null);

  const copy = async () => {
    const ok = await copyToClipboard(info.public_key, keyRef.current);
    if (ok) {
      setCopied(true);
      notify.success('Public key copied');
      window.setTimeout(() => setCopied(false), 1500);
    } else {
      notify.error('Copy failed — select & copy manually');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone="success">Ready</Chip>
        <span className="font-mono text-xs text-fg-muted">{info.type}</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Fingerprint</Label>
        <p className="break-all font-mono text-xs text-fg-secondary">{info.fingerprint}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label>Public key</Label>
          <Button variant="ghost" size="sm" leftIcon={copied ? <Check size={13} /> : <Copy size={13} />} onClick={copy}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <pre
          ref={keyRef}
          className="max-h-36 overflow-auto whitespace-pre-wrap break-all rounded-md border border-border-subtle bg-bg-0 p-3 font-mono text-[11px] leading-relaxed text-fg-secondary"
        >{info.public_key}</pre>
        <p className="text-xs text-fg-muted">
          Add this line to <span className="font-mono">~/.ssh/authorized_keys</span> on the target
          servers.
        </p>
      </div>

      <div className="flex flex-col gap-1 border-t border-border-subtle pt-3 font-mono text-[11px] text-fg-muted">
        <span>private: {info.private_key_path}</span>
        <span>public: {info.public_key_path}</span>
        <span>created: {formatIsoUtc(info.created_at)}</span>
      </div>
    </div>
  );
}

/** Сообщение-заглушка для невалидных состояний. */
function StateMessage({ state, message }: { state: SshKeyState; message: string }) {
  const danger = state === 'missing' || state === 'invalid' || state === 'error';
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <span
        className={danger ? 'text-state-error' : 'text-fg-muted'}
      >
        {state === 'valid' ? <KeyRound size={26} aria-hidden /> : <AlertTriangle size={26} aria-hidden />}
      </span>
      <p className="text-sm text-fg-secondary">
        {state === 'missing'
          ? 'SSH key is not created yet.'
          : state === 'invalid'
            ? 'The stored key is corrupted or unreadable.'
            : 'The key check failed.'}
      </p>
      <p className="font-mono text-xs text-fg-muted">{message}</p>
      {state === 'missing' ? (
        <p className="text-xs text-fg-muted">Generate a key to enable key-based SSH access.</p>
      ) : state === 'invalid' ? (
        <p className="text-xs text-fg-muted">Recreate it (the old one will be removed first).</p>
      ) : null}
    </div>
  );
}

export function SshKeyDialog({ open, onOpenChange }: SshKeyDialogProps) {
  const { data, isLoading } = useSshCheckQuery();
  const createMut = useCreateSshKey();
  const deleteMut = useDeleteSshKey();
  const [confirm, setConfirm] = useState<'delete' | 'recreate' | null>(null);

  const state: SshKeyState | 'loading' = isLoading && !data ? 'loading' : (data?.state ?? 'error');
  const busy = createMut.isPending || deleteMut.isPending;

  const close = (next: boolean) => {
    if (busy) return;
    if (!next) setConfirm(null);
    onOpenChange(next);
  };

  const onCreate = async () => {
    try {
      const res = await createMut.mutateAsync();
      notify.success(res.created ? 'SSH key created' : 'SSH key already exists', {
        description: res.fingerprint,
      });
    } catch {
      notify.error('Failed to create SSH key');
    }
  };

  const onDelete = async () => {
    try {
      await deleteMut.mutateAsync();
      notify.success('SSH key deleted');
      setConfirm(null);
    } catch {
      notify.error('Failed to delete SSH key');
    }
  };

  const onRecreate = async () => {
    try {
      await deleteMut.mutateAsync();
      const res = await createMut.mutateAsync();
      notify.success('SSH key recreated', { description: res.fingerprint });
      setConfirm(null);
    } catch {
      notify.error('Failed to recreate SSH key');
    }
  };

  // ---- Footer по состоянию ----
  let footer: ReactNode = (
    <Button variant="ghost" onClick={() => close(false)} disabled={busy}>
      Close
    </Button>
  );

  if (confirm === 'delete') {
    footer = (
      <>
        <Button variant="ghost" onClick={() => setConfirm(null)} disabled={busy}>
          Cancel
        </Button>
        <Button variant="destructive" loading={busy} onClick={onDelete}>
          Delete key
        </Button>
      </>
    );
  } else if (confirm === 'recreate') {
    footer = (
      <>
        <Button variant="ghost" onClick={() => setConfirm(null)} disabled={busy}>
          Cancel
        </Button>
        <Button variant="destructive" loading={busy} onClick={onRecreate}>
          Recreate key
        </Button>
      </>
    );
  } else if (state === 'valid') {
    footer = (
      <>
        <Button variant="ghost" onClick={() => close(false)} disabled={busy}>
          Close
        </Button>
        <Button variant="destructive" onClick={() => setConfirm('delete')} disabled={busy}>
          Delete key
        </Button>
      </>
    );
  } else if (state === 'missing') {
    footer = (
      <>
        <Button variant="ghost" onClick={() => close(false)} disabled={busy}>
          Close
        </Button>
        <Button loading={busy} leftIcon={<KeyRound size={14} />} onClick={onCreate}>
          Create key
        </Button>
      </>
    );
  } else if (state === 'invalid' || state === 'error') {
    footer = (
      <>
        <Button variant="ghost" onClick={() => close(false)} disabled={busy}>
          Close
        </Button>
        <Button loading={busy} onClick={() => setConfirm('recreate')}>
          Recreate key
        </Button>
      </>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={close}
      title="SSH key"
      description={DESCRIPTION[state]}
      className="w-[min(94vw,560px)]"
      footer={footer}
    >
      {state === 'loading' ? (
        <div className="flex items-center justify-center gap-2 py-10 text-fg-muted">
          <Spinner size={16} label="Checking" />
          <span className="text-sm">Checking SSH key…</span>
        </div>
      ) : confirm ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <AlertTriangle size={26} aria-hidden className="text-state-error" />
          <p className="text-sm text-fg-secondary">
            {confirm === 'delete' ? 'Delete the SSH key?' : 'Recreate the SSH key?'}
          </p>
          <p className="max-w-sm text-xs text-fg-muted">
            The public key already added to servers&apos; authorized_keys will stop working. A new
            key will have a different fingerprint.
          </p>
        </div>
      ) : state === 'valid' && data?.info ? (
        <KeyView info={data.info} />
      ) : (
        <StateMessage state={state} message={data?.message ?? ''} />
      )}
    </Dialog>
  );
}
