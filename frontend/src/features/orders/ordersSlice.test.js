import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

vi.mock('../../api/authFetch', () => ({
  authFetch: vi.fn(),
  parseJsonOrThrow: vi.fn(),
}));

import {
  authFetch,
  parseJsonOrThrow,
} from '../../api/authFetch';

import {
  createOrder,
} from './ordersSlice';


describe('createOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });


  it('отправляет выбранные товары при создании заказа', async () => {
    const order = {
      id: 10,
      total_price: '1800.00',
    };

    authFetch.mockResolvedValue({
      ok: true,
    });

    parseJsonOrThrow.mockResolvedValue(order);

    const dispatch = vi.fn();

    const orderData = {
      delivery_method: 'courier',
      full_name: 'Иван Иванов',
      email: 'ivan@example.com',
      phone: '+79990000000',
      address: 'Москва, ул. Ленина, 1',
      selected_item_ids: [3, 7],
    };

    const thunk = createOrder(orderData);

    const result = await thunk(
      dispatch,
      () => ({}),
      undefined
    );

    expect(result.type).toBe(
      'orders/create/fulfilled'
    );

    expect(authFetch).toHaveBeenCalledWith(
      '/orders/',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          delivery_method: 'courier',
          full_name: 'Иван Иванов',
          email: 'ivan@example.com',
          phone: '+79990000000',
          address: 'Москва, ул. Ленина, 1',
          selected_item_ids: [3, 7],
        }),
      }
    );

    expect(result.payload).toEqual(order);
  });
});