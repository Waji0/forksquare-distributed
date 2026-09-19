import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import Input from '../components/ui/Input';
import RestaurantCard from '../components/restaurant/RestaurantCard';
import { fetchRestaurants, type Restaurant, type RestaurantParams } from '../lib/api';
import { cn } from '../lib/utils';

const categories = [
  { id: 'all', label: 'All', emoji: '🍽️' },
  { id: 'bbq', label: 'BBQ', emoji: '🍢' },
  { id: 'pizza', label: 'Pizza', emoji: '🍕' },
  { id: 'healthy', label: 'Healthy', emoji: '🥗' },
  { id: 'dessert', label: 'Dessert', emoji: '🍰' },
  { id: 'traditional', label: 'Traditional', emoji: '🍛' },
];

export default function RestaurantsPage() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch restaurants from API
  useEffect(() => {
    const controller = new AbortController();

    async function loadRestaurants() {
      setLoading(true);
      setError(null);

      try {
        const params: RestaurantParams = {};

        if (query.trim()) {
          params.search = query.trim();
        }

        if (activeCategory !== 'all') {
          params.category = activeCategory;
        }

        const response = await fetchRestaurants(params);
        setRestaurants(response.data.restaurants);
      } catch {
        setError('Failed to load restaurants. Make sure the API server is running.');
      } finally {
        setLoading(false);
      }
    }

    // Debounce search
    const timeout = setTimeout(() => {
      loadRestaurants();
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query, activeCategory]);

  const resultCount = useMemo(() => restaurants.length, [restaurants]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Restaurants</h1>
          <p className="text-slate-500">
            {loading
              ? 'Loading restaurants...'
              : `${resultCount} restaurant${resultCount !== 1 ? 's' : ''} found`}
          </p>
        </div>

        <div className="relative w-full lg:w-96">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search restaurants, cuisines, dishes"
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setActiveCategory(category.id)}
            className={cn(
              'rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
              activeCategory === category.id
                ? 'border-orange-600 bg-orange-600 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
            )}
          >
            {category.emoji} {category.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-10 text-center">
          <p className="text-lg font-semibold text-red-800">Error</p>
          <p className="mt-1 text-red-600">{error}</p>
        </div>
      ) : restaurants.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-lg font-semibold text-slate-900">No restaurants found</p>
          <p className="mt-1 text-slate-500">
            Try a different search term or category.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {restaurants.map((restaurant) => (
            <RestaurantCard
              key={restaurant._id}
              restaurant={{
                id: restaurant._id,
                name: restaurant.name,
                cuisine: restaurant.cuisine,
                category: restaurant.category as never,
                rating: restaurant.rating,
                deliveryTime: restaurant.deliveryTime,
                deliveryFee: restaurant.deliveryFee,
                tags: restaurant.tags,
                gradient: restaurant.gradient,
                emoji: restaurant.emoji,
                featured: restaurant.featured,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}