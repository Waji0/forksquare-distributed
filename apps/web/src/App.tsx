import { Route, Routes } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import HomePage from './pages/HomePage';
import RestaurantsPage from './pages/RestaurantsPage';
import OrdersPage from './pages/OrdersPage';
import CartPage from './pages/CartPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import FlashSalePage from './pages/FlashSalePage';
import ActivityPage from './pages/ActivityPage';
import SimilarSearchPage from './pages/SimilarSearchPage';
import AnalyticsPage from './pages/AnalyticsPage';
import GraphPage from './pages/GraphPage';
import HashRingPage from './pages/HashRingPage';
import VectorClockPage from './pages/VectorClockPage';
import NotFoundPage from './pages/NotFoundPage';

import ShardTopologyPage from './pages/ShardTopologyPage';
import CommitProtocolsPage from './pages/CommitProtocolsPage';

import OrderTrackingPage from './pages/OrderTrackingPage';
import AdminPage from './pages/AdminPage';

import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ProfilePage from './pages/ProfilePage';
import CreateRestaurantPage from './pages/CreateRestaurantPage';


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
        <Route path="/flash-sale" element={<FlashSalePage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/similar-search" element={<SimilarSearchPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/graph" element={<GraphPage />} />
        <Route path="/hash-ring" element={<HashRingPage />} />
        <Route path="/vector-clock" element={<VectorClockPage />} />
        <Route path="*" element={<NotFoundPage />} />
        <Route path="/shards" element={<ShardTopologyPage />} />
        <Route path="/commit-protocols" element={<CommitProtocolsPage />} />
        <Route path="/track-order" element={<OrderTrackingPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset" element={<ResetPasswordPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/create-restaurant" element={<CreateRestaurantPage />} />
      </Route>
    </Routes>
  );
}