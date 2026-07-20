import { THEME_OPTIONS } from './theme';
import type { ThemePreference } from './theme';
import { ThemeGlyph, AutoGlyph } from './ThemeGlyph';

const cx = (...classes: (string | false | undefined)[]): string =>
  classes.filter(Boolean).join(' ');

export type ThemeSwitcherProps = {
  value: ThemePreference;
  onChange: (id: ThemePreference) => void;
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
      {THEME_OPTIONS.map((option) => {
        const active = value === option.id;
        const title = option.id === 'auto' ? 'Авто — тема по времени суток' : option.label;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={title}
            title={title}
            onClick={() => onChange(option.id)}
            className={cx(
              'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium',
              'transition-colors duration-150 ease-out',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg-1',
              active
                ? 'bg-accent-muted text-accent'
                : 'text-fg-muted hover:bg-bg-2 hover:text-fg-secondary',
            )}
          >
            {option.id === 'auto' ? <AutoGlyph /> : <ThemeGlyph theme={option.id} />}
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
