import { PackageSearch } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function OrdersPage() {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 text-center">
      <PackageSearch className="h-10 w-10 text-orange-600" />

      <h1 className="mt-4 text-xl font-bold text-slate-900">No orders yet</h1>

      <p className="mt-2 max-w-md text-slate-500">
        Your order history will appear here once you place your first order.
      </p>

      <Link
        to="/restaurants"
        className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-orange-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-orange-500"
      >
        Browse restaurants
      </Link>
    </div>
  );
}