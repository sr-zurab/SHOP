import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authFetch, parseJsonOrThrow } from '../../api/authFetch';

export const fetchCategories = createAsyncThunk(
  'categories/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const res = await authFetch('/categories/');
      return await parseJsonOrThrow(res, 'Ошибка загрузки категорий');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createCategory = createAsyncThunk(
  'categories/create',
  async ({ name, slug }, { rejectWithValue }) => {
    try {
      const res = await authFetch('/categories/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug }),
      });
      return await parseJsonOrThrow(res, 'Ошибка создания категории');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteCategory = createAsyncThunk(
  'categories/delete',
  async (slug, { rejectWithValue }) => {
    try {
      const res = await authFetch(`/categories/${slug}/`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        throw new Error('Ошибка удаления категории');
      }
      return slug;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const categoriesSlice = createSlice({
  name: 'categories',
  initialState: {
    list: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.list = action.payload.results || action.payload; // на случай без пагинации
        state.loading = false;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createCategory.fulfilled, (state, action) => {
        state.list.push(action.payload);
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.list = state.list.filter((c) => c.slug !== action.payload);
      });
  },
});

export default categoriesSlice.reducer;