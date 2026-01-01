import { Users, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { BillingDetailData, SeatEvent } from '../../types';

interface SeatHistorySectionProps {
  billing: BillingDetailData | null;
  formatDate: (date?: string) => string;
}

export function SeatHistorySection({
  billing,
  formatDate,
}: SeatHistorySectionProps) {
  if (!billing) return null;

  return (
    <div className='rounded-xl border border-border bg-card p-6 '>
      <h2 className='text-lg font-semibold flex items-center gap-2 mb-4'>
        <Users className='h-5 w-5 text-muted-foreground' />
        User Change History
      </h2>

      {billing?.seatHistory && billing.seatHistory.length > 0 ? (
        <div className='space-y-3'>
          {billing.seatHistory.map((event: SeatEvent, idx: number) => (
            <div
              key={idx}
              className='flex items-center gap-3 py-2 border-b last:border-0'
            >
              <div
                className={`rounded-full p-1.5 ${
                  event.delta > 0
                    ? 'bg-emerald-100 text-emerald-600'
                    : event.delta < 0
                    ? 'bg-red-100 text-red-600'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {event.delta > 0 ? (
                  <TrendingUp className='h-4 w-4' />
                ) : event.delta < 0 ? (
                  <TrendingDown className='h-4 w-4' />
                ) : (
                  <Minus className='h-4 w-4' />
                )}
              </div>
              <div className='flex-1'>
                <p className='font-medium'>
                  {event.delta > 0 ? '+' : ''}
                  {event.delta} seat{Math.abs(event.delta) !== 1 ? 's' : ''}
                  <span className='text-muted-foreground font-normal'>
                    {' '}
                    → {event.resultingSeatCount} total
                  </span>
                </p>
                {event.reason && (
                  <p className='text-sm text-muted-foreground'>
                    {event.reason}
                  </p>
                )}
              </div>
              <div className='text-sm text-muted-foreground'>
                {formatDate(event.at)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className='text-muted-foreground text-center py-8'>
          No seat changes recorded
        </p>
      )}
    </div>
  );
}
