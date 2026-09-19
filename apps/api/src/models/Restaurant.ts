import mongoose, { Schema, Document } from 'mongoose';

export interface IRestaurant extends Document {
  name: string;
  cuisine: string;
  category: string;
  rating: number;
  deliveryTime: string;
  tags: string[];
}

const RestaurantSchema = new Schema<IRestaurant>(
  {
    name: { type: String, required: true },
    cuisine: { type: String, required: true },
    category: { type: String, required: true },
    rating: { type: Number, default: 0 },
    deliveryTime: { type: String, required: true },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

export const Restaurant = mongoose.model<IRestaurant>('Restaurant', RestaurantSchema);