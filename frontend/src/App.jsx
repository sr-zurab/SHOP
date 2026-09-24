import { useEffect, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  useNavigate,
  Navigate,
} from 'react-router-dom';
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
import ManagerProductsPage from './pages/ManagerProductsPage';
import ManagerOrdersPage from './pages/ManagerOrdersPage';
import ManagerDiscountsPage from './pages/ManagerDiscountsPage';
import ChatWidget from './components/ChatWidget';
import useTokenRefreshTimer from './hooks/useTokenRefreshTimer';
import useProductStockSocket from './hooks/useProductStockSocket';

import { fetchProfile } from './features/profile/profileSlice';
import { fetchWishlist } from './features/wishlist/wishlistSlice';
import { fetchOrders } from './features/orders/ordersSlice';
import { fetchChatUnreadCount } from './features/chat/chatSlice';
import { fetchCategories } from './features/categories/categoriesSlice';

import ManagerLoginPage from './pages/ManagerLoginPage';
import ManagerHeader from './components/ManagerHeader';

function AppContent() {
  useTokenRefreshTimer();
  useProductStockSocket();

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { isAuthenticated } = useSelector(
    (state) => state.auth
  );

  const { data: profile } = useSelector(
    (state) => state.profile
  );

  const { list: categories } = useSelector(
    (state) => state.categories
  );

  const location = useLocation();

  const [activeCategory, setActiveCategory] =
    useState(null);

  const [chatOpen, setChatOpen] =
    useState(false);

  const isManagerLogin =
    location.pathname === '/manager/login';

  const isManagerArea =
    location.pathname.startsWith('/manager/');

  useEffect(() => {
    dispatch(fetchCategories());
    dispatch(fetchWishlist());

    if (isAuthenticated) {
      dispatch(fetchProfile());
      dispatch(fetchOrders());
      dispatch(fetchChatUnreadCount());
    }
  }, [isAuthenticated, dispatch]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    const intervalId = window.setInterval(() => {
      dispatch(fetchChatUnreadCount());
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [isAuthenticated, dispatch]);

  const handleCategorySelect = (slug) => {
    setActiveCategory(slug);

    if (location.pathname !== '/') {
      navigate('/');
    }
  };

  if (
    isAuthenticated &&
    profile?.is_manager &&
    !isManagerArea
  ) {
    return (
      <Navigate
        to="/manager/chats"
        replace
      />
    );
  }

  return (
    <>
      {isManagerArea
        ? !isManagerLogin && <ManagerHeader />
        : (
          <Header
            categories={categories}
            activeCategory={activeCategory}
            onCategorySelect={handleCategorySelect}
            chatOpen={chatOpen}
            onChatOpen={() => setChatOpen(true)}
          />
        )}

      <main
        className={
          isManagerLogin || isManagerArea
            ? ''
            : 'app-main'
        }
      >
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                categories={categories}
                activeCategory={activeCategory}
                onCategorySelect={handleCategorySelect}
              />
            }
          />

          <Route
            path="/products/:slug"
            element={<ProductDetailPage />}
          />

          <Route
            path="/cart"
            element={<CartPage />}
          />

          <Route
            path="/checkout"
            element={<CheckoutPage />}
          />

          <Route
            path="/orders"
            element={<OrdersPage />}
          />

          <Route
            path="/orders/:id"
            element={<OrderDetailPage />}
          />

          <Route
            path="/wishlist"
            element={<WishlistPage />}
          />

          <Route
            path="/profile"
            element={<ProfilePage />}
          />

          <Route
            path="/manager/chats"
            element={<ManagerChatPage />}
          />

          <Route
            path="/manager/orders"
            element={<ManagerOrdersPage />}
          />

          <Route
            path="/manager/products"
            element={<ManagerProductsPage />}
          />

          <Route
            path="/manager/discounts"
            element={<ManagerDiscountsPage />}
          />

          <Route
            path="/manager/login"
            element={<ManagerLoginPage />}
          />
        </Routes>
      </main>

      {!isManagerLogin &&
        !isManagerArea && (
          <ChatWidget
            open={chatOpen}
            onOpen={() => setChatOpen(true)}
            onClose={() => setChatOpen(false)}
          />
        )}
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