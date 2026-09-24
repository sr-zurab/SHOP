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
  waitFor,
} from '@testing-library/react';

import { Provider } from 'react-redux';

import {
  configureStore,
} from '@reduxjs/toolkit';

import {
  MemoryRouter,
} from 'react-router-dom';


vi.mock('../features/cart/cartSlice', () => ({
  fetchCart: vi.fn(() => ({
    type: 'cart/fetch',
  })),
}));


vi.mock('../features/orders/ordersSlice', () => {
  const createOrder = vi.fn(() => ({
    type: 'orders/create',
  }));

  createOrder.fulfilled = {
    match: vi.fn(() => false),
  };

  return {
    createOrder,

    resetLastCreated: vi.fn(() => ({
      type: 'orders/resetLastCreated',
    })),
  };
});


vi.mock('../features/discounts/discountsSlice', () => ({
  calculateDiscounts: vi.fn((itemIds) => ({
    type: 'discounts/calculate',
    payload: itemIds,
  })),

  clearCalculation: vi.fn(() => ({
    type: 'discounts/clearCalculation',
  })),
}));


import {
  fetchCart,
} from '../features/cart/cartSlice';

import {
  createOrder,
} from '../features/orders/ordersSlice';

import {
  calculateDiscounts,
} from '../features/discounts/discountsSlice';

import CheckoutPage from './CheckoutPage';


const defaultCartItems = [
  {
    id: 3,
    quantity: 1,
    total_price: '1000.00',
    product: {
      id: 1,
      name: 'Товар 1',
      price: '1000.00',
      stock: 10,
      available: true,
    },
    attribute_stock: 10,
    selected_attributes: {},
  },
  {
    id: 7,
    quantity: 2,
    total_price: '4000.00',
    product: {
      id: 2,
      name: 'Товар 2',
      price: '2000.00',
      stock: 10,
      available: true,
    },
    attribute_stock: 10,
    selected_attributes: {},
  },
];


function createTestStore({
  cartItems = defaultCartItems,
  cartLoading = false,
  isAuthenticated = true,
  orderLoading = false,
  orderError = null,
  lastCreated = null,
  discountCalculation = null,
  discountLoading = false,
  discountError = null,
} = {}) {
  return configureStore({
    reducer: {
      cart: () => ({
        data: {
          items: cartItems,
        },

        loading: cartLoading,
        error: null,
      }),

      auth: () => ({
        isAuthenticated,
      }),

      orders: () => ({
        loading: orderLoading,
        error: orderError,
        lastCreated,
      }),

      discounts: () => ({
        calculation: discountCalculation,
        loading: discountLoading,
        error: discountError,
      }),
    },
  });
}


function renderCheckout({
  selectedItemIds = [3, 7],
  cartItems = defaultCartItems,
  cartLoading = false,
  isAuthenticated = true,
  orderLoading = false,
  orderError = null,
  lastCreated = null,
  discountCalculation = null,
  discountLoading = false,
  discountError = null,
} = {}) {
  const store = createTestStore({
    cartItems,
    cartLoading,
    isAuthenticated,
    orderLoading,
    orderError,
    lastCreated,
    discountCalculation,
    discountLoading,
    discountError,
  });

  render(
    <Provider store={store}>
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/checkout',
            state: {
              selectedItemIds,
            },
          },
        ]}
      >
        <CheckoutPage />
      </MemoryRouter>
    </Provider>
  );

  return store;
}


function fillCheckoutForm() {
  fireEvent.change(
    document.querySelector(
      'input[name="full_name"]'
    ),
    {
      target: {
        name: 'full_name',
        value: 'Test User',
      },
    }
  );

  fireEvent.change(
    document.querySelector(
      'input[name="email"]'
    ),
    {
      target: {
        name: 'email',
        value: 'test@example.com',
      },
    }
  );

  fireEvent.change(
    document.querySelector(
      'input[name="phone"]'
    ),
    {
      target: {
        name: 'phone',
        value: '+79999999999',
      },
    }
  );

  fireEvent.change(
    document.querySelector(
      'textarea[name="address"]'
    ),
    {
      target: {
        name: 'address',
        value: 'Москва, ул. Ленина, 1',
      },
    }
  );
}


