import { Card, Skeleton } from '@shared/ui';

/** Первая загрузка снимка системы (Core/Main или remote) — каркас в правильной форме, без mock-чисел. */
export function SystemSnapshotSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-full" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i}>
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-3 h-8 w-24" />
            <Skeleton className="mt-3 h-1.5 w-full" />
            <Skeleton className="mt-2 h-7 w-full" />
          </Card>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-3 h-3 w-3/4" />
          <Skeleton className="mt-2 h-3 w-2/3" />
          <Skeleton className="mt-4 h-10 w-full" />
        </Card>
        <Card>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-3 h-3 w-3/4" />
          <Skeleton className="mt-2 h-3 w-2/3" />
          <Skeleton className="mt-4 h-10 w-full" />
        </Card>
      </div>
    </div>
  );
}
