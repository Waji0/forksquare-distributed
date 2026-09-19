import { Bike, Clock, Star } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { cn } from '../../lib/utils';
import type { Restaurant } from '../../data/mock';

export default function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  return (
    <Card className="overflow-hidden">
      <div
        className={cn(
          'flex h-40 items-center justify-center bg-gradient-to-br text-6xl',
          restaurant.gradient
        )}
      >
        {restaurant.emoji}
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-900">{restaurant.name}</h3>
            <p className="text-sm text-slate-500">{restaurant.cuisine}</p>
          </div>

          <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-200">
            <Star className="mr-1 h-3.5 w-3.5 fill-current" />
            {restaurant.rating.toFixed(1)}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          {restaurant.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} className="bg-slate-50 text-slate-600 ring-slate-200">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {restaurant.deliveryTime}
          </span>

          <span className="inline-flex items-center gap-1">
            <Bike className="h-4 w-4" />
            {restaurant.deliveryFee}
          </span>
        </div>
      </div>
    </Card>
  );
}