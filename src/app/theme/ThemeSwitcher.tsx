import { THEMES } from './theme';
import type { ThemeId } from './theme';
import { ThemeGlyph } from './ThemeGlyph';

const cx = (...classes: (string | false | undefined)[]): string =>
  classes.filter(Boolean).join(' ');

export type ThemeSwitcherProps = {
  value: ThemeId;
  onChange: (id: ThemeId) => void;
  className?: string;
};

/**
 * Сегментированный переключатель тем. Controlled: value/onChange приходят
 * из единственного useTheme в корне. На узких экранах остаются только иконки.
 */
export function ThemeSwitcher({ value, onChange, className }: ThemeSwitcherProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Тема оформления"
      className={cx(
        'inline-flex items-center gap-1 rounded-lg border border-border-subtle bg-bg-1 p-1 shadow-sm',
        className,
      )}
    >
      {THEMES.map((theme) => {
        const active = value === theme.id;
        return (
          <button
            key={theme.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={theme.label}
            title={theme.label}
            onClick={() => onChange(theme.id)}
            className={cx(
              'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium',
              'transition-colors duration-150 ease-out',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg-1',
              active
                ? 'bg-accent-muted text-accent'
                : 'text-fg-muted hover:bg-bg-2 hover:text-fg-secondary',
            )}
          >
            <ThemeGlyph theme={theme.id} />
            <span className="hidden sm:inline">{theme.label}</span>
          </button>
        );
      })}
    </div>
  );
}
