import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function AppShell() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="mx-auto w-full max-w-7xl px-4 text-sm text-slate-500 sm:px-6 lg:px-8">
          ForkSquare Distributed — Food ordering system built for scalability.
        </div>
      </footer>
    </div>
  );
}