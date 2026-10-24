// import mongoose, { Schema, Document } from 'mongoose';

// export interface IRestaurant extends Document {
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

// const RestaurantSchema = new Schema<IRestaurant>(
//   {
//     name: { type: String, required: true, index: true },
//     cuisine: { type: String, required: true, index: true },
//     category: { type: String, required: true, index: true },
//     rating: { type: Number, default: 0, index: true },
//     deliveryTime: { type: String, required: true },
//     deliveryFee: { type: String, default: 'Free' },
//     tags: [{ type: String }],
//     emoji: { type: String, default: '🍽️' },
//     gradient: { type: String, default: 'from-orange-500 via-red-500 to-rose-500' },
//     featured: { type: Boolean, default: false },
//   },
//   { timestamps: true }
// );

// // Compound index for search queries
// RestaurantSchema.index({ name: 'text', cuisine: 'text', tags: 'text' });

// export const Restaurant = mongoose.model<IRestaurant>('Restaurant', RestaurantSchema);





import mongoose, { Document, Schema } from 'mongoose';

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
  imageUrl?: string;
  owner?: number; // Changed to number to match PostgreSQL user ID
  createdAt: Date;
  updatedAt: Date;
}

const restaurantSchema = new Schema<IRestaurant>(
  {
    name: { type: String, required: true, trim: true },
    cuisine: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, default: 4.0, min: 0, max: 5 },
    deliveryTime: { type: String, required: true, trim: true },
    deliveryFee: { type: String, required: true, trim: true },
    tags: [{ type: String, trim: true }],
    emoji: { type: String, default: '🍽️' },
    gradient: { type: String, default: 'from-orange-500 to-red-500' },
    featured: { type: Boolean, default: false },
    imageUrl: { type: String, trim: true },
    owner: { type: Number }, // Changed from ObjectId to Number
  },
  {
    timestamps: true,
  }
);

// Add text index for search
restaurantSchema.index({ name: 'text', cuisine: 'text', tags: 'text', category: 'text' });

export const Restaurant = mongoose.model<IRestaurant>('Restaurant', restaurantSchema);