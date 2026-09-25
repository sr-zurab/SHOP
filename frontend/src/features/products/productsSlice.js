import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authFetch, parseJsonOrThrow } from '../../api/authFetch';

export const fetchProducts = createAsyncThunk(
  'products/fetch',
  async ({ category, search, ordering, page } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (search) params.set('search', search);
      if (ordering) params.set('ordering', ordering);
      if (page) params.set('page', page);

      const res = await authFetch(`/products/?${params.toString()}`);
      return await parseJsonOrThrow(res, 'Ошибка загрузки товаров');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchManagerProducts = createAsyncThunk(
  'products/fetchManagerList',
  async ({ category, search, ordering, page } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (search) params.set('search', search);
      if (ordering) params.set('ordering', ordering);
      if (page) params.set('page', page);

      const res = await authFetch(`/products/manager-list/?${params.toString()}`);
      return await parseJsonOrThrow(res, 'Ошибка загрузки товаров');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchProductBySlug = createAsyncThunk(
  'products/fetchBySlug',
  async (slug, { rejectWithValue }) => {
    try {
      const res = await authFetch(`/products/${slug}/`);
      return await parseJsonOrThrow(res, 'Ошибка загрузки товара');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createProduct = createAsyncThunk(
  'products/create',
  async (formData, { rejectWithValue }) => {
    try {
      const res = await authFetch('/products/', {
        method: 'POST',
        body: formData,
      });
      return await parseJsonOrThrow(res, 'Ошибка создания товара');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateProduct = createAsyncThunk(
  'products/update',
  async ({ slug, formData }, { rejectWithValue }) => {
    try {
      const res = await authFetch(`/products/${slug}/`, {
        method: 'PATCH',
        body: formData,
      });
      return await parseJsonOrThrow(res, 'Ошибка обновления товара');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteProduct = createAsyncThunk(
  'products/delete',
  async (slug, { rejectWithValue }) => {
    try {
      const res = await authFetch(`/products/${slug}/`, {
        method: 'DELETE',
      });

      if (!res.ok && res.status !== 204) {
        throw new Error('Ошибка удаления товара');
      }

      return slug;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const productsSlice = createSlice({
  name: 'products',

  initialState: {
    list: [],
    count: 0,
    next: null,
    previous: null,
    current: null,
    managerList: [],
    managerCount: 0,
    managerNext: null,
    managerLoading: false,
    loading: false,
    error: null,
  },

  reducers: {
    clearCurrentProduct: (state) => {
      state.current = null;
    },

    stockUpdated: (state, action) => {
      const {
        product_id,
        stock,
        in_stock,
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

      const updateProduct = (product) => {
        if (!product || product.id !== product_id) {
          return;
        }

        product.stock = stock;
        product.in_stock = in_stock;
        product.available = available;
        product.has_attributes = has_attributes;

        /*
         * ProductAttribute больше не содержит stock/in_stock.
         *
         * Атрибуты здесь остаются только описанием
         * доступных значений товара.
         */
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

        /*
         * Остаток и доступность конкретных комбинаций
         * теперь находятся в ProductVariant.
         */
        if (has_attributes || productVariants.length > 0) {
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
        } else {
          product.variants = [];
        }

        /*
         * grouped_attributes оставляем для существующего
         * интерфейса, но теперь формируем его на основании
         * вариантов, а не ProductAttribute.stock.
         *
         * Для каждого значения атрибута:
         * - available берём из ProductAttribute;
         * - stock — максимальный остаток подходящих вариантов;
         * - in_stock — существует ли хотя бы один
         *   доступный вариант с этим значением.
         */
        const groupedAttributes = {};

        productAttributes.forEach((attribute) => {
          if (!groupedAttributes[attribute.name]) {
            groupedAttributes[attribute.name] = [];
          }

          const matchingVariants = productVariants.filter(
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

          const maxStock = matchingVariants.reduce(
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
        });

        product.grouped_attributes =
          groupedAttributes;
      };

      state.list.forEach(updateProduct);
      updateProduct(state.current);
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.list = action.payload.results;
        state.count = action.payload.count;
        state.next = action.payload.next;
        state.previous = action.payload.previous;
        state.loading = false;
      })

      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(fetchProductBySlug.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(fetchProductBySlug.fulfilled, (state, action) => {
        state.current = action.payload;
        state.loading = false;
      })

      .addCase(fetchProductBySlug.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(fetchManagerProducts.pending, (state) => {
        state.managerLoading = true;
      })

      .addCase(fetchManagerProducts.fulfilled, (state, action) => {
        state.managerList = action.payload.results;
        state.managerCount = action.payload.count;
        state.managerNext = action.payload.next;
        state.managerLoading = false;
      })

      .addCase(fetchManagerProducts.rejected, (state, action) => {
        state.managerLoading = false;
        state.error = action.payload;
      })

      .addCase(createProduct.fulfilled, (state, action) => {
        state.managerList.unshift(action.payload);
      })

      .addCase(updateProduct.fulfilled, (state, action) => {
        const index = state.managerList.findIndex(
          (p) => p.slug === action.payload.slug
        );

        if (index >= 0) {
          state.managerList[index] = action.payload;
        }
      })

      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.managerList = state.managerList.filter(
          (p) => p.slug !== action.payload
        );
      });
  },
});

export const {
  clearCurrentProduct,
  stockUpdated,
} = productsSlice.actions;

export default productsSlice.reducer;