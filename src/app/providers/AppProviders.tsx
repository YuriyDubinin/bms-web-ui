import type { ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';
import { Toaster, TooltipProvider } from '@shared/ui';
import { QueryProvider } from './QueryProvider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <MotionConfig reducedMotion="user">
        <TooltipProvider>
          {children}
          <Toaster />
        </TooltipProvider>
      </MotionConfig>
    </QueryProvider>
  );
}
