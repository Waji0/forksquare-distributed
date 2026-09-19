export type CategoryId =
  | 'all'
  | 'bbq'
  | 'pizza'
  | 'healthy'
  | 'dessert'
  | 'traditional';

export type Category = {
  id: CategoryId;
  label: string;
  emoji: string;
};

export type Restaurant = {
  id: string;
  name: string;
  cuisine: string;
  category: CategoryId;
  rating: number;
  deliveryTime: string;
  deliveryFee: string;
  tags: string[];
  gradient: string;
  emoji: string;
  featured?: boolean;
};

export const categories: Category[] = [
  { id: 'all', label: 'All', emoji: '🍽️' },
  { id: 'bbq', label: 'BBQ', emoji: '🍢' },
  { id: 'pizza', label: 'Pizza', emoji: '🍕' },
  { id: 'healthy', label: 'Healthy', emoji: '🥗' },
  { id: 'dessert', label: 'Dessert', emoji: '🍰' },
  { id: 'traditional', label: 'Traditional', emoji: '🍛' },
];

export const restaurants: Restaurant[] = [
  {
    id: 'r1',
    name: 'Karachi BBQ House',
    cuisine: 'BBQ & Grill',
    category: 'bbq',
    rating: 4.8,
    deliveryTime: '25-35 min',
    deliveryFee: 'Free',
    tags: ['Seekh Kebab', 'Karahi', 'Naan'],
    gradient: 'from-orange-500 via-red-500 to-rose-500',
    emoji: '🍢',
    featured: true,
  },
  {
    id: 'r2',
    name: 'Pizza Square',
    cuisine: 'Italian',
    category: 'pizza',
    rating: 4.6,
    deliveryTime: '20-30 min',
    deliveryFee: 'Rs. 49',
    tags: ['Thin Crust', 'Cheese Burst', 'Dip'],
    gradient: 'from-amber-400 via-orange-500 to-red-500',
    emoji: '🍕',
    featured: true,
  },
  {
    id: 'r3',
    name: 'Green Bowl',
    cuisine: 'Healthy',
    category: 'healthy',
    rating: 4.7,
    deliveryTime: '15-25 min',
    deliveryFee: 'Free',
    tags: ['Salad', 'Protein Bowl', 'Low Carb'],
    gradient: 'from-emerald-400 via-green-500 to-teal-500',
    emoji: '🥗',
    featured: true,
  },
  {
    id: 'r4',
    name: 'Sweet Circle',
    cuisine: 'Dessert',
    category: 'dessert',
    rating: 4.9,
    deliveryTime: '15-20 min',
    deliveryFee: 'Rs. 29',
    tags: ['Cake', 'Ice Cream', 'Brownie'],
    gradient: 'from-pink-400 via-fuchsia-500 to-purple-500',
    emoji: '🍰',
  },
  {
    id: 'r5',
    name: 'Desi Handi',
    cuisine: 'Pakistani',
    category: 'traditional',
    rating: 4.5,
    deliveryTime: '30-40 min',
    deliveryFee: 'Free',
    tags: ['Biryani', 'Handi', 'Roti'],
    gradient: 'from-yellow-400 via-amber-500 to-orange-600',
    emoji: '🍛',
  },
  {
    id: 'r6',
    name: 'Midnight Munchies',
    cuisine: 'Fast Food',
    category: 'pizza',
    rating: 4.3,
    deliveryTime: '10-20 min',
    deliveryFee: 'Rs. 19',
    tags: ['Burger', 'Fries', 'Late Night'],
    gradient: 'from-indigo-500 via-violet-500 to-purple-600',
    emoji: '🍔',
  },
];