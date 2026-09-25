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
        variants = [],
      } = action.payload;

      const productAttributes = Array.isArray(attributes)
        ? attributes
        : [];

      const productVariants = Array.isArray(variants)
        ? variants
        : [];

      state.data.items.forEach((item) => {
        if (item.product?.id !== product_id) {
          return;
        }

        const product = item.product;

        product.available = available;
        product.has_attributes = has_attributes;

        if (!has_attributes) {
          product.stock = stock;

          if (item.attribute_stock !== undefined) {
            item.attribute_stock = stock;
          }

          return;
        }

        product.stock = stock;

        if (Array.isArray(product.attributes)) {
          product.attributes = productAttributes.map(
            (attribute) => ({
              id: attribute.id,
              name: attribute.name,
              value: attribute.value,
              available: attribute.available,
            })
          );
        }

        product.variants = productVariants.map(
          (variant) => ({
            id: variant.id,
            attributes: variant.attributes || {},
            price: variant.price,
            stock: variant.stock,
            available: variant.available,
            in_stock: variant.in_stock,
          })
        );

        const groupedAttributes = {};

        productAttributes.forEach(
          (attribute) => {
            if (!groupedAttributes[attribute.name]) {
              groupedAttributes[attribute.name] = [];
            }

            const matchingVariants =
              productVariants.filter(
                (variant) =>
                  variant.attributes &&
                  variant.attributes[attribute.name] ===
                    attribute.value
              );

            const availableVariants =
              matchingVariants.filter(
                (variant) =>
                  variant.available !== false &&
                  Number(variant.stock) > 0
              );

            const maxStock =
              matchingVariants.reduce(
                (max, variant) =>
                  Math.max(
                    max,
                    Number(variant.stock) || 0
                  ),
                0
              );

            groupedAttributes[attribute.name].push({
              id: attribute.id,
              value: attribute.value,
              stock: maxStock,
              available: attribute.available,
              in_stock:
                attribute.available !== false &&
                availableVariants.length > 0,
            });
          }
        );

        product.grouped_attributes =
          groupedAttributes;

        if (item.variant !== null && item.variant !== undefined) {
          const variantId =
            typeof item.variant === 'object'
              ? item.variant.id
              : item.variant;

          const matchingVariant =
            productVariants.find(
              (variant) =>
                Number(variant.id) === Number(variantId)
            );

          if (matchingVariant) {
            item.attribute_stock =
              Number(matchingVariant.stock) || 0;

            item.variant = matchingVariant.id;
          } else {
            item.attribute_stock = 0;
          }

          return;
        }

        const selectedAttributes =
          item.selected_attributes || {};

        const selectedEntries =
          Object.entries(selectedAttributes);

        if (selectedEntries.length === 0) {
          item.attribute_stock = 0;
          return;
        }

        const matchingVariant =
          productVariants.find((variant) => {
            const variantAttributes =
              variant.attributes || {};

            const variantEntries =
              Object.entries(variantAttributes);

            if (
              variantEntries.length !==
              selectedEntries.length
            ) {
              return false;
            }

            return selectedEntries.every(
              ([name, value]) =>
                variantAttributes[name] === value
            );
          });

        item.attribute_stock = matchingVariant
          ? Number(matchingVariant.stock) || 0
          : 0;
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