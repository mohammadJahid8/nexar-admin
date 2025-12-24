import mongoose from 'mongoose';

const invoiceRecordSchema = new mongoose.Schema({
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: [true, 'Business ID is required'],
    index: true,
  },
  stripeInvoiceId: {
    type: String,
    required: [true, 'Stripe invoice ID is required'],
    unique: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['draft', 'open', 'paid', 'uncollectible', 'void'],
  },
  amountDue: {
    type: Number,
    required: true,
  },
  amountPaid: {
    type: Number,
    default: 0,
  },
  currency: {
    type: String,
    default: 'aud',
    lowercase: true,
  },
  hostedInvoiceUrl: {
    type: String,
  },
  invoicePdf: {
    type: String,
  },
  periodStart: {
    type: Date,
  },
  periodEnd: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes
invoiceRecordSchema.index({ businessId: 1, createdAt: -1 });
// invoiceRecordSchema.index({ stripeInvoiceId: 1 });

// Static method to upsert from Stripe invoice
invoiceRecordSchema.statics.upsertFromStripeInvoice = async function (businessId, invoice) {
  return this.findOneAndUpdate(
    { stripeInvoiceId: invoice.id },
    {
      businessId,
      stripeInvoiceId: invoice.id,
      status: invoice.status,
      amountDue: invoice.amount_due,
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      invoicePdf: invoice.invoice_pdf,
      periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : null,
      periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : null,
    },
    { upsert: true, new: true },
  );
};

const InvoiceRecord = mongoose.model('InvoiceRecord', invoiceRecordSchema);

export default InvoiceRecord;
