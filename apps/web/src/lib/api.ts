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
}

export interface RestaurantParams {
  search?: string;
  category?: string;
  sortBy?: 'rating' | 'name' | 'deliveryTime';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// ==========================================
// API Functions
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

export async function checkUsername(username: string): Promise<boolean> {
  const response = await api.get<{
    success: boolean;
    data: { exists: boolean };
  }>('/auth/check-username', { params: { username } });
  return response.data.data.exists;
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

export default api;