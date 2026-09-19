import { ArrowRight, Search, ShieldCheck, Sparkles, Timer } from 'lucide-react';
import { Link } from 'react-router-dom';
import Input from '../components/ui/Input';
import RestaurantCard from '../components/restaurant/RestaurantCard';
import { categories, restaurants } from '../data/mock';

export default function HomePage() {
  const featured = restaurants.filter((restaurant) => restaurant.featured);

  return (
    <div className="space-y-10">
      <section className="grid gap-6 rounded-3xl bg-slate-900 p-8 text-white lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div>
          <p className="mb-3 inline-flex rounded-full bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-300 ring-1 ring-orange-500/20">
            Distributed Food Ordering Platform
          </p>

          <h1 className="max-w-xl text-4xl font-bold leading-tight">
            Order food from the best kitchens near you
          </h1>

          <p className="mt-3 max-w-xl text-slate-300">
            Search restaurants, browse menus, place orders, and track delivery.
            Built with a scalable distributed architecture.
          </p>

          <form className="mt-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search food, restaurants, cuisines"
                className="border-transparent pl-10"
              />
            </div>

            <Link
              to="/restaurants"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-orange-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-orange-500"
            >
              Explore restaurants
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </form>
        </div>

        <div className="grid gap-3">
          <div className="flex items-start gap-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <Sparkles className="mt-0.5 h-5 w-5 text-orange-300" />
            <div>
              <p className="font-semibold">Smart search</p>
              <p className="text-sm text-slate-300">
                Find restaurants and dishes quickly with distributed search.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <Timer className="mt-0.5 h-5 w-5 text-orange-300" />
            <div>
              <p className="font-semibold">Fast ordering</p>
              <p className="text-sm text-slate-300">
                Optimized for high traffic and concurrent order requests.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-orange-300" />
            <div>
              <p className="font-semibold">Reliable transactions</p>
              <p className="text-sm text-slate-300">
                Consistency and fault tolerance for critical order operations.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Categories</h2>
          <Link
            to="/restaurants"
            className="text-sm font-semibold text-orange-600 hover:text-orange-500"
          >
            View all
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((category) => (
            <Link
              key={category.id}
              to="/restaurants"
              className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="text-3xl">{category.emoji}</div>
              <p className="mt-2 text-sm font-semibold text-slate-700">
                {category.label}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Featured restaurants</h2>
          <Link
            to="/restaurants"
            className="text-sm font-semibold text-orange-600 hover:text-orange-500"
          >
            Browse all
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {featured.map((restaurant) => (
            <RestaurantCard key={restaurant.id} restaurant={restaurant} />
          ))}
        </div>
      </section>
    </div>
  );
}