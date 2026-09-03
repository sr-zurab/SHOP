import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import productsReducer from '../features/products/productsSlice';
import categoriesReducer from '../features/categories/categoriesSlice';
import cartReducer from '../features/cart/cartSlice';
import ordersReducer from '../features/orders/ordersSlice';
import wishlistReducer from '../features/wishlist/wishlistSlice';
import profileReducer from '../features/profile/profileSlice';
import reviewsReducer from '../features/reviews/reviewsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    products: productsReducer,
    categories: categoriesReducer,
    cart: cartReducer,
    orders: ordersReducer,
    wishlist: wishlistReducer,
    profile: profileReducer,
    reviews: reviewsReducer,
  },
});