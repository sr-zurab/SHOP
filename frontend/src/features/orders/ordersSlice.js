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
  async ({ delivery_method, full_name, email, phone, address }, { rejectWithValue }) => {
    try {
      const res = await authFetch('/orders/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delivery_method,
          full_name,
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

export const cancelOrder = createAsyncThunk(
  'orders/cancel',
  async (orderId, { rejectWithValue }) => {
    try {
      const res = await authFetch(`/orders/${orderId}/cancel/`, { method: 'POST' });
      return await parseJsonOrThrow(res, 'Ошибка отмены заказа');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchManagerOrders = createAsyncThunk(
  'orders/fetchManager',
  async ({ status = '', search = '' } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (search) params.set('search', search);
      const query = params.toString();
      const res = await authFetch(`/orders/manager/${query ? `?${query}` : ''}`);
      return await parseJsonOrThrow(res, 'Ошибка загрузки заказов');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateManagerOrderStatus = createAsyncThunk(
  'orders/updateManagerStatus',
  async ({ orderId, status }, { rejectWithValue }) => {
    try {
      const res = await authFetch(`/orders/manager/${orderId}/status/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      return await parseJsonOrThrow(res, 'Ошибка смены статуса');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const addManagerOrderComment = createAsyncThunk(
  'orders/addManagerComment',
  async ({ orderId, text }, { rejectWithValue }) => {
    try {
      const res = await authFetch(`/orders/manager/${orderId}/comments/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      return await parseJsonOrThrow(res, 'Ошибка добавления комментария');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

function upsertOrder(list, order) {
  const index = list.findIndex((o) => o.id === order.id);
  if (index >= 0) {
    list[index] = order;
  } else {
    list.unshift(order);
  }
}

const ordersSlice = createSlice({
  name: 'orders',
  initialState: {
    list: [],
    managerList: [],
    managerLoading: false,
    lastCreated: null,
    loading: false,
    error: null,
  },
  reducers: {
    resetLastCreated(state) {
      state.lastCreated = null;
    },
  },
  extraReducers: (builder) => {
    builder
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
      .addCase(fetchOrderById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrderById.fulfilled, (state, action) => {
        upsertOrder(state.list, action.payload);
        state.loading = false;
      })
      .addCase(fetchOrderById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
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
      })
      .addCase(cancelOrder.fulfilled, (state, action) => {
        upsertOrder(state.list, action.payload);
      })
      .addCase(cancelOrder.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(fetchManagerOrders.pending, (state) => {
        state.managerLoading = true;
        state.error = null;
      })
      .addCase(fetchManagerOrders.fulfilled, (state, action) => {
        state.managerList = action.payload;
        state.managerLoading = false;
      })
      .addCase(fetchManagerOrders.rejected, (state, action) => {
        state.managerLoading = false;
        state.error = action.payload;
      })
      .addCase(updateManagerOrderStatus.fulfilled, (state, action) => {
        upsertOrder(state.managerList, action.payload);
        upsertOrder(state.list, action.payload);
      })
      .addCase(updateManagerOrderStatus.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(addManagerOrderComment.fulfilled, (state, action) => {
        const comment = action.payload;
        const orderId = action.meta.arg.orderId;
        const managerOrder = state.managerList.find((o) => o.id === orderId);
        if (managerOrder) {
          managerOrder.comments = [...(managerOrder.comments || []), comment];
        }
        const customerOrder = state.list.find((o) => o.id === orderId);
        if (customerOrder) {
          customerOrder.comments = [...(customerOrder.comments || []), comment];
        }
      })
      .addCase(addManagerOrderComment.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { resetLastCreated } = ordersSlice.actions;
export default ordersSlice.reducer;
