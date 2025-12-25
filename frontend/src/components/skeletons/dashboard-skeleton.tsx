import { Skeleton } from '../ui/skeleton';

export function DashboardSkeleton() {
  return (
    <div className='space-y-8'>
      {/* Header skeleton */}
      <div>
        <Skeleton className='h-8 w-40 mb-2' />
        <Skeleton className='h-4 w-64' />
      </div>

      {/* Stats Grid skeleton */}
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className='rounded-xl border border-border bg-card p-6'>
            <div className='flex items-center gap-3'>
              <Skeleton className='h-10 w-10 rounded-lg' />
              <div>
                <Skeleton className='h-4 w-24 mb-1' />
                <Skeleton className='h-6 w-16' />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent businesses skeleton */}
      <div className='rounded-xl border border-border bg-card'>
        <div className='flex items-center justify-between border-b border-border px-6 py-4'>
          <Skeleton className='h-6 w-36' />
          <Skeleton className='h-8 w-20' />
        </div>
        <div className='divide-y divide-border'>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className='flex items-center justify-between px-6 py-4'
            >
              <div className='space-y-1'>
                <Skeleton className='h-4 w-32' />
                <Skeleton className='h-3 w-24' />
              </div>
              <div className='flex items-center gap-4'>
                <Skeleton className='h-4 w-16' />
                <Skeleton className='h-5 w-16 rounded-full' />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
