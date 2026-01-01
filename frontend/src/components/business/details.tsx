import { useState } from 'react';
import { Building2, Edit2, Save, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import type { Business } from '../../types';

interface BusinessDetailsCardProps {
  business: Business;
  onUpdate: (id: string, data: Partial<Business>) => Promise<void>;
  formatPrice: (cents: number) => string;
  formatDate: (date?: string) => string;
}

export function BusinessDetailsCard({
  business,
  onUpdate,
  formatPrice,
  formatDate,
}: BusinessDetailsCardProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: business.name,
    contactEmail: business.contactEmail || '',
    seatPriceAudCents: (business.seatPriceAudCents / 100).toFixed(2),
  });

  async function handleSave() {
    setSaving(true);
    try {
      await onUpdate(business._id, {
        name: editForm.name,
        contactEmail: editForm.contactEmail,
        seatPriceAudCents: Math.round(
          parseFloat(editForm.seatPriceAudCents) * 100
        ),
      });
      setEditing(false);
    } catch (err) {
      console.error('Failed to update:', err);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setEditForm({
      name: business.name,
      contactEmail: business.contactEmail || '',
      seatPriceAudCents: (business.seatPriceAudCents / 100).toFixed(2),
    });
    setEditing(false);
  }

  return (
    <div className='rounded-xl border border-border bg-card p-6'>
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
            className='gap-2'
          >
            <Edit2 className='h-3.5 w-3.5' />
            Edit
          </Button>
        ) : (
          <div className='flex gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={handleSave}
              disabled={saving}
              className='gap-2'
            >
              {saving ? (
                'Saving...'
              ) : (
                <>
                  <Save className='h-3.5 w-3.5' />
                  Save
                </>
              )}
            </Button>
            <Button
              variant='ghost'
              size='sm'
              onClick={handleCancel}
              disabled={saving}
              className='gap-2'
            >
              <X className='h-3.5 w-3.5' />
            </Button>
          </div>
        )}
      </div>

      <div className='space-y-4'>
        <div>
          <label className='text-sm text-muted-foreground'>Business ID</label>
          <p className='font-mono text-sm font-medium'>
            {business.externalBusinessId}
          </p>
        </div>

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
    </div>
  );
}
