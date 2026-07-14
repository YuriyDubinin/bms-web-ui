import { useEffect } from 'react';
import type { SessionUser } from '@app/api';
import { BrandMark } from './BrandMark';
import { NavList } from './NavList';
import { SidebarUser } from './SidebarUser';
import { CloseIcon } from './icons';

const cx = (...classes: (string | false | undefined)[]): string =>
  classes.filter(Boolean).join(' ');

export type MobileDrawerProps = {
  open: boolean;
  onClose: () => void;
  user: SessionUser | null;
  onLogout: () => Promise<void>;
};

/**
 * Выезжающая слева панель навигации для мобильных (< md). Вызывается из MobileHeader.
 * Закрывается по клику на оверлей, Esc и при переходе по ссылке. Блокирует скролл фона.
 */
export function MobileDrawer({ open, onClose, user, onLogout }: MobileDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  return (
    <div className={cx('md:hidden', !open && 'pointer-events-none')} aria-hidden={!open}>
      {/* Оверлей */}
      <div
        onClick={onClose}
        className={cx(
          'fixed inset-0 z-40 bg-black/50 transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0',
        )}
      />

      {/* Панель */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Навигация"
        className={cx(
          'fixed inset-y-0 left-0 z-50 flex w-[264px] max-w-[82%] flex-col border-r border-border-subtle bg-bg-1',
          'transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border-subtle px-4">
          <BrandMark />
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть меню"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-fg-secondary transition-colors hover:bg-bg-2 hover:text-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          <NavList onNavigate={onClose} />
        </div>

        <div className="shrink-0 border-t border-border-subtle px-3 py-3">
          <SidebarUser user={user} onLogout={onLogout} />
        </div>
      </aside>
    </div>
  );
}
