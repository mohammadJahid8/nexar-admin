import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { businessApi } from '../api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Building2,
  Copy,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  DollarSign,
  Mail,
  Tag,
} from 'lucide-react';

export function CreateBusinessPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    name: '',
    externalBusinessId: '',
    contactEmail: '',
    seatPriceAudCents: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await businessApi.create({
        name: form.name,
        externalBusinessId: form.externalBusinessId,
        contactEmail: form.contactEmail || undefined,
        seatPriceAudCents: Math.round(parseFloat(form.seatPriceAudCents) * 100),
      });

      setApiKey(response.apiKey);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create business'
      );
    } finally {
      setLoading(false);
    }
  }

  function copyApiKey() {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  // Show success screen with API key
  if (apiKey) {
    return (
      <div className='max-w-2xl mx-auto space-y-6'>
        <div className='rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-8 dark:border-emerald-800 dark:from-emerald-900/20 dark:to-teal-900/20'>
          <div className='flex items-center gap-3 text-emerald-700 dark:text-emerald-400'>
            <CheckCircle2 className='h-8 w-8' />
            <h2 className='text-2xl font-bold'>Business Created!</h2>
          </div>

          <p className='mt-4 text-emerald-800 dark:text-emerald-300'>
            Save this API key now. It will <strong>never be shown again</strong>
            .
          </p>

          <div className='mt-6 rounded-lg border border-emerald-300 bg-white p-4 dark:border-emerald-700 dark:bg-gray-900'>
            <label className='text-sm font-medium text-muted-foreground'>
              API Key
            </label>
            <div className='mt-2 flex items-center gap-2'>
              <code className='flex-1 rounded bg-muted px-3 py-2 font-mono text-sm break-all'>
                {apiKey}
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

          <div className='mt-6 flex gap-3'>
            <Button onClick={() => navigate('/businesses')} className='gap-2'>
              View All Businesses
            </Button>
            <Button
              variant='outline'
              onClick={() => {
                setApiKey(null);
                setForm({
                  name: '',
                  externalBusinessId: '',
                  contactEmail: '',
                  seatPriceAudCents: '',
                });
              }}
            >
              Create Another
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='max-w-2xl mx-auto space-y-6'>
      {/* Header */}
      <div className='flex items-center gap-4'>
        <button
          onClick={() => navigate('/businesses')}
          className='rounded-lg p-2 hover:bg-muted transition-colors'
        >
          <ArrowLeft className='h-5 w-5' />
        </button>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Create Business</h1>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className='space-y-6'>
        <div className='rounded-xl border border-border bg-card p-6 shadow-sm space-y-6'>
          {error && (
            <div className='rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20'>
              <div className='flex items-center gap-2 text-red-700 dark:text-red-400'>
                <AlertCircle className='h-5 w-5' />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Business Name */}
          <div className='space-y-2'>
            <label className='text-sm font-medium flex items-center gap-2'>
              <Building2 className='h-4 w-4 text-muted-foreground' />
              Business Name *
            </label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder='Nexar CRM'
              required
            />
          </div>

          {/* External Business ID */}
          <div className='space-y-2'>
            <label className='text-sm font-medium flex items-center gap-2'>
              <Tag className='h-4 w-4 text-muted-foreground' />
              External Business ID *
            </label>
            <Input
              value={form.externalBusinessId}
              onChange={(e) =>
                setForm({
                  ...form,
                  externalBusinessId: e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9_-]/g, ''),
                })
              }
              placeholder='nexar-crm-1'
              required
              pattern='[a-z0-9_-]+'
            />
            <p className='text-xs text-muted-foreground'>
              Lowercase letters, numbers, hyphens, and underscores only. Used by
              CRM for API calls.
            </p>
          </div>

          {/* Contact Email */}
          <div className='space-y-2'>
            <label className='text-sm font-medium flex items-center gap-2'>
              <Mail className='h-4 w-4 text-muted-foreground' />
              Email
            </label>
            <Input
              type='email'
              value={form.contactEmail}
              onChange={(e) =>
                setForm({ ...form, contactEmail: e.target.value })
              }
              placeholder='billing@nexar.com'
            />
          </div>

          {/* Seat Price */}
          <div className='space-y-2'>
            <label className='text-sm font-medium flex items-center gap-2'>
              <DollarSign className='h-4 w-4 text-muted-foreground' />
              Seat Price (AUD) *
            </label>
            <div className='relative'>
              <span className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'>
                $
              </span>
              <Input
                type='number'
                min='0'
                step='0.01'
                value={form.seatPriceAudCents}
                onChange={(e) =>
                  setForm({ ...form, seatPriceAudCents: e.target.value })
                }
                placeholder='50.00'
                className='pl-8'
                required
              />
            </div>
            <p className='text-xs text-muted-foreground'>
              Monthly price per seat in AUD
            </p>
          </div>
        </div>

        <div className='flex gap-3'>
          <Button type='submit' disabled={loading} className='gap-2'>
            {loading ? (
              <>
                <span className='animate-spin rounded-full h-4 w-4 border-b-2 border-white' />
                Creating...
              </>
            ) : (
              'Create Business'
            )}
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={() => navigate('/businesses')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

export default CreateBusinessPage;
