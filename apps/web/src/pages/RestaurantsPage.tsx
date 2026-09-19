import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import Input from '../components/ui/Input';
import RestaurantCard from '../components/restaurant/RestaurantCard';
import { categories, restaurants, type CategoryId } from '../data/mock';
import { cn } from '../lib/utils';

export default function RestaurantsPage() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryId>('all');

  const filteredRestaurants = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return restaurants.filter((restaurant) => {
      const matchesCategory =
        activeCategory === 'all' || restaurant.category === activeCategory;

      const matchesQuery =
        normalizedQuery.length === 0 ||
        restaurant.name.toLowerCase().includes(normalizedQuery) ||
        restaurant.cuisine.toLowerCase().includes(normalizedQuery) ||
        restaurant.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery));

      return matchesCategory && matchesQuery;
    });
  }, [query, activeCategory]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Restaurants</h1>
          <p className="text-slate-500">
            Search and filter restaurants by category, name, or cuisine.
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

      {filteredRestaurants.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-lg font-semibold text-slate-900">No restaurants found</p>
          <p className="mt-1 text-slate-500">
            Try a different search term or category.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredRestaurants.map((restaurant) => (
            <RestaurantCard key={restaurant.id} restaurant={restaurant} />
          ))}
        </div>
      )}
    </div>
  );
}