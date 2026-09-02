import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authFetch, parseJsonOrThrow } from '../../api/authFetch';

export const fetchOrders = createAsyncThunk(
  'orders/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const res = await authFetch('/orders/');
      return await parseJsonOrThrow(res, 'Ошибка загрузки заказов');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchOrderById = createAsyncThunk(
  'orders/fetchById',
  async (orderId, { rejectWithValue }) => {
    try {
      const res = await authFetch(`/orders/${orderId}/`);
      return await parseJsonOrThrow(res, 'Ошибка загрузки заказа');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createOrder = createAsyncThunk(
  'orders/create',
  async ({ fullName, email, phone, address }, { rejectWithValue }) => {
    try {
      const res = await authFetch('/orders/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          email,
          phone,
          address,
        }),
      });
      return await parseJsonOrThrow(res, 'Ошибка оформления заказа');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const ordersSlice = createSlice({
  name: 'orders',
  initialState: {
    list: [],
    lastCreated: null,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // fetchOrders
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.list = action.payload;
        state.loading = false;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // fetchOrderById
      .addCase(fetchOrderById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrderById.fulfilled, (state, action) => {
        const index = state.list.findIndex((o) => o.id === action.payload.id);
        if (index >= 0) {
          state.list[index] = action.payload;
        } else {
          state.list.push(action.payload);
        }
        state.loading = false;
      })
      .addCase(fetchOrderById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // createOrder
      .addCase(createOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.lastCreated = action.payload;
        state.list.unshift(action.payload);
        state.loading = false;
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default ordersSlice.reducer;