import { THEME_OPTIONS, ThemeGlyph, AutoGlyph } from '@app/theme';
import type { ThemePreference } from '@app/theme';

const cx = (...classes: (string | false | undefined)[]): string =>
  classes.filter(Boolean).join(' ');

function labelOf(id: ThemePreference): string {
  return THEME_OPTIONS.find((t) => t.id === id)?.label ?? '';
}

function nextTheme(id: ThemePreference): ThemePreference {
  const idx = THEME_OPTIONS.findIndex((t) => t.id === id);
  return THEME_OPTIONS[(idx + 1) % THEME_OPTIONS.length]!.id;
}

/** Иконка пункта: у режима «Авто» — часы, у обычных тем — иконка времени суток. */
function OptionGlyph({ id }: { id: ThemePreference }) {
  return id === 'auto' ? <AutoGlyph /> : <ThemeGlyph theme={id} />;
}

export type ThemeControlProps = {
  value: ThemePreference;
  onChange: (id: ThemePreference) => void;
  /** Свёрнутый режим — одна кнопка с иконкой текущего выбора, клик переключает по кругу. */
  collapsed?: boolean;
};

/**
 * Представление переключателя тем для сайдбара.
 * Развёрнутый — ряд из 4 тем + «Авто»; свёрнутый — одна циклическая кнопка.
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
        <OptionGlyph id={value} />
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
                'flex h-8 flex-1 items-center justify-center rounded transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                active ? 'bg-accent-muted text-accent' : 'text-fg-muted hover:text-fg-secondary',
              )}
            >
              <OptionGlyph id={option.id} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
