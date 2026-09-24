import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import CartQuantityControl from './CartQuantityControl';
import cartReducer, {
  updateQuantity,
  removeItem,
} from '../features/cart/cartSlice';

vi.mock('../features/cart/cartSlice', async () => {
  const actual = await vi.importActual(
    '../features/cart/cartSlice'
  );

  return {
    ...actual,
    updateQuantity: vi.fn((payload) => ({
      type: 'cart/updateQuantity',
      payload,
    })),
    removeItem: vi.fn((payload) => ({
      type: 'cart/removeItem',
      payload,
    })),
  };
});

const createStore = () =>
  configureStore({
    reducer: {
      cart: cartReducer,
    },
    preloadedState: {
      cart: {
        data: {
          items: [],
          total_price: 0,
        },
        loading: false,
        error: null,
      },
    },
  });

describe('CartQuantityControl', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('передаёт выбранные атрибуты при увеличении количества', () => {
    render(
      <Provider store={createStore()}>
        <CartQuantityControl
          productId={6}
          quantity={1}
          maxStock={3}
          selectedAttributes={{
            диагональ: "65''",
          }}
        />
      </Provider>
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Увеличить количество',
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

  it('передаёт выбранные атрибуты при уменьшении количества', () => {
    render(
      <Provider store={createStore()}>
        <CartQuantityControl
          productId={6}
          quantity={2}
          maxStock={3}
          selectedAttributes={{
            диагональ: "60''",
          }}
        />
      </Provider>
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Уменьшить количество',
      })
    );

    expect(updateQuantity).toHaveBeenCalledWith({
      productId: 6,
      quantity: 1,
      selectedAttributes: {
        диагональ: "60''",
      },
    });

    expect(updateQuantity).toHaveBeenCalledTimes(1);
  });

  it('не увеличивает количество выше остатка выбранного атрибута', () => {
    render(
      <Provider store={createStore()}>
        <CartQuantityControl
          productId={6}
          quantity={2}
          maxStock={2}
          selectedAttributes={{
            диагональ: "60''",
          }}
        />
      </Provider>
    );

    const increaseButton = screen.getByRole(
      'button',
      {
        name: 'Увеличить количество',
      }
    );

    expect(increaseButton).toBeDisabled();

    fireEvent.click(increaseButton);

    expect(updateQuantity).not.toHaveBeenCalled();
  });

  it('удаляет позицию при уменьшении количества с одного до нуля', () => {
    render(
      <Provider store={createStore()}>
        <CartQuantityControl
          productId={6}
          quantity={1}
          maxStock={2}
          selectedAttributes={{
            диагональ: "65''",
          }}
        />
      </Provider>
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Уменьшить количество',
      })
    );

    expect(removeItem).toHaveBeenCalledWith({
      productId: 6,
      selectedAttributes: {
        диагональ: "65''",
      },
    });

    expect(removeItem).toHaveBeenCalledTimes(1);
    expect(updateQuantity).not.toHaveBeenCalled();
  });
});