describe('CheckoutPage — расчёт скидки', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    createOrder.fulfilled.match.mockReturnValue(
      false
    );
  });


  afterEach(() => {
    cleanup();
  });


  it('запрашивает расчёт скидки для выбранных товаров', async () => {
    renderCheckout();

    await waitFor(() => {
      expect(calculateDiscounts).toHaveBeenCalledWith(
        [3, 7]
      );
    });

    expect(fetchCart).toHaveBeenCalled();
  });


  it('запрашивает расчёт скидки только для одного выбранного товара', async () => {
    renderCheckout({
      selectedItemIds: [3],
    });

    await waitFor(() => {
      expect(calculateDiscounts).toHaveBeenCalledWith(
        [3]
      );
    });
  });


  it('не запрашивает расчёт скидки, если товары не выбраны', () => {
    renderCheckout({
      selectedItemIds: [],
    });

    expect(
      calculateDiscounts
    ).not.toHaveBeenCalled();

    expect(
      document.body.textContent
    ).toContain(
      'Не выбраны товары для оформления'
    );
  });


  it('отображает итоговую сумму из расчёта скидки', () => {
    renderCheckout({
      discountCalculation: {
        subtotal: '5000.00',
        discount_total: '1000.00',
        total: '4000.00',
        applied_discounts: [
          {
            id: 1,
            name: 'Скидка 20%',
            discount_type: 'percent',
            value: '20',
            amount: '1000.00',
          },
        ],
      },
    });

    expect(
      document.body.textContent
    ).toContain('4000.00 ₽');
  });


  it('отображает товары, скидку и итоговую сумму', () => {
    renderCheckout({
      discountCalculation: {
        subtotal: '5000.00',
        discount_total: '1000.00',
        total: '4000.00',
        applied_discounts: [
          {
            id: 1,
            name: 'Скидка 20%',
            discount_type: 'percent',
            value: '20',
            amount: '1000.00',
          },
        ],
      },
    });

    const pageText =
      document.body.textContent;

    expect(pageText).toContain(
      'Товар 1'
    );

    expect(pageText).toContain(
      'Товар 2'
    );

    expect(pageText).toContain(
      'Товары:'
    );

    expect(pageText).toContain(
      '5000.00 ₽'
    );

    expect(pageText).toContain(
      'Скидка:'
    );

    expect(pageText).toContain(
      '−1000.00 ₽'
    );

    expect(pageText).toContain(
      'Итого:'
    );

    expect(pageText).toContain(
      '4000.00 ₽'
    );
  });


  it('показывает расчёт во время загрузки скидки', () => {
    renderCheckout({
      discountLoading: true,
    });

    expect(
      document.body.textContent
    ).toContain('Расчёт...');
  });


  it('отображает ошибку расчёта скидки', () => {
    renderCheckout({
      discountError:
        'Не удалось рассчитать скидку',
    });

    expect(
      document.body.textContent
    ).toContain(
      'Не удалось рассчитать скидку'
    );
  });


  it('отображает исходную сумму, если скидка не применяется', () => {
    renderCheckout({
      discountCalculation: {
        subtotal: '5000.00',
        discount_total: '0.00',
        total: '5000.00',
        applied_discounts: [],
      },
    });

    const pageText =
      document.body.textContent;

    expect(pageText).toContain(
      'Товары:'
    );

    expect(pageText).toContain(
      '5000.00 ₽'
    );

    expect(pageText).toContain(
      'Скидка:'
    );

    expect(pageText).toContain(
      '−0.00 ₽'
    );

    expect(pageText).toContain(
      'Итого:'
    );
  });


  it('передаёт выбранные товары при оформлении заказа без суммы скидки', async () => {
    renderCheckout({
      discountCalculation: {
        subtotal: '5000.00',
        discount_total: '1000.00',
        total: '4000.00',
        applied_discounts: [
          {
            id: 1,
            name: 'Скидка 20%',
            discount_type: 'percent',
            value: '20',
            amount: '1000.00',
          },
        ],
      },
    });

    fillCheckoutForm();

    createOrder.mockClear();

    fireEvent.click(
      document.querySelector(
        '.checkout-form button[type="submit"]'
      )
    );

    await waitFor(() => {
      expect(createOrder).toHaveBeenCalledWith({
        delivery_method: 'courier',
        full_name: 'Test User',
        email: 'test@example.com',
        phone: '+79999999999',
        address: 'Москва, ул. Ленина, 1',
        selected_item_ids: [3, 7],
      });
    });

    const orderArguments =
      createOrder.mock.calls[0][0];

    expect(orderArguments).not.toHaveProperty(
      'subtotal'
    );

    expect(orderArguments).not.toHaveProperty(
      'discount_total'
    );

    expect(orderArguments).not.toHaveProperty(
      'total_price'
    );
  });


  it('не оформляет заказ, если выбранный товар недоступен', () => {
    const cartItems = [
      {
        ...defaultCartItems[0],
        product: {
          ...defaultCartItems[0].product,
          available: false,
        },
      },
      defaultCartItems[1],
    ];

    renderCheckout({
      cartItems,
      selectedItemIds: [3],
    });

    expect(
      document.body.textContent
    ).toContain(
      'Один или несколько выбранных товаров больше недоступны'
    );

    fillCheckoutForm();

    createOrder.mockClear();

    fireEvent.click(
      document.querySelector(
        '.checkout-form button[type="submit"]'
      )
    );

    expect(
      createOrder
    ).not.toHaveBeenCalled();
  });


  it('не оформляет заказ, если выбранного количества товара нет в наличии', () => {
    const cartItems = [
      {
        ...defaultCartItems[0],
        quantity: 2,
        attribute_stock: 1,
      },
      defaultCartItems[1],
    ];

    renderCheckout({
      cartItems,
      selectedItemIds: [3],
    });

    expect(
      document.body.textContent
    ).toContain(
      'Один или несколько выбранных товаров больше недоступны'
    );

    fillCheckoutForm();

    createOrder.mockClear();

    fireEvent.click(
      document.querySelector(
        '.checkout-form button[type="submit"]'
      )
    );

    expect(
      createOrder
    ).not.toHaveBeenCalled();
  });


  it('показывает сообщение, если выбранный товар исчез из корзины', () => {
    renderCheckout({
      selectedItemIds: [999],
    });

    expect(
      document.body.textContent
    ).toContain(
      'Выбранные товары больше не находятся в корзине'
    );

    expect(
      calculateDiscounts
    ).toHaveBeenCalledWith(
      [999]
    );
  });


  it('показывает сообщение для неавторизованного пользователя', () => {
    renderCheckout({
      isAuthenticated: false,
    });

    expect(
      document.body.textContent
    ).toContain(
      'Оформление заказа доступно только для авторизованных пользователей'
    );

    expect(
      document.body.textContent
    ).toContain(
      'Вернуться в корзину'
    );
  });


  it('обновляет корзину после успешного создания заказа', async () => {
    createOrder.fulfilled.match.mockReturnValue(
      true
    );

    renderCheckout();

    fillCheckoutForm();

    createOrder.mockClear();
    fetchCart.mockClear();

    fireEvent.click(
      document.querySelector(
        '.checkout-form button[type="submit"]'
      )
    );

    await waitFor(() => {
      expect(createOrder).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(fetchCart).toHaveBeenCalledTimes(1);
    });
  });
});