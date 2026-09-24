import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within, cleanup } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';

import CartPage from './CartPage';
import cartReducer, {
  fetchCart,
  updateQuantity,
  removeItem,
} from '../features/cart/cartSlice';
import discountsReducer, {
  calculateDiscounts,
  clearCalculation,
} from '../features/discounts/discountsSlice';

vi.mock('../features/cart/cartSlice', async () => {
  const actual = await vi.importActual(
    '../features/cart/cartSlice'
  );

  return {
    ...actual,
    fetchCart: vi.fn(() => ({
      type: 'cart/fetch',
    })),
    updateQuantity: vi.fn((payload) => ({
      type: 'cart/updateQuantity',
      payload,
    })),
    removeItem: vi.fn((payload) => ({
      type: 'cart/removeItem',
      payload,
    })),
    clearCart: vi.fn(() => ({
      type: 'cart/clear',
    })),
  };
});

vi.mock('../features/discounts/discountsSlice', async () => {
  const actual = await vi.importActual(
    '../features/discounts/discountsSlice'
  );

  return {
    ...actual,
    calculateDiscounts: vi.fn((payload) => ({
      type: 'discounts/calculate',
      payload,
    })),
    clearCalculation: vi.fn(() => ({
      type: 'discounts/clearCalculation',
    })),
  };
});

vi.mock('../components/CartQuantityControl', () => ({
  default: ({
    productId,
    quantity,
    selectedAttributes,
  }) => (
    <div>
      <button
        type="button"
        aria-label={`Увеличить ${productId} ${selectedAttributes.диагональ}`}
        onClick={() =>
          updateQuantity({
            productId,
            quantity: quantity + 1,
            selectedAttributes,
          })
        }
      >
        +
      </button>

      <span>
        {quantity}
      </span>

      <button
        type="button"
        aria-label={`Уменьшить ${productId} ${selectedAttributes.диагональ}`}
        onClick={() =>
          updateQuantity({
            productId,
            quantity: quantity - 1,
            selectedAttributes,
          })
        }
      >
        -
      </button>

      <span
        data-testid={`attributes-${productId}-${selectedAttributes.диагональ}`}
      >
        {JSON.stringify(selectedAttributes)}
      </span>
    </div>
  ),
}));

vi.mock('../components/RemoveFromCartButton', () => ({
  default: ({ productId, selectedAttributes }) => (
    <button
      type="button"
      aria-label={`Удалить ${productId}`}
      onClick={() =>
        removeItem({
          productId,
          selectedAttributes,
        })
      }
    >
      Удалить
    </button>
  ),
}));

const createStore = (cartItems) =>
  configureStore({
    reducer: {
      cart: cartReducer,
      discounts: discountsReducer,
    },
    preloadedState: {
      cart: {
        data: {
          items: cartItems,
          total_price: 0,
        },
        loading: false,
        error: null,
      },
      discounts: {
        calculation: null,
        items: [],
        loading: false,
        error: null,
        managerLoading: false,
        managerError: null,
      },
    },
  });

const createCartItem = ({
  id,
  quantity,
  attribute,
  attributeStock,
}) => ({
  id,
  quantity,
  total_price: String(quantity * 50000),
  selected_attributes: {
    диагональ: attribute,
  },
  attribute_stock: attributeStock,
  product: {
    id: 6,
    name: 'Телевизор Samsung',
    slug: 'Samsung',
    price: '50000.00',
    available: true,
    stock: 0,
    thumbnail: null,
  },
});

describe('CartPage', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('передаёт выбранные атрибуты каждой позиции в кнопку удаления', () => {
    const cartItems = [
      createCartItem({
        id: 94,
        quantity: 2,
        attribute: "60''",
        attributeStock: 2,
      }),
      createCartItem({
        id: 95,
        quantity: 1,
        attribute: "65''",
        attributeStock: 1,
      }),
    ];

    render(
      <Provider store={createStore(cartItems)}>
        <MemoryRouter>
          <CartPage />
        </MemoryRouter>
      </Provider>
    );

    const firstItem = screen
      .getByText("диагональ: 60''")
      .closest('.cart-item');

    fireEvent.click(
      within(firstItem).getByRole('button', {
        name: 'Удалить 6',
      })
    );

    expect(removeItem).toHaveBeenCalledWith({
      productId: 6,
      selectedAttributes: {
        диагональ: "60''",
      },
    });

    expect(removeItem).toHaveBeenCalledTimes(1);
  });

  it('передаёт выбранные атрибуты правильной позиции при изменении количества', () => {
    const cartItems = [
      createCartItem({
        id: 94,
        quantity: 2,
        attribute: "60''",
        attributeStock: 3,
      }),
      createCartItem({
        id: 95,
        quantity: 1,
        attribute: "65''",
        attributeStock: 2,
      }),
    ];

    render(
      <Provider store={createStore(cartItems)}>
        <MemoryRouter>
          <CartPage />
        </MemoryRouter>
      </Provider>
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: "Увеличить 6 65''",
      })
    );

    expect(updateQuantity).toHaveBeenCalledWith({
      productId: 6,
      quantity: 2,
      selectedAttributes: {
        диагональ: "65''",
      },
    });

    expect(updateQuantity).toHaveBeenCalledTimes(1);
  });

  it('не выбирает автоматически позицию, у которой закончился остаток атрибута', () => {
    const cartItems = [
      createCartItem({
        id: 94,
        quantity: 2,
        attribute: "60''",
        attributeStock: 2,
      }),
      createCartItem({
        id: 95,
        quantity: 1,
        attribute: "65''",
        attributeStock: 0,
      }),
    ];

    render(
      <Provider store={createStore(cartItems)}>
        <MemoryRouter>
          <CartPage />
        </MemoryRouter>
      </Provider>
    );

    const checkboxes = screen.getAllByRole('checkbox');

    expect(checkboxes).toHaveLength(3);

    expect(checkboxes[1]).toBeChecked();
    expect(checkboxes[2]).not.toBeChecked();
    expect(checkboxes[2]).toBeDisabled();
  });

  it('не отправляет расчёт скидки, когда все позиции недоступны', () => {
    const cartItems = [
      createCartItem({
        id: 94,
        quantity: 2,
        attribute: "60''",
        attributeStock: 0,
      }),
      createCartItem({
        id: 95,
        quantity: 1,
        attribute: "65''",
        attributeStock: 0,
      }),
    ];

    render(
      <Provider store={createStore(cartItems)}>
        <MemoryRouter>
          <CartPage />
        </MemoryRouter>
      </Provider>
    );

    expect(calculateDiscounts).not.toHaveBeenCalled();
    expect(clearCalculation).toHaveBeenCalled();
  });

  it('считает позицию доступной при product.stock = 0, если выбранный атрибут имеет остаток', () => {
    const cartItems = [
      createCartItem({
        id: 125,
        quantity: 1,
        attribute: "60''",
        attributeStock: 3,
      }),
    ];

    render(
      <Provider store={createStore(cartItems)}>
        <MemoryRouter>
          <CartPage />
        </MemoryRouter>
      </Provider>
    );

    const item = screen
      .getByText("диагональ: 60''")
      .closest('.cart-item');

    expect(item).not.toHaveClass('out-of-stock');

    const checkbox = within(item).getByRole('checkbox');

    expect(checkbox).toBeChecked();
    expect(checkbox).not.toBeDisabled();

    expect(
      within(item).getByRole('button', {
        name: "Увеличить 6 60''",
      })
    ).toBeInTheDocument();

    expect(calculateDiscounts).toHaveBeenCalledWith([
      125,
    ]);
  });
});