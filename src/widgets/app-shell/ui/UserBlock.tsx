import { LogOut } from 'lucide-react';
import { Button, Chip, IconButton, Tooltip, notify } from '@shared/ui';
import { useSessionStore } from '@entities/session';

export type UserBlockProps = {
  onLogoutClick: () => void;
  /** Свёрнутый режим — только иконка выхода с tooltip. */
  collapsed?: boolean;
};

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallthrough to execCommand
  }
  // Fallback для старых браузеров / небезопасного контекста.
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  document.body.removeChild(textarea);
  return ok;
}

export function UserBlock({ onLogoutClick, collapsed = false }: UserBlockProps) {
  const employee = useSessionStore((s) => s.employee);
  if (!employee) return null;

  const handleCopyEmail = async () => {
    const ok = await copyToClipboard(employee.email);
    if (ok) notify.success('Copied', { description: employee.email });
    else notify.error('Copy failed');
  };

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 border-t border-border-subtle pt-4">
        <Tooltip content={`${employee.full_name} · ${employee.role}`} side="right">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border-subtle bg-bg-2 text-[11px] font-medium text-fg-primary">
            {initialsOf(employee.full_name) || '·'}
          </span>
        </Tooltip>
        <Tooltip content="Sign out" side="right">
          <IconButton aria-label="Sign out" onClick={onLogoutClick}>
            <LogOut size={14} aria-hidden />
          </IconButton>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="border-t border-border-subtle pt-4">
      <div className="flex items-center gap-2">
        <span className="truncate text-sm text-fg-primary">{employee.full_name}</span>
        <Chip tone="neutral" mono className="shrink-0">
          {employee.role.toUpperCase()}
        </Chip>
      </div>
      <button
        type="button"
        onClick={handleCopyEmail}
        title="Click to copy"
        className="mt-0.5 w-full truncate text-left font-mono text-xs text-fg-muted transition-colors hover:text-fg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
      >
        {employee.email}
      </button>

      <Button
        variant="ghost"
        size="sm"
        className="mt-3 w-full justify-start"
        leftIcon={<LogOut size={14} aria-hidden />}
        onClick={onLogoutClick}
      >
        Sign out
      </Button>
    </div>
  );
}
