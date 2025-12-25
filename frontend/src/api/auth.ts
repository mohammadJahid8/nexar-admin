import { API_BASE_URL as API_URL } from '@/config/api';


export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'super_admin' | 'admin';
  lastLoginAt?: string;
  createdAt: string;
}

export interface LoginResponse {
  token: string;
  user: AdminUser;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'super_admin' | 'admin';
}

// Get auth token from storage
const getToken = (): string | null => {
  return localStorage.getItem('admin_token');
};

// Set auth token in storage  
export const setToken = (token: string): void => {
  localStorage.setItem('admin_token', token);
};

// Remove auth token
export const removeToken = (): void => {
  localStorage.removeItem('admin_token');
};

// Get auth headers
const getAuthHeaders = (): HeadersInit => {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

/**
 * Login with email and password
 */
export const login = async (email: string, password: string): Promise<LoginResponse> => {
  console.log("API_URL", API_URL)
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Login failed');
  }

  return data.data;
};

/**
 * Get current authenticated user
 */
export const getMe = async (): Promise<AdminUser> => {
  const res = await fetch(`${API_URL}/auth/me`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Failed to get user');
  }

  return data.data;
};

/**
 * Get all admin users
 */
export const getUsers = async (): Promise<AdminUser[]> => {
  const res = await fetch(`${API_URL}/admin/users`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Failed to get users');
  }

  return data.data.users;
};

/**
 * Create new admin user
 */
export const createUser = async (userData: CreateUserRequest): Promise<AdminUser> => {
  const res = await fetch(`${API_URL}/admin/users`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(userData),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Failed to create user');
  }

  return data.data.user;
};

/**
 * Delete admin user
 */
export const deleteUser = async (userId: string): Promise<void> => {
  const res = await fetch(`${API_URL}/admin/users/${userId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Failed to delete user');
  }
};
