import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { businessApi } from '../api';
import type { Business, BillingDetailData } from '../types';
import { Button } from '../components/ui/button';
import { BusinessDetailSkeleton } from '../components/skeletons';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  BusinessHeader,
  BusinessDetailsCard,
  ApiKeySection,
  BillingSummaryCard,
  InvoicesSection,
  SeatHistorySection,
  DeleteBusiness,
} from '../components/business';

const statusConfig: Record<
  string,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    className: string;
  }
> = {
  not_enabled: {
    label: 'Not Enabled',
    icon: XCircle,
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
  pending_checkout: {
    label: 'Pending',
    icon: Clock,
    className:
      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  active: {
    label: 'Active',
    icon: CheckCircle2,
    className:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  past_due: {
    label: 'Past Due',
    icon: AlertCircle,
    className:
      'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  },
  canceled: {
    label: 'Canceled',
    icon: XCircle,
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
};

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(date?: string): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function BusinessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [business, setBusiness] = useState<Business | null>(null);
  const [billing, setBilling] = useState<BillingDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [businessRes, billingRes] = await Promise.all([
        businessApi.get(id!),
        businessApi.getBilling(id!),
      ]);

      setBusiness(businessRes.business);
      setBilling(billingRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load business');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(businessId: string, data: Partial<Business>) {
    try {
      const { business: updated } = await businessApi.update(businessId, data);
      setBusiness(updated);
    } catch (err) {
      throw err;
    }
  }

  if (loading) {
    return <BusinessDetailSkeleton />;
  }

  if (error && !business) {
    return (
      <div className='max-w-4xl mx-auto'>
        <button
          onClick={() => navigate('/businesses')}
          className='flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6'
        >
          Back to Businesses
        </button>
        <div className='rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20'>
          <div className='flex items-center gap-2 text-red-700 dark:text-red-400'>
            <AlertCircle className='h-5 w-5' />
            <h3 className='font-semibold'>Error</h3>
          </div>
          <p className='mt-2 text-red-600 dark:text-red-300'>{error}</p>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className='max-w-4xl mx-auto'>
        <p className='text-center text-muted-foreground'>Business not found</p>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Error Alert */}
      {error && (
        <div className='rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20'>
          <div className='flex items-center gap-2 text-red-700 dark:text-red-400'>
            <AlertCircle className='h-4 w-4' />
            <p className='text-sm'>{error}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <BusinessHeader
        business={business}
        statusConfig={
          statusConfig[business.billingStatus] || statusConfig.not_enabled
        }
      />

      {/* Two Column Layout */}
      <div className='grid gap-6 lg:grid-cols-2'>
        {/* Left Column */}

        <BusinessDetailsCard
          business={business}
          onUpdate={handleUpdate}
          formatPrice={formatPrice}
          formatDate={formatDate}
        />
        <BillingSummaryCard
          billing={billing}
          formatPrice={formatPrice}
          formatDate={formatDate}
        />
      </div>

      {/* Full Width Sections */}
      <InvoicesSection
        billing={billing}
        formatPrice={formatPrice}
        formatDate={formatDate}
      />

      <SeatHistorySection billing={billing} formatDate={formatDate} />

      <div className='grid gap-6 lg:grid-cols-2'>
        <ApiKeySection
          business={business}
          setBusiness={setBusiness}
          setError={setError}
        />

        {/* Delete Button */}
        <DeleteBusiness business={business} setError={setError} />
      </div>
    </div>
  );
}

export default BusinessDetailPage;
