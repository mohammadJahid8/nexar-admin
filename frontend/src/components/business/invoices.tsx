import { useState } from 'react';
import { FileText, ExternalLink } from 'lucide-react';
import type { BillingDetailData, Invoice } from '../../types';

interface InvoicesSectionProps {
  billing: BillingDetailData | null;
  formatPrice: (cents: number) => string;
  formatDate: (date?: string) => string;
}

export function InvoicesSection({
  billing,
  formatPrice,
  formatDate,
}: InvoicesSectionProps) {
  const [invoiceFilter, setInvoiceFilter] = useState<string>('all');

  if (!billing) return null;

  return (
    <div className='rounded-xl border border-border bg-card p-6'>
      <div className='flex items-center justify-between mb-4'>
        <h2 className='text-lg font-semibold flex items-center gap-2'>
          <FileText className='h-5 w-5 text-muted-foreground' />
          Recent Invoices
        </h2>
        <select
          value={invoiceFilter}
          onChange={(e) => setInvoiceFilter(e.target.value)}
          className='px-3 py-1.5 text-sm border rounded-md bg-background'
        >
          {(() => {
            // Generate unique months from invoices
            const months = new Set<string>();
            billing?.stripeInvoices?.forEach((inv) => {
              const date = new Date(inv.created);
              const monthYear = `${date.toLocaleString('en-US', {
                month: 'long',
              })} ${date.getFullYear()}`;
              months.add(monthYear);
            });

            const sortedMonths = Array.from(months).sort((a, b) => {
              const dateA = new Date(a);
              const dateB = new Date(b);
              return dateB.getTime() - dateA.getTime(); // Newest first
            });

            return (
              <>
                <option value='all'>All Months</option>
                {sortedMonths.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </>
            );
          })()}
        </select>
      </div>

      {(() => {
        const filteredInvoices =
          billing?.stripeInvoices?.filter((inv) => {
            if (invoiceFilter === 'all') return true;
            const invDate = new Date(inv.created);
            const monthYear = `${invDate.toLocaleString('en-US', {
              month: 'long',
            })} ${invDate.getFullYear()}`;
            return monthYear === invoiceFilter;
          }) || [];

        return filteredInvoices.length > 0 ? (
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
                {filteredInvoices.map((invoice: Invoice, idx: number) => (
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
                          View
                          <ExternalLink className='h-3 w-3' />
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
            {invoiceFilter === 'all'
              ? 'No invoices yet'
              : 'No invoices for selected period'}
          </p>
        );
      })()}
    </div>
  );
}
