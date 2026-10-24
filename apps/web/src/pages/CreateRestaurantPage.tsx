import { FormEvent, useState } from 'react';
import { Store, Loader2, Upload, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { createRestaurant } from '../lib/api';

export default function CreateRestaurantPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    cuisine: '',
    category: '',
    rating: '4.0',
    deliveryTime: '',
    deliveryFee: '',
    tags: '',
    emoji: '🍽️',
    gradient: 'from-orange-500 to-red-500',
    featured: false,
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }

//   async function handleSubmit(e: FormEvent) {
//     e.preventDefault();
//     setLoading(true);
//     setError(null);

//     try {
//       const data = new FormData();
//       Object.entries(formData).forEach(([key, value]) => {
//         data.append(key, String(value));
//       });
//       if (imageFile) {
//         data.append('imageFile', imageFile);
//       }

//     //   const response = await createRestaurant(data);
//     await createRestaurant(data);
//       navigate('/');
//     } catch (err: any) {
//       setError(err.response?.data?.error ?? 'Failed to create restaurant. Please try again.');
//     } finally {
//       setLoading(false);
//     }
//   }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = new FormData();
      
      // Append all form fields
      Object.entries(formData).forEach(([key, value]) => {
        // Send boolean as 'true' or 'false' string for consistent parsing
        if (key === 'featured') {
          data.append(key, value ? 'true' : 'false');
        } else {
          data.append(key, String(value));
        }
      });

      // Append image if selected
      if (imageFile) {
        data.append('imageFile', imageFile);
      }

    //   const response = await createRestaurant(data);
    await createRestaurant(data);
      
      // Success! Redirect to home or restaurant list
      navigate('/');
    } catch (err: any) {
      // Now the error message will tell you exactly which field is missing!
      const errorMsg = err.response?.data?.error ?? 'Failed to create restaurant. Please check all required fields.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl py-8">
      <Card className="p-6">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-orange-600 text-white">
            <Store className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Add Your Restaurant</h1>
          <p className="mt-1 text-sm text-slate-500">
            Fill in the details to list your restaurant on ForkSquare.
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Restaurant Name *
              </label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="e.g., Pizza Palace"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Cuisine *
              </label>
              <Input
                name="cuisine"
                value={formData.cuisine}
                onChange={handleInputChange}
                required
                placeholder="e.g., Italian"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Category *
              </label>
              <Input
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                required
                placeholder="e.g., pizza"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Rating (0-5)
              </label>
              <Input
                name="rating"
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={formData.rating}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Delivery Time *
              </label>
              <Input
                name="deliveryTime"
                value={formData.deliveryTime}
                onChange={handleInputChange}
                required
                placeholder="e.g., 20-30 min"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Delivery Fee *
              </label>
              <Input
                name="deliveryFee"
                value={formData.deliveryFee}
                onChange={handleInputChange}
                required
                placeholder="e.g., Free or Rs. 49"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Tags (comma-separated)
              </label>
              <Input
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                placeholder="e.g., Pizza, Pasta, Italian"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Emoji
              </label>
              <Input
                name="emoji"
                value={formData.emoji}
                onChange={handleInputChange}
                placeholder="🍕"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Gradient
              </label>
              <Input
                name="gradient"
                value={formData.gradient}
                onChange={handleInputChange}
                placeholder="from-orange-500 to-red-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Restaurant Image
              </label>
              <div className="flex items-center gap-4">
                <label className="cursor-pointer rounded-lg border-2 border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:border-orange-500 hover:text-orange-600">
                  <Upload className="mr-2 inline h-4 w-4" />
                  Choose Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="featured"
                  checked={formData.featured}
                  onChange={handleInputChange}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm font-medium text-slate-700">
                  Feature this restaurant on the homepage
                </span>
              </label>
            </div>
          </div>

          <div className="pt-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Restaurant...
                </>
              ) : (
                <>
                  <Store className="mr-2 h-4 w-4" />
                  Create Restaurant
                </>
              )}
            </Button>
          </div>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-sm font-semibold text-slate-500 hover:text-slate-700"
          >
            ← Back to Home
          </button>
        </div>
      </Card>
    </div>
  );
}