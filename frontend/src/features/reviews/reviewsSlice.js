import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authFetch, parseJsonOrThrow } from '../../api/authFetch';

export const fetchReviews = createAsyncThunk(
  'reviews/fetch',
  async (productId, { rejectWithValue }) => {
    try {
      const res = await authFetch(`/reviews/?product=${productId}`);
      return await parseJsonOrThrow(res, 'Ошибка загрузки отзывов');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createReview = createAsyncThunk(
  'reviews/create',
  async ({ productId, rating, text }, { rejectWithValue }) => {
    try {
      const res = await authFetch('/reviews/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: productId, rating, text }),
      });
      return await parseJsonOrThrow(res, 'Ошибка отправки отзыва');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteReview = createAsyncThunk(
  'reviews/delete',
  async (reviewId, { rejectWithValue }) => {
    try {
      const res = await authFetch(`/reviews/${reviewId}/`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        throw new Error('Ошибка удаления отзыва');
      }
      return reviewId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const reviewsSlice = createSlice({
  name: 'reviews',
  initialState: {
    list: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearReviewsError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReviews.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReviews.fulfilled, (state, action) => {
        state.list = action.payload;
        state.loading = false;
      })
      .addCase(fetchReviews.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createReview.fulfilled, (state, action) => {
        state.list.unshift(action.payload);
      })
      .addCase(createReview.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(deleteReview.fulfilled, (state, action) => {
        state.list = state.list.filter((r) => r.id !== action.payload);
      });
  },
});

export const { clearReviewsError } = reviewsSlice.actions;
export default reviewsSlice.reducer;