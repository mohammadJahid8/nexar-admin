import { CreditCard, Users } from 'lucide-react';
import type { BillingDetailData } from '../../types';

interface BillingSummaryCardProps {
  billing: BillingDetailData | null;
  formatPrice: (cents: number) => string;
  formatDate: (date?: string) => string;
}

export function BillingSummaryCard({
  billing,
  formatPrice,
  formatDate,
}: BillingSummaryCardProps) {
  console.log('🚀 ~ BillingSummaryCard ~ billing:', billing);
  if (!billing) return null;

  return (
    <div className='rounded-xl border border-border bg-card p-6'>
      <h2 className='text-lg font-semibold flex items-center gap-2 mb-4'>
        <CreditCard className='h-5 w-5 text-muted-foreground' />
        Billing Summary
      </h2>

      <div className='grid grid-cols-2 lg:grid-cols-3 gap-4'>
        <div className='rounded-lg bg-muted/50 p-4'>
          <div className='flex items-center gap-2 text-muted-foreground text-sm'>
            <Users className='h-4 w-4' />
            Current Seats
          </div>
          <p className='text-2xl font-bold mt-1'>
            {billing.billing.currentSeatCount || 0}
          </p>
        </div>

        <div className='rounded-lg bg-muted/50 p-4'>
          <div className='flex items-center gap-2 text-muted-foreground text-sm'>
            <CreditCard className='h-4 w-4' />
            Current Billed
          </div>
          <p className='text-2xl font-bold mt-1'>
            {billing.estimatedBill
              ? `$${billing.estimatedBill.currentTotalAud}`
              : '$0.00'}
          </p>
        </div>

        <div className='rounded-lg bg-muted/50 p-4'>
          <div className='flex items-center gap-2 text-muted-foreground text-sm'>
            <CreditCard className='h-4 w-4' />
            Projected Bill
          </div>
          <p className='text-2xl font-bold mt-1'>
            {billing.estimatedBill
              ? `$${billing.estimatedBill.projectedTotalAud}`
              : formatPrice(0)}
          </p>
        </div>
      </div>

      <div className='mt-4 space-y-3'>
        <div className='flex justify-between text-sm'>
          <span className='text-muted-foreground'>Billing Enabled</span>
          <span>{formatDate(billing.billing.billingEnabledAt)}</span>
        </div>
        <div className='flex justify-between text-sm'>
          <span className='text-muted-foreground'>Current Period</span>
          <span>
            {billing.billing.currentPeriodStart
              ? `${formatDate(
                  billing.billing.currentPeriodStart
                )} - ${formatDate(billing.billing.currentPeriodEnd)}`
              : '—'}
          </span>
        </div>
        <div className='flex justify-between text-sm'>
          <span className='text-muted-foreground'>Last Usage Sync</span>
          <span>{formatDate(billing.billing.lastUsageSyncAt)}</span>
        </div>
      </div>
    </div>
  );
}
