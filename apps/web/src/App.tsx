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
      </Route>
    </Routes>
  );
}