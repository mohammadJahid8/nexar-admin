import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { businessApi } from '../api';
import type { Business, CreateBusinessRequest } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Skeleton } from '../components/ui/skeleton';
import {
  Building2,
  Plus,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  ExternalLink,
  MoreHorizontal,
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
  return `$${(cents / 100).toFixed(2)}`;
}

interface CreateFormData extends CreateBusinessRequest {
  domain?: string;
}

export function BusinessesPage() {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState<CreateFormData>({
    name: '',
    externalBusinessId: '',
    contactEmail: '',
    seatPriceAudCents: 5000,
    domain: '',
  });

  // Selection and delete state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'single' | 'bulk';
    id?: string;
    name?: string;
  } | null>(null);

  useEffect(() => {
    loadBusinesses();
  }, []);

  async function loadBusinesses() {
    try {
      setLoading(true);
      setError(null);
      const response = await businessApi.list({ limit: 100 });
      setBusinesses(response?.businesses || []);
      setSelectedIds(new Set());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load businesses'
      );
    } finally {
      setLoading(false);
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      const result = await businessApi.create(formData);
      setIsDialogOpen(false);
      setFormData({
        name: '',
        externalBusinessId: '',
        contactEmail: '',
        seatPriceAudCents: 5000,
        domain: '',
      });
      // Navigate to new business detail to show API key
      navigate(`/businesses/${result.business._id}`);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to create business'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredBusinesses.map((b) => b._id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const openDeleteConfirm = (
    type: 'single' | 'bulk',
    id?: string,
    name?: string
  ) => {
    setDeleteTarget({ type, id, name });
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      if (deleteTarget.type === 'single' && deleteTarget.id) {
        await businessApi.delete(deleteTarget.id);
      } else if (deleteTarget.type === 'bulk') {
        await businessApi.bulkDelete(Array.from(selectedIds));
      }
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
      await loadBusinesses();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete business(es)'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredBusinesses = businesses.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.externalBusinessId.toLowerCase().includes(search.toLowerCase())
  );

  const allSelected =
    filteredBusinesses.length > 0 &&
    filteredBusinesses.every((b) => selectedIds.has(b._id));
  const someSelected = selectedIds.size > 0;

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-2xl font-bold flex items-center gap-2'>
            <Building2 className='h-6 w-6' />
            Businesses
          </h1>
          <p className='text-muted-foreground mt-1'>
            Manage CRM businesses and their billing
          </p>
        </div>

        <div className='flex gap-2'>
          {someSelected && (
            <Button
              variant='destructive'
              onClick={() => openDeleteConfirm('bulk')}
              disabled={isDeleting}
            >
              <Trash2 className='h-4 w-4 mr-2' />
              Delete ({selectedIds.size})
            </Button>
          )}

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className='h-4 w-4 mr-2' />
                Create Business
              </Button>
            </DialogTrigger>
            <DialogContent className='sm:max-w-lg'>
              <DialogHeader>
                <DialogTitle>Create New Business</DialogTitle>
                <DialogDescription>
                  Add a new CRM business to the billing system.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreate} className='space-y-4'>
                {formError && (
                  <div className='p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm'>
                    {formError}
                  </div>
                )}

                <div className='space-y-2'>
                  <Label htmlFor='name'>Business Name *</Label>
                  <Input
                    id='name'
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder='Nexar Tech'
                    required
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='externalBusinessId'>
                    External Business ID *
                  </Label>
                  <Input
                    id='externalBusinessId'
                    value={formData.externalBusinessId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        externalBusinessId: e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9_-]/g, ''),
                      })
                    }
                    placeholder='nexar-technologies'
                    required
                  />
                  <p className='text-xs text-muted-foreground'>
                    Lowercase letters, numbers, hyphens, underscores only
                  </p>
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='contactEmail'>Business Email</Label>
                    <Input
                      id='contactEmail'
                      type='email'
                      value={formData.contactEmail}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contactEmail: e.target.value,
                        })
                      }
                      placeholder=''
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='domain'>Domain</Label>
                    <Input
                      id='domain'
                      value={formData.domain}
                      onChange={(e) =>
                        setFormData({ ...formData, domain: e.target.value })
                      }
                      placeholder='nexartechnologies.com'
                    />
                  </div>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='seatPriceAudCents'>
                    Price per User (AUD/month) *
                  </Label>
                  <div className='relative'>
                    <span className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'>
                      $
                    </span>
                    <Input
                      id='seatPriceAudCents'
                      type='number'
                      step='0.01'
                      min='0'
                      value={(formData.seatPriceAudCents / 100).toFixed(2)}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          seatPriceAudCents: Math.round(
                            parseFloat(e.target.value || '0') * 100
                          ),
                        })
                      }
                      className='pl-8'
                      required
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type='submit' disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        Creating...
                      </>
                    ) : (
                      'Create Business'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
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

      {/* Error */}
      {error && (
        <div className='p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive flex items-center gap-2'>
          <AlertCircle className='h-5 w-5' />
          {error}
          <Button
            variant='outline'
            size='sm'
            className='ml-auto'
            onClick={loadBusinesses}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Businesses Table */}
      <div className='rounded-xl border border-border bg-card'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-[50px]'>
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) =>
                    handleSelectAll(checked as boolean)
                  }
                  aria-label='Select all'
                />
              </TableHead>
              <TableHead>Business</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Price/User</TableHead>
              <TableHead className='w-[80px]'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              // Skeleton loaders
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className='h-4 w-4' />
                  </TableCell>
                  <TableCell>
                    <div className='space-y-1'>
                      <Skeleton className='h-4 w-32' />
                      <Skeleton className='h-3 w-24' />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-6 w-20' />
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-4 w-8' />
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-4 w-16' />
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-8 w-8' />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredBusinesses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className='text-center py-12'>
                  <Building2 className='mx-auto h-12 w-12 text-muted-foreground/50' />
                  <h3 className='mt-4 text-lg font-semibold'>
                    No businesses found
                  </h3>
                  <p className='mt-1 text-muted-foreground'>
                    {search
                      ? 'Try adjusting your search'
                      : 'Get started by creating your first business'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredBusinesses.map((business) => {
                const status =
                  statusConfig[business.billingStatus] ||
                  statusConfig.not_enabled;
                const StatusIcon = status.icon;

                return (
                  <TableRow key={business._id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(business._id)}
                        onCheckedChange={(checked) =>
                          handleSelectOne(business._id, checked as boolean)
                        }
                        aria-label={`Select ${business.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className='font-medium'>{business.name}</div>
                        <div className='text-sm text-muted-foreground'>
                          {business.externalBusinessId}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.className}`}
                      >
                        <StatusIcon className='h-3 w-3' />
                        {status.label}
                      </span>
                    </TableCell>
                    <TableCell>{business.currentSeatCount}</TableCell>
                    <TableCell>
                      {formatPrice(business.seatPriceAudCents)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant='ghost' size='sm'>
                            <MoreHorizontal className='h-4 w-4' />
                            <span className='sr-only'>Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuItem asChild>
                            <Link to={`/businesses/${business._id}`}>
                              <ExternalLink className='mr-2 h-4 w-4' />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className='text-destructive focus:text-destructive'
                            onClick={() =>
                              openDeleteConfirm(
                                'single',
                                business._id,
                                business.name
                              )
                            }
                          >
                            <Trash2 className='mr-2 h-4 w-4' />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              {deleteTarget?.type === 'single' ? (
                <>
                  Are you sure you want to delete{' '}
                  <strong>{deleteTarget.name}</strong>? This will also cancel
                  any active Stripe subscription and delete all related data.
                </>
              ) : (
                <>
                  Are you sure you want to delete{' '}
                  <strong>{selectedIds.size} businesses</strong>? This will
                  cancel all active Stripe subscriptions and delete all related
                  data.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant='destructive'
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default BusinessesPage;
