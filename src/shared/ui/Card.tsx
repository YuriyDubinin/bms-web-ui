import type { ElementType, ReactNode } from 'react';
import { cn } from '../lib';

export type CardProps = {
  as?: ElementType;
  className?: string;
  children: ReactNode;
};

export function Card({ as: Tag = 'div', className, children }: CardProps) {
  return (
    <Tag
      className={cn(
        'rounded-md border border-border-subtle bg-bg-1 p-4',
        'transition-colors duration-150 ease-out',
        className,
      )}
    >
      {children}
    </Tag>
  );
}
