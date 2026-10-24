import { FormEvent, useEffect, useState } from 'react';
// import { Plus, Trash2, Edit, Loader2, AlertCircle, Utensils } from 'lucide-react';
import { Plus, Trash2, Loader2, AlertCircle, Utensils } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { getMenuItems, createMenuItem, deleteMenuItem } from '../lib/api';
import type { MenuItem } from '../lib/api';

export default function RestaurantMenuPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) fetchItems();
  }, [id]);

  async function fetchItems() {
    try {
      const data = await getMenuItems(id!);
      setItems(data);
    } catch {
      setError('Failed to load menu items.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => data.append(key, value));
      if (imageFile) data.append('imageFile', imageFile);

      await createMenuItem(id!, data);
      setShowForm(false);
      setFormData({ name: '', description: '', price: '', category: '' });
      setImageFile(null);
      fetchItems();
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to add menu item.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(menuId: string) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await deleteMenuItem(id!, menuId);
      setItems(items.filter(item => item._id !== menuId));
    } catch {
      setError('Failed to delete item.');
    }
  }

  if (loading) return <div className="p-8 text-center">Loading menu...</div>;

  return (
    <div className="mx-auto max-w-4xl py-8 px-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Menu Management</h1>
          <p className="text-sm text-slate-500">Add and manage items for this restaurant.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          {showForm ? 'Cancel' : 'Add Item'}
        </Button>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {showForm && (
        <Card className="mb-6 p-6">
          <h2 className="mb-4 text-lg font-semibold">Add New Menu Item</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              placeholder="Item Name *"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              placeholder="Category (e.g., Appetizers) *"
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value })}
              required
            />
            <Input
              type="number"
              step="0.01"
              placeholder="Price (Rs.) *"
              value={formData.price}
              onChange={e => setFormData({ ...formData, price: e.target.value })}
              required
            />
            <Input
              type="file"
              accept="image/*"
              onChange={e => setImageFile(e.target.files?.[0] || null)}
              className="md:col-span-2"
            />
            <textarea
              placeholder="Description *"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              required
              className="md:col-span-2 rounded-lg border border-slate-300 p-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              rows={3}
            />
            <div className="md:col-span-2">
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Item
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-4">
        {items.length === 0 ? (
          <Card className="p-8 text-center text-slate-500">
            <Utensils className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            <p>No menu items yet. Click "Add Item" to get started.</p>
          </Card>
        ) : (
          items.map(item => (
            <Card key={item._id} className="flex items-center gap-4 p-4">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="h-16 w-16 rounded-lg object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100 text-2xl">🍽️</div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900">{item.name}</h3>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{item.category}</span>
                </div>
                <p className="text-sm text-slate-500">{item.description}</p>
                <p className="mt-1 font-medium text-orange-600">Rs. {item.price.toFixed(2)}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDelete(item._id)}
                  className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                  title="Delete"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </Card>
          ))
        )}
      </div>

      <div className="mt-6 text-center">
        <button onClick={() => navigate('/')} className="text-sm font-semibold text-slate-500 hover:text-slate-700">
          ← Back to Home
        </button>
      </div>
    </div>
  );
}