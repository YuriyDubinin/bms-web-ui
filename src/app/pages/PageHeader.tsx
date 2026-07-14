/** Единый заголовок страницы: название + краткий подзаголовок. */
export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-fg-secondary">{subtitle}</p> : null}
    </div>
  );
}
