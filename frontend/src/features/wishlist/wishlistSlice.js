import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authFetch, parseJsonOrThrow } from '../../api/authFetch';

export const fetchWishlist = createAsyncThunk(
  'wishlist/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const res = await authFetch('/wishlist/');
      return await parseJsonOrThrow(res, 'Ошибка загрузки избранного');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const toggleWishlist = createAsyncThunk(
  'wishlist/toggle',
  async (productId, { rejectWithValue }) => {
    try {
      const res = await authFetch('/wishlist/toggle/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId }),
      });
      const data = await parseJsonOrThrow(res, 'Ошибка изменения избранного');
      return { productId, inWishlist: data.in_wishlist };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState: {
    items: [],
    productIds: [], // для быстрой проверки "в избранном ли товар"
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchWishlist.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWishlist.fulfilled, (state, action) => {
        state.items = action.payload;
        state.productIds = action.payload.map((item) => item.product.id);
        state.loading = false;
      })
      .addCase(fetchWishlist.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(toggleWishlist.fulfilled, (state, action) => {
        const { productId, inWishlist } = action.payload;
        if (inWishlist) {
          state.productIds.push(productId);
        } else {
          state.productIds = state.productIds.filter((id) => id !== productId);
          state.items = state.items.filter((item) => item.product.id !== productId);
        }
      })
      .addCase(toggleWishlist.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export default wishlistSlice.reducer;