import type { Business } from '@/types';
import { Button } from '../ui/button';
import { useState } from 'react';
import { RefreshCw, Trash2 } from 'lucide-react';
import { businessApi } from '@/api';
import { useNavigate } from 'react-router-dom';

interface DeleteBusinessProps {
  business: Business;
  setError: (error: string | null) => void;
}
export const DeleteBusiness = ({ business, setError }: DeleteBusinessProps) => {
  const [deleting, setDeleting] = useState(false);

  const navigate = useNavigate();

  async function handleDelete() {
    if (!business) return;

    const confirmMessage =
      `Are you sure you want to delete "${business.name}"? This will:\n\n` +
      `• Cancel any active Stripe subscription\n` +
      `• Delete all billing data\n• Delete all seat records\n\n` +
      `This action cannot be undone.`;

    if (!confirm(confirmMessage)) return;

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
  return (
    <div className='rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20'>
      <h3 className='font-semibold text-red-800 dark:text-red-400 mb-2'>
        Danger Zone
      </h3>
      <p className='text-sm text-red-700 dark:text-red-300 mb-4'>
        Deleting this business will cancel any active subscription and remove
        all data.
      </p>
      <Button
        variant='outline'
        onClick={handleDelete}
        disabled={deleting}
        className='gap-2 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20'
        title='Delete business and cancel subscription (if active)'
      >
        {deleting ? (
          <RefreshCw className='h-4 w-4 animate-spin' />
        ) : (
          <Trash2 className='h-4 w-4' />
        )}
        Delete Business
      </Button>
    </div>
  );
};
