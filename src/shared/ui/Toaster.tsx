import { Toaster as SonnerToaster } from 'sonner';

/**
 * Корневой mount-point для тостов Sonner. Монтировать один раз в RootLayout.
 * Стили унифицированы под палитру: тёмный фон, тонкая левая полоса по типу,
 * моноширинный код-чип в правом углу (через NotifyOptions.code).
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      theme="dark"
      duration={4000}
      visibleToasts={5}
      gap={8}
      // Включаем встроенный крестик Sonner; его внешний вид/позицию настраиваем через classNames.
      closeButton
      toastOptions={{
        unstyled: false,
        classNames: {
          toast: [
            'group',
            'relative !w-[360px] !max-w-[92vw]',
            'rounded-md border border-border-subtle bg-bg-3 text-fg-primary',
            // pr-8 резервирует место под крестик, чтобы он никогда не наезжал на текст.
            'pl-3 pr-8 py-2.5 text-sm',
            'border-l-2',
          ].join(' '),
          title: 'text-sm font-medium text-fg-primary',
          description: 'text-xs text-fg-secondary mt-0.5',
          actionButton:
            '!bg-accent !text-accent-on !text-xs !font-medium !rounded-md !px-2 !py-1',
          cancelButton:
            '!bg-transparent !text-fg-secondary !text-xs !rounded-md !px-2 !py-1',
          // Крестик: правый верхний угол; виден только при наведении на тост.
          // `!left-auto` гасит дефолтный left:0 от Sonner, `!translate-x-0/!translate-y-0`
          // — его дефолтный «выход за рамку» через translate.
          closeButton: [
            '!absolute !top-1.5 !right-1.5 !left-auto',
            '!translate-x-0 !translate-y-0',
            '!h-6 !w-6 !p-0 !rounded-md !border-0',
            '!bg-transparent !text-fg-muted hover:!text-fg-primary',
            '!opacity-0 group-hover:!opacity-100 focus-visible:!opacity-100',
            'transition-opacity duration-150',
          ].join(' '),
          success: '!border-l-state-success',
          error: '!border-l-state-error',
          warning: '!border-l-state-warning',
          info: '!border-l-state-info',
          loading: '!border-l-border-strong',
          default: '!border-l-border-strong',
        },
      }}
    />
  );
}
