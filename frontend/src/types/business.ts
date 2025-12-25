export interface Business {
  _id: string;
  name: string;
  externalBusinessId: string;
  contactEmail?: string;
  seatPriceAudCents: number;
  currency: string;
  billingStatus: BillingStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeSubscriptionItemId?: string;
  currentSeatCount: number;
  cumulativeSeatDays?: number;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  billingEnabledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type BillingStatus =
  | 'not_enabled'
  | 'pending_checkout'
  | 'active'
  | 'past_due'
  | 'canceled';

// Base API response wrapper (from sendResponse)
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface CreateBusinessRequest {
  name: string;
  externalBusinessId: string;
  contactEmail?: string;
  seatPriceAudCents: number;
}

export interface UpdateBusinessRequest {
  name?: string;
  contactEmail?: string;
  seatPriceAudCents?: number;
}

// Response data types (what's inside data)
export interface CreateBusinessData {
  business: Business;
  apiKey: string;
}

export interface BusinessListData {
  businesses: Business[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface Invoice {
  stripeInvoiceId: string;
  status: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  hostedInvoiceUrl?: string;
  invoicePdf?: string;
  created: string;
  periodStart?: string;
  periodEnd?: string;
}

export interface SeatEvent {
  _id: string;
  businessId: string;
  delta: number;
  reason?: string;
  at: string;
  externalActor: string;
  resultingSeatCount: number;
}

export interface BillingSummary {
  status: BillingStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeSubscriptionItemId?: string;
  currentSeatCount: number;
  seatPriceAudCents: number;
  cumulativeSeatDays?: number;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  billingEnabledAt?: string;
  lastUsageSyncAt?: string;
}

export interface EstimatedBill {
  currentSeatCount: number;
  dailyRateCents: number;
  dailyRateAud: string;
  periodStart: string;
  periodEnd: string;
  totalDaysInPeriod: number;
  daysRemaining: number;
  reportedSeatDays: number;
  reportedAmountCents: number;
  reportedAmountAud: string;
  unreportedSeatDays: number;
  unreportedAmountCents: number;
  unreportedAmountAud: string;
  currentTotalSeatDays: number;
  currentTotalCents: number;
  currentTotalAud: string;
  projectedTotalSeatDays: number;
  projectedTotalCents: number;
  projectedTotalAud: string;
  perUserBreakdown?: {
    externalUserId: string;
    activatedAt: string;
    lastBilledAt: string | null;
    daysSinceStart: number;
    daysUntilPeriodEnd: number;
  }[];
}

export interface BillingDetailData {
  billing: BillingSummary;
  estimatedBill: EstimatedBill | null;
  invoices: Invoice[];
  stripeInvoices: Invoice[];
  seatHistory: SeatEvent[];
}

export interface ResetApiKeyData {
  business: Business;
  apiKey: string;
}
