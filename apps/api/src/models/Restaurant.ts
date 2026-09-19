import mongoose, { Schema, Document } from 'mongoose';

export interface IRestaurant extends Document {
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

const RestaurantSchema = new Schema<IRestaurant>(
  {
    name: { type: String, required: true, index: true },
    cuisine: { type: String, required: true, index: true },
    category: { type: String, required: true, index: true },
    rating: { type: Number, default: 0, index: true },
    deliveryTime: { type: String, required: true },
    deliveryFee: { type: String, default: 'Free' },
    tags: [{ type: String }],
    emoji: { type: String, default: '🍽️' },
    gradient: { type: String, default: 'from-orange-500 via-red-500 to-rose-500' },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound index for search queries
RestaurantSchema.index({ name: 'text', cuisine: 'text', tags: 'text' });

export const Restaurant = mongoose.model<IRestaurant>('Restaurant', RestaurantSchema);