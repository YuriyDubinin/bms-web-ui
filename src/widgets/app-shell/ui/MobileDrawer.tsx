import * as Dialog from '@radix-ui/react-dialog';
import { BrandMark } from './BrandMark';
import { Navigation } from './Navigation';
import { UserBlock } from './UserBlock';

export type MobileDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogoutClick: () => void;
};

/**
 * Мобильный drawer на Radix Dialog (focus trap, ESC, body scroll lock — из коробки).
 * Slide/fade — через Tailwind data-[state] keyframes; Framer-вариант ломал exit-фазу
 * из-за конфликта AnimatePresence ↔ Dialog.Portal mount lifecycle.
 */
export function MobileDrawer({ open, onOpenChange, onLogoutClick }: MobileDrawerProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out"
        />
        <Dialog.Content
          aria-label="Навигация"
          onOpenAutoFocus={(e) => {
            // Не уводим автофокус — focus-trap работает, первый NavLink берётся Tab'ом.
            e.preventDefault();
          }}
          className="fixed inset-y-0 left-0 z-50 flex w-[min(80vw,320px)] flex-col border-r border-border-subtle bg-bg-1 px-4 py-4 md:hidden focus:outline-none data-[state=open]:animate-slide-in-left data-[state=closed]:animate-slide-out-left data-[state=closed]:pointer-events-none"
        >
          <Dialog.Title className="sr-only">Навигация</Dialog.Title>
          <div className="pb-3">
            <BrandMark />
          </div>
          <div className="border-t border-border-subtle" aria-hidden />
          <div className="mt-4">
            <Navigation
              layoutIdPrefix="drawer"
              onItemSelect={() => onOpenChange(false)}
            />
          </div>
          <div className="mt-auto">
            <UserBlock onLogoutClick={onLogoutClick} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
