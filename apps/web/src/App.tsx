import { Route, Routes } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import HomePage from './pages/HomePage';
import RestaurantsPage from './pages/RestaurantsPage';
import OrdersPage from './pages/OrdersPage';
import CartPage from './pages/CartPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NotFoundPage from './pages/NotFoundPage';
import FlashSalePage from './pages/FlashSalePage';
import ActivityPage from './pages/ActivityPage';

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/restaurants" element={<RestaurantsPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<NotFoundPage />} />
        <Route path="/flash-sale" element={<FlashSalePage />} />
        <Route path="/activity" element={<ActivityPage />} />
      </Route>
    </Routes>
  );
}