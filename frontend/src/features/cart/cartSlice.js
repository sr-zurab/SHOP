import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authFetch, parseJsonOrThrow } from '../../api/authFetch';

export const fetchCart = createAsyncThunk(
  'cart/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const res = await authFetch('/cart/');
      return await parseJsonOrThrow(
        res,
        'Ошибка загрузки корзины'
      );
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const addItem = createAsyncThunk(
  'cart/addItem',
  async (
    {
      productId,
      quantity = 1,
      selectedAttributes = {},
    },
    { rejectWithValue }
  ) => {
    try {
      const res = await authFetch('/cart/add_item/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: productId,
          quantity,
          selected_attributes: selectedAttributes,
        }),
      });

      return await parseJsonOrThrow(
        res,
        'Ошибка добавления товара'
      );
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateQuantity = createAsyncThunk(
  'cart/updateQuantity',
  async (
    {
      productId,
      quantity,
      selectedAttributes = {},
    },
    { rejectWithValue }
  ) => {
    try {
      const res = await authFetch('/cart/update_item/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: productId,
          quantity,
          selected_attributes: selectedAttributes,
        }),
      });

      return await parseJsonOrThrow(
        res,
        'Ошибка обновления количества'
      );
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const removeItem = createAsyncThunk(
  'cart/removeItem',
  async (
    {
      productId,
      selectedAttributes = {},
    },
    { rejectWithValue }
  ) => {
    try {
      const res = await authFetch('/cart/remove_item/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: productId,
          selected_attributes: selectedAttributes,
        }),
      });

      return await parseJsonOrThrow(
        res,
        'Ошибка удаления товара'
      );
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const clearCart = createAsyncThunk(
  'cart/clear',
  async (_, { rejectWithValue }) => {
    try {
      const res = await authFetch('/cart/clear/', {
        method: 'POST',
      });

      return await parseJsonOrThrow(
        res,
        'Ошибка очистки корзины'
      );
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const cartSlice = createSlice({
  name: 'cart',

  initialState: {
    data: {
      items: [],
      total_price: 0,
    },
    loading: false,
    error: null,
  },

  reducers: {
    stockUpdated: (state, action) => {
      const {
        product_id,
        stock,
        available,
        has_attributes,
        attributes = [],
      } = action.payload;

      const productAttributes = Array.isArray(attributes)
        ? attributes
        : [];

      state.data.items.forEach((item) => {
        if (item.product?.id !== product_id) {
          return;
        }

        if (!has_attributes) {
          item.product.stock = stock;
          item.product.available = available;

          if (item.attribute_stock !== undefined) {
            item.attribute_stock = stock;
          }

          return;
        }

        const selectedAttributes =
          item.selected_attributes || {};

        const selectedEntries = Object.entries(
          selectedAttributes
        );

        if (selectedEntries.length === 0) {
          return;
        }

        const matchedAttributes =
          selectedEntries.map(([name, value]) => {
            return productAttributes.find(
              (attribute) =>
                attribute.name === name &&
                attribute.value === value
            );
          });

        if (
          matchedAttributes.some(
            (attribute) => !attribute
          )
        ) {
          return;
        }

        const availableMatchedAttributes =
          matchedAttributes.filter(
            (attribute) =>
              attribute.available !== false
          );

        if (
          availableMatchedAttributes.length !==
          matchedAttributes.length
        ) {
          item.attribute_stock = 0;
          return;
        }

        item.attribute_stock =
          Math.min(
            ...matchedAttributes.map(
              (attribute) => attribute.stock
            )
          );

        const product =
          item.product;

        product.available = available;
        product.has_attributes = true;

        if (
          Array.isArray(product.attributes)
        ) {
          product.attributes =
            productAttributes.map(
              (attribute) => ({
                id: attribute.id,
                name: attribute.name,
                value: attribute.value,
                stock: attribute.stock,
                available: attribute.available,
                in_stock: attribute.in_stock,
              })
            );
        }

        const groupedAttributes = {};

        productAttributes.forEach(
          (attribute) => {
            if (
              !groupedAttributes[
                attribute.name
              ]
            ) {
              groupedAttributes[
                attribute.name
              ] = [];
            }

            groupedAttributes[
              attribute.name
            ].push({
              id: attribute.id,
              value: attribute.value,
              stock: attribute.stock,
              available: attribute.available,
              in_stock: attribute.in_stock,
            });
          }
        );

        product.grouped_attributes =
          groupedAttributes;

        product.stock = stock;
      });
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(fetchCart.fulfilled, (state, action) => {
        state.data = action.payload;
        state.loading = false;
      })

      .addCase(fetchCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(addItem.fulfilled, (state, action) => {
        state.data = action.payload;
      })

      .addCase(addItem.rejected, (state, action) => {
        state.error = action.payload;
      })

      .addCase(updateQuantity.fulfilled, (state, action) => {
        state.data = action.payload;
      })

      .addCase(updateQuantity.rejected, (state, action) => {
        state.error = action.payload;
      })

      .addCase(removeItem.fulfilled, (state, action) => {
        state.data = action.payload;
      })

      .addCase(clearCart.fulfilled, (state, action) => {
        state.data = action.payload;
      })

      .addCase(clearCart.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const {
  stockUpdated,
} = cartSlice.actions;

export default cartSlice.reducer;