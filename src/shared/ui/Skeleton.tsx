import { cn } from '../lib';

export type SkeletonProps = {
  className?: string;
  /** Чисто декоративный — для скринридеров не озвучивается. */
  'aria-label'?: string;
};

export function Skeleton({ className, ...rest }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn(
        'rounded-sm bg-bg-2 skeleton-shimmer animate-shimmer',
        className,
      )}
      {...rest}
    />
  );
}
