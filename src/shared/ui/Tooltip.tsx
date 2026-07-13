import { type ReactNode } from 'react';
import * as RTooltip from '@radix-ui/react-tooltip';
import { cn } from '../lib';

export type TooltipProps = {
  /** Текст или JSX подсказки. */
  content: ReactNode;
  /** Триггер: любой клик-/фокусируемый элемент. */
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  /** Задержка появления, ms. */
  delayDuration?: number;
};

export function TooltipProvider({ children }: { children: ReactNode }) {
  return <RTooltip.Provider delayDuration={250}>{children}</RTooltip.Provider>;
}

export function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  delayDuration,
}: TooltipProps) {
  return (
    <RTooltip.Root delayDuration={delayDuration}>
      <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
      <RTooltip.Portal>
        <RTooltip.Content
          side={side}
          align={align}
          sideOffset={6}
          className={cn(
            'z-50 select-none rounded-sm border border-border-subtle bg-bg-3 px-2 py-1 text-xs text-fg-primary',
            'data-[state=delayed-open]:animate-fade-in',
          )}
        >
          {content}
          <RTooltip.Arrow className="fill-bg-3" />
        </RTooltip.Content>
      </RTooltip.Portal>
    </RTooltip.Root>
  );
}
