import { Link, NavLink } from 'react-router-dom';
import { Flame, Search, ShoppingBag, User } from 'lucide-react';
import { cn } from '../../lib/utils';

type NavItem = {
  to: string;
  label: string;
  end?: boolean;
};

const navItems: NavItem[] = [
  { to: '/', label: 'Home', end: true },
  { to: '/restaurants', label: 'Restaurants' },
  { to: '/orders', label: 'Orders' },
  { to: '/flash-sale', label: '⚡ Flash Sale' },
  { to: '/similar-search', label: '🧠 AI Search' },
  { to: '/analytics', label: '📊 Analytics' },
  { to: '/graph', label: '🔗 Graph' },
  { to: '/hash-ring', label: '🔄 Hash Ring' },
  { to: '/vector-clock', label: '🕐 Vector Clock' },
  { to: '/activity', label: '📡 Activity' },
  { to: '/shards', label: '🗂️ Shards' },
  { to: '/commit-protocols', label: '🤝 2PC/3PC' },
  { to: '/track-order', label: '📦 Track Order' },
  { to: '/admin', label: '🛠️ Admin' },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-600 text-white">
            <Flame className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            ForkSquare
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
                  isActive
                    ? "bg-orange-50 text-orange-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="relative hidden lg:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search restaurants or food"
              className="h-11 w-64 rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          <Link
            to="/cart"
            className="relative rounded-xl border border-slate-200 p-2.5 text-slate-700 transition-colors hover:bg-slate-100"
          >
            <ShoppingBag className="h-5 w-5" />
            <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-orange-600 text-[11px] font-bold text-white">
              0
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              to="/register"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
            >
              Register
            </Link>
            <Link
              to="/login"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              <User className="mr-2 h-4 w-4" />
              Sign in
            </Link>
          </div>
          
        </div>
      </div>
    </header>
  );
}