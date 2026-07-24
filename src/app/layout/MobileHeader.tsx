import { ThemeSwitcher } from '@app/theme';
import type { ThemePreference } from '@app/theme';
import { BrandMark } from './BrandMark';
import { MenuIcon } from './icons';

export type MobileHeaderProps = {
  onOpenMenu: () => void;
  theme: ThemePreference;
  onThemeChange: (id: ThemePreference) => void;
};

/** Мобильный хедер (виден только < md): кнопка меню, бренд, переключатель тем. */
export function MobileHeader({ onOpenMenu, theme, onThemeChange }: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-border-subtle bg-bg-1 px-4 md:hidden">
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
