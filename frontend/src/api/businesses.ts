import api from './client';
import type {
  ApiResponse,
  Business,
  BusinessListData,
  CreateBusinessRequest,
  CreateBusinessData,
  UpdateBusinessRequest,
  BillingDetailData,
  ResetApiKeyData,
} from '../types';

export const businessApi = {
  /**
   * Create a new business
   */
  create: async (data: CreateBusinessRequest) => {
    const response = await api.post<ApiResponse<CreateBusinessData>>('/admin/businesses', data);
    return response.data;
  },

  /**
   * List all businesses
   */
  list: async (params?: { limit?: number; offset?: number; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    if (params?.status) searchParams.set('status', params.status);

    const query = searchParams.toString();
    const response = await api.get<ApiResponse<BusinessListData>>(`/admin/businesses${query ? `?${query}` : ''}`);
    return response.data;
  },

  /**
   * Get a single business
   */
  get: async (id: string) => {
    const response = await api.get<ApiResponse<{ business: Business }>>(`/admin/businesses/${id}`);
    return response.data;
  },

  /**
   * Update a business
   */
  update: async (id: string, data: UpdateBusinessRequest) => {
    const response = await api.patch<ApiResponse<{ business: Business }>>(`/admin/businesses/${id}`, data);
    return response.data;
  },

  /**
   * Get billing details
   */
  getBilling: async (id: string) => {
    const response = await api.get<ApiResponse<BillingDetailData>>(`/admin/businesses/${id}/billing`);
    return response.data;
  },

  /**
   * Reset API key
   */
  resetApiKey: async (id: string) => {
    const response = await api.post<ApiResponse<ResetApiKeyData>>(`/admin/businesses/${id}/reset-api-key`, {});
    return response.data;
  },

  /**
   * Delete a business
   */
  delete: async (id: string) => {
    const response = await api.delete<ApiResponse<{ deleted: boolean; businessId: string }>>(`/admin/businesses/${id}`);
    return response.data;
  },

  /**
   * Get dashboard stats
   */
  getDashboardStats: async () => {
    const response = await api.get<ApiResponse<DashboardStats>>('/admin/dashboard/stats');
    return response.data;
  },
};

export interface DashboardStats {
  totalBusinesses: number;
  activeSubscriptions: number;
  pendingCheckouts: number;
  pastDue: number;
  totalSeats: number;
  currentBilledCents: number;
  projectedBillCents: number;
  monthlyPaidRevenueCents: number;
}

export default businessApi;


