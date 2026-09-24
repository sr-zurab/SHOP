import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  authFetch,
  parseJsonOrThrow,
} from '../../api/authFetch';


export const calculateDiscounts = createAsyncThunk(
  'discounts/calculate',
  async (itemIds, { rejectWithValue }) => {
    try {
      const res = await authFetch(
        '/discounts/calculate/',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            item_ids: itemIds,
          }),
        }
      );

      return await parseJsonOrThrow(
        res,
        'Ошибка расчёта скидки'
      );
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);


export const fetchManagerDiscounts = createAsyncThunk(
  'discounts/fetchManagerDiscounts',
  async (_, { rejectWithValue }) => {
    try {
      const res = await authFetch(
        '/discounts/'
      );

      return await parseJsonOrThrow(
        res,
        'Ошибка загрузки скидок'
      );
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);


export const createManagerDiscount = createAsyncThunk(
  'discounts/createManagerDiscount',
  async (discountData, { rejectWithValue }) => {
    try {
      const res = await authFetch(
        '/discounts/',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(discountData),
        }
      );

      return await parseJsonOrThrow(
        res,
        'Ошибка создания скидки'
      );
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);


export const updateManagerDiscount = createAsyncThunk(
  'discounts/updateManagerDiscount',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await authFetch(
        `/discounts/${id}/`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        }
      );

      return await parseJsonOrThrow(
        res,
        'Ошибка обновления скидки'
      );
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);


export const deleteManagerDiscount = createAsyncThunk(
  'discounts/deleteManagerDiscount',
  async (id, { rejectWithValue }) => {
    try {
      const res = await authFetch(
        `/discounts/${id}/`,
        {
          method: 'DELETE',
        }
      );

      if (!res.ok) {
        return await parseJsonOrThrow(
          res,
          'Ошибка удаления скидки'
        );
      }

      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);


const discountsSlice = createSlice({
  name: 'discounts',

  initialState: {
    calculation: null,

    items: [],

    loading: false,
    error: null,

    managerLoading: false,
    managerError: null,
  },

  reducers: {
    clearCalculation: (state) => {
      state.calculation = null;
      state.error = null;
    },

    clearManagerError: (state) => {
      state.managerError = null;
    },
  },

  extraReducers: (builder) => {
    builder

      .addCase(
        calculateDiscounts.pending,
        (state) => {
          state.loading = true;
          state.error = null;
        }
      )

      .addCase(
        calculateDiscounts.fulfilled,
        (state, action) => {
          state.calculation = action.payload;
          state.loading = false;
        }
      )

      .addCase(
        calculateDiscounts.rejected,
        (state, action) => {
          state.loading = false;
          state.error = action.payload;
        }
      )


      .addCase(
        fetchManagerDiscounts.pending,
        (state) => {
          state.managerLoading = true;
          state.managerError = null;
        }
      )

      .addCase(
        fetchManagerDiscounts.fulfilled,
        (state, action) => {
          state.items = action.payload;
          state.managerLoading = false;
        }
      )

      .addCase(
        fetchManagerDiscounts.rejected,
        (state, action) => {
          state.managerLoading = false;
          state.managerError = action.payload;
        }
      )


      .addCase(
        createManagerDiscount.pending,
        (state) => {
          state.managerLoading = true;
          state.managerError = null;
        }
      )

      .addCase(
        createManagerDiscount.fulfilled,
        (state, action) => {
          state.items.push(action.payload);
          state.managerLoading = false;
        }
      )

      .addCase(
        createManagerDiscount.rejected,
        (state, action) => {
          state.managerLoading = false;
          state.managerError = action.payload;
        }
      )


      .addCase(
        updateManagerDiscount.pending,
        (state) => {
          state.managerLoading = true;
          state.managerError = null;
        }
      )

      .addCase(
        updateManagerDiscount.fulfilled,
        (state, action) => {
          const index = state.items.findIndex(
            (item) => item.id === action.payload.id
          );

          if (index !== -1) {
            state.items[index] = action.payload;
          }

          state.managerLoading = false;
        }
      )

      .addCase(
        updateManagerDiscount.rejected,
        (state, action) => {
          state.managerLoading = false;
          state.managerError = action.payload;
        }
      )


      .addCase(
        deleteManagerDiscount.pending,
        (state) => {
          state.managerLoading = true;
          state.managerError = null;
        }
      )

      .addCase(
        deleteManagerDiscount.fulfilled,
        (state, action) => {
          state.items = state.items.filter(
            (item) => item.id !== action.payload
          );

          state.managerLoading = false;
        }
      )

      .addCase(
        deleteManagerDiscount.rejected,
        (state, action) => {
          state.managerLoading = false;
          state.managerError = action.payload;
        }
      );
  },
});


export const {
  clearCalculation,
  clearManagerError,
} = discountsSlice.actions;


export default discountsSlice.reducer;