import { THEMES, ThemeGlyph } from '@app/theme';
import type { ThemeId } from '@app/theme';

const cx = (...classes: (string | false | undefined)[]): string =>
  classes.filter(Boolean).join(' ');

function labelOf(id: ThemeId): string {
  return THEMES.find((t) => t.id === id)?.label ?? '';
}

function nextTheme(id: ThemeId): ThemeId {
  const idx = THEMES.findIndex((t) => t.id === id);
  return THEMES[(idx + 1) % THEMES.length]!.id;
}

export type ThemeControlProps = {
  value: ThemeId;
  onChange: (id: ThemeId) => void;
  /** Свёрнутый режим — одна кнопка с иконкой текущей темы, клик переключает по кругу. */
  collapsed?: boolean;
};

/**
 * Представление переключателя тем для сайдбара.
 * Развёрнутый — ряд из 4 иконок (полный выбор); свёрнутый — одна циклическая кнопка.
 */
export function ThemeControl({ value, onChange, collapsed = false }: ThemeControlProps) {
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => onChange(nextTheme(value))}
        title={`Тема: ${labelOf(value)}`}
        aria-label={`Тема: ${labelOf(value)}. Переключить`}
        className="mx-auto flex h-9 w-9 items-center justify-center rounded-md text-fg-secondary transition-colors hover:bg-bg-2 hover:text-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <ThemeGlyph theme={value} />
      </button>
    );
  }

  return (
    <div>
      <p className="mb-1.5 px-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
        Тема
      </p>
      <div
        role="radiogroup"
        aria-label="Тема оформления"
        className="flex items-center gap-1 rounded-md border border-border-subtle bg-bg-2 p-1"
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
                'flex h-8 flex-1 items-center justify-center rounded transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                active ? 'bg-accent-muted text-accent' : 'text-fg-muted hover:text-fg-secondary',
              )}
            >
              <ThemeGlyph theme={theme.id} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
