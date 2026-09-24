import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import RemoveFromCartButton from './RemoveFromCartButton';
import cartReducer, {
  removeItem,
} from '../features/cart/cartSlice';

vi.mock('../features/cart/cartSlice', async () => {
  const actual = await vi.importActual(
    '../features/cart/cartSlice'
  );

  return {
    ...actual,
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

describe('RemoveFromCartButton', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('передаёт выбранные атрибуты при удалении позиции', () => {
    render(
      <Provider store={createStore()}>
        <RemoveFromCartButton
          productId={6}
          selectedAttributes={{
            диагональ: "60''",
          }}
        />
      </Provider>
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Удалить из корзины',
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

  it('использует пустые атрибуты по умолчанию', () => {
    render(
      <Provider store={createStore()}>
        <RemoveFromCartButton productId={6} />
      </Provider>
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Удалить из корзины',
      })
    );

    expect(removeItem).toHaveBeenCalledWith({
      productId: 6,
      selectedAttributes: {},
    });

    expect(removeItem).toHaveBeenCalledTimes(1);
  });
});