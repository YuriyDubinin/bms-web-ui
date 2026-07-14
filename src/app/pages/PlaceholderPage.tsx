import { NavGlyph, type NavIconName } from '@app/layout/icons';
import { PageHeader } from './PageHeader';

export type PlaceholderPageProps = {
  icon: NavIconName;
  title: string;
  subtitle: string;
  description: string;
};

/** Страница-заглушка раздела: заголовок + карточка с иконкой и коротким описанием. */
export function PlaceholderPage({ icon, title, subtitle, description }: PlaceholderPageProps) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />

      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-strong bg-bg-1 px-6 py-16 text-center transition-colors duration-300">
        <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent-muted text-accent">
          <NavGlyph name={icon} size={24} />
        </span>
        <h2 className="text-base font-semibold text-fg-primary">{title}</h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-fg-secondary">{description}</p>
        <span className="mt-4 inline-flex items-center rounded-full bg-bg-2 px-2.5 py-0.5 font-mono text-[11px] text-fg-muted">
          Раздел в разработке
        </span>
      </div>
    </>
  );
}
