import { useState } from 'react';
import { Key, Eye, EyeOff, Copy, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/button';
import type { Business } from '../../types';
import { businessApi } from '@/api';

interface ApiKeySectionProps {
  business: Business;
  setBusiness: (business: Business) => void;
  setError: (error: string | null) => void;
}

export function ApiKeySection({
  business,
  setBusiness,
  setError,
}: ApiKeySectionProps) {
  console.log('🚀 ~ ApiKeySection ~ business:', business);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);

  async function handleResetApiKey() {
    if (!business) return;

    const confirmed = confirm(
      'Are you sure you want to reset the API key? The old key will stop working immediately.'
    );
    if (!confirmed) return;

    try {
      setResetting(true);
      const { apiKey } = await businessApi.resetApiKey(business._id);
      setNewApiKey(apiKey);
      // Refresh business data
      const { business: updated } = await businessApi.get(business._id);
      setBusiness(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset API key');
    } finally {
      setResetting(false);
    }
  }

  function copyApiKey() {
    navigator.clipboard.writeText(newApiKey || business.apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className='rounded-xl border border-border bg-card p-6'>
      <h2 className='text-lg font-semibold flex items-center gap-2 mb-4'>
        <Key className='h-5 w-5 text-muted-foreground' />
        API Key
      </h2>

      <div>
        <label className='text-sm text-muted-foreground'>API Key</label>
        <div className='flex items-center gap-2 mt-1'>
          <code className='flex-1 rounded bg-muted px-3 py-2 font-mono text-xs overflow-hidden'>
            {newApiKey ? (
              <span className='text-green-600 dark:text-green-400'>
                {newApiKey}
              </span>
            ) : showApiKey ? (
              business.apiKey
            ) : (
              'nxr_live_••••••••••••••••••••••••••'
            )}
          </code>

          {/* Toggle visibility */}
          <Button
            variant='outline'
            size='icon'
            onClick={() => setShowApiKey(!showApiKey)}
            className='h-8 w-8'
            title={showApiKey ? 'Hide API key' : 'Show API key'}
          >
            {showApiKey ? (
              <EyeOff className='h-4 w-4' />
            ) : (
              <Eye className='h-4 w-4' />
            )}
          </Button>

          {/* Copy button */}
          <Button
            variant='outline'
            size='icon'
            onClick={copyApiKey}
            className='h-8 w-8'
            title='Copy API key'
          >
            {copied ? (
              <CheckCircle2 className='h-4 w-4 text-green-600' />
            ) : (
              <Copy className='h-4 w-4' />
            )}
          </Button>

          {/* Reset button */}
          <Button
            variant='outline'
            size='sm'
            onClick={handleResetApiKey}
            disabled={resetting}
            className='text-xs'
          >
            {resetting ? 'Resetting...' : 'Reset'}
          </Button>
        </div>

        {newApiKey && (
          <p className='text-xs text-green-600 dark:text-green-400 mt-1'>
            ✓ New API key generated. Save it now - it won't be shown again.
          </p>
        )}
      </div>
    </div>
  );
}
