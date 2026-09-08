import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import WishlistPage from './pages/WishlistPage';
import ProfilePage from './pages/ProfilePage';
import ManagerChatPage from './pages/ManagerChatPage';
import ChatWidget from './components/ChatWidget';
import useTokenRefreshTimer from './hooks/useTokenRefreshTimer';
import { fetchProfile } from './features/profile/profileSlice';
import ManagerLoginPage from './pages/ManagerLoginPage';
import ManagerHeader from './components/ManagerHeader';

function AppContent() {
  useTokenRefreshTimer();
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const location = useLocation();
  const isManagerLogin = location.pathname === '/manager/login';
  const isManagerArea = location.pathname.startsWith('/manager/');

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchProfile());
    }
  }, [isAuthenticated, dispatch]);

  return (
    <>
      {isManagerArea ? !isManagerLogin && <ManagerHeader /> : <Header />}
      <main className={isManagerLogin || isManagerArea ? '' : 'app-main'}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/products/:slug" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/:id" element={<OrderDetailPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/manager/chats" element={<ManagerChatPage />} />
          <Route path="/manager/login" element={<ManagerLoginPage />} />
        </Routes>
      </main>
      {!isManagerLogin && !isManagerArea && <ChatWidget />}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;