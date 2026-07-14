import { ThemeSwitcher } from '@app/theme';
import type { ThemeId } from '@app/theme';
import { BrandMark } from './BrandMark';
import { MenuIcon } from './icons';

export type MobileHeaderProps = {
  onOpenMenu: () => void;
  theme: ThemeId;
  onThemeChange: (id: ThemeId) => void;
};

/** Мобильный хедер (виден только < md): кнопка меню, бренд, переключатель тем. */
export function MobileHeader({ onOpenMenu, theme, onThemeChange }: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-border-subtle bg-bg-1/95 px-4 backdrop-blur md:hidden">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Открыть меню"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-fg-secondary transition-colors hover:bg-bg-2 hover:text-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <MenuIcon />
        </button>
        <BrandMark />
      </div>
      <ThemeSwitcher value={theme} onChange={onThemeChange} />
    </header>
  );
}
