import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { businessApi, type DashboardStats } from '../api';
import type { Business } from '../types';
import { Button } from '../components/ui/button';
import {
  Building2,
  Users,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  DollarSign,
} from 'lucide-react';

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function DashboardPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [listRes, statsRes] = await Promise.all([
        businessApi.list({ limit: 100 }),
        businessApi.getDashboardStats(),
      ]);
      setBusinesses(listRes?.businesses || []);
      setDashboardStats(statsRes);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }

  const stats = {
    total: dashboardStats?.totalBusinesses || businesses.length,
    active:
      dashboardStats?.activeSubscriptions ||
      businesses.filter((b) => b.billingStatus === 'active').length,
    pending:
      dashboardStats?.pendingCheckouts ||
      businesses.filter((b) => b.billingStatus === 'pending_checkout').length,
    pastDue:
      dashboardStats?.pastDue ||
      businesses.filter((b) => b.billingStatus === 'past_due').length,
    totalSeats:
      dashboardStats?.totalSeats ||
      businesses.reduce((sum, b) => sum + b.currentSeatCount, 0),
    currentBilled: dashboardStats?.currentBilledCents || 0,
    projectedBill: dashboardStats?.projectedBillCents || 0,
    monthlyPaidRevenue: dashboardStats?.monthlyPaidRevenueCents || 0,
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600' />
      </div>
    );
  }

  return (
    <div className='space-y-8'>
      {/* Header */}
      <div>
        <h1 className='text-3xl font-bold tracking-tight'>Dashboard</h1>
        <p className='text-muted-foreground'>
          Overview of your CRM businesses and billing
        </p>
      </div>

      {/* Stats Grid */}
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        <div className='rounded-xl border border-border bg-card p-6 '>
          <div className='flex items-center gap-3'>
            <div className='rounded-lg bg-indigo-100 p-2.5 dark:bg-indigo-900/30'>
              <Building2 className='h-5 w-5 text-indigo-600 dark:text-indigo-400' />
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Total Businesses</p>
              <p className='text-2xl font-bold'>{stats.total}</p>
            </div>
          </div>
        </div>

        <div className='rounded-xl border border-border bg-card p-6 '>
          <div className='flex items-center gap-3'>
            <div className='rounded-lg bg-emerald-100 p-2.5 dark:bg-emerald-900/30'>
              <CheckCircle2 className='h-5 w-5 text-emerald-600 dark:text-emerald-400' />
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>
                Active Subscriptions
              </p>
              <p className='text-2xl font-bold'>{stats.active}</p>
            </div>
          </div>
        </div>

        <div className='rounded-xl border border-border bg-card p-6 '>
          <div className='flex items-center gap-3'>
            <div className='rounded-lg bg-purple-100 p-2.5 dark:bg-purple-900/30'>
              <Users className='h-5 w-5 text-purple-600 dark:text-purple-400' />
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Total Seats</p>
              <p className='text-2xl font-bold'>{stats.totalSeats}</p>
            </div>
          </div>
        </div>

        <div className='rounded-xl border border-border bg-card p-6 '>
          <div className='flex items-center gap-3'>
            <div className='rounded-lg bg-orange-100 p-2.5 dark:bg-orange-900/30'>
              <TrendingUp className='h-5 w-5 text-orange-600 dark:text-orange-400' />
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Current Billed</p>
              <p className='text-2xl font-bold'>
                {formatPrice(stats.currentBilled)}
              </p>
              <p className='text-xs text-muted-foreground'>Usage so far</p>
            </div>
          </div>
        </div>

        <div className='rounded-xl border border-border bg-card p-6 '>
          <div className='flex items-center gap-3'>
            <div className='rounded-lg bg-teal-100 p-2.5 dark:bg-teal-900/30'>
              <TrendingUp className='h-5 w-5 text-teal-600 dark:text-teal-400' />
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Projected Bill</p>
              <p className='text-2xl font-bold'>
                {formatPrice(stats.projectedBill)}
              </p>
              <p className='text-xs text-muted-foreground'>End of period</p>
            </div>
          </div>
        </div>

        <div className='rounded-xl border border-border bg-card p-6 '>
          <div className='flex items-center gap-3'>
            <div className='rounded-lg bg-green-100 p-2.5 dark:bg-green-900/30'>
              <DollarSign className='h-5 w-5 text-green-600 dark:text-green-400' />
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Monthly Revenue</p>
              <p className='text-2xl font-bold'>
                {formatPrice(stats.monthlyPaidRevenue)}
              </p>
              <p className='text-xs text-muted-foreground'>Paid this month</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Alerts */}
      {(stats.pending > 0 || stats.pastDue > 0) && (
        <div className='grid gap-4 sm:grid-cols-2'>
          {stats.pending > 0 && (
            <div className='rounded-xl border border-yellow-200 bg-yellow-50 p-5 dark:border-yellow-800 dark:bg-yellow-900/20'>
              <div className='flex items-center gap-3'>
                <Clock className='h-5 w-5 text-yellow-600' />
                <div>
                  <h3 className='font-semibold text-yellow-800 dark:text-yellow-300'>
                    Pending Checkouts
                  </h3>
                  <p className='text-sm text-yellow-700 dark:text-yellow-400'>
                    {stats.pending} business{stats.pending !== 1 ? 'es' : ''}{' '}
                    waiting for payment setup
                  </p>
                </div>
              </div>
            </div>
          )}

          {stats.pastDue > 0 && (
            <div className='rounded-xl border border-orange-200 bg-orange-50 p-5 dark:border-orange-800 dark:bg-orange-900/20'>
              <div className='flex items-center gap-3'>
                <AlertCircle className='h-5 w-5 text-orange-600' />
                <div>
                  <h3 className='font-semibold text-orange-800 dark:text-orange-300'>
                    Past Due Payments
                  </h3>
                  <p className='text-sm text-orange-700 dark:text-orange-400'>
                    {stats.pastDue} business{stats.pastDue !== 1 ? 'es' : ''}{' '}
                    with failed payments
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Businesses */}
      <div className='rounded-xl border border-border bg-card '>
        <div className='flex items-center justify-between border-b border-border px-6 py-4'>
          <h2 className='text-lg font-semibold'>Recent Businesses</h2>
          <Link to='/businesses'>
            <Button variant='ghost' size='sm' className='gap-1.5'>
              View All <ArrowRight className='h-4 w-4' />
            </Button>
          </Link>
        </div>

        {businesses.length > 0 ? (
          <div className='divide-y divide-border'>
            {businesses.slice(0, 5).map((business) => (
              <Link
                key={business._id}
                to={`/businesses/${business._id}`}
                className='flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors'
              >
                <div className='flex items-center gap-3'>
                  <div>
                    <p className='font-medium'>{business.name}</p>
                    <p className='text-sm text-muted-foreground'>
                      {business.externalBusinessId}
                    </p>
                  </div>
                </div>
                <div className='flex items-center gap-4 text-sm'>
                  <span className='text-muted-foreground'>
                    {business.currentSeatCount} seat
                    {business.currentSeatCount !== 1 ? 's' : ''}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      business.billingStatus === 'active'
                        ? 'bg-emerald-100 text-emerald-700'
                        : business.billingStatus === 'past_due'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {business.billingStatus.replace('_', ' ')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className='p-12 text-center'>
            <Building2 className='mx-auto h-12 w-12 text-muted-foreground/50' />
            <h3 className='mt-4 text-lg font-semibold'>No businesses yet</h3>
            <p className='mt-2 text-muted-foreground'>
              Get started by creating your first business
            </p>
            <Link to='/businesses/new' className='mt-4 inline-block'>
              <Button className='gap-2'>Create Business</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;
