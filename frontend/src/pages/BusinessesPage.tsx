import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { businessApi } from '../api';
import type { Business } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Building2,
  Plus,
  Search,
  ChevronRight,
  Users,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';

const statusConfig: Record<
  string,
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  not_enabled: {
    label: 'Not Enabled',
    icon: Clock,
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
  pending_checkout: {
    label: 'Pending',
    icon: Clock,
    className:
      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  },
  active: {
    label: 'Active',
    icon: CheckCircle2,
    className:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  },
  past_due: {
    label: 'Past Due',
    icon: AlertCircle,
    className:
      'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  },
  canceled: {
    label: 'Canceled',
    icon: XCircle,
    className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  },
};

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)} AUD`;
}

export function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadBusinesses();
  }, []);

  async function loadBusinesses() {
    try {
      setLoading(true);
      setError(null);
      const response = await businessApi.list({ limit: 100 });
      setBusinesses(response?.businesses || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load businesses'
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredBusinesses = businesses.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.externalBusinessId.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600'></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20'>
        <div className='flex items-center gap-2 text-red-700 dark:text-red-400'>
          <AlertCircle className='h-5 w-5' />
          <h3 className='font-semibold'>Error Loading Businesses</h3>
        </div>
        <p className='mt-2 text-red-600 dark:text-red-300'>{error}</p>
        <Button onClick={loadBusinesses} variant='outline' className='mt-4'>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Businesses</h1>
          <p className='text-muted-foreground'>
            Manage your CRM businesses and their billing
          </p>
        </div>
        <Link to='/businesses/new'>
          <Button className='gap-2'>
            <Plus className='h-4 w-4' />
            Create Business
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className='relative max-w-md'>
        <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
        <Input
          placeholder='Search businesses...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='pl-10'
        />
      </div>

      {/* Business List */}
      {filteredBusinesses.length === 0 ? (
        <div className='rounded-lg border border-dashed border-border p-12 text-center'>
          <Building2 className='mx-auto h-12 w-12 text-muted-foreground/50' />
          <h3 className='mt-4 text-lg font-semibold'>No businesses found</h3>
          <p className='mt-2 text-muted-foreground'>
            {search
              ? 'Try adjusting your search'
              : 'Get started by creating your first business'}
          </p>
          {!search && (
            <Link to='/businesses/new' className='mt-4 inline-block'>
              <Button variant='outline' className='gap-2'>
                <Plus className='h-4 w-4' />
                Create Business
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className='grid gap-4'>
          {filteredBusinesses.map((business) => {
            const status =
              statusConfig[business.billingStatus] || statusConfig.not_enabled;
            const StatusIcon = status.icon;

            return (
              <Link
                key={business._id}
                to={`/businesses/${business._id}`}
                className='group block'
              >
                <div className='rounded-xl border border-border bg-card p-5 transition-all hover:border-indigo-300 hover:shadow-sm dark:hover:border-indigo-700'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-4'>
                      <div>
                        <h3 className='font-semibold text-lg group-hover:text-indigo-600 transition-colors'>
                          {business.name}
                        </h3>
                        <p className='text-sm text-muted-foreground'>
                          {business.externalBusinessId}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className='h-5 w-5 text-muted-foreground group-hover:text-indigo-600 transition-colors' />
                  </div>

                  <div className='mt-4 flex flex-wrap items-center gap-4'>
                    <div
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${status.className}`}
                    >
                      <StatusIcon className='h-3.5 w-3.5' />
                      {status.label}
                    </div>
                    <div className='flex items-center gap-1.5 text-sm text-muted-foreground'>
                      <CreditCard className='h-4 w-4' />
                      {formatPrice(business.seatPriceAudCents)}/user
                    </div>
                    <div className='flex items-center gap-1.5 text-sm text-muted-foreground'>
                      <Users className='h-4 w-4' />
                      {business.currentSeatCount} user
                      {business.currentSeatCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default BusinessesPage;
