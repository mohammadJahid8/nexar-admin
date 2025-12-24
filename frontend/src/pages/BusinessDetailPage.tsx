import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { businessApi } from '../api';
import type { Business, BillingDetailData, Invoice, SeatEvent } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  ArrowLeft,
  Building2,
  CreditCard,
  Users,
  ExternalLink,
  Copy,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  RefreshCw,
  Key,
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  Edit2,
  Save,
  X,
  Trash2,
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
    label: 'Pending Checkout',
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
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function BusinessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [business, setBusiness] = useState<Business | null>(null);
  const [billing, setBilling] = useState<BillingDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    contactEmail: '',
    seatPriceAudCents: '',
  });
  const [saving, setSaving] = useState(false);

  const [resettingKey, setResettingKey] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
      setEditForm({
        name: businessRes.business.name,
        contactEmail: businessRes.business.contactEmail || '',
        seatPriceAudCents: (
          businessRes.business.seatPriceAudCents / 100
        ).toString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load business');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!business) return;
    setSaving(true);
    setError(null);

    try {
      const response = await businessApi.update(business._id, {
        name: editForm.name,
        contactEmail: editForm.contactEmail || undefined,
        seatPriceAudCents: Math.round(
          parseFloat(editForm.seatPriceAudCents) * 100
        ),
      });

      setBusiness(response.business);
      setEditing(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update business'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleResetApiKey() {
    if (
      !business ||
      !confirm('Are you sure? The old API key will stop working immediately.')
    )
      return;
    setResettingKey(true);

    try {
      const response = await businessApi.resetApiKey(business._id);
      setNewApiKey(response.apiKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset API key');
    } finally {
      setResettingKey(false);
    }
  }

  function copyApiKey() {
    if (newApiKey) {
      navigator.clipboard.writeText(newApiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleDelete() {
    if (!business) return;

    const confirmMessage =
      business.billingStatus === 'active' ||
      business.billingStatus === 'past_due'
        ? 'This business has an active subscription. Please cancel it in Stripe first before deleting.'
        : `Are you sure you want to delete "${business.name}"? This action cannot be undone.`;

    if (!confirm(confirmMessage)) return;

    // Double-check for active subscriptions
    if (
      business.billingStatus === 'active' ||
      business.billingStatus === 'past_due'
    ) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await businessApi.delete(business._id);
      navigate('/businesses');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete business'
      );
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600' />
      </div>
    );
  }

  if (error && !business) {
    return (
      <div className='max-w-4xl mx-auto'>
        <button
          onClick={() => navigate('/businesses')}
          className='flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6'
        >
          <ArrowLeft className='h-4 w-4' />
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

  if (!business) return null;

  const status =
    statusConfig[business.billingStatus] || statusConfig.not_enabled;
  const StatusIcon = status.icon;

  return (
    <div className='max-w-full mx-auto space-y-6'>
      {/* Header */}
      <div className='flex items-center gap-4'>
        <button
          onClick={() => navigate('/businesses')}
          className='rounded-lg p-2 hover:bg-muted transition-colors'
        >
          <ArrowLeft className='h-5 w-5' />
        </button>

        <div className='flex-1 inline-flex items-center gap-2'>
          <h1 className='text-2xl font-bold'>{business.name}</h1>
          <p className='text-muted-foreground'>
            ({business.externalBusinessId})
          </p>
        </div>
        <div
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium ${status.className}`}
        >
          <StatusIcon className='h-4 w-4' />
          {status.label}
        </div>
      </div>

      {error && (
        <div className='rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20'>
          <div className='flex items-center gap-2 text-red-700 dark:text-red-400'>
            <AlertCircle className='h-5 w-5' />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* New API Key Alert */}
      {newApiKey && (
        <div className='rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 dark:border-emerald-800 dark:from-emerald-900/20 dark:to-teal-900/20'>
          <div className='flex items-center gap-2 text-emerald-700 dark:text-emerald-400'>
            <Key className='h-5 w-5' />
            <h3 className='font-semibold'>New API Key Generated</h3>
          </div>
          <p className='mt-2 text-emerald-800 dark:text-emerald-300 text-sm'>
            Save this key now. It will never be shown again.
          </p>
          <div className='mt-4 flex items-center gap-2'>
            <code className='flex-1 rounded bg-white px-3 py-2 font-mono text-sm break-all dark:bg-gray-900'>
              {newApiKey}
            </code>
            <Button
              variant='outline'
              size='icon'
              onClick={copyApiKey}
              className={copied ? 'text-emerald-600' : ''}
            >
              {copied ? (
                <CheckCircle2 className='h-4 w-4' />
              ) : (
                <Copy className='h-4 w-4' />
              )}
            </Button>
          </div>
        </div>
      )}

      <div className='grid gap-6 lg:grid-cols-2'>
        {/* Business Details */}
        <div className='rounded-xl border border-border bg-card p-6 '>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-lg font-semibold flex items-center gap-2'>
              <Building2 className='h-5 w-5 text-muted-foreground' />
              Business Details
            </h2>
            {!editing ? (
              <Button
                variant='outline'
                size='sm'
                onClick={() => setEditing(true)}
                className='gap-1.5'
              >
                <Edit2 className='h-3.5 w-3.5' />
                Edit
              </Button>
            ) : (
              <div className='flex gap-2'>
                <Button
                  size='sm'
                  onClick={handleSave}
                  disabled={saving}
                  className='gap-1.5'
                >
                  {saving ? (
                    <RefreshCw className='h-3.5 w-3.5 animate-spin' />
                  ) : (
                    <Save className='h-3.5 w-3.5' />
                  )}
                  Save
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setEditing(false)}
                >
                  <X className='h-3.5 w-3.5' />
                </Button>
              </div>
            )}
          </div>

          <div className='space-y-4'>
            <div>
              <label className='text-sm text-muted-foreground'>Name</label>
              {editing ? (
                <Input
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  className='mt-1'
                />
              ) : (
                <p className='font-medium'>{business.name}</p>
              )}
            </div>
            <div>
              <label className='text-sm text-muted-foreground'>Email</label>
              {editing ? (
                <Input
                  type='email'
                  value={editForm.contactEmail}
                  onChange={(e) =>
                    setEditForm({ ...editForm, contactEmail: e.target.value })
                  }
                  className='mt-1'
                  placeholder='billing@example.com'
                />
              ) : (
                <p className='font-medium'>{business.contactEmail || '—'}</p>
              )}
            </div>
            <div>
              <label className='text-sm text-muted-foreground'>
                Per User Price (AUD)
              </label>
              {editing ? (
                <div className='relative mt-1'>
                  <span className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'>
                    $
                  </span>
                  <Input
                    type='number'
                    min='0'
                    step='0.01'
                    value={editForm.seatPriceAudCents}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        seatPriceAudCents: e.target.value,
                      })
                    }
                    className='pl-8'
                  />
                </div>
              ) : (
                <p className='font-medium'>
                  {formatPrice(business.seatPriceAudCents)}/month
                </p>
              )}
            </div>
            <div>
              <label className='text-sm text-muted-foreground'>Created</label>
              <p className='font-medium'>{formatDate(business.createdAt)}</p>
            </div>
          </div>

          <div className='mt-6 pt-6 border-t flex gap-3'>
            <Button
              variant='outline'
              onClick={handleResetApiKey}
              disabled={resettingKey}
              className='gap-2 text-orange-600 border-orange-200 hover:bg-orange-50 dark:border-orange-800 dark:hover:bg-orange-900/20'
            >
              {resettingKey ? (
                <RefreshCw className='h-4 w-4 animate-spin' />
              ) : (
                <Key className='h-4 w-4' />
              )}
              Reset API Key
            </Button>
            <Button
              variant='outline'
              onClick={handleDelete}
              disabled={deleting}
              className='gap-2 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 disabled:opacity-50'
              title={
                business.billingStatus === 'active' ||
                business.billingStatus === 'past_due'
                  ? 'Cancel subscription first'
                  : 'Delete business'
              }
            >
              {deleting ? (
                <RefreshCw className='h-4 w-4 animate-spin' />
              ) : (
                <Trash2 className='h-4 w-4' />
              )}
              Delete Business
            </Button>
          </div>
        </div>

        {/* Billing Summary */}
        <div className='rounded-xl border border-border bg-card p-6 '>
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
                {billing?.billing.currentSeatCount || 0}
              </p>
            </div>
            <div className='rounded-lg bg-muted/50 p-4'>
              <div className='flex items-center gap-2 text-muted-foreground text-sm'>
                <CreditCard className='h-4 w-4' />
                Current Billed
              </div>
              <p className='text-2xl font-bold mt-1'>
                {formatPrice(
                  (billing?.billing.cumulativeSeatDays || 0) *
                    Math.round(business.seatPriceAudCents / 30)
                )}
              </p>
              <p className='text-xs text-muted-foreground mt-1'>
                {billing?.billing.cumulativeSeatDays || 0} seat-days reported
              </p>
            </div>
            <div className='rounded-lg bg-muted/50 p-4'>
              <div className='flex items-center gap-2 text-muted-foreground text-sm'>
                <CreditCard className='h-4 w-4' />
                Projected Bill
              </div>
              <p className='text-2xl font-bold mt-1'>
                {(() => {
                  const dailyRate = Math.round(business.seatPriceAudCents / 30);
                  const cumulativeDays =
                    billing?.billing.cumulativeSeatDays || 0;
                  const currentSeats = billing?.billing.currentSeatCount || 0;
                  const periodEnd = billing?.billing.currentPeriodEnd
                    ? new Date(billing.billing.currentPeriodEnd)
                    : new Date();
                  const now = new Date();
                  const daysRemaining = Math.max(
                    0,
                    Math.ceil(
                      (periodEnd.getTime() - now.getTime()) /
                        (1000 * 60 * 60 * 24)
                    )
                  );
                  const projectedTotal =
                    (cumulativeDays + currentSeats * daysRemaining) * dailyRate;
                  return formatPrice(projectedTotal);
                })()}
              </p>
              <p className='text-xs text-muted-foreground mt-1'>
                Est. at end of period
              </p>
            </div>
          </div>

          <div className='mt-4 space-y-3'>
            <div className='flex justify-between text-sm'>
              <span className='text-muted-foreground'>Billing Enabled</span>
              <span>{formatDate(billing?.billing.billingEnabledAt)}</span>
            </div>
            <div className='flex justify-between text-sm'>
              <span className='text-muted-foreground'>Current Period</span>
              <span>
                {billing?.billing.currentPeriodStart
                  ? `${formatDate(
                      billing.billing.currentPeriodStart
                    )} - ${formatDate(billing.billing.currentPeriodEnd)}`
                  : '—'}
              </span>
            </div>
            <div className='flex justify-between text-sm'>
              <span className='text-muted-foreground'>Stripe Subscription</span>
              <span className='font-mono text-xs'>
                {billing?.billing.stripeSubscriptionId?.slice(0, 20) || '—'}...
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Invoices */}
      <div className='rounded-xl border border-border bg-card p-6 '>
        <h2 className='text-lg font-semibold flex items-center gap-2 mb-4'>
          <FileText className='h-5 w-5 text-muted-foreground' />
          Recent Invoices
        </h2>

        {billing?.stripeInvoices && billing.stripeInvoices.length > 0 ? (
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b text-left'>
                  <th className='pb-3 font-medium text-muted-foreground'>
                    Date
                  </th>
                  <th className='pb-3 font-medium text-muted-foreground'>
                    Status
                  </th>
                  <th className='pb-3 font-medium text-muted-foreground text-right'>
                    Amount
                  </th>
                  <th className='pb-3 font-medium text-muted-foreground text-right'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {billing.stripeInvoices.map((invoice: Invoice, idx: number) => (
                  <tr key={idx} className='border-b last:border-0'>
                    <td className='py-3'>{formatDate(invoice.created)}</td>
                    <td className='py-3'>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          invoice.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-700'
                            : invoice.status === 'open'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className='py-3 text-right font-medium'>
                      {formatPrice(invoice.amountDue)}
                    </td>
                    <td className='py-3 text-right'>
                      {invoice.hostedInvoiceUrl && (
                        <a
                          href={invoice.hostedInvoiceUrl}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700'
                        >
                          View <ExternalLink className='h-3 w-3' />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className='text-muted-foreground text-center py-8'>
            No invoices yet
          </p>
        )}
      </div>

      {/* Seat History */}
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
    </div>
  );
}

export default BusinessDetailPage;
