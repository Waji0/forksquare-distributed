// import axios from 'axios';

// const api = axios.create({
//   baseURL: '/api',
//   headers: {
//     'Content-Type': 'application/json',
//   },
// });

// // Request interceptor: attach JWT token to every request
// api.interceptors.request.use((config) => {
//   const token = localStorage.getItem('token');
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }
//   return config;
// });

// // Response interceptor: handle 401 globally
// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response?.status === 401) {
//       localStorage.removeItem('token');
//       localStorage.removeItem('user');
//       // Redirect to login if needed
//     }
//     return Promise.reject(error);
//   }
// );

// // ==========================================
// // Types
// // ==========================================
// export interface Restaurant {
//   _id: string;
//   name: string;
//   cuisine: string;
//   category: string;
//   rating: number;
//   deliveryTime: string;
//   deliveryFee: string;
//   tags: string[];
//   emoji: string;
//   gradient: string;
//   featured: boolean;
// }

// export interface PaginationResponse {
//   page: number;
//   limit: number;
//   total: number;
//   totalPages: number;
// }

// export interface RestaurantListResponse {
//   success: boolean;
//   data: {
//     restaurants: Restaurant[];
//     pagination: PaginationResponse;
//   };
//   source?: 'cache' | 'database';
// }

// export interface RestaurantParams {
//   search?: string;
//   category?: string;
//   sortBy?: 'rating' | 'name' | 'deliveryTime';
//   sortOrder?: 'asc' | 'desc';
//   page?: number;
//   limit?: number;
// }

// export interface UsernameCheckResponse {
//   success: boolean;
//   data: {
//     username: string;
//     exists: boolean;
//     lookupMethod: string;
//     responseTimeMs: number;
//   };
// }

// export interface SystemStatsResponse {
//   success: boolean;
//   data: {
//     cache: {
//       hits: number;
//       misses: number;
//       hitRatio: string;
//     };
//     bloomFilter: {
//       bitSize: number;
//       numHashes: number;
//       bitsSet: number;
//       fillRatio: number;
//     };
//     redis: {
//       memoryUsage: string;
//     };
//   };
// }

// // ==========================================
// // Restaurant API
// // ==========================================
// export async function fetchRestaurants(
//   params?: RestaurantParams
// ): Promise<RestaurantListResponse> {
//   const response = await api.get<RestaurantListResponse>('/restaurants', { params });
//   return response.data;
// }

// export async function fetchRestaurantById(id: string): Promise<Restaurant> {
//   const response = await api.get<{ success: boolean; data: Restaurant }>(
//     `/restaurants/${id}`
//   );
//   return response.data.data;
// }

// // ==========================================
// // Auth API
// // ==========================================
// export async function checkUsername(username: string): Promise<UsernameCheckResponse> {
//   const response = await api.get<UsernameCheckResponse>('/auth/check-username', {
//     params: { username },
//   });
//   return response.data;
// }

// export interface RegisterPayload {
//   username: string;
//   email: string;
//   password: string;
// }

// export interface AuthResponse {
//   success: boolean;
//   data: {
//     user: {
//       id: number;
//       username: string;
//       email: string;
//     };
//     token: string;
//   };
// }

// export async function registerUser(payload: RegisterPayload): Promise<AuthResponse> {
//   const response = await api.post<AuthResponse>('/auth/register', payload);
//   return response.data;
// }

// export async function loginUser(payload: {
//   email: string;
//   password: string;
// }): Promise<AuthResponse> {
//   const response = await api.post<AuthResponse>('/auth/login', payload);
//   return response.data;
// }

// // ==========================================
// // System API
// // ==========================================
// export async function fetchSystemStats(): Promise<SystemStatsResponse> {
//   const response = await api.get<SystemStatsResponse>('/system/stats');
//   return response.data;
// }

// export default api;





import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login if needed
    }
    return Promise.reject(error);
  }
);

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
      role: string;
      isVerified: boolean;
    };
    accessToken: string;
    refreshToken: string;
    message?: string;
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


export async function forgotPassword(email: string) {
  const response = await api.post<{ success: boolean; message: string }>('/auth/forgot-password', { email });
  return response.data;
}

export async function resetPassword(token: string, newPassword: string) {
  const response = await api.post<{ success: boolean; message: string }>('/auth/reset-password', { token, newPassword });
  return response.data;
}

export interface UpdateProfilePayload {
  username?: string;
  email?: string;
}

export interface UpdateProfileResponse {
  success: boolean;
  data: {
    user: {
      id: number;
      username: string;
      email: string;
      role: string;
      isVerified: boolean;
    };
    message: string;
  };
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<UpdateProfileResponse> {
  const response = await api.put<UpdateProfileResponse>('/users/profile', payload);
  return response.data;
}


export interface CreateRestaurantPayload {
  name: string;
  cuisine: string;
  category: string;
  rating?: number;
  deliveryTime: string;
  deliveryFee: string;
  tags?: string;
  emoji?: string;
  gradient?: string;
  featured?: boolean;
}

export interface CreateRestaurantResponse {
  success: boolean;
  data: Restaurant;
  message: string;
}

// export async function createRestaurant(
//   payload: FormData
// ): Promise<CreateRestaurantResponse> {
//   const response = await api.post<CreateRestaurantResponse>('/restaurants', payload, {
//     headers: {
//       'Content-Type': 'multipart/form-data',
//     },
//   });
//   return response.data;
// }

export async function createRestaurant(
  payload: FormData
): Promise<CreateRestaurantResponse> {
  // Axios automatically sets the correct 'multipart/form-data; boundary=...' 
  // when you pass a FormData object. Do not override it manually!
  const response = await api.post<CreateRestaurantResponse>('/restaurants', payload);
  return response.data;
}


export interface MenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
  restaurantId: string;
  isAvailable: boolean;
}

export async function getMenuItems(restaurantId: string) {
  const response = await api.get<{ success: boolean; data: MenuItem[] }>(`/menu/${restaurantId}`);
  return response.data.data;
}

export async function createMenuItem(restaurantId: string, payload: FormData) {
  const response = await api.post<{ success: boolean; data: MenuItem }>(`/menu/${restaurantId}`, payload);
  return response.data;
}

export async function updateMenuItem(restaurantId: string, menuId: string, payload: FormData) {
  const response = await api.put<{ success: boolean; data: MenuItem }>(`/menu/${restaurantId}/${menuId}`, payload);
  return response.data;
}

export async function deleteMenuItem(restaurantId: string, menuId: string) {
  const response = await api.delete<{ success: boolean }>(`/menu/${restaurantId}/${menuId}`);
  return response.data;
}


export default api;