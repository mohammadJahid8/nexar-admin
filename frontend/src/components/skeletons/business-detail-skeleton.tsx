import { Skeleton } from '../ui/skeleton';

export function BusinessDetailSkeleton() {
  return (
    <div className='max-w-4xl mx-auto space-y-6'>
      {/* Back button skeleton */}
      <Skeleton className='h-6 w-32' />

      {/* Header skeleton */}
      <div className='flex items-center justify-between'>
        <div className='space-y-2'>
          <Skeleton className='h-8 w-48' />
          <Skeleton className='h-4 w-32' />
        </div>
        <Skeleton className='h-10 w-24' />
      </div>

      {/* Stats cards skeleton */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className='rounded-xl border border-border bg-card p-5'>
            <Skeleton className='h-4 w-20 mb-2' />
            <Skeleton className='h-6 w-16' />
          </div>
        ))}
      </div>

      {/* Billing section skeleton */}
      <div className='rounded-xl border border-border bg-card p-6 space-y-4'>
        <Skeleton className='h-6 w-32' />
        <div className='grid grid-cols-2 gap-4'>
          <Skeleton className='h-4 w-full' />
          <Skeleton className='h-4 w-full' />
          <Skeleton className='h-4 w-full' />
          <Skeleton className='h-4 w-full' />
        </div>
      </div>
    </div>
  );
}
