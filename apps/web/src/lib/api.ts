import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ==========================================
// Types
// ==========================================
export interface Restaurant {
  _id: string;
  name: string;
  cuisine: string;
  category: string;
  rating: number;
  deliveryTime: string;
  deliveryFee: string;
  tags: string[];
  emoji: string;
  gradient: string;
  featured: boolean;
}

export interface PaginationResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface RestaurantListResponse {
  success: boolean;
  data: {
    restaurants: Restaurant[];
    pagination: PaginationResponse;
  };
  source?: 'cache' | 'database';
}

export interface RestaurantParams {
  search?: string;
  category?: string;
  sortBy?: 'rating' | 'name' | 'deliveryTime';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface UsernameCheckResponse {
  success: boolean;
  data: {
    username: string;
    exists: boolean;
    lookupMethod: string;
    responseTimeMs: number;
  };
}

export interface SystemStatsResponse {
  success: boolean;
  data: {
    cache: {
      hits: number;
      misses: number;
      hitRatio: string;
    };
    bloomFilter: {
      bitSize: number;
      numHashes: number;
      bitsSet: number;
      fillRatio: number;
    };
    redis: {
      memoryUsage: string;
    };
  };
}

// ==========================================
// Restaurant API
// ==========================================
export async function fetchRestaurants(
  params?: RestaurantParams
): Promise<RestaurantListResponse> {
  const response = await api.get<RestaurantListResponse>('/restaurants', { params });
  return response.data;
}

export async function fetchRestaurantById(id: string): Promise<Restaurant> {
  const response = await api.get<{ success: boolean; data: Restaurant }>(
    `/restaurants/${id}`
  );
  return response.data.data;
}

// ==========================================
// Auth API
// ==========================================
export async function checkUsername(username: string): Promise<UsernameCheckResponse> {
  const response = await api.get<UsernameCheckResponse>('/auth/check-username', {
    params: { username },
  });
  return response.data;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: {
      id: number;
      username: string;
      email: string;
    };
    token: string;
  };
}

export async function registerUser(payload: RegisterPayload): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/register', payload);
  return response.data;
}

export async function loginUser(payload: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/login', payload);
  return response.data;
}

// ==========================================
// System API
// ==========================================
export async function fetchSystemStats(): Promise<SystemStatsResponse> {
  const response = await api.get<SystemStatsResponse>('/system/stats');
  return response.data;
}

export default api